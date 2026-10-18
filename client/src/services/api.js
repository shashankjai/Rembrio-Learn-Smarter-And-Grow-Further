// Centralised API client. Every request in the app goes through here.
// Base URL: VITE_API_URL (e.g. https://api.example.com/api) or "/api" (proxied by Vite in dev).
let rawBase = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
if (rawBase && !rawBase.endsWith('/api') && rawBase.startsWith('http')) {
  rawBase += '/api';
}
const BASE_URL = rawBase;
const TOKEN_KEY = 'rembrio_token';

export class ApiClientError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: the session will last until the page is closed */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

let unauthorizedHandler = null;
export const onUnauthorized = (fn) => {
  unauthorizedHandler = fn;
};

const NETWORK_MESSAGE = 'Could not reach the Rembrio server. Check your connection and try again.';

function toError(status, payload) {
  const message = payload?.error?.message || `Request failed (${status})`;
  return new ApiClientError(status, message, payload?.error?.details);
}

async function request(path, { method = 'GET', body, query, signal, auth = true } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, v);

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, signal, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiClientError(0, NETWORK_MESSAGE);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    if (res.status === 401 && auth && token && unauthorizedHandler) unauthorizedHandler();
    throw toError(res.status, payload);
  }
  return payload?.data;
}

/** Upload with progress (fetch cannot report upload progress, XHR can). */
function uploadDocument(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/documents/upload`);
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new ApiClientError(0, NETWORK_MESSAGE));
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(payload?.data);
      if (xhr.status === 401 && unauthorizedHandler) unauthorizedHandler();
      reject(toError(xhr.status, payload));
    };
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
    login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  profile: {
    get: () => request('/profile'),
    update: (data) => request('/profile', { method: 'PATCH', body: data }),
  },
  documents: {
    list: (signal) => request('/documents', { signal }),
    get: (id, signal) => request(`/documents/${id}`, { signal }),
    remove: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
    upload: uploadDocument,
  },
  chat: {
    ask: (data) => request('/chat/ask', { method: 'POST', body: data }),
    history: (query, signal) => request('/chat/history', { query, signal }),
  },
  quizzes: {
    generate: (data) => request('/quizzes/generate', { method: 'POST', body: data }),
    submit: (data) => request('/quizzes/submit', { method: 'POST', body: data }),
  },
  progress: { get: (signal) => request('/progress', { signal }) },
  plans: {
    list: (signal) => request('/study-plans', { signal }),
    create: (data) => request('/study-plans', { method: 'POST', body: data }),
    update: (id, data) => request(`/study-plans/${id}`, { method: 'PATCH', body: data }),
    remove: (id) => request(`/study-plans/${id}`, { method: 'DELETE' }),
  },
};
