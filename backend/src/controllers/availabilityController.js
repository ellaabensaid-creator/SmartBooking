const { asyncHandler } = require('../utils/asyncHandler');
const { logAudit } = require('../services/auditService');
const {
  createAvailability,
  deleteAvailability,
  getAvailableSlots,
  listAdminAvailabilities,
  updateAvailability
} = require('../services/availabilityService');

const listAvailabilitiesController = asyncHandler(async (req, res) => {
  const adminId = Number(req.query.adminId || req.user?.id);
  const availabilities = await listAdminAvailabilities(adminId);
  res.json({ availabilities });
});

const slotsController = asyncHandler(async (req, res) => {
  const { serviceId, date } = req.query;
  const slots = await getAvailableSlots(Number(serviceId), String(date));
  res.json({ slots });
});

const adminCreateAvailabilityController = asyncHandler(async (req, res) => {
  const availability = await createAvailability(req.user.id, req.body);
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'availability.create',
    entityType: 'availability',
    entityId: availability.id,
    summary: `Disponibilité créée: jour ${availability.dayOfWeek}`,
    metadata: availability
  });
  res.status(201).json({ availability, message: 'Disponibilité créée.' });
});

const adminUpdateAvailabilityController = asyncHandler(async (req, res) => {
  const availability = await updateAvailability(req.user.id, Number(req.params.id), req.body);
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'availability.update',
    entityType: 'availability',
    entityId: availability.id,
    summary: `Disponibilité mise à jour: jour ${availability.dayOfWeek}`,
    metadata: availability
  });
  res.json({ availability, message: 'Disponibilité mise à jour.' });
});

const adminDeleteAvailabilityController = asyncHandler(async (req, res) => {
  await deleteAvailability(req.user.id, Number(req.params.id));
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'availability.delete',
    entityType: 'availability',
    entityId: Number(req.params.id),
    summary: `Disponibilité supprimée: ${req.params.id}`
  });
  res.json({ message: 'Disponibilité supprimée.' });
});

module.exports = {
  adminCreateAvailabilityController,
  adminDeleteAvailabilityController,
  adminUpdateAvailabilityController,
  listAvailabilitiesController,
  slotsController
};
