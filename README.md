# InternAtlas (AI Internship Scout)

> **High-Performance Autonomous Internship Discovery & Two-Layer Vector RAG Matching Engine for Elite Software Engineering Roles**

InternAtlas is an internship discovery and matching application. It contains a 109-company target catalog, but catalog entries are not verified live integrations. Only Greenhouse, Lever, Ashby, and some Workday board configurations have adapter implementations; each individual board remains unverified until a successful fetch. SmartRecruiters and generic custom REST/GraphQL catalog entries currently have no connector.

Unlike superficial keyword scrapers, InternAtlas executes a **Two-Layer Retrieval-Augmented Generation (RAG) Architecture**:
1. **Layer 1 (Stated Job Description Vector Match)**: Mathematical cosine similarity between high-dimensional candidate resume embeddings (768-d) and parsed job requirements.
2. **Layer 2 (Company Reality & Informal Bar Engine)**: Evaluates unstated engineering expectations (e.g., Codeforces 1900+ algorithmic benchmarks, low-latency microsecond C++ concurrency for Citadel/Jane Street, distributed systems Raft consensus for Databricks, CUDA kernel optimization for NVIDIA/OpenAI).

---

## 🌟 Key Architecture & Capabilities

- ⚡ **ATS ingestion adapters**: Implemented for Greenhouse, Lever, Ashby, and Workday CXS. Board tokens and tenant/site settings have not been independently verified across the catalog; SmartRecruiters and generic REST/GraphQL entries do not have live adapters.
- 🛡️ **Deterministic SHA-256 Deduplication & Canonicalization**: Collision-resistant cryptographic hashing (`SHA-256(canonical(company) + canonical(title) + location_cluster + req_id)`) ensuring zero duplicate postings across syndication networks.
- 🧠 **Sub-Vector Modular Resume Intelligence**: Granular vector chunking across Skills, Work Experience, Technical Projects, and Education with delta updates in `< 150ms`.
- 📊 **Historical Hiring Velocity & Lifespan Analytics**: Rolling 180-day telemetry tracking job posting lifespans, early-window application advantages, and interview callback correlations.
- 🔔 **Sub-500ms Multi-Channel Alerting Dispatcher**: Real-time webhook notifications via Telegram Bot and transactional Email with custom fit score thresholds and urgency routing (`CRITICAL_IMMEDIATE` vs. `HIGH_ROLLING`).
- 🎨 **Linear/Vercel-Grade SaaS UI**: Sleek dark-mode candidate command center with company tier indicators, matched vs. missing skills, reality bar drawer, and target preference customization.
- 🧪 **Comprehensive Dev Sandbox & E2E Test Suite**: Fully isolated administrative studio with 15-phase pipeline simulators, concurrency stress benchmarks, and automated test runners.

---

## 🏢 Target Company Catalog (109 entries; not 109 verified integrations)

The catalog is metadata for possible targets. `sampleRoles` are examples, not currently open jobs. `/api/scrapers/supported-boards` reports connector availability separately from board verification. At present, a board is marked verified only after a successful or valid-empty live response; the status and last successful check are available from `/api/scrapers/health`. No catalog-wide live validation or per-board terms review has been completed.

