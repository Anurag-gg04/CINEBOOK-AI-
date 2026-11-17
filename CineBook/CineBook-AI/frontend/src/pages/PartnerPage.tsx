import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarDays, MapPin } from 'lucide-react';
import { api, formatMoney, formatShowTime, type Showtime } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function PartnerPage() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['partner-shows'], queryFn: () => api<Showtime[]>('/dashboard/partner/shows'), enabled: user?.role === 'THEATRE_PARTNER' || user?.role === 'ADMIN' });
  if (user?.role !== 'THEATRE_PARTNER' && user?.role !== 'ADMIN') return <main className="page-shell content-section"><div className="alert alert-error">Theatre partner permission is required to view this page.</div></main>;
  return <main className="page-shell content-section"><div className="section-topline"><div><span className="eyebrow">THEATRE PARTNER</span><h1>Your showtimes<span className="gold-dot">.</span></h1><p className="muted">A live list of showtimes associated with your partner account.</p></div><span className="role-pill"><Building2 size={14} /> PARTNER WORKSPACE</span></div>
    {query.isLoading && <div className="loading-line" />}
    {query.isError && <div className="alert alert-error">{query.error instanceof Error ? query.error.message : 'Could not load your showtimes.'}</div>}
    {!query.isLoading && !query.isError && (query.data || []).length === 0 && <div className="workspace-panel"><h2>No showtimes are linked to this account yet.</h2><p className="muted">A platform administrator must associate your account with a theatre before its shows appear here.</p></div>}
    <div className="partner-show-grid">{(query.data || []).map(show => <article className="workspace-panel partner-show-card" key={show.id}><div className="panel-heading"><div><span className="eyebrow">{show.screenName}</span><h2>{show.movieTitle}</h2></div><CalendarDays size={19} /></div><p><Building2 size={15} /> {show.theatreName}</p><p><MapPin size={15} /> {show.city}</p><p><CalendarDays size={15} /> {formatShowTime(show.startsAt)}</p><strong className="gold-text">From {formatMoney(show.startingPrice)}</strong></article>)}</div>
  </main>;
}
