// ============================================================
// NRICH — Pathao Courier Integration (standalone add-on)
// ============================================================
// This is a completely separate file. It does NOT edit, call,
// or depend on steadfast-sheet-integration.gs or order-handler.gs
// in any way — SteadFast's menu, dropdown, and _doSend() are
// untouched and keep working exactly as before.
//
// How it works:
//   1. In column N (dispatch_action) of a row, type/select
//      "Send to Pathao" (see one-time setup note below).
//   2. Tick the confirm checkbox in column O.
//   3. This file's onPathaoEdit() trigger fires automatically
//      and sends that row to Pathao via API — nothing to click.
//
// One-time setup (no code changes to any other file):
//   A. Apps Script editor → File → + → Script → paste this file.
//   B. Select function "createPathaoEditTrigger" in the toolbar
//      dropdown → click Run (once) → approve permissions.
//   C. On the sheet: select column N → Data → Data validation →
//      edit the existing rule → add "Send to Pathao" to the list
//      of allowed values (this is a spreadsheet setting, not code).
// ============================================================

var PATHAO_SHEET_ID      = '1Na8kkP4cH-Txdn9gPRjZSJs9JlE-Aju13cdIsfrT22Y';
var PATHAO_SHEET_NAME    = 'NRICH Orders';

var PATHAO_BASE_URL      = 'https://api-hermes.pathao.com';
var PATHAO_CLIENT_ID     = 'X7axoxPeyv';
var PATHAO_CLIENT_SECRET = 'eyxXxuV5FfVDCeFaN5fPeiDQOXg9FFR1QJW8rDWd';
var PATHAO_USERNAME      = 'nrichbd.store@gmail.com';
var PATHAO_PASSWORD      = 'dqba#5kLMTFJt7d';
var PATHAO_STORE_ID      = 422620;

// Same column layout as the sheet already uses (no new columns).
var P_COL_ORDER_ID  = 2;   // B
var P_COL_NAME       = 3;  // C
var P_COL_PHONE      = 4;  // D
var P_COL_ADDRESS    = 5;  // E
var P_COL_ZONE        = 6; // F
var P_COL_TOTAL      = 9;  // I
var P_COL_ITEMS      = 11; // K — পণ্য
var P_COL_NOTE       = 12; // L
var P_COL_STATUS     = 13; // M
var P_COL_DISPATCH   = 14; // N
var P_COL_CONFIRM    = 15; // O
var P_COL_SF_STATUS  = 16; // P
var P_COL_SF_ID      = 17; // Q
var P_COL_SF_TRACK   = 18; // R

// ── Installable trigger: fires on any edit to the sheet ─────────
function onPathaoEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== PATHAO_SHEET_NAME) return;

    var row = e.range.getRow();
    var col = e.range.getColumn();
    if (row < 2) return;
    if (col !== P_COL_CONFIRM) return;      // only react to the confirm checkbox
    if (e.value !== 'TRUE') return;         // only when it's being checked

    var dispatch = sheet.getRange(row, P_COL_DISPATCH).getValue().toString().trim();
    if (dispatch !== 'Send to Pathao') return;

    var existing = sheet.getRange(row, P_COL_SF_ID).getValue();
    if (existing && existing.toString().trim() !== '') return; // already sent

    _sendPathaoRow(sheet, row);
  } catch (err) {
    // Triggers must never throw — swallow and move on.
  }
}

// ── Manual fallback: scan today's rows and send any pending Pathao ones ──
function sendTodayToPathao() {
  var ui    = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.openById(PATHAO_SHEET_ID).getSheetByName(PATHAO_SHEET_NAME);
  var today = new Date();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert('কোনো অর্ডার নেই।'); return; }

  var sent = 0, failed = 0, skipped = 0, notMarked = 0;

  for (var r = 2; r <= lastRow; r++) {
    var dateVal = sheet.getRange(r, 1).getValue();
    if (!dateVal) continue;
    var d = new Date(dateVal);
    if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth() || d.getDate() !== today.getDate()) continue;

    var dispatch = sheet.getRange(r, P_COL_DISPATCH).getValue().toString().trim();
    var confirm  = sheet.getRange(r, P_COL_CONFIRM).getValue();
    if (dispatch !== 'Send to Pathao' || confirm !== true) { notMarked++; continue; }

    var existing = sheet.getRange(r, P_COL_SF_ID).getValue();
    if (existing && existing.toString().trim() !== '') { skipped++; continue; }

    var ok = _sendPathaoRow(sheet, r);
    if (ok) sent++; else failed++;
    Utilities.sleep(300);
  }

  ui.alert('📅 আজকের Pathao Result',
    '✅ পাঠানো: ' + sent + ' টি\n❌ Failed: ' + failed + ' টি\n⏭ আগেই পাঠানো: ' + skipped + ' টি\n⏸ Mark নেই: ' + notMarked + ' টি',
    ui.ButtonSet.OK);
}

