const crypto = require('crypto');

function randomToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
  hashToken,
  randomToken
};