/** render.gs */

function renderDay(dateStr) {
  const masters = readMasters_();
  const rooms = masters.rooms;
  if (!rooms.length) throw new Error('No rooms in Master');

  const sh = _sheet(CFG.SHEETS.DAY_VIEW);

  // 画像テンプレ前提の座標:
  // 表示日: B2
  // ヘッダー(会議室): B3~
  // 時間列: A4~ (08:00 시작)
  // 予約グリッド: B4~
  const displayDateCell = sh.getRange('B2');
  displayDateCell.setValue(dateStr);

  // 予約エリアのクリア（結合解除＋値＋背景）
  const startRow = 4;
  const timeSlots = buildTimeSlots_(); // ['08:00','08:30',...,'17:30']
  const numRows = timeSlots.length;
  const startCol = 2; // B
  const numCols = rooms.length;

  const range = sh.getRange(startRow, startCol, numRows, numCols);
  range.breakApart();
  range.clearContent();
  range.setBackground(null); // テンプレの縞背景は別途保つなら工夫が必要

  // 会議室ヘッダーを書き込み（テンプレに合わせる）
  sh.getRange(3, startCol, 1, numCols).setValues([rooms]);

  // 対象日の予約を取得
  const reservations = listReservations(dateStr, dateStr);

  // 会議室→列
  const roomToCol = {};
  rooms.forEach((r, idx) => roomToCol[r] = startCol + idx);

  // 時刻→行
  const timeToRow = {};
  timeSlots.forEach((t, idx) => timeToRow[t] = startRow + idx);

  reservations.forEach(r => {
    const col = roomToCol[r.room];
    if (!col) return;

    const r0 = timeToRow[r.startTime];
    const r1 = timeToRow[r.endTime];
    if (!r0 || !r1) return;

    const height = r1 - r0; // endは次枠の開始なので差分
    if (height <= 0) return;

    const block = sh.getRange(r0, col, height, 1);
    block.merge();

    const color = CFG.ROOM_COLORS[r.room] || '#E5E7EB';
    block.setBackground(color);

    const customer = r.customerName ? `\n${r.customerName}` : '';
    const meeting = r.meetingDetail ? `\n${trimMeetingDetail_(r.meetingDetail)}` : '';
    const text = `${r.name}\n${r.startTime}-${r.endTime}${customer}${meeting}`;

    block.setValue(text);
    block.setHorizontalAlignment('center');
    block.setVerticalAlignment('middle');
    block.setWrap(true);
    block.setFontWeight('bold');
  });

  // 左の時間列もテンプレに合わせて書く（必要なら）
  sh.getRange(startRow, 1, numRows, 1).setValues(timeSlots.map(t => [t]));
}

function render2Weeks(baseDateStr) {
  // baseDateStr: yyyy-MM-dd
  const masters = readMasters_();
  const rooms = masters.rooms;

  const sh = _sheet(CFG.SHEETS.VIEW_2WEEKS);

  // 画像テンプレ前提：基準日セル B2
  sh.getRange('B2').setValue(baseDateStr);

  const base = parseDateTime_(baseDateStr, '00:00');
  const days = [];
  for (let i = 0; i < CFG.BUSINESS.WINDOW_DAYS; i++) {
    days.push(formatDate_(addDays_(base, i)));
  }

  // 予約を一括取得（期間内）
  const to = days[days.length - 1];
  const all = listReservations(baseDateStr, to);

  // 日×部屋のカウント
  const counts = {}; // counts[date][room]=n
  days.forEach(d => {
    counts[d] = {};
    rooms.forEach(r => counts[d][r] = 0);
  });
  all.forEach(r => {
    if (!counts[r.date]) return;
    if (!counts[r.date][r.room] && counts[r.date][r.room] !== 0) return;
    counts[r.date][r.room] += 1;
  });

  // テンプレのセル配置は各社/各テンプレで異なるので、
  // ここは「指定のセル配列へ書く」実装に差し替え前提。
  //
  // まずはサンプルとして A5〜 に一覧を書き出す（デバッグ用）
  sh.getRange('A5:Z200').clearContent();
  const out = [];
  out.push(['date'].concat(rooms));
  days.forEach(d => {
    out.push([d].concat(rooms.map(r => counts[d][r])));
  });
  sh.getRange(5, 1, out.length, out[0].length).setValues(out);
}

/** 08:00-17:30 の開始時刻リスト */
function buildTimeSlots_() {
  const slots = [];
  const dummyDate = '2000-01-01';
  let t = parseDateTime_(dummyDate, CFG.BUSINESS.START);
  const end = parseDateTime_(dummyDate, '17:30'); // 最終開始
  while (t <= end) {
    slots.push(Utilities.formatDate(t, CFG.TZ, 'HH:mm'));
    t = new Date(t.getTime() + CFG.BUSINESS.SLOT_MIN * 60 * 1000);
  }
  return slots;
}
