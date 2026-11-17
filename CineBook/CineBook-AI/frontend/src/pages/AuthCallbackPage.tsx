import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, type Session } from '../lib/api';

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const exchangeStarted = useRef(false);
  const { acceptSession, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // React StrictMode replays effects in development; the OAuth code is single-use.
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;
    const code = params.get('code');
    if (!code) { setError('The Google callback did not contain a sign-in code.'); setFinished(true); return; }
    window.history.replaceState({}, document.title, '/auth/callback');
    api<Session>('/auth/oauth/exchange', { method: 'POST', body: JSON.stringify({ code }) }, false)
      .then(session => { acceptSession(session); navigate('/dashboard', { replace: true }); })
      .catch(exception => { setError(exception instanceof Error ? exception.message : 'Google sign-in could not be completed.'); setFinished(true); });
  }, [params, acceptSession, navigate]);
  if (user) return <Navigate to="/dashboard" replace />;
  return <main className="center-page"><div className="auth-card callback-card"><span className="loader" /><h2>{finished ? 'Sign-in could not be completed' : 'Finishing your sign-in…'}</h2><p className="muted">{error || 'CineBook is securely exchanging your one-time Google sign-in code.'}</p>{finished && <a className="button button-gold" href="/login">Return to sign in</a>}</div></main>;
}
