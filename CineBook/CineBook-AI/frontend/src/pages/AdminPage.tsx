import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ShieldCheck, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type UserRow = { id: number; email: string; displayName: string; role: string };
type AuditRow = { id: number; actor: string; action: string; targetType: string; targetId: string; details: string; createdAt: string; correlationId: string };
const roles = ['CUSTOMER', 'THEATRE_PARTNER', 'OPERATIONS', 'ADMIN'];

export function AdminPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => api<UserRow[]>('/admin/users') });
  const audit = useQuery({ queryKey: ['admin-audit'], queryFn: () => api<AuditRow[]>('/admin/audit') });
  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api<UserRow>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['admin-users'] }); client.invalidateQueries({ queryKey: ['admin-audit'] }); }
  });
  const rows = useMemo(() => users.data || [], [users.data]);
  if (user?.role !== 'ADMIN') return <main className="page-shell content-section"><div className="alert alert-error">Administrator permission is required to view this page.</div></main>;
  return <main className="page-shell content-section">
    <div className="section-topline"><div><span className="eyebrow">PLATFORM CONTROL</span><h1>Administration<span className="gold-dot">.</span></h1><p className="muted">User roles and audit records from the protected administration API.</p></div><span className="role-pill"><ShieldCheck size={14} /> ADMIN</span></div>
    {users.isError && <div className="alert alert-error">{users.error instanceof Error ? users.error.message : 'Could not load users.'}</div>}
    {mutation.isError && <div className="alert alert-error">{mutation.error instanceof Error ? mutation.error.message : 'Could not update the role.'}</div>}
    <section className="workspace-panel admin-panel"><div className="panel-heading"><div><span className="eyebrow">ACCOUNTS</span><h2>Registered users <small>({rows.length})</small></h2></div><Users size={19} /></div>
      {users.isLoading ? <div className="loading-line" /> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.displayName}{row.email === user.email && <span className="muted"> (you)</span>}</td><td>{row.email}</td><td><select aria-label={`Role for ${row.email}`} value={row.role} disabled={mutation.isPending || row.email === user.email} onChange={event => mutation.mutate({ id: row.id, role: event.target.value })}>{roles.map(role => <option value={role} key={role}>{role.replaceAll('_', ' ')}</option>)}</select></td></tr>)}</tbody></table></div>}
    </section>
    <section className="workspace-panel admin-panel"><div className="panel-heading"><div><span className="eyebrow">GOVERNANCE</span><h2>Recent audit activity</h2></div><Activity size={19} /></div>
      {audit.isLoading ? <div className="loading-line" /> : audit.isError ? <div className="alert alert-error">{audit.error instanceof Error ? audit.error.message : 'Could not load audit activity.'}</div> : (audit.data || []).length === 0 ? <p className="muted">No audit events have been recorded yet.</p> : <div className="audit-list">{(audit.data || []).map(event => <article className="audit-row" key={event.id}><div><strong>{event.action.replaceAll('_', ' ')}</strong><span>{event.actor} · {event.targetType} {event.targetId}</span><small>{event.details}</small></div><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString('en-IN')}</time></article>)}</div>}
    </section>
  </main>;
}
