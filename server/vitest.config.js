import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 120000,
    // Run files serially: integration tests share one database.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-test-secret-test-secret',
      GEMINI_API_KEY: 'test-key-not-real',
      EMBEDDING_DIMENSIONS: '768',
      VECTOR_BACKEND: 'local',
      UPLOAD_DIR: './tests/.tmp-uploads',
      RAG_MIN_SCORE: '0.2',
    },
  },
});
