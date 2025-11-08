-- Sample piping data for Digital Twin CMMS
INSERT INTO piping (name, pipe_type, material, diameter, status, pressure_rating, temperature_rating, 
                    start_x, start_y, start_z, end_x, end_y, end_z, color, description, next_inspection)
VALUES 
  ('給水主管1', 'supply', 'steel', 150, 'operational', 10, 80, -5, 1, -2, 5, 1, -2, '#2563eb', '1階給水主配管', '2024-12-01'),
  ('給水主管2', 'supply', 'steel', 150, 'operational', 10, 80, 5, 1, -2, 10, 3, 2, '#2563eb', '2階への給水', '2024-12-01'),
  ('還水管1', 'return', 'steel', 100, 'operational', 8, 70, 10, 3, 2, 5, 1, -2, '#10b981', '冷却水還水管', '2024-11-15'),
  ('排水管1', 'drain', 'pvc', 100, 'operational', 2, 40, -3, 0.5, 3, -3, 0.5, -5, '#6b7280', '排水主管', '2024-12-10'),
  ('通気管1', 'vent', 'pvc', 50, 'operational', 1, 30, -3, 0.5, -5, -3, 5, -5, '#f59e0b', '通気管', '2025-01-05'),
  ('冷媒管1', 'other', 'copper', 25, 'warning', 15, -10, 2, 2, 1, 8, 2, 1, '#f97316', '空調冷媒管', '2024-11-20'),
  ('給水支管1', 'supply', 'steel', 80, 'operational', 10, 80, 0, 1, 0, 0, 3, 0, '#3b82f6', 'ポンプA接続管', '2024-12-05'),
  ('給水支管2', 'supply', 'steel', 80, 'operational', 10, 80, 3, 1, 1, 3, 3, 1, '#3b82f6', 'ポンプB接続管', '2024-12-05');
