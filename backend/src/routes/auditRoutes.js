const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const { listMyAuditLogsController } = require('../controllers/auditController');

const router = express.Router();

router.get('/me', authenticate, requireRole('admin'), listMyAuditLogsController);

module.exports = router;