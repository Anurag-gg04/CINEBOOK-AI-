import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock3, Film, LoaderCircle, MapPin, ShieldCheck, X } from 'lucide-react';
import { api, formatMoney, formatShowTime, type Movie, type Showtime, type Seat } from '../lib/api';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

interface Hold { token: string; total: number; expiresAt: string; status: string; }
interface PaymentOptions { mode: string; razorpayEnabled: boolean; razorpayKeyId: string | null; simulatorEnabled: boolean; }

export function MoviePage() {
  const { id } = useParams();
  const movieId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedShow, setSelectedShow] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [hold, setHold] = useState<Hold | null>(null);
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [booking, setBooking] = useState(false);

  const movieQuery = useQuery({ queryKey: ['movie', movieId], queryFn: () => api<Movie>(`/movies/${movieId}`), enabled: Number.isFinite(movieId) && movieId > 0 });
  const showsQuery = useQuery({ queryKey: ['shows', movieId], queryFn: () => api<Showtime[]>(`/shows?movieId=${movieId}`), enabled: Number.isFinite(movieId) && movieId > 0 });
  const seatsQuery = useQuery({ queryKey: ['show-seats', selectedShow?.id], queryFn: () => api<Seat[]>(`/shows/${selectedShow?.id}/seats`), enabled: Boolean(selectedShow) && !hold, refetchInterval: selectedShow && !hold ? 15_000 : false });
  const movie = movieQuery.data;
  const seats = seatsQuery.data || [];

  const closeBooking = () => { setSelectedShow(null); setSelectedSeats([]); setHold(null); setCoupon(''); setNotice(''); setBooking(false); };
  const toggleSeat = (seat: Seat) => {
    if (seat.status !== 'AVAILABLE' || hold) return;
    setSelectedSeats(current => current.includes(seat.id) ? current.filter(item => item !== seat.id) : current.length < 8 ? [...current, seat.id] : current);
  };

  const createHold = async () => {
    if (!user) { navigate('/login'); return; }
    if (!selectedShow || selectedSeats.length === 0) return;
    setBusy(true); setNotice('');
    try {
      const result = await api<Hold>(`/shows/${selectedShow.id}/holds`, {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ seatIds: selectedSeats })
      });
      setHold(result);
      await seatsQuery.refetch();
    } catch (exception) { setNotice(exception instanceof Error ? exception.message : 'Could not hold those seats.'); }
    finally { setBusy(false); }
  };

  const finishSimulatorPayment = async () => {
    if (!hold) return;
    setBusy(true); setNotice('');
    try {
      const result = await api<{ status: string; booking?: { id: number; bookingCode: string } }>('/payments/simulator', {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ holdToken: hold.token, decision: 'APPROVE', couponCode: coupon || null })
      });
      if (result.booking) { setNotice(`Test booking confirmed: ${result.booking.bookingCode}. No real money was transferred.`); setBooking(true); }
      else setNotice(`Test payment status: ${result.status}.`);
    } catch (exception) { setNotice(exception instanceof Error ? exception.message : 'Test payment failed.'); }
    finally { setBusy(false); }
  };

  const payWithRazorpay = async () => {
    if (!hold) return;
    setBusy(true); setNotice('');
    try {
      if (!window.Razorpay) throw new Error('Razorpay Checkout did not load. Refresh the page and retry.');
      const order = await api<{ mode: string; keyId: string; orderId: string; amountPaise: number; currency: string; message: string }>('/payments/razorpay/orders', {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ holdToken: hold.token, couponCode: coupon || null })
      });
      const checkout = new window.Razorpay({ key: order.keyId, amount: order.amountPaise, currency: order.currency, name: 'CineBook AI', description: movie?.title || 'Movie tickets', order_id: order.orderId,
        handler: async (response: Record<string, string>) => {
          try {
            const result = await api<{ booking?: { bookingCode: string }; status: string }>('/payments/razorpay/verify', {
              method: 'POST', body: JSON.stringify({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature })
            });
            setNotice(result.booking ? `Booking confirmed: ${result.booking.bookingCode}.` : `Payment status: ${result.status}.`);
            setBooking(Boolean(result.booking));
          } catch (exception) { setNotice(exception instanceof Error ? exception.message : 'Payment verification failed.'); }
        },
        modal: { ondismiss: () => setNotice('Payment window closed. Your seat hold will expire automatically.') }
      });
      checkout.open();
    } catch (exception) { setNotice(exception instanceof Error ? exception.message : 'Unable to start Razorpay checkout.'); }
    finally { setBusy(false); }
  };

  const openShow = (show: Showtime) => {
    if (!user) { navigate('/login'); return; }
    setSelectedShow(show); setSelectedSeats([]); setHold(null); setNotice(''); setBooking(false);
  };

  if (movieQuery.isLoading) return <main className="page-shell"><div className="loading-line" /></main>;
  if (movieQuery.error || !movie) return <main className="page-shell"><div className="empty-state"><Film size={30} /><h2>Film not found</h2><p>{movieQuery.error instanceof Error ? movieQuery.error.message : 'This title is not available in the CineBook catalogue.'}</p><button className="button button-outline" onClick={() => navigate('/')}>Back to discovery</button></div></main>;

  return <main className="movie-detail-page">
    <section className="movie-detail-hero" style={{ backgroundImage: movie.backdropUrl ? `linear-gradient(90deg, #080b12 8%, rgba(8,11,18,.82) 48%, rgba(8,11,18,.15)), url("${movie.backdropUrl}")` : undefined }}>
      <div className="detail-content"><button className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back to films</button><span className="eyebrow">NOW SHOWING</span><h1>{movie.title}</h1><div className="detail-tags"><span>{movie.contentRating}</span><span>{movie.language}</span><span>{movie.durationMinutes} min</span>{movie.rating > 0 && <span>★ {movie.rating.toFixed(1)}</span>}</div><p>{movie.synopsis}</p><div className="genre-line">{(movie.genres || []).map(item => <span key={item}>{item}</span>)}</div></div>
    </section>
    <section className="content-section showtime-section"><div className="section-heading"><div><span className="eyebrow">PLAN YOUR VISIT</span><h2>Choose a showtime<span className="gold-dot">.</span></h2></div><span className="muted">Prices shown as starting prices</span></div>
      {showsQuery.isLoading && <div className="loading-line" />}
      {showsQuery.error && <div className="alert alert-error">{showsQuery.error instanceof Error ? showsQuery.error.message : 'Could not load showtimes.'}</div>}
      {!showsQuery.isLoading && !showsQuery.error && (showsQuery.data || []).length === 0 && <div className="empty-state"><Clock3 size={26} /><h3>No upcoming showtimes</h3><p>There are no future sessions for this film in the live catalogue.</p></div>}
      <div className="showtime-grid">{(showsQuery.data || []).map(show => <article className="showtime-card" key={show.id}><div><h3>{show.theatreName}</h3><p><MapPin size={13} /> {show.city} · {show.screenName}</p><strong>{formatShowTime(show.startsAt)}</strong><small>From {formatMoney(show.startingPrice)}</small></div><button className="button button-outline button-small" onClick={() => openShow(show)}>Select seats <ArrowRight size={14} /></button></article>)}</div>
    </section>

    {selectedShow && <div className="modal-scrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeBooking(); }}><section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="modal-header"><div><span className="eyebrow">{booking ? 'ALL SET' : 'YOUR SEATS'}</span><h2 id="booking-title">{booking ? 'You’re booked.' : hold ? 'Confirm your booking' : 'Pick your seats'}</h2><p>{selectedShow.theatreName} · {formatShowTime(selectedShow.startsAt)}</p></div><button className="icon-button" onClick={closeBooking} aria-label="Close"><X size={19} /></button></div>
      {booking ? <div className="booking-complete"><span className="complete-mark"><Check size={28} /></span><h3>Movie night, confirmed.</h3><p>{notice}</p><button className="button button-gold" onClick={() => navigate('/bookings')}>View my tickets</button></div> : hold ? <div className="payment-step"><div className="hold-banner"><ShieldCheck size={17} /> Seats held until {new Date(hold.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</div><div className="payment-total"><span>Selected seats</span><strong>{selectedSeats.length} seats</strong></div><div className="payment-total"><span>Hold total before coupon</span><strong>{formatMoney(hold.total)}</strong></div><label className="coupon-input">Coupon code<input value={coupon} onChange={event => setCoupon(event.target.value.toUpperCase())} placeholder="Enter code (optional)" maxLength={40} /></label><div className="payment-disclaimer">Payment mode is determined by the backend. Test payments do not transfer money.</div><div className="modal-actions"><button className="button button-outline" onClick={closeBooking}>Cancel</button><button className="button button-gold" onClick={async () => { const options = await api<PaymentOptions>('/payments/options'); if (options.razorpayEnabled) await payWithRazorpay(); else if (options.simulatorEnabled) await finishSimulatorPayment(); else setNotice('No payment provider is configured. Configure Razorpay test credentials to accept bookings.'); }} disabled={busy}>{busy ? 'Processing…' : 'Continue to payment'}</button></div></div> : <>
        <div className="screen-indicator"><span className="screen-glow" />SCREEN</div>
        {seatsQuery.isLoading && <div className="seat-loading"><LoaderCircle className="spin" /> Loading current seat inventory…</div>}
        {seatsQuery.error && <div className="alert alert-error">{seatsQuery.error instanceof Error ? seatsQuery.error.message : 'Seat inventory unavailable.'}</div>}
        <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${Math.min(selectedShow.columns || 10, 12)}, minmax(21px, 1fr))` }}>{seats.map(seat => <button key={seat.id} className={`seat ${seat.status.toLowerCase()} ${selectedSeats.includes(seat.id) ? 'selected' : ''}`} title={`${seat.label} · ${seat.status} · ${formatMoney(seat.price)}`} onClick={() => toggleSeat(seat)} disabled={seat.status !== 'AVAILABLE'}>{seat.number}</button>)}</div>
        <div className="seat-legend"><span><i className="legend-seat available" /> Available</span><span><i className="legend-seat selected" /> Selected</span><span><i className="legend-seat unavailable" /> Unavailable</span></div>
        <div className="seat-selection-footer"><div><small>{selectedSeats.length} of 8 seats selected</small><strong>{formatMoney(seats.filter(seat => selectedSeats.includes(seat.id)).reduce((sum, seat) => sum + Number(seat.price), 0))}</strong></div><button className="button button-gold" onClick={createHold} disabled={busy || selectedSeats.length === 0}>{busy ? 'Holding…' : 'Hold seats'} <ArrowRight size={15} /></button></div>
      </>}
      {notice && !booking && <div className="alert alert-error modal-alert">{notice}</div>}
    </section></div>}
  </main>;
}
