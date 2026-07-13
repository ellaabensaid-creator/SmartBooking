import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="panel not-found-page">
      <p className="eyebrow">404</p>
      <h2>Page introuvable</h2>
      <p className="muted">L’adresse demandée n’existe pas ou a été déplacée.</p>
      <div className="hero-actions">
        <Link className="primary-btn" to="/">
          Retour à l’accueil
        </Link>
        <Link className="secondary-btn" to="/services">
          Voir les services
        </Link>
      </div>
    </section>
  );
}