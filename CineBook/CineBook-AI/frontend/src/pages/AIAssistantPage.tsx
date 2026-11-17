import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Send, Sparkles, UserRound } from 'lucide-react';
import { api, formatMoney, formatShowTime } from '../lib/api';

interface Suggestion { showtimeId: number; movie: string; theatre: string; city: string; startsAt: string; screen: string; priceFrom: string; }
interface AIStatus { enabled: boolean; message: string; }
interface AIReply { configured: boolean; provider: string; answer: string; matchingShowtimes: Suggestion[]; }
interface ChatMessage { role: 'assistant' | 'user'; text: string; options?: Suggestion[]; }

const starters = ['A thoughtful science-fiction film under ₹350', 'Something fun for a Saturday evening', 'Show me highly rated movies in Dehradun'];

export function AIAssistantPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Tell me what kind of movie night you have in mind. I’ll check the live CineBook showtime catalogue and help narrow it down.' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = useQuery({ queryKey: ['ai-status'], queryFn: () => api<AIStatus>('/ai/status'), staleTime: 60_000 });

  const send = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const prompt = (preset || question).trim();
    if (!prompt || busy) return;
    setQuestion(''); setError(''); setBusy(true);
    setMessages(current => [...current, { role: 'user', text: prompt }]);
    try {
      const reply = await api<AIReply>('/ai/assistant', { method: 'POST', body: JSON.stringify({ question: prompt }) });
      setMessages(current => [...current, { role: 'assistant', text: reply.answer, options: reply.matchingShowtimes }]);
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'The AI guide is unavailable.'); }
    finally { setBusy(false); }
  };

  return <main className="assistant-page content-section"><div className="assistant-intro"><span className="eyebrow"><Sparkles size={14} /> CINEMA, WITH A LITTLE INTELLIGENCE</span><h1>Find the film<br /><em>that feels right.</em></h1><p className="muted">Describe a genre, mood, budget or preferred time. The assistant uses current CineBook showtimes and starting prices rather than a made-up catalogue.</p><div className={`ai-status ${status.data?.enabled ? 'ready' : 'not-ready'}`}><span className="service-dot" />{status.data?.message || 'Checking AI configuration…'}</div></div>
    <section className="chat-panel"><div className="chat-topbar"><div className="ai-avatar"><Bot size={19} /></div><div><strong>CineBook AI Guide</strong><small>Live catalogue assistant</small></div><span className="online-label">{status.data?.enabled ? 'READY' : 'SETUP REQUIRED'}</span></div>
      <div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="chat-avatar">{message.role === 'assistant' ? <Bot size={16} /> : <UserRound size={16} />}</span><div className="chat-bubble"><p>{message.text}</p>{message.options && message.options.length > 0 && <div className="chat-options">{message.options.slice(0, 5).map(option => <article key={option.showtimeId}><div><strong>{option.movie}</strong><span>{option.theatre}, {option.city}</span><small>{formatShowTime(option.startsAt)} · {option.screen}</small></div><b>{formatMoney(Number(option.priceFrom))}</b></article>)}</div>}</div></div>)}{busy && <div className="chat-message assistant"><span className="chat-avatar"><Bot size={16} /></span><div className="chat-bubble typing">Checking current showtimes<span> · </span><span>·</span></div></div>}</div>
      {error && <div className="alert alert-error chat-error">{error}</div>}
      <div className="starter-prompts">{messages.length === 1 && starters.map(item => <button key={item} onClick={() => send(undefined, item)} disabled={busy}>{item}</button>)}</div>
      <form className="chat-input" onSubmit={send}><input value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder="Describe your ideal movie night…" aria-label="Ask CineBook AI" /><button className="button button-gold" type="submit" disabled={busy || !question.trim()} aria-label="Send message"><Send size={17} /></button></form>
      <p className="chat-disclaimer">AI suggestions are informational. Prices and showtimes are retrieved from the CineBook catalogue; seat availability is checked separately during booking.</p>
    </section></main>;
}
