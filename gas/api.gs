/** api.gs */

function getMasters() {
  return readMasters_();
}

function getWindowBase() {
  return getWindowBase_();
}

function listReservations(fromDate, toDate, room) {
  const { rows } = readAllReservations_();
  const filtered = rows.filter(r => {
    if (r.status && r.status !== 'active') return false;
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    if (room && r.room !== room) return false;
    return true;
  });

  // startTime順に並べる
  filtered.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return filtered;
}

function createReservation(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const p = normalizePayload_(payload);
    assertPayload_(p);

    // 重複チェック
    const { rows } = readAllReservations_();
    const newStart = parseDateTime_(p.date, p.startTime);
    const newEnd = parseDateTime_(p.date, p.endTime);

    const conflicts = rows.filter(r => {
      if (r.status && r.status !== 'active') return false;
      if (r.date !== p.date) return false;
      if (r.room !== p.room) return false;

      const exStart = parseDateTime_(r.date, r.startTime);
      const exEnd = parseDateTime_(r.date, r.endTime);
      return isOverlapping_(newStart, newEnd, exStart, exEnd);
    });

    if (conflicts.length > 0) {
      return { ok: false, code: 'CONFLICT', message: 'この時間帯は既に予約があります（重複）' };
    }

    // 追加
    const reservationId = Utilities.getUuid();
    p.reservationId = reservationId;
    appendReservation_(p);

    // 表示シート更新（任意だが推奨）
    try {
      renderDay(p.date);
      render2Weeks(getWindowBase_().today);
    } catch (e) {
      // 表示更新失敗でも予約自体は成功扱い（ログだけ）
      console.error(e);
    }

    return { ok: true, reservationId };
  } catch (e) {
    return { ok: false, code: 'ERROR', message: String(e.message || e) };
  } finally {
    lock.releaseLock();
  }
}

function normalizePayload_(payload) {
  const p = payload || {};
  return {
    date: String(p.date || '').trim(),
    startTime: String(p.startTime || '').trim(),
    endTime: String(p.endTime || '').trim(),
    room: String(p.room || '').trim(),
    name: String(p.name || '').trim(),
    customerName: String(p.customerName || '').trim(),
    meetingDetail: String(p.meetingDetail || '').trim(),
  };
}
