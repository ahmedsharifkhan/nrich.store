// ============================================================
// NRICH — SteadFast Integration
// ============================================================

var SF_API_KEY    = 'o5odczxvw0lo6ueaymp0vbsmnuuzlqbg';
var SF_SECRET_KEY = 'q5tu2sdy5n4ctodb9bi8adlj';
var SF_ORDER_URL  = 'https://portal.packzy.com/api/v1/create_order';
var SF_BAL_URL    = 'https://portal.packzy.com/api/v1/get_balance';

var COL_ORDER_ID   = 2;   // B — order_id
var COL_NAME       = 3;   // C — customer_name
var COL_PHONE      = 4;   // D — customer_phone
var COL_ADDRESS    = 5;   // E — customer_address
var COL_ZONE       = 6;   // F — customer_zone
var COL_TOTAL      = 9;   // I — total
var COL_NOTE       = 12;  // L — customer_note
var COL_STATUS     = 13;  // M — status
var COL_DISPATCH   = 14;  // N — dispatch_action (dropdown)
var COL_CONFIRM    = 15;  // O — confirm checkbox
var COL_SF_STATUS  = 16;  // P — sf_status
var COL_SF_ID      = 17;  // Q — sf_consignment_id
var COL_SF_TRACK   = 18;  // R — sf_tracking_code

// ── Menu ─────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚚 NRICH Tools')
    .addItem('📅 আজকের অর্ডার পাঠাও', 'sendTodayToSteadFast')
    .addItem('📦 Selected rows পাঠাও', 'sendToSteadFast')
    .addSeparator()
    .addItem('⚙️ Sheet Setup করো (প্রথমবার)', 'setupSheet')
    .addSeparator()
    .addItem('💰 SteadFast Balance চেক করো', 'checkSteadFastBalance')
    .addToUi();
}

// ── First-time Sheet Setup ────────────────────────────────────
function setupSheet() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  var ui    = SpreadsheetApp.getUi();

  // Force-set headers (overwrite if old values exist)
  var headers = [
    [14, 'dispatch_action', '#ffe599'],
    [15, 'confirm ✓',       '#ffe599'],
    [16, 'sf_status',       '#c9daf8'],
    [17, 'sf_consignment_id', '#c9daf8'],
    [18, 'sf_tracking_code',  '#c9daf8']
  ];
  headers.forEach(function(h) {
    var cell = sheet.getRange(1, h[0]);
    cell.setValue(h[1]);
    cell.setFontWeight('bold');
    cell.setBackground(h[2]);
  });

  // Dropdown for dispatch_action (N2:N500)
  var dropdownRange = sheet.getRange(2, COL_DISPATCH, 499, 1);
  var dropdownRule  = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Send to SteadFast', 'Pending', 'Onhold', 'Test'], true)
    .build();
  dropdownRange.setDataValidation(dropdownRule);

  // Checkbox for confirm (O2:O500)
  sheet.getRange(2, COL_CONFIRM, 499, 1).insertCheckboxes();

  ui.alert('✅ Setup সম্পন্ন!',
    'Column N → Dropdown (Send to SteadFast / Pending / Onhold / Test)\n' +
    'Column O → Checkbox ✓\n\n' +
    'ব্যবহার:\n' +
    '1. অর্ডার আসলে Column N → "Send to SteadFast" select করুন\n' +
    '2. Column O-তে ✓ tick করুন\n' +
    '3. NRICH Tools → "আজকের অর্ডার পাঠাও" click করুন',
    ui.ButtonSet.OK);
}

// ── Send today's orders (filtered by dispatch + confirm) ──────
function sendTodayToSteadFast() {
  var ui    = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  var today = new Date();
  var todayY = today.getFullYear();
  var todayM = today.getMonth();
  var todayD = today.getDate();

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert('কোনো অর্ডার নেই।'); return; }

  var sent = 0, failed = 0, skipped = 0, notMarked = 0, logs = [];

  for (var r = 2; r <= lastRow; r++) {
    var dateVal = sheet.getRange(r, 1).getValue();
    if (!dateVal) continue;

    var d = new Date(dateVal);
    if (d.getFullYear() !== todayY || d.getMonth() !== todayM || d.getDate() !== todayD) continue;

    var row      = sheet.getRange(r, 1, 1, COL_SF_TRACK).getValues()[0];
    var dispatch = (row[COL_DISPATCH - 1] || '').toString().trim();
    var confirm  = row[COL_CONFIRM - 1];

    if (dispatch !== 'Send to SteadFast' || confirm !== true) {
      notMarked++;
      continue;
    }

    // Skip already sent
    var existing = (row[COL_SF_ID - 1] || '').toString().trim();
    if (existing !== '') {
      skipped++;
      logs.push('Row ' + r + ': ⏭ Already sent (' + existing + ')');
      continue;
    }

    var result = _doSend(row, r, sheet);
    if (result === true) sent++;
    else if (result === false) failed++;

    Utilities.sleep(300);
  }

  var msg =
    '📅 তারিখ: ' + today.toLocaleDateString('bn-BD') + '\n\n' +
    '✅ পাঠানো:       ' + sent      + ' টি\n' +
    '❌ Failed:       ' + failed    + ' টি\n' +
    '⏭ আগেই পাঠানো: ' + skipped   + ' টি\n' +
    '⏸ Mark নেই:    ' + notMarked + ' টি\n\n' +
    (logs.length ? logs.join('\n') : '');
  ui.alert('📅 আজকের SteadFast Result', msg, ui.ButtonSet.OK);
}

