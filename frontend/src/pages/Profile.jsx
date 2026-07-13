import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [history, setHistory] = useState({ recentAppointments: [], notifications: [], auditLogs: [], summary: {} });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    currentPassword: '',
    newPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      currentPassword: '',
      newPassword: ''
    });

    api.meHistory().then((data) => setHistory(data.history)).catch(() => setHistory({ recentAppointments: [], notifications: [], auditLogs: [], summary: {} }));
  }, [user]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await updateProfile(form);
      setMessage('Profil mis à jour.');
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel profile-page">
      <div className="section-header">
        <div>
          <h2>Mon profil</h2>
          <p className="muted">Modifie tes informations personnelles et ton mot de passe.</p>
        </div>
        <span className="status accepted">{user?.role}</span>
      </div>

      <form className="form profile-form" onSubmit={submit}>
        <div className="two-cols">
          <label>
            Prénom
            <input minLength={2} maxLength={100} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
          </label>
          <label>
            Nom
            <input minLength={2} maxLength={100} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
          </label>
        </div>

        <label>
          Email
          <input value={user?.email || ''} readOnly />
        </label>

        <label>
          Téléphone
          <input
            type="tel"
            inputMode="tel"
            maxLength={30}
            pattern="[0-9+()\-\s.]*"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </label>

        <div className="two-cols">
          <label>
            Mot de passe actuel
            <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
          </label>
          <label>
            Nouveau mot de passe
            <input type="password" minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Mise à jour...' : 'Enregistrer les modifications'}
        </button>
      </form>

      <section className="panel profile-section">
        <div className="section-header">
          <div>
            <h2>Historique détaillé</h2>
            <p className="muted">Rendez-vous récents, notifications et traces d’activité liées à ton compte.</p>
          </div>
          <span className="status accepted">{history.recentAppointments.length}</span>
        </div>

        <div className="dashboard-grid compact-grid">
          <div className="panel nested-panel">
            <h3>Rendez-vous récents</h3>
            <div className="list-stack">
              {history.recentAppointments.map((appointment) => (
                <article key={appointment.id} className="list-card">
                  <strong>{appointment.serviceName}</strong>
                  <span>{appointment.appointmentDate} - {appointment.appointmentTime?.slice(0, 5)}</span>
                  <span className={`status ${appointment.status}`}>{appointment.status}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel nested-panel">
            <h3>Notifications</h3>
            <div className="list-stack">
              {history.notifications.map((notification) => (
                <article key={notification.id} className="list-card notification-card">
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </article>
              ))}
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="panel nested-panel">
            <h3>Journal d’audit</h3>
            <div className="list-stack">
              {history.auditLogs.map((entry) => (
                <article key={entry.id} className="list-card">
                  <strong>{entry.summary}</strong>
                  <span>{entry.action}</span>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </section>
  );
}