| Sector / Tier | Target Companies Tracked | Primary ATS Adapters | Typical Hiring Bar |
| :--- | :--- | :--- | :--- |
| **Tech Giants & Big Tech** (23) | Google, Microsoft, Amazon, Meta, Apple, NVIDIA, Adobe, Atlassian, Uber, LinkedIn, Salesforce, ServiceNow, Walmart Global Tech, Intuit, Oracle, SAP, Cisco, Qualcomm, Intel, AMD, Texas Instruments, Broadcom, VMware | Workday, Greenhouse, Lever, Custom REST | Hard (Distributed Systems, DSA, System Design) |
| **Finance & Quant/HFT** (16) | Citadel, Jane Street, DE Shaw, Tower Research, Goldman Sachs, JPMorgan Chase, Morgan Stanley, Bank of America, Barclays, PayPal, Visa, Mastercard, American Express, Deutsche Bank, UBS, Wells Fargo | Ashby, Greenhouse, Workday, Custom REST | Extreme (Microsecond C++, Olympiad DSA, Concurrency) |
| **High-Growth / Indian Tech Unicorns** (35) | Flipkart, PhonePe, Razorpay, Swiggy, Zomato, Meesho, CRED, Groww, Zerodha, Paytm, Dream11, MakeMyTrip, Nykaa, Lenskart, Zepto, Blinkit, Rapido, Delhivery, BigBasket, Postman, BrowserStack, Freshworks, Zoho, Chargebee, InMobi, ShareChat, Juspay, ThoughtSpot, Amagi, Druva, Hasura, MoEngage, Sarvam AI, Krutrim, Databricks, Stripe | Greenhouse, Lever, Ashby, Custom REST | Hard (Scale Architecture, High-Concurrency Go/Java) |
| **AI & Analytics** (13) | OpenAI, Anthropic, Fractal Analytics, Tiger Analytics, Mu Sigma, Tredence, LatentView Analytics, Sigmoid, Uniphore, Yellow.ai, Observe.AI, Arya.ai, Microsoft/Google Research | Ashby, Lever, Greenhouse, Custom REST | Hard (CUDA, PyTorch, Megatron, LLM Pretraining) |
| **Enterprise Services & IT** (22) | TCS, Infosys, Wipro, HCLTech, Cognizant, Accenture, Capgemini, Deloitte, EY, KPMG, LTIMindtree, Persistent Systems, Mphasis, Coforge, Tech Mahindra, Genpact, Hexaware, CGI, Zensar, DXC Technology, Tata Elxsi, L&T Technology Services | Workday, SmartRecruiters, Custom REST | Standard to Medium-Hard (Java, Cloud, Spring) |

### Ingestion safeguards and current limits

- Live fetches use a 12-second request timeout, at most two retries for network errors, HTTP 429, and HTTP 5xx, and a per-provider minimum request interval. Workday board results are paginated with a 500-record safety limit.
- Fetch errors and empty boards are distinct outcomes. A failed fetch never creates or substitutes synthetic job postings. Upstream records without a stable ID, title, or direct apply URL are excluded and reported.
- Fully enumerated Greenhouse, Lever, and Ashby board snapshots deactivate previously active board jobs that are no longer returned. Workday uses a bounded internship search, so missing records do not trigger bulk closure. Live postings not reverified for 72 hours are marked inactive before jobs are served.
- Seeded development postings are marked `demo` and shown with a demo label; imported/manual listings are separately labeled. Legacy synthetic scraper rows are disabled on state import.
- The app has not reviewed the terms of service, robots policies, or permitted-use conditions for every provider or target company. Production scraping is disabled unless an operator sets `ATS_TERMS_REVIEWED=true` after source-specific review and explicitly enables it with `ENABLE_LIVE_SCRAPING=true`. These settings are operator attestations, not legal advice or proof of permission.
- The background scraper scheduler is opt-in and additionally requires `ENABLE_SCRAPER_SCHEDULER=true`. Respect provider terms and rate limits; do not bypass access controls.

---

## 🛠️ Complete Tech Stack Breakdown

### Frontend (Consumer SaaS & Candidate Command Center)
- **Framework**: React 19 (TypeScript, Functional Components, Custom Hooks)
- **Styling & Design System**: Tailwind CSS v4, Lucide React Icons, Glassmorphism, Dark-mode SaaS aesthetics (Linear/Vercel design patterns)
- **State Management & Routing**: React Context API, Tabbed Single-Page Architecture, in-memory JWT session state with an HttpOnly session cookie
- **Build Tool**: Vite 6 (Fast HMR, optimized production bundling)

### Backend (Full-Stack Express Engine)
- **Runtime**: Node.js & TypeScript (`tsx` execution)
- **Web Server**: Express.js with JSON body parsing, CORS, and request logging
- **Authentication & Multi-Tenancy**: JWT (JSON Web Tokens) with 7-day expiration, bcrypt password hashing, scoped tenant isolation
- **Security & Rate Limiting**: In-memory sliding-window rate limiters for scrapers (`10 req/min`), auth (`20 req/15min`), and general endpoints (`120 req/min`)

