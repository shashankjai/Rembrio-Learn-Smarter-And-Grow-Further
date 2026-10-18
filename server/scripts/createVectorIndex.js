// Creates the Atlas Vector Search index used by VECTOR_BACKEND=atlas.
// Usage:  npm run create-vector-index      (requires an Atlas cluster; not supported on local mongod)
import mongoose from 'mongoose';
import { env, assertRequiredEnv } from '../src/config/env.js';
import { DocumentChunk } from '../src/models/DocumentChunk.js';

assertRequiredEnv();
await mongoose.connect(env.mongoUri);
await DocumentChunk.createCollection().catch(() => {});

const definition = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: env.embeddingDimensions, similarity: 'cosine' },
    // Pre-filter fields: ownership is enforced inside the vector query.
    { type: 'filter', path: 'userId' },
    { type: 'filter', path: 'documentId' },
  ],
};

try {
  await DocumentChunk.collection.createSearchIndex({
    name: env.vectorIndexName,
    type: 'vectorSearch',
    definition,
  });
  console.log(
    `Created vector index "${env.vectorIndexName}" (${env.embeddingDimensions} dims, cosine). ` +
      'It can take a minute to become queryable; check Atlas > Search Indexes.'
  );
} catch (err) {
  console.error('Could not create the index:', err.message);
  console.error('Create it manually in the Atlas UI with this JSON definition:\n', JSON.stringify(definition, null, 2));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
