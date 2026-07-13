const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { env } = require('../config/env');
const { createError } = require('../utils/errors');
const { hashToken, randomToken } = require('../utils/crypto');

async function requestPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [rows] = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);

  if (!rows[0]) {
    return { message: 'Si le compte existe, un lien de réinitialisation a été préparé.' };
  }

  const token = randomToken(24);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);

  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [rows[0].id]);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [rows[0].id, tokenHash, expiresAt]
  );

  return {
    message: 'Si le compte existe, un lien de réinitialisation a été préparé.',
    resetLink: `${env.appPublicUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`
  };
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const [rows] = await pool.query(
    `SELECT *
     FROM password_reset_tokens
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash]
  );

  if (!rows[0]) {
    throw createError('Lien de réinitialisation invalide ou expiré.', 400);
  }

  const record = rows[0];
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, record.user_id]);
  await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);

  return { message: 'Mot de passe réinitialisé avec succès.' };
}

module.exports = {
  requestPasswordReset,
  resetPassword
};