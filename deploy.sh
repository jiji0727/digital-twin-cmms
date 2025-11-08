#!/bin/bash
# Digital Twin CMMS - Safe Deployment Script
# このスクリプトは毎回安全にサーバーを再起動します

set -e  # エラーで停止

echo "🚀 Digital Twin CMMS デプロイメント開始..."

# 1. 既存プロセスを停止
echo "📦 既存プロセスをクリーンアップ中..."
pkill -9 workerd 2>/dev/null || true
pkill -9 wrangler 2>/dev/null || true
pkill -9 node 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
sleep 3

# 2. ポートをクリーンアップ
echo "🔌 ポート3000をクリーンアップ中..."
fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# 3. ビルド
echo "🔨 プロジェクトをビルド中..."
cd /home/user/webapp
npm run build

# 4. データベース確認（マイグレーション済みかチェック）
echo "💾 データベース状態を確認中..."
npx wrangler d1 migrations apply digital-twin-cmms-production --local 2>&1 | grep -q "No migrations" && echo "✅ DB already migrated" || echo "✅ DB migrations applied"

# 5. サーバー起動
echo "🌐 サーバーを起動中..."
nohup npx wrangler pages dev dist --d1=digital-twin-cmms-production --local --ip 0.0.0.0 --port 3000 </dev/null >/tmp/wrangler.log 2>&1 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

# 6. 起動待機
echo "⏳ サーバーの起動を待機中..."
sleep 12

# 7. ヘルスチェック
echo "🏥 ヘルスチェック実行中..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ デプロイメント成功！"
    echo "📊 メインページ: HTTP $HTTP_CODE"
    
    # API確認
    EQUIPMENT_COUNT=$(curl -s http://localhost:3000/api/equipment | python3 -c "import sys,json;print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    echo "📊 設備データ: $EQUIPMENT_COUNT 件"
    
    # モデルファイル確認
    MODEL_CHECK=$(timeout 2 curl -s http://localhost:3000/models/BigMirror/meta.lcc | head -1 | grep -q "{" && echo "OK" || echo "NG")
    echo "📊 モデルファイル: $MODEL_CHECK"
    
    echo ""
    echo "🌐 アクセスURL: https://3000-i5u2eevek55qty7xcvdvo-d0b9e1e2.sandbox.novita.ai"
    echo ""
else
    echo "❌ デプロイメント失敗: HTTP $HTTP_CODE"
    echo "📋 ログを確認してください: tail -50 /tmp/wrangler.log"
    exit 1
fi
