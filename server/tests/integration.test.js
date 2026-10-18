/**
 * End-to-end API tests against a REAL database with the real Express app, real PDF parsing,
 * real chunking, real vector search (local backend) and real ownership checks.
 * Only the two external AI calls are replaced:
 *   - embeddings  -> deterministic bag-of-words vectors (tests/helpers/fakeAi.js)
 *   - Gemini JSON -> scripted responses
 *
 * Database selection (first match wins):
 *   1. MONGODB_TEST_URI            (any MongoDB-compatible server)
 *   2. mongodb-memory-server       (downloads a mongod binary; needs internet access)
 * If neither is available the whole suite is SKIPPED (and reported as skipped, not passed).
 */
import fs from 'node:fs';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { buildPdf } from './helpers/pdf.js';

vi.mock('../src/services/embeddings/embeddings.js', async (importOriginal) => {
  const original = await importOriginal();
  const fake = await import('./helpers/fakeAi.js');
  return { ...original, embedTexts: fake.fakeEmbedTexts, embedQuery: fake.fakeEmbedQuery };
});
vi.mock('../src/services/ai/gemini.js', () => ({ generateJson: vi.fn() }));

const { generateJson } = await import('../src/services/ai/gemini.js');
const { ApiError } = await import('../src/utils/ApiError.js');
const { env } = await import('../src/config/env.js');

async function pickDatabase() {
  if (process.env.MONGODB_TEST_URI) return { uri: process.env.MONGODB_TEST_URI };
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const server = await MongoMemoryServer.create();
    return { uri: server.getUri(), server };
  } catch (err) {
    console.warn(`[integration] No database available, suite skipped: ${err.message.split('\n')[0]}`);
    return null;
  }
}

const db = await pickDatabase();

// ---------- scripted AI ----------
const QUIZ_QUESTIONS = [1, 2, 3].map((n) => ({
  question: `Question number ${n}: which organelle produces ATP?`,
  options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Golgi body'],
  correctIndex: 1,
  explanation: 'Mitochondria produce ATP via oxidative phosphorylation.',
  topic: 'Cells',
  sourceNumber: 1,
}));

function scriptAi() {
  generateJson.mockReset();
  generateJson.mockImplementation(async ({ schema }) => {
    const keys = Object.keys(schema.properties);
    if (keys.includes('usedSources')) {
      return { sufficient: true, answer: 'Scripted grounded answer.', usedSources: [1] };
    }
    if (keys.includes('questions')) {
      return { title: 'Cell biology quiz', questions: [...QUIZ_QUESTIONS, { question: 'broken', options: ['a'], correctIndex: 9 }] };
    }
    if (keys.includes('tasks')) {
      return {
        title: 'Biology revision plan',
        tasks: [
          { title: 'Read the cell chapter', description: 'Take notes', dayOffset: 1 },
          { title: 'Practice quiz', description: 'Self-test', dayOffset: 30 },
        ],
      };
    }
    throw new Error('unexpected schema');
  });
}

