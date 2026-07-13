import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">SmartBooking</p>
        <h1>La prise de rendez-vous en ligne simple, rapide et sans doublons.</h1>
        <p className="hero-copy">
          Une plateforme complète pour les clients et les entreprises, avec planning intelligent, gestion des services,
          tableaux de bord et sécurité par rôles.
        </p>
        <div className="hero-actions">
          <Link className="primary-btn" to="/register">
            Créer un compte
          </Link>
          <Link className="secondary-btn" to="/login">
            Se connecter
          </Link>
        </div>
      </div>
      <div className="hero-panel">
        <div className="stat-card">
          <strong>0 double réservation</strong>
          <span>Contraintes SQL + vérification serveur</span>
        </div>
        <div className="stat-card">
          <strong>2 rôles</strong>
          <span>Client et administrateur</span>
        </div>
        <div className="stat-card">
          <strong>Responsive</strong>
          <span>Interface mobile-first</span>
        </div>
      </div>
    </section>
  );
}
