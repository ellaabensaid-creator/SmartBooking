const express = require('express');
const { authenticate, requireRole } = require('../middlewares/auth');
const {
  adminCreateAvailabilityController,
  adminDeleteAvailabilityController,
  adminUpdateAvailabilityController,
  listAvailabilitiesController,
  slotsController
} = require('../controllers/availabilityController');

const router = express.Router();

router.get('/', authenticate, requireRole('admin'), listAvailabilitiesController);
router.get('/slots', slotsController);
router.post('/admin', authenticate, requireRole('admin'), adminCreateAvailabilityController);
router.put('/admin/:id', authenticate, requireRole('admin'), adminUpdateAvailabilityController);
router.delete('/admin/:id', authenticate, requireRole('admin'), adminDeleteAvailabilityController);

module.exports = router;
