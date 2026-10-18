import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, MessageSquare, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Alert, ConfirmDialog, FullPageSpinner, StatusBadge } from '../components/ui/index.jsx';
import { formatBytes, formatDate } from '../utils/format.js';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer;
    const load = async () => {
      try {
        const data = await api.documents.get(id, ctrl.signal);
        setDoc(data.document);
        if (data.document.status === 'processing') timer = setTimeout(load, 2500);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.status === 404 ? 'This document does not exist or was deleted.' : err.message);
      }
    };
    load();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [id]);

  async function remove() {
    setBusy(true);
    try {
      await api.documents.remove(id);
      navigate('/documents', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirm(false);
    }
  }

  const Back = (
    <Link to="/documents" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
      <ArrowLeft className="size-4" aria-hidden="true" /> All documents
    </Link>
  );

  if (error && !doc) {
    return (
      <>
        {Back}
        <Alert>{error}</Alert>
      </>
    );
  }
  if (!doc) return <FullPageSpinner label="Loading document…" />;

  const rows = [
    ['Status', <StatusBadge key="s" status={doc.status} />],
    ['Pages', doc.status === 'ready' ? doc.pageCount : '—'],
    ['Searchable passages', doc.status === 'ready' ? doc.chunkCount : '—'],
    ['File size', formatBytes(doc.sizeBytes)],
    ['Uploaded', formatDate(doc.createdAt)],
    ['Processed', doc.processedAt ? formatDate(doc.processedAt) : '—'],
  ];

  return (
    <>
      {Back}
      <h1 className="break-words text-2xl font-semibold">{doc.filename}</h1>

      {doc.status === 'processing' ? (
        <Alert variant="info" className="mt-4">Rembrio is extracting and indexing this document. This page updates automatically when it is ready.</Alert>
      ) : null}
      {doc.status === 'failed' ? (
        <Alert className="mt-4" title="Processing failed">
          {doc.errorMessage || 'Something went wrong while processing this file.'} Delete it and upload a corrected file to try again.
        </Alert>
      ) : null}
      {error ? <Alert className="mt-4">{error}</Alert> : null}

      <dl className="card mt-6 divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {doc.status === 'ready' ? (
          <>
            <Link to="/assistant" state={{ documentId: doc.id }} className="btn btn-primary">
              <MessageSquare className="size-4" aria-hidden="true" /> Ask about this document
            </Link>
            <Link to="/quizzes" state={{ documentId: doc.id }} className="btn btn-secondary">
              <ClipboardCheck className="size-4" aria-hidden="true" /> Generate a quiz
            </Link>
          </>
        ) : null}
        <button type="button" className="btn btn-secondary text-danger-ink" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" aria-hidden="true" /> Delete
        </button>
      </div>

      <ConfirmDialog open={confirm} title="Delete this document?" confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => setConfirm(false)}>
        <strong className="text-ink">{doc.filename}</strong> and its processed text will be permanently removed.
      </ConfirmDialog>
    </>
  );
}
