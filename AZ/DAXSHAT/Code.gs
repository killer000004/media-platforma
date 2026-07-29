const SHEET_ID = '1q79wrM9kEVWaalvsPVUBZqAyKUl4OToH_QRIF3DtKTA';

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  if (e?.parameter?.action) {
    return handleJsonApi(e);
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('DAXSHAT - Talabalarni boshqarish tizimi')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleJsonApi(e) {
  const action = e.parameter.action;
  const ss = getSS();
  if (action === 'getStudents') {
    const sheet = ss.getSheetByName('Students') || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getUsers') {
    const sheet = ss.getSheetByName('Users') || ss.getSheets()[1];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'getGroups') {
    const sheet = ss.getSheetByName('Groups') || ss.getSheets()[2];
    const data = sheet.getDataRange().getValues();
    const rows = data.filter(r => r.join('').trim() !== '');
    return ContentService.createTextOutput(JSON.stringify({ rows })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
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
  const result = executeAction(params);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetByNameOrIndex(ss, name, index) {
  return ss.getSheetByName(name) || ss.getSheets()[index];
}

function executeAction(params) {
  const action = params.action || '';
  const ss = getSS();
  if (action === 'addStudent') {
    const sheet = getSheetByNameOrIndex(ss, 'Students', 0);
    sheet.appendRow(params.data || []);
    return { success: true };
  }
  if (action === 'deleteStudent') {
    const sheet = getSheetByNameOrIndex(ss, 'Students', 0);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetGroup = (params.data?.group || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][1] || '').toString().trim();
      const rowGroup = (allData[i][4] || '').toString().trim();
      if (rowName === targetName && rowGroup === targetGroup) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
  }
  if (action === 'addUser') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const d = params.data || {};
    sheet.appendRow([d.name || '', d.login || '', d.pass || '', d.groups || '', d.perms || 'students_view,student_add,student_edit,student_delete,excel_export,statistics_view']);
    return { success: true };
  }
  if (action === 'deleteUser') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
  }
  if (action === 'updateUserGroups') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 4).setValue(params.data?.groups || ''); break; }
    }
    return { success: true };
  }
  if (action === 'updateUserPerms') {
    const sheet = getSheetByNameOrIndex(ss, 'Users', 1);
    const allData = sheet.getDataRange().getValues();
    const targetLogin = (params.data?.login || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      if ((allData[i][1] || '').toString().trim() === targetLogin) { sheet.getRange(i + 1, 5).setValue(params.data?.perms || ''); break; }
    }
    return { success: true };
  }
  if (action === 'addGroup') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const d = params.data || {};
    sheet.appendRow([d.name || '', d.direction || '', d.course || '']);
    return { success: true };
  }
  if (action === 'deleteGroup') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetDir = (params.data?.direction || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][0] || '').toString().trim();
      const rowDir = (allData[i][1] || '').toString().trim();
      if (rowName === targetName && rowDir === targetDir) { sheet.deleteRow(i + 1); break; }
    }
    return { success: true };
  }
  if (action === 'updateGroupCourse') {
    const sheet = getSheetByNameOrIndex(ss, 'Groups', 2);
    const allData = sheet.getDataRange().getValues();
    const targetName = (params.data?.name || '').trim();
    const targetDir = (params.data?.direction || '').trim();
    for (let i = allData.length - 1; i >= 0; i--) {
      const rowName = (allData[i][0] || '').toString().trim();
      const rowDir = (allData[i][1] || '').toString().trim();
      if (rowName === targetName && rowDir === targetDir) { sheet.getRange(i + 1, 3).setValue(params.data?.course || ''); break; }
    }
    return { success: true };
  }
  return { error: 'Unknown action' };
}

// Server functions for google.script.run
function getStudentsData() { return JSON.parse(JSON.stringify({ rows: getSheetData('Students', 0) })); }
function getUsersData() { return JSON.parse(JSON.stringify({ rows: getSheetData('Users', 1) })); }
function getGroupsData() { return JSON.parse(JSON.stringify({ rows: getSheetData('Groups', 2) })); }

function getSheetData(name, index) {
  const sheet = getSheetByNameOrIndex(getSS(), name, index);
  const data = sheet.getDataRange().getValues();
  return data.filter(r => r.join('').trim() !== '');
}

function addStudent(data) { return executeAction({ action: 'addStudent', data }); }
function deleteStudent(data) { return executeAction({ action: 'deleteStudent', data }); }
function addUser(data) { return executeAction({ action: 'addUser', data }); }
function deleteUser(data) { return executeAction({ action: 'deleteUser', data }); }
function updateUserGroups(data) { return executeAction({ action: 'updateUserGroups', data }); }
function updateUserPerms(data) { return executeAction({ action: 'updateUserPerms', data }); }
function addGroup(data) { return executeAction({ action: 'addGroup', data }); }
function deleteGroup(data) { return executeAction({ action: 'deleteGroup', data }); }
function updateGroupCourse(data) { return executeAction({ action: 'updateGroupCourse', data }); }
