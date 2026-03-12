/** Code.gs */

/** 社内ポータルサイトURL（全画面共通） */
var PORTAL_URL = 'https://script.google.com/a/macros/lineworks-local.info/s/AKfycbx2eyJMOYP9o--GPBuhY-pj071IIR6Kqb_0xALwwNzdLQZux0dIAlL3P9EoCucnzXA/exec';

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.PORTAL_URL = PORTAL_URL;
  return t.evaluate()
    .setTitle('カレンダー予約')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Google Sites埋め込み想定
}
