/**
 * Tama Andrea Studio — Google Sheets maintenance layer
 *
 * Non-destructive utilities for the spreadsheet used by the Apps Script backend.
 * Run backendSheetMaintenance() after copying this file into the Apps Script project.
 * The function creates missing backend sheets, repairs headers, improves presentation,
 * applies safe data validation/number formats, and returns a data-quality report.
 */

const TA_SHEET_MAINTENANCE = Object.freeze({
  version: '2026.09.2',
  maxQualityIssues: 200
});

function taSheetDefinitions_() {
  return [
    [SHEETS.ORDERS, ORDER_HEADERS],
    [SHEETS.CUSTOMERS, CUSTOMER_HEADERS],
    [SHEETS.AUDIT, AUDIT_HEADERS],
    [SHEETS.ERRORS, ERROR_HEADERS],
    [SHEETS.REQUESTS, REQUEST_HEADERS],
    [SHEETS.SETTINGS, SETTINGS_HEADERS],
    [SHEETS.SERVICE_NOTES, ['Note ID','Kategori','Judul','Ringkasan','Langkah Kerja','Peringatan / Batasan','Updated At']],
    [SHEETS.BOOT_KEYS, ['Brand','Jenis Perangkat','Model / Motherboard','BIOS / UEFI','Boot Menu','Catatan','Updated At']]
  ];
}

function taEnsureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || 1)).getDisplayValues()[0];
    headers.forEach(function(h, i) {
      if (String(current[i] || '').trim() !== h) sh.getRange(1, i + 1).setValue(h);
    });
  }
  return sh;
}

function taFormatHeader_(sh, columnCount) {
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBackground('#1f2937')
    .setFontColor('#ffffff');
  sh.setRowHeight(1, 34);
}

function taCapColumnWidth_(sh, column, minWidth, maxWidth) {
  const current = sh.getColumnWidth(column);
  sh.setColumnWidth(column, Math.max(minWidth, Math.min(maxWidth, current)));
}

function taApplyFilter_(sh, columnCount) {
  if (sh.getFilter()) return;
  const lastRow = Math.max(2, sh.getLastRow());
  sh.getRange(1, 1, lastRow, columnCount).createFilter();
}

function taFormatOrders_(sh) {
  const n = ORDER_HEADERS.length;
  taFormatHeader_(sh, n);
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), n).setVerticalAlignment('top').setWrap(true);
  sh.getRange('B:C').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('L:L').setNumberFormat('dd/MM/yyyy');
  sh.getRange('N:N').setNumberFormat('#,##0');
  sh.getRange('S:S').setNumberFormat('0');
  [1, 2, 3].forEach(function(c) { taCapColumnWidth_(sh, c, 120, 165); });
  taCapColumnWidth_(sh, 4, 170, 240);
  taCapColumnWidth_(sh, 5, 190, 260);
  taCapColumnWidth_(sh, 6, 130, 170);
  taCapColumnWidth_(sh, 7, 150, 220);
  taCapColumnWidth_(sh, 8, 210, 360);
  taCapColumnWidth_(sh, 9, 140, 220);
  taCapColumnWidth_(sh, 10, 250, 420);
  taCapColumnWidth_(sh, 11, 260, 520);
  taCapColumnWidth_(sh, 12, 110, 130);
  taCapColumnWidth_(sh, 13, 90, 115);
  taCapColumnWidth_(sh, 14, 120, 145);
  taCapColumnWidth_(sh, 15, 120, 145);
  taCapColumnWidth_(sh, 16, 95, 110);
  taCapColumnWidth_(sh, 17, 210, 360);
  taCapColumnWidth_(sh, 18, 115, 140);
  taCapColumnWidth_(sh, 19, 90, 115);
  taCapColumnWidth_(sh, 20, 100, 130);
  taCapColumnWidth_(sh, 21, 160, 220);
  taCapColumnWidth_(sh, 22, 280, 520);

  const statusRule = SpreadsheetApp.newDataValidation().requireValueInList(APP.STATUS, true).setAllowInvalid(false).build();
  const paymentRule = SpreadsheetApp.newDataValidation().requireValueInList(APP.PAYMENT, true).setAllowInvalid(false).build();
  const priorityRule = SpreadsheetApp.newDataValidation().requireValueInList(APP.PRIORITY, true).setAllowInvalid(false).build();
  sh.getRange('M2:M').setDataValidation(statusRule);
  sh.getRange('O2:O').setDataValidation(paymentRule);
  sh.getRange('R2:R').setDataValidation(priorityRule);
  taApplyFilter_(sh, n);
}

