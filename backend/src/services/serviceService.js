const { pool } = require('../config/db');
const { createError } = require('../utils/errors');
const { parsePagination, parseSearchQuery } = require('../utils/pagination');

function mapService(row) {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: Number(row.price),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listPublicServices(options = {}) {
  const search = parseSearchQuery(options.q);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 24, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['s.is_active = 1'];
  const params = [];

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(s.name) LIKE ? OR LOWER(COALESCE(s.description, "")) LIKE ? OR LOWER(CONCAT(u.first_name, " ", u.last_name)) LIKE ?)');
    params.push(like, like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT s.*, u.first_name AS admin_first_name, u.last_name AS admin_last_name
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    services: rows.map((row) => ({
      ...mapService({
        ...row,
        admin_name: `${row.admin_first_name} ${row.admin_last_name}`
      })
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

async function getServiceById(id) {
  const [rows] = await pool.query(
    `SELECT s.*, u.first_name AS admin_first_name, u.last_name AS admin_last_name
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE s.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    throw createError('Service introuvable.', 404);
  }

  const row = rows[0];
  return mapService({ ...row, admin_name: `${row.admin_first_name} ${row.admin_last_name}` });
}

async function listAdminServices(adminId, options = {}) {
  const search = parseSearchQuery(options.q);
  const { page, pageSize, offset } = parsePagination(options, { page: 1, pageSize: 20, maxPageSize: options.maxPageSize || 100 });
  const conditions = ['s.admin_id = ?'];
  const params = [adminId];

  if (search) {
    const like = `%${search.toLowerCase()}%`;
    conditions.push('(LOWER(s.name) LIKE ? OR LOWER(COALESCE(s.description, "")) LIKE ?)');
    params.push(like, like);
  }

  const whereClause = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT s.*, u.first_name AS admin_first_name, u.last_name AS admin_last_name
     FROM services s
     INNER JOIN users u ON u.id = s.admin_id
     WHERE ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    services: rows.map((row) => mapService({ ...row, admin_name: `${row.admin_first_name} ${row.admin_last_name}` })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

async function createService(adminId, payload) {
  const { name, description, durationMinutes, price, isActive = true } = payload;
  const [result] = await pool.query(
    `INSERT INTO services (admin_id, name, description, duration_minutes, price, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, name, description || null, durationMinutes, price, isActive ? 1 : 0]
  );

  return getServiceById(result.insertId);
}

async function updateService(adminId, serviceId, payload) {
  const [existing] = await pool.query('SELECT id FROM services WHERE id = ? AND admin_id = ?', [serviceId, adminId]);
  if (existing.length === 0) {
    throw createError('Service introuvable.', 404);
  }

  const fields = [];
  const values = [];

  for (const [key, column] of [
    ['name', 'name'],
    ['description', 'description'],
    ['durationMinutes', 'duration_minutes'],
    ['price', 'price'],
    ['isActive', 'is_active']
  ]) {
    if (payload[key] !== undefined) {
      fields.push(`${column} = ?`);
      values.push(key === 'isActive' ? (payload[key] ? 1 : 0) : payload[key]);
    }
  }

  if (fields.length === 0) {
    return getServiceById(serviceId);
  }

  values.push(serviceId, adminId);
  await pool.query(`UPDATE services SET ${fields.join(', ')} WHERE id = ? AND admin_id = ?`, values);
  return getServiceById(serviceId);
}

async function deleteService(adminId, serviceId) {
  const [result] = await pool.query('DELETE FROM services WHERE id = ? AND admin_id = ?', [serviceId, adminId]);
  if (result.affectedRows === 0) {
    throw createError('Service introuvable.', 404);
  }
}

module.exports = {
  createService,
  deleteService,
  getServiceById,
  listAdminServices,
  listPublicServices,
  updateService
};
