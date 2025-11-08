-- Equipment Table (設備管理)
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'operational',
  location_x REAL NOT NULL,
  location_y REAL NOT NULL,
  location_z REAL NOT NULL,
  description TEXT,
  installation_date TEXT,
  last_maintenance TEXT,
  next_maintenance TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Maintenance Plans Table (保守計画)
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  last_performed TEXT,
  next_scheduled TEXT NOT NULL,
  estimated_duration INTEGER,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'scheduled',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Work Orders Table (作業指示)
CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL,
  maintenance_plan_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  scheduled_date TEXT,
  completed_date TEXT,
  estimated_hours REAL,
  actual_hours REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (maintenance_plan_id) REFERENCES maintenance_plans(id) ON DELETE SET NULL
);

-- Analytics / Events Table (分析・イベント)
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER,
  event_type TEXT NOT NULL,
  event_data TEXT,
  severity TEXT DEFAULT 'info',
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_equipment ON maintenance_plans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plans_next_scheduled ON maintenance_plans(next_scheduled);
CREATE INDEX IF NOT EXISTS idx_work_orders_equipment ON work_orders(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_analytics_equipment ON analytics_events(equipment_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp);
