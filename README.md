# Digital Twin CMMS - 次世代デジタルツイン資産管理システム

## 🌐 プロジェクト概要
Big Mirror 3Dガウシアンスプラッティングモデルを使用した、完全機能のCMMS（設備管理システム）

## ✅ 実装済み機能

### 1. 3D可視化
- **Big Mirror モデル**: 999,758スプラットの3Dガウシアンスプラッティング
- **LCC SDK 0.5.3**: XGrids社のLCCフォーマット対応
- **IndexDB キャッシュ**: 2回目以降の読み込み高速化

### 2. 基本CMMS機能
- **設備管理**: 16件の設備データ（Cloudflare D1データベース）
- **保守計画**: スケジュール管理と実行追跡
- **作業指示**: 優先度別タスク管理
- **リアルタイム分析**: 稼働率、警告、緊急アラート

### 2b. 拡張CMMS機能（バックエンドAPI実装完了 ✅）
- **✅ チェックリスト管理API**: テンプレートCRUD、項目管理、実施記録、結果記録
- **✅ 作業履歴API**: 実績記録、部品使用記録、コスト追跡
- **✅ 部品・在庫管理API**: 部品CRUD、在庫移動、低在庫アラート
- **✅ 故障報告API**: 報告CRUD、統計情報、重大度分類
- **✅ コスト管理API**: 予算管理、コスト分析（月次トレンド、設備別、作業種別）
- **✅ ドキュメント管理API**: 設備ドキュメントCRUD
- **✅ 通知・アラートAPI**: 通知管理、アラート設定、既読管理
- **✅ 拡張アナリティクスAPI**: KPI（稼働率、MTBF、MTTR、チェックリスト合格率）

**実装済み**: 全83個のRESTful APIエンドポイント  
**次のステップ**: フロントエンドUIの実装

### 3. 設備位置編集機能 🎯
- **編集モード**: ワンクリックでON/OFF切り替え
- **ドラッグ&ドロップ**: マーカーを直接ドラッグして移動
- **3D空間クリック**: モデル表面をクリックして位置指定
- **新規設備作成**: 3D空間に直接配置
- **リアルタイム保存**: 位置変更を即座にD1データベースに保存

### 4. 配管システム管理 🔧
- **配管可視化**: 3D空間に配管をライン表示（色、太さ、材質別）
- **配管編集**: 配管情報の編集（名前、タイプ、材質、口径、ステータス）
- **配管作成**: 3D空間で始点・終点をクリックして配管を作成
- **配管削除**: 不要な配管の削除機能
- **データベース連携**: 編集内容をリアルタイムでD1データベースに保存

## 🚀 デプロイメント方法

### **簡単デプロイ（推奨）**
```bash
cd /home/user/webapp
./deploy.sh
```

このスクリプトが自動的に以下を実行します：
1. 既存プロセスのクリーンアップ
2. プロジェクトのビルド
3. データベースの確認
4. サーバーの起動
5. ヘルスチェック

### **手動デプロイ**
```bash
# 1. クリーンアップ
pkill -9 workerd && pkill -9 node && sleep 3

# 2. ビルド
cd /home/user/webapp
npm run build

# 3. サーバー起動
nohup npx wrangler pages dev dist --d1=digital-twin-cmms-production --local --ip 0.0.0.0 --port 3000 </dev/null >/tmp/wrangler.log 2>&1 &

# 4. 待機
sleep 12

# 5. 確認
curl http://localhost:3000/
```

## 🌐 アクセス情報

**ローカルURL**: http://localhost:3000
**公開URL**: https://3000-i5u2eevek55qty7xcvdvo-d0b9e1e2.sandbox.novita.ai

## 🎮 使い方

### 基本操作
1. URLにアクセス
2. モデルが読み込まれるまで待つ（ローディング進捗表示）
3. マウスで3D空間を操作:
   - **左ドラッグ**: カメラ回転
   - **右ドラッグ**: カメラ移動
   - **スクロール**: ズーム

### 設備位置編集
1. **「編集モード」ボタン**をクリック（ナビゲーションバー）
2. 設備マーカーをドラッグ＆ドロップで移動
3. 位置が自動的にデータベースに保存される

