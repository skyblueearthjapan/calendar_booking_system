/** Code.gs */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('カレンダー予約')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Google Sites埋め込み想定
}
