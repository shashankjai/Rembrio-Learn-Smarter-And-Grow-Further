# Rembrio 📚✨

> **Turn dense PDFs into verifiable knowledge with page-level cited AI answers, active recall quizzes, and structured study plans.**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%26%20Local-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Flash%20%26%20Embeddings-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)

---

## 💡 Why I Built Rembrio

When studying for university exams or reviewing dense research papers, traditional LLMs (like standard ChatGPT) often hallucinate or blend outside internet knowledge with your notes. Worse, they can't tell you *exactly where* they found a piece of information.

I created **Rembrio** as an end-to-end study companion that strictly anchors itself to your documents. When you ask a question, Rembrio extracts semantics from your uploaded PDFs, ranks relevant passages, and synthesizes answers accompanied by **exact clickable page citations**. If your material doesn't have the answer, Rembrio explicitly says so instead of guessing.

---

## 🚀 Key Features

- 📑 **Smart PDF Ingestion & Chunking**
  - Extracts text per page using `pdf-parse` and partitions content into semantically coherent overlapping windows.
  - Chunks never span across page boundaries, guaranteeing 100% accurate page citations.
- 🔍 **Grounded RAG (Retrieval-Augmented Generation)**
  - Vector embeddings powered by Gemini embeddings (`768` dimensions).
  - Dual vector backend: switch seamlessly between **MongoDB Atlas Vector Search** (`$vectorSearch`) for production scale and **Local Vector Search** (in-memory cosine similarity) for zero-setup local development.
- 🏷️ **Verifiable Page Citations**
  - Citations are built dynamically from retrieved chunks rather than trusting AI text output.
  - Click to inspect the original text passage, filename, page number, and similarity score.
- 🎯 **AI Quiz Generator & Self-Evaluation**
  - Generates multiple-choice quizzes directly from your material.
  - Automatic answer shuffling, real-time score tracking, and detailed explanations highlighting source pages.
- 🗓️ **Adaptive Study Roadmaps**
  - Define an exam date and learning goal; Rembrio reviews your uploaded documents to build an actionable milestone roadmap.
- 📈 **Productivity & Mastery Analytics**
  - Monitors quiz attempts, performance breakdown, study frequency, and pinpoints weak topics for revision.

---

## 🛠️ Architecture & Pipeline

```text
       ┌───────────────┐
       │   User PDF    │
       └───────┬───────┘
               ▼
     [ PDF Text Extraction ]  ── Page-aware parsing
               ▼
      [ Context Chunker ]     ── Overlapping passage windows
               ▼
     [ Gemini Embeddings ]   ── 768-dim vector transformation
               ▼
    [ Vector Store (Mongo) ]  ── User-isolated vector index
               ▲
               │ Semantic Retrieval (Cosine / Atlas Vector Search)
               ▼
       [ Prompt Engine ]      ── Grounded context + strict anti-hallucination rules
               ▼
      [ Gemini Flash AI ]     ── Structured JSON output
               ▼
  [ Citations & Verification ] ── Map source numbers to real database chunks
               ▼
    [ Interactive Frontend ]  ── React 19 UI with full citation drawer
```

---

## 📂 Project Structure

```text
Rembrio/
├── client/                     # Frontend Application
│   ├── src/
│   │   ├── assets/             # Branding & visual assets (logo.png)
│   │   ├── components/         # Reusable UI primitives, charts, layouts, logo
│   │   ├── context/            # AuthContext & global state
│   │   ├── pages/              # Landing, Dashboard, Documents, Assistant, Quizzes, Plans
│   │   ├── services/api.js     # Centralized API client & HTTP interceptors
│   │   └── utils/              # Client-side validators & formatters
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API & RAG Engine
│   ├── src/
│   │   ├── config/             # Environment & MongoDB connection
│   │   ├── controllers/        # Auth, Documents, Chat, Quizzes, StudyPlans, Analytics
│   │   ├── middleware/         # JWT Auth, Multer upload, Rate limiting, Error handler
│   │   ├── models/             # Mongoose schemas (Users, Documents, Chunks, Quizzes)
│   │   ├── routes/             # REST API routes
│   │   ├── services/
│   │   │   ├── ai/             # Gemini client, Quiz & Plan generators
│   │   │   ├── embeddings/     # Text vectorization & normalisation
│   │   │   ├── pdf/            # PDF extraction & chunking algorithms
│   │   │   └── rag/            # Retriever, Vector store & Answer generator
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server bootstrap
│   ├── scripts/                # Database maintenance & Atlas index creation
│   ├── tests/                  # Integration and unit test suite
│   └── package.json
│
└── package.json                # Root orchestration scripts
```

---

## ⚙️ Tech Stack

### Frontend
- **Framework:** React 19 with Vite for instant HMR
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4 + `@fontsource-variable/inter`
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js (v20+) & Express 5
- **Database:** MongoDB with Mongoose ODM
- **Security:** JWT (JSON Web Tokens), bcryptjs, Helmet, Express Rate Limit, Zod request validation
- **File Processing:** Multer with file type/magic-byte checks & `pdf-parse`

### AI & Vector Retrieval
- **Language Model:** Google Gemini (`gemini-3.1-flash-lite` / `gemini-3.8-flash`)
- **Embedding Model:** `gemini-embedding-001` (768 dimensions)
- **Vector Search:** MongoDB Atlas `$vectorSearch` or local in-memory cosine search

---

## 🏁 Getting Started

### 1. Prerequisites
- **Node.js** (v20 or higher) & **npm**
- **MongoDB** (Local instance or free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)
- **Gemini API Key** (Free tier available at [Google AI Studio](https://aistudio.google.com/apikey))

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/shashankjai/Rembrio-Learn-Smarter-And-Grow-Further.git
cd Rembrio-Learn-Smarter-And-Grow-Further

# Install root, backend, and frontend dependencies in one command
npm run install:all
```

### 3. Setup Environment Variables

Copy the example configuration file in the `server` directory:

```bash
cp server/.env.example server/.env
# On Windows PowerShell:
# Copy-Item server\.env.example server\.env
```

Open `server/.env` and provide your credentials:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (Local or Atlas)
MONGODB_URI=mongodb://127.0.0.1:27017/rembrio

# Auth secret (generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
JWT_SECRET=your_super_secret_jwt_key_at_least_16_characters

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=768

# Vector Search Backend: "local" (default) or "atlas"
VECTOR_BACKEND=local
```

### 4. Run the Application

You can spin up both the Express backend and React frontend concurrently:

```bash
npm run dev
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Testing

Rembrio includes an extensive test suite covering unit math utilities, PDF chunking, prompt constraints, and full integration tests:

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:server

# Run frontend tests only
npm run test:client
```

---

## 🔒 Security Highlights

- **Anti-Hallucination Guardrails:** AI prompts enforce strict boundary constraints; answers drop claims that lack matched document passages.
- **Data Isolation:** Every chunk, conversation, and document is strictly scoped by `userId`. Users can never query or access each other's documents.
- **Session Revocation:** JWTs carry a `tokenVersion` pattern allowing instant global session invalidation upon password reset or logout.
- **Upload Validation:** Uploaded PDFs are inspected for correct MIME type, `.pdf` extension, and `%PDF-` file signature magic bytes to block malicious payloads.

---

## 👤 Author

**Shashank**
- GitHub: [@shashankjai](https://github.com/shashankjai)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
