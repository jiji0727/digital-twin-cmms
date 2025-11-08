-- Comprehensive CMMS Features Migration
-- チェックシート・点検項目、作業履歴、部品管理、故障報告、コスト管理など

-- ============================================
-- 1. チェックシート・点検項目管理
-- ============================================

-- チェックシートテンプレート
CREATE TABLE IF NOT EXISTS checklist_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT, -- 'HVAC', 'Electrical', 'Plumbing', etc.
  frequency TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- チェック項目
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  item_order INTEGER DEFAULT 0,
  category TEXT, -- '外観点検', '動作確認', '計測', etc.
  item_text TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'checkbox', 'numeric', 'text', 'select', 'photo'
  normal_range TEXT, -- 正常範囲（数値項目の場合）
  options TEXT, -- 選択肢（select型の場合、JSON形式）
  is_required INTEGER DEFAULT 1,
  alert_on_abnormal INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
);

-- チェックシート実行記録
CREATE TABLE IF NOT EXISTS checklist_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  equipment_id INTEGER NOT NULL,
  executor_name TEXT NOT NULL,
  execution_date TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abnormal_found'
  total_items INTEGER DEFAULT 0,
  checked_items INTEGER DEFAULT 0,
  abnormal_items INTEGER DEFAULT 0,
  notes TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- チェック項目の実行結果
CREATE TABLE IF NOT EXISTS checklist_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  check_value TEXT, -- チェック結果（文字列、数値、写真URLなど）
  is_normal INTEGER DEFAULT 1,
  notes TEXT,
  checked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (execution_id) REFERENCES checklist_executions(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES checklist_items(id)
);

-- ============================================
-- 2. 作業履歴・実績記録
-- ============================================

-- 作業実績記録（work_ordersを拡張）
CREATE TABLE IF NOT EXISTS work_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER,
  equipment_id INTEGER NOT NULL,
  work_type TEXT NOT NULL, -- 'preventive', 'corrective', 'inspection', 'emergency'
  title TEXT NOT NULL,
  description TEXT,
  executor_name TEXT,
  start_time TEXT,
  end_time TEXT,
  actual_hours REAL,
  labor_cost REAL,
  parts_cost REAL,
  other_cost REAL,
  total_cost REAL,
  status TEXT DEFAULT 'completed', -- 'completed', 'partial', 'failed'
  result_notes TEXT,
  before_photos TEXT, -- JSON array of photo URLs
  after_photos TEXT, -- JSON array of photo URLs
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

-- ============================================
-- 3. 部品・在庫管理
-- ============================================

-- 部品マスタ
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'electrical', 'mechanical', 'filter', 'lubricant', etc.
  manufacturer TEXT,
  model_number TEXT,
  unit_price REAL,
  unit TEXT DEFAULT 'piece', -- 'piece', 'set', 'meter', 'liter', etc.
  min_stock_level INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  location TEXT, -- 保管場所
  photo_url TEXT,
  specifications TEXT, -- JSON format
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 在庫移動履歴
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
  quantity INTEGER NOT NULL,
  unit_price REAL,
  reference_type TEXT, -- 'work_order', 'purchase_order', 'adjustment'
  reference_id INTEGER,
  notes TEXT,
  performed_by TEXT,
  transaction_date TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- 作業で使用した部品
CREATE TABLE IF NOT EXISTS work_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_history_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL,
  total_cost REAL,
  notes TEXT,
  FOREIGN KEY (work_history_id) REFERENCES work_history(id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts(id)
);

-- ============================================
-- 4. 故障・不具合報告
-- ============================================

-- 故障・不具合報告
CREATE TABLE IF NOT EXISTS failure_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  reporter_name TEXT NOT NULL,
  report_date TEXT DEFAULT (datetime('now')),
  failure_type TEXT, -- 'breakdown', 'malfunction', 'abnormal_sound', 'leak', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'reported', -- 'reported', 'investigating', 'in_repair', 'resolved', 'closed'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  symptoms TEXT,
  photo_urls TEXT, -- JSON array
  video_urls TEXT, -- JSON array
  downtime_start TEXT,
  downtime_end TEXT,
  downtime_hours REAL,
  root_cause TEXT,
  corrective_action TEXT,
  assigned_to TEXT,
  work_order_id INTEGER,
  resolved_date TEXT,
  cost REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
);

-- ============================================
-- 5. コスト管理
-- ============================================

-- 予算管理
CREATE TABLE IF NOT EXISTS maintenance_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year INTEGER NOT NULL,
  department TEXT,
  category TEXT, -- 'preventive', 'corrective', 'parts', 'labor', 'external'
  budget_amount REAL NOT NULL,
  spent_amount REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- コスト記録（統合ビュー用）
-- work_history, work_parts, inventory_transactions からコストを集計

-- ============================================
-- 6. 設備ドキュメント管理
-- ============================================

-- 設備ドキュメント
CREATE TABLE IF NOT EXISTS equipment_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  document_type TEXT NOT NULL, -- 'manual', 'drawing', 'certificate', 'warranty', etc.
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'pdf', 'image', 'video', etc.
  file_size INTEGER,
  description TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- ============================================
-- 7. 通知・アラート設定
-- ============================================

-- アラート設定
CREATE TABLE IF NOT EXISTS alert_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'maintenance_due', 'inspection_overdue', 'low_stock', 'failure_critical'
  condition_json TEXT NOT NULL, -- JSON format for conditions
  notification_channels TEXT, -- 'email', 'sms', 'dashboard' (JSON array)
  recipients TEXT, -- JSON array of email addresses or user IDs
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 通知履歴
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_setting_id INTEGER,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  status TEXT DEFAULT 'unread', -- 'unread', 'read', 'acknowledged'
  reference_type TEXT, -- 'equipment', 'work_order', 'failure_report', etc.
  reference_id INTEGER,
  sent_to TEXT, -- JSON array
  sent_at TEXT DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (alert_setting_id) REFERENCES alert_settings(id)
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_checklist_templates_type ON checklist_templates(equipment_type);
CREATE INDEX IF NOT EXISTS idx_checklist_executions_equipment ON checklist_executions(equipment_id);
CREATE INDEX IF NOT EXISTS idx_checklist_executions_date ON checklist_executions(execution_date);
CREATE INDEX IF NOT EXISTS idx_work_history_equipment ON work_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_history_date ON work_history(start_time);
CREATE INDEX IF NOT EXISTS idx_parts_number ON parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_part ON inventory_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_failure_reports_equipment ON failure_reports(equipment_id);
CREATE INDEX IF NOT EXISTS idx_failure_reports_status ON failure_reports(status);
CREATE INDEX IF NOT EXISTS idx_failure_reports_severity ON failure_reports(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);
