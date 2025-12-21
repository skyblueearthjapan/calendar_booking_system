# カレンダー予約システム

社内の会議室予約を、Webアプリで直感的に作成・閲覧できるシステムです。
スプレッドシートは表示専用（ビュー/キャッシュ）とし、入力はWebアプリのみで行います。

## システム構成

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App       │────▶│   GAS (API)     │────▶│ Spreadsheet     │
│   (SPA)         │     │                 │     │ (データ保存)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 機能（Phase1）

- マスターデータ読み込み（作業者・会議室・時間枠）
- DAYビュー表示（1日の予約一覧、前日/翌日/今日ナビ）
- 予約作成（重複拒否、14日間制限、30分刻み）
- 2週間ビュー（会議室ごとの予約数サマリ）
- 予約ブロッククリックで詳細モーダル表示

## ファイル構成

```
gas/
├── Code.gs          # doGet() エントリポイント
├── config.gs        # 設定（シート名、営業時間、色）
├── sheets.gs        # シート操作（マスター読み込み、予約読み書き）
├── validation.gs    # バリデーション（期間・時間・重複判定）
├── api.gs           # Web API（getMasters, listReservations, createReservation）
├── render.gs        # シート描画（renderDay, render2Weeks）
└── Index.html       # Web UI（SPA）
```

## セットアップ手順

### 1. スプレッドシートの準備

以下の4つのシートを作成してください：

#### マスター（Master）
- A列（5行目〜）: 作業者名（例：山中、木下、今泉）
- C列（5行目〜）: 会議室名（例：第一会議室、応接間1、応接間2）
- E-F列（5行目〜）: 時間枠（開始・終了、30分刻み）

#### 予約受付リスト（Reservations）
- 2行目にヘッダー行を設定：
  ```
  reservationId | date | startTime | endTime | room | name | title | note | status | createdAt | updatedAt
  ```
- 3行目以降がデータ行

#### DAYビュー（Day_View）
- B2: 表示日
- B3〜: 会議室ヘッダー
- A4〜: 時間列
- B4〜: 予約グリッド（GASが自動描画）

#### View_2weeks
- B2: 基準日
- A5〜: 2週間サマリ（GASが自動描画）

### 2. GASプロジェクトの作成

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を開く
2. `gas/` フォルダ内の各ファイルをGASプロジェクトにコピー
   - `Code.gs`, `config.gs`, `sheets.gs`, `validation.gs`, `api.gs`, `render.gs`
   - `Index.html`（HTMLファイルとして追加）

### 3. スクリプトプロパティの設定（重要）

1. GASエディタ左側の歯車アイコン（プロジェクトの設定）をクリック
2. 「スクリプト プロパティ」セクションまでスクロール
3. 「スクリプト プロパティを追加」をクリック
4. 以下を設定：
   - **プロパティ**: `SPREADSHEET_ID`
   - **値**: スプレッドシートのID
5. 「スクリプト プロパティを保存」をクリック

> **スプレッドシートIDの確認方法**
> スプレッドシートのURLから取得できます：
> ```
> https://docs.google.com/spreadsheets/d/【ここがID】/edit
> ```

### 4. Webアプリのデプロイ

1. GASエディタで「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」を選択
3. 実行ユーザー：「自分」
4. アクセスできるユーザー：必要に応じて設定
5. 「デプロイ」をクリック

### 5. 動作確認

1. デプロイ後に表示されるURLにアクセス
2. DAYビューが表示され、プルダウンにマスターデータが反映されることを確認
3. 予約を作成し、DAYビューとスプレッドシートに反映されることを確認

## 設定のカスタマイズ

`config.gs` で以下の設定を変更できます：

```javascript
const CFG = {
  // シート名
  SHEETS: {
    MASTER: 'マスター',
    RESERVATIONS: '予約受付リスト',
    DAY_VIEW: 'DAYビュー',
    VIEW_2WEEKS: 'View_2weeks',
  },

  // 営業時間
  BUSINESS: {
    START: '08:00',
    END: '18:00',
    SLOT_MIN: 30,      // 30分刻み
    WINDOW_DAYS: 14,   // 予約可能期間（今日から14日）
  },

  // 会議室ごとの色
  ROOM_COLORS: {
    '第一会議室': '#FDE68A',
    '応接間1':   '#BBF7D0',
    '応接間2':   '#BFDBFE',
  },
};
```

## API仕様

### getMasters()
マスターデータを取得
```javascript
// 戻り値
{
  names: ['山中', '木下', '今泉'],
  rooms: ['第一会議室', '応接間1', '応接間2'],
  slots: [{ start: '08:00', end: '08:30' }, ...]
}
```

### getWindowBase()
予約可能期間を取得
```javascript
// 戻り値
{ today: '2025-12-21', from: '2025-12-21', to: '2026-01-03' }
```

### listReservations(fromDate, toDate, room)
予約一覧を取得
```javascript
// 戻り値
[{
  reservationId: 'uuid',
  date: '2025-12-21',
  startTime: '09:00',
  endTime: '10:00',
  room: '第一会議室',
  name: '今泉',
  customerName: '株式会社〇〇',
  meetingDetail: '打合せ',
  status: 'active',
  createdAt: '2025-12-21 20:46:00',
  updatedAt: '2025-12-21 20:46:00'
}, ...]
```

### createReservation(payload)
予約を作成
```javascript
// payload
{
  date: '2025-12-21',
  startTime: '09:00',
  endTime: '10:00',
  room: '第一会議室',
  name: '今泉',
  customerName: '株式会社〇〇',  // 任意
  meetingDetail: '打合せ'        // 任意
}

// 成功時
{ ok: true, reservationId: 'uuid' }

// 失敗時（重複など）
{ ok: false, code: 'CONFLICT', message: 'この時間帯は既に予約があります（重複）' }
```

## 制約ルール

- 予約可能期間：今日から14日間のみ
- 営業時間：08:00〜18:00
- 時間刻み：30分単位
- 重複予約：同一日・同一会議室で時間が重なる予約は不可

## 今後の拡張予定（Phase2）

- 予約の編集・キャンセル機能
- 毎朝トリガーによる2weeks自動更新
- View_2weeksのテンプレ準拠描画
