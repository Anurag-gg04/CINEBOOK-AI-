import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Film, ShieldCheck } from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function AuthPage() {
  const { user, login, register, setLoading, loading } = useAuth();
  const [search] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (mode === 'login') { await login(email, password); navigate('/dashboard'); }
      else { const result = await register(name, email, password); setMessage(result); }
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Unable to continue. Please retry.'); }
    finally { setLoading(false); }
  };

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-art-inner">
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to discovery</Link>
          <div className="auth-quote">
            <span className="eyebrow">YOUR NEXT STORY STARTS HERE</span>
            <h1>Some nights<br />deserve the <em>big screen.</em></h1>
            <p>Find the film. Choose your seats. Make a night of it.</p>
          </div>
          <div className="auth-stamp"><Film size={17} /> Curated for your kind of cinema</div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">CINEBOOK ACCOUNT</span>
          <h2>{mode === 'login' ? 'Welcome back.' : 'Make it a movie night.'}</h2>
          <p className="muted">{mode === 'login' ? 'Sign in to pick up where the previews left off.' : 'Create an account to save your tickets and preferences.'}</p>
          {search.get('oauth') === 'failed' && <div className="alert alert-error">Google sign-in could not be completed. Check your Google OAuth setup and retry.</div>}
          <GoogleSignInButton />
          <div className="form-divider"><span>or continue with email</span></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <label>Full name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder="Your name" /></label>}
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={190} placeholder="you@example.com" /></label>
            <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 12 : 1} maxLength={72} placeholder={mode === 'register' ? 'At least 12 characters' : 'Enter your password'} /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <div className="alert alert-error">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button className="button button-gold button-wide" type="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
          </form>
          <p className="auth-toggle">{mode === 'login' ? 'New to CineBook?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          <p className="security-note"><ShieldCheck size={14} /> Your account is protected with encrypted authentication.</p>
        </div>
      </section>
    </main>
  );
}
