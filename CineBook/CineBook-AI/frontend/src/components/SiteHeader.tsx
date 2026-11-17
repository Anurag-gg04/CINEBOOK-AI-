import { Clapperboard, LayoutDashboard, LogIn, LogOut, Ticket, Sparkles } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/'); };
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="CineBook home">
          <span className="brand-mark"><Clapperboard size={19} /></span>
          <span>CINEBOOK<span className="brand-ai"> AI</span><small>THE MOVIE NIGHT, REIMAGINED</small></span>
        </Link>
        <nav className="main-nav">
          <NavLink to="/" end>Discover</NavLink>
          {user && <NavLink to="/bookings">My tickets</NavLink>}
          {user && <NavLink to="/assistant"><Sparkles size={14} /> AI guide</NavLink>}
          {user && <NavLink to="/dashboard"><LayoutDashboard size={14} /> Workspace</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? <>
            <span className="nav-user"><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><span>{user.displayName.split(' ')[0]}</span></span>
            <button className="icon-button" onClick={handleLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
          </> : <Link className="button button-outline button-small" to="/login"><LogIn size={15} /> Sign in</Link>}
          <Link className="button button-gold button-small hide-mobile" to={user ? '/bookings' : '/login'}><Ticket size={15} /> My bookings</Link>
        </div>
      </div>
    </header>
  );
}
