const { pool } = require('../config/db');
const { createError } = require('../utils/errors');
const { parsePagination, parseSearchQuery } = require('../utils/pagination');
const { addMinutesToTime, timeToMinutes } = require('../utils/time');
const { getServiceContext } = require('./availabilityService');

function mapAppointment(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    adminId: row.admin_id,
    adminName: row.admin_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    availabilityId: row.availability_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    appointmentEndTime: row.appointment_end_time,
    status: row.status,
    clientNote: row.client_note,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildPagedResult(rows, total, page, pageSize) {
  return {
    appointments: rows.map(mapAppointment),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

async function createAppointment(clientId, payload) {
  const { serviceId, appointmentDate, appointmentTime, clientNote } = payload;
  const service = await getServiceContext(serviceId);
  if (!service.is_active) {
    throw createError('Service inactif.', 400);
  }

  const appointmentEndTime = addMinutesToTime(appointmentTime, Number(service.duration_minutes));
  const dayOfWeek = new Date(`${appointmentDate}T00:00:00`).getDay() === 0 ? 7 : new Date(`${appointmentDate}T00:00:00`).getDay();

  const [availabilities] = await pool.query(
    `SELECT * FROM availabilities
     WHERE admin_id = ? AND day_of_week = ? AND is_active = 1`,
    [service.admin_id, dayOfWeek]
  );

  const allowed = availabilities.some((availability) => {
    const startsInside = timeToMinutes(appointmentTime) >= timeToMinutes(availability.start_time);
    const endsInside = timeToMinutes(appointmentEndTime) <= timeToMinutes(availability.end_time);
    return startsInside && endsInside;
  });

  if (!allowed) {
    throw createError('Créneau non disponible.', 400);
  }

  const matchedAvailability = availabilities.find((availability) => {
    const startsInside = timeToMinutes(appointmentTime) >= timeToMinutes(availability.start_time);
    const endsInside = timeToMinutes(appointmentEndTime) <= timeToMinutes(availability.end_time);
    return startsInside && endsInside;
  });

  if (!matchedAvailability) {
    throw createError('Créneau non disponible.', 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [overlap] = await connection.query(
      `SELECT id FROM appointments
       WHERE admin_id = ?
         AND appointment_date = ?
         AND status IN ('pending', 'accepted')
         AND appointment_time < ?
         AND appointment_end_time > ?
       LIMIT 1`,
      [service.admin_id, appointmentDate, appointmentEndTime, appointmentTime]
    );

    if (overlap.length > 0) {
      throw createError('Ce créneau est déjà réservé.', 409);
    }

    const [availabilityRows] = await connection.query(
      `SELECT id
       FROM availabilities
       WHERE admin_id = ? AND day_of_week = ? AND is_active = 1
       ORDER BY start_time ASC
       LIMIT 1`,
      [service.admin_id, dayOfWeek]
    );

    if (availabilityRows.length === 0) {
      throw createError('Aucune disponibilité pour cette date.', 400);
    }

    const [result] = await connection.query(
      `INSERT INTO appointments
        (client_id, admin_id, service_id, availability_id, appointment_date, appointment_time, appointment_end_time, status, client_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [clientId, service.admin_id, service.id, matchedAvailability.id, appointmentDate, appointmentTime, appointmentEndTime, clientNote || null]
    );

    await connection.commit();
    return getAppointmentById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getAppointmentById(appointmentId) {
  const [rows] = await pool.query(
    `SELECT a.*, 
            CONCAT(c.first_name, ' ', c.last_name) AS client_name,
            c.email AS client_email,
            CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name,
            s.name AS service_name
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId]
  );

  if (!rows[0]) {
    throw createError('Rendez-vous introuvable.', 404);
  }

  return mapAppointment(rows[0]);
}

async function listClientAppointments(clientId, options = {}) {
  const search = parseSearchQuery(options.q);
  const status = parseSearchQuery(options.status);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 8, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['a.client_id = ?'];
  const params = [clientId];

  if (status && status !== 'all') {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(s.name) LIKE ? OR LOWER(CONCAT(ad.first_name, " ", ad.last_name)) LIKE ? OR LOWER(COALESCE(a.client_note, "")) LIKE ? OR LOWER(COALESCE(a.admin_note, "")) LIKE ?)');
    params.push(like, like, like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM appointments a
     INNER JOIN users ad ON ad.id = a.admin_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT a.*, 
            CONCAT(c.first_name, ' ', c.last_name) AS client_name,
            c.email AS client_email,
            CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name,
            s.name AS service_name
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}
     ORDER BY a.appointment_date DESC, a.appointment_time DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return buildPagedResult(rows, Number(countRows[0]?.total || 0), page, pageSize);
}

async function cancelAppointment(clientId, appointmentId) {
  const [result] = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled'
     WHERE id = ? AND client_id = ? AND status IN ('pending', 'accepted')`,
    [appointmentId, clientId]
  );

  if (result.affectedRows === 0) {
    throw createError('Rendez-vous introuvable ou déjà annulé.', 404);
  }

  return getAppointmentById(appointmentId);
}

async function listAdminAppointmentsForDay(adminId, dateValue, options = {}) {
  const search = parseSearchQuery(options.q);
  const status = parseSearchQuery(options.status);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 10, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['a.admin_id = ?', 'a.appointment_date = ?'];
  const params = [adminId, dateValue];

  if (status && status !== 'all') {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(CONCAT(c.first_name, " ", c.last_name)) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(s.name) LIKE ?)');
    params.push(like, like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT a.*, 
            CONCAT(c.first_name, ' ', c.last_name) AS client_name,
            c.email AS client_email,
            CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name,
            s.name AS service_name
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}
     ORDER BY a.appointment_time ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return buildPagedResult(rows, Number(countRows[0]?.total || 0), page, pageSize);
}

async function listAdminAppointmentsForMonth(adminId, monthValue, options = {}) {
  const search = parseSearchQuery(options.q);
  const status = parseSearchQuery(options.status);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 20, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['a.admin_id = ?', "DATE_FORMAT(a.appointment_date, '%Y-%m') = ?"];
  const params = [adminId, monthValue];

  if (status && status !== 'all') {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(CONCAT(c.first_name, " ", c.last_name)) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(s.name) LIKE ?)');
    params.push(like, like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT a.*, 
            CONCAT(c.first_name, ' ', c.last_name) AS client_name,
            c.email AS client_email,
            CONCAT(ad.first_name, ' ', ad.last_name) AS admin_name,
            s.name AS service_name
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     INNER JOIN users ad ON ad.id = a.admin_id
     INNER JOIN services s ON s.id = a.service_id
     WHERE ${whereClause}
     ORDER BY a.appointment_date ASC, a.appointment_time ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return buildPagedResult(rows, Number(countRows[0]?.total || 0), page, pageSize);
}

async function setAppointmentStatus(adminId, appointmentId, status) {
  const [result] = await pool.query(
    `UPDATE appointments
     SET status = ?
     WHERE id = ? AND admin_id = ? AND status IN ('pending', 'accepted')`,
    [status, appointmentId, adminId]
  );

  if (result.affectedRows === 0) {
    throw createError('Rendez-vous introuvable ou déjà traité.', 404);
  }

  return getAppointmentById(appointmentId);
}

async function getAdminStatistics(adminId) {
  const [daily] = await pool.query(
    `SELECT appointment_date AS day, COUNT(*) AS total
     FROM appointments
     WHERE admin_id = ?
       AND appointment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY appointment_date
     ORDER BY appointment_date ASC`,
    [adminId]
  );

  const [monthly] = await pool.query(
    `SELECT DATE_FORMAT(appointment_date, '%Y-%m') AS month, COUNT(*) AS total
     FROM appointments
     WHERE admin_id = ?
     GROUP BY DATE_FORMAT(appointment_date, '%Y-%m')
     ORDER BY month ASC`,
    [adminId]
  );

  const [statusCounts] = await pool.query(
    `SELECT status, COUNT(*) AS total
     FROM appointments
     WHERE admin_id = ?
     GROUP BY status`,
    [adminId]
  );

  return {
    daily,
    monthly,
    statusCounts
  };
}

async function listAdminClients(adminId, options = {}) {
  const search = parseSearchQuery(options.q);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 10, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['a.admin_id = ?'];
  const params = [adminId];

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(c.first_name) LIKE ? OR LOWER(c.last_name) LIKE ? OR LOWER(c.email) LIKE ?)');
    params.push(like, like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT c.id) AS total
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.created_at, COUNT(a.id) AS appointment_count
     FROM appointments a
     INNER JOIN users c ON c.id = a.client_id
     WHERE ${whereClause}
     GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.created_at
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    clients: rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      createdAt: row.created_at,
      appointmentCount: Number(row.appointment_count || 0)
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

module.exports = {
  cancelAppointment,
  createAppointment,
  getAdminStatistics,
  listAdminAppointmentsForDay,
  listAdminAppointmentsForMonth,
  listAdminClients,
  listClientAppointments,
  setAppointmentStatus
};
