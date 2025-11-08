-- Seed Data for Digital Twin CMMS

-- Insert Equipment (Big Mirrorの3D空間内に配置)
INSERT INTO equipment (name, type, status, location_x, location_y, location_z, description, installation_date, last_maintenance, next_maintenance) VALUES
  ('冷却システムA', 'HVAC', 'operational', 10.0, 5.0, 2.0, '北側冷却システム - 主要空調装置', '2023-01-15', '2024-10-01', '2025-01-15'),
  ('電力制御パネルB', 'Electrical', 'warning', -5.0, 8.0, 1.5, '中央電力制御システム - 定期点検が必要', '2022-06-20', '2024-09-15', '2024-12-20'),
  ('給水ポンプC', 'Plumbing', 'critical', 15.0, -3.0, 3.0, '地下給水システム - 緊急メンテナンス必要', '2021-03-10', '2024-08-05', '2024-11-10'),
  ('換気システムD', 'HVAC', 'operational', -8.0, 12.0, 2.5, '東側換気システム - 正常稼働中', '2023-05-22', '2024-10-20', '2025-02-22'),
  ('照明制御E', 'Electrical', 'operational', 3.0, -6.0, 4.0, 'スマート照明制御システム', '2023-08-30', '2024-11-01', '2025-05-30'),
  ('消火設備F', 'Safety', 'operational', -12.0, 0.0, 1.0, '自動消火スプリンクラーシステム', '2022-02-14', '2024-09-30', '2025-02-14'),
  ('エレベーター制御G', 'Transportation', 'warning', 0.0, 15.0, 0.5, '昇降機制御システム - 点検推奨', '2021-11-05', '2024-08-20', '2024-11-05'),
  ('セキュリティゲートH', 'Security', 'operational', 18.0, 10.0, 1.2, '入退場管理システム', '2023-04-18', '2024-10-15', '2025-04-18');

-- Insert Maintenance Plans
INSERT INTO maintenance_plans (equipment_id, title, description, frequency, last_performed, next_scheduled, estimated_duration, priority, status) VALUES
  (1, '冷却システム定期点検', 'フィルター交換、冷媒チェック、動作確認', 'quarterly', '2024-10-01', '2025-01-15', 240, 'high', 'scheduled'),
  (2, '電力パネル安全検査', '絶縁抵抗測定、接続確認、温度チェック', 'quarterly', '2024-09-15', '2024-12-20', 180, 'high', 'scheduled'),
  (3, 'ポンプ緊急修理', 'モーター交換、配管漏れ修理、性能テスト', 'on-demand', '2024-08-05', '2024-11-10', 480, 'critical', 'in-progress'),
  (4, '換気システム清掃', 'ダクト清掃、フィルター交換、風量測定', 'semi-annual', '2024-10-20', '2025-02-22', 300, 'medium', 'scheduled'),
  (5, '照明システム点検', 'LED状態確認、センサー校正、タイマー設定', 'annual', '2024-11-01', '2025-05-30', 120, 'low', 'scheduled'),
  (6, '消火設備法定点検', 'スプリンクラー動作試験、配管圧力確認', 'semi-annual', '2024-09-30', '2025-02-14', 360, 'critical', 'scheduled'),
  (7, 'エレベーター法定検査', '安全装置確認、ワイヤー点検、動作試験', 'annual', '2024-08-20', '2024-11-05', 420, 'high', 'scheduled'),
  (8, 'セキュリティシステム更新', 'ファームウェア更新、カードリーダー確認', 'quarterly', '2024-10-15', '2025-04-18', 90, 'medium', 'scheduled');

-- Insert Work Orders
INSERT INTO work_orders (equipment_id, maintenance_plan_id, title, description, type, priority, status, assigned_to, scheduled_date, estimated_hours) VALUES
  (1, 1, '冷却システムA - Q4定期点検', 'フィルター交換とシステム全体のチェック', 'preventive', 'high', 'scheduled', '田中太郎', '2025-01-15', 4.0),
  (2, 2, '電力パネルB - 安全検査', '絶縁抵抗測定と接続部の点検', 'preventive', 'high', 'scheduled', '佐藤花子', '2024-12-20', 3.0),
  (3, 3, 'ポンプC - 緊急修理作業', 'モーター交換と配管修理の緊急対応', 'corrective', 'critical', 'in-progress', '鈴木一郎', '2024-11-08', 8.0),
  (4, 4, '換気システムD - 清掃作業', 'ダクト内清掃とフィルター全交換', 'preventive', 'medium', 'scheduled', '高橋美咲', '2025-02-22', 5.0),
  (7, 7, 'エレベーターG - 法定検査', '年次法定検査の実施', 'inspection', 'high', 'pending', '山田健二', '2024-11-05', 7.0),
  (3, NULL, 'ポンプC - 異常音調査', '稼働中の異常音の原因調査', 'inspection', 'high', 'completed', '鈴木一郎', '2024-11-06', 2.0),
  (2, NULL, '電力パネルB - 温度上昇対応', '異常発熱の緊急確認', 'corrective', 'high', 'completed', '佐藤花子', '2024-11-07', 1.5),
  (8, 8, 'セキュリティゲートH - システム更新', 'ファームウェアアップデート作業', 'preventive', 'medium', 'pending', '伊藤誠', '2025-04-18', 1.5);

-- Insert Analytics Events
INSERT INTO analytics_events (equipment_id, event_type, event_data, severity, timestamp) VALUES
  (1, 'status_change', '{"from":"operational","to":"operational","reason":"routine_check"}', 'info', '2024-11-08 10:00:00'),
  (2, 'temperature_alert', '{"temperature":78.5,"threshold":75,"unit":"celsius"}', 'warning', '2024-11-07 14:30:00'),
  (3, 'vibration_alert', '{"vibration_level":8.2,"threshold":5.0,"unit":"mm/s"}', 'critical', '2024-11-06 09:15:00'),
  (3, 'status_change', '{"from":"operational","to":"critical","reason":"abnormal_vibration"}', 'critical', '2024-11-06 09:20:00'),
  (4, 'maintenance_completed', '{"task":"filter_replacement","duration_hours":5.2}', 'info', '2024-10-20 16:00:00'),
  (5, 'energy_consumption', '{"kwh":245.8,"daily_average":250,"efficiency":"98%"}', 'info', '2024-11-08 00:00:00'),
  (6, 'pressure_check', '{"pressure":6.8,"threshold":7.0,"unit":"bar","status":"normal"}', 'info', '2024-09-30 11:00:00'),
  (7, 'door_cycle_count', '{"cycles":15234,"maintenance_threshold":20000}', 'info', '2024-11-08 08:00:00'),
  (8, 'access_log', '{"entries":1247,"unauthorized_attempts":0}', 'info', '2024-11-08 12:00:00'),
  (1, 'efficiency_report', '{"cooling_efficiency":"92%","energy_savings":"15%"}', 'info', '2024-11-08 06:00:00');
