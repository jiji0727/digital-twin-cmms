import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/sdk/*', serveStatic({ root: './public' }))
app.use('/models/*', serveStatic({ root: './public' }))

// API routes for CMMS functionality
app.get('/api/equipment', (c) => {
  // Mock equipment data - would connect to D1 database in production
  return c.json([
    { id: 1, name: 'Equipment A', status: 'operational', lastMaintenance: '2024-11-01', location: { x: 10, y: 5, z: 2 } },
    { id: 2, name: 'Equipment B', status: 'warning', lastMaintenance: '2024-10-15', location: { x: -5, y: 8, z: 1 } },
    { id: 3, name: 'Equipment C', status: 'critical', lastMaintenance: '2024-09-20', location: { x: 15, y: -3, z: 3 } }
  ])
})

app.get('/api/maintenance', (c) => {
  return c.json([
    { id: 1, equipmentId: 1, type: 'preventive', scheduledDate: '2024-11-15', status: 'scheduled' },
    { id: 2, equipmentId: 2, type: 'corrective', scheduledDate: '2024-11-10', status: 'in-progress' },
    { id: 3, equipmentId: 3, type: 'emergency', scheduledDate: '2024-11-08', status: 'urgent' }
  ])
})

app.get('/api/workorders', (c) => {
  return c.json([
    { id: 1, title: 'Routine Inspection', equipmentId: 1, priority: 'low', assignedTo: 'John Doe', dueDate: '2024-11-12' },
    { id: 2, title: 'Bearing Replacement', equipmentId: 2, priority: 'medium', assignedTo: 'Jane Smith', dueDate: '2024-11-09' },
    { id: 3, title: 'Emergency Repair', equipmentId: 3, priority: 'high', assignedTo: 'Mike Johnson', dueDate: '2024-11-08' }
  ])
})

app.get('/api/analytics', (c) => {
  return c.json({
    totalEquipment: 150,
    operational: 142,
    warning: 6,
    critical: 2,
    maintenanceCompliance: 94.5,
    avgResponseTime: 2.3,
    uptime: 98.7
  })
})

// Main viewer page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Digital Twin CMMS - 次世代デジタルツイン資産管理システム</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { height: 100%; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
            #app { height: 100%; display: flex; flex-direction: column; }
            #viewer-canvas { width: 100%; height: 100%; display: block; background: #0a0a0a; }
            .panel { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(148, 163, 184, 0.1); }
            .glass { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
            .status-operational { color: #10b981; }
            .status-warning { color: #f59e0b; }
            .status-critical { color: #ef4444; }
            .control-btn { 
                transition: all 0.2s; 
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .control-btn:hover { 
                background: rgba(255, 255, 255, 0.2); 
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            .control-btn.active {
                background: rgba(59, 130, 246, 0.3);
                border-color: #3b82f6;
            }
            .equipment-marker {
                position: absolute;
                width: 24px;
                height: 24px;
                margin-left: -12px;
                margin-top: -12px;
                border-radius: 50%;
                border: 2px solid white;
                cursor: pointer;
                transition: all 0.2s;
                animation: pulse 2s infinite;
            }
            .equipment-marker:hover {
                transform: scale(1.3);
            }
            @keyframes pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                50% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
            }
            .metric-card {
                transition: transform 0.2s;
            }
            .metric-card:hover {
                transform: translateY(-2px);
            }
            .sidebar-panel {
                width: 320px;
                overflow-y: auto;
            }
            .sidebar-panel::-webkit-scrollbar {
                width: 6px;
            }
            .sidebar-panel::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
            }
            .sidebar-panel::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            #loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.5s;
            }
            #loading-screen.fade-out {
                opacity: 0;
                pointer-events: none;
            }
            .loader {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(59, 130, 246, 0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <!-- Loading Screen -->
        <div id="loading-screen">
            <div class="text-center">
                <div class="loader mx-auto mb-4"></div>
                <div class="text-white text-lg font-semibold">Digital Twin CMMS</div>
                <div class="text-blue-400 text-sm mt-2" id="loading-progress">0%</div>
            </div>
        </div>

        <div id="app">
            <!-- Top Navigation Bar -->
            <div class="panel flex items-center justify-between px-6 py-3 shadow-lg z-50">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-cube text-blue-500 text-2xl"></i>
                    <div>
                        <h1 class="text-white text-xl font-bold">Digital Twin CMMS</h1>
                        <p class="text-gray-400 text-xs">次世代デジタルツイン資産管理システム</p>
                    </div>
                </div>
                
                <div class="flex items-center space-x-2" id="view-controls">
                    <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="resetView()">
                        <i class="fas fa-home mr-2"></i>ホーム視点
                    </button>
                    <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="toggleViewMode()">
                        <i class="fas fa-expand-arrows-alt mr-2"></i>視点切替
                    </button>
                    <button class="control-btn px-4 py-2 text-white rounded text-sm active" onclick="toggleMeasure()">
                        <i class="fas fa-ruler mr-2"></i>計測
                    </button>
                    <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="toggleSection()">
                        <i class="fas fa-cut mr-2"></i>断面
                    </button>
                    <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="takeScreenshot()">
                        <i class="fas fa-camera mr-2"></i>スクショ
                    </button>
                </div>

                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <div class="text-white text-sm font-semibold">稼働率</div>
                        <div class="text-green-400 text-lg font-bold" id="uptime-display">98.7%</div>
                    </div>
                    <button class="control-btn px-4 py-2 text-white rounded">
                        <i class="fas fa-user-circle mr-2"></i>Admin
                    </button>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="flex-1 flex relative overflow-hidden">
                <!-- Left Sidebar - Equipment & Maintenance -->
                <div class="sidebar-panel panel h-full p-4 space-y-4">
                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-chart-line mr-2 text-blue-400"></i>
                            システム概要
                        </h3>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="metric-card glass rounded p-3">
                                <div class="text-gray-400 text-xs">総設備数</div>
                                <div class="text-white text-2xl font-bold">150</div>
                            </div>
                            <div class="metric-card glass rounded p-3">
                                <div class="text-gray-400 text-xs">稼働中</div>
                                <div class="text-green-400 text-2xl font-bold">142</div>
                            </div>
                            <div class="metric-card glass rounded p-3">
                                <div class="text-gray-400 text-xs">警告</div>
                                <div class="text-yellow-400 text-2xl font-bold">6</div>
                            </div>
                            <div class="metric-card glass rounded p-3">
                                <div class="text-gray-400 text-xs">緊急</div>
                                <div class="text-red-400 text-2xl font-bold">2</div>
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-cogs mr-2 text-green-400"></i>
                            設備一覧
                        </h3>
                        <div class="space-y-2" id="equipment-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-wrench mr-2 text-orange-400"></i>
                            保守計画
                        </h3>
                        <div class="space-y-2" id="maintenance-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>
                </div>

                <!-- 3D Viewer Canvas -->
                <div class="flex-1 relative">
                    <canvas id="viewer-canvas"></canvas>
                    
                    <!-- Floating Control Panel -->
                    <div class="absolute top-4 right-4 glass rounded-lg p-3 space-y-2" style="width: 200px;">
                        <h4 class="text-white text-sm font-semibold mb-2">表示設定</h4>
                        <div class="space-y-2">
                            <label class="flex items-center text-white text-sm cursor-pointer">
                                <input type="checkbox" checked onchange="toggleEquipmentMarkers(this)" class="mr-2">
                                設備マーカー
                            </label>
                            <label class="flex items-center text-white text-sm cursor-pointer">
                                <input type="checkbox" checked onchange="toggleGrid(this)" class="mr-2">
                                グリッド表示
                            </label>
                            <label class="flex items-center text-white text-sm cursor-pointer">
                                <input type="checkbox" checked onchange="toggleEnvironment(this)" class="mr-2">
                                環境マップ
                            </label>
                        </div>
                        <div class="mt-3">
                            <label class="text-white text-xs">点群密度</label>
                            <input type="range" min="1" max="10" value="8" class="w-full" onchange="updatePointDensity(this.value)">
                        </div>
                    </div>

                    <!-- Selection Info Panel -->
                    <div id="selection-panel" class="absolute bottom-4 left-4 glass rounded-lg p-4 hidden" style="min-width: 300px;">
                        <div class="flex items-start justify-between mb-2">
                            <h4 class="text-white font-semibold">選択中の設備</h4>
                            <button onclick="closeSelection()" class="text-gray-400 hover:text-white">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div id="selection-content"></div>
                    </div>
                </div>

                <!-- Right Sidebar - Work Orders & Alerts -->
                <div class="sidebar-panel panel h-full p-4 space-y-4">
                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-clipboard-list mr-2 text-purple-400"></i>
                            作業指示
                        </h3>
                        <div class="space-y-2" id="workorder-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-bell mr-2 text-red-400"></i>
                            アラート
                        </h3>
                        <div class="space-y-2">
                            <div class="glass rounded p-3 border-l-4 border-red-500">
                                <div class="text-red-400 font-semibold text-sm">緊急</div>
                                <div class="text-white text-xs mt-1">Equipment C: 温度異常検知</div>
                                <div class="text-gray-400 text-xs mt-1">5分前</div>
                            </div>
                            <div class="glass rounded p-3 border-l-4 border-yellow-500">
                                <div class="text-yellow-400 font-semibold text-sm">警告</div>
                                <div class="text-white text-xs mt-1">Equipment B: 振動値上昇</div>
                                <div class="text-gray-400 text-xs mt-1">1時間前</div>
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-lg p-4">
                        <h3 class="text-white font-semibold mb-3 flex items-center">
                            <i class="fas fa-chart-area mr-2 text-blue-400"></i>
                            リアルタイム監視
                        </h3>
                        <div class="space-y-3">
                            <div>
                                <div class="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>CPU使用率</span>
                                    <span>67%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-blue-500 h-2 rounded-full" style="width: 67%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>メモリ使用率</span>
                                    <span>54%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full" style="width: 54%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>ネットワーク</span>
                                    <span>23%</span>
                                </div>
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-purple-500 h-2 rounded-full" style="width: 23%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/js/viewer.js" type="module"></script>
    </body>
    </html>
  `)
})

export default app
