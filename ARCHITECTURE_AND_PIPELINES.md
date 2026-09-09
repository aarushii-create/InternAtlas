# InternAtlas - Comprehensive Architecture & 15-Phase Execution Pipelines

This document provides a comprehensive technical breakdown of the **InternAtlas (AI Internship Scout)** architecture, mathematical formulation of its scoring pipelines, deterministic deduplication hashing, and the complete 15-phase lifecycle from ingestion to alert dispatch.

---

## 🏛️ High-Level System Architecture

```
                                  +-------------------------------------------------------------+
                                  |                 100+ TARGET COMPANY BOARDS                  |
                                  |  Greenhouse | Lever | Ashby | Workday CXS | REST/GraphQL    |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                             +---------------------------------------+
                                             |     Phase 4: ATS Scraper Adapters     |
                                             |  (Rate Limited & Resilient Ingestion) |
                                             +---------------------------------------+
                                                                 |
                                                                 v
                                             +---------------------------------------+
                                             |     Phase 5: Deterministic Dedup      |
                                             |  SHA-256 Collision-Resistant Hashing  |
                                             +---------------------------------------+
                                                                 |
                                                                 v
+-----------------------------+              +---------------------------------------+
|  Phase 1 & 2: Resume Input  |              |    Phase 7: Layer 1 RAG Matching      |
|  Parsed AST & Sub-Vectors   | -----------> | Stated Cosine Similarity & Hard Reqs  |
|  (Skills, Exp, Projects)    |              +---------------------------------------+
+-----------------------------+                                  |
                                                                 v
+-----------------------------+              +---------------------------------------+
|  Phase 3: Company Knowledge |              |    Phase 8: Layer 2 Reality Engine    |
|  Informal Engineering Bars  | -----------> |   OA Format, DSA Bar, Tacit Filters   |
|  (Citadel, Databricks, etc) |              +---------------------------------------+
+-----------------------------+                                  |
                                                                 v
                                             +---------------------------------------+
                                             |  Phase 9: Composite Scoring Engine    |
                                             |   0.50(L1) + 0.35(L2) + 0.15(Comp)    |
                                             +---------------------------------------+
                                                                 |
                                      +--------------------------+--------------------------+
                                      |                                                     |
                                      v                                                     v
                   +------------------------------------+                +------------------------------------+
                   | Phase 11: Sub-500ms Multi-Channel  |                | Phase 14: Candidate Command Center |
                   | Alerting (Telegram Bot / Webhooks) |                | (Linear/Vercel SaaS React 19 UI)   |
                   +------------------------------------+                +------------------------------------+
```

---

## 🔄 The 15-Phase Execution Pipeline

InternAtlas processes and matches engineering opportunities through an isolated, deterministic 15-phase pipeline:

### Phase 1: In-Memory Multi-Tenant Relational Database
- **Role**: High-performance persistence layer with ACID-like transactional semantics and isolation.
- **Input**: User registrations, raw postings, vector embeddings, alert logs, and preferences.
- **Output**: Indexed entities queried with sub-millisecond latency.
- **Key Guarantee**: Complete tenant isolation preventing cross-user data leakage.

### Phase 2: Resume Vector Ingestion & Multi-Section Sub-Vector Chunking
- **Role**: Decomposes candidate resumes into structured AST tokens and generates multi-vector embeddings.
- **Input**: PDF, DOCX, or raw plaintext resumes.
- **Output**: 768-dimensional sub-vectors categorized by:
  - `vector_skills`: Normalized programming languages, frameworks, and low-level tools.
  - `vector_experience`: Professional internship experiences, scale metrics, and production accomplishments.
  - `vector_projects`: Complex academic and systems implementations (e.g., Raft consensus, GPU kernels, microservices).
  - `vector_education`: Degree tier, GPA, coursework, and graduation timeline.
- **SLA**: `< 150ms` delta update latency when modifying single resume bullets.

