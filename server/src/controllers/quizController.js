import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveAuthorizedDocuments } from '../services/rag/retriever.js';
import { generateQuizQuestions } from '../services/ai/quizService.js';

/** The client never receives correct answers or explanations until it submits. */
const publicQuiz = (quiz) => ({
  id: String(quiz._id),
  title: quiz.title,
  topic: quiz.topic,
  createdAt: quiz.createdAt,
  questions: quiz.questions.map((q) => ({
    id: String(q._id),
    question: q.question,
    options: q.options,
    topic: q.topic,
  })),
});

export async function generateQuiz(req, res) {
  const { documentIds, topic, numQuestions } = req.valid.body;
  const docs = await resolveAuthorizedDocuments(req.user._id, documentIds);

  const generated = await generateQuizQuestions({
    userId: req.user._id,
    documentIds: docs.map((d) => d._id),
    topic: topic || '',
    numQuestions,
  });

  const quiz = await Quiz.create({
    userId: req.user._id,
    title: generated.title,
    documentIds: docs.map((d) => d._id),
    topic: topic || '',
    questions: generated.questions,
  });
  res.status(201).json({ success: true, data: { quiz: publicQuiz(quiz) } });
}

export async function submitQuiz(req, res) {
  const { quizId, answers } = req.valid.body;
  const quiz = await Quiz.findOne({ _id: quizId, userId: req.user._id });
  if (!quiz) throw ApiError.notFound('Quiz not found.');

  const byQuestion = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
  const results = quiz.questions.map((q) => {
    const selectedIndex = byQuestion.get(String(q._id)) ?? null;
    return {
      questionId: String(q._id),
      question: q.question,
      options: q.options,
      selectedIndex,
      correctIndex: q.correctIndex,
      correct: selectedIndex === q.correctIndex,
      explanation: q.explanation,
      topic: q.topic,
      source: q.source ? { filename: q.source.filename, page: q.source.page } : undefined,
    };
  });

  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  const percentage = Math.round((score / total) * 100);

  const attempt = await QuizAttempt.create({
    userId: req.user._id,
    quizId: quiz._id,
    quizTitle: quiz.title,
    score,
    total,
    percentage,
    answers: results.map((r) => ({
      questionId: r.questionId,
      selectedIndex: r.selectedIndex,
      correct: r.correct,
      topic: r.topic,
    })),
  });

  res.json({
    success: true,
    data: { attemptId: String(attempt._id), score, total, percentage, results },
  });
}
