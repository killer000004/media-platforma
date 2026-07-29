const SHEET_ID = '1zSsaOgZ1_hwO9CVJR-1B00AUCDgxJ0rQkHnPjBmFwNk';

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetByNameOrIndex(ss, name, index) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  var sheets = ss.getSheets();
  return sheets[index] || ss.insertSheet(name, sheets.length);
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action || '';
  var ss = getSS();
  ensureSheetsExist(ss);
  var allSheets = ss.getSheets().map(function(s) { return s.getName(); });
  if (action === 'getStudents') {
    var sheet = ss.getSheetByName('Students') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var rows = data.filter(function(r) {
      var joined = r.join('').trim();
      if (joined === '') return false;
      if (typeof r[1] === 'string' && r[1].indexOf('Ism familiya') !== -1) return false;
      return true;
    });
    return ContentService.createTextOutput(JSON.stringify({ rows: rows, sheets: allSheets })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getUsers') {
    var sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    var data = sheet.getDataRange().getValues();
    var rows = data.filter(function(r) { return r.join('').trim() !== ''; });
    return ContentService.createTextOutput(JSON.stringify({ rows: rows, sheets: allSheets })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getGroups') {
    var sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    var data = sheet.getDataRange().getValues();
    var rows = data.filter(function(r) { return r.join('').trim() !== ''; });
    return ContentService.createTextOutput(JSON.stringify({ rows: rows, sheets: allSheets })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action', sheets: allSheets })).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheetsExist(ss) {
  var names = ss.getSheets().map(function(s) { return s.getName(); });
  if (names.indexOf('Users') === -1) ss.insertSheet('Users');
  if (names.indexOf('Groups') === -1) ss.insertSheet('Groups');
}

function doPost(e) {
  try {
    var jsonStr;
    if (e.postData && e.postData.contents) {
      var raw = e.postData.contents;
      if (raw.indexOf('payload=') === 0) {
        jsonStr = decodeURIComponent(raw.substring(8).replace(/\+/g, ' '));
      } else {
        jsonStr = raw;
      }
    } else if (e.parameter && e.parameter.payload) {
      jsonStr = e.parameter.payload;
    } else {
      return ContentService.createTextOutput(JSON.stringify({ error: 'No data' })).setMimeType(ContentService.MimeType.JSON);
    }
    var params = JSON.parse(jsonStr);
    var action = params.action || '';
    var ss = getSS();
    ensureSheetsExist(ss);
    if (action === 'addStudent') {
      var sheet = getSheetByNameOrIndex(ss, 'Students', 0);
      sheet.appendRow(params.data || []);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'deleteStudent') {
      var sheet = getSheetByNameOrIndex(ss, 'Students', 0);
      var allData = sheet.getDataRange().getValues();
      var targetName = (params.data && params.data.name || '').toString().trim();
      var targetGroup = (params.data && params.data.group || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetName && (allData[i][4] || '').toString().trim() === targetGroup) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addUser') {
      var sheet = getSheetByNameOrIndex(ss, 'Users', 1);
      var d = params.data || {};
      sheet.appendRow([d.name || '', d.login || '', d.pass || '', d.groups || '', d.perms || 'students_view,student_add,student_edit,student_delete,excel_export,statistics_view']);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'deleteUser') {
      var sheet = getSheetByNameOrIndex(ss, 'Users', 1);
      var allData = sheet.getDataRange().getValues();
      var targetLogin = (params.data && params.data.login || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'updateUserGroups') {
      var sheet = getSheetByNameOrIndex(ss, 'Users', 1);
      var allData = sheet.getDataRange().getValues();
      var targetLogin = (params.data && params.data.login || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 4).setValue(params.data && params.data.groups || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'updateUserPerms') {
      var sheet = getSheetByNameOrIndex(ss, 'Users', 1);
      var allData = sheet.getDataRange().getValues();
      var targetLogin = (params.data && params.data.login || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 5).setValue(params.data && params.data.perms || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'addGroup') {
      var sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
      var d = params.data || {};
      sheet.appendRow([d.name || '', d.direction || '', d.course || '']);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'deleteGroup') {
      var sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
      var allData = sheet.getDataRange().getValues();
      var targetName = (params.data && params.data.name || '').toString().trim();
      var targetDir = (params.data && params.data.direction || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][0] || '').toString().trim() === targetName && (allData[i][1] || '').toString().trim() === targetDir) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'updateGroupCourse') {
      var sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
      var allData = sheet.getDataRange().getValues();
      var targetName = (params.data && params.data.name || '').toString().trim();
      var targetDir = (params.data && params.data.direction || '').toString().trim();
      for (var i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][0] || '').toString().trim() === targetName && (allData[i][1] || '').toString().trim() === targetDir) { sheet.getRange(i + 1, 3).setValue(params.data && params.data.course || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
