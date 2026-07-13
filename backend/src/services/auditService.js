const { pool } = require('../config/db');
const { createError } = require('../utils/errors');

function mapAuditLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    metadata: row.metadata ? safeJsonParse(row.metadata) : null,
    createdAt: row.created_at
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function logAudit({ actorUserId, actorRole, action, entityType, entityId = null, summary, metadata = null }) {
  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, summary, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)` ,
    [actorUserId, actorRole, action, entityType, entityId, summary, metadata ? JSON.stringify(metadata) : null]
  );
}

async function listAuditLogs(actorUserId, options = {}) {
  const page = Math.max(Number.parseInt(String(options.page || 1), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(options.pageSize || 10), 10) || 10, 1), 100);
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs WHERE actor_user_id = ?`,
    [actorUserId]
  );

  const [rows] = await pool.query(
    `SELECT *
     FROM audit_logs
     WHERE actor_user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [actorUserId, pageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    logs: rows.map(mapAuditLog),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

module.exports = {
  listAuditLogs,
  logAudit
};