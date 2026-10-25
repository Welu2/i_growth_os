import { useState } from 'react';
import type { GrowthController } from '../app/useGrowth';
import { auth } from '../services/cloud';
export function AccountForm({ app }: { app: GrowthController }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  async function submit(mode: 'signin' | 'signup' | 'reset') {
    setBusy(true); setError(''); setMessage('');
    try {
      if (!auth) throw new Error('Account services are not configured.');
      if (mode === 'reset') {
        const redirect = new URL(location.pathname, location.origin); redirect.searchParams.set('recovery', '1');
        const { error } = await auth.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect.href });
        if (error) throw error;
        setMessage('If this address has an account, a password-reset email will arrive shortly.');
      } else {
        const result = mode === 'signup' ? await auth.auth.signUp({ email: email.trim(), password }) : await auth.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        setPassword('');
        if (mode === 'signup' && !result.data.session) setMessage('Check your email to confirm your account, then sign in. Your guest progress stays separate.');
        else app.setNotice('Signed in. Your account has its own private workspace.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Account request failed.'); }
    finally { setBusy(false); }
  }
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return <form className="resource-form" onSubmit={(e) => { e.preventDefault(); void submit('signin'); }}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required /></label><button className="primary-button" disabled={busy || !app.online}>Sign in</button><button type="button" className="secondary-button" disabled={busy || !app.online || password.length < 8 || !validEmail} onClick={() => void submit('signup')}>Create account</button><button type="button" className="subtle-button" disabled={busy || !app.online || !validEmail} onClick={() => void submit('reset')}>Send password reset email</button>{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}</form>;
}
