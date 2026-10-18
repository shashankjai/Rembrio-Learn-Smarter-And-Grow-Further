import { Document } from '../models/Document.js';
import { Message } from '../models/Message.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { StudyPlan } from '../models/StudyPlan.js';

// A topic only counts as "weak" with enough evidence behind it.
export const WEAK_TOPIC_MIN_ANSWERS = 3;
export const WEAK_TOPIC_MAX_ACCURACY = 0.6;
const ACTIVITY_DAYS = 30;
// Topic accuracy and averages are computed over the most recent attempts, so the picture reflects current performance.
const ATTEMPT_WINDOW = 200;

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Bucket timestamps into [{ _id: 'YYYY-MM-DD', count }] (UTC days). Done in JS to stay database-portable. */
export function countByDay(dates) {
  const counts = new Map();
  for (const d of dates) {
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([_id, count]) => ({ _id, count }));
}

/** Aggregate per-topic answer stats from attempts: [{ _id: topic, answered, correct }]. */
export function topicStats(attempts) {
  const stats = new Map();
  for (const attempt of attempts) {
    for (const a of attempt.answers ?? []) {
      const topic = a.topic || 'General';
      const s = stats.get(topic) ?? { _id: topic, answered: 0, correct: 0 };
      s.answered += 1;
      if (a.correct) s.correct += 1;
      stats.set(topic, s);
    }
  }
  return [...stats.values()];
}

export function buildActivitySeries(quizRows, questionRows, days = ACTIVITY_DAYS, now = new Date()) {
  const quizzes = new Map(quizRows.map((r) => [r._id, r.count]));
  const questions = new Map(questionRows.map((r) => [r._id, r.count]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    series.push({ date: key, quizzes: quizzes.get(key) ?? 0, questions: questions.get(key) ?? 0 });
  }
  return series;
}

export function pickWeakTopics(rows) {
  return rows
    .filter((r) => r.answered >= WEAK_TOPIC_MIN_ANSWERS)
    .map((r) => ({ topic: r._id, answered: r.answered, correct: r.correct, accuracy: r.correct / r.answered }))
    .filter((r) => r.accuracy < WEAK_TOPIC_MAX_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)
    .map((r) => ({ ...r, accuracy: Math.round(r.accuracy * 100) }));
}

export async function getProgress(req, res) {
  const userId = req.user._id;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (ACTIVITY_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [documents, readyDocuments, questionsAsked, attempts, plans, recentQuestions] = await Promise.all([
    Document.countDocuments({ userId }),
    Document.countDocuments({ userId, status: 'ready' }),
    Message.countDocuments({ userId, role: 'user' }),
    QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(ATTEMPT_WINDOW).lean(),
    StudyPlan.find({ userId }).select('tasks').lean(),
    Message.find({ userId, role: 'user', createdAt: { $gte: since } }).select('createdAt').lean(),
  ]);

  const recentAttemptDates = attempts.filter((a) => a.createdAt >= since).map((a) => a.createdAt);
  const percentages = attempts.map((a) => a.percentage);
  const tasks = plans.flatMap((p) => p.tasks);

  res.json({
    success: true,
    data: {
      summary: {
        documents,
        readyDocuments,
        questionsAsked,
        quizzesTaken: attempts.length,
        averageScore: percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : null,
        bestScore: percentages.length ? Math.max(...percentages) : null,
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter((t) => t.completed).length,
      },
      scoreHistory: attempts
        .slice(0, 30)
        .reverse()
        .map((a) => ({ date: a.createdAt, percentage: a.percentage, quizTitle: a.quizTitle })),
      activity: buildActivitySeries(countByDay(recentAttemptDates), countByDay(recentQuestions.map((m) => m.createdAt))),
      weakTopics: pickWeakTopics(topicStats(attempts)),
      recentAttempts: attempts.slice(0, 5).map((a) => ({
        id: String(a._id),
        quizTitle: a.quizTitle,
        score: a.score,
        total: a.total,
        percentage: a.percentage,
        createdAt: a.createdAt,
      })),
    },
  });
}
