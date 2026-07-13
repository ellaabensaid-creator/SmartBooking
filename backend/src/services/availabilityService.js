const { pool } = require('../config/db');
const { createError } = require('../utils/errors');
const { generateAvailableSlots } = require('../utils/bookingRules');

function mapAvailability(row) {
  return {
    id: row.id,
    adminId: row.admin_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    slotDurationMinutes: row.slot_duration_minutes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listAdminAvailabilities(adminId) {
  const [rows] = await pool.query(
    `SELECT * FROM availabilities WHERE admin_id = ? ORDER BY day_of_week ASC, start_time ASC`,
    [adminId]
  );

  return rows.map(mapAvailability);
}

async function createAvailability(adminId, payload) {
  const [result] = await pool.query(
    `INSERT INTO availabilities (admin_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, payload.dayOfWeek, payload.startTime, payload.endTime, payload.slotDurationMinutes, payload.isActive ? 1 : 0]
  );

  return getAvailabilityById(adminId, result.insertId);
}

async function updateAvailability(adminId, availabilityId, payload) {
  const [existing] = await pool.query('SELECT id FROM availabilities WHERE id = ? AND admin_id = ?', [availabilityId, adminId]);
  if (existing.length === 0) {
    throw createError('Disponibilité introuvable.', 404);
  }

  const fields = [];
  const values = [];

  for (const [key, column] of [
    ['dayOfWeek', 'day_of_week'],
    ['startTime', 'start_time'],
    ['endTime', 'end_time'],
    ['slotDurationMinutes', 'slot_duration_minutes'],
    ['isActive', 'is_active']
  ]) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(key === 'isActive' ? (payload[key] ? 1 : 0) : payload[key]);
    }
  }

  if (fields.length === 0) {
    return getAvailabilityById(adminId, availabilityId);
  }

  values.push(availabilityId, adminId);
  await pool.query(`UPDATE availabilities SET ${fields.join(', ')} WHERE id = ? AND admin_id = ?`, values);
  return getAvailabilityById(adminId, availabilityId);
}

async function deleteAvailability(adminId, availabilityId) {
  const [result] = await pool.query('DELETE FROM availabilities WHERE id = ? AND admin_id = ?', [availabilityId, adminId]);
  if (result.affectedRows === 0) {
    throw createError('Disponibilité introuvable.', 404);
  }
}

async function getAvailabilityById(adminId, availabilityId) {
  const [rows] = await pool.query('SELECT * FROM availabilities WHERE id = ? AND admin_id = ?', [availabilityId, adminId]);
  if (!rows[0]) {
    throw createError('Disponibilité introuvable.', 404);
  }
  return mapAvailability(rows[0]);
}

async function getServiceContext(serviceId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.admin_id, s.duration_minutes, s.name, s.is_active, u.first_name, u.last_name
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE s.id = ?
     LIMIT 1`,
    [serviceId]
  );

  if (!rows[0]) {
    throw createError('Service introuvable.', 404);
  }

  return rows[0];
}

function getDayOfWeek(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

async function getAvailableSlots(serviceId, dateValue) {
  const service = await getServiceContext(serviceId);
  const dayOfWeek = getDayOfWeek(dateValue);

  const [availabilities] = await pool.query(
    `SELECT * FROM availabilities
     WHERE admin_id = ? AND day_of_week = ? AND is_active = 1
     ORDER BY start_time ASC`,
    [service.admin_id, dayOfWeek]
  );

  if (availabilities.length === 0) {
    return [];
  }

  const [appointments] = await pool.query(
    `SELECT appointment_time, appointment_end_time
     FROM appointments
     WHERE admin_id = ?
       AND appointment_date = ?
       AND status IN ('pending', 'accepted')`,
    [service.admin_id, dateValue]
  );

  const busyRanges = appointments.map((appointment) => ({
    start: appointment.appointment_time,
    end: appointment.appointment_end_time
  }));

  return generateAvailableSlots({
    serviceId: service.id,
    adminId: service.admin_id,
    serviceName: service.name,
    serviceDurationMinutes: Number(service.duration_minutes),
    availabilities,
    busyRanges
  });
}

module.exports = {
  createAvailability,
  deleteAvailability,
  getAvailableSlots,
  getServiceContext,
  listAdminAvailabilities,
  updateAvailability
};
