// ╔══════════════════════════════════════════════════════════════╗
// ║       ChemVeda Test Series — Google Apps Script Backend      ║
// ║                                                              ║
// ║  SETUP STEPS:                                                ║
// ║  1. script.google.com → New Project → paste this code        ║
// ║  2. Set SPREADSHEET_ID below to your Google Sheet ID         ║
// ║  3. Run setupSheets() once to create all formatted sheets    ║
// ║  4. Deploy → New Deployment → Web App                        ║
// ║     • Execute as: Me  •  Access: Anyone                      ║
// ║  5. Paste the Web App URL in index.html and admin HTML       ║
// ╚══════════════════════════════════════════════════════════════╝

const SPREADSHEET_ID = '1masqnQ3CUpx49SlQhdbk_NC-DNPeCPzdpWlLGlKeOis';

// ══════════════════════════════════════════════════════════════════
//  GET HANDLER
// ══════════════════════════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action;
  let result = {};
  try {
    switch (action) {
      case 'getTest':        result = getTest(e.parameter.date); break;
      case 'getTestById':    result = getTestById(e.parameter.testId); break;
      case 'loginStudent':   result = loginStudent(e.parameter.rollNo, e.parameter.password); break;
      case 'getLeaderboard': result = getLeaderboard(e.parameter.testId); break;
      case 'getStudents':    result = getStudents(); break;
      case 'getAllTests':     result = getAllTests(); break;
      case 'getLast7Tests':  result = getLast7Tests(); break;
      default: result = { success: false, message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════
//  POST HANDLER
// ══════════════════════════════════════════════════════════════════
function doPost(e) {
  const action = e.parameter.action;
  let result = {};
  try {
    switch (action) {
      case 'registerStudent': result = registerStudent(e.parameter); break;
      case 'submitResult':    result = submitResult(e.parameter); break;
      case 'postTest':        result = postTest(e.parameter); break;
      default: result = { success: false, message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.toString() };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════
//  SHEET HELPER
// ══════════════════════════════════════════════════════════════════
function getOrCreateSheet(name, headers, headerColor) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const hdrRange = sheet.getRange(1, 1, 1, headers.length);
    hdrRange.setBackground(headerColor || '#1a237e');
    hdrRange.setFontColor('#ffffff');
    hdrRange.setFontWeight('bold');
    hdrRange.setHorizontalAlignment('center');
    sheet.setColumnWidths(1, headers.length, 140);
  }
  return sheet;
}

function nowIST() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy HH:mm:ss');
}
function todayIST() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
}

// ══════════════════════════════════════════════════════════════════
//  DATE NORMALIZER — handles Date objects, dd/MM/yyyy, yyyy-MM-dd
// ══════════════════════════════════════════════════════════════════
function normDateGAS(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Kolkata', 'yyyy-MM-dd');
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // dd/MM/yyyy or d/M/yyyy
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  return s;
}

// ══════════════════════════════════════════════════════════════════
//  STUDENTS
//  Columns: SNo | RollNo | Name | Password | Class | RegisteredOn
// ══════════════════════════════════════════════════════════════════
function registerStudent(params) {
  const sheet = getOrCreateSheet('Students',
    ['S.No', 'RollNo', 'Name', 'Password', 'Class', 'Registered On'], '#0d47a1');
  const data = sheet.getDataRange().getValues();

  // Duplicate check
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === String(params.rollNo).toLowerCase()) {
      return { success: false, message: 'Username already taken. Please choose another or login.' };
    }
  }

  const sno = data.length; // auto serial number
  sheet.appendRow([sno, params.rollNo.trim(), params.name.trim(), params.password, params.class.trim(), nowIST()]);

  // Style the new row
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, 6).setBackground(lastRow % 2 === 0 ? '#e8eaf6' : '#ffffff');
  sheet.getRange(lastRow, 1).setHorizontalAlignment('center');

  return { success: true, message: 'Registration successful' };
}

function loginStudent(rollNo, password) {
  const sheet = getOrCreateSheet('Students',
    ['S.No', 'RollNo', 'Name', 'Password', 'Class', 'Registered On'], '#0d47a1');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][1]).toLowerCase() === String(rollNo).toLowerCase() &&
      String(data[i][3]) === String(password)
    ) {
      return {
        success: true,
        student: { rollNo: String(data[i][1]), name: String(data[i][2]), class: String(data[i][4]) }
      };
    }
  }
  return { success: false, message: 'Invalid username or password. Please try again.' };
}

