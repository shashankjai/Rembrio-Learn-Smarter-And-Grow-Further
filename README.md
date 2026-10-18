# Rembrio — Learn smarter. Know more.

Rembrio is an AI-powered personal learning assistant. Upload study PDFs, ask questions about them, get answers with **page-level source citations**, generate quizzes, build study plans and track your progress.

- **Frontend:** React 19, Vite, React Router, Tailwind CSS v4, Lucide icons
- **Backend:** Node.js, Express 5, MongoDB + Mongoose, JWT auth, bcrypt, Zod validation
- **AI:** Google Gemini (answers, quizzes, plans) and Gemini embeddings, with real vector retrieval (RAG)

> **Read this first — what has and has not been verified.**
> All code, unit tests and API integration tests were run (see [Testing](#testing)). The integration suite ran against a real MongoDB-compatible database with the **AI calls mocked**. The code has **not** been run against a real Gemini API key or a real MongoDB Atlas vector index, because neither was available when it was built. You need both for the full experience; the steps below explain how to set them up. Expect to spend a few minutes tuning `RAG_MIN_SCORE` on your own documents.

---

## Contents

1. [Features](#features) · 2. [Architecture](#architecture) · 3. [Folder structure](#folder-structure) · 4. [Prerequisites](#prerequisites) · 5. [Setup on Windows (PowerShell)](#setup-on-windows-powershell) · 6. [MongoDB and vector search](#mongodb-and-vector-search) · 7. [Gemini API key](#gemini-api-key) · 8. [Environment variables](#environment-variables) · 9. [Running](#running) · 10. [API reference](#api-reference) · 11. [The RAG pipeline](#the-rag-pipeline) · 12. [Security](#security) · 13. [Testing](#testing) · 14. [Production](#production-build-and-deployment) · 15. [Limitations](#known-limitations) · 16. [Troubleshooting](#troubleshooting)

## Features

| Area | What it does |
|---|---|
| Accounts | Register, sign in, profile update, password change, sign out (revokes the token on every device) |
| Documents | PDF upload with progress, asynchronous processing with real status (`processing` → `ready` / `failed`), detail page, delete with confirmation, duplicate detection |
| Study assistant | Question answering over selected (or all) documents, expandable citations (file, page, excerpt, match score), explicit "not enough evidence" answers, saved conversation history |
| Quizzes | AI-generated multiple-choice quizzes grounded in your text, strict validation of AI output, explanations with source page, attempts and scores saved |
| Study plans | AI-generated or manual plans, task completion, deadlines, progress bars |
| Progress | Score history, 30-day activity, weak topics — all computed from recorded data; empty states for new users |

## Architecture

```text
 Browser (React SPA)
     │  /api/*  (Vite proxy in dev, or VITE_API_URL)
     ▼
 Express API ── auth, validation (Zod), rate limits, ownership checks
     │
     ├── Ingestion:  PDF ─► pdf-parse (per page) ─► chunker ─► Gemini embeddings ─► MongoDB (chunks + vectors)
     │
     ├── Retrieval:  question ─► query embedding ─► vector search (user-scoped) ─► top-k chunks
     │
     ├── Generation: grounded prompt ─► Gemini ─► JSON answer ─► validated citations
     │
     └── MongoDB: users, documents, chunks, conversations, messages, quizzes, attempts, plans
```

## Folder structure

```text
Rembrio/
├── package.json            root scripts (dev, build, test)
├── client/                 React + Vite app
│   └── src/
│       ├── components/     layouts, ui primitives, charts, logo, hero illustration
│       ├── context/        AuthContext
│       ├── hooks/          useDocuments (with polling)
│       ├── pages/          Landing, Login, Register, Dashboard, Documents, DocumentDetail,
│       │                   Assistant, Quizzes, Progress, StudyPlans, Profile
│       ├── services/api.js centralised API client
│       └── utils/          validators, formatting, safe rich-text parser
└── server/
    ├── scripts/createVectorIndex.js
    ├── src/
    │   ├── config/         env, db
    │   ├── controllers/    auth, profile, documents, chat, quiz, progress, study plans
    │   ├── middleware/     auth, errorHandler, rateLimit, upload
    │   ├── models/         User, Document, DocumentChunk, Conversation, Message, Quiz, QuizAttempt, StudyPlan
    │   ├── routes/         single router, all endpoints
    │   ├── services/
    │   │   ├── pdf/        extract.js, chunker.js
    │   │   ├── embeddings/ embeddings.js
    │   │   ├── rag/        ingest.js, retriever.js, vectorStore.js, answer.js
    │   │   └── ai/         client.js, gemini.js, quizService.js, planService.js
    │   ├── app.js          Express app factory
    │   └── server.js       entry point
    └── tests/              Vitest + Supertest
```

## Prerequisites

- **Node.js 20 or newer** (built and tested on Node 22) and npm
- A **MongoDB** database: local MongoDB Community Server, or a free MongoDB Atlas cluster
- A **Gemini API key** (free tier available)

## Setup on Windows (PowerShell)

```powershell
# 1. From the extracted Rembrio folder, install everything
cd Rembrio
npm run install:all

# 2. Create the server environment file and open it
Copy-Item server\.env.example server\.env
notepad server\.env

# 3. Generate a JWT secret and paste it into server\.env as JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Start the API and the web app together
npm run dev
```

Open <http://localhost:5173>. The API listens on <http://localhost:5000>; check <http://localhost:5000/api/health>.

To run the two halves in separate terminals instead: `npm run dev:server` and `npm run dev:client`.

## MongoDB and vector search

Rembrio has two interchangeable vector backends, selected with `VECTOR_BACKEND`:

| Backend | Use for | How it works |
|---|---|---|
| `local` (default) | Development on any MongoDB, including a local `mongod` | Exact cosine similarity computed in Node over the user's chunks. Real similarity ranking, but O(n) — fine for tens of thousands of chunks, not for large corpora. |
| `atlas` | Production | MongoDB Atlas **Vector Search** (`$vectorSearch`) with ownership filters applied inside the vector query. |

### Local MongoDB (simplest start)

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and start it.
2. In `server\.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/rembrio` and `VECTOR_BACKEND=local`.

### MongoDB Atlas with Vector Search

1. Create a free cluster at <https://cloud.mongodb.com>, add a database user, and allow your IP under *Network Access*.
2. Copy the connection string into `MONGODB_URI` (include the database name, e.g. `.../rembrio`).
3. Set `VECTOR_BACKEND=atlas`.
4. Create the index once:

   ```powershell
   npm run create-vector-index
   ```

   If your tier or driver does not allow creating it from code, create it in the Atlas UI (*Atlas Search → Create Search Index → Vector Search → JSON editor*) on collection `documentchunks` with the name from `VECTOR_INDEX_NAME` and this definition:

   ```json
   {
     "fields": [
       { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
       { "type": "filter", "path": "userId" },
       { "type": "filter", "path": "documentId" }
     ]
   }
   ```

   `numDimensions` **must equal** `EMBEDDING_DIMENSIONS`. The index takes a minute to become queryable. If you change the dimension or embedding model later, you must re-create the index and re-upload documents (old vectors are incompatible).

## Gemini API key

1. Open <https://aistudio.google.com/apikey> and create a key.
2. Put it in `server\.env` as `GEMINI_API_KEY`. It stays on the server and is never sent to the browser.
3. Restart the server. `GET /api/health` will report `"aiConfigured": true`.

Without a key the app still runs, but uploaded PDFs end in `failed` ("AI service is not configured") and chat, quizzes and AI plans return a clear 503 message. Manual study plans, profile, and progress work without a key.

## Environment variables

`server/.env` (see `server/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | — (required) | MongoDB connection string |
| `JWT_SECRET` | — (required, ≥16 chars) | Signs session tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `GEMINI_API_KEY` | — | Enables all AI features |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Model for answers, quizzes, plans |
| `EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model |
| `EMBEDDING_DIMENSIONS` | `768` | Vector size; must match the Atlas index |
| `AI_TIMEOUT_MS` | `45000` | Per-request AI timeout |
| `VECTOR_BACKEND` | `local` | `local` or `atlas` |
| `VECTOR_INDEX_NAME` | `rembrio_chunks_vector` | Atlas index name |
| `PORT` | `5000` | API port |
| `CLIENT_URL` | `http://localhost:5173` | Allowed browser origin(s), comma-separated (CORS) |
| `UPLOAD_DIR` | `./uploads` | Where PDFs are stored on disk |
| `MAX_UPLOAD_MB` | `20` | Upload size limit |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `1000` / `150` | Characters per chunk / overlap |
| `RAG_TOP_K` | `4` | Chunks retrieved per question |
| `RAG_MIN_SCORE` | `0.45` | Minimum cosine similarity to use a chunk |

`client/.env` is optional: `VITE_API_URL` is only needed if the API is on a different origin. Only non-secret values may live in client variables.

> Model names change over time. If you see "model not found", check `GEMINI_MODEL` / `EMBEDDING_MODEL` against Google's current model list.

## Running

| Task | Command |
|---|---|
| Install everything | `npm run install:all` |
| Dev (API + web) | `npm run dev` |
| API only | `npm run dev:server` |
| Web only | `npm run dev:client` |
| Production build of the web app | `npm run build` (output in `client\dist`) |
| Start API (production) | `npm start` |
| All tests | `npm test` |

## API reference

All responses are JSON: `{ "success": true, "data": … }` or `{ "success": false, "error": { "message", "details?" } }`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Status, DB state, whether AI is configured |
| POST | `/api/auth/register` | `{ name, email, password }` → `{ user, token }`. Password ≥ 8 chars with a letter and a number. 409 on duplicate email |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Revokes all of the user's tokens |
| GET / PATCH | `/api/profile` | PATCH: `name`, `email`, `newPassword`; email/password changes require `currentPassword` |
| GET | `/api/documents` | Your documents |
| POST | `/api/documents/upload` | multipart field `file` (PDF). Returns **202** with status `processing` |
| GET | `/api/documents/:id` | Poll until `ready` or `failed` |
| DELETE | `/api/documents/:id` | Deletes file and all chunks |
| POST | `/api/chat/ask` | `{ question, documentIds?, conversationId? }` → `{ conversationId, message: { content, citations[], sufficientEvidence } }` |
| GET | `/api/chat/history` | Without params: conversation list. With `?conversationId=`: its messages |
| POST | `/api/quizzes/generate` | `{ documentIds[], topic?, numQuestions (3–15) }` → quiz **without** answers |
| POST | `/api/quizzes/submit` | `{ quizId, answers: [{ questionId, selectedIndex }] }` → score, per-question results with explanations; attempt saved |
| GET | `/api/progress` | Summary, score history, 30-day activity, weak topics |
| GET / POST | `/api/study-plans` | POST: `{ generate: true, goal, deadline?, documentIds? }` for AI, or `{ title, tasks[] }` for manual |
| PATCH / DELETE | `/api/study-plans/:id` | PATCH: `title`, `goal`, `deadline`, `taskUpdates: [{ id, completed }]`, `addTasks` |

Status codes you will see: 400 validation, 401 unauthenticated, 404 not found (also returned for other users' resources), 409 conflict, 413 file too large, 429 rate limit (including Gemini's), 502/504 AI upstream problems, 503 AI not configured.

## The RAG pipeline

This section is written so you can explain the design in an interview.

**Ingestion** (`services/rag/ingest.js`)

1. **Upload** (`middleware/upload.js`, `documentController.js`): Multer streams the file to disk under a random name. The server checks MIME type, extension **and the `%PDF-` magic bytes**, enforces the size limit, and hashes the file (SHA-256) to reject exact duplicates per user. The request returns `202` immediately.
2. **Extract** (`pdf/extract.js`): `pdf-parse` returns text **per page**, so page numbers are exact.
3. **Chunk** (`pdf/chunker.js`): ~1000-character windows with 150 overlap, preferring paragraph, then sentence, then word boundaries. A chunk **never spans two pages**, so every chunk has one exact page for citation.
4. **Embed** (`embeddings/embeddings.js`): batches of 50 go to Gemini with `taskType: RETRIEVAL_DOCUMENT` and `outputDimensionality: 768`. Each vector's length is verified, then L2-normalised so dot product equals cosine similarity.
5. **Store**: each chunk is saved with `userId`, `documentId`, `filename`, `page`, `text`, `embedding`. Only after **all** chunks are stored does the document become `ready`. Any failure marks it `failed` with a message and removes partial chunks.

**Retrieval** (`rag/retriever.js`, `rag/vectorStore.js`)

1. Only the caller's `ready` documents are eligible; ids belonging to someone else are silently dropped.
2. The question is embedded with `taskType: RETRIEVAL_QUERY` — the asymmetric pairing designed for question→passage search.
3. Vector search returns the top-k chunks (default 4). On Atlas this is `$vectorSearch` with `numCandidates` ≥ 100 and a `filter` on `userId` and `documentId` **inside the vector query**; locally it is exact cosine search with the same filters. Both return cosine scores on the same scale.
4. Chunks scoring below `RAG_MIN_SCORE` are discarded. **If none remain, Gemini is not called** and the user gets the insufficient-evidence message.

**Generation** (`rag/answer.js`)

1. A numbered-passage prompt tells Gemini to answer **only** from the passages, to report `sufficient: false` when they do not contain the answer, to list which passage numbers it used, and to ignore instructions embedded in passage text (prompt-injection mitigation). Output is constrained with a JSON response schema.
2. **Citations are never taken from model text.** The model only returns passage *numbers*; filename, page, excerpt and score are looked up from the retrieved chunks. Invented, duplicate or out-of-range numbers are dropped.
3. If the model claims sufficiency but no valid citation survives, the answer is replaced by the insufficient-evidence message.

**Quizzes and plans** reuse retrieval (topic quizzes) or evenly spaced samples across the document (whole-document quizzes). Every AI response is validated with Zod: questions need exactly four distinct options and an in-range correct index, otherwise they are dropped; options are shuffled server-side; correct answers are never sent to the browser until the quiz is submitted.

**Design decisions worth mentioning**

- *Why not send the whole PDF to Gemini?* Cost, context limits, and no way to cite pages. Retrieval narrows context to what matters and makes citations verifiable.
- *Why page-bounded chunks?* Exact page citations beat slightly better chunk continuity.
- *Why denormalise `userId` onto chunks?* It lets the vector index pre-filter by owner, so isolation is enforced before ranking.
- *Why normalise vectors ourselves?* Gemini only returns unit-length vectors at full dimensionality; truncated (768-d) vectors must be re-normalised for cosine similarity to be correct.
- *Why a `local` backend?* So the project runs on any MongoDB. It is honest about its O(n) cost and is not described as Atlas Vector Search.

## Security

- Passwords hashed with bcrypt (cost 12); login does a dummy comparison for unknown emails and returns one generic error, to avoid revealing which emails exist.
- JWT with a per-user `tokenVersion`: logout and password change invalidate **all** existing tokens server-side.
- Zod validation on every body/query; malformed ids return 404 before touching the database.
- **Ownership:** every private query is scoped by `userId`; another user's resource is indistinguishable from a missing one (404). Covered by an automated cross-user test across documents, chat, quizzes, plans and progress.
- Rate limits: auth (20/15 min), AI endpoints (40/10 min per user), uploads (30/hour per user), general API (300/min).
- Helmet headers, CORS limited to `CLIENT_URL`, 1 MB JSON limit, uploads stored under random names outside any static path.
- AI output is rendered as React elements (never raw HTML); passage text is treated as untrusted in prompts.
- Secrets live only in `server/.env`, which is git-ignored; `.env.example` files contain placeholders.
- The JWT is stored in `localStorage`. This is simple and works across origins but is readable by any XSS; there is no known XSS sink in the app, but for higher-security deployments consider an `HttpOnly` cookie design.

## Testing

```powershell
npm test               # server + client
npm run test:server    # Vitest + Supertest
npm run test:client    # Vitest
```

What the suites cover and what they do **not**:

| Suite | Runs against | Notes |
|---|---|---|
| `chunker`, `pdf` | Real code, real `pdf-parse` on generated PDFs | Page-number extraction, overlap, termination |
| `embeddings`, `answer`, `vectorStore`, `aiOutputValidation` | **Mocked** Gemini SDK; local vector search with mocked model | Batching, dimension checks, citation integrity, insufficient evidence, quiz/plan validation, Atlas pipeline *construction* |
| `api.public` | Real Express app, no database | Auth gates on all protected routes, validation |
| `integration` (29 tests) | Real Express + **real MongoDB-compatible DB**; embeddings replaced by deterministic fake vectors, Gemini replaced by scripted JSON | Registration/login/logout, profile, upload + real PDF processing, duplicate and scanned-PDF handling, RAG with correct page citations, quizzes, progress, study plans, and **cross-user isolation** |
| client `utils` | Pure functions | Validators, formatters, safe rich-text parser |

The integration suite uses `MONGODB_TEST_URI` if set; otherwise it starts `mongodb-memory-server`, which **downloads a `mongod` binary on first run** (needs internet). If neither is available the integration tests are **skipped** and reported as skipped.

**Not tested here:** real Gemini calls (output quality, rate limits, true embedding dimensions), a real Atlas `$vectorSearch` index, and real scanned/complex PDFs. The Atlas query is covered only by a test that checks the pipeline is built correctly. Please run one end-to-end pass with your own key and a few real PDFs.

## Production build and deployment

```powershell
npm run build          # client\dist
$env:NODE_ENV="production"; npm start
```

- Serve `client\dist` from a static host or CDN and route unknown paths to `index.html` (SPA). Set `VITE_API_URL` at build time if the API is on another domain, and set `CLIENT_URL` on the server to the site's origin.
- Run behind HTTPS and a reverse proxy; in production the app trusts one proxy hop for rate-limiting (`trust proxy = 1`).
- Use `VECTOR_BACKEND=atlas` and a managed MongoDB.
- **Uploads are stored on local disk.** Platforms with ephemeral disks lose PDFs on redeploy (processed text and vectors in MongoDB survive). Mount a persistent volume or move storage to object storage.
- Document processing runs in-process after the upload response. A server restart marks unfinished documents `failed` so users can retry. For heavy use, move ingestion to a job queue.

## Known limitations

- **No OCR:** scanned or image-only PDFs have no text layer and end in `failed` with an explanatory message.
- Extraction quality depends on the PDF (multi-column layouts, tables and formulas can read poorly).
- The `local` vector backend is exact but linear-time; use Atlas for scale.
- `RAG_MIN_SCORE` is a heuristic; the best value depends on your documents. Lower it if good questions get "not enough evidence"; raise it if irrelevant passages get through.
- A quiz is stored when generated; abandoned quizzes remain in the database (they are not shown in the UI).
- Conversation history is stored, but follow-up questions are answered from retrieval alone — earlier turns are not fed back to the model.
- Study plans are generated from a sample of passages (not the full document) and the model's schedule is advisory.
- No email verification or password-reset flow.
- Gemini free-tier limits apply; large PDFs need many embedding calls and can hit rate limits (the document will show `failed` and can be re-uploaded).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server exits: "Missing or invalid environment configuration" | Fill `MONGODB_URI` and a `JWT_SECRET` of at least 16 characters in `server\.env` |
| `ECONNREFUSED` / server selection timeout | MongoDB is not running, or (Atlas) your IP is not allow-listed |
| Document stays `failed`: "AI service is not configured" | Set `GEMINI_API_KEY` and restart; delete and re-upload |
| Document `failed`: "Embedding dimension mismatch" | `EMBEDDING_DIMENSIONS` is not supported by the model, or differs from the index |
| Document `failed`: "no extractable text" | The PDF is scanned/image-only; run OCR first (e.g. Adobe, `ocrmypdf`) and re-upload |
| Questions always say "not enough evidence" | Lower `RAG_MIN_SCORE`; check the document is `ready`; try selecting the document explicitly |
| Atlas: empty results | The vector index is not created yet/still building, its name differs from `VECTOR_INDEX_NAME`, or `numDimensions` is wrong |
| Browser shows CORS errors | `CLIENT_URL` must include the exact origin, e.g. `http://localhost:5173` |
| 429 from AI | Gemini quota reached; wait or use a paid key |
| PowerShell blocks `npm` scripts | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Port already in use | Change `PORT` (and `VITE_PROXY_TARGET` for the client) |

## Design system

Colors: primary navy `#172554`, secondary blue `#2563EB`, accent cyan `#06B6D4` (decorative only — too light for text), background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`, secondary text `#64748B`, borders `#E2E8F0`, success `#16A34A`, error `#DC2626`, warning `#D97706`. Darker status shades are used for text on light backgrounds to meet contrast guidelines. Font: Inter. All tokens live in `client/src/index.css` (`@theme`).
