import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getServices({ q: query, page, pageSize: 12 })
      .then((data) => {
        setServices(data.services || []);
        setPagination(data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => setError(err.message));
  }, [page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>Services disponibles</h2>
          <p className="muted">Recherche côté serveur et pagination pour les catalogues plus gros.</p>
        </div>
        <label className="inline-filter">
          Rechercher
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, description ou admin" />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="cards-grid">
        {services.map((service) => (
          <article key={service.id} className="service-card">
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <div className="card-meta">
              <span>{service.durationMinutes} min</span>
              <span>{service.price} €</span>
            </div>
            <small>Entreprise: {service.adminName}</small>
          </article>
        ))}
      </div>
      <div className="pagination-row">
        <button className="secondary-btn" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
          Précédent
        </button>
        <span className="muted">Page {pagination.page || page} / {pagination.totalPages || 1}</span>
        <button className="secondary-btn" type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))} disabled={page >= (pagination.totalPages || 1)}>
          Suivant
        </button>
      </div>
    </section>
  );
}
