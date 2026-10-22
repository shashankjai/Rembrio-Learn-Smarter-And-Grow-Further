import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  CircleAlert,
} from 'lucide-react';

export function Spinner({ className = 'size-5', label }) {
  return (
    <span className="inline-flex items-center gap-2" role={label ? 'status' : undefined}>
      <LoaderCircle className={`kv-spin ${className}`} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-[60vh] place-items-center text-muted">
      <Spinner className="size-6" label={label} />
    </div>
  );
}

const ALERT_STYLES = {
  error: { box: 'border-danger/30 bg-danger/5 text-danger-ink', Icon: CircleAlert },
  success: { box: 'border-success/30 bg-success/5 text-success-ink', Icon: CheckCircle2 },
  warning: { box: 'border-warning/30 bg-warning/5 text-warning-ink', Icon: AlertTriangle },
  info: { box: 'border-secondary/25 bg-tint text-secondary', Icon: Info },
};

export function Alert({ variant = 'error', title, children, className = '', action }) {
  const { box, Icon } = ALERT_STYLES[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border px-3.5 py-3 text-sm ${box} ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      {Icon ? (
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-tint text-secondary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {children ? <p className="mt-1 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const STATUS = {
  ready: { label: 'Ready', cls: 'bg-success/10 text-success-ink' },
  processing: { label: 'Processing', cls: 'bg-tint text-secondary' },
  failed: { label: 'Failed', cls: 'bg-danger/10 text-danger-ink' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.processing;
  return (
    <span className={`badge ${s.cls}`}>
      {status === 'processing' ? <LoaderCircle className="kv-spin size-3" aria-hidden="true" /> : null}
      {s.label}
    </span>
  );
}

export function ProgressBar({ value, label, tone = 'secondary' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const color = tone === 'success' ? 'bg-success' : 'bg-secondary';
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function TextField({ label, error, hint, className = '', inputClassName = '', as: Tag = 'input', ...props }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <Tag id={id} className={`input ${inputClassName}`} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props} />
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({ label, error, hint, className = '', ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input pr-11"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted hover:text-primary"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Accessible modal built on the native <dialog> (focus trap + Esc handled by the browser). */
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', busy = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-primary/35"
      aria-labelledby="confirm-title"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function StatTile({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Checkbox list used to pick which documents a feature should use. */
export function DocumentPicker({ documents, selected, onChange, legend = 'Documents' }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="max-h-48 divide-y divide-line overflow-auto rounded-md border border-line bg-surface">
        {documents.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-canvas">
            <input
              type="checkbox"
              checked={selected.includes(d.id)}
              onChange={() => toggle(d.id)}
              className="size-4 rounded border-line accent-secondary"
            />
            <span className="min-w-0 flex-1 truncate">{d.filename}</span>
            <span className="shrink-0 text-xs text-muted">{d.pageCount} pp.</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
