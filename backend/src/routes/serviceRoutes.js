const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const {
  adminCreateServiceController,
  adminDeleteServiceController,
  adminExportServicesController,
  adminListServicesController,
  adminUpdateServiceController,
  listServicesController
} = require('../controllers/serviceController');

const router = express.Router();

router.get('/', listServicesController);
router.get('/admin', authenticate, requireRole('admin'), adminListServicesController);
router.get('/admin/export', authenticate, requireRole('admin'), adminExportServicesController);
router.post('/admin', authenticate, requireRole('admin'), adminCreateServiceController);
router.put('/admin/:id', authenticate, requireRole('admin'), adminUpdateServiceController);
router.delete('/admin/:id', authenticate, requireRole('admin'), adminDeleteServiceController);

module.exports = router;
