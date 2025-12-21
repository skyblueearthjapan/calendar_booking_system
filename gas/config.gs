/** config.gs */

const CFG = {
  // スプレッドシートID（スクリプトプロパティ 'SPREADSHEET_ID' から取得）
  // 設定方法：GASエディタ → 歯車（プロジェクトの設定）→ スクリプトプロパティ → プロパティを追加
  //   プロパティ: SPREADSHEET_ID
  //   値: スプレッドシートのID（URLの /d/ と /edit の間の文字列）
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),

  TZ: Session.getScriptTimeZone(), // SpreadsheetのTZに合わせる
  SHEETS: {
    MASTER: 'マスター',
    RESERVATIONS: '予約受付リスト',
    DAY_VIEW: 'DAYビュー',
    VIEW_2WEEKS: 'View_2weeks',
  },

  // Reservationsの必須ヘッダー（意味：title=お客様名, note=打ち合わせ内容）
  RES_HEADERS: [
    'reservationId', 'date', 'startTime', 'endTime',
    'room', 'name', 'title', 'note',
    'status', 'createdAt', 'updatedAt'
  ],

  BUSINESS: {
    START: '08:00',
    END: '18:00',
    SLOT_MIN: 30,
    WINDOW_DAYS: 14, // 今日から14日
  },

  // 会議室ごとの固定色（お好みで変更）
  ROOM_COLORS: {
    '第一会議室': '#FDE68A', // amber-200
    '応接間1':   '#BBF7D0', // green-200
    '応接間2':   '#BFDBFE', // blue-200
  },

  // Dayビューの打ち合わせ内容は省略して表示（Web側は全文も可）
  DISPLAY: {
    MEETING_DETAIL_MAX: 28,
  },
};
