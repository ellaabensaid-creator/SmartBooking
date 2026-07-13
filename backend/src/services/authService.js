const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { env } = require('../config/env');
const { createError } = require('../utils/errors');
const { signToken } = require('../utils/jwt');

async function getRoleId(roleName) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE name = ?', [roleName]);
  return rows[0] ? rows[0].id : null;
}

async function register({ firstName, lastName, email, phone, password, role = 'client', adminCode }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRole = String(role).trim().toLowerCase();

  if (!['client', 'admin'].includes(normalizedRole)) {
    throw createError('Rôle invalide.', 400);
  }

  if (normalizedRole === 'admin' && adminCode !== env.adminRegistrationCode) {
    throw createError('Code administrateur invalide.', 403);
  }

  const roleId = await getRoleId(normalizedRole);
  if (!roleId) {
    throw createError('Rôle introuvable.', 500);
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing.length > 0) {
    throw createError('Cet email est déjà utilisé.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO users (role_id, first_name, last_name, email, phone, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roleId, firstName, lastName, normalizedEmail, phone || null, passwordHash]
  );

  const user = await getUserById(result.insertId);
  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
}

async function login({ email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.password_hash, u.is_active, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = rows[0];
  if (!user) {
    throw createError('Identifiants invalides.', 401);
  }

  if (!user.is_active) {
    throw createError('Compte désactivé.', 403);
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw createError('Identifiants invalides.', 401);
  }

  const token = signToken({ id: user.id, role: user.role });
  return { user: sanitizeUser(user), token };
}

async function getUserById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    throw createError('Utilisateur introuvable.', 404);
  }

  return sanitizeUser(rows[0]);
}

async function getUserWithPasswordById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.password_hash, u.is_active, r.name AS role
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );

  if (!rows[0]) {
    throw createError('Utilisateur introuvable.', 404);
  }

  return rows[0];
}

async function updateProfile(userId, payload) {
  const currentUser = await getUserWithPasswordById(userId);
  const fields = [];
  const values = [];

  if (payload.firstName !== undefined) {
    fields.push('first_name = ?');
    values.push(payload.firstName);
  }

  if (payload.lastName !== undefined) {
    fields.push('last_name = ?');
    values.push(payload.lastName);
  }

  if (payload.phone !== undefined) {
    fields.push('phone = ?');
    values.push(payload.phone ? payload.phone : null);
  }

  if (payload.newPassword) {
    if (!payload.currentPassword) {
      throw createError('Le mot de passe actuel est requis.', 400);
    }

    const isValid = await bcrypt.compare(payload.currentPassword, currentUser.password_hash);
    if (!isValid) {
      throw createError('Mot de passe actuel invalide.', 403);
    }

    fields.push('password_hash = ?');
    values.push(await bcrypt.hash(payload.newPassword, 12));
  }

  if (fields.length === 0) {
    return getUserById(userId);
  }

  values.push(userId);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return getUserById(userId);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: Boolean(user.is_active)
  };
}

module.exports = {
  getUserById,
  login,
  register,
  updateProfile
};
