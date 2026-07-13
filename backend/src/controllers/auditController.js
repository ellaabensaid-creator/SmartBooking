const { asyncHandler } = require('../utils/asyncHandler');
const { listAuditLogs } = require('../services/auditService');

const listMyAuditLogsController = asyncHandler(async (req, res) => {
  const result = await listAuditLogs(req.user.id, req.query);
  res.json(result);
});

module.exports = {
  listMyAuditLogsController
};