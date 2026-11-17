import { useQuery } from '@tanstack/react-query';
import { Chrome } from 'lucide-react';
import { api } from '../lib/api';

export function GoogleSignInButton() {
  const { data, isLoading } = useQuery({
    queryKey: ['google-auth-status'],
    queryFn: () => api<{ enabled: boolean; message: string }>('/auth/google/status'),
    staleTime: 60_000
  });

  return (
    <div className="google-wrap">
      <button
        className="google-button"
        type="button"
        disabled={isLoading || !data?.enabled}
        onClick={() => { window.location.assign('/oauth2/authorization/google'); }}
      >
        <Chrome size={18} />
        <span>Continue with Google</span>
      </button>
      {!isLoading && !data?.enabled && <p className="field-note">Google sign-in is not configured on the backend yet.</p>}
    </div>
  );
}
