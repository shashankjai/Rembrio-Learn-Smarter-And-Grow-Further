import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ClipboardCheck, RotateCcw, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { Alert, DocumentPicker, EmptyState, FullPageSpinner, PageHeader, Spinner, TextField } from '../components/ui/index.jsx';

const LETTERS = ['A', 'B', 'C', 'D'];

function Setup({ ready, onGenerated }) {
  const location = useLocation();
  const [selected, setSelected] = useState(location.state?.documentId ? [location.state.documentId] : []);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate(e) {
    e.preventDefault();
    if (!selected.length) return setError('Select at least one document.');
    setError('');
    setBusy(true);
    try {
      const data = await api.quizzes.generate({ documentIds: selected, numQuestions: Number(count), ...(topic.trim() ? { topic: topic.trim() } : {}) });
      onGenerated(data.quiz);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={generate} className="card space-y-5 p-5 sm:p-6">
      {error ? <Alert>{error}</Alert> : null}
      <DocumentPicker documents={ready} selected={selected} onChange={setSelected} legend="Generate a quiz from" />
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <TextField label="Topic (optional)" value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. cellular respiration" hint="Leave empty for a quiz across the whole document." />
        <div>
          <label htmlFor="count" className="label">Questions</label>
          <select id="count" className="input" value={count} onChange={(e) => setCount(e.target.value)}>
            {[3, 5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner className="size-4" label="Writing your quiz…" /> : 'Generate quiz'}
      </button>
    </form>
  );
}

function Taking({ quiz, onSubmitted, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const answered = Object.keys(answers).length;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api.quizzes.submit({
        quizId: quiz.id,
        answers: quiz.questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] ?? null })),
      });
      onSubmitted(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{quiz.title}</h2>
        <p className="text-sm text-muted">{answered} of {quiz.questions.length} answered</p>
      </div>
      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => (
          <li key={q.id}>
            <fieldset className="card p-5">
              <legend className="sr-only">Question {qi + 1}</legend>
              <p className="font-medium"><span className="mr-2 text-muted">{qi + 1}.</span>{q.question}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const checked = answers[q.id] === oi;
                  return (
                    <label key={oi} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${checked ? 'border-secondary bg-tint' : 'border-line hover:bg-alt'}`}>
                      <input type="radio" name={`q-${q.id}`} checked={checked} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className="mt-0.5 size-4 accent-secondary" />
                      <span><span className="mr-1.5 font-semibold text-primary">{LETTERS[oi]}.</span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      {error ? <Alert className="mt-4">{error}</Alert> : null}
      {answered < quiz.questions.length ? <p className="mt-4 text-sm text-muted">Unanswered questions will be marked incorrect.</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner className="size-4" label="Submitting…" /> : 'Submit answers'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Discard</button>
      </div>
    </form>
  );
}

function Results({ quiz, result, onAgain, onRetake }) {
  const good = result.percentage >= 70;
  return (
    <div>
      <div className="card p-6 text-center">
        <p className="text-sm text-muted">{quiz.title}</p>
        <p className={`mt-2 font-display text-5xl font-semibold tabular-nums ${good ? 'text-success-ink' : 'text-primary'}`}>{result.percentage}%</p>
        <p className="mt-1 text-sm text-muted">{result.score} of {result.total} correct. This attempt has been saved to your progress.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={onRetake}><RotateCcw className="size-4" aria-hidden="true" /> Retake</button>
          <button type="button" className="btn btn-secondary" onClick={onAgain}>New quiz</button>
          <Link to="/progress" className="btn btn-secondary">View progress</Link>
        </div>
      </div>

      <h3 className="mb-3 mt-8 text-lg font-semibold">Review</h3>
      <ol className="space-y-4">
        {result.results.map((r, i) => (
          <li key={r.questionId} className="card p-5">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${r.correct ? 'bg-success/10 text-success-ink' : 'bg-danger/10 text-danger-ink'}`}>
                {r.correct ? <Check className="size-4" aria-label="Correct" /> : <X className="size-4" aria-label="Incorrect" />}
              </span>
              <p className="font-medium"><span className="mr-2 text-muted">{i + 1}.</span>{r.question}</p>
            </div>
            <ul className="mt-3 space-y-1.5 pl-9">
              {r.options.map((opt, oi) => {
                const isCorrect = oi === r.correctIndex;
                const isPicked = oi === r.selectedIndex;
                return (
                  <li key={oi} className={`rounded-md border px-3 py-2 text-sm ${isCorrect ? 'border-success/40 bg-success/5' : isPicked ? 'border-danger/40 bg-danger/5' : 'border-line'}`}>
                    <span className="mr-1.5 font-semibold">{LETTERS[oi]}.</span>{opt}
                    {isCorrect ? <span className="ml-2 text-xs font-semibold text-success-ink">Correct answer</span> : null}
                    {isPicked && !isCorrect ? <span className="ml-2 text-xs font-semibold text-danger-ink">Your answer</span> : null}
                  </li>
                );
              })}
              {r.selectedIndex === null ? <li className="text-xs text-muted">Not answered</li> : null}
            </ul>
            <p className="mt-3 pl-9 text-sm text-muted"><span className="font-medium text-ink">Why: </span>{r.explanation}</p>
            {r.source ? <p className="mt-1 pl-9 text-xs text-muted">Source: {r.source.filename}, page {r.source.page}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Quizzes() {
  const { documents, loading, error } = useDocuments();
  const [phase, setPhase] = useState('setup'); // setup | taking | results
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const ready = documents.filter((d) => d.status === 'ready');

  if (loading) return <FullPageSpinner />;

  return (
    <>
      <PageHeader title="Quizzes" description="Multiple-choice questions written from your own documents, with explanations and sources." />
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {ready.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No processed documents yet" action={<Link to="/documents" className="btn btn-primary">Go to documents</Link>}>
          Upload a PDF and wait for it to finish processing to generate a quiz.
        </EmptyState>
      ) : phase === 'setup' ? (
        <Setup ready={ready} onGenerated={(q) => { setQuiz(q); setPhase('taking'); }} />
      ) : phase === 'taking' ? (
        <Taking key={quiz.id} quiz={quiz} onSubmitted={(r) => { setResult(r); setPhase('results'); window.scrollTo(0, 0); }} onCancel={() => setPhase('setup')} />
      ) : (
        <Results quiz={quiz} result={result} onAgain={() => setPhase('setup')} onRetake={() => { setPhase('taking'); window.scrollTo(0, 0); }} />
      )}
    </>
  );
}
