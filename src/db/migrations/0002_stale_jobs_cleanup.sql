-- ==============================================================================
-- AI Internship Scout - Phase 5 Enhancement: Stale Job Bloat Cleanup & Partitioning
-- Solves: Storage growing indefinitely with 6-month-old closed job postings
-- ==============================================================================

-- 1. Ensure is_active and updated_at columns exist on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Composite index for ultra-fast query execution of the cleanup query
CREATE INDEX IF NOT EXISTS idx_jobs_active_updated ON jobs(is_active, updated_at);
CREATE INDEX IF NOT EXISTS idx_jobs_last_verified_active ON jobs(last_verified_active);

-- 3. Archived Jobs Table for Cold Storage / Compliance Archival
CREATE TABLE IF NOT EXISTS archived_jobs (
    id UUID PRIMARY KEY,
    source job_source NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    dedup_hash VARCHAR(64) NOT NULL,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,
    raw_jd TEXT NOT NULL,
    stated_requirements JSONB NOT NULL,
    informal_bar JSONB NOT NULL,
    apply_url TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_verified_active TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    relevance_status relevance_status NOT NULL,
    prefilter_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archive_reason TEXT NOT NULL DEFAULT 'Stale job posting older than 60 days'
);

CREATE INDEX IF NOT EXISTS idx_archived_jobs_company_title ON archived_jobs(company, title);
CREATE INDEX IF NOT EXISTS idx_archived_jobs_dedup_hash ON archived_jobs(dedup_hash);
CREATE INDEX IF NOT EXISTS idx_archived_jobs_archived_at ON archived_jobs(archived_at);

-- 4. Stored Procedure for Automated Stale Job Pruning / Archival
CREATE OR REPLACE FUNCTION purge_stale_inactive_jobs(retention_days INTEGER DEFAULT 60)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
    deleted_rows BIGINT;
BEGIN
    -- Core Cleanup Query requested:
    -- Delete inactive jobs older than specified threshold (default 60 days)
    WITH deleted AS (
        DELETE FROM jobs
        WHERE is_active = FALSE
          AND updated_at < NOW() - (retention_days || ' days')::INTERVAL
        RETURNING id
    )
    SELECT count(*) INTO deleted_rows FROM deleted;

    RETURN QUERY SELECT deleted_rows;
END;
$$ LANGUAGE plpgsql;

-- 5. Stored Procedure for Archiving Before Deleting (Cold Archival Pipeline)
CREATE OR REPLACE FUNCTION archive_and_purge_stale_jobs(retention_days INTEGER DEFAULT 60)
RETURNS TABLE(archived_count BIGINT) AS $$
DECLARE
    archived_rows BIGINT;
BEGIN
    WITH to_archive AS (
        SELECT id, source, external_id, dedup_hash, company, title, location,
               is_remote, description, raw_jd, stated_requirements, informal_bar,
               apply_url, posted_at, first_seen_at, last_verified_active, is_active,
               relevance_status, prefilter_reason, created_at, updated_at
        FROM jobs
        WHERE is_active = FALSE
          AND updated_at < NOW() - (retention_days || ' days')::INTERVAL
    ),
    inserted_archive AS (
        INSERT INTO archived_jobs (
            id, source, external_id, dedup_hash, company, title, location,
            is_remote, description, raw_jd, stated_requirements, informal_bar,
            apply_url, posted_at, first_seen_at, last_verified_active, is_active,
            relevance_status, prefilter_reason, created_at, updated_at, archive_reason
        )
        SELECT *, 'Automated 60-day inactive job retention policy'
        FROM to_archive
        ON CONFLICT (id) DO NOTHING
        RETURNING id
    ),
    deleted AS (
        DELETE FROM jobs
        WHERE id IN (SELECT id FROM inserted_archive)
        RETURNING id
    )
    SELECT count(*) INTO archived_rows FROM deleted;

    RETURN QUERY SELECT archived_rows;
END;
$$ LANGUAGE plpgsql;

-- 6. Automated Scheduled Cron Job Example (for pg_cron enabled PostgreSQL databases)
-- SELECT cron.schedule('stale_jobs_daily_purge', '0 3 * * *', 'SELECT purge_stale_inactive_jobs(60);');
