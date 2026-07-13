import { useEffect, useState } from 'react';
import { api } from '../api/client';
import EditModal from '../components/EditModal';

function initialServiceForm() {
  return { name: '', description: '', durationMinutes: 30, price: 0, isActive: true };
}

function initialAvailabilityForm() {
  return { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30, isActive: true };
}

function initialEditState() {
  return {
    open: false,
    type: null,
    id: null,
    values: null
  };
}

export default function AdminDashboard() {
  const [services, setServices] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [dayPagination, setDayPagination] = useState({ page: 1, totalPages: 1 });
  const [monthAppointments, setMonthAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientPagination, setClientPagination] = useState({ page: 1, totalPages: 1 });
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ daily: [], monthly: [], statusCounts: [] });
  const [serviceForm, setServiceForm] = useState(initialServiceForm());
  const [availabilityForm, setAvailabilityForm] = useState(initialAvailabilityForm());
  const [editState, setEditState] = useState(initialEditState());
  const [dayStatusFilter, setDayStatusFilter] = useState('all');
  const [dayQuery, setDayQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [dayPage, setDayPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const pageSize = 5;

  const loadAll = async () => {
    const [servicesData, availabilitiesData, dayData, monthData, statsData, clientsData] = await Promise.all([
      api.getAdminServices(),
      api.getAdminAvailabilities(),
      api.getAdminDayAppointments(date, { status: dayStatusFilter, q: dayQuery, page: dayPage, pageSize }),
      api.getAdminMonthAppointments(month, { page: 1, pageSize: 100 }),
      api.getAdminStats(),
      api.getAdminClients({ q: clientQuery, page: clientPage, pageSize })
    ]);

    setServices(servicesData.services);
    setAvailabilities(availabilitiesData.availabilities);
    setDayAppointments(dayData.appointments || []);
    setDayPagination(dayData.pagination || { page: 1, totalPages: 1 });
    setMonthAppointments(monthData.appointments);
    setStats(statsData.stats);
    setClients(clientsData.clients || []);
    setClientPagination(clientsData.pagination || { page: 1, totalPages: 1 });
    const notificationsData = await api.getNotifications({ page: 1, pageSize: 5 });
    setNotifications(notificationsData.notifications || []);
  };

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
  }, [date, month, dayPage, clientPage, dayStatusFilter, dayQuery, clientQuery]);

  useEffect(() => {
    setDayPage(1);
  }, [date, dayStatusFilter, dayQuery]);

  useEffect(() => {
    setClientPage(1);
  }, [clientQuery]);

  const exportDayAppointments = async () => {
    try {
      const csv = await api.exportAdminAppointments({ date, status: dayStatusFilter, q: dayQuery });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'planning-admin.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const exportServices = async () => {
    try {
      const csv = await api.exportAdminServices();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'services-admin.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const createService = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.createService({
        name: serviceForm.name,
        description: serviceForm.description,
        durationMinutes: Number(serviceForm.durationMinutes),
        price: Number(serviceForm.price),
        isActive: Boolean(serviceForm.isActive)
      });
      setServiceForm(initialServiceForm());
      setMessage('Service créé.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const createAvailability = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.createAvailability({
        dayOfWeek: Number(availabilityForm.dayOfWeek),
        startTime: `${availabilityForm.startTime}:00`,
        endTime: `${availabilityForm.endTime}:00`,
        slotDurationMinutes: Number(availabilityForm.slotDurationMinutes),
        isActive: Boolean(availabilityForm.isActive)
      });
      setAvailabilityForm(initialAvailabilityForm());
      setMessage('Disponibilité créée.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const editService = (service) => {
    setMessage('');
    setError('');
    setEditState({
      open: true,
      type: 'service',
      id: service.id,
      values: {
        name: service.name,
        description: service.description || '',
        durationMinutes: service.durationMinutes,
        price: service.price,
        isActive: service.isActive
      }
    });
  };

  const editAvailability = (availability) => {
    setMessage('');
    setError('');
    setEditState({
      open: true,
      type: 'availability',
      id: availability.id,
      values: {
        dayOfWeek: availability.dayOfWeek,
        startTime: availability.startTime.slice(0, 5),
        endTime: availability.endTime.slice(0, 5),
        slotDurationMinutes: availability.slotDurationMinutes,
        isActive: availability.isActive
      }
    });
  };

  const closeEditModal = () => setEditState(initialEditState());

  const saveEdit = async () => {
    setError('');
    setMessage('');

    try {
      if (editState.type === 'service') {
        await api.updateService(editState.id, {
          name: editState.values.name,
          description: editState.values.description,
          durationMinutes: Number(editState.values.durationMinutes),
          price: Number(editState.values.price),
          isActive: Boolean(editState.values.isActive)
        });
        setMessage('Service mis à jour.');
      }

      if (editState.type === 'availability') {
        await api.updateAvailability(editState.id, {
          dayOfWeek: Number(editState.values.dayOfWeek),
          startTime: `${editState.values.startTime}:00`,
          endTime: `${editState.values.endTime}:00`,
          slotDurationMinutes: Number(editState.values.slotDurationMinutes),
          isActive: Boolean(editState.values.isActive)
        });
        setMessage('Disponibilité mise à jour.');
      }

      closeEditModal();
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleServiceAction = async (id, action) => {
    try {
      if (action === 'delete') {
        await api.deleteService(id);
        setMessage('Service supprimé.');
      }
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAvailabilityAction = async (id, action) => {
    try {
      if (action === 'delete') {
        await api.deleteAvailability(id);
        setMessage('Disponibilité supprimée.');
      }
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAppointment = async (id, action) => {
    try {
      if (action === 'accept') await api.acceptAppointment(id);
      if (action === 'refuse') await api.refuseAppointment(id);
      setMessage(`Rendez-vous ${action === 'accept' ? 'accepté' : 'refusé'}.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const dayTotalPages = dayPagination.totalPages || 1;
  const clientTotalPages = clientPagination.totalPages || 1;

  return (
    <div className="stacked-layout">
      <section className="stats-row">
        <div className="panel stat-card"><strong>{stats.statusCounts?.find((item) => item.status === 'pending')?.total || 0}</strong><span>En attente</span></div>
        <div className="panel stat-card"><strong>{stats.statusCounts?.find((item) => item.status === 'accepted')?.total || 0}</strong><span>Acceptés</span></div>
        <div className="panel stat-card"><strong>{stats.statusCounts?.find((item) => item.status === 'cancelled')?.total || 0}</strong><span>Annulés</span></div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Notifications</h2>
            <p className="muted">Rendez-vous en attente à traiter en priorité.</p>
          </div>
          <span className="status pending">{notifications.length}</span>
        </div>
        <div className="list-stack">
          {notifications.length === 0 && <p className="muted">Aucune notification.</p>}
          {notifications.map((appointment) => (
            <article key={`admin-notification-${appointment.id}`} className="list-card notification-card">
              <strong>{appointment.clientName} - {appointment.serviceName}</strong>
              <span>{appointment.appointmentDate} à {appointment.appointmentTime.slice(0, 5)}</span>
              <span className="status pending">En attente</span>
            </article>
          ))}
        </div>
      </section>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <section className="dashboard-grid">
        <div className="panel">
          <div className="section-header">
            <h2>Créer un service</h2>
            <button className="secondary-btn" type="button" onClick={exportServices}>Exporter</button>
          </div>
          <form className="form" onSubmit={createService}>
            <label>Nom<input minLength={2} maxLength={150} value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /></label>
            <label>Description<textarea maxLength={1000} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></label>
            <div className="two-cols">
              <label>Durée (min)<input type="number" min={5} value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })} required /></label>
              <label>Prix<input type="number" min={0} step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} required /></label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={serviceForm.isActive} onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })} />
              Actif
            </label>
            <button className="primary-btn" type="submit">Ajouter</button>
          </form>
          <div className="list-stack">
            {services.map((service) => (
              <article key={service.id} className="list-card">
                <strong>{service.name}</strong>
                <span>{service.durationMinutes} min - {service.price} €</span>
                <span className={`status ${service.isActive ? 'accepted' : 'cancelled'}`}>{service.isActive ? 'actif' : 'inactif'}</span>
                <div className="inline-actions">
                  <button className="primary-btn" type="button" onClick={() => editService(service)}>Modifier</button>
                  <button className="secondary-btn" type="button" onClick={() => handleServiceAction(service.id, 'delete')}>Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Créer une disponibilité</h2>
          <form className="form" onSubmit={createAvailability}>
            <label>Jour de semaine
              <select value={availabilityForm.dayOfWeek} onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: Number(e.target.value) })}>
                <option value={1}>Lundi</option>
                <option value={2}>Mardi</option>
                <option value={3}>Mercredi</option>
                <option value={4}>Jeudi</option>
                <option value={5}>Vendredi</option>
                <option value={6}>Samedi</option>
                <option value={7}>Dimanche</option>
              </select>
            </label>
            <div className="two-cols">
              <label>Début<input type="time" value={availabilityForm.startTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })} required /></label>
              <label>Fin<input type="time" value={availabilityForm.endTime} onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })} required /></label>
            </div>
            <label>Pas de créneau (min)<input type="number" min={5} value={availabilityForm.slotDurationMinutes} onChange={(e) => setAvailabilityForm({ ...availabilityForm, slotDurationMinutes: Number(e.target.value) })} required /></label>
            <label className="checkbox-row">
              <input type="checkbox" checked={availabilityForm.isActive} onChange={(e) => setAvailabilityForm({ ...availabilityForm, isActive: e.target.checked })} />
              Active
            </label>
            <button className="primary-btn" type="submit">Ajouter</button>
          </form>
          <div className="list-stack">
            {availabilities.map((availability) => (
              <article key={availability.id} className="list-card">
                <strong>Jour {availability.dayOfWeek}</strong>
                <span>{availability.startTime.slice(0, 5)} - {availability.endTime.slice(0, 5)}</span>
                <span className={`status ${availability.isActive ? 'accepted' : 'cancelled'}`}>{availability.isActive ? 'active' : 'inactive'}</span>
                <div className="inline-actions">
                  <button className="primary-btn" type="button" onClick={() => editAvailability(availability)}>Modifier</button>
                  <button className="secondary-btn" type="button" onClick={() => handleAvailabilityAction(availability.id, 'delete')}>Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Planning journalier</h2>
          <div className="inline-actions">
            <label className="inline-filter">
              Statut
              <select value={dayStatusFilter} onChange={(event) => setDayStatusFilter(event.target.value)}>
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="accepted">Acceptés</option>
                <option value="refused">Refusés</option>
                <option value="cancelled">Annulés</option>
              </select>
            </label>
            <label className="inline-filter">
              Rechercher
              <input value={dayQuery} onChange={(event) => setDayQuery(event.target.value)} placeholder="Client ou service" />
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="secondary-btn" type="button" onClick={exportDayAppointments}>Exporter</button>
          </div>
        </div>
        <div className="list-stack">
          {dayAppointments.map((appointment) => (
            <article key={appointment.id} className="list-card">
              <strong>{appointment.clientName} - {appointment.serviceName}</strong>
              <span>{appointment.appointmentTime.slice(0, 5)} - {appointment.status}</span>
              <div className="inline-actions">
                <button className="primary-btn" type="button" onClick={() => handleAppointment(appointment.id, 'accept')}>Accepter</button>
                <button className="secondary-btn" type="button" onClick={() => handleAppointment(appointment.id, 'refuse')}>Refuser</button>
              </div>
            </article>
          ))}
        </div>
        <div className="pagination-row">
          <button className="secondary-btn" type="button" onClick={() => setDayPage((current) => Math.max(1, current - 1))} disabled={dayPage === 1}>
            Précédent
          </button>
          <span className="muted">Page {dayPagination.page || dayPage} / {dayTotalPages}</span>
          <button className="secondary-btn" type="button" onClick={() => setDayPage((current) => Math.min(dayTotalPages, current + 1))} disabled={dayPage >= dayTotalPages}>
            Suivant
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Planning mensuel</h2>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="list-stack">
          {monthAppointments.map((appointment) => (
            <article key={appointment.id} className="list-card">
              <strong>{appointment.appointmentDate} - {appointment.clientName}</strong>
              <span>{appointment.serviceName} - {appointment.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <h2>Statistiques</h2>
          <div className="list-stack">
            {stats.daily?.map((item) => <div key={item.day} className="list-card"><strong>{item.day}</strong><span>{item.total} RDV</span></div>)}
          </div>
        </div>
        <div className="panel">
          <div className="section-header">
            <h2>Clients</h2>
            <label className="inline-filter">
              Rechercher
              <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Nom ou email" />
            </label>
          </div>
          <div className="list-stack">
            {clients.map((client) => (
              <div key={client.id} className="list-card">
                <strong>{client.firstName} {client.lastName}</strong>
                <span>{client.email}</span>
                <span className="muted">{client.appointmentCount} rendez-vous</span>
              </div>
            ))}
          </div>
          <div className="pagination-row">
            <button className="secondary-btn" type="button" onClick={() => setClientPage((current) => Math.max(1, current - 1))} disabled={clientPage === 1}>
              Précédent
            </button>
            <span className="muted">Page {clientPagination.page || clientPage} / {clientTotalPages}</span>
            <button className="secondary-btn" type="button" onClick={() => setClientPage((current) => Math.min(clientTotalPages, current + 1))} disabled={clientPage >= clientTotalPages}>
              Suivant
            </button>
          </div>
        </div>
      </section>

      <EditModal
        open={editState.open}
        title={editState.type === 'service' ? 'Modifier le service' : 'Modifier la disponibilité'}
        onClose={closeEditModal}
        onSave={saveEdit}
        saveLabel="Enregistrer les modifications"
      >
        {editState.type === 'service' && editState.values && (
          <form className="form" onSubmit={(event) => { event.preventDefault(); saveEdit(); }}>
            <label>Nom
              <input minLength={2} maxLength={150} value={editState.values.name} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, name: event.target.value } })} required />
            </label>
            <label>Description
              <textarea maxLength={1000} value={editState.values.description} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, description: event.target.value } })} />
            </label>
            <div className="two-cols">
              <label>Durée (min)
                <input type="number" min={5} value={editState.values.durationMinutes} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, durationMinutes: Number(event.target.value) } })} required />
              </label>
              <label>Prix
                <input type="number" min={0} step="0.01" value={editState.values.price} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, price: Number(event.target.value) } })} required />
              </label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" checked={editState.values.isActive} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, isActive: event.target.checked } })} />
              Actif
            </label>
          </form>
        )}

        {editState.type === 'availability' && editState.values && (
          <form className="form" onSubmit={(event) => { event.preventDefault(); saveEdit(); }}>
            <label>Jour de semaine
              <select value={editState.values.dayOfWeek} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, dayOfWeek: Number(event.target.value) } })}>
                <option value={1}>Lundi</option>
                <option value={2}>Mardi</option>
                <option value={3}>Mercredi</option>
                <option value={4}>Jeudi</option>
                <option value={5}>Vendredi</option>
                <option value={6}>Samedi</option>
                <option value={7}>Dimanche</option>
              </select>
            </label>
            <div className="two-cols">
              <label>Début
                <input type="time" value={editState.values.startTime} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, startTime: event.target.value } })} required />
              </label>
              <label>Fin
                <input type="time" value={editState.values.endTime} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, endTime: event.target.value } })} required />
              </label>
            </div>
            <label>Pas de créneau (min)
              <input type="number" min={5} value={editState.values.slotDurationMinutes} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, slotDurationMinutes: Number(event.target.value) } })} required />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={editState.values.isActive} onChange={(event) => setEditState({ ...editState, values: { ...editState.values, isActive: event.target.checked } })} />
              Active
            </label>
          </form>
        )}
      </EditModal>
    </div>
  );
}
