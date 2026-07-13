const { pool } = require('../config/db');
const { env } = require('../config/env');
const { createError } = require('../utils/errors');

let nodemailer = null;
let twilio = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

try {
  twilio = require('twilio');
} catch {
  twilio = null;
}

let emailTransport = null;
let smsClient = null;

function getEmailTransport() {
  if (!nodemailer || !env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  if (!emailTransport) {
    emailTransport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }

  return emailTransport;
}

function getSmsClient() {
  if (!twilio || !env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber) {
    return null;
  }

  if (!smsClient) {
    smsClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }

  return smsClient;
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedType: row.related_type,
    relatedId: row.related_id,
    isRead: Boolean(row.is_read),
    deliveryStatus: row.delivery_status,
    deliveryError: row.delivery_error,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function sendEmailNotification(to, title, message) {
  const transport = getEmailTransport();
  if (!transport || !to) {
    return false;
  }

  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject: title,
    text: message
  });

  return true;
}

async function sendSmsNotification(to, message) {
  const client = getSmsClient();
  if (!client || !to) {
    return false;
  }

  await client.messages.create({
    from: env.twilioFromNumber,
    to,
    body: message
  });

  return true;
}

async function createNotification({ userId, type, title, message, relatedType = null, relatedId = null, email = null, phone = null }) {
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, channel, type, title, message, related_type, related_id, is_read, delivery_status)
     VALUES (?, 'in_app', ?, ?, ?, ?, ?, 0, 'queued')`,
    [userId, type, title, message, relatedType, relatedId]
  );

  const notificationId = result.insertId;
  let deliveryStatus = 'sent';
  let deliveryError = null;
  const attempts = [];

  if (email && getEmailTransport()) {
    attempts.push(sendEmailNotification(email, title, message));
  }

  if (phone && getSmsClient()) {
    attempts.push(sendSmsNotification(phone, `${title}\n${message}`));
  }

  if (attempts.length > 0) {
    const results = await Promise.allSettled(attempts);
    const hasFailure = results.some((result) => result.status === 'rejected');
    if (hasFailure) {
      deliveryStatus = 'failed';
      deliveryError = results.find((result) => result.status === 'rejected')?.reason?.message || 'Échec de l\'envoi.';
    }
  }

  await pool.query(
    `UPDATE notifications
     SET delivery_status = ?, delivery_error = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END
     WHERE id = ?`,
    [deliveryStatus, deliveryError, deliveryStatus, notificationId]
  );

  return getNotificationById(notificationId);
}

async function getNotificationById(id) {
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) {
    throw createError('Notification introuvable.', 404);
  }

  return mapNotification(rows[0]);
}

async function listUserNotifications(userId, options = {}) {
  const page = Math.max(Number.parseInt(String(options.page || 1), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(options.pageSize || 10), 10) || 10, 1), 100);
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread_total
     FROM notifications
     WHERE user_id = ? AND channel = 'in_app'`,
    [userId]
  );

  const [rows] = await pool.query(
    `SELECT *
     FROM notifications
     WHERE user_id = ? AND channel = 'in_app'
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );

  const total = Number(countRows[0]?.total || 0);
  return {
    notifications: rows.map(mapNotification),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    },
    unreadTotal: Number(countRows[0]?.unread_total || 0)
  };
}

async function markNotificationRead(userId, notificationId) {
  const [result] = await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  if (result.affectedRows === 0) {
    throw createError('Notification introuvable.', 404);
  }

  return getNotificationById(notificationId);
}

async function markAllNotificationsRead(userId) {
  await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
  return listUserNotifications(userId, { page: 1, pageSize: 10 });
}

module.exports = {
  createNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead
};