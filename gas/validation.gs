/** validation.gs */

function getWindowBase_() {
  const today = new Date();
  const from = formatDate_(today);
  const to = formatDate_(addDays_(today, CFG.BUSINESS.WINDOW_DAYS - 1));
  return { today: from, from, to };
}

function addDays_(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDate_(d) {
  return Utilities.formatDate(d, CFG.TZ, 'yyyy-MM-dd');
}

function parseDateTime_(dateStr, timeStr) {
  // dateStr: yyyy-MM-dd, timeStr: HH:mm
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function assertPayload_(p) {
  const required = ['date','startTime','endTime','room','name'];
  required.forEach(k => {
    if (!p[k] || !String(p[k]).trim()) throw new Error(`Missing field: ${k}`);
  });

  // 期間チェック
  const w = getWindowBase_();
  if (p.date < w.from || p.date > w.to) {
    throw new Error(`Out of booking window: ${p.date} (allowed ${w.from}..${w.to})`);
  }

  // 時間チェック
  const start = parseDateTime_(p.date, p.startTime);
  const end = parseDateTime_(p.date, p.endTime);
  if (!(start < end)) throw new Error('Invalid time range: start must be before end');

  const dayStart = parseDateTime_(p.date, CFG.BUSINESS.START);
  const dayEnd = parseDateTime_(p.date, CFG.BUSINESS.END);
  if (start < dayStart || end > dayEnd) throw new Error('Time out of business hours');

  // 30分刻み
  if (!isSlotAligned_(start) || !isSlotAligned_(end)) throw new Error('Time must align to 30-min slots');
}

function isSlotAligned_(dt) {
  return dt.getMinutes() % CFG.BUSINESS.SLOT_MIN === 0;
}

function isOverlapping_(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function trimMeetingDetail_(s) {
  const t = String(s || '').trim();
  if (!t) return '';
  const max = CFG.DISPLAY.MEETING_DETAIL_MAX;
  return t.length > max ? t.slice(0, max) + '…' : t;
}