function getStudents() {
  const sheet = getOrCreateSheet('Students',
    ['S.No', 'RollNo', 'Name', 'Password', 'Class', 'Registered On'], '#0d47a1');
  const data = sheet.getDataRange().getValues();
  const students = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) students.push({ rollNo: String(data[i][1]), name: String(data[i][2]), class: String(data[i][4]) });
  }
  return { success: true, students, total: students.length };
}

// ══════════════════════════════════════════════════════════════════
//  TESTS
//  Columns: TestID | Date | Title | Subject | Timer | Questions | Active
// ══════════════════════════════════════════════════════════════════
function postTest(params) {
  const sheet = getOrCreateSheet('Tests',
    ['Test ID', 'Date', 'Title', 'Subject', 'Timer (min)', 'Questions (JSON)', 'Active'], '#4a148c');
  const testId = 'CV_' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd') + '_' + new Date().getTime().toString().slice(-4);

  sheet.appendRow([testId, params.date, params.title.trim(), params.subject.trim(), parseInt(params.timer), params.questions, true]);

  const lastRow = sheet.getLastRow();
  const rowRange = sheet.getRange(lastRow, 1, 1, 7);
  rowRange.setBackground(lastRow % 2 === 0 ? '#f3e5f5' : '#ffffff');
  // Highlight TestID column
  sheet.getRange(lastRow, 1).setFontWeight('bold').setFontColor('#4a148c');

  return { success: true, testId };
}

function getTest(date) {
  const sheet = getOrCreateSheet('Tests',
    ['Test ID', 'Date', 'Title', 'Subject', 'Timer (min)', 'Questions (JSON)', 'Active'], '#4a148c');
  const data = sheet.getDataRange().getValues();
  const targetNorm = normDateGAS(date || todayIST());

  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = normDateGAS(data[i][1]);
    if (rowDate === targetNorm && data[i][6] === true) {
      try {
        return { success: true, test: _buildTest(data[i]) };
      } catch (err) {
        return { success: false, message: 'Test data corrupted: ' + err.toString() };
      }
    }
  }
  return { success: false, message: 'No test found for ' + targetNorm };
}

function getTestById(testId) {
  const sheet = getOrCreateSheet('Tests',
    ['Test ID', 'Date', 'Title', 'Subject', 'Timer (min)', 'Questions (JSON)', 'Active'], '#4a148c');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(testId)) {
      try { return { success: true, test: _buildTest(data[i]) }; }
      catch(e) { return { success: false, message: 'Test data corrupted' }; }
    }
  }
  return { success: false, message: 'Test not found' };
}

function _buildTest(row) {
  return {
    id: String(row[0]),
    date: normDateGAS(row[1]),
    title: String(row[2]),
    subject: String(row[3]),
    timer: Number(row[4]),
    questions: JSON.parse(row[5])
  };
}

function getAllTests() {
  const sheet = getOrCreateSheet('Tests',
    ['Test ID', 'Date', 'Title', 'Subject', 'Timer (min)', 'Questions (JSON)', 'Active'], '#4a148c');
  const data = sheet.getDataRange().getValues();
  const tests = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0]) {
      tests.push({ id: String(data[i][0]), date: normDateGAS(data[i][1]), title: String(data[i][2]), subject: String(data[i][3]), timer: Number(data[i][4]), active: data[i][6] });
    }
    if (tests.length >= 30) break;
  }
  return { success: true, tests };
}

// Returns last 7 days active tests for leaderboard selector
function getLast7Tests() {
  const sheet = getOrCreateSheet('Tests',
    ['Test ID', 'Date', 'Title', 'Subject', 'Timer (min)', 'Questions (JSON)', 'Active'], '#4a148c');
  const data = sheet.getDataRange().getValues();
  const tests = [];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);

  for (let i = data.length - 1; i >= 1; i--) {
    if (!data[i][0] || data[i][6] !== true) continue;
    const rowDate = normDateGAS(data[i][1]);
    if (new Date(rowDate) >= cutoff) {
      tests.push({ id: String(data[i][0]), date: rowDate, title: String(data[i][2]), subject: String(data[i][3]), timer: Number(data[i][4]) });
    }
    if (tests.length >= 7) break;
  }
  return { success: true, tests };
}

