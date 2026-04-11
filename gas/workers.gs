/** workers.gs - 作業員マスタ取得（外部スプレッドシート）*/

// 作業員マスタ スプレッドシートID
const WORKER_MASTER_SS_ID = '1iu5HoaknlW1W1HheeYv0jqcRq-aY0SyEE2seQd2pHkQ';
// 作業員マスタ シートGID
const WORKER_MASTER_GID = 684189184;
// キャッシュ有効期限（ミリ秒）= 24時間
const WORKER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// PropertiesService キー
const WORKER_CACHE_KEY = 'WORKER_MASTER_CACHE_V1';

/**
 * 事務所スタッフのみを取得（24時間キャッシュ付き）
 * @returns {Array<{name: string, department: string}>}
 */
function getWorkersCached_() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(WORKER_CACHE_KEY);

  if (raw) {
    try {
      const cached = JSON.parse(raw);
      const age = Date.now() - (cached.fetchedAt || 0);
      if (age < WORKER_CACHE_TTL_MS && Array.isArray(cached.workers)) {
        return cached.workers;
      }
    } catch (e) {
      // パース失敗時は再取得
    }
  }

  // キャッシュ切れ → 再取得
  return refreshWorkersCache_();
}

/**
 * 強制再取得してキャッシュ更新
 */
function refreshWorkersCache_() {
  const workers = readWorkersFromSource_();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(WORKER_CACHE_KEY, JSON.stringify({
    fetchedAt: Date.now(),
    workers
  }));
  return workers;
}

/**
 * 外部スプレッドシートから作業員マスタを読み取る
 * 事務所スタッフのみフィルタ
 */
function readWorkersFromSource_() {
  const ss = SpreadsheetApp.openById(WORKER_MASTER_SS_ID);
  const sh = ss.getSheets().find(s => s.getSheetId() === WORKER_MASTER_GID);
  if (!sh) {
    throw new Error('作業員マスタシートが見つかりません (gid=' + WORKER_MASTER_GID + ')');
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2) return [];

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h || '').trim());

  const idx = {
    name: headers.indexOf('氏名'),
    department: headers.indexOf('部署'),
    location: headers.indexOf('拠点'),
    staffType: headers.indexOf('スタッフ種類'),
  };

  if (idx.name < 0 || idx.department < 0 || idx.staffType < 0) {
    throw new Error('作業員マスタのヘッダーが不正です: ' + headers.join(','));
  }

  const workers = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const name = String(row[idx.name] || '').trim();
    const department = String(row[idx.department] || '').trim();
    const staffType = String(row[idx.staffType] || '').trim();

    if (!name) continue;
    if (staffType !== '事務所') continue;

    workers.push({ name, department });
  }

  return workers;
}

/**
 * 公開トリガー関数：作業員マスタを強制再取得
 * GASエディタで時間トリガー（毎日0時など）に設定可能
 */
function refreshWorkers() {
  const workers = refreshWorkersCache_();
  console.log('Refreshed workers:', workers.length, '名');
  return { ok: true, count: workers.length };
}
