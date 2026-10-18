import { describe, it, expect } from 'vitest';
import { validateQuizOutput } from '../src/services/ai/quizService.js';
import { validatePlanOutput } from '../src/services/ai/planService.js';
import { pickWeakTopics, buildActivitySeries } from '../src/controllers/progressController.js';

const sources = [
  { documentId: 'd1', filename: 'bio.pdf', page: 4 },
  { documentId: 'd1', filename: 'bio.pdf', page: 9 },
];

const good = {
  question: 'Which organelle produces most of the cell ATP?',
  options: ['Nucleus', 'Mitochondrion', 'Ribosome', 'Golgi body'],
  correctIndex: 1,
  explanation: 'The mitochondrion carries out oxidative phosphorylation.',
  topic: 'Cell biology',
  sourceNumber: 2,
};

describe('quiz output validation', () => {
  it('accepts a well-formed question and attaches the real source', () => {
    const [q] = validateQuizOutput({ questions: [good] }, sources, { shuffle: false });
    expect(q.correctIndex).toBe(1);
    expect(q.source).toEqual({ documentId: 'd1', filename: 'bio.pdf', page: 9 });
  });

  it('drops malformed questions instead of trusting them', () => {
    const bad = [
      { ...good, options: ['A', 'B', 'C'] }, // 3 options
      { ...good, correctIndex: 4 }, // out of range
      { ...good, correctIndex: '1' }, // wrong type
      { ...good, options: ['Same', 'same', 'C', 'D'] }, // duplicate options
      { ...good, question: 'short' }, // too short
      { ...good, explanation: '' },
      null,
      'garbage',
    ];
    expect(validateQuizOutput({ questions: [...bad, good] }, sources, { shuffle: false })).toHaveLength(1);
  });

  it('handles missing / non-array questions', () => {
    expect(validateQuizOutput(null, sources)).toEqual([]);
    expect(validateQuizOutput({ questions: 'nope' }, sources)).toEqual([]);
  });

  it('ignores an invalid sourceNumber rather than inventing a citation', () => {
    const [q] = validateQuizOutput({ questions: [{ ...good, sourceNumber: 99 }] }, sources, { shuffle: false });
    expect(q.source).toBeUndefined();
  });

  it('shuffling keeps the correct answer pointing at the same option text', () => {
    for (let i = 0; i < 50; i++) {
      const [q] = validateQuizOutput({ questions: [good] }, sources);
      expect(q.options[q.correctIndex]).toBe('Mitochondrion');
      expect([...q.options].sort()).toEqual([...good.options].sort());
    }
  });
});

describe('study plan output validation', () => {
  const today = new Date('2026-01-01T00:00:00Z');

  it('keeps valid tasks, drops invalid ones, and computes due dates', () => {
    const tasks = validatePlanOutput(
      { tasks: [{ title: 'Read chapter 1', description: 'Skim then read', dayOffset: 2 }, { title: '', dayOffset: 1 }, 7] },
      { today }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate.toISOString().slice(0, 10)).toBe('2026-01-03');
  });

  it('never schedules a task after the deadline', () => {
    const deadline = new Date('2026-01-05T00:00:00Z');
    const [t] = validatePlanOutput({ tasks: [{ title: 'Revise everything', description: '', dayOffset: 60 }] }, { today, deadline });
    expect(t.dueDate.getTime()).toBeLessThanOrEqual(deadline.getTime());
  });
});

describe('progress analytics', () => {
  it('flags weak topics only with enough evidence and low accuracy', () => {
    const weak = pickWeakTopics([
      { _id: 'Genetics', answered: 5, correct: 1 }, // weak, enough evidence
      { _id: 'Ecology', answered: 2, correct: 0 }, // too little evidence
      { _id: 'Cells', answered: 10, correct: 9 }, // strong
      { _id: 'Chemistry', answered: 4, correct: 2 }, // 50% -> weak
    ]);
    expect(weak.map((w) => w.topic)).toEqual(['Genetics', 'Chemistry']);
    expect(weak[0].accuracy).toBe(20);
  });

  it('returns no weak topics when there is no data', () => {
    expect(pickWeakTopics([])).toEqual([]);
  });

  it('builds a zero-filled daily activity series', () => {
    const now = new Date('2026-03-10T12:00:00Z');
    const series = buildActivitySeries([{ _id: '2026-03-10', count: 2 }], [{ _id: '2026-03-09', count: 5 }], 3, now);
    expect(series).toEqual([
      { date: '2026-03-08', quizzes: 0, questions: 0 },
      { date: '2026-03-09', quizzes: 0, questions: 5 },
      { date: '2026-03-10', quizzes: 2, questions: 0 },
    ]);
  });
});

import { countByDay, topicStats } from '../src/controllers/progressController.js';

describe('progress helpers (database-portable aggregation)', () => {
  it('buckets timestamps into UTC days', () => {
    const rows = countByDay([new Date('2026-03-10T01:00:00Z'), new Date('2026-03-10T23:59:00Z'), new Date('2026-03-11T00:01:00Z')]);
    expect(Object.fromEntries(rows.map((r) => [r._id, r.count]))).toEqual({ '2026-03-10': 2, '2026-03-11': 1 });
  });

  it('computes per-topic accuracy across attempts', () => {
    const stats = topicStats([
      { answers: [{ topic: 'Cells', correct: true }, { topic: 'Cells', correct: false }, { topic: 'DNA', correct: false }] },
      { answers: [{ topic: 'Cells', correct: false }, {}] },
    ]);
    const by = Object.fromEntries(stats.map((s) => [s._id, s]));
    expect(by.Cells).toMatchObject({ answered: 3, correct: 1 });
    expect(by.DNA).toMatchObject({ answered: 1, correct: 0 });
    expect(by.General).toMatchObject({ answered: 1, correct: 0 });
  });
});
