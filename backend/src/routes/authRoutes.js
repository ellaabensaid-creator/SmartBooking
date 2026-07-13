const express = require('express');
const {
	confirmPasswordResetController,
	loginController,
	meController,
	meHistoryController,
	registerController,
	requestPasswordResetController,
	updateMeController
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', ...registerController);
router.post('/login', ...loginController);
router.post('/password-reset/request', ...requestPasswordResetController);
router.post('/password-reset/confirm', ...confirmPasswordResetController);
router.get('/me', authenticate, meController);
router.get('/me/history', authenticate, meHistoryController);
router.put('/me', authenticate, ...updateMeController);

module.exports = router;
