import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

const POLL_MS = 2500;

/**
 * Loads the user's documents. While any document is still "processing" it polls,
 * so the UI flips to "ready"/"failed" as soon as the server finishes — never earlier.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await api.documents.list();
      if (!mounted.current) return;
      setDocuments(data.documents);
      setError('');
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const hasProcessing = documents.some((d) => d.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) return undefined;
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [hasProcessing, load]);

  return { documents, setDocuments, loading, error, reload: load };
}
