import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, MapPin, Ticket, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatShowTime, type Booking } from '../lib/api';

export function BookingsPage() {
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const cancel = async (booking: Booking) => {
    if (!window.confirm(`Cancel booking ${booking.bookingCode}?`)) return;
    try { const result = await api<{ message: string }>(`/bookings/${booking.id}/cancel`, { method: 'POST' }); setNotice(result.message || 'Cancellation request completed.'); await query.refetch(); }
    catch (exception) { setNotice(exception instanceof Error ? exception.message : 'Cancellation failed.'); }
  };

  return <main className="page-shell content-section"><div className="section-topline"><div><span className="eyebrow">YOUR CINEMA HISTORY</span><h1>My tickets<span className="gold-dot">.</span></h1><p className="muted">Bookings are loaded from your CineBook account.</p></div><Link className="button button-gold" to="/">Find a film <ArrowRight size={15} /></Link></div>
    {notice && <div className="alert alert-info">{notice}</div>}
    {query.isLoading && <div className="loading-line" />}
    {query.error && <div className="alert alert-error">{query.error instanceof Error ? query.error.message : 'Could not load bookings.'}</div>}
    {!query.isLoading && !query.error && (query.data || []).length === 0 && <div className="empty-state"><Ticket size={28} /><h2>No bookings yet</h2><p>Your confirmed tickets will appear here after a successful payment.</p><Link className="button button-gold" to="/">Explore movies</Link></div>}
    <div className="booking-list">{(query.data || []).map(booking => <article className="booking-history-card" key={booking.id}><div className="booking-poster">{booking.posterUrl ? <img src={booking.posterUrl} alt="" /> : <Ticket size={25} />}</div><div className="booking-info"><span className={`status-pill ${booking.status.toLowerCase()}`}>{booking.status}</span><h3>{booking.movieTitle}</h3><p><MapPin size={13} /> {booking.theatreName}, {booking.city} · {booking.screenName}</p><p><CalendarDays size={13} /> {formatShowTime(booking.startsAt)}</p><div className="booking-meta"><span>Seats: <b>{booking.seats?.join(', ') || '—'}</b></span><span>Code: <b>{booking.bookingCode}</b></span></div></div><div className="booking-amount"><strong>{formatMoney(booking.totalAmount)}</strong><small>{booking.paymentStatus}</small>{booking.status === 'CONFIRMED' && new Date(booking.startsAt).getTime() > Date.now() && <button className="cancel-link" onClick={() => cancel(booking)}><XCircle size={14} /> Cancel booking</button>}</div></article>)}</div>
  </main>;
}
