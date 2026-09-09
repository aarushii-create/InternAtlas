# InternAtlas (AI Internship Scout)

> **High-Performance Autonomous Internship Discovery & Two-Layer Vector RAG Matching Engine for Elite Software Engineering Roles**

InternAtlas is a production-grade, consumer-facing SaaS intelligence platform engineered for top-tier software engineering, quantitative development, and AI research candidates. It autonomously aggregates, normalizes, deduplicates, and evaluates live internship postings across **100+ target technology leaders, quant hedge funds, high-growth Indian tech unicorns, AI labs, and enterprise IT giants** in real time.

Unlike superficial keyword scrapers, InternAtlas executes a **Two-Layer Retrieval-Augmented Generation (RAG) Architecture**:
1. **Layer 1 (Stated Job Description Vector Match)**: Mathematical cosine similarity between high-dimensional candidate resume embeddings (768-d) and parsed job requirements.
2. **Layer 2 (Company Reality & Informal Bar Engine)**: Evaluates unstated engineering expectations (e.g., Codeforces 1900+ algorithmic benchmarks, low-latency microsecond C++ concurrency for Citadel/Jane Street, distributed systems Raft consensus for Databricks, CUDA kernel optimization for NVIDIA/OpenAI).

---

## 🌟 Key Architecture & Capabilities

- ⚡ **Live Web Scraping & Multi-ATS Ingestion Engine**: Real-time connectors for **Greenhouse, Lever, Ashby, Workday CXS, SmartRecruiters**, and custom GraphQL/REST career endpoints for 109 target global and Indian tech companies.
- 🛡️ **Deterministic SHA-256 Deduplication & Canonicalization**: Collision-resistant cryptographic hashing (`SHA-256(canonical(company) + canonical(title) + location_cluster + req_id)`) ensuring zero duplicate postings across syndication networks.
- 🧠 **Sub-Vector Modular Resume Intelligence**: Granular vector chunking across Skills, Work Experience, Technical Projects, and Education with delta updates in `< 150ms`.
- 📊 **Historical Hiring Velocity & Lifespan Analytics**: Rolling 180-day telemetry tracking job posting lifespans, early-window application advantages, and interview callback correlations.
- 🔔 **Sub-500ms Multi-Channel Alerting Dispatcher**: Real-time webhook notifications via Telegram Bot and transactional Email with custom fit score thresholds and urgency routing (`CRITICAL_IMMEDIATE` vs. `HIGH_ROLLING`).
- 🎨 **Linear/Vercel-Grade SaaS UI**: Sleek dark-mode candidate command center with company tier indicators, matched vs. missing skills, reality bar drawer, and target preference customization.
- 🧪 **Comprehensive Dev Sandbox & E2E Test Suite**: Fully isolated administrative studio with 15-phase pipeline simulators, concurrency stress benchmarks, and automated test runners.

---

## 🏢 Target Company Catalog (100+ Live Tracked Companies)

InternAtlas continuously tracks and normalizes open engineering internships across five critical market tiers:

