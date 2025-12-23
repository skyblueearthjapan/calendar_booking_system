/** sheets.gs */

/** デバッグ用：どのスプレッドシートを開いているか確認 */
function debugSpreadsheetTarget() {
  const ss = _ss();
  console.log('CFG.SPREADSHEET_ID=', CFG.SPREADSHEET_ID);
  console.log('OPENED ssId=', ss.getId());
  console.log('OPENED ssName=', ss.getName());
  console.log('Sheets=', ss.getSheets().map(s => s.getName()).join(', '));
}

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
  // getDisplayValues() を使用して、タイムゾーン変換問題を回避
  const rows = sh.getRange(startRow, colStart, lastRow - startRow + 1, colEnd - colStart + 1).getDisplayValues();
  const slots = [];
  rows.forEach(r => {
    // 時間を HH:mm 形式に正規化
    const normalizeTime = (t) => {
      const str = String(t || '').trim();
      if (!str) return '';
      // H:mm → HH:mm
      if (/^\d{1}:\d{2}$/.test(str)) return '0' + str;
      if (/^\d{2}:\d{2}$/.test(str)) return str;
      // その他のフォーマット
      const parts = str.split(':');
      if (parts.length === 2) {
        return String(parts[0]).padStart(2, '0') + ':' + String(parts[1]).padStart(2, '0');
      }
      return str;
    };
    const s = normalizeTime(r[0]);
    const e = normalizeTime(r[1]);
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
  // getDisplayValues() を使用して、セルに表示されている値をそのまま文字列として取得
  // これによりDateオブジェクトのタイムゾーン変換問題を回避
  const values = sh.getRange(3, 1, lastRow - 2, lastCol).getDisplayValues();

  const rows = values
    .filter(r => r.some(v => v !== '' && v !== null))
    .map(r => rowToReservation_(r, map));

  return { map, rows };
}

function rowToReservation_(r, map) {
  // 日本語ヘッダー名で値を取得
  const H = CFG.HEADER_MAP;
  const get = (headerName) => {
    const colIndex = map[headerName];
    return colIndex ? r[colIndex - 1] : '';
  };

  // 日付をフォーマット（Dateオブジェクトの場合に対応）
  const formatDateValue = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
      return Utilities.formatDate(val, CFG.TZ, 'yyyy-MM-dd');
    }
    return String(val).trim();
  };

  // 時間をフォーマット（Dateオブジェクトの場合に対応）
  const formatTimeValue = (val) => {
    if (!val) return '';
    if (val instanceof Date) {
      // Dateオブジェクトから直接時間を取得（タイムゾーン変換の問題を回避）
      const h = String(val.getHours()).padStart(2, '0');
      const m = String(val.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    // 文字列の場合、正規化（9:00 → 09:00）
    const t = String(val).trim();
    if (/^\d{1}:\d{2}$/.test(t)) return '0' + t;
    if (/^\d{2}:\d{2}$/.test(t)) return t;
    // その他の形式
    const parts = t.split(':');
    if (parts.length === 2) {
      const h = String(parts[0]).padStart(2, '0');
      const m = String(parts[1]).padStart(2, '0');
      return `${h}:${m}`;
    }
    return t;
  };

  return {
    reservationId: String(get(H.reservationId) || '').trim(),
    date: formatDateValue(get(H.date)),
    startTime: formatTimeValue(get(H.startTime)),
    endTime: formatTimeValue(get(H.endTime)),
    room: String(get(H.room) || '').trim(),
    name: String(get(H.name) || '').trim(),
    customerName: String(get(H.customerName) || '').trim(),
    meetingDetail: String(get(H.meetingDetail) || '').trim(),
    status: String(get(H.status) || '').trim(),
    createdAt: String(get(H.createdAt) || '').trim(),
    updatedAt: String(get(H.updatedAt) || '').trim(),
  };
}

/** Reservationsに1件追加 */
function appendReservation_(payload) {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);
  const H = CFG.HEADER_MAP;

  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');

  // 日本語ヘッダー名をキーにしてデータを格納
  const row = {};
  row[H.reservationId] = payload.reservationId;
  row[H.date] = payload.date;
  row[H.startTime] = payload.startTime;
  row[H.endTime] = payload.endTime;
  row[H.room] = payload.room;
  row[H.name] = payload.name;
  row[H.customerName] = payload.customerName || '';
  row[H.meetingDetail] = payload.meetingDetail || '';
  row[H.status] = 'active';
  row[H.createdAt] = now;
  row[H.updatedAt] = now;

  // シートの列順に合わせて配列化
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(2, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const out = headers.map(h => (h in row ? row[h] : ''));

  sh.appendRow(out);
}

/** 予約を更新（reservationIdで検索して該当行を更新） */
function updateReservation_(reservationId, payload) {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);
  const H = CFG.HEADER_MAP;

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow <= 2) throw new Error('予約が見つかりません');

  // reservationId列を検索
  const idCol = map[H.reservationId];
  if (!idCol) throw new Error('reservationId列が見つかりません');

  const ids = sh.getRange(3, idCol, lastRow - 2, 1).getValues().flat();
  const rowIndex = ids.findIndex(id => String(id).trim() === reservationId);

  if (rowIndex === -1) throw new Error('予約が見つかりません');

  const actualRow = rowIndex + 3; // 3行目から開始

  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');

  // 更新するフィールド
  const updates = {
    [H.date]: payload.date,
    [H.startTime]: payload.startTime,
    [H.endTime]: payload.endTime,
    [H.room]: payload.room,
    [H.name]: payload.name,
    [H.customerName]: payload.customerName || '',
    [H.meetingDetail]: payload.meetingDetail || '',
    [H.updatedAt]: now,
  };

  // 各フィールドを更新
  for (const [header, value] of Object.entries(updates)) {
    const col = map[header];
    if (col) {
      sh.getRange(actualRow, col).setValue(value);
    }
  }

  return true;
}