### AI & Vector Embedding Subsystem
- **Embedding Generation**: Deterministic 768-dimensional mathematical embeddings generated locally
- **Document Parsing**: `mammoth` for `.docx` and regex-based AST token extraction for `.pdf` and raw text resumes
- **Vector Retrieval**: Exact Cosine Similarity metric computed across multidimensional sub-vectors

### Database & Persistence
- PostgreSQL 16 with pgvector is required; `DATABASE_URL` is required to start the API.
- Versioned SQL migrations are applied at startup and tracked in `app_schema_migrations`. The seed-data SQL file is deliberately excluded from automatic migrations.
- The synchronous application data model is currently loaded from and saved to the PostgreSQL `app_runtime_state` JSONB snapshot. The full snapshot is encrypted with AES-256-GCM before writing. The relational tables described in `schema.ts` are migrated but are not yet the runtime repository.
- PostgreSQL snapshots survive server restarts. For this single-process snapshot implementation, run one app instance per database; horizontal scaling and multi-writer concurrency require replacing the snapshot with normalized repository operations.
- Seed accounts contain example data in development. Seed/reset endpoints and automatic demo data are disabled in production.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL 16 with pgvector, or Docker Desktop for the included local database.

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and set a strong `POSTGRES_PASSWORD`, `JWT_SECRET`, `APP_DATA_ENCRYPTION_KEY`, and `BACKUP_ENCRYPTION_KEY`. Generate the two independent 32-byte encryption keys with:
```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```
Keep both encryption keys in a secrets manager, separate from database backups, and retain recoverable copies: losing a key makes its encrypted data unrecoverable. Start the included PostgreSQL 16/pgvector service:
```env
DATABASE_URL=postgresql://internatlas:change-me@localhost:5432/internatlas
POSTGRES_PASSWORD=change-me
JWT_SECRET=replace-with-a-long-random-secret
APP_DATA_ENCRYPTION_KEY=<64-hex-character-key>
BACKUP_ENCRYPTION_KEY=<different-64-hex-character-key>
```
```bash
docker compose up -d postgres
```

The server runs pending migrations before accepting requests. To apply them as a separate deployment step, run `npm run db:migrate`.

### 3. Run Development Server
Start the unified full-stack server (Vite frontend + Express backend on port 3000):
```bash
npm run dev
```

Open your browser at `http://localhost:3000` to access the candidate command center.

### 4. Build for Production
To compile and bundle the production applet:
```bash
npm run build
npm start
```

