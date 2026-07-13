function toPositiveInteger(value, fallback) {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function parsePagination(query = {}, defaults = {}) {
  const page = toPositiveInteger(query.page, defaults.page || 1);
  const pageSize = Math.min(toPositiveInteger(query.pageSize, defaults.pageSize || 20), defaults.maxPageSize || 100);
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

function parseSearchQuery(query = '') {
  return String(query || '').trim();
}

module.exports = {
  parsePagination,
  parseSearchQuery,
  toPositiveInteger
};