import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, FileText, FileUp, MessageSquare } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, EmptyState, FullPageSpinner, PageHeader, StatTile, StatusBadge } from '../components/ui/index.jsx';
import { firstName, formatDate } from '../utils/format.js';

const ACTIONS = [
  { to: '/documents', icon: FileUp, title: 'Upload material', text: 'Add a PDF to study from' },
  { to: '/assistant', icon: MessageSquare, title: 'Ask a question', text: 'Get a cited answer' },
  { to: '/quizzes', icon: ClipboardCheck, title: 'Start a quiz', text: 'Test what you know' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', docs: [], progress: null });

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([api.documents.list(ctrl.signal), api.progress.get(ctrl.signal)])
      .then(([d, p]) => setState({ loading: false, error: '', docs: d.documents, progress: p }))
      .catch((err) => err.name !== 'AbortError' && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => ctrl.abort();
  }, []);

  if (state.loading) return <FullPageSpinner label="Loading your dashboard…" />;
  const { docs, progress } = state;
  const s = progress?.summary;

  return (
    <>
      <PageHeader title={`Welcome back, ${firstName(user.name)}`} description="Here is where your studying stands." />
      {state.error ? <Alert className="mb-6">{state.error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {ACTIONS.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="card card-hover group flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-tint text-secondary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-primary">{title}</span>
              <span className="block text-[13px] text-muted">{text}</span>
            </span>
            <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </div>

      {s ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Documents" value={s.documents} hint={`${s.readyDocuments} ready`} />
          <StatTile label="Questions asked" value={s.questionsAsked} />
          <StatTile label="Quizzes taken" value={s.quizzesTaken} />
          <StatTile label="Average quiz score" value={s.averageScore === null ? '—' : `${s.averageScore}%`} hint={s.averageScore === null ? 'No quizzes yet' : undefined} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-docs">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-docs" className="text-lg font-semibold">Recent documents</h2>
            <Link to="/documents" className="link text-sm">View all</Link>
          </div>
          {docs.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" action={<Link to="/documents" className="btn btn-primary btn-sm">Upload a PDF</Link>}>
              Upload a PDF to start studying.
            </EmptyState>
          ) : (
            <ul className="card divide-y divide-line">
              {docs.slice(0, 4).map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <Link to={`/documents/${d.id}`} className="block truncate text-sm font-medium text-secondary underline-offset-4 hover:underline">{d.filename}</Link>
                    <p className="text-xs text-muted">{formatDate(d.createdAt)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-quizzes">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-quizzes" className="text-lg font-semibold">Recent quizzes</h2>
            <Link to="/progress" className="link text-sm">Full progress</Link>
          </div>
          {!progress || progress.recentAttempts.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No quiz attempts yet" action={<Link to="/quizzes" className="btn btn-primary btn-sm">Take a quiz</Link>}>
              Your scores will appear here once you complete a quiz.
            </EmptyState>
          ) : (
            <ul className="card divide-y divide-line">
              {progress.recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.quizTitle}</p>
                    <p className="text-xs text-muted">{formatDate(a.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-primary">{a.score}/{a.total}</span>
                  <span className="w-10 text-right text-sm tabular-nums text-muted">{a.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
