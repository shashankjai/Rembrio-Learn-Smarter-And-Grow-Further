import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, PasswordField, Spinner, TextField } from '../components/ui/index.jsx';
import { validateLogin } from '../utils/validators.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const v = validateLogin(form);
    setErrors(v);
    setServerError('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container-page grid min-h-[calc(100vh-10rem)] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-muted">Sign in to continue studying.</p>
        <form onSubmit={onSubmit} noValidate className="card mt-6 space-y-4 p-6">
          {serverError ? <Alert>{serverError}</Alert> : null}
          <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
          <PasswordField label="Password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="size-4" label="Signing in…" /> : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          New to Rembrio?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
