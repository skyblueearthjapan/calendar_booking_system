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

  // Reservationsの必須ヘッダー（日本語ヘッダーに対応）
  RES_HEADERS: [
    '予約ID', '日付', '開始時間', '終了時間',
    '会議室名', '名前', 'お客様名', '打合せ内容',
    'ステータス', '予約日時', '更新日時'
  ],

  // ヘッダー名マッピング（内部キー → シートのヘッダー名）
  HEADER_MAP: {
    reservationId: '予約ID',
    date: '日付',
    startTime: '開始時間',
    endTime: '終了時間',
    room: '会議室名',
    name: '名前',
    customerName: 'お客様名',
    meetingDetail: '打合せ内容',
    status: 'ステータス',
    createdAt: '予約日時',
    updatedAt: '更新日時',
  },

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
