import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FileUp, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocuments } from '../hooks/useDocuments.js';
import { Alert, ConfirmDialog, EmptyState, FullPageSpinner, PageHeader, ProgressBar, Spinner, StatusBadge } from '../components/ui/index.jsx';
import { formatBytes, formatDate } from '../utils/format.js';
import { MAX_UPLOAD_MB, validatePdfFile } from '../utils/validators.js';

export default function Documents() {
  const { documents, loading, error, reload } = useDocuments();
  const [dragging, setDragging] = useState(false);
  const [uploadPct, setUploadPct] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const inputRef = useRef(null);
  const uploading = uploadPct !== null;

  async function handleFile(file) {
    setUploadError('');
    const problem = validatePdfFile(file);
    if (problem) return setUploadError(problem);
    setUploadName(file.name);
    setUploadPct(0);
    try {
      await api.documents.upload(file, setUploadPct);
      await reload();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadPct(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.documents.remove(toDelete.id);
      setToDelete(null);
      await reload();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title="Documents" description="Upload the PDFs you want to study from. Rembrio reads them page by page so answers can cite exact pages." />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? 'border-secondary bg-secondary/5' : 'border-line bg-surface'}`}
      >
        <FileUp className="mx-auto size-8 text-secondary" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium">Drag a PDF here, or</p>
        <input ref={inputRef} id="pdf-input" type="file" accept="application/pdf,.pdf" className="sr-only" disabled={uploading} onChange={(e) => handleFile(e.target.files?.[0])} />
        <label htmlFor="pdf-input" className={`btn btn-primary mt-3 cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
          Choose PDF
        </label>
        <p className="mt-3 text-xs text-muted">PDF only, up to {MAX_UPLOAD_MB} MB. Text-based PDFs work best; scanned images are not supported.</p>

        {uploading ? (
          <div className="mx-auto mt-5 max-w-sm text-left" aria-live="polite">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span className="truncate pr-3">{uploadName}</span>
              <span>{uploadPct < 100 ? `Uploading ${uploadPct}%` : 'Upload complete'}</span>
            </div>
            <ProgressBar value={uploadPct} label="Upload progress" />
          </div>
        ) : null}
      </div>

      {uploadError ? <Alert className="mt-4">{uploadError}</Alert> : null}

      <h2 className="mb-3 mt-8 text-lg font-semibold">Your documents</h2>
      {error ? (
        <Alert action={<button className="btn btn-secondary btn-sm" onClick={reload}>Retry</button>}>{error}</Alert>
      ) : loading ? (
        <FullPageSpinner label="Loading documents…" />
      ) : documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet">Upload your first PDF above to start asking questions.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/5 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <Link to={`/documents/${d.id}`} className="block truncate font-medium text-primary hover:underline">
                  {d.filename}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {d.status === 'ready' ? `${d.pageCount} page${d.pageCount === 1 ? '' : 's'} · ` : ''}
                  {formatBytes(d.sizeBytes)} · Uploaded {formatDate(d.createdAt)}
                </p>
                {d.status === 'failed' && d.errorMessage ? <p className="mt-1 text-[13px] text-danger-ink">{d.errorMessage}</p> : null}
              </div>
              <StatusBadge status={d.status} />
              <button type="button" className="btn btn-ghost btn-sm" aria-label={`Delete ${d.filename}`} onClick={() => { setDeleteError(''); setToDelete(d); }}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={Boolean(toDelete)} title="Delete this document?" confirmLabel="Delete" busy={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)}>
        <p>
          <strong className="text-ink">{toDelete?.filename}</strong> and its processed text will be permanently removed. Past chat answers that cited it will remain, but you will not be able to open the source.
        </p>
        {deleteError ? <Alert className="mt-3">{deleteError}</Alert> : null}
        {deleting ? <p className="mt-3"><Spinner className="size-4" label="Deleting…" /></p> : null}
      </ConfirmDialog>
    </>
  );
}
