import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';
import { api } from '../lib/api';

export function VerifyEmailPage() {
  const started = useRef(false);
  const [state, setState] = useState<'checking' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking your single-use email verification link…');

  useEffect(() => {
    // Verification tokens are single-use; do not post twice when StrictMode replays effects.
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState({}, document.title, '/verify-email');
    if (!token) {
      setState('error');
      setMessage('This verification link does not contain a token. Open the latest link from your CineBook email.');
      return;
    }
    api<{ verified: boolean; message: string }>('/auth/verify-email', {
      method: 'POST', body: JSON.stringify({ token })
    }, false).then(result => {
      setState(result.verified ? 'success' : 'error');
      setMessage(result.message || 'Email verification could not be completed.');
    }).catch(error => {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'This verification link is invalid or has expired.');
    });
  }, []);

  const Icon = state === 'success' ? CheckCircle2 : state === 'error' ? XCircle : Mail;
  return <main className="center-page"><section className="auth-card callback-card">
    <Icon size={34} className={state === 'success' ? 'gold-text' : ''} />
    <h2>{state === 'checking' ? 'Verifying your email…' : state === 'success' ? 'Email verified.' : 'Verification unavailable.'}</h2>
    <p className="muted">{message}</p>
    {state !== 'checking' && <Link className="button button-gold" to="/login">Continue to sign in</Link>}
  </section></main>;
}
