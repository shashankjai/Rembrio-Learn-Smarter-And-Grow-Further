import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, PasswordField, Spinner, TextField } from '../components/ui/index.jsx';
import { validateRegister } from '../utils/validators.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const v = validateRegister(form);
    setErrors(v);
    setServerError('');
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Surface field-level server errors where we can.
      const fieldErrors = {};
      for (const d of err.details || []) if (d.field && !fieldErrors[d.field]) fieldErrors[d.field] = d.message;
      setErrors(fieldErrors);
      setServerError(Object.keys(fieldErrors).length ? '' : err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container-page grid min-h-[calc(100vh-10rem)] place-items-center py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-muted">Start studying from your own documents.</p>
        <form onSubmit={onSubmit} noValidate className="card mt-6 space-y-4 p-6">
          {serverError ? <Alert>{serverError}</Alert> : null}
          <TextField label="Name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
          <PasswordField label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, with a letter and a number." />
          <PasswordField label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? <Spinner className="size-4" label="Creating account…" /> : 'Create account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
