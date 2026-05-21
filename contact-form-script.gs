// ============================================================
// NRICH — Contact Form Google Apps Script
// ============================================================
// Steps to deploy:
// 1. Go to script.google.com → New Project
// 2. Delete default code, paste ALL of this file
// 3. Click Deploy → New Deployment
// 4. Type: Web app
// 5. Execute as: Me
// 6. Who has access: Anyone
// 7. Click Deploy → Copy the Web App URL
// 8. Paste URL into _config.yml → contact_endpoint
// 9. git add _config.yml && git commit -m "Add contact endpoint" && git push
// ============================================================

var SPREADSHEET_ID = '1Na8kkP4cH-Txdn9gPRjZSJs9JIE-Aju13cdlsfrT22Y';
var SHEET_NAME     = 'Contact Messages';

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet + headers if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      var headers = ['তারিখ', 'নাম', 'ফোন', 'ইমেইল', 'বিষয়', 'বার্তা'];
      sheet.appendRow(headers);
      var hRange = sheet.getRange(1, 1, 1, headers.length);
      hRange.setFontWeight('bold');
      hRange.setBackground('#0d0d0d');
      hRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 140);
      sheet.setColumnWidth(2, 140);
      sheet.setColumnWidth(3, 130);
      sheet.setColumnWidth(4, 200);
      sheet.setColumnWidth(5, 140);
      sheet.setColumnWidth(6, 400);
    }

    // Parse incoming data — URL-encoded (e.parameter) or JSON fallback
    var data = {};
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } else if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) {}
    }

    // Bangladesh timestamp
    var bdTime = Utilities.formatDate(new Date(), 'Asia/Dhaka', 'dd/MM/yyyy HH:mm:ss');

    // Append the new row
    sheet.appendRow([
      bdTime,
      data.name    || '',
      data.phone   || '',
      data.email   || '',
      data.subject || '',
      data.message || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: 'true' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: 'false', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Health check — visiting the URL in browser shows this
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'NRICH Contact Form endpoint is active' }))
    .setMimeType(ContentService.MimeType.JSON);
}
