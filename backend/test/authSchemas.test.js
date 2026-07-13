const test = require('node:test');
const assert = require('node:assert/strict');

const { loginSchema, profileUpdateSchema, registrationSchema } = require('../src/validators/authSchemas');

test('registration schema accepts a valid client payload', () => {
  const result = registrationSchema.safeParse({
    body: {
      firstName: 'Amina',
      lastName: 'Diallo',
      email: 'amina@example.com',
      phone: '0600000000',
      password: 'Password123!',
      role: 'client',
      adminCode: ''
    }
  });

  assert.equal(result.success, true);
});

test('registration schema rejects a short password', () => {
  const result = registrationSchema.safeParse({
    body: {
      firstName: 'Amina',
      lastName: 'Diallo',
      email: 'amina@example.com',
      phone: '',
      password: 'short',
      role: 'client',
      adminCode: ''
    }
  });

  assert.equal(result.success, false);
});

test('login schema requires email and password', () => {
  assert.equal(loginSchema.safeParse({ body: { email: 'user@example.com', password: 'secret' } }).success, true);
  assert.equal(loginSchema.safeParse({ body: { email: 'invalid', password: 'secret' } }).success, false);
});

test('profile schema allows password change fields', () => {
  const result = profileUpdateSchema.safeParse({
    body: {
      firstName: 'New',
      lastName: 'Name',
      phone: '0700000000',
      currentPassword: 'Password123!',
      newPassword: 'NewPassword123!'
    }
  });

  assert.equal(result.success, true);
});