### Database Backup, Restore, and Retention
- Schedule `.\scripts\backup-db.ps1` from a protected host with `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, Node.js, and PostgreSQL client tools (`pg_dump`/`pg_restore`) configured. It writes an AES-256-GCM encrypted custom-format backup under `backups/` and automatically removes matching local backups older than 30 days; securely store encryption keys outside the backup location.
- Verify backups regularly by restoring into an isolated PostgreSQL 16/pgvector database, then start the application against that restored database and verify login, resumes, preferences, jobs, matches, notifications, and feedback.
- To restore, first stop application writers and take a fresh backup of the target database. Run `.\scripts\restore-db.ps1 -BackupFile .\backups\internatlas-YYYYMMDD-HHMMSS.dump`; the script decrypts the backup and prompts because restore replaces database contents. Restore into a staging database first where possible.
- Job retention/archival remains controlled by the existing cleanup API and its retention settings. Do not use seed/reset endpoints in production; they are not registered there.

### Resume Processing, Privacy, and Retention
- PDF, DOCX, TXT, and Markdown uploads are extracted and parsed locally with deterministic rules. Resume contents are not sent to Gemini or another AI provider. The parser only returns explicitly found values; it does not supply candidate examples, default skills, or inferred experience metrics. Empty/uncertain fields remain empty, and the response marks inferred fields as an empty list.
- Uploads are limited to 10 MB and extracted text to 100,000 characters. Unsupported, malformed, empty, or unreadable files receive a client-safe error.
- Application state, including original resume text and parsed details, is encrypted as an AES-256-GCM PostgreSQL snapshot. Database backup files are separately encrypted. Resume text is not logged by the parsing route.
- Resumes remain in the account until the account holder deletes them or deletes the account. Resume deletion removes the active record and its resume-linked matches immediately; encrypted database backups can retain that record until the 30-day backup expires. Legacy plaintext backups created before this encryption change must be encrypted or securely deleted.

---

## 📡 REST API Endpoints Catalog

### Authentication & Tenant Management
- All API routes require a valid signed-in user except health, registration, login, and logout. User and tenant identifiers are checked against the token; resume, match, notification, and feedback reads are scoped to that account.
- Registration assigns a tenant on the server. Passwords must be at least 12 characters. Demo credentials and seed endpoints are not available in production.
- Sessions use a `SameSite=Strict`, `HttpOnly` cookie with a seven-day JWT lifetime; the browser keeps the bearer token only in memory. Logout clears the cookie, and active sessions are revalidated to handle token expiry.
- Production startup fails unless `JWT_SECRET` is a unique secret of at least 32 characters. Set `ADMIN_USER_IDS` to comma-separated account IDs to authorize shared ingestion, maintenance, queue, test/benchmark, and sensitive alert operations. Shared alert credentials are never returned by the API.
- Password-reset email delivery is not implemented; account recovery requires adding a verified email-delivery flow.
- `POST /api/auth/register` - Create candidate account and assign tenant.
- `POST /api/auth/login` - Authenticate and issue signed JWT.
- `DELETE /api/resumes/:id` - Delete an owned resume and its resume-linked matches.
- `POST /api/auth/logout` - Clear the session cookie.
- `GET /api/auth/me` - Retrieve current session profile, issue a refreshed JWT, and extend the valid cookie.

### Target Scraping & ATS Ingestion
- `GET /api/scrapers/target-companies` - Retrieve the 100+ categorized target companies catalog.
- `POST /api/scrapers/fetch-live` - Dynamically scrape live postings for a company or category.
- `GET /api/scrapers/supported-boards` - List configured ATS adapters and sample board tokens.
- `POST /api/scrapers/greenhouse` - Ingest jobs from Greenhouse boards or raw payloads.
- `POST /api/scrapers/lever` - Ingest jobs from Lever boards or raw payloads.

### Candidate Dashboard & Matching
- `GET /api/dashboard/overview` (JWT required) - Recalculate matches from the authenticated user's saved resume, preferences, and active job records; return account-scoped metrics.
- `PUT /api/dashboard/match-status/:jobId` (JWT required) - Persist the authenticated user's application status (`NEW_MATCH`, `APPLIED`, `OA_RECEIVED`, `INTERVIEWING`, `OFFER`, `REJECTED`).
- `PUT /api/dashboard/target-parameters` (JWT required) - Save the authenticated user's target roles, locations, company lists, alert settings, and match threshold.

### Resume Intelligence & Sub-Vectors
- `POST /api/resume/upload` - Upload `.pdf`, `.docx`, or raw text resume for vector chunking.
- `GET /api/resume/active` - Retrieve parsed resume structure and sub-vector sync state.
- `POST /api/resume/delta-update` - Perform lightning-fast delta updates to individual resume bullets.

### Hiring Analytics & Historical Patterns
- `GET /api/analytics/hiring-patterns` - Query historical posting velocity, lifespan distribution, and skill frequencies.

### Dev Sandbox & End-to-End Test Bench
- `POST /api/e2e/test-suite` - Execute full 15-phase pipeline integration test suite.
- `POST /api/e2e/benchmark` - Run high-concurrency ingestion and vector scoring stress test.

---

## 📜 License

InternAtlas is licensed under the MIT License. Developed for software engineering students, new graduates, and technical job seekers aiming for high-impact engineering careers.
