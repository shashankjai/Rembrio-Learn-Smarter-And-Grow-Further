import { env, assertRequiredEnv, aiConfigured } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { Document } from './models/Document.js';

/** Background processing does not survive a restart, so unfinished documents are marked failed. */
async function recoverInterruptedDocuments() {
  const res = await Document.updateMany(
    { status: 'processing' },
    {
      status: 'failed',
      errorMessage: 'Processing was interrupted by a server restart. Delete this document and upload it again.',
    }
  );
  if (res.modifiedCount) console.warn(`[startup] Marked ${res.modifiedCount} interrupted document(s) as failed.`);
}

async function main() {
  assertRequiredEnv();
  await connectDb();
  await recoverInterruptedDocuments();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Rembrio API listening on http://localhost:${env.port}`);
    console.log(`  vector backend: ${env.vectorBackend} | AI configured: ${aiConfigured()}`);
    if (!aiConfigured()) {
      console.warn('  GEMINI_API_KEY is not set: PDFs will fail to process, and chat, quizzes and AI plans will return 503.');
    }
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
