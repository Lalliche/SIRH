// CSV (";" separator + BOM so French Excel opens it correctly) and browser download helpers.

const esc = (v) => {
  if (v == null) return "";
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** columns: [{ key, header, value?(row) }] */
export function toCsv(rows, columns) {
  const head = columns.map((c) => esc(c.header)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(c.value ? c.value(r) : r[c.key])).join(";"));
  return `﻿${[head, ...body].join("\r\n")}`;
}

export function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCsv = (filename, rows, columns) => downloadFile(filename, toCsv(rows, columns));

export const fileSize = (bytes) => {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1).replace(".", ",")} Mo`;
  return `${(bytes / 1073741824).toFixed(1).replace(".", ",")} Go`;
};
