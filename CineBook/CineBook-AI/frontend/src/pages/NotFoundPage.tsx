import { Link } from 'react-router-dom';
import { ArrowLeft, Film } from 'lucide-react';
export function NotFoundPage() { return <main className="center-page"><div className="empty-state"><Film size={32} /><span className="eyebrow">SCENE NOT FOUND</span><h2>This page missed its screening.</h2><p>The link may be old, or the page has moved.</p><Link to="/" className="button button-gold"><ArrowLeft size={16} /> Back to CineBook</Link></div></main>; }
