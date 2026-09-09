/**
 * ER Diagram Metadata & Entity Relationships for AI Internship Scout (Phase 1)
 */

export interface ERNode {
  id: string;
  tableName: string;
  displayName: string;
  color: string;
  description: string;
  columns: {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    isVector?: boolean;
    isTenantKey?: boolean;
    description?: string;
  }[];
}

export interface ERRelationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: '1:1' | '1:N' | 'N:M';
}

export const SCHEMA_NODES: ERNode[] = [
  {
    id: 'users',
    tableName: 'users',
    displayName: 'Users',
    color: 'from-blue-500 to-indigo-600',
    description: 'Multi-tenant primary user account entity.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Primary Key' },
      { name: 'tenant_id', type: 'VARCHAR(64)', isTenantKey: true, description: 'Multi-Tenant Partition Key' },
      { name: 'email', type: 'VARCHAR(255)', description: 'User Email Address' },
      { name: 'full_name', type: 'VARCHAR(255)', description: 'Full Name' },
      { name: 'avatar_url', type: 'TEXT', description: 'Avatar Image' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Creation Timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last Update' },
    ],
  },
  {
    id: 'resumes',
    tableName: 'resumes',
    displayName: 'Resumes',
    color: 'from-emerald-500 to-teal-600',
    description: 'User resumes with extracted skills and 768-dim vector embeddings.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'FK -> users.id' },
      { name: 'tenant_id', type: 'VARCHAR(64)', isTenantKey: true },
      { name: 'title', type: 'VARCHAR(255)' },
      { name: 'content', type: 'TEXT', description: 'Raw Resume Text' },
      { name: 'extracted_skills', type: 'JSONB', description: 'Parsed Skills List' },
      { name: 'parsed_experience', type: 'JSONB', description: 'Structured Experience' },
      { name: 'embedding', type: 'VECTOR(768)', isVector: true, description: 'pgvector 768-dim float' },
      { name: 'is_primary', type: 'BOOLEAN' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    id: 'user_preferences',
    tableName: 'user_preferences',
    displayName: 'UserPreferences',
    color: 'from-purple-500 to-pink-600',
    description: 'Strict match parameters: locations, target roles, preferred/blacklisted companies, match thresholds.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'FK -> users.id (1:1)' },
      { name: 'tenant_id', type: 'VARCHAR(64)', isTenantKey: true },
      { name: 'target_locations', type: 'JSONB', description: 'Target City/Remote Array' },
      { name: 'target_roles', type: 'JSONB', description: 'Target Role Strings' },
      { name: 'preferred_companies', type: 'JSONB', description: 'Priority Ranking Companies' },
      { name: 'blacklisted_companies', type: 'JSONB', description: 'Filtered Out Companies' },
      { name: 'custom_match_threshold', type: 'DOUBLE', description: 'Min Score Cutoff (e.g. 0.75)' },
      { name: 'alert_method', type: 'ENUM', description: 'email | telegram | webhook' },
      { name: 'alert_destination', type: 'VARCHAR(255)' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
  },
  {
    id: 'jobs',
    tableName: 'jobs',
    displayName: 'Jobs',
    color: 'from-amber-500 to-orange-600',
    description: 'Job postings with 2-layer requirements (stated JD vs informal company bar).',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true },
      { name: 'source', type: 'ENUM', description: 'greenhouse | lever | direct' },
      { name: 'external_id', type: 'VARCHAR(255)' },
      { name: 'company', type: 'VARCHAR(255)' },
      { name: 'title', type: 'VARCHAR(255)' },
      { name: 'location', type: 'VARCHAR(255)' },
      { name: 'is_remote', type: 'BOOLEAN' },
      { name: 'stated_requirements', type: 'JSONB', description: 'Layer 1: Stated Skills/Degree' },
      { name: 'informal_bar', type: 'JSONB', description: 'Layer 2: Real DSA Bar, OA patterns, unstated prefs' },
      { name: 'vector_embedding', type: 'VECTOR(768)', isVector: true, description: 'pgvector 768-dim float' },
      { name: 'apply_url', type: 'TEXT' },
      { name: 'posted_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    id: 'matches',
    tableName: 'matches',
    displayName: 'Matches',
    color: 'from-cyan-500 to-blue-600',
    description: '2-layer RAG evaluation result scores & user feedback tuning.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'FK -> users.id' },
      { name: 'tenant_id', type: 'VARCHAR(64)', isTenantKey: true },
      { name: 'job_id', type: 'UUID', isForeign: true, description: 'FK -> jobs.id' },
      { name: 'resume_id', type: 'UUID', isForeign: true, description: 'FK -> resumes.id' },
      { name: 'layer1_score', type: 'DOUBLE', description: 'Stated Requirements Fit (0-1)' },
      { name: 'layer2_score', type: 'DOUBLE', description: 'Informal Company Bar Fit (0-1)' },
      { name: 'composite_score', type: 'DOUBLE', description: 'Weighted Final Score (0-100)' },
      { name: 'matched_skills', type: 'JSONB' },
      { name: 'missing_skills', type: 'JSONB' },
      { name: 'status', type: 'ENUM', description: 'pending | alerted | applied | skipped' },
      { name: 'user_feedback', type: 'VARCHAR(50)' },
    ],
  },
  {
    id: 'notifications',
    tableName: 'notifications',
    displayName: 'Notifications',
    color: 'from-rose-500 to-red-600',
    description: 'Instant alert logs triggered when match clears threshold.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'FK -> users.id' },
      { name: 'tenant_id', type: 'VARCHAR(64)', isTenantKey: true },
      { name: 'match_id', type: 'UUID', isForeign: true, description: 'FK -> matches.id' },
      { name: 'type', type: 'ENUM', description: 'email | telegram | webhook' },
      { name: 'recipient', type: 'VARCHAR(255)' },
      { name: 'subject', type: 'VARCHAR(255)' },
      { name: 'body', type: 'TEXT' },
      { name: 'sent_at', type: 'TIMESTAMPTZ' },
      { name: 'status', type: 'ENUM', description: 'queued | sent | failed' },
    ],
  },
];

export const SCHEMA_RELATIONSHIPS: ERRelationship[] = [
  { id: 'rel-1', fromTable: 'users', fromColumn: 'id', toTable: 'resumes', toColumn: 'user_id', relationshipType: '1:N' },
  { id: 'rel-2', fromTable: 'users', fromColumn: 'id', toTable: 'user_preferences', toColumn: 'user_id', relationshipType: '1:1' },
  { id: 'rel-3', fromTable: 'users', fromColumn: 'id', toTable: 'matches', toColumn: 'user_id', relationshipType: '1:N' },
  { id: 'rel-4', fromTable: 'jobs', fromColumn: 'id', toTable: 'matches', toColumn: 'job_id', relationshipType: '1:N' },
  { id: 'rel-5', fromTable: 'resumes', fromColumn: 'id', toTable: 'matches', toColumn: 'resume_id', relationshipType: '1:N' },
  { id: 'rel-6', fromTable: 'matches', fromColumn: 'id', toTable: 'notifications', toColumn: 'match_id', relationshipType: '1:N' },
  { id: 'rel-7', fromTable: 'users', fromColumn: 'id', toTable: 'notifications', toColumn: 'user_id', relationshipType: '1:N' },
];