describe.skipIf(!db)('API integration (real DB, real app, mocked AI)', () => {
  let app;
  let counter = 0;

  const BIO_PDF = () =>
    buildPdf([
      'Cell biology. The mitochondria is the powerhouse of the cell and produces ATP.',
      'Genetics. DNA is transcribed into RNA and translated into protein by ribosomes.',
    ]);

  const register = async (label) => {
    const email = `${label}${++counter}-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: `User ${label}`, email, password: 'Passw0rdOK' });
    expect(res.status).toBe(201);
    return { token: res.body.data.token, email, id: res.body.data.user.id };
  };
  const as = (user) => ({ Authorization: `Bearer ${user.token}` });

  const upload = (user, buffer, name = 'biology.pdf', type = 'application/pdf') =>
    request(app).post('/api/documents/upload').set(as(user)).attach('file', buffer, { filename: name, contentType: type });

  const waitForStatus = async (user, id, wanted = ['ready', 'failed']) => {
    for (let i = 0; i < 100; i++) {
      const res = await request(app).get(`/api/documents/${id}`).set(as(user));
      if (wanted.includes(res.body.data.document.status)) return res.body.data.document;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('document did not finish processing');
  };

  const uploadReady = async (user, buffer = BIO_PDF(), name = 'biology.pdf') => {
    const res = await upload(user, buffer, name);
    expect(res.status).toBe(202);
    const doc = await waitForStatus(user, res.body.data.document.id);
    expect(doc.status).toBe('ready');
    return doc;
  };

  beforeAll(async () => {
    await mongoose.connect(db.uri, { dbName: `rembrio_test_${Date.now()}` });
    await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch(() => {})));
    const { createApp } = await import('../src/app.js');
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    await db.server?.stop();
    fs.rmSync(env.uploadDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    scriptAi();
  });

  // ------------------------------------------------------------------ auth
  describe('authentication', () => {
    it('registers, never leaks the password hash, and rejects duplicate emails (case-insensitive)', async () => {
      const email = `Dup-${Date.now()}@Example.com`;
      const ok = await request(app).post('/api/auth/register').send({ name: 'Dup User', email, password: 'Passw0rdOK' });
      expect(ok.status).toBe(201);
      expect(ok.body.data.token).toBeTruthy();
      expect(JSON.stringify(ok.body)).not.toMatch(/passwordHash|password"/i);

      const dup = await request(app).post('/api/auth/register').send({ name: 'Other', email: email.toUpperCase(), password: 'Passw0rdOK' });
      expect(dup.status).toBe(409);
    });

    it('stores a bcrypt hash, not the plain password', async () => {
      const u = await register('hash');
      const { User } = await import('../src/models/User.js');
      const doc = await User.findById(u.id).select('+passwordHash');
      expect(doc.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(doc.passwordHash).not.toContain('Passw0rdOK');
    });

    it('logs in with correct credentials; wrong password and unknown email give the same error', async () => {
      const u = await register('login');
      const good = await request(app).post('/api/auth/login').send({ email: u.email, password: 'Passw0rdOK' });
      expect(good.status).toBe(200);
      const bad = await request(app).post('/api/auth/login').send({ email: u.email, password: 'WrongPass1' });
      const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass1' });
      expect(bad.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(bad.body.error.message).toBe(unknown.body.error.message);
    });

    it('GET /auth/me returns the current user', async () => {
      const u = await register('me');
      const res = await request(app).get('/api/auth/me').set(as(u));
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(u.email);
    });

    it('logout invalidates the existing token but a fresh login works', async () => {
      const u = await register('logout');
      expect((await request(app).post('/api/auth/logout').set(as(u))).status).toBe(200);
      expect((await request(app).get('/api/auth/me').set(as(u))).status).toBe(401);
      const again = await request(app).post('/api/auth/login').send({ email: u.email, password: 'Passw0rdOK' });
      expect(again.status).toBe(200);
      expect((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${again.body.data.token}` })).status).toBe(200);
    });
  });

  // --------------------------------------------------------------- profile
  describe('profile', () => {
    it('updates the name; password change needs the current password and rotates sessions', async () => {
      const u = await register('profile');
      const rename = await request(app).patch('/api/profile').set(as(u)).send({ name: 'New Name' });
      expect(rename.status).toBe(200);
      expect(rename.body.data.user.name).toBe('New Name');

      const noCurrent = await request(app).patch('/api/profile').set(as(u)).send({ newPassword: 'Another1Pass' });
      expect(noCurrent.status).toBe(400);
      const wrongCurrent = await request(app).patch('/api/profile').set(as(u)).send({ currentPassword: 'nope', newPassword: 'Another1Pass' });
      expect(wrongCurrent.status).toBe(401);

      const changed = await request(app).patch('/api/profile').set(as(u)).send({ currentPassword: 'Passw0rdOK', newPassword: 'Another1Pass' });
      expect(changed.status).toBe(200);
      expect((await request(app).get('/api/auth/me').set(as(u))).status).toBe(401); // old token revoked
      expect((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${changed.body.data.token}` })).status).toBe(200);
      expect((await request(app).post('/api/auth/login').send({ email: u.email, password: 'Another1Pass' })).status).toBe(200);
    });

    it('cannot take another user’s email', async () => {
      const a = await register('emaila');
      const b = await register('emailb');
      const res = await request(app).patch('/api/profile').set(as(b)).send({ email: a.email, currentPassword: 'Passw0rdOK' });
      expect(res.status).toBe(409);
    });
  });

  // ------------------------------------------------------------- documents
  describe('documents & ingestion', () => {
    it('rejects non-PDF mime types and fake PDFs (bad magic bytes)', async () => {
      const u = await register('upload');
      const txt = await upload(u, Buffer.from('hello'), 'notes.txt', 'text/plain');
      expect(txt.status).toBe(400);
      const fake = await upload(u, Buffer.from('this is plain text pretending to be a pdf'), 'fake.pdf', 'application/pdf');
      expect(fake.status).toBe(400);
      expect(fake.body.error.message).toMatch(/not a valid pdf/i);
      const none = await request(app).post('/api/documents/upload').set(as(u));
      expect(none.status).toBe(400);
      // Nothing may be left behind on disk for rejected uploads.
      const leftovers = fs.existsSync(env.uploadDir) ? fs.readdirSync(env.uploadDir) : [];
      expect(leftovers.length).toBe(0);
    });

    it('processes a PDF: reports "processing" first, becomes "ready" only after chunks are stored', async () => {
      const u = await register('ingest');
      const res = await upload(u, BIO_PDF());
      expect(res.status).toBe(202);
      expect(res.body.data.document.status).toBe('processing');
      expect(res.body.data.document.filename).toBe('biology.pdf');

      const doc = await waitForStatus(u, res.body.data.document.id);
      expect(doc.status).toBe('ready');
      expect(doc.pageCount).toBe(2);
      expect(doc.chunkCount).toBeGreaterThanOrEqual(2);

      const { DocumentChunk } = await import('../src/models/DocumentChunk.js');
      const chunks = await DocumentChunk.find({ documentId: doc.id }).select('+embedding');
      expect(chunks.length).toBe(doc.chunkCount);
      expect(chunks.every((c) => String(c.userId) === u.id && c.embedding.length === 768)).toBe(true);
      expect(new Set(chunks.map((c) => c.page))).toEqual(new Set([1, 2]));
    });

    it('rejects an exact duplicate upload by the same user (409) but allows another user to upload it', async () => {
      const a = await register('dupa');
      const b = await register('dupb');
      await uploadReady(a);
      const dup = await upload(a, BIO_PDF());
      expect(dup.status).toBe(409);
      const other = await upload(b, BIO_PDF());
      expect(other.status).toBe(202);
    });

    it('marks image-only / empty-text PDFs as failed with a clear message', async () => {
      const u = await register('scan');
      const res = await upload(u, buildPdf(['', '']), 'scanned.pdf');
      expect(res.status).toBe(202);
      const doc = await waitForStatus(u, res.body.data.document.id);
      expect(doc.status).toBe('failed');
      expect(doc.errorMessage).toMatch(/no extractable text|scanned/i);
    });

    it('lists only own documents, then deletes a document together with its chunks', async () => {
      const u = await register('list');
      const empty = await request(app).get('/api/documents').set(as(u));
      expect(empty.body.data.documents).toEqual([]);

      const doc = await uploadReady(u);
      const list = await request(app).get('/api/documents').set(as(u));
      expect(list.body.data.documents).toHaveLength(1);

      const del = await request(app).delete(`/api/documents/${doc.id}`).set(as(u));
      expect(del.status).toBe(200);
      const { DocumentChunk } = await import('../src/models/DocumentChunk.js');
      expect(await DocumentChunk.countDocuments({ documentId: doc.id })).toBe(0);
      expect((await request(app).get(`/api/documents/${doc.id}`).set(as(u))).status).toBe(404);
    });

    it('treats a malformed id as 404', async () => {
      const u = await register('badid');
      expect((await request(app).get('/api/documents/not-an-id').set(as(u))).status).toBe(404);
    });
  });

  // ------------------------------------------------------------------ chat
  describe('chat (RAG)', () => {
    it('refuses to answer when the user has no processed documents', async () => {
      const u = await register('nodocs');
      const res = await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'What is ATP?' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/upload a pdf/i);
      expect(generateJson).not.toHaveBeenCalled();
    });

    it('validates input', async () => {
      const u = await register('chatval');
      expect((await request(app).post('/api/chat/ask').set(as(u)).send({ question: '   ' })).status).toBe(400);
      expect((await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'x', documentIds: ['nope'] })).status).toBe(400);
    });

    it('answers with real citations: filename, correct page, excerpt, score', async () => {
      const u = await register('rag');
      const doc = await uploadReady(u);

      const res = await request(app)
        .post('/api/chat/ask')
        .set(as(u))
        .send({ question: 'What do the mitochondria produce in the cell?', documentIds: [doc.id] });
      expect(res.status).toBe(200);
      const msg = res.body.data.message;
      expect(msg.sufficientEvidence).toBe(true);
      expect(msg.content).toBe('Scripted grounded answer.');
      expect(msg.citations).toHaveLength(1);
      expect(msg.citations[0]).toMatchObject({ filename: 'biology.pdf', page: 1, documentId: doc.id });
      expect(msg.citations[0].excerpt.toLowerCase()).toContain('mitochondria');
      expect(msg.citations[0].score).toBeGreaterThan(0);

      // The prompt sent to Gemini contained retrieved passages only, not the whole document.
      const prompt = generateJson.mock.calls[0][0].prompt;
      expect(prompt).toContain('(biology.pdf, page 1)');

      // A genetics question retrieves page 2, proving retrieval is semantic and page-aware.
      const res2 = await request(app)
        .post('/api/chat/ask')
        .set(as(u))
        .send({ question: 'How is DNA transcribed into RNA?', documentIds: [doc.id] });
      expect(res2.body.data.message.citations[0].page).toBe(2);
    });

    it('returns the insufficient-evidence message without calling Gemini when nothing relevant exists', async () => {
      const u = await register('insuff');
      const doc = await uploadReady(u);
      const res = await request(app)
        .post('/api/chat/ask')
        .set(as(u))
        .send({ question: 'Explain quantum chromodynamics gluon confinement', documentIds: [doc.id] });
      expect(res.status).toBe(200);
      expect(res.body.data.message.sufficientEvidence).toBe(false);
      expect(res.body.data.message.citations).toEqual([]);
      expect(res.body.data.message.content).toMatch(/couldn't find enough information/i);
      expect(generateJson).not.toHaveBeenCalled();
    });

    it('maps AI failures to proper status codes and does not save a half conversation', async () => {
      const u = await register('aifail');
      const doc = await uploadReady(u);
      generateJson.mockRejectedValueOnce(new ApiError(429, 'The AI service is rate-limited right now. Please try again in a moment.'));
      const limited = await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [doc.id] });
      expect(limited.status).toBe(429);
      generateJson.mockRejectedValueOnce(ApiError.unavailable('The AI service is not configured.'));
      const off = await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [doc.id] });
      expect(off.status).toBe(503);
      const hist = await request(app).get('/api/chat/history').set(as(u));
      expect(hist.body.data.conversations).toEqual([]);
    });

    it('persists conversation history and appends follow-ups to the same conversation', async () => {
      const u = await register('hist');
      const doc = await uploadReady(u);
      const first = await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [doc.id] });
      const conversationId = first.body.data.conversationId;
      await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'And what does DNA become?', documentIds: [doc.id], conversationId });

      const list = await request(app).get('/api/chat/history').set(as(u));
      expect(list.body.data.conversations).toHaveLength(1);
      const thread = await request(app).get('/api/chat/history').query({ conversationId }).set(as(u));
      expect(thread.body.data.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
      expect(thread.body.data.messages[1].citations[0].filename).toBe('biology.pdf');
    });
  });

  // ------------------------------------------------------------------ quiz
  describe('quizzes', () => {
    it('generates a validated quiz without leaking answers, grades submissions and saves attempts', async () => {
      const u = await register('quiz');
      const doc = await uploadReady(u);
      const gen = await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: [doc.id], numQuestions: 3 });
      expect(gen.status).toBe(201);
      const quiz = gen.body.data.quiz;
      expect(quiz.questions).toHaveLength(3); // the malformed 4th AI question was dropped
      expect(JSON.stringify(quiz)).not.toMatch(/correctIndex|explanation/);

      // Find the correct option for each question from the stored (server-side) quiz.
      const { Quiz } = await import('../src/models/Quiz.js');
      const stored = await Quiz.findById(quiz.id);
      const correct = stored.questions.map((q) => ({ questionId: String(q._id), selectedIndex: q.correctIndex }));

      const perfect = await request(app).post('/api/quizzes/submit').set(as(u)).send({ quizId: quiz.id, answers: correct });
      expect(perfect.status).toBe(200);
      expect(perfect.body.data).toMatchObject({ score: 3, total: 3, percentage: 100 });
      expect(perfect.body.data.results[0].explanation).toBeTruthy();
      expect(perfect.body.data.results[0].source).toMatchObject({ filename: 'biology.pdf' });

      // One wrong, one unanswered.
      const wrongIdx = (correct[0].selectedIndex + 1) % 4;
      const partial = await request(app)
        .post('/api/quizzes/submit')
        .set(as(u))
        .send({ quizId: quiz.id, answers: [{ ...correct[0], selectedIndex: wrongIdx }, correct[1], { questionId: correct[2].questionId, selectedIndex: null }] });
      expect(partial.body.data).toMatchObject({ score: 1, total: 3, percentage: 33 });

      const { QuizAttempt } = await import('../src/models/QuizAttempt.js');
      expect(await QuizAttempt.countDocuments({ userId: u.id })).toBe(2);
    });

    it('validates generate/submit input', async () => {
      const u = await register('quizval');
      expect((await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: [] })).status).toBe(400);
      expect((await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: ['507f1f77bcf86cd799439011'], numQuestions: 99 })).status).toBe(400);
      expect((await request(app).post('/api/quizzes/submit').set(as(u)).send({ quizId: '507f1f77bcf86cd799439011', answers: [{ questionId: '507f1f77bcf86cd799439011', selectedIndex: 7 }] })).status).toBe(400);
      expect((await request(app).post('/api/quizzes/submit').set(as(u)).send({ quizId: '507f1f77bcf86cd799439011', answers: [] })).status).toBe(404);
    });

    it('returns 503 with a clear message when the AI service is unavailable', async () => {
      const u = await register('quizoff');
      const doc = await uploadReady(u);
      generateJson.mockRejectedValueOnce(ApiError.unavailable('The AI service is not configured. Set GEMINI_API_KEY on the server to enable this feature.'));
      const res = await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: [doc.id] });
      expect(res.status).toBe(503);
      expect(res.body.error.message).toMatch(/not configured/i);
    });

    it('refuses to build a quiz from content the user does not have on a topic (no evidence)', async () => {
      const u = await register('quiztopic');
      const doc = await uploadReady(u);
      const res = await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: [doc.id], topic: 'quantum chromodynamics gluon' });
      expect(res.status).toBe(400);
      expect(generateJson).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------- progress
  describe('progress', () => {
    it('is empty (no fabricated data) for a brand-new user', async () => {
      const u = await register('newprog');
      const res = await request(app).get('/api/progress').set(as(u));
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.summary).toMatchObject({ documents: 0, questionsAsked: 0, quizzesTaken: 0, averageScore: null, bestScore: null, tasksTotal: 0 });
      expect(d.scoreHistory).toEqual([]);
      expect(d.weakTopics).toEqual([]);
      expect(d.activity).toHaveLength(30);
      expect(d.activity.every((a) => a.quizzes === 0 && a.questions === 0)).toBe(true);
    });

    it('reflects real activity, and flags a weak topic only once there is enough evidence', async () => {
      const u = await register('realprog');
      const doc = await uploadReady(u);
      await request(app).post('/api/chat/ask').set(as(u)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [doc.id] });

      const gen = await request(app).post('/api/quizzes/generate').set(as(u)).send({ documentIds: [doc.id], numQuestions: 3 });
      const quiz = gen.body.data.quiz;
      const { Quiz } = await import('../src/models/Quiz.js');
      const stored = await Quiz.findById(quiz.id);
      const allWrong = stored.questions.map((q) => ({ questionId: String(q._id), selectedIndex: (q.correctIndex + 1) % 4 }));
      await request(app).post('/api/quizzes/submit').set(as(u)).send({ quizId: quiz.id, answers: allWrong });

      const res = await request(app).get('/api/progress').set(as(u));
      const d = res.body.data;
      expect(d.summary).toMatchObject({ documents: 1, readyDocuments: 1, questionsAsked: 1, quizzesTaken: 1, averageScore: 0, bestScore: 0 });
      expect(d.scoreHistory).toHaveLength(1);
      expect(d.recentAttempts[0]).toMatchObject({ score: 0, total: 3, percentage: 0 });
      expect(d.weakTopics).toEqual([{ topic: 'Cells', answered: 3, correct: 0, accuracy: 0 }]);
      const today = d.activity.at(-1);
      expect(today).toMatchObject({ quizzes: 1, questions: 1 });
    });
  });

  // ----------------------------------------------------------- study plans
  describe('study plans', () => {
    it('creates a manual plan, toggles tasks and tracks progress', async () => {
      const u = await register('plan');
      const created = await request(app)
        .post('/api/study-plans')
        .set(as(u))
        .send({ title: 'Exam prep', goal: 'Pass biology', tasks: [{ title: 'Read chapter 1' }, { title: 'Do past paper' }] });
      expect(created.status).toBe(201);
      const plan = created.body.data.plan;
      expect(plan.generatedByAi).toBe(false);
      expect(plan.progress).toEqual({ total: 2, completed: 0, percentage: 0 });

      const done = await request(app).patch(`/api/study-plans/${plan.id}`).set(as(u)).send({ taskUpdates: [{ id: plan.tasks[0].id, completed: true }] });
      expect(done.status).toBe(200);
      expect(done.body.data.plan.progress).toEqual({ total: 2, completed: 1, percentage: 50 });
      expect(done.body.data.plan.tasks[0].completedAt).toBeTruthy();

      const undo = await request(app).patch(`/api/study-plans/${plan.id}`).set(as(u)).send({ taskUpdates: [{ id: plan.tasks[0].id, completed: false }], title: 'Renamed' });
      expect(undo.body.data.plan.progress.completed).toBe(0);
      expect(undo.body.data.plan.title).toBe('Renamed');

      const unknownTask = await request(app).patch(`/api/study-plans/${plan.id}`).set(as(u)).send({ taskUpdates: [{ id: '507f1f77bcf86cd799439011', completed: true }] });
      expect(unknownTask.status).toBe(404);

      const list = await request(app).get('/api/study-plans').set(as(u));
      expect(list.body.data.plans).toHaveLength(1);
      expect((await request(app).delete(`/api/study-plans/${plan.id}`).set(as(u))).status).toBe(200);
    });

    it('generates a plan with AI from a goal and the user’s documents, capped at the deadline', async () => {
      const u = await register('aiplan');
      const doc = await uploadReady(u);
      const deadline = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
      const res = await request(app)
        .post('/api/study-plans')
        .set(as(u))
        .send({ generate: true, goal: 'Master cell biology before the exam', deadline, documentIds: [doc.id] });
      expect(res.status).toBe(201);
      const plan = res.body.data.plan;
      expect(plan.generatedByAi).toBe(true);
      expect(plan.title).toBe('Biology revision plan');
      expect(plan.tasks).toHaveLength(2);
      for (const t of plan.tasks) expect(new Date(t.dueDate).getTime()).toBeLessThanOrEqual(new Date(deadline).getTime());
    });

    it('validates input and surfaces AI-unavailable as 503', async () => {
      const u = await register('planval');
      expect((await request(app).post('/api/study-plans').set(as(u)).send({})).status).toBe(400);
      expect((await request(app).post('/api/study-plans').set(as(u)).send({ generate: true, goal: 'x' })).status).toBe(400);
      generateJson.mockRejectedValueOnce(ApiError.unavailable('The AI service is not configured.'));
      const res = await request(app).post('/api/study-plans').set(as(u)).send({ generate: true, goal: 'Learn organic chemistry basics' });
      expect(res.status).toBe(503);
    });
  });

  // ------------------------------------------------- cross-user isolation
  describe('cross-user isolation', () => {
    it('user B cannot read, delete, query, quiz or plan against user A’s resources', async () => {
      const a = await register('ownerA');
      const b = await register('intruderB');
      const docA = await uploadReady(a);

      // A creates a conversation, quiz and plan.
      const chatA = await request(app).post('/api/chat/ask').set(as(a)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [docA.id] });
      const conversationId = chatA.body.data.conversationId;
      const genA = await request(app).post('/api/quizzes/generate').set(as(a)).send({ documentIds: [docA.id], numQuestions: 3 });
      const planA = await request(app).post('/api/study-plans').set(as(a)).send({ title: 'A plan', tasks: [{ title: 'secret task' }] });

      // Documents
      expect((await request(app).get(`/api/documents/${docA.id}`).set(as(b))).status).toBe(404);
      expect((await request(app).delete(`/api/documents/${docA.id}`).set(as(b))).status).toBe(404);
      expect((await request(app).get('/api/documents').set(as(b))).body.data.documents).toEqual([]);
      expect((await request(app).get(`/api/documents/${docA.id}`).set(as(a))).status).toBe(200); // still intact

      // RAG: B cannot retrieve A's chunks, even by naming A's document id.
      generateJson.mockClear();
      const ask = await request(app).post('/api/chat/ask').set(as(b)).send({ question: 'What does the mitochondria produce in the cell?', documentIds: [docA.id] });
      expect(ask.status).toBe(400);
      expect(generateJson).not.toHaveBeenCalled();

      // Conversations
      expect((await request(app).get('/api/chat/history').query({ conversationId }).set(as(b))).status).toBe(404);
      expect((await request(app).get('/api/chat/history').set(as(b))).body.data.conversations).toEqual([]);
      const follow = await request(app).post('/api/chat/ask').set(as(b)).send({ question: 'hi', conversationId });
      expect(follow.status).toBe(404);

      // Quizzes
      const quizA = genA.body.data.quiz;
      const gen = await request(app).post('/api/quizzes/generate').set(as(b)).send({ documentIds: [docA.id] });
      expect(gen.status).toBe(400);
      const submit = await request(app).post('/api/quizzes/submit').set(as(b)).send({ quizId: quizA.id, answers: [] });
      expect(submit.status).toBe(404);

      // Study plans
      const planId = planA.body.data.plan.id;
      expect((await request(app).get('/api/study-plans').set(as(b))).body.data.plans).toEqual([]);
      expect((await request(app).patch(`/api/study-plans/${planId}`).set(as(b)).send({ title: 'hijacked' })).status).toBe(404);
      expect((await request(app).delete(`/api/study-plans/${planId}`).set(as(b))).status).toBe(404);
      const planWithForeignDoc = await request(app).post('/api/study-plans').set(as(b)).send({ title: 'x', documentIds: [docA.id] });
      expect(planWithForeignDoc.status).toBe(400);

      // Progress only counts B's own (empty) activity.
      const prog = await request(app).get('/api/progress').set(as(b));
      expect(prog.body.data.summary).toMatchObject({ documents: 0, questionsAsked: 0, quizzesTaken: 0 });

      // A's data is untouched.
      const planAfter = await request(app).get('/api/study-plans').set(as(a));
      expect(planAfter.body.data.plans[0].title).toBe('A plan');
    });
  });
});