// ── Send selected rows (no filter) ───────────────────────────
function sendToSteadFast() {
  var ui       = SpreadsheetApp.getUi();
  var sheet    = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sel      = sheet.getActiveRange();
  var startRow = sel.getRow();
  var numRows  = sel.getNumRows();

  if (startRow === 1) {
    ui.alert('⚠️', 'Header row select করা হয়েছে। Order row select করুন।', ui.ButtonSet.OK);
    return;
  }

  var sent = 0, failed = 0, skipped = 0, logs = [];

  for (var r = startRow; r < startRow + numRows; r++) {
    var existing = sheet.getRange(r, COL_SF_ID).getValue();
    if (existing && existing.toString().trim() !== '') {
      skipped++;
      logs.push('Row ' + r + ': ⏭ Already sent (' + existing + ')');
      continue;
    }

    var row    = sheet.getRange(r, 1, 1, COL_SF_TRACK).getValues()[0];
    var result = _doSend(row, r, sheet);
    if (result === true) sent++;
    else if (result === false) failed++;

    Utilities.sleep(300);
  }

  var msg =
    '✅ পাঠানো:       ' + sent    + ' টি\n' +
    '❌ Failed:       ' + failed  + ' টি\n' +
    '⏭ আগেই পাঠানো: ' + skipped + ' টি\n\n' +
    logs.join('\n');
  ui.alert('📦 SteadFast Result', msg, ui.ButtonSet.OK);
}

// ── Internal: build payload and call API ──────────────────────
function _doSend(row, r, sheet) {
  var orderId = (row[COL_ORDER_ID - 1] || ('NRICH-ROW-' + r)).toString();
  var name    = (row[COL_NAME    - 1] || 'Customer').toString();
  var phone   = (row[COL_PHONE   - 1] || '').toString().trim();
  var address = (row[COL_ADDRESS - 1] || '').toString().trim();
  var zone    = (row[COL_ZONE    - 1] || '').toString();
  var total   = parseFloat(row[COL_TOTAL - 1]) || 0;
  var note    = (row[COL_NOTE    - 1] || '').toString();
  var sfNote  = [zone, note].filter(Boolean).join(' | ');

  if (!phone || !address) {
    sheet.getRange(r, COL_SF_STATUS).setValue('❌ ফোন/ঠিকানা নেই');
    return false;
  }

  var result = callSteadFast({
    invoice:           orderId,
    recipient_name:    name,
    recipient_phone:   phone,
    recipient_address: address,
    cod_amount:        total,
    note:              sfNote
  });

  if (result.ok) {
    sheet.getRange(r, COL_SF_STATUS).setValue('✅ পাঠানো হয়েছে');
    sheet.getRange(r, COL_SF_ID).setValue(result.consignment_id);
    sheet.getRange(r, COL_SF_TRACK).setValue(result.tracking_code);
    sheet.getRange(r, COL_STATUS).setValue('SteadFast-এ পাঠানো হয়েছে');
    return true;
  } else {
    sheet.getRange(r, COL_SF_STATUS).setValue('❌ ' + result.error);
    return false;
  }
}

// ── SteadFast API call ────────────────────────────────────────
function callSteadFast(payload) {
  try {
    var resp = UrlFetchApp.fetch(SF_ORDER_URL, {
      method:  'POST',
      headers: {
        'Api-Key':      SF_API_KEY,
        'Secret-Key':   SF_SECRET_KEY,
        'Content-Type': 'application/json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var body;
    try { body = JSON.parse(resp.getContentText()); } catch(e) { body = {}; }
    if (code === 200 && body.status === 200) {
      var c = body.consignment || {};
      return { ok: true, consignment_id: c.consignment_id || '', tracking_code: c.tracking_code || '' };
    }
    return { ok: false, error: body.message || body.error || ('HTTP ' + code) };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Check Balance ─────────────────────────────────────────────
function checkSteadFastBalance() {
  try {
    var resp = UrlFetchApp.fetch(SF_BAL_URL, {
      method:  'GET',
      headers: { 'Api-Key': SF_API_KEY, 'Secret-Key': SF_SECRET_KEY },
      muteHttpExceptions: true
    });
    var body;
    try { body = JSON.parse(resp.getContentText()); } catch(e) { body = {}; }
    var bal = body.current_balance !== undefined ? body.current_balance : (body.balance || 'Unknown');
    SpreadsheetApp.getUi().alert('💰 SteadFast Balance', 'Current Balance: ৳' + bal, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}

// ── Auth test (run once from editor to grant permissions) ─────
function testAuth() {
  var resp = UrlFetchApp.fetch(SF_BAL_URL, {
    method:  'GET',
    headers: { 'Api-Key': SF_API_KEY, 'Secret-Key': SF_SECRET_KEY },
    muteHttpExceptions: true
  });
  Logger.log('Balance response: ' + resp.getContentText());
}

// ── Create installable trigger ────────────────────────────────
function createTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onOpen') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onOpen').forSpreadsheet(SHEET_ID).onOpen().create();
  Logger.log('Trigger created!');
}
