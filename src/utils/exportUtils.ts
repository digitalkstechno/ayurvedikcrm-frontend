// Shared export utility functions for use in page headers.
// Takes raw record data and produces Copy/Excel/CSV/PDF outputs.

type ExportRow = Record<string, any>;

interface ExportField {
  key: string;
  header: string;
}

function flatten(row: ExportRow, fields: ExportField[]): string[] {
  return fields.map(f => {
    const val = row[f.key];
    return val === undefined || val === null ? '' : String(val);
  });
}

function fallbackCopy(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

export function exportCopy(rows: ExportRow[], fields: ExportField[]): void {
  const headers = fields.map(f => f.header).join('\t');
  const body = rows.map(r => flatten(r, fields).join('\t')).join('\n');
  const text = `${headers}\n${body}`;
  navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
}

export function exportExcel(rows: ExportRow[], fields: ExportField[], filename: string): void {
  const headers = fields.map(f => f.header);
  const tableRows = rows
    .map(r =>
      `<tr>${flatten(r, fields)
        .map(v => `<td style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; font-size: 10pt; border: 1px solid #e5e7eb; padding: 6px 12px; color: #1f2f3e; min-width: 120px;" width="160">${v}</td>`)
        .join('')}</tr>`
    )
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${filename}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    </head>
    <body>
      <table>
        <thead>
          <tr>${headers.map(h => `<th style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #395244; color: #ffffff; font-weight: bold; font-size: 11pt; border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; min-width: 120px;" width="160">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: ExportRow[], fields: ExportField[], filename: string): void {
  const headers = fields.map(f => f.header);
  const csv = [headers, ...rows.map(r => flatten(r, fields))]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(rows: ExportRow[], fields: ExportField[], title: string): void {
  const headers = fields.map(f => f.header);
  const tableRows = rows
    .map(r =>
      `<tr>${flatten(r, fields)
        .map(v => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${v}</td>`)
        .join('')}</tr>`
    )
    .join('');

  const html = `
    <html><head><title>${title}</title>
    <style>
      body { font-family: Inter, sans-serif; padding: 24px; color: #1e1b4b; }
      h2 { margin-bottom: 16px; font-size: 18px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #4f46e5; color: white; padding: 8px 10px; font-size: 12px; border: 1px solid #4f46e5; text-align: left; }
    </style></head><body>
    <h2>${title}</h2>
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    </body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }
}