| Sector / Tier | Target Companies Tracked | Primary ATS Adapters | Typical Hiring Bar |
| :--- | :--- | :--- | :--- |
| **Tech Giants & Big Tech** (23) | Google, Microsoft, Amazon, Meta, Apple, NVIDIA, Adobe, Atlassian, Uber, LinkedIn, Salesforce, ServiceNow, Walmart Global Tech, Intuit, Oracle, SAP, Cisco, Qualcomm, Intel, AMD, Texas Instruments, Broadcom, VMware | Workday, Greenhouse, Lever, Custom REST | Hard (Distributed Systems, DSA, System Design) |
| **Finance & Quant/HFT** (16) | Citadel, Jane Street, DE Shaw, Tower Research, Goldman Sachs, JPMorgan Chase, Morgan Stanley, Bank of America, Barclays, PayPal, Visa, Mastercard, American Express, Deutsche Bank, UBS, Wells Fargo | Ashby, Greenhouse, Workday, Custom REST | Extreme (Microsecond C++, Olympiad DSA, Concurrency) |
| **High-Growth / Indian Tech Unicorns** (35) | Flipkart, PhonePe, Razorpay, Swiggy, Zomato, Meesho, CRED, Groww, Zerodha, Paytm, Dream11, MakeMyTrip, Nykaa, Lenskart, Zepto, Blinkit, Rapido, Delhivery, BigBasket, Postman, BrowserStack, Freshworks, Zoho, Chargebee, InMobi, ShareChat, Juspay, ThoughtSpot, Amagi, Druva, Hasura, MoEngage, Sarvam AI, Krutrim, Databricks, Stripe | Greenhouse, Lever, Ashby, Custom REST | Hard (Scale Architecture, High-Concurrency Go/Java) |
| **AI & Analytics** (13) | OpenAI, Anthropic, Fractal Analytics, Tiger Analytics, Mu Sigma, Tredence, LatentView Analytics, Sigmoid, Uniphore, Yellow.ai, Observe.AI, Arya.ai, Microsoft/Google Research | Ashby, Lever, Greenhouse, Custom REST | Hard (CUDA, PyTorch, Megatron, LLM Pretraining) |
| **Enterprise Services & IT** (22) | TCS, Infosys, Wipro, HCLTech, Cognizant, Accenture, Capgemini, Deloitte, EY, KPMG, LTIMindtree, Persistent Systems, Mphasis, Coforge, Tech Mahindra, Genpact, Hexaware, CGI, Zensar, DXC Technology, Tata Elxsi, L&T Technology Services | Workday, SmartRecruiters, Custom REST | Standard to Medium-Hard (Java, Cloud, Spring) |

---

## 🛠️ Complete Tech Stack Breakdown

### Frontend (Consumer SaaS & Candidate Command Center)
- **Framework**: React 19 (TypeScript, Functional Components, Custom Hooks)
- **Styling & Design System**: Tailwind CSS v4, Lucide React Icons, Glassmorphism, Dark-mode SaaS aesthetics (Linear/Vercel design patterns)
- **State Management & Routing**: React Context API, Tabbed Single-Page Architecture, Persistent Local Storage Session Management
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

### In-Memory Database & Persistence Engine
- **Storage Layer**: Type-safe relational in-memory database with ACID-like transactional upserts and indices
- **Data Collections**: Users, Tenants, Resumes, Sub-Vectors, Jobs, Target Preferences, Matched Postings, Notifications, Feedback Logs, Dynamic Resume Exports

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the project root for optional alerting and authentication configuration:
```env
PORT=3000
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
RESEND_API_KEY=your_resend_api_key_here
JWT_SECRET=intern_atlas_super_secure_jwt_secret_2026
```

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

---

## 📡 REST API Endpoints Catalog

### Authentication & Tenant Management
- `POST /api/auth/register` - Create candidate account and assign tenant.
- `POST /api/auth/login` - Authenticate and issue signed JWT.
- `GET /api/auth/me` - Retrieve current session profile and target preferences.

### Target Scraping & ATS Ingestion
- `GET /api/scrapers/target-companies` - Retrieve the 100+ categorized target companies catalog.
- `POST /api/scrapers/fetch-live` - Dynamically scrape live postings for a company or category.
- `GET /api/scrapers/supported-boards` - List configured ATS adapters and sample board tokens.
- `POST /api/scrapers/greenhouse` - Ingest jobs from Greenhouse boards or raw payloads.
- `POST /api/scrapers/lever` - Ingest jobs from Lever boards or raw payloads.

### Candidate Dashboard & Matching
- `GET /api/dashboard/overview` - Complete unified candidate dashboard metrics and scored matches.
- `PUT /api/dashboard/jobs/:jobId/status` - Update application tracking state (`APPLIED`, `OA_RECEIVED`, `INTERVIEWING`, `OFFER`, `REJECTED`).
- `PUT /api/dashboard/preferences` - Update target roles, locations, blacklists, and fit threshold.

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
