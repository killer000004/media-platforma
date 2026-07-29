const SHEET_ID = '1q79wrM9kEVWaalvsPVUBZqAyKUl4OToH_QRIF3DtKTA';

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  const action = e?.parameter?.action || '';
  const ss = getSS();
  const allSheets = ss.getSheets().map(s => s.getName());
  if (action === 'getStudents') {
    const sheet = ss.getSheetByName('Students') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows, sheets: allSheets }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getUsers') {
    const sheet = ss.getSheetByName('Users') || ss.getSheets()[1];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows, sheets: allSheets }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getGroups') {
    const sheet = ss.getSheetByName('Groups') || ss.getSheets()[2];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows, sheets: allSheets }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action', sheets: allSheets }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetByNameOrIndex(ss, name, index) {
  return ss.getSheetByName(name) || ss.getSheets()[index];
}

function doPost(e) {
  const raw = e.postData.contents;
  let jsonStr = raw;
  if (raw.indexOf('payload=') === 0) {
    jsonStr = decodeURIComponent(raw.substring(8).replace(/\+/g, ' '));
  }
  const params = JSON.parse(jsonStr);
  const action = params.action || '';
  const ss = getSS();

  if (action === 'addStudent') {
    const sheet = getSheetByNameOrIndex(ss, 'Students', 0);
    const data = params.data || [];
    sheet.appendRow(data);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'deleteStudent') {
    const sheet = getSheetByNameOrIndex(ss, 'Students', 0);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetGroup = (params.data?.group || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][1] || '').toString().trim();
      const rowGroup = (allData[i][4] || '').toString().trim();
      if (rowName === targetName && rowGroup === targetGroup) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'addUser') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const d = params.data || {};
    const perms = d.perms || 'students_view,student_add,student_edit,student_delete,excel_export,statistics_view';
    sheet.appendRow([d.name || '', d.login || '', d.pass || '', d.groups || '', perms]);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'deleteUser') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowLogin = (allData[i][1] || '').toString().trim();
      if (rowLogin === targetLogin) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'updateUserGroups') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    const newGroups = params.data?.groups || '';
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowLogin = (allData[i][1] || '').toString().trim();
      if (rowLogin === targetLogin) {
        sheet.getRange(i + 1, 4).setValue(newGroups);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'updateUserPerms') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    const newPerms = params.data?.perms || '';
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowLogin = (allData[i][1] || '').toString().trim();
      if (rowLogin === targetLogin) {
        sheet.getRange(i + 1, 5).setValue(newPerms);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'addGroup') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const d = params.data || {};
    sheet.appendRow([d.name || '', d.direction || '', d.course || '']);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'deleteGroup') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetDir = (params.data?.direction || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][0] || '').toString().trim();
      const rowDir = (allData[i][1] || '').toString().trim();
      if (rowName === targetName && rowDir === targetDir) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'updateGroupCourse') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetDir = (params.data?.direction || '').trim();
    const newCourse = params.data?.course || '';
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][0] || '').toString().trim();
      const rowDir = (allData[i][1] || '').toString().trim();
      if (rowName === targetName && rowDir === targetDir) {
        sheet.getRange(i + 1, 3).setValue(newCourse);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
