import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

// These run without a database: they cover routing, auth gates and request validation,
// all of which are decided before any DB access.
const app = createApp();

describe('public API behaviour (no database needed)', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  const protectedRoutes = [
    ['get', '/api/auth/me'],
    ['post', '/api/auth/logout'],
    ['get', '/api/profile'],
    ['patch', '/api/profile'],
    ['get', '/api/documents'],
    ['post', '/api/documents/upload'],
    ['get', '/api/documents/507f1f77bcf86cd799439011'],
    ['delete', '/api/documents/507f1f77bcf86cd799439011'],
    ['post', '/api/chat/ask'],
    ['get', '/api/chat/history'],
    ['post', '/api/quizzes/generate'],
    ['post', '/api/quizzes/submit'],
    ['get', '/api/progress'],
    ['get', '/api/study-plans'],
    ['post', '/api/study-plans'],
    ['patch', '/api/study-plans/507f1f77bcf86cd799439011'],
    ['delete', '/api/study-plans/507f1f77bcf86cd799439011'],
  ];

  it.each(protectedRoutes)('%s %s requires authentication', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a malformed bearer token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011', tv: 0 }, 'some-other-secret-value');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  describe('input validation', () => {
    it('register: weak password / bad email / short name', async () => {
      const cases = [
        { name: 'Ada Lovelace', email: 'ada@example.com', password: 'short1' },
        { name: 'Ada Lovelace', email: 'ada@example.com', password: 'onlyletters' },
        { name: 'Ada Lovelace', email: 'not-an-email', password: 'GoodPass123' },
        { name: 'A', email: 'ada@example.com', password: 'GoodPass123' },
        {},
      ];
      for (const body of cases) {
        const res = await request(app).post('/api/auth/register').send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.message).toBeTruthy();
      }
    });

    it('login: missing fields', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co' });
      expect(res.status).toBe(400);
    });

    it('malformed JSON body returns 400, not 500', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": ');
      expect(res.status).toBe(400);
    });
  });
});