// ══════════════════════════════════════════════════════════════════
//  RESULTS — Branded sheet with grade, class, full test info
//  Columns: S.No | Date | RollNo | Student Name | Class | Test ID |
//           Test Title | Subject | Score | Total | % | Grade |
//           Time (sec) | Time (formatted) | Submitted On
// ══════════════════════════════════════════════════════════════════
function submitResult(params) {
  const HEADERS = [
    'S.No', 'Date', 'RollNo', 'Student Name', 'Class',
    'Test ID', 'Test Title', 'Subject',
    'Score', 'Total', 'Percentage (%)', 'Grade',
    'Time (sec)', 'Time (formatted)', 'Submitted On'
  ];
  const sheet = getOrCreateSheet('Results', HEADERS, '#b71c1c');

  const data = sheet.getDataRange().getValues();

  // Block duplicate submission
  for (let i = 1; i < data.length; i++) {
    if (
      String(data[i][2]).toLowerCase() === String(params.rollNo).toLowerCase() &&
      String(data[i][5]) === String(params.testId)
    ) {
      return { success: false, message: 'Already submitted this test.' };
    }
  }

  const sno = data.length;
  const score = parseInt(params.score);
  const total = parseInt(params.total);
  const pct   = parseInt(params.percentage);
  const sec   = parseInt(params.timeTaken);
  const mins  = Math.floor(sec / 60), secs = sec % 60;
  const timeFmt = `${mins}m ${secs}s`;

  // Grade logic
  let grade = 'F';
  if (pct >= 90) grade = 'A+';
  else if (pct >= 80) grade = 'A';
  else if (pct >= 70) grade = 'B+';
  else if (pct >= 60) grade = 'B';
  else if (pct >= 50) grade = 'C';
  else if (pct >= 40) grade = 'D';

  const todayStr = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MMM-yyyy');

  sheet.appendRow([
    sno,
    todayStr,
    String(params.rollNo),
    String(params.studentName),
    String(params.studentClass || ''),
    String(params.testId),
    String(params.testTitle || ''),
    String(params.testSubject || ''),
    score,
    total,
    pct,
    grade,
    sec,
    timeFmt,
    nowIST()
  ]);

  // Color-code row by grade
  const lastRow = sheet.getLastRow();
  let rowColor = '#ffffff';
  if (pct >= 80)      rowColor = '#e8f5e9'; // green tint
  else if (pct >= 60) rowColor = '#fff9c4'; // yellow tint
  else if (pct < 40)  rowColor = '#ffebee'; // red tint
  else                rowColor = '#fff3e0'; // orange tint

  sheet.getRange(lastRow, 1, 1, HEADERS.length).setBackground(rowColor);
  // Bold the grade cell
  sheet.getRange(lastRow, 12).setFontWeight('bold');
  // Center align numeric columns
  sheet.getRange(lastRow, 9, 1, 6).setHorizontalAlignment('center');
  sheet.getRange(lastRow, 1).setHorizontalAlignment('center');

  return { success: true, message: 'Result saved successfully.' };
}

function getLeaderboard(testId) {
  const sheet = getOrCreateSheet('Results',
    ['S.No','Date','RollNo','Student Name','Class','Test ID','Test Title','Subject','Score','Total','Percentage (%)','Grade','Time (sec)','Time (formatted)','Submitted On'], '#b71c1c');
  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][5]) === String(testId)) {
      results.push({
        rollNo:       String(data[i][2]),
        name:         String(data[i][3]),
        studentClass: String(data[i][4]),
        score:        Number(data[i][8]),
        total:        Number(data[i][9]),
        percentage:   Number(data[i][10]),
        grade:        String(data[i][11]),
        timeTaken:    Number(data[i][12])
      });
    }
  }

  // Sort: highest score first → fastest time second
  results.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);
  return { success: true, leaderboard: results, count: results.length };
}

// ══════════════════════════════════════════════════════════════════
//  SETUP — Run once to create all sheets with proper formatting
// ══════════════════════════════════════════════════════════════════
function setupSheets() {
  getOrCreateSheet('Students',
    ['S.No','RollNo','Name','Password','Class','Registered On'], '#0d47a1');
  getOrCreateSheet('Tests',
    ['Test ID','Date','Title','Subject','Timer (min)','Questions (JSON)','Active'], '#4a148c');
  getOrCreateSheet('Results',
    ['S.No','Date','RollNo','Student Name','Class','Test ID','Test Title','Subject','Score','Total','Percentage (%)','Grade','Time (sec)','Time (formatted)','Submitted On'], '#b71c1c');

  // Set column widths for Results sheet
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const res = ss.getSheetByName('Results');
  if (res) {
    const widths = [50,100,100,150,100,140,200,120,70,70,110,70,90,110,160];
    widths.forEach((w, i) => res.setColumnWidth(i+1, w));
  }

  Logger.log('✅ ChemVeda Test Series sheets created successfully!');
}
