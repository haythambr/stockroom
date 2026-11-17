import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Alert } from '../components/ui';

function useReturnTo(): string {
  const location = useLocation();
  return (location.state as { from?: string } | null)?.from ?? '/';
}

function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="card p-7 sm:p-9">
        <h1 className="font-display text-4xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const returnTo = useReturnTo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Once signed in, this one redirect sends people on: admins to the back office, everyone
  // else back to where they were.
  if (user)
    return (
      <Navigate
        to={
          user.role === 'ADMIN' && returnTo === '/' ? '/admin/orders' : returnTo
        }
        replace
      />
    );

  const signIn = async (e?: FormEvent, demo?: 'customer' | 'admin') => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (demo
        ? login(`${demo}@stockroom.test`, 'password123')
        : login(email, password));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Sign in">
      <p className="mt-2 text-ink-2">Welcome back. Your cart is waiting.</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          className="btn-ghost btn-sm"
          onClick={() => signIn(undefined, 'customer')}
          disabled={busy}
        >
          Try as customer
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => signIn(undefined, 'admin')}
          disabled={busy}
        >
          Try as admin
        </button>
      </div>
      <p className="my-5 text-center text-xs font-bold tracking-widest text-ink-3 uppercase">
        or
      </p>

      <form onSubmit={signIn} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        New here?{' '}
        <Link
          to="/register"
          state={{ from: returnTo }}
          className="font-bold text-ink underline"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const returnTo = useReturnTo();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={returnTo} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <AuthCard title="Create an account">
      <p className="mt-2 text-ink-2">
        Takes a few seconds. No newsletter, promise.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            required
            {...field('name')}
          />
        </div>
        <div>
          <label className="label" htmlFor="reg-email">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            className="input"
            autoComplete="email"
            required
            {...field('email')}
          />
        </div>
        <div>
          <label className="label" htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            className="input"
            autoComplete="new-password"
            minLength={8}
            required
            {...field('password')}
          />
          <p className="mt-1 text-xs text-ink-3">At least 8 characters.</p>
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have one?{' '}
        <Link
          to="/login"
          state={{ from: returnTo }}
          className="font-bold text-ink underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
