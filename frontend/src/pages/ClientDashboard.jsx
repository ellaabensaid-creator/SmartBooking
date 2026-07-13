import { useEffect, useState } from 'react';
import { api } from '../api/client';
import SlotPicker from '../components/SlotPicker';

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function compareAppointments(left, right) {
  return `${left.appointmentDate} ${left.appointmentTime}`.localeCompare(`${right.appointmentDate} ${right.appointmentTime}`);
}

export default function ClientDashboard() {
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsPagination, setAppointmentsPagination] = useState({ page: 1, totalPages: 1 });
  const [slots, setSlots] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointmentQuery, setAppointmentQuery] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ serviceId: '', date: formatDateInput(), time: '', clientNote: '' });
  const pageSize = 4;

  const loadData = async () => {
    const [servicesData, appointmentsData, notificationsData] = await Promise.all([
      api.getServices(),
      api.getMyAppointments({ status: statusFilter, q: appointmentQuery, page, pageSize }),
      api.getNotifications({ page: 1, pageSize: 5 })
    ]);

    setServices(servicesData.services || []);
    setAppointments(appointmentsData.appointments || []);
    setAppointmentsPagination(appointmentsData.pagination || { page: 1, totalPages: 1 });
    setNotifications(notificationsData.notifications || []);
  };

  useEffect(() => {
    loadData().catch((err) => setError(err.message));
  }, [page, statusFilter, appointmentQuery]);

  useEffect(() => {
    if (!form.serviceId || !form.date) return;
    api
      .getSlots(form.serviceId, form.date)
      .then((data) => {
        setSlots(data.slots);
        setForm((current) => ({ ...current, time: data.slots[0]?.time || '' }));
      })
      .catch((err) => setError(err.message));
  }, [form.serviceId, form.date]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, appointmentQuery]);

  const exportAppointments = async () => {
    try {
      const csv = await api.exportMyAppointments({ status: statusFilter, q: appointmentQuery });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mes-rendez-vous.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const book = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const appointment = await api.createAppointment({
        serviceId: Number(form.serviceId),
        appointmentDate: form.date,
        appointmentTime: form.time,
        clientNote: form.clientNote
      });
      setMessage(appointment.message);
      setForm((current) => ({ ...current, clientNote: '', time: '' }));
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const cancel = async (id) => {
    try {
      await api.cancelAppointment(id);
      setMessage('Rendez-vous annulé.');
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <h2>Réserver un rendez-vous</h2>
        <form className="form" onSubmit={book}>
          <label>
            Service
            <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required>
              <option value="">Choisir un service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.price} €
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" min={formatDateInput()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </label>
          <div>
            <p className="muted">Créneaux disponibles</p>
            <SlotPicker slots={slots} value={form.time} onChange={(time) => setForm({ ...form, time })} />
          </div>
          <label>
            Note client
            <textarea maxLength={500} value={form.clientNote} onChange={(e) => setForm({ ...form, clientNote: e.target.value })} />
          </label>
          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
          <button className="primary-btn" type="submit" disabled={!form.time}>
            Réserver
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Notifications</h2>
            <p className="muted">Tes prochains rendez-vous et ceux qui demandent une action.</p>
          </div>
          <span className="status accepted">{notifications.length}</span>
        </div>
        <div className="list-stack">
          {notifications.length === 0 && <p className="muted">Aucune notification pour le moment.</p>}
          {notifications.map((appointment) => (
            <article key={`notification-${appointment.id}`} className="list-card notification-card">
              <strong>{appointment.serviceName}</strong>
              <span>
                {appointment.appointmentDate} - {appointment.appointmentTime.slice(0, 5)}
              </span>
              <span className={`status ${appointment.status}`}>{appointment.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Mes rendez-vous</h2>
            <p className="muted">Recherche et pagination sont maintenant gérées côté serveur.</p>
          </div>
          <div className="inline-actions">
            <label className="inline-filter">
              Filtre
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="accepted">Acceptés</option>
                <option value="refused">Refusés</option>
                <option value="cancelled">Annulés</option>
              </select>
            </label>
            <label className="inline-filter">
              Rechercher
              <input value={appointmentQuery} onChange={(event) => setAppointmentQuery(event.target.value)} placeholder="Service, note ou admin" />
            </label>
            <button className="secondary-btn" type="button" onClick={exportAppointments}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="list-stack">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="list-card">
              <strong>{appointment.serviceName}</strong>
              <span>
                {appointment.appointmentDate} - {appointment.appointmentTime.slice(0, 5)}
              </span>
              <span className={`status ${appointment.status}`}>{appointment.status}</span>
              {(appointment.status === 'pending' || appointment.status === 'accepted') && (
                <button className="secondary-btn" onClick={() => cancel(appointment.id)}>
                  Annuler
                </button>
              )}
            </article>
          ))}
        </div>
        <div className="pagination-row">
          <button className="secondary-btn" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            Précédent
          </button>
          <span className="muted">
            Page {appointmentsPagination.page || page} / {appointmentsPagination.totalPages || 1}
          </span>
          <button className="secondary-btn" type="button" onClick={() => setPage((current) => Math.min(appointmentsPagination.totalPages || 1, current + 1))} disabled={page >= (appointmentsPagination.totalPages || 1)}>
            Suivant
          </button>
        </div>
      </section>
    </div>
  );
}
