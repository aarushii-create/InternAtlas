/**
 * AI Internship Scout - Phase 1: Database Schema (Drizzle ORM for PostgreSQL)
 * Includes Vector Extensions (pgvector), Multi-Tenant Foreign Keys, and Indexes.
*/

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  customType,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Custom vector type definition for pgvector in Drizzle ORM
export const vector = customType<{ data: number[]; config: { dimensions?: number } }>({
  dataType(config) {
    const dim = config?.dimensions ?? 768;
    return `vector(${dim})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string | number[]): number[] {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  },
});

// Enums
export const alertMethodEnum = pgEnum('alert_method', ['email', 'telegram', 'webhook']);
export const jobSourceEnum = pgEnum('job_source', ['greenhouse', 'lever', 'direct', 'custom']);
export const matchStatusEnum = pgEnum('match_status', ['pending', 'alerted', 'applied', 'skipped']);
export const notificationStatusEnum = pgEnum('notification_status', ['queued', 'sent', 'failed']);

// 1. Users Table (Multi-Tenant)
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    isOnboarded: boolean('is_onboarded').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserIdx: uniqueIndex('idx_users_tenant_email').on(table.tenantId, table.email),
    tenantIdx: index('idx_users_tenant_id').on(table.tenantId),
  })
);

// 2. Resumes Table
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    extractedSkills: jsonb('extracted_skills').$type<string[]>().default([]).notNull(),
    parsedExperience: jsonb('parsed_experience')
      .$type<
        {
          company: string;
          role: string;
          duration: string;
          highlights: string[];
        }[]
      >()
      .default([])
      .notNull(),
    embedding: vector('embedding', { dimensions: 768 }),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserResumesIdx: index('idx_resumes_tenant_user').on(table.tenantId, table.userId),
  })
);

// 3. User Preferences Table (Strict Location, Target Roles, Preferred/Blacklisted Companies, Match Thresholds)
export const userPreferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    targetLocations: jsonb('target_locations').$type<string[]>().default([]).notNull(),
    targetRoles: jsonb('target_roles').$type<string[]>().default([]).notNull(),
    preferredCompanies: jsonb('preferred_companies').$type<string[]>().default([]).notNull(),
    blacklistedCompanies: jsonb('blacklisted_companies').$type<string[]>().default([]).notNull(),
    customMatchThreshold: doublePrecision('custom_match_threshold').default(0.7).notNull(), // 0.70 = 70%
    alertMethod: alertMethodEnum('alert_method').default('email').notNull(),
    alertDestination: varchar('alert_destination', { length: 255 }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserPrefIdx: index('idx_user_preferences_tenant_user').on(table.tenantId, table.userId),
  })
);

export const relevanceStatusEnum = pgEnum('relevance_status', [
  'RELEVANT',
  'IRRELEVANT',
  'DROPPED_LOCATION_MISMATCH',
  'PENDING_PREFILTER',
]);

// 4. Jobs Table (Job Postings & Stated vs Informal Expectations)
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: jobSourceEnum('source').default('greenhouse').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    dedupHash: varchar('dedup_hash', { length: 64 }).notNull(), // SHA256(company + title + location + apply_url)
    company: varchar('company', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    isRemote: boolean('is_remote').default(false).notNull(),
    description: text('description').notNull(),
    rawJd: text('raw_jd').notNull(),
    statedRequirements: jsonb('stated_requirements')
      .$type<{
        requiredSkills: string[];
        preferredSkills: string[];
        education: string;
        experienceYears: number;
      }>()
      .notNull(),
    informalBar: jsonb('informal_bar')
      .$type<{
        dsaDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
        oaPattern: string;
        unstatedPreferences: string[];
        barDescription: string;
      }>()
      .notNull(),
    vectorEmbedding: vector('vector_embedding', { dimensions: 768 }),
    applyUrl: text('apply_url').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastVerifiedActive: timestamp('last_verified_active', { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(), // Active or closed job posting
    relevanceStatus: relevanceStatusEnum('relevance_status').default('RELEVANT').notNull(),
    prefilterReason: text('prefilter_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyTitleIdx: index('idx_jobs_company_title').on(table.company, table.title),
    sourceExternalIdx: uniqueIndex('idx_jobs_source_external').on(table.source, table.externalId),
    dedupHashIdx: uniqueIndex('idx_jobs_dedup_hash').on(table.dedupHash),
    relevanceStatusIdx: index('idx_jobs_relevance_status').on(table.relevanceStatus),
    lastActiveIdx: index('idx_jobs_last_verified_active').on(table.lastVerifiedActive),
    activeUpdatedIdx: index('idx_jobs_active_updated').on(table.isActive, table.updatedAt),
  })
);

// 4b. Archived Jobs Table (Partition / Cold Storage for Stale Bloat Management)
export const archivedJobs = pgTable(
  'archived_jobs',
  {
    id: uuid('id').primaryKey(),
    source: jobSourceEnum('source').notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    dedupHash: varchar('dedup_hash', { length: 64 }).notNull(),
    company: varchar('company', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    isRemote: boolean('is_remote').default(false).notNull(),
    description: text('description').notNull(),
    rawJd: text('raw_jd').notNull(),
    statedRequirements: jsonb('stated_requirements').notNull(),
    informalBar: jsonb('informal_bar').notNull(),
    applyUrl: text('apply_url').notNull(),
    postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    lastVerifiedActive: timestamp('last_verified_active', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    relevanceStatus: relevanceStatusEnum('relevance_status').notNull(),
    prefilterReason: text('prefilter_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }).defaultNow().notNull(),
    archiveReason: text('archive_reason').default('Stale job posting older than 60 days').notNull(),
  },
  (table) => ({
    archivedCompanyTitleIdx: index('idx_archived_jobs_company_title').on(table.company, table.title),
    archivedDedupHashIdx: index('idx_archived_jobs_dedup_hash').on(table.dedupHash),
    archivedAtIdx: index('idx_archived_jobs_archived_at').on(table.archivedAt),
  })
);

// 5. Matches Table (2-Layer RAG Pipeline evaluation results)
export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    layer1Score: doublePrecision('layer1_score').notNull(), // 0.0 to 1.0 (Stated requirements score)
    layer2Score: doublePrecision('layer2_score').notNull(), // 0.0 to 1.0 (Informal company bar score)
    compositeScore: doublePrecision('composite_score').notNull(), // 0.0 to 100.0 or 0.0 to 1.0
    matchedSkills: jsonb('matched_skills').$type<string[]>().default([]).notNull(),
    missingSkills: jsonb('missing_skills').$type<string[]>().default([]).notNull(),
    status: matchStatusEnum('status').default('pending').notNull(),
    userFeedback: varchar('user_feedback', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserJobIdx: uniqueIndex('idx_matches_tenant_user_job').on(
      table.tenantId,
      table.userId,
      table.jobId
    ),
    tenantScoreIdx: index('idx_matches_tenant_score').on(table.tenantId, table.compositeScore),
  })
);

// 6. Notifications Table (Instant Alerts)
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    type: alertMethodEnum('type').notNull(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    body: text('body').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: notificationStatusEnum('status').default('queued').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantUserNotifIdx: index('idx_notifications_tenant_user').on(table.tenantId, table.userId),
  })
);
