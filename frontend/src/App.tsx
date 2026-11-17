import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { MoviePage } from './pages/MoviePage';
import { BookingsPage } from './pages/BookingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { AdminPage } from './pages/AdminPage';
import { PartnerPage } from './pages/PartnerPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page-shell content-section"><div className="loading-line" /></main>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoutedApplication() {
  return <>
    <SiteHeader />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/movie/:id" element={<MoviePage />} />
      <Route path="/bookings" element={<RequireAuth><BookingsPage /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/assistant" element={<RequireAuth><AIAssistantPage /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
      <Route path="/partner" element={<RequireAuth><PartnerPage /></RequireAuth>} />
      <Route path="/operations" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><RoutedApplication /></AuthProvider></BrowserRouter></QueryClientProvider>;
}
