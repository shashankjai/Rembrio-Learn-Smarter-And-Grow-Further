import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, PageHeader, PasswordField, Spinner, TextField } from '../components/ui/index.jsx';
import { validateEmail, validateName, validatePassword } from '../utils/validators.js';

export default function Profile() {
  const { user, applyProfile, logout } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, currentPassword: '', newPassword: '', confirmNew: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { variant, text }
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailChanged = form.email.trim().toLowerCase() !== user.email;
  const wantsPassword = Boolean(form.newPassword);
  const needsCurrent = emailChanged || wantsPassword;

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);
    const v = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      ...(wantsPassword ? { newPassword: validatePassword(form.newPassword), confirmNew: form.confirmNew !== form.newPassword ? 'Passwords do not match' : '' } : {}),
      ...(needsCurrent && !form.currentPassword ? { currentPassword: 'Enter your current password to confirm this change' } : {}),
    };
    const clean = Object.fromEntries(Object.entries(v).filter(([, x]) => x));
    setErrors(clean);
    if (Object.keys(clean).length) return;

    const patch = {};
    if (form.name.trim() !== user.name) patch.name = form.name.trim();
    if (emailChanged) patch.email = form.email.trim();
    if (wantsPassword) patch.newPassword = form.newPassword;
    if (needsCurrent) patch.currentPassword = form.currentPassword;
    if (!Object.keys(patch).length) return setMessage({ variant: 'info', text: 'Nothing to update.' });

    setBusy(true);
    try {
      const data = await api.profile.update(patch);
      applyProfile(data);
      setForm((f) => ({ ...f, name: data.user.name, email: data.user.email, currentPassword: '', newPassword: '', confirmNew: '' }));
      setMessage({ variant: 'success', text: wantsPassword ? 'Profile updated. Your password was changed and other devices were signed out.' : 'Profile updated.' });
    } catch (err) {
      setMessage({ variant: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile and settings" description="Manage your account details and password." />
      <form onSubmit={onSubmit} noValidate className="card max-w-xl space-y-4 p-5 sm:p-6">
        {message ? <Alert variant={message.variant}>{message.text}</Alert> : null}
        <TextField label="Name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />

        <fieldset className="space-y-4 border-t border-line pt-4">
          <legend className="text-sm font-semibold text-primary">Change password</legend>
          <PasswordField label="New password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="Leave blank to keep your current password." />
          {wantsPassword ? <PasswordField label="Confirm new password" autoComplete="new-password" value={form.confirmNew} onChange={set('confirmNew')} error={errors.confirmNew} /> : null}
        </fieldset>

        {needsCurrent ? <PasswordField label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} hint="Required to change your email or password." /> : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? <Spinner className="size-4" label="Saving…" /> : 'Save changes'}
        </button>
      </form>

      <section className="card mt-6 flex max-w-xl flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold">Sign out</h2>
          <p className="text-sm text-muted">Ends this session on every device you are signed in on.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}><LogOut className="size-4" aria-hidden="true" /> Sign out</button>
      </section>
    </>
  );
}
