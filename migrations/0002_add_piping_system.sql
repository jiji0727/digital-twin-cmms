-- Piping System Table (配管システム)
CREATE TABLE IF NOT EXISTS piping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pipe_type TEXT NOT NULL, -- 'supply', 'return', 'drain', 'vent', 'other'
  material TEXT, -- 'steel', 'copper', 'pvc', 'other'
  diameter REAL, -- pipe diameter in mm
  status TEXT NOT NULL DEFAULT 'operational', -- 'operational', 'warning', 'critical', 'maintenance'
  pressure_rating REAL, -- pressure rating in bar/psi
  temperature_rating REAL, -- temperature rating in celsius
  start_x REAL NOT NULL,
  start_y REAL NOT NULL,
  start_z REAL NOT NULL,
  end_x REAL NOT NULL,
  end_y REAL NOT NULL,
  end_z REAL NOT NULL,
  color TEXT DEFAULT '#2563eb', -- hex color for visualization
  description TEXT,
  installation_date TEXT,
  last_inspection TEXT,
  next_inspection TEXT,
  connected_equipment_id INTEGER, -- optional link to equipment
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (connected_equipment_id) REFERENCES equipment(id) ON DELETE SET NULL
);

-- Piping Inspection Records (配管点検記録)
CREATE TABLE IF NOT EXISTS piping_inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  piping_id INTEGER NOT NULL,
  inspection_date TEXT NOT NULL,
  inspector TEXT,
  inspection_type TEXT NOT NULL, -- 'visual', 'pressure_test', 'leak_test', 'ultrasonic'
  result TEXT NOT NULL, -- 'pass', 'fail', 'warning'
  findings TEXT,
  corrective_action TEXT,
  next_inspection_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (piping_id) REFERENCES piping(id) ON DELETE CASCADE
);

-- Indexes for piping
CREATE INDEX IF NOT EXISTS idx_piping_status ON piping(status);
CREATE INDEX IF NOT EXISTS idx_piping_type ON piping(pipe_type);
CREATE INDEX IF NOT EXISTS idx_piping_equipment ON piping(connected_equipment_id);
CREATE INDEX IF NOT EXISTS idx_piping_inspections_piping ON piping_inspections(piping_id);
CREATE INDEX IF NOT EXISTS idx_piping_inspections_date ON piping_inspections(inspection_date);
