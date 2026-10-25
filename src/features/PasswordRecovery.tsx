import { useState } from 'react';
import { auth } from '../services/cloud';
import type { GrowthController } from '../app/useGrowth';
export function PasswordRecovery({ app }: { app: GrowthController }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function close() { const url = new URL(location.href); url.searchParams.delete('recovery'); history.replaceState(null, '', url.pathname + url.search); app.setRecovery(false); }
  async function save() {
    if (password !== confirm) { setError('The passwords must match.'); return; }
    setBusy(true); setError('');
    try {
      if (!auth || app.owner === 'guest') throw new Error('Open a fresh password-reset link from your email.');
      const { error } = await auth.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm(''); app.setNotice('Your password has been updated.'); close();
    } catch (e) { setError(e instanceof Error ? e.message : 'Password update failed. Request a new reset link.'); }
    finally { setBusy(false); }
  }
  return <main className="main-content"><section className="panel stack"><h1>Choose a new password</h1><p>Use the recovery link sent to your email. Your saved progress stays with your account.</p>{app.owner === 'guest' && <p role="status">Waiting for a valid recovery session. If this link expired, return to Settings and request another reset email.</p>}<form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }}><label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>{error && <p role="alert">{error}</p>}<button className="primary-button" disabled={busy || app.owner === 'guest'}>{busy ? 'Updating…' : 'Update password'}</button></form><button className="subtle-button" disabled={busy} onClick={close}>Return to my workspace</button></section></main>;
}
