/** sheets.gs */

function _ss() {
  // スクリプトプロパティにSPREADSHEET_IDが設定されている場合はそれを使用
  // 設定されていない場合はgetActiveSpreadsheet()にフォールバック
  const id = CFG.SPREADSHEET_ID;
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function _sheet(name) {
  const sh = _ss().getSheetByName(name);
  if (!sh) throw new Error(`Sheet not found: ${name}`);
  return sh;
}

/** ヘッダー行（2行目想定）から列indexを解決して返す */
function getHeaderMap_(sheet, headerRow = 2) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h && String(h).trim()) map[String(h).trim()] = i + 1; // 1-based
  });
  return map;
}

/** Masterからnames/rooms/slotsを取得 */
function readMasters_() {
  const sh = _sheet(CFG.SHEETS.MASTER);

  // 画像テンプレ前提：
  // names: A5:A
  // rooms: C5:C
  // slots: E5:F (Start/End)
  const names = readColumn_(sh, 5, 1); // A
  const rooms = readColumn_(sh, 5, 3); // C

  const slots = readSlots_(sh, 5, 5, 6); // E-F
  return { names, rooms, slots };
}

function readColumn_(sh, startRow, col) {
  const lastRow = sh.getLastRow();
  if (lastRow < startRow) return [];
  const vals = sh.getRange(startRow, col, lastRow - startRow + 1, 1).getValues()
    .map(r => String(r[0] || '').trim())
    .filter(v => v);
  return vals;
}

function readSlots_(sh, startRow, colStart, colEnd) {
  const lastRow = sh.getLastRow();
  if (lastRow < startRow) return [];
  const rows = sh.getRange(startRow, colStart, lastRow - startRow + 1, colEnd - colStart + 1).getValues();
  const slots = [];
  rows.forEach(r => {
    const s = String(r[0] || '').trim();
    const e = String(r[1] || '').trim();
    if (s && e) slots.push({ start: s, end: e });
  });
  return slots;
}

/** Reservations全件取得（必要範囲のみフィルタは上位で） */
function readAllReservations_() {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);

  // 最低限ヘッダー存在チェック
  CFG.RES_HEADERS.forEach(h => {
    if (!map[h]) throw new Error(`Reservations header missing: ${h}`);
  });

  const lastRow = sh.getLastRow();
  if (lastRow <= 2) return { map, rows: [] };

  const lastCol = sh.getLastColumn();
  const values = sh.getRange(3, 1, lastRow - 2, lastCol).getValues();

  const rows = values
    .filter(r => r.some(v => v !== '' && v !== null))
    .map(r => rowToReservation_(r, map));

  return { map, rows };
}

function rowToReservation_(r, map) {
  const get = (key) => r[map[key] - 1];
  return {
    reservationId: String(get('reservationId') || '').trim(),
    date: String(get('date') || '').trim(),
    startTime: String(get('startTime') || '').trim(),
    endTime: String(get('endTime') || '').trim(),
    room: String(get('room') || '').trim(),
    name: String(get('name') || '').trim(),
    customerName: String(get('title') || '').trim(),      // title=お客様名
    meetingDetail: String(get('note') || '').trim(),      // note=打ち合わせ内容
    status: String(get('status') || '').trim(),
    createdAt: String(get('createdAt') || '').trim(),
    updatedAt: String(get('updatedAt') || '').trim(),
  };
}

/** Reservationsに1件追加 */
function appendReservation_(payload) {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);

  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');
  const row = {};
  row['reservationId'] = payload.reservationId;
  row['date'] = payload.date;
  row['startTime'] = payload.startTime;
  row['endTime'] = payload.endTime;
  row['room'] = payload.room;
  row['name'] = payload.name;
  row['title'] = payload.customerName || '';
  row['note'] = payload.meetingDetail || '';
  row['status'] = 'active';
  row['createdAt'] = now;
  row['updatedAt'] = now;

  // シートの列順に合わせて配列化
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(2, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const out = headers.map(h => (h in row ? row[h] : ''));

  sh.appendRow(out);
}
