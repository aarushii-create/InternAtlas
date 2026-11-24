import fs from 'node:fs/promises';
import path from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { InAppDatabaseState, InAppDatabase } from './database';
import { UserFeedbackStore } from '../lib/feedback/userFeedbackStore';

interface PersistedState {
  version: 1;
  database: InAppDatabaseState;
  feedback: ReturnType<UserFeedbackStore['exportState']>;
}

interface EncryptedPersistedState {
  version: 2;
  encryption: {
    algorithm: 'aes-256-gcm';
    iv: string;
    authTag: string;
    ciphertext: string;
  };
}

export function encryptPersistedState(plaintext: string, key: Buffer): EncryptedPersistedState {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    version: 2,
    encryption: {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    },
  };
}

export function decryptPersistedState(envelope: EncryptedPersistedState, key: Buffer): string {
  if (envelope.version !== 2 || envelope.encryption.algorithm !== 'aes-256-gcm') {
    throw new Error('Unsupported encrypted application state format.');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.encryption.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.encryption.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.encryption.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Application state could not be decrypted. Verify APP_DATA_ENCRYPTION_KEY.');
  }
}

export class PostgresPersistence {
  private readonly pool: Pool;
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly encryptionKey: Buffer;

  constructor(connectionString: string | undefined) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required. Configure PostgreSQL before starting the server.');
    }
    const configuredKey = process.env.APP_DATA_ENCRYPTION_KEY?.trim();
    if (!configuredKey || !/^[a-f0-9]{64}$/i.test(configuredKey)) {
      throw new Error('APP_DATA_ENCRYPTION_KEY must be configured as 64 hexadecimal characters.');
    }
    this.encryptionKey = Buffer.from(configuredKey, 'hex');
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
  }

  public async initialize(database: InAppDatabase, feedbackStore: UserFeedbackStore): Promise<void> {
    await this.pool.query('SELECT 1');
    await this.migrate();
    const appliedMigrations = await this.pool.query<{ migration_name: string; applied_at: Date }>(
      'SELECT migration_name, applied_at FROM app_schema_migrations ORDER BY migration_name'
    );
    database.setMigrationInfo(
      appliedMigrations.rows.map((row) => row.migration_name).join(', ') || 'No migrations applied',
      appliedMigrations.rows.at(-1)?.applied_at.toISOString() ?? ''
    );

    const result = await this.pool.query<{ state: PersistedState | EncryptedPersistedState }>(
      'SELECT state FROM app_runtime_state WHERE id = 1'
    );
    if (result.rows[0]) {
      const storedState = result.rows[0].state;
      if (storedState.version === 2) {
        const state = JSON.parse(decryptPersistedState(storedState, this.encryptionKey)) as PersistedState;
        if (state.version !== 1) throw new Error(`Unsupported decrypted runtime state version: ${state.version}`);
        database.importState(state.database);
        feedbackStore.importState(state.feedback);
      } else if (storedState.version === 1) {
        database.importState(storedState.database);
        feedbackStore.importState(storedState.feedback);
        await this.persist(database, feedbackStore);
      } else {
        throw new Error('Unsupported persisted runtime state version.');
      }
    } else {
      await this.persist(database, feedbackStore);
    }
  }

  public async migrate(): Promise<void> {
    await this.pool.query('SELECT 1');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.runMigrations();
  }

  public persist(database: InAppDatabase, feedbackStore: UserFeedbackStore): Promise<void> {
    const state: PersistedState = {
      version: 1,
      database: database.exportState(),
      feedback: feedbackStore.exportState(),
    };
    const encryptedState = encryptPersistedState(JSON.stringify(state), this.encryptionKey);
    const write = this.writeQueue.then(async () => {
      await this.pool.query(
        `INSERT INTO app_runtime_state (id, state, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
        [JSON.stringify(encryptedState)]
      );
    });
    this.writeQueue = write.catch(() => undefined);
    return write;
  }

  public async close(): Promise<void> {
    await this.writeQueue;
    await this.pool.end();
  }

  private async runMigrations(): Promise<void> {
    const migrationsDirectory = path.join(process.cwd(), 'src', 'db', 'migrations');
    const migrationFiles = (await fs.readdir(migrationsDirectory))
      .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.startsWith('0001_'))
      .sort();

    for (const migrationName of migrationFiles) {
      const applied = await this.pool.query(
        'SELECT 1 FROM app_schema_migrations WHERE migration_name = $1',
        [migrationName]
      );
      if (applied.rowCount) continue;

      const sql = await fs.readFile(path.join(migrationsDirectory, migrationName), 'utf8');
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO app_schema_migrations (migration_name) VALUES ($1)',
          [migrationName]
        );
        await client.query('COMMIT');
        console.log(`Applied database migration ${migrationName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Database migration ${migrationName} failed.`, { cause: error });
      } finally {
        client.release();
      }
    }
  }
}
