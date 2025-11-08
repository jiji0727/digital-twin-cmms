# 🚀 Cloudflare Pages デプロイメントガイド

## 前提条件

1. **Cloudflare アカウント**: https://dash.cloudflare.com/sign-up
2. **API トークン**: Pages 編集権限付き
3. **プロジェクト名**: `digital-twin-cmms`

---

## 📋 デプロイ手順

### **ステップ1: Cloudflare API キーの設定**

#### 方法A: Deploy タブから設定（推奨）
1. サイドバーの **Deploy** タブを開く
2. 指示に従ってCloudflare API トークンを作成
3. API キーを入力して保存

#### 方法B: 手動でトークン作成
1. https://dash.cloudflare.com/profile/api-tokens にアクセス
2. 「Create Token」をクリック
3. 「Edit Cloudflare Workers」テンプレートを選択
4. **Account Resources** で自分のアカウントを選択
5. **Zone Resources** で「All zones」を選択
6. トークンを作成してコピー

---

### **ステップ2: 認証確認**

```bash
# API キー設定後、認証を確認
cd /home/user/webapp
npx wrangler whoami
```

**期待される出力**:
```
Getting User settings...
👋 You are logged in with an API Token, associated with the email '***@***.com'!
```

---

### **ステップ3: プロジェクトのビルド**

```bash
cd /home/user/webapp
npm run build
```

**ビルド結果**:
- `dist/_worker.js`: Honoアプリケーション（44KB）
- `dist/models/BigMirror/`: 3Dモデル（31.9MB）
- `dist/sdk/`: LCC SDK（788KB）
- `dist/static/`: Three.jsライブラリ

---

### **ステップ4: Cloudflare Pages プロジェクト作成**

```bash
npx wrangler pages project create digital-twin-cmms \
  --production-branch main \
  --compatibility-date 2024-01-01
```

**成功メッセージ**:
```
✨ Successfully created the 'digital-twin-cmms' project.
```

---

### **ステップ5: デプロイ実行**

```bash
npx wrangler pages deploy dist --project-name digital-twin-cmms
```

**デプロイ中の出力例**:
```
🌍 Uploading... (32/32)

✨ Success! Uploaded 32 files (33.5 MB total)

🌎 Deploying...
✨ Deployment complete! Take a peek over at https://abc123.digital-twin-cmms.pages.dev
```

---

## 🌐 デプロイ後のURL

デプロイが成功すると、以下のURLが発行されます：

### **プロダクション URL**
```
https://digital-twin-cmms.pages.dev
```

### **ブランチ URL**
```
https://main.digital-twin-cmms.pages.dev
```

### **プレビュー URL**
```
https://[commit-hash].digital-twin-cmms.pages.dev
```

---

## 🔧 トラブルシューティング

### **問題1: 認証エラー**
```
Error: Not logged in
```

**解決策**:
- Deploy タブでAPI キーを再設定
- `npx wrangler whoami` で確認

### **問題2: プロジェクト名の重複**
```
Error: Project with name 'digital-twin-cmms' already exists
```

**解決策**:
```bash
# 別の名前を使用
npx wrangler pages deploy dist --project-name digital-twin-cmms-2
```

### **問題3: ファイルサイズ制限**
```
Error: Upload too large
```

**解決策**:
- 現在のサイズ: 約33.5MB（制限内）
- Cloudflare Pages制限: 25MB per file
- Big Mirrorモデル: 31.9MB（複数ファイルに分割済み）

---

## 📊 デプロイ内容

### **アップロードされるファイル**
```
dist/
├── _worker.js (44KB)          # Honoアプリケーション
├── _routes.json               # ルーティング設定
├── models/BigMirror/          # 3D Gaussian Splattingモデル
│   ├── meta.lcc (1.7KB)       # モデルメタデータ
│   ├── data.bin (31.9MB)      # 点群データ
│   ├── environment.bin (24KB) # 環境マップ
│   └── collision.lci (534KB)  # コリジョン検出
├── sdk/
│   └── lcc-0.5.3.js (788KB)   # XGrids LCC SDK
└── static/
    ├── js/viewer.js           # メインビューワー
    └── engine/three/          # Three.jsライブラリ
```

### **合計サイズ**: 約33.5MB

---

## ⚙️ カスタムドメインの設定（オプション）

### **手順**:
1. Cloudflare Dashboardにログイン
2. `Workers & Pages` → `digital-twin-cmms` を選択
3. `Custom domains` タブを開く
4. `Add custom domain` をクリック
5. ドメイン名を入力（例: `cmms.example.com`）
6. DNS設定を確認

---

## 🔐 環境変数の設定（将来の拡張用）

```bash
# 例: APIキーの設定
npx wrangler pages secret put API_KEY --project-name digital-twin-cmms
```

---

## 📈 デプロイ後の確認

### **チェックリスト**:
- [ ] ページが正常に表示される
- [ ] Big Mirrorモデルが読み込まれる（約30秒）
- [ ] 設備マーカーが表示される
- [ ] CMMS機能が動作する
- [ ] スクリーンショット機能が動作する
- [ ] レスポンシブデザインが適用される

### **テストURL**:
```
https://digital-twin-cmms.pages.dev
```

---

## 🎯 次のステップ

1. ✅ Cloudflare API キーを設定
2. ✅ `npx wrangler whoami` で認証確認
3. ✅ `npx wrangler pages project create` でプロジェクト作成
4. ✅ `npx wrangler pages deploy` でデプロイ実行
5. ✅ ブラウザでURLを開いて確認

---

## 📞 サポート

- **Cloudflare Pages ドキュメント**: https://developers.cloudflare.com/pages/
- **Wrangler CLI ドキュメント**: https://developers.cloudflare.com/workers/wrangler/
- **プロジェクトバックアップ**: https://page.gensparksite.com/project_backups/digital-twin-cmms-lcc-final.tar.gz

---

**準備完了！Deploy タブでAPI キーを設定後、上記のコマンドを実行してください！** 🚀
