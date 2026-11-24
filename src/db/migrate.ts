import 'dotenv/config';
import { PostgresPersistence } from './postgresPersistence';

async function main(): Promise<void> {
  const persistence = new PostgresPersistence(process.env.DATABASE_URL);
  try {
    await persistence.migrate();
  } finally {
    await persistence.close();
  }
}

main().catch((error: unknown) => {
  console.error('Database migrations failed:', error);
  process.exitCode = 1;
});
