const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function toQueryString(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) {
    return '';
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.set(key, String(value));
  }

  return `?${searchParams.toString()}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('smartbooking_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }

  return data;
}

async function requestText(path, options = {}) {
  const token = localStorage.getItem('smartbooking_token');
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  if (!response.ok) {
    let message = 'Une erreur est survenue.';
    try {
      const data = JSON.parse(text);
      message = data.message || message;
    } catch {
      message = text || message;
    }

    throw new Error(message);
  }

  return text;
}

export const api = {
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  meHistory: () => request('/auth/me/history'),
  updateMe: (payload) => request('/auth/me', { method: 'PUT', body: JSON.stringify(payload) }),
  requestPasswordReset: (payload) => request('/auth/password-reset/request', { method: 'POST', body: JSON.stringify(payload) }),
  confirmPasswordReset: (payload) => request('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify(payload) }),
  getServices: (query = {}) => request(`/services${toQueryString(query)}`),
  getSlots: (serviceId, date) => request(`/availabilities/slots?serviceId=${serviceId}&date=${date}`),
  getMyAppointments: (query = {}) => request(`/appointments/my${toQueryString(query)}`),
  createAppointment: (payload) => request('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  cancelAppointment: (id) => request(`/appointments/${id}/cancel`, { method: 'PATCH' }),
  exportMyAppointments: (query = {}) => requestText(`/appointments/my/export${toQueryString(query)}`),
  getAdminServices: (query = {}) => request(`/services/admin${toQueryString(query)}`),
  exportAdminServices: (query = {}) => requestText(`/services/admin/export${toQueryString(query)}`),
  createService: (payload) => request('/services/admin', { method: 'POST', body: JSON.stringify(payload) }),
  updateService: (id, payload) => request(`/services/admin/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteService: (id) => request(`/services/admin/${id}`, { method: 'DELETE' }),
  getAdminAvailabilities: () => request('/availabilities'),
  createAvailability: (payload) => request('/availabilities/admin', { method: 'POST', body: JSON.stringify(payload) }),
  updateAvailability: (id, payload) => request(`/availabilities/admin/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAvailability: (id) => request(`/availabilities/admin/${id}`, { method: 'DELETE' }),
  getAdminDayAppointments: (date, query = {}) => request(`/appointments/admin/day${toQueryString({ date, ...query })}`),
  getAdminMonthAppointments: (month, query = {}) => request(`/appointments/admin/month${toQueryString({ month, ...query })}`),
  exportAdminAppointments: (query = {}) => requestText(`/appointments/admin/export${toQueryString(query)}`),
  acceptAppointment: (id) => request(`/appointments/admin/${id}/accept`, { method: 'PATCH' }),
  refuseAppointment: (id) => request(`/appointments/admin/${id}/refuse`, { method: 'PATCH' }),
  getAdminStats: () => request('/appointments/admin/statistics'),
  getAdminClients: (query = {}) => request(`/appointments/admin/clients${toQueryString(query)}`),
  getNotifications: (query = {}) => request(`/notifications/me${toQueryString(query)}`),
  readNotification: (id) => request(`/notifications/me/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => request('/notifications/me/read-all', { method: 'PATCH' }),
  getAuditLogs: (query = {}) => request(`/audit/me${toQueryString(query)}`),
  getAppointmentIntegration: (id) => request(`/integrations/appointments/${id}`),
  getAppointmentCalendar: (id) => requestText(`/integrations/appointments/${id}/calendar.ics`)
};
