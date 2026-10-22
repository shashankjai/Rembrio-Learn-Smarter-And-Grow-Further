import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { Alert, ConfirmDialog, DocumentPicker, EmptyState, FullPageSpinner, PageHeader, ProgressBar, Spinner, TextField } from '../components/ui/index.jsx';
import { dateInputToIso, formatDate, isOverdue, todayInputValue } from '../utils/format.js';

function CreatePlan({ ready, onCreated, onCancel }) {
  const [mode, setMode] = useState('ai'); // ai | manual
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selected, setSelected] = useState([]);
  const [tasksText, setTasksText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const ai = mode === 'ai';
    if (ai && goal.trim().length < 5) return setError('Describe your goal in at least 5 characters.');
    if (!ai && !title.trim()) return setError('Give your plan a title.');
    const tasks = tasksText.split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ title: t.slice(0, 200) }));
    setBusy(true);
    try {
      const data = await api.plans.create({
        generate: ai,
        goal: goal.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(deadline ? { deadline: dateInputToIso(deadline) } : {}),
        documentIds: selected,
        ...(ai ? {} : { tasks }),
      });
      onCreated(data.plan);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mb-6 space-y-4 p-5 sm:p-6">
      <div role="tablist" aria-label="How to create the plan" className="inline-flex rounded-lg border border-line p-0.5">
        {[['ai', 'Generate with AI'], ['manual', 'Write my own']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={`min-h-11 rounded-md px-3 text-sm font-medium ${mode === key ? 'bg-primary text-white' : 'text-muted hover:text-secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {error ? <Alert>{error}</Alert> : null}
      <TextField label={mode === 'ai' ? 'Plan title (optional)' : 'Plan title'} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      <TextField as="textarea" rows={3} label={mode === 'ai' ? 'Your goal' : 'Goal (optional)'} value={goal} maxLength={1000} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Be ready for my genetics exam" />
      <TextField label="Deadline (optional)" type="date" min={todayInputValue()} value={deadline} onChange={(e) => setDeadline(e.target.value)} className="sm:max-w-xs" />
      {ready.length ? <DocumentPicker documents={ready} selected={selected} onChange={setSelected} legend={mode === 'ai' ? 'Base the plan on these documents (optional)' : 'Related documents (optional)'} /> : null}
      {mode === 'manual' ? <TextField as="textarea" rows={5} label="Tasks (one per line)" value={tasksText} onChange={(e) => setTasksText(e.target.value)} placeholder={'Read chapter 1\nSummarise key terms\nDo practice quiz'} /> : null}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner className="size-4" label={mode === 'ai' ? 'Generating plan…' : 'Saving…'} /> : mode === 'ai' ? <><Sparkles className="size-4" aria-hidden="true" /> Generate plan</> : 'Save plan'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

function PlanCard({ plan, onChange, onDelete }) {
  const [busyTask, setBusyTask] = useState(null);
  const [error, setError] = useState('');

  async function toggle(task) {
    setBusyTask(task.id);
    setError('');
    try {
      const data = await api.plans.update(plan.id, { taskUpdates: [{ id: task.id, completed: !task.completed }] });
      onChange(data.plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTask(null);
    }
  }

  const p = plan.progress;
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold">{plan.title}</h3>
          {plan.goal ? <p className="mt-0.5 text-sm text-muted">{plan.goal}</p> : null}
          <p className="mt-1 text-xs text-muted">
            {plan.generatedByAi ? 'AI-generated · ' : ''}
            {plan.deadline ? `Deadline ${formatDate(plan.deadline)}` : 'No deadline'}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete plan ${plan.title}`} onClick={() => onDelete(plan)}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1"><ProgressBar value={p.percentage} label={`${plan.title} progress`} tone={p.percentage === 100 ? 'success' : 'secondary'} /></div>
        <span className="text-sm tabular-nums text-muted">{p.completed}/{p.total}</span>
      </div>

      {error ? <Alert className="mt-3">{error}</Alert> : null}
      {plan.tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">This plan has no tasks.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {plan.tasks.map((t) => {
            const overdue = isOverdue(t.dueDate, t.completed);
            return (
              <li key={t.id}>
                <label className="flex cursor-pointer items-start gap-3 py-2.5">
                  <input type="checkbox" checked={t.completed} disabled={busyTask === t.id} onChange={() => toggle(t)} className="mt-1 size-4 rounded accent-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] ${t.completed ? 'text-muted line-through' : ''}`}>{t.title}</span>
                    {t.description ? <span className="block text-[13px] text-muted">{t.description}</span> : null}
                  </span>
                  {t.dueDate ? <span className={`shrink-0 text-xs ${overdue ? 'font-semibold text-danger-ink' : 'text-muted'}`}>{overdue ? 'Overdue · ' : ''}{formatDate(t.dueDate, { day: 'numeric', month: 'short' })}</span> : null}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export default function StudyPlans() {
  const { documents } = useDocuments();
  const ready = documents.filter((d) => d.status === 'ready');
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api.plans.list(ctrl.signal).then((d) => setPlans(d.plans)).catch((err) => err.name !== 'AbortError' && setError(err.message));
    return () => ctrl.abort();
  }, []);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.plans.remove(toDelete.id);
      setPlans((ps) => ps.filter((p) => p.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setError(err.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Study plans"
        description="Break a goal into tasks, optionally using your documents, and tick them off as you go."
        actions={!creating ? <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden="true" /> New plan</button> : null}
      />
      {error ? <Alert className="mb-4">{error}</Alert> : null}
      {creating ? <CreatePlan ready={ready} onCancel={() => setCreating(false)} onCreated={(p) => { setPlans((ps) => [p, ...(ps || [])]); setCreating(false); }} /> : null}

      {!plans && !error ? (
        <FullPageSpinner label="Loading plans…" />
      ) : plans?.length === 0 && !creating ? (
        <EmptyState icon={CalendarCheck} title="No study plans yet" action={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>Create your first plan</button>}>
          Describe what you are working towards and Rembrio will suggest a schedule of tasks.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {plans?.map((p) => <PlanCard key={p.id} plan={p} onChange={(np) => setPlans((ps) => ps.map((x) => (x.id === np.id ? np : x)))} onDelete={setToDelete} />)}
        </div>
      )}

      <ConfirmDialog open={Boolean(toDelete)} title="Delete this plan?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
        <strong className="text-ink">{toDelete?.title}</strong> and its tasks will be permanently removed.
      </ConfirmDialog>
    </>
  );
}
