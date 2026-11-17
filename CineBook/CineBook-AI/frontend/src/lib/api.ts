export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'cinebook.session.v2';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: 'CUSTOMER' | 'THEATRE_PARTNER' | 'ADMIN' | 'OPERATIONS' | string;
}

export interface Session {
  accessToken: string;
  refreshToken?: never;
  expiresInSeconds: number;
  user: User;
}

export interface Movie {
  id: number;
  title: string;
  synopsis: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  durationMinutes: number;
  language: string;
  genres: string[];
  contentRating: string;
  releaseDate: string | null;
  rating: number;
}

export interface Showtime {
  id: number;
  movieId: number;
  movieTitle: string;
  moviePoster: string | null;
  theatreName: string;
  city: string;
  address: string;
  screenName: string;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  rows: number;
  columns: number;
}

export interface Seat {
  id: number;
  label: string;
  row: string;
  number: number;
  type: string;
  accessible: boolean;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | string;
  price: number;
}

export interface Booking {
  id: number;
  bookingCode: string;
  status: string;
  movieTitle: string;
  posterUrl: string | null;
  theatreName: string;
  city: string;
  screenName: string;
  startsAt: string;
  endsAt: string;
  seats: string[];
  totalAmount: number;
  paymentProvider: string;
  paymentStatus: string;
  createdAt: string;
  ticketNote: string;
}

export interface ApiError extends Error { status?: number; code?: string; }

export function readSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null') as Session | null; }
  catch { return null; }
}

export function saveSession(session: Session | null) {
  if (session) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(TOKEN_KEY);
}

let refreshPromise: Promise<Session | null> | null = null;

async function refreshSession(): Promise<Session | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin'
      });
      if (!response.ok) { saveSession(null); return null; }
      const next = await response.json() as Session;
      saveSession(next);
      return next;
    } catch { return null; }
    finally { refreshPromise = null; }
  })();
  return refreshPromise;
}

export async function restoreSession(): Promise<Session | null> {
  return refreshSession();
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-ID', crypto.randomUUID());
  const session = readSession();
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`);
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'same-origin' }); }
  catch { throw new Error('CineBook could not reach its API. Check the backend service and try again.'); }
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    const renewed = await refreshSession();
    if (renewed?.accessToken) {
      headers.set('Authorization', `Bearer ${renewed.accessToken}`);
      response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'same-origin' });
    }
  }
  if (!response.ok) {
    let payload: { message?: string; code?: string } = {};
    try { payload = await response.json(); } catch { /* keep status message */ }
    const error = new Error(payload.message || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export const formatMoney = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(value || 0);

export const formatShowTime = (value: string) => new Intl.DateTimeFormat('en-IN', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata'
}).format(new Date(value));
