'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      setError('Supabase is not configured yet. Add the variables from .env.example.'); setBusy(false); return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setBusy(false); return; }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <main className="admin-shell login-shell">
      <div className="admin-grid-bg" />
      <form className="login-card" onSubmit={submit}>
        <a href="/" className="admin-back"><ArrowLeft size={15} /> Back to portfolio</a>
        <div className="admin-logo"><span>&lt;/&gt;</span> MYLES<span className="dot">.</span></div>
        <div className="login-icon"><LockKeyhole size={20} /></div>
        <span className="eyebrow">PRIVATE AREA</span>
        <h1>Admin access</h1>
        <p>Sign in with the portfolio owner account. New account creation is intentionally disabled here.</p>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