// ── Shared send logic used by both the trigger and the manual scan ──
function _sendPathaoRow(sheet, row) {
  var orderId = (sheet.getRange(row, P_COL_ORDER_ID).getValue() || ('NRICH-ROW-' + row)).toString();
  var name    = (sheet.getRange(row, P_COL_NAME).getValue() || 'Customer').toString();
  var phone   = (sheet.getRange(row, P_COL_PHONE).getValue() || '').toString().trim();
  var address = (sheet.getRange(row, P_COL_ADDRESS).getValue() || '').toString().trim();
  var zone    = (sheet.getRange(row, P_COL_ZONE).getValue() || '').toString();
  var total   = parseFloat(sheet.getRange(row, P_COL_TOTAL).getValue()) || 0;
  var items   = (sheet.getRange(row, P_COL_ITEMS).getValue() || '').toString();
  var note    = (sheet.getRange(row, P_COL_NOTE).getValue() || '').toString();

  if (!phone || !address) {
    sheet.getRange(row, P_COL_SF_STATUS).setValue('❌ ফোন/ঠিকানা নেই');
    return false;
  }

  var result = callPathao({
    merchant_order_id:   orderId,
    recipient_name:      name,
    recipient_phone:     phone,
    recipient_address:   address,
    special_instruction: [zone, note].filter(Boolean).join(' | '),
    item_description:    items,
    amount_to_collect:   total
  });

  if (result.ok) {
    sheet.getRange(row, P_COL_SF_STATUS).setValue('✅ পাঠানো হয়েছে (Pathao)');
    sheet.getRange(row, P_COL_SF_ID).setValue(result.consignment_id);
    sheet.getRange(row, P_COL_SF_TRACK).setValue(result.tracking_code);
    sheet.getRange(row, P_COL_STATUS).setValue('Pathao-এ পাঠানো হয়েছে');
    return true;
  } else {
    sheet.getRange(row, P_COL_SF_STATUS).setValue('❌ ' + result.error);
    return false;
  }
}

// ── Get (or refresh) access token ───────────────────────────────
function _getPathaoToken() {
  var props  = PropertiesService.getScriptProperties();
  var token  = props.getProperty('PATHAO_ACCESS_TOKEN');
  var expiry = parseInt(props.getProperty('PATHAO_TOKEN_EXPIRY') || '0', 10);

  if (token && Date.now() < expiry - 5 * 60 * 1000) {
    return token;
  }

  var resp = UrlFetchApp.fetch(PATHAO_BASE_URL + '/aladdin/api/v1/issue-token', {
    method:      'POST',
    contentType: 'application/json',
    payload: JSON.stringify({
      client_id:     PATHAO_CLIENT_ID,
      client_secret: PATHAO_CLIENT_SECRET,
      grant_type:    'password',
      username:      PATHAO_USERNAME,
      password:      PATHAO_PASSWORD
    }),
    muteHttpExceptions: true
  });

  var body = {};
  try { body = JSON.parse(resp.getContentText()); } catch(e) {}
  if (!body.access_token) {
    throw new Error('Pathao token fetch failed: ' + resp.getContentText());
  }

  props.setProperty('PATHAO_ACCESS_TOKEN', body.access_token);
  props.setProperty('PATHAO_TOKEN_EXPIRY', (Date.now() + body.expires_in * 1000).toString());
  return body.access_token;
}

// ── Create order via Pathao ─────────────────────────────────────
function callPathao(data) {
  try {
    var token = _getPathaoToken();

    var payload = {
      store_id:            PATHAO_STORE_ID,
      merchant_order_id:   data.merchant_order_id,
      recipient_name:      data.recipient_name,
      recipient_phone:     data.recipient_phone,
      recipient_address:   data.recipient_address,
      delivery_type:       48,   // Normal Delivery
      item_type:           2,    // Parcel
      special_instruction: data.special_instruction || '',
      item_quantity:       1,
      item_weight:         0.5,
      item_description:    data.item_description || '',
      amount_to_collect:   Math.round(data.amount_to_collect) || 0
    };

    var resp = UrlFetchApp.fetch(PATHAO_BASE_URL + '/aladdin/api/v1/orders', {
      method:      'POST',
      contentType: 'application/json',
      headers:     { 'Authorization': 'Bearer ' + token },
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = resp.getResponseCode();
    var body = {};
    try { body = JSON.parse(resp.getContentText()); } catch(e) {}

    if (code === 200 && body.type === 'success') {
      var d = body.data || {};
      return { ok: true, consignment_id: d.consignment_id || '', tracking_code: d.consignment_id || '' };
    }

    var errMsg = body.message || ('HTTP ' + code);
    if (body.errors) errMsg += ' — ' + JSON.stringify(body.errors);
    return { ok: false, error: errMsg };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── One-time: install the onEdit trigger (run manually once) ────
function createPathaoEditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onPathaoEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onPathaoEdit')
    .forSpreadsheet(PATHAO_SHEET_ID)
    .onEdit()
    .create();
  Logger.log('Pathao onEdit trigger created!');
}

// ── Auth test (optional, run manually to verify credentials) ────
function testPathaoAuth() {
  var token = _getPathaoToken();
  Logger.log('Pathao token: ' + token);
}