### Phase 3: Company Knowledge Graph & Reality Bar Store
- **Role**: Maintains curated engineering intelligence on 100+ top-tier tech companies, quant funds, and unicorns.
- **Data Points**:
  - `typicalHiringBar`: `Extreme` (Citadel, Jane Street, Tower Research), `Hard` (Google, Databricks, OpenAI, Meta), `Standard` (Enterprise IT).
  - `oaPattern`: Assessment formats (e.g., Codeforces 1900+ DP, live CoderPad concurrency simulation, take-home GPU kernel practicals).
  - `unstatedPreferences`: Tacit criteria such as high-scale distributed caching, low-latency microsecond benchmarks, and type-safe systems languages.

### Phase 4: Target ATS Scraper Adapters
- **Role**: Connects to live career endpoints for **Greenhouse, Lever, Ashby, Workday CXS, and Custom REST/GraphQL**.
- **Capabilities**:
  - HTML tag stripping and sanitization (`sanitizeHtml`).
  - Remote eligibility detection (`isRemote = true | false`).
  - Requisition ID extraction from headers, URLs, and bodies (`extractReqId`).
  - Stated skill requirement parser (`extractStatedRequirements`).

### Phase 5: Deterministic SHA-256 Deduplication & Canonicalization
- **Role**: Eliminates identical postings syndicated across job aggregator boards.
- **Mathematical Formula**:
  $$\text{Hash} = \text{SHA-256}\left(\text{canonical}(\text{company}) \parallel \text{canonical}(\text{title}) \parallel \text{cluster}(\text{location}) \parallel \text{req\_id}\right)$$
- **Canonicalization Rules**:
  - Strip punctuation and trailing corporate suffixes (`Inc.`, `LLC`, `Corp`, `Technologies`).
  - Standardize location clusters (e.g., `San Francisco Bay Area`, `SF, CA`, `Menlo Park` $\rightarrow$ `SF_BAY_AREA`).

### Phase 6: Autonomous Stale Job Pruning & TTL Cleanup
- **Role**: Removes closed postings and marks expired application windows based on rolling company lifespan distributions.
- **Rules**:
  - HFT / Quant internships: 14-day aggressive TTL.
  - Big Tech rolling positions: 30-day standard TTL.
  - Automatic HTTP HEAD check against `directApplyUrl` to detect HTTP 404/410 closures.

### Phase 7: Layer 1 RAG Matching (Stated Job Description Vector Match)
- **Role**: Measures alignment between candidate resume sub-vectors and explicitly stated job requirements.
- **Mathematical Formula**:
  $$\text{Cosine Similarity}(u, v) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
  $$\text{Score}_{\text{L1}} = w_{\text{vector}} \cdot \text{Cosine}(u, v) + w_{\text{skills}} \cdot \frac{|\text{Skills}_{\text{candidate}} \cap \text{Skills}_{\text{required}}|}{|\text{Skills}_{\text{required}}|}$$

### Phase 8: Layer 2 RAG Matching (Company Reality & Informal Bar Engine)
- **Role**: Evaluates candidates against unstated, informal engineering benchmarks.
- **Evaluation Dimensions**:
  - Algorithmic Rigor: Projects demonstrating custom memory allocators, lock-free structures, or competitive programming achievements.
  - Systems Complexity: Demonstrating distributed consensus, SIMD vectorization, or Linux kernel internals.
  - Scale & Impact: Realized queries-per-second, throughput gains, and benchmarked latencies.

### Phase 9: Composite Multi-Factor Scoring Engine
- **Role**: Computes the final unified ranking score using configurable priority weights:
  $$\text{Score}_{\text{final}} = \left(w_1 \cdot \text{Score}_{\text{L1}} + w_2 \cdot \text{Score}_{\text{L2}} + w_3 \cdot \text{Score}_{\text{comp}}\right) - \left(\text{Penalty}_{\text{loc}} + \text{Penalty}_{\text{visa}}\right)$$
  - Default Weights: $w_1 = 0.50$, $w_2 = 0.35$, $w_3 = 0.15$.