function taFormatCustomers_(sh) {
  const n = CUSTOMER_HEADERS.length;
  taFormatHeader_(sh, n);
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), n).setVerticalAlignment('top').setWrap(true);
  sh.getRange('B:C').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('H:H').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('G:G').setNumberFormat('0');
  taCapColumnWidth_(sh, 1, 120, 170);
  taCapColumnWidth_(sh, 2, 140, 165);
  taCapColumnWidth_(sh, 3, 140, 165);
  taCapColumnWidth_(sh, 4, 180, 240);
  taCapColumnWidth_(sh, 5, 210, 280);
  taCapColumnWidth_(sh, 6, 130, 170);
  taCapColumnWidth_(sh, 7, 115, 135);
  taCapColumnWidth_(sh, 8, 150, 180);
  taCapColumnWidth_(sh, 9, 120, 150);
  taCapColumnWidth_(sh, 10, 260, 480);
  taApplyFilter_(sh, n);
}

function taFormatGeneric_(sh, headers, dateColumns) {
  taFormatHeader_(sh, headers.length);
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), headers.length).setVerticalAlignment('top').setWrap(true);
  (dateColumns || []).forEach(function(col) { sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('dd/MM/yyyy HH:mm:ss'); });
  for (let c = 1; c <= headers.length; c++) taCapColumnWidth_(sh, c, 110, c === 1 ? 260 : 420);
  taApplyFilter_(sh, headers.length);
}

function taValidateOrders_(sh, issues) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const rows = sh.getRange(2, 1, last - 1, ORDER_HEADERS.length).getValues();
  const ids = {};
  const requestIds = {};
  rows.forEach(function(r, idx) {
    const rowNo = idx + 2;
    const id = String(r[0] || '').trim();
    const email = String(r[4] || '').trim();
    const status = String(r[12] || '').trim();
    const payment = String(r[14] || '').trim();
    const priority = String(r[17] || '').trim();
    const estimate = Number(r[13]);
    const clientRequest = String(r[20] || '').trim();
    if (!id) issues.push('Orders!A' + rowNo + ': ID pesanan kosong.');
    if (id) {
      ids[id] = (ids[id] || 0) + 1;
      if (ids[id] > 1) issues.push('Orders!A' + rowNo + ': ID pesanan duplikat ' + id + '.');
    }
    if (!email || email.indexOf('@') < 1) issues.push('Orders!E' + rowNo + ': email kosong/tidak valid.');
    if (status && APP.STATUS.indexOf(status) < 0) issues.push('Orders!M' + rowNo + ': status di luar katalog.');
    if (payment && APP.PAYMENT.indexOf(payment) < 0) issues.push('Orders!O' + rowNo + ': status pembayaran di luar katalog.');
    if (priority && APP.PRIORITY.indexOf(priority) < 0) issues.push('Orders!R' + rowNo + ': prioritas di luar katalog.');
    if (r[13] !== '' && (!Number.isFinite(estimate) || estimate < 0)) issues.push('Orders!N' + rowNo + ': estimasi biaya tidak valid.');
    if (clientRequest) {
      requestIds[clientRequest] = (requestIds[clientRequest] || 0) + 1;
      if (requestIds[clientRequest] > 1) issues.push('Orders!U' + rowNo + ': Client Request ID duplikat.');
    }
  });
}