### 新規設備追加
1. **「設備追加」ボタン**をクリック
2. 設備情報を入力（名前、タイプ、ステータス、説明）
3. **「3D空間で位置を指定」**をクリック
4. モデル表面をクリックして配置
5. **「保存」**をクリック

### 設備編集
1. 左サイドバーの設備リストで**編集アイコン**をクリック
2. 情報を編集
3. **「位置を変更」**で3D空間での位置変更も可能
4. **「保存」**をクリック

## 📊 データベース

### テーブル構造

**基本テーブル**:
- `equipment`: 設備マスタ（位置情報含む）
- `piping`: 配管システム（始点・終点座標、材質、口径など）
- `piping_inspections`: 配管点検記録
- `maintenance_plans`: 保守計画
- `work_orders`: 作業指示
- `analytics_events`: 分析イベント履歴

**拡張CMM機能テーブル** (v1.4.0で追加):
- `checklist_templates`: チェックシートテンプレート
- `checklist_items`: チェック項目
- `checklist_executions`: チェックシート実行記録
- `checklist_results`: チェック項目の実行結果
- `work_history`: 作業履歴・実績記録
- `parts`: 部品マスタ
- `inventory_transactions`: 在庫移動履歴
- `work_parts`: 作業で使用した部品
- `failure_reports`: 故障・不具合報告
- `maintenance_budgets`: 予算管理
- `equipment_documents`: 設備ドキュメント
- `alert_settings`: アラート設定
- `notifications`: 通知履歴

### データベース操作
```bash
# ローカルDBにマイグレーション適用
npm run db:migrate:local

# テストデータ投入
npm run db:seed

# DBリセット
npm run db:reset

# ローカルDB操作
npm run db:console:local
```

## 🛠️ 技術スタック

### フロントエンド
- **Three.js**: 3Dレンダリング
- **LCC SDK 0.5.3**: ガウシアンスプラッティング表示
- **TailwindCSS**: UIスタイリング
- **Axios**: HTTP通信

### バックエンド
- **Hono**: 軽量Webフレームワーク
- **Cloudflare Workers**: エッジランタイム
- **Cloudflare D1**: SQLiteベースの分散データベース

### ビルド・デプロイ
- **Vite**: 高速ビルドツール
- **Wrangler**: Cloudflare開発ツール
- **TypeScript**: 型安全な開発

## 📁 プロジェクト構成

```
webapp/
├── src/
│   └── index.tsx              # Honoアプリケーション（REST API）
├── public/
│   ├── static/
│   │   ├── js/
│   │   │   └── viewer.js      # 3Dビューア＆CMMS機能
│   │   └── engine/three/      # Three.jsライブラリ
│   ├── models/BigMirror/      # 3Dモデルデータ（31MB）
│   └── sdk/lcc-0.5.3.js       # LCC SDK
├── migrations/
│   └── 0001_initial_schema.sql # DBスキーマ
├── seed.sql                    # テストデータ
├── deploy.sh                   # 自動デプロイスクリプト
├── wrangler.jsonc             # Cloudflare設定
├── vite.config.ts             # ビルド設定
└── package.json               # 依存関係

dist/                          # ビルド出力（デプロイ対象）
.wrangler/                     # ローカルD1データベース
```

## 🔧 トラブルシューティング

### モデルが読み込まれない場合
```bash
# 完全再デプロイ
./deploy.sh
```

### サーバーが応答しない場合
```bash
# プロセス確認
ps aux | grep workerd

# ログ確認
tail -50 /tmp/wrangler.log

# 強制再起動
pkill -9 workerd && pkill -9 node
./deploy.sh
```

### データベースエラーの場合
```bash
# DBリセット
npm run db:reset

# 再デプロイ
./deploy.sh
```

## 📈 今後の拡張予定
- [ ] 保守計画の自動作成機能
- [ ] アラート通知システム
- [ ] レポート生成機能
- [ ] ユーザー権限管理
- [ ] モバイル対応

## 📝 開発メモ

### 重要な注意事項
1. **毎回 `./deploy.sh` を使用する**: 手動ビルドよりも安定
2. **モデル読み込み完了を待つ**: 編集機能は `state.modelLoaded` フラグで制御
3. **ポート3000を常に使用**: 他のポートは使わない
4. **D1データベースは`--local`モード**: 本番環境では別途設定が必要

