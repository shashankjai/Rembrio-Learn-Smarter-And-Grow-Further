import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, History, Plus, Quote, Send } from 'lucide-react';
import { api } from '../services/api.js';
import { useDocuments } from '../hooks/useDocuments.js';
import RichText from '../components/RichText.jsx';
import { Alert, DocumentPicker, EmptyState, FullPageSpinner, PageHeader, Spinner } from '../components/ui/index.jsx';
import { formatDate } from '../utils/format.js';

function Citation({ c, index }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-secondary/20 bg-tint">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-secondary/5"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-white">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-secondary">
          {c.filename} · page {c.page}
        </span>
        {open ? <ChevronDown className="size-4 text-muted" aria-hidden="true" /> : <ChevronRight className="size-4 text-muted" aria-hidden="true" />}
      </button>
      {open ? (
        <div className="border-t border-line px-3 py-2.5">
          <p className="border-l-2 border-secondary pl-3 text-[13px] italic leading-relaxed text-muted">“{c.excerpt}”</p>
          {typeof c.score === 'number' ? <p className="mt-2 text-xs text-muted">Match score: {c.score.toFixed(2)}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function Bubble({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-primary px-4 py-2.5 text-[15px] text-white">{m.content}</p>
      </div>
    );
  }
  const insufficient = m.sufficientEvidence === false;
  return (
    <div className="max-w-[92%]">
      <div className={`card px-4 py-3 ${insufficient ? 'border-warning/40 bg-warning/5' : ''}`}>
        {insufficient ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-warning-ink">Not enough evidence</p> : null}
        <RichText text={m.content} />
      </div>
      {m.citations?.length ? (
        <div className="mt-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
            <Quote className="size-3.5" aria-hidden="true" /> Sources
          </p>
          <ul className="space-y-1.5">
            {m.citations.map((c, i) => (
              <Citation key={`${c.documentId}-${c.page}-${i}`} c={c} index={i} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function Assistant() {
  const location = useLocation();
  const { documents, loading: docsLoading, error: docsError } = useDocuments();
  const ready = documents.filter((d) => d.status === 'ready');

  const [selected, setSelected] = useState(location.state?.documentId ? [location.state.documentId] : []);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.chat.history({ limit: 20 });
      setConversations(data.conversations);
    } catch {
      /* history is a convenience; the assistant still works without it */
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Drop selections that are no longer ready (e.g. deleted elsewhere).
  useEffect(() => {
    if (!docsLoading) setSelected((sel) => sel.filter((id) => ready.some((d) => d.id === id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsLoading, documents]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    if (!ready.length) return setError('Upload and process a PDF before asking questions.');
    setError('');
    setBusy(true);
    setQuestion('');
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: q }]);
    try {
      const data = await api.chat.ask({
        question: q,
        ...(selected.length ? { documentIds: selected } : {}),
        ...(conversationId ? { conversationId } : {}),
      });
      setConversationId(data.conversationId);
      setMessages((m) => [...m, data.message]);
      loadConversations();
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.slice(0, -1)); // remove the unsent question
      setQuestion(q);
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id) {
    setError('');
    setBusy(true);
    try {
      const data = await api.chat.history({ conversationId: id });
      setMessages(data.messages);
      setConversationId(id);
      setShowHistory(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function newConversation() {
    setMessages([]);
    setConversationId(null);
    setError('');
  }

  if (docsLoading) return <FullPageSpinner />;

  if (!docsError && documents.length === 0) {
    return (
      <>
        <PageHeader title="Study assistant" />
        <EmptyState title="Upload a document first" action={<Link to="/documents" className="btn btn-primary">Go to documents</Link>}>
          The assistant answers from your own PDFs, so it needs at least one to work with.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Study assistant"
        description="Ask questions about your documents. Every answer shows the pages it came from."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
              <History className="size-4" aria-hidden="true" /> History
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={newConversation}>
              <Plus className="size-4" aria-hidden="true" /> New chat
            </button>
          </>
        }
      />

      {docsError ? <Alert className="mb-4">{docsError}</Alert> : null}

      {showHistory ? (
        <div className="card mb-4 max-h-60 overflow-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted">No past conversations yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => openConversation(c.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-canvas ${c.id === conversationId ? 'bg-secondary/5' : ''}`}>
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(c.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <details className="card mb-4" open={selected.length === 0 && ready.length > 1}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Sources: {selected.length ? `${selected.length} selected` : 'all ready documents'} <span className="text-muted">({ready.length} available)</span>
        </summary>
        <div className="border-t border-line p-4">
          {ready.length ? (
            <>
              <DocumentPicker documents={ready} selected={selected} onChange={setSelected} legend="Limit answers to…" />
              <p className="hint">Leave all unchecked to search every ready document.</p>
            </>
          ) : (
            <p className="text-sm text-muted">Your documents are still processing. They will appear here when they are ready.</p>
          )}
        </div>
      </details>

      <div className="card flex min-h-[22rem] flex-col">
        <div className="flex-1 space-y-5 p-4 sm:p-5" aria-live="polite">
          {messages.length === 0 && !busy ? (
            <p className="py-10 text-center text-sm text-muted">Ask something about your material, for example “Summarise the main argument of chapter 2.”</p>
          ) : null}
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {busy ? (
            <div className="text-sm text-muted">
              <Spinner className="size-4" label="Searching your documents and writing an answer…" />
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {error ? <Alert className="mx-4 mb-3 sm:mx-5">{error}</Alert> : null}

        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
          <label htmlFor="question" className="sr-only">Your question</label>
          <textarea
            id="question"
            rows={1}
            value={question}
            maxLength={2000}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            placeholder="Ask about your documents…"
            className="input max-h-40 min-h-[2.75rem] resize-y"
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary h-11 shrink-0" disabled={busy || !question.trim() || ready.length === 0}>
            <Send className="size-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Send</span>
          </button>
        </form>
      </div>
      <p className="mt-2 text-xs text-muted">AI answers can be wrong. Open the sources to verify important details.</p>
    </>
  );
}
