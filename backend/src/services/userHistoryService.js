const { pool } = require('../config/db');

function mapAppointmentSummary(row) {
  return {
    id: row.id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    appointmentEndTime: row.appointment_end_time,
    status: row.status,
    serviceName: row.service_name,
    adminName: row.admin_name,
    clientName: row.client_name,
    clientNote: row.client_note,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNotificationSummary(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    channel: row.channel,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at
  };
}

function mapAuditSummary(row) {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    createdAt: row.created_at
  };
}

async function getUserHistory(userId, role) {
  const appointmentPredicate = role === 'admin' ? 'a.admin_id = ?' : 'a.client_id = ?';
  const participantJoin = role === 'admin'
    ? `CONCAT(c.first_name, ' ', c.last_name) AS client_name, CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name`
    : `CONCAT(c.first_name, ' ', c.last_name) AS client_name, CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name`;

  const [appointmentRows] = await pool.query(
    `SELECT a.*, s.name AS service_name, ${participantJoin}
     FROM appointments a
     INNER JOIN services s ON s.id = a.service_id
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     WHERE ${appointmentPredicate}
     ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT 20`,
    [userId]
  );

  const [notificationRows] = await pool.query(
    `SELECT * FROM notifications
     WHERE user_id = ? AND channel = 'in_app'
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  const [auditRows] = await pool.query(
    `SELECT * FROM audit_logs
     WHERE actor_user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  const [statsRows] = await pool.query(
    `SELECT status, COUNT(*) AS total
     FROM appointments
     WHERE ${appointmentPredicate}
     GROUP BY status`,
    [userId]
  );

  return {
    recentAppointments: appointmentRows.map(mapAppointmentSummary),
    notifications: notificationRows.map(mapNotificationSummary),
    auditLogs: role === 'admin' ? auditRows.map(mapAuditSummary) : [],
    summary: statsRows.reduce((accumulator, item) => {
      accumulator[item.status] = Number(item.total);
      return accumulator;
    }, {})
  };
}

module.exports = {
  getUserHistory
};