function taValidateCustomers_(sh, issues) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const rows = sh.getRange(2, 1, last - 1, CUSTOMER_HEADERS.length).getValues();
  const ids = {};
  rows.forEach(function(r, idx) {
    const rowNo = idx + 2;
    const id = String(r[0] || '').trim();
    const email = String(r[4] || '').trim();
    if (!id) issues.push('Customers!A' + rowNo + ': Customer ID kosong.');
    if (id) {
      ids[id] = (ids[id] || 0) + 1;
      if (ids[id] > 1) issues.push('Customers!A' + rowNo + ': Customer ID duplikat.');
    }
    if (!email || email.indexOf('@') < 1) issues.push('Customers!E' + rowNo + ': email kosong/tidak valid.');
    if (r[6] !== '' && (!Number.isFinite(Number(r[6])) || Number(r[6]) < 0)) issues.push('Customers!G' + rowNo + ': jumlah pesanan tidak valid.');
  });
}

function backendSheetDataQuality() {
  const ss = getSpreadsheet_();
  const issues = [];
  const definitions = taSheetDefinitions_();
  definitions.forEach(function(d) {
    if (!ss.getSheetByName(d[0])) issues.push(d[0] + ': sheet belum tersedia.');
  });
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  const customers = ss.getSheetByName(SHEETS.CUSTOMERS);
  if (orders) taValidateOrders_(orders, issues);
  if (customers) taValidateCustomers_(customers, issues);
  const limited = issues.slice(0, TA_SHEET_MAINTENANCE.maxQualityIssues);
  return {
    status: issues.length ? 'attention' : 'ok',
    version: TA_SHEET_MAINTENANCE.version,
    issueCount: issues.length,
    truncated: issues.length > limited.length,
    issues: limited
  };
}

/**
 * Main maintenance action. Safe to run repeatedly; it does not delete order/customer data.
 */
function backendSheetMaintenance() {
  const started = Date.now();
  const ss = getSpreadsheet_();
  const result = { status: 'ok', version: TA_SHEET_MAINTENANCE.version, spreadsheet: ss.getName(), sheets: [], dataQuality: null, elapsedMs: 0 };

  taSheetDefinitions_().forEach(function(d) {
    const sh = taEnsureSheet_(ss, d[0], d[1]);
    const n = d[1].length;
    if (d[0] === SHEETS.ORDERS) {
      taFormatOrders_(sh);
    } else if (d[0] === SHEETS.CUSTOMERS) {
      taFormatCustomers_(sh);
    } else if (d[0] === SHEETS.AUDIT) {
      taFormatGeneric_(sh, d[1], [1]);
    } else if (d[0] === SHEETS.ERRORS) {
      taFormatGeneric_(sh, d[1], [1]);
    } else if (d[0] === SHEETS.REQUESTS) {
      taFormatGeneric_(sh, d[1], [3]);
    } else if (d[0] === SHEETS.SETTINGS) {
      taFormatGeneric_(sh, d[1], [4]);
    } else {
      taFormatGeneric_(sh, d[1], [7]);
    }
    result.sheets.push({ name: d[0], rows: sh.getLastRow(), columns: n });
  });

  SpreadsheetApp.flush();
  result.dataQuality = backendSheetDataQuality();
  result.status = result.dataQuality.status === 'ok' ? 'ok' : 'attention';
  result.elapsedMs = Date.now() - started;
  return result;
}

function backendFullCheck() {
  const report = {
    generatedAt: new Date().toISOString(),
    maintenance: backendSheetDataQuality(),
    security: typeof adminSecurityStatus === 'function' ? adminSecurityStatus() : { status: 'unavailable' },
    production: typeof productionReadiness === 'function' ? productionReadiness() : { status: 'unavailable' }
  };
  report.status = [report.maintenance.status, report.security.initialized ? 'ok' : 'attention', report.production.status === 'ready' ? 'ok' : 'attention'].indexOf('attention') >= 0 ? 'attention' : 'ok';
  return report;
}
