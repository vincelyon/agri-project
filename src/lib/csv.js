/** Build RFC 4180 CSV. Also neutralises spreadsheet formula injection. */
function escapeCell(value) {
  if (value == null) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // Prevent CSV/formula injection when opened in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n"; // BOM so Excel detects UTF-8
}

export function csvResponse(filename, headers, rows) {
  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
