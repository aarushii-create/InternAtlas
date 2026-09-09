-- ==============================================================================
-- AI Internship Scout - Phase 1: Seed Data Migration
-- ==============================================================================

-- Seed Demo Tenants and Users
INSERT INTO users (id, tenant_id, email, full_name, avatar_url) VALUES
('11111111-1111-4111-a111-111111111111', 'tenant-alex-rivera', 'alex.rivera@stanford.edu', 'Alex Rivera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('22222222-2222-4222-a222-222222222222', 'tenant-jordan-chen', 'jordan.chen@berkeley.edu', 'Jordan Chen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Seed User Preferences
INSERT INTO user_preferences (id, user_id, tenant_id, target_locations, target_roles, preferred_companies, blacklisted_companies, custom_match_threshold, alert_method, alert_destination) VALUES
('pref-11111111-1111-4111-a111-111111111111', '11111111-1111-4111-a111-111111111111', 'tenant-alex-rivera', 
 '["San Francisco, CA", "New York, NY", "Remote"]'::jsonb, 
 '["Software Engineering Intern", "Backend Engineering Intern", "AI/ML Intern"]'::jsonb, 
 '["Goldman Sachs", "Microsoft", "Stripe", "Databricks", "OpenAI"]'::jsonb, 
 '["CryptoScam LLC", "LowPay Agency"]'::jsonb, 
 0.75, 'email', 'alex.rivera@stanford.edu'),
('pref-22222222-2222-4222-a222-222222222222', '22222222-2222-4222-a222-222222222222', 'tenant-jordan-chen', 
 '["Seattle, WA", "Remote"]'::jsonb, 
 '["Quant Developer Intern", "Systems Engineering Intern"]'::jsonb, 
 '["Jane Street", "Citadel", "Two Sigma"]'::jsonb, 
 '[]'::jsonb, 
 0.80, 'telegram', '@jordan_chen_quant')
ON CONFLICT (user_id) DO NOTHING;

-- Seed Sample High-Tier Jobs with Phase 5 Deduplication Hashes & Active Timestamps
INSERT INTO jobs (id, source, external_id, dedup_hash, company, title, location, is_remote, description, raw_jd, stated_requirements, informal_bar, apply_url, posted_at, first_seen_at, last_verified_active, relevance_status) VALUES
(
  '33333333-3333-4333-a333-333333333331',
  'greenhouse',
  'gh-gs-quant-2026',
  'gs-quant-ny-2026-hash-01',
  'Goldman Sachs',
  'Summer Analyst - Quantitative Engineering',
  'New York, NY',
  false,
  'Goldman Sachs Global Markets Quantitative Engineering. Building pricing algorithms and ultra-low latency execution engines in C++, Java, and Python.',
  'We are seeking high-caliber quantitative software engineering interns to join our New York algorithmic execution team.',
  '{"requiredSkills": ["C++", "Python", "Algorithms", "Data Structures", "Multi-threading"], "preferredSkills": ["Stochastic Calculus", "Distributed Systems", "SQL"], "education": "Pursuing BS/MS in Computer Science or Mathematics", "experienceYears": 0}'::jsonb,
  '{"dsaDifficulty": "Hard", "oaPattern": "HackerRank 2 questions (60 mins): Advanced Graph traversal (Dijkstra / Floyd-Warshall) and Dynamic Programming (Knapsack variant).", "unstatedPreferences": ["Top 15 CS/Math target school preferred", "Prior quant finance or big-tech internship"], "barDescription": "Goldman Sachs Quant Engineering bar requires 100% test-case pass rate on HackerRank."}'::jsonb,
  'https://goldmansachs.tal.net/vx/lang-en-GB/mobile-0/appcentre-1/brand-2/candidate/so/pm/1/pl/1/opp/2026-summer-analyst',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  NOW(),
  'RELEVANT'
),
(
  '33333333-3333-4333-a333-333333333332',
  'greenhouse',
  'gh-stripe-infra-2026',
  'stripe-swe-sf-8812-hash-02',
  'Stripe',
  'Software Engineering Intern - Infrastructure',
  'San Francisco, CA',
  true,
  'Stripe Infrastructure team builds globally distributed, multi-region financial primitives. High-throughput Go, Java, and Python systems handling millions of transactions.',
  'Join Stripe Core Infrastructure team to engineer resilient global financial foundations.',
  '{"requiredSkills": ["Go", "Distributed Systems", "SQL", "Linux Internals", "Networking"], "preferredSkills": ["Kubernetes", "gRPC", "Observability"], "education": "BS/MS in Computer Science graduating Dec 2026 - Summer 2027", "experienceYears": 0}'::jsonb,
  '{"dsaDifficulty": "Medium-Hard", "oaPattern": "Codesignal General Coding Assessment (840+ target) + Live Technical: System design and real-world Bug Investigation in codebase.", "unstatedPreferences": ["Open-source contributions or distributed systems project", "Pragmatic debugging over theoretical puzzles"], "barDescription": "Stripe evaluates real-world coding speed, debugging, and robust clean architecture."}'::jsonb,
  'https://stripe.com/jobs/8812?gh_jid=8812',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NOW(),
  'RELEVANT'
)
ON CONFLICT (dedup_hash) DO NOTHING;

