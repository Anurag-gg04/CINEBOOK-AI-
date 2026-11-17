import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clapperboard, Clock3, Film, MapPin, Search, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type Movie } from '../lib/api';

interface MoviePageResponse { content: Movie[]; totalElements: number; totalPages: number; }

function MoviePoster({ movie }: { movie: Movie }) {
  return <div className="poster-frame">{movie.posterUrl ? <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <div className="poster-fallback"><Film size={30} /><span>{movie.title}</span></div>}<span className="poster-rating"><Star size={12} fill="currentColor" /> {Number(movie.rating || 0).toFixed(1)}</span></div>;
}

export function HomePage() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['movies', search, genre],
    queryFn: () => api<MoviePageResponse>(`/movies?q=${encodeURIComponent(search)}&genre=${encodeURIComponent(genre)}&page=0&size=24&sort=rating`),
    staleTime: 30_000
  });
  const movies = data?.content || [];
  const genres = useMemo(() => Array.from(new Set(movies.flatMap(movie => movie.genres || []))).sort(), [movies]);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-grain" />
        <div className="hero-content">
          <span className="eyebrow"><span className="eyebrow-dot" /> THE CINEMA EXPERIENCE, REFRAMED</span>
          <h1>Make room for<br /><em>something</em> unforgettable.</h1>
          <p>Good stories deserve a great screen. Discover what is showing, find your seats and make tonight count.</p>
          <div className="hero-actions"><a className="button button-gold" href="#now-showing">Explore films <ArrowRight size={17} /></a><Link className="button button-ghost" to="/assistant"><Sparkles size={16} /> Ask the AI guide</Link></div>
          <div className="hero-footnote"><span><Clapperboard size={15} /> Live cinema catalogue</span><span><MapPin size={15} /> Discover by city</span><span><Clock3 size={15} /> Real showtimes</span></div>
        </div>
        <div className="hero-side-note"><span>01 / DISCOVER</span><span className="vertical-rule" /><span>THE NEXT SCENE IS YOURS</span></div>
      </section>

      <section className="content-section" id="now-showing">
        <div className="section-topline"><div><span className="eyebrow">PICK YOUR NEXT STORY</span><h2>Now showing<span className="gold-dot">.</span></h2><p className="muted">Titles and details load directly from the CineBook catalogue.</p></div><div className="catalog-search"><Search size={17} /><input aria-label="Search movies" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles, genres…" /></div></div>
        <div className="filter-row"><button className={`filter-chip ${genre === '' ? 'selected' : ''}`} onClick={() => setGenre('')}>All films</button>{genres.map(item => <button key={item} className={`filter-chip ${genre === item ? 'selected' : ''}`} onClick={() => setGenre(genre === item ? '' : item)}>{item}</button>)}</div>
        {isLoading && <div className="loading-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index} />)}</div>}
        {error && <div className="empty-state"><Film size={28} /><h3>Catalogue unavailable</h3><p>{error instanceof Error ? error.message : 'The movie service could not be reached.'}</p><button className="button button-outline" onClick={() => window.location.reload()}>Retry</button></div>}
        {!isLoading && !error && movies.length === 0 && <div className="empty-state"><Film size={28} /><h3>No films found</h3><p>Try a different search or genre filter. CineBook does not fill empty results with sample titles.</p></div>}
        <div className="movie-grid">{movies.map((movie, index) => <motion.article key={movie.id} className="movie-card" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index * 0.035, 0.25) }}><Link to={`/movie/${movie.id}`}><MoviePoster movie={movie} /><div className="movie-meta"><div><h3>{movie.title}</h3><p>{(movie.genres || []).slice(0, 2).join(' · ')}{movie.language ? ` · ${movie.language}` : ''}</p></div><span>{movie.durationMinutes ? `${movie.durationMinutes}m` : movie.contentRating}</span></div><span className="movie-link">View film <ArrowRight size={14} /></span></Link></motion.article>)}</div>
      </section>

      <section className="ai-banner"><div className="ai-banner-icon"><Sparkles size={25} /></div><div><span className="eyebrow">A LITTLE HELP FINDING THE RIGHT FILM</span><h2>Tell us the mood. We’ll find the movie.</h2><p>Ask for a genre, language, budget or a kind of movie night. The AI guide checks the live catalogue.</p></div><Link className="button button-gold" to="/assistant">Meet your AI guide <ArrowRight size={16} /></Link></section>
      <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark"><Clapperboard size={18} /></span><span>CINEBOOK<span className="brand-ai"> AI</span></span></Link><p>Built around the joy of going to the movies.</p><span>© {new Date().getFullYear()} CineBook</span></footer>
    </main>
  );
}