/** 予約を削除（論理削除: statusを'deleted'に変更） */
function deleteReservation_(reservationId) {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);
  const H = CFG.HEADER_MAP;

  const lastRow = sh.getLastRow();
  if (lastRow <= 2) throw new Error('予約が見つかりません');

  // reservationId列を検索
  const idCol = map[H.reservationId];
  if (!idCol) throw new Error('reservationId列が見つかりません');

  const ids = sh.getRange(3, idCol, lastRow - 2, 1).getValues().flat();
  const rowIndex = ids.findIndex(id => String(id).trim() === reservationId);

  if (rowIndex === -1) throw new Error('予約が見つかりません');

  const actualRow = rowIndex + 3;

  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');

  // ステータスを'deleted'に変更（論理削除）
  const statusCol = map[H.status];
  const updatedAtCol = map[H.updatedAt];

  if (statusCol) sh.getRange(actualRow, statusCol).setValue('deleted');
  if (updatedAtCol) sh.getRange(actualRow, updatedAtCol).setValue(now);

  return true;
}

/**
 * 前日以前の予約データを物理削除
 * @returns {Object} { deletedCount: number, message: string }
 */
function cleanupOldReservations_() {
  const sh = _sheet(CFG.SHEETS.RESERVATIONS);
  const map = getHeaderMap_(sh, 2);
  const H = CFG.HEADER_MAP;

  const lastRow = sh.getLastRow();
  if (lastRow <= 2) {
    return { deletedCount: 0, message: '削除対象のデータがありません' };
  }

  // 今日の日付を取得
  const today = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd');

  // 日付列のインデックス
  const dateCol = map[H.date];
  if (!dateCol) throw new Error('日付列が見つかりません');

  // 全データを取得
  const lastCol = sh.getLastColumn();
  const dataRange = sh.getRange(3, 1, lastRow - 2, lastCol);
  const values = dataRange.getDisplayValues();

  // 削除対象の行インデックスを収集（逆順で削除するため）
  const rowsToDelete = [];

  values.forEach((row, idx) => {
    const dateValue = String(row[dateCol - 1] || '').trim();
    // 日付が空でなく、今日より前の場合は削除対象
    if (dateValue && dateValue < today) {
      rowsToDelete.push(idx + 3); // 3行目から開始
    }
  });

  if (rowsToDelete.length === 0) {
    return { deletedCount: 0, message: '削除対象のデータがありません' };
  }

  // 下から削除（行番号がずれないように）
  rowsToDelete.sort((a, b) => b - a);

  for (const rowNum of rowsToDelete) {
    sh.deleteRow(rowNum);
  }

  return {
    deletedCount: rowsToDelete.length,
    message: `${rowsToDelete.length}件の過去予約を削除しました`
  };
}
