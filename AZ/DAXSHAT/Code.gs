function doGet(e) {
  const action = e?.parameter?.action || '';
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getStudents') {
    const sheet = ss.getSheetByName('Students');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    return ContentService.createTextOutput(JSON.stringify({ headers, rows: data })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getUsers') {
    const sheet = ss.getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    return ContentService.createTextOutput(JSON.stringify({ headers, rows: data })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getGroups') {
    const sheet = ss.getSheetByName('Groups');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    return ContentService.createTextOutput(JSON.stringify({ headers, rows: data })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let jsonStr;
    if (e.postData && e.postData.contents) {
      const raw = e.postData.contents;
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
    const params = JSON.parse(jsonStr);
    const action = params.action || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'addStudent') {
      const sheet = ss.getSheetByName('Students');
      sheet.appendRow(params.data || []);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteStudent') {
      const sheet = ss.getSheetByName('Students');
      const allData = sheet.getDataRange().getValues();
      const targetName = (params.data?.name || '').trim();
      const targetGroup = (params.data?.group || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetName && (allData[i][4] || '').toString().trim() === targetGroup) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'addUser') {
      const sheet = ss.getSheetByName('Users');
      const d = params.data || {};
      sheet.appendRow([d.name || '', d.login || '', d.pass || '', d.groups || '', d.perms || 'students_view,student_add,student_edit,student_delete,excel_export,statistics_view']);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteUser') {
      const sheet = ss.getSheetByName('Users');
      const allData = sheet.getDataRange().getValues();
      const targetLogin = (params.data?.login || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateUserGroups') {
      const sheet = ss.getSheetByName('Users');
      const allData = sheet.getDataRange().getValues();
      const targetLogin = (params.data?.login || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 4).setValue(params.data?.groups || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateUserPerms') {
      const sheet = ss.getSheetByName('Users');
      const allData = sheet.getDataRange().getValues();
      const targetLogin = (params.data?.login || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 5).setValue(params.data?.perms || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'addGroup') {
      const sheet = ss.getSheetByName('Groups');
      const d = params.data || {};
      sheet.appendRow([d.name || '', d.direction || '', d.course || '']);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'deleteGroup') {
      const sheet = ss.getSheetByName('Groups');
      const allData = sheet.getDataRange().getValues();
      const targetName = (params.data?.name || '').trim();
      const targetDir = (params.data?.direction || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][0] || '').toString().trim() === targetName && (allData[i][1] || '').toString().trim() === targetDir) { sheet.deleteRow(i + 1); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'updateGroupCourse') {
      const sheet = ss.getSheetByName('Groups');
      const allData = sheet.getDataRange().getValues();
      const targetName = (params.data?.name || '').trim();
      const targetDir = (params.data?.direction || '').trim();
      for (let i = allData.length - 1; i >= 0; i--) {
        if ((allData[i][0] || '').toString().trim() === targetName && (allData[i][1] || '').toString().trim() === targetDir) { sheet.getRange(i + 1, 3).setValue(params.data?.course || ''); break; }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
