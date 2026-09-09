-- ==============================================================================
-- AI Internship Scout - Phase 1: Database Architecture & Multi-Tenant Migration
-- Extension: pgvector enabled for 768-dimensional embeddings cosine similarity
-- ==============================================================================

-- 1. Enable Vector Extension for RAG pipeline semantic match
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Enums
DO $$ BEGIN
    CREATE TYPE alert_method AS ENUM ('email', 'telegram', 'webhook');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_source AS ENUM ('greenhouse', 'lever', 'direct', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM ('pending', 'alerted', 'applied', 'skipped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE relevance_status AS ENUM ('RELEVANT', 'IRRELEVANT', 'DROPPED_LOCATION_MISMATCH', 'PENDING_PREFILTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Users Table (Multi-Tenant isolation by tenant_id)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 4. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    extracted_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    parsed_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding VECTOR(768),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_tenant_user ON resumes(tenant_id, user_id);
-- HNSW Index for ultra-fast vector similarity search on resumes
CREATE INDEX IF NOT EXISTS idx_resumes_embedding_hnsw ON resumes USING hnsw (embedding vector_cosine_ops);

-- 5. User Preferences Table (Strict target roles, target locations, companies, match threshold)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    target_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
    blacklisted_companies JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_match_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    alert_method alert_method NOT NULL DEFAULT 'email',
    alert_destination VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_user ON user_preferences(tenant_id, user_id);

-- 6. Jobs Table (Phase 5: Deterministic SHA-256 deduplication, active verification & pre-filter tracking)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source job_source NOT NULL DEFAULT 'greenhouse',
    external_id VARCHAR(255) NOT NULL,
    dedup_hash VARCHAR(64) NOT NULL, -- SHA256(company + title + location + apply_url)
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,
    raw_jd TEXT NOT NULL,
    stated_requirements JSONB NOT NULL,
    informal_bar JSONB NOT NULL,
    vector_embedding VECTOR(768),
    apply_url TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    relevance_status relevance_status NOT NULL DEFAULT 'RELEVANT',
    prefilter_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_dedup_hash ON jobs(dedup_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_external ON jobs(source, external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_title ON jobs(company, title);
CREATE INDEX IF NOT EXISTS idx_jobs_relevance_status ON jobs(relevance_status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_verified_active ON jobs(last_verified_active);
-- HNSW Index for vector similarity search on job embeddings
CREATE INDEX IF NOT EXISTS idx_jobs_embedding_hnsw ON jobs USING hnsw (vector_embedding vector_cosine_ops);

-- 7. Matches Table (Two-layer RAG evaluation results)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    layer1_score DOUBLE PRECISION NOT NULL,
    layer2_score DOUBLE PRECISION NOT NULL,
    composite_score DOUBLE PRECISION NOT NULL,
    matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    status match_status NOT NULL DEFAULT 'pending',
    user_feedback VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_tenant_user_job ON matches(tenant_id, user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_matches_tenant_score ON matches(tenant_id, composite_score DESC);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    type alert_method NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    status notification_status NOT NULL DEFAULT 'queued',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id);
