const { pool } = require('../config/db');
const { env } = require('../config/env');
const { createError } = require('../utils/errors');

function formatDateTime(dateValue, timeValue) {
  return `${dateValue}T${String(timeValue).slice(0, 8).replace(':', '')}`;
}

function buildIcs({ appointmentId, serviceName, adminName, clientName, appointmentDate, appointmentTime, appointmentEndTime }) {
  const start = String(appointmentDate).replace(/-/g, '') + 'T' + String(appointmentTime).slice(0, 8).replace(/:/g, '');
  const end = String(appointmentDate).replace(/-/g, '') + 'T' + String(appointmentEndTime).slice(0, 8).replace(/:/g, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SmartBooking//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:smartbooking-${appointmentId}@local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${serviceName}`,
    `DESCRIPTION:Client: ${clientName}\\nAdmin: ${adminName}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

async function getAppointmentIntegration(appointmentId) {
  const [rows] = await pool.query(
    `SELECT a.*, s.name AS service_name, s.price, CONCAT(c.first_name, ' ', c.last_name) AS client_name,
            CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId]
  );

  if (!rows[0]) {
    throw createError('Rendez-vous introuvable.', 404);
  }

  const appointment = rows[0];
  const checkoutUrl = `${env.appPublicUrl}/checkout?appointmentId=${appointment.id}`;
  const calendarUrl = `${env.appPublicUrl}/api/integrations/appointments/${appointment.id}/calendar.ics`;

  await pool.query(
    `INSERT INTO payment_transactions (appointment_id, provider, amount, currency, status, checkout_url)
     VALUES (?, ?, ?, 'EUR', 'pending', ?)
     ON DUPLICATE KEY UPDATE provider = VALUES(provider), amount = VALUES(amount), checkout_url = VALUES(checkout_url), updated_at = CURRENT_TIMESTAMP`,
    [appointment.id, env.paymentProvider, appointment.price, checkoutUrl]
  );

  await pool.query(
    `INSERT INTO calendar_syncs (appointment_id, provider, calendar_uid, sync_url, status)
     VALUES (?, ?, ?, ?, 'synced')
     ON DUPLICATE KEY UPDATE provider = VALUES(provider), calendar_uid = VALUES(calendar_uid), sync_url = VALUES(sync_url), status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
    [appointment.id, env.calendarProvider, `smartbooking-${appointment.id}`, calendarUrl]
  );

  const ics = buildIcs(appointment);
  return {
    appointmentId: appointment.id,
    payment: {
      provider: env.paymentProvider,
      amount: Number(appointment.price),
      currency: 'EUR',
      checkoutUrl
    },
    calendar: {
      provider: env.calendarProvider,
      syncUrl: calendarUrl,
      ics
    }
  };
}

module.exports = {
  buildIcs,
  getAppointmentIntegration
};