## 🔌 APIエンドポイント一覧

### チェックリスト管理 (10エンドポイント)
- `GET /api/checklists/templates` - テンプレート一覧
- `POST /api/checklists/templates` - テンプレート作成
- `GET /api/checklists/items/:templateId` - 項目一覧
- `POST /api/checklists/items` - 項目追加
- `GET /api/checklists/executions` - 実施履歴一覧
- `POST /api/checklists/executions` - 点検開始
- `PUT /api/checklists/executions/:id` - 点検完了
- `POST /api/checklists/results` - 結果記録
- `GET /api/checklists/results/:executionId` - 結果取得

### 作業履歴 (6エンドポイント)
- `GET /api/work-history` - 作業履歴一覧
- `GET /api/work-history/:equipmentId` - 設備別履歴
- `POST /api/work-history` - 作業記録
- `PUT /api/work-history/:id` - 履歴更新
- `GET /api/work-history/:id/parts` - 使用部品取得
- `POST /api/work-history/:id/parts` - 部品使用記録

### 故障報告 (5エンドポイント)
- `GET /api/failures` - 故障報告一覧
- `POST /api/failures` - 故障報告作成
- `PUT /api/failures/:id` - 報告更新
- `GET /api/failures/statistics` - 統計情報
- `GET /api/failures/equipment/:equipmentId` - 設備別故障報告

### 部品・在庫管理 (8エンドポイント)
- `GET /api/parts` - 部品一覧
- `POST /api/parts` - 部品登録
- `PUT /api/parts/:id` - 部品更新
- `GET /api/parts/:id/transactions` - 在庫移動履歴
- `POST /api/inventory/transactions` - 在庫移動記録
- `GET /api/inventory/low-stock` - 低在庫アラート

### コスト管理 (4エンドポイント)
- `GET /api/budgets` - 予算一覧
- `POST /api/budgets` - 予算作成
- `PUT /api/budgets/:id` - 予算更新
- `GET /api/costs/analysis` - コスト分析

### 通知・アラート (8エンドポイント)
- `GET /api/notifications` - 通知一覧
- `POST /api/notifications` - 通知作成
- `PUT /api/notifications/:id/read` - 既読設定
- `PUT /api/notifications/read-all` - 全既読
- `GET /api/alerts/settings` - アラート設定一覧
- `POST /api/alerts/settings` - アラート設定作成
- `PUT /api/alerts/settings/:id` - アラート設定更新

### ドキュメント管理 (4エンドポイント)
- `GET /api/documents` - ドキュメント一覧
- `POST /api/documents` - ドキュメント登録
- `PUT /api/documents/:id` - ドキュメント更新
- `GET /api/documents/equipment/:equipmentId` - 設備別ドキュメント

### 最終更新
- **日付**: 2025-11-08
- **バージョン**: v1.5.0-beta（バックエンドAPI実装完了）
- **ステータス**: 🚀 APIフェーズ完了、UI実装待ち
- **最新の変更**: 
  - 包括的なCMMS機能のバックエンドAPI実装完了（全83エンドポイント）
  - チェックリスト、作業履歴、部品管理、故障報告、コスト管理、通知など全機能のAPI実装
  - 拡張アナリティクスAPI実装（KPI: uptime, MTBF, MTTR, チェックリスト合格率）
  - 全APIエンドポイントの動作確認完了
  - **次のステップ**: フロントエンドUIコンポーネントの実装

### 配管管理
1. 左サイドバーの配管リストで配管を選択
2. **編集アイコン**をクリックして配管情報を編集
3. **「経路を変更」**で3D空間での始点・終点を再設定可能
4. **「保存」**をクリックしてデータベースに保存
5. **削除アイコン**で配管を削除

### 新規配管作成
1. **「配管を追加」ボタン**をクリック（左サイドバー）
2. **「配管経路を指定」**をクリック
3. 3D空間で配管の**始点**をクリック
4. 続いて配管の**終点**をクリック
5. 配管情報を入力（名前、タイプ、材質、口径など）
6. **「保存」**をクリック