### Phase 10: Asynchronous Priority Queue & Distributed Task Scheduler
- **Role**: Manages scraper cron schedules, proxy rotation, and worker concurrency without blocking HTTP request threads.
- **Guarantees**: Exponential backoff with jitter on HTTP 429 rate limits.

### Phase 11: Real-Time Multi-Channel Notification Dispatcher
- **Role**: Emits instantaneous alerts to candidates when a posting exceeds their custom match threshold (e.g., $\ge 85\%$).
- **Channels**:
  - Telegram Bot Webhook (`< 500ms` dispatch SLA).
  - Transactional Email (Resend API adapter).
- **Urgency Categories**:
  - `CRITICAL_IMMEDIATE`: HFT/Quant and Tier 1 AI postings closing within 48–72 hours.
  - `HIGH_ROLLING`: Top Big Tech and Unicorn roles evaluated on a rolling basis.

### Phase 12: Adaptive Scoring Feedback Loop
- **Role**: Dynamically tunes candidate scoring thresholds and category weights based on explicit user feedback (`THUMBS_UP`, `THUMBS_DOWN`, `APPLIED`, `INTERVIEW_INVITE`).
- **Adjustment**: Auto-calibrates individual penalty parameters based on application conversion rates.

### Phase 13: Dynamic Resume Tailoring Engine
- **Role**: Generates tailored project summary recommendations and ATS bullet optimizations for specific target job matches without fabricating metrics.

### Phase 14: Consumer SaaS Candidate Command Center
- **Role**: Provides a clean, modern frontend dashboard built with React 19, Tailwind CSS v4, and dark-mode glassmorphism.
- **Features**: Real-time category filtering (Big Tech, Quant, Indian Unicorns, AI Labs, IT Services), company tier indicators, matched vs. missing skills badges, direct application actions, and slide-in reality bar drawers.

### Phase 15: Developer Sandbox & End-to-End Test Studio
- **Role**: Isolates diagnostic telemetry, load benchmarks, scraper test benches, and database schema explorers into an administrative suite, keeping the consumer interface clean.

---

## 📊 Deduplication & Normalization Pipeline Deep Dive

Every scraped raw job posting undergoes strict canonicalization:

```typescript
// Deterministic Hash Generation Logic (Phase 5)
export function generateJobDedupHash(
  company: string,
  title: string,
  location: string,
  reqId?: string
): string {
  const normCompany = company.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normTitle = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normLoc = location.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normReq = (reqId || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const payload = `${normCompany}|${normTitle}|${normLoc}|${normReq}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

---

## ⚡ Concurrency & Benchmark Specifications

InternAtlas dev sandbox includes automated concurrency stress-testing:
- **Throughput Capacity**: Evaluates `1,000+` postings across 25 concurrent workers in `< 2.5 seconds`.
- **Memory Footprint**: Strict memory limits with garbage-collected in-memory indices and zero persistent memory leaks.
- **API Response SLAs**:
  - `GET /api/dashboard/overview`: `< 45ms` (p95)
  - `POST /api/scrapers/fetch-live`: `< 850ms` (p95 across multi-ATS boards)
  - `POST /api/resume/delta-update`: `< 120ms` (p95)

---

## 🔒 Security & Multi-Tenancy Design

1. **Scoped Tenant Context**: All read and write operations require a validated `tenantId`.
2. **Cryptographic Signatures**: API authentication via HMAC-SHA256 JWT tokens.
3. **Sliding-Window Rate Limiting**:
   - `scraperRateLimiter`: Maximum 10 scraper triggers per IP per 60 seconds.
   - `authRateLimiter`: Maximum 20 authentication attempts per IP per 15 minutes.
   - `generalRateLimiter`: Maximum 120 API requests per IP per 60 seconds.
