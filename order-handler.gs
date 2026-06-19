// ============================================================
// NRICH — Order Handler Google Apps Script
// ============================================================
// Deploy steps:
// 1. Go to the GAS project linked to the NRICH Orders sheet
//    (Extensions → Apps Script from the Google Sheet)
// 2. Delete all existing code, paste this entire file
// 3. Click Deploy → Manage Deployments
// 4. Edit the existing deployment → New version → Deploy
//    (URL stays the same — no need to update _config.yml)
// ============================================================

var SPREADSHEET_ID = '1Na8kkP4cH-Txdn9gPRjZSJs9JlE-Aju13cdIsfrT22Y';
var SHEET_NAME     = 'NRICH Orders';

var COL_DATE     = 1;   // A তারিখ
var COL_ORDER_ID = 2;   // B Order ID
var COL_NAME     = 3;   // C নাম
var COL_PHONE    = 4;   // D ফোন
var COL_ADDRESS  = 5;   // E ঠিকানা
var COL_ZONE     = 6;   // F জোন
var COL_SUBTOTAL = 7;   // G সাবটোটাল
var COL_DELIVERY = 8;   // H ডেলিভারি
var COL_TOTAL    = 9;   // I মোট
var COL_PAYMENT  = 10;  // J পেমেন্ট
var COL_ITEMS    = 11;  // K পণ্য
var COL_NOTE     = 12;  // L নোট
var COL_STATUS   = 13;  // M স্ট্যাটাস
var COL_DISPATCH = 14;  // N dispatch_action

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      setupHeaders(sheet);
    }

    var data = {};
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (_) {}
    }

    var bdTime = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'dd/MM/yyyy HH:mm:ss');

    var items = [];
    try { items = JSON.parse(data.items || '[]'); } catch (_) {}

    var itemsText = items.map(function(i) {
      return (i.name || '') + ' x' + (i.quantity || 1) + ' = ৳' + (i.price || 0);
    }).join(', ');

    var row = new Array(COL_DISPATCH).fill('');
    row[COL_DATE     - 1] = bdTime;
    row[COL_ORDER_ID - 1] = data.order_id         || '';
    row[COL_NAME     - 1] = data.customer_name     || '';
    row[COL_PHONE    - 1] = data.customer_phone    || '';
    row[COL_ADDRESS  - 1] = data.customer_address  || '';
    row[COL_ZONE     - 1] = data.customer_zone     || data.shipping_zone || '';
    row[COL_SUBTOTAL - 1] = parseFloat(data.subtotal)       || 0;
    row[COL_DELIVERY - 1] = parseFloat(data.shipping_charge) || 0;
    row[COL_TOTAL    - 1] = parseFloat(data.total)           || 0;
    row[COL_PAYMENT  - 1] = data.payment_method    || 'Cash on Delivery';
    row[COL_ITEMS    - 1] = itemsText;
    row[COL_NOTE     - 1] = data.customer_note     || '';
    row[COL_STATUS   - 1] = 'নতুন অর্ডার';

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, order_id: data.order_id }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'NRICH Order Handler active' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupHeaders(sheet) {
  var headers = [
    'তারিখ', 'Order ID', 'নাম', 'ফোন', 'ঠিকানা',
    'জোন', 'সাবটোটাল', 'ডেলিভারি', 'মোট',
    'পেমেন্ট', 'পণ্য', 'নোট', 'স্ট্যাটাস', 'dispatch_action'
  ];
  sheet.appendRow(headers);
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setFontWeight('bold');
  hRange.setBackground('#0d0d0d');
  hRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}
