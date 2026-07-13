const { asyncHandler } = require('../utils/asyncHandler');
const { getUserById, login, register, updateProfile } = require('../services/authService');
const { getUserHistory } = require('../services/userHistoryService');
const { requestPasswordReset, resetPassword } = require('../services/passwordResetService');
const { validate } = require('../middlewares/validate');
const { loginSchema, passwordResetConfirmSchema, passwordResetRequestSchema, profileUpdateSchema, registrationSchema } = require('../validators/authSchemas');

const registerController = [
  validate(registrationSchema),
  asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password, role, adminCode } = req.validated.body;
  const result = await register({ firstName, lastName, email, phone, password, role, adminCode });
  res.status(201).json({ message: 'Compte créé avec succès.', ...result });
  })
];

const loginController = [
  validate(loginSchema),
  asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const result = await login({ email, password });
  res.json({ message: 'Connexion réussie.', ...result });
  })
];

const meController = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ user });
});

const updateMeController = [
  validate(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const user = await updateProfile(req.user.id, req.validated.body);
    res.json({ user, message: 'Profil mis à jour.' });
  })
];

const meHistoryController = asyncHandler(async (req, res) => {
  const history = await getUserHistory(req.user.id, req.user.role);
  res.json({ history });
});

const requestPasswordResetController = [
  validate(passwordResetRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await requestPasswordReset(req.validated.body.email);
    res.json(result);
  })
];

const confirmPasswordResetController = [
  validate(passwordResetConfirmSchema),
  asyncHandler(async (req, res) => {
    const result = await resetPassword(req.validated.body);
    res.json(result);
  })
];

module.exports = {
  confirmPasswordResetController,
  loginController,
  meHistoryController,
  meController,
  requestPasswordResetController,
  registerController,
  updateMeController
};
