import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartColumn } from 'lucide-react';
import { api } from '../services/api.js';
import { ActivityChart, LineChart } from '../components/charts.jsx';
import { Alert, EmptyState, FullPageSpinner, PageHeader, StatTile } from '../components/ui/index.jsx';

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    api.progress.get(ctrl.signal).then(setData).catch((err) => err.name !== 'AbortError' && setError(err.message));
    return () => ctrl.abort();
  }, []);

  if (error) return (<><PageHeader title="Progress" /><Alert>{error}</Alert></>);
  if (!data) return <FullPageSpinner label="Loading progress…" />;

  const { summary: s, scoreHistory, activity, weakTopics } = data;
  const hasActivity = activity.some((d) => d.quizzes || d.questions);
  const nothing = s.quizzesTaken === 0 && s.questionsAsked === 0;

  return (
    <>
      <PageHeader title="Progress" description="Everything here is calculated from what you have actually done in Rembrio." />

      {nothing ? (
        <EmptyState icon={ChartColumn} title="No activity yet" action={<Link to="/quizzes" className="btn btn-primary">Take a quiz</Link>}>
          Ask the assistant a question or complete a quiz and your progress will show up here.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Quizzes taken" value={s.quizzesTaken} />
            <StatTile label="Average score" value={s.averageScore === null ? '—' : `${s.averageScore}%`} />
            <StatTile label="Best score" value={s.bestScore === null ? '—' : `${s.bestScore}%`} />
            <StatTile label="Plan tasks done" value={s.tasksTotal ? `${s.tasksCompleted}/${s.tasksTotal}` : '—'} hint={s.tasksTotal ? undefined : 'No study plan yet'} />
          </div>

          <section className="card mt-6 p-5" aria-labelledby="scores-h">
            <h2 id="scores-h" className="text-lg font-semibold">Quiz scores over time</h2>
            {scoreHistory.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Complete a quiz to start your score history.</p>
            ) : (
              <div className="mt-3">
                <LineChart data={scoreHistory.map((a) => ({ value: a.percentage, label: a.date, title: a.quizTitle }))} />
                {scoreHistory.length === 1 ? <p className="mt-2 text-xs text-muted">One attempt so far. A trend appears after your second quiz.</p> : null}
              </div>
            )}
          </section>

          <section className="card mt-6 p-5" aria-labelledby="activity-h">
            <h2 id="activity-h" className="text-lg font-semibold">Activity, last 30 days</h2>
            {hasActivity ? <div className="mt-3"><ActivityChart data={activity} /></div> : <p className="mt-2 text-sm text-muted">No questions or quizzes in the last 30 days.</p>}
          </section>

          <section className="card mt-6 p-5" aria-labelledby="weak-h">
            <h2 id="weak-h" className="text-lg font-semibold">Topics to revisit</h2>
            {weakTopics.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {s.quizzesTaken === 0
                  ? 'Take a few quizzes to find topics that need more work.'
                  : 'No weak topics identified. A topic is flagged only after at least 3 answered questions with under 60% accuracy.'}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {weakTopics.map((t) => (
                  <li key={t.topic} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="font-medium">{t.topic}</span>
                    <span className="text-muted">{t.correct} of {t.answered} correct <span className="ml-2 font-semibold tabular-nums text-warning-ink">{t.accuracy}%</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
