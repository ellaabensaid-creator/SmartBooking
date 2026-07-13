function escapeCsv(value) {
  const text = String(value ?? '');
  return /["\n,;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows, headers) {
  const lines = [headers.map((header) => escapeCsv(header.label)).join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(header.value(row))).join(','));
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  rowsToCsv
};