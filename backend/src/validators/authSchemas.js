function createSchema(validator) {
  return {
    safeParse(input) {
      const issues = [];
      const data = validator(input, issues);

      if (issues.length > 0) {
        return {
          success: false,
          error: {
            flatten() {
              return issues.reduce(
                (accumulator, issue) => {
                  if (issue.path) {
                    accumulator.fieldErrors[issue.path] = accumulator.fieldErrors[issue.path] || [];
                    accumulator.fieldErrors[issue.path].push(issue.message);
                  } else {
                    accumulator.formErrors.push(issue.message);
                  }

                  return accumulator;
                },
                { formErrors: [], fieldErrors: {} }
              );
            }
          }
        };
      }

      return { success: true, data };
    }
  };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateName(value, issues, path) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    issues.push({ path, message: 'Champ requis.' });
    return '';
  }

  if (trimmed.length < 2) {
    issues.push({ path, message: 'Le champ doit contenir au moins 2 caractères.' });
  }

  if (trimmed.length > 100) {
    issues.push({ path, message: 'Le champ est trop long.' });
  }

  return trimmed;
}

function validateOptionalPhone(value, issues) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 30) {
    issues.push({ path: 'phone', message: 'Le numéro de téléphone est trop long.' });
  }

  return trimmed;
}

function validatePassword(value, issues, path, minLength = 8, message = 'Le mot de passe doit contenir au moins 8 caractères.') {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    issues.push({ path, message: 'Mot de passe requis.' });
    return '';
  }

  if (trimmed.length < minLength) {
    issues.push({ path, message });
  }

  if (trimmed.length > 100) {
    issues.push({ path, message: 'Le mot de passe est trop long.' });
  }

  return trimmed;
}

const registrationSchema = createSchema((input, issues) => {
  const body = input.body || {};
  const role = normalizeText(body.role) || 'client';

  if (!['client', 'admin'].includes(role)) {
    issues.push({ path: 'role', message: 'Rôle invalide.' });
  }

  const email = normalizeText(body.email);
  if (!email) {
    issues.push({ path: 'email', message: 'Email requis.' });
  } else if (!isValidEmail(email)) {
    issues.push({ path: 'email', message: 'Email invalide.' });
  }

  const firstName = validateName(body.firstName, issues, 'firstName');
  const lastName = validateName(body.lastName, issues, 'lastName');
  const phone = validateOptionalPhone(body.phone, issues);
  const password = validatePassword(body.password, issues, 'password');
  const adminCode = normalizeText(body.adminCode);

  if (adminCode.length > 120) {
    issues.push({ path: 'adminCode', message: 'Le code administrateur est trop long.' });
  }

  return {
    body: {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      adminCode
    }
  };
});

const loginSchema = createSchema((input, issues) => {
  const body = input.body || {};
  const email = normalizeText(body.email);
  const password = normalizeText(body.password);

  if (!email) {
    issues.push({ path: 'email', message: 'Email requis.' });
  } else if (!isValidEmail(email)) {
    issues.push({ path: 'email', message: 'Email invalide.' });
  }

  if (!password) {
    issues.push({ path: 'password', message: 'Mot de passe requis.' });
  }

  return { body: { email, password } };
});

const profileUpdateSchema = createSchema((input, issues) => {
  const body = input.body || {};
  const firstName = body.firstName !== undefined ? validateName(body.firstName, issues, 'firstName') : undefined;
  const lastName = body.lastName !== undefined ? validateName(body.lastName, issues, 'lastName') : undefined;
  const phone = body.phone !== undefined ? validateOptionalPhone(body.phone, issues) : undefined;
  const currentPassword = normalizeText(body.currentPassword);
  const newPassword = body.newPassword !== undefined
    ? validatePassword(body.newPassword, issues, 'newPassword', 8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.')
    : undefined;

  return {
    body: {
      firstName,
      lastName,
      phone,
      currentPassword,
      newPassword
    }
  };
});

const passwordResetRequestSchema = createSchema((input, issues) => {
  const body = input.body || {};
  const email = normalizeText(body.email);

  if (!email) {
    issues.push({ path: 'email', message: 'Email requis.' });
  } else if (!isValidEmail(email)) {
    issues.push({ path: 'email', message: 'Email invalide.' });
  }

  return { body: { email } };
});

const passwordResetConfirmSchema = createSchema((input, issues) => {
  const body = input.body || {};
  const token = normalizeText(body.token);
  const newPassword = validatePassword(body.newPassword, issues, 'newPassword', 8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.');

  if (!token) {
    issues.push({ path: 'token', message: 'Jeton requis.' });
  }

  return {
    body: {
      token,
      newPassword
    }
  };
});

module.exports = {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  loginSchema,
  profileUpdateSchema,
  registrationSchema
};