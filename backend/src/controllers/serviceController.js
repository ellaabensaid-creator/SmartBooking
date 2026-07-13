const { asyncHandler } = require('../utils/asyncHandler');
const { rowsToCsv } = require('../utils/csv');
const { logAudit } = require('../services/auditService');
const {
  createService,
  deleteService,
  listAdminServices,
  listPublicServices,
  updateService
} = require('../services/serviceService');

const listServicesController = asyncHandler(async (req, res) => {
  const result = await listPublicServices(req.query);
  res.json(result);
});

const adminListServicesController = asyncHandler(async (req, res) => {
  const result = await listAdminServices(req.user.id, req.query);
  res.json(result);
});

const adminCreateServiceController = asyncHandler(async (req, res) => {
  const service = await createService(req.user.id, req.body);
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'service.create',
    entityType: 'service',
    entityId: service.id,
    summary: `Service créé: ${service.name}`,
    metadata: service
  });
  res.status(201).json({ service, message: 'Service créé.' });
});

const adminUpdateServiceController = asyncHandler(async (req, res) => {
  const service = await updateService(req.user.id, Number(req.params.id), req.body);
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'service.update',
    entityType: 'service',
    entityId: service.id,
    summary: `Service mis à jour: ${service.name}`,
    metadata: service
  });
  res.json({ service, message: 'Service mis à jour.' });
});

const adminDeleteServiceController = asyncHandler(async (req, res) => {
  await deleteService(req.user.id, Number(req.params.id));
  await logAudit({
    actorUserId: req.user.id,
    actorRole: req.user.role,
    action: 'service.delete',
    entityType: 'service',
    entityId: Number(req.params.id),
    summary: `Service supprimé: ${req.params.id}`
  });
  res.json({ message: 'Service supprimé.' });
});

const adminExportServicesController = asyncHandler(async (req, res) => {
  const result = await listAdminServices(req.user.id, { ...req.query, page: 1, pageSize: 1000, maxPageSize: 1000 });
  const csv = rowsToCsv(result.services, [
    { label: 'ID', value: (row) => row.id },
    { label: 'Nom', value: (row) => row.name },
    { label: 'Description', value: (row) => row.description || '' },
    { label: 'Durée (min)', value: (row) => row.durationMinutes },
    { label: 'Prix', value: (row) => row.price },
    { label: 'Actif', value: (row) => (row.isActive ? 'oui' : 'non') }
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="services.csv"');
  res.send(csv);
});

module.exports = {
  adminCreateServiceController,
  adminDeleteServiceController,
  adminExportServicesController,
  adminListServicesController,
  adminUpdateServiceController,
  listServicesController
};
