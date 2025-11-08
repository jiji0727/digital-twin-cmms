-- Comprehensive CMMS Test Data

-- ============================================
-- 1. チェックシートテンプレート
-- ============================================

INSERT INTO checklist_templates (name, description, equipment_type, frequency, is_active) VALUES
  ('HVAC日常点検', '空調設備の日常点検項目', 'HVAC', 'daily', 1),
  ('ポンプ週次点検', 'ポンプ設備の週次点検項目', 'Plumbing', 'weekly', 1),
  ('電気設備月次点検', '電気設備の月次点検項目', 'Electrical', 'monthly', 1),
  ('消防設備四半期点検', '消防設備の四半期点検項目', 'Safety', 'quarterly', 1);

-- チェック項目
INSERT INTO checklist_items (template_id, item_order, category, item_text, check_type, normal_range, is_required, alert_on_abnormal) VALUES
  -- HVAC日常点検
  (1, 1, '外観点検', '異音・異臭の有無', 'select', '{"options": ["異常なし", "軽微な異音", "異臭あり", "重大な異常"]}', 1, 1),
  (1, 2, '外観点検', '振動の確認', 'select', '{"options": ["正常", "やや大きい", "異常"]}', 1, 1),
  (1, 3, '計測', '室温（℃）', 'numeric', '20-26', 1, 1),
  (1, 4, '計測', '湿度（%）', 'numeric', '40-60', 1, 0),
  (1, 5, '動作確認', 'フィルター目詰まり', 'select', '{"options": ["良好", "やや汚れ", "交換必要"]}', 1, 1),
  
  -- ポンプ週次点検
  (2, 1, '外観点検', '漏水の有無', 'checkbox', NULL, 1, 1),
  (2, 2, '計測', '吐出圧力（MPa）', 'numeric', '0.3-0.5', 1, 1),
  (2, 3, '計測', 'モーター温度（℃）', 'numeric', '40-70', 1, 1),
  (2, 4, '動作確認', 'グランドパッキン状態', 'select', '{"options": ["正常", "やや摩耗", "交換必要"]}', 1, 0),
  (2, 5, '確認', '潤滑油量', 'select', '{"options": ["適正", "やや少ない", "補充必要"]}', 1, 1),
  
  -- 電気設備月次点検
  (3, 1, '計測', '電圧（V）', 'numeric', '195-210', 1, 1),
  (3, 2, '計測', '電流（A）', 'numeric', '0-50', 1, 0),
  (3, 3, '外観点検', '端子の緩み', 'checkbox', NULL, 1, 1),
  (3, 4, '外観点検', 'ケーブルの損傷', 'checkbox', NULL, 1, 1),
  (3, 5, '動作確認', '保護装置動作試験', 'checkbox', NULL, 1, 1);

-- ============================================
-- 2. チェックシート実行記録（過去の実績）
-- ============================================

INSERT INTO checklist_executions (template_id, equipment_id, executor_name, execution_date, status, total_items, checked_items, abnormal_items, completed_at) VALUES
  (1, 1, '山田太郎', '2025-11-07', 'completed', 5, 5, 0, '2025-11-07 09:30:00'),
  (1, 1, '山田太郎', '2025-11-06', 'completed', 5, 5, 1, '2025-11-06 09:15:00'),
  (2, 3, '佐藤花子', '2025-11-04', 'completed', 5, 5, 0, '2025-11-04 14:20:00'),
  (1, 2, '田中一郎', '2025-11-07', 'completed', 5, 5, 0, '2025-11-07 10:00:00');

-- チェック結果
INSERT INTO checklist_results (execution_id, item_id, check_value, is_normal, notes) VALUES
  -- 2025-11-07のHVAC点検（正常）
  (1, 1, '異常なし', 1, NULL),
  (1, 2, '正常', 1, NULL),
  (1, 3, '23.5', 1, NULL),
  (1, 4, '52', 1, NULL),
  (1, 5, '良好', 1, NULL),
  
  -- 2025-11-06のHVAC点検（異常あり）
  (2, 1, '軽微な異音', 0, 'ファンから小さな異音'),
  (2, 2, '正常', 1, NULL),
  (2, 3, '24.0', 1, NULL),
  (2, 4, '48', 1, NULL),
  (2, 5, 'やや汚れ', 1, NULL);

-- ============================================
-- 3. 作業履歴
-- ============================================

INSERT INTO work_history (equipment_id, work_type, title, description, executor_name, start_time, end_time, actual_hours, labor_cost, parts_cost, total_cost, status, result_notes) VALUES
  (1, 'preventive', 'HVACフィルター交換', '定期フィルター交換作業', '山田太郎', '2025-11-01 10:00:00', '2025-11-01 11:30:00', 1.5, 4500, 8000, 12500, 'completed', 'フィルター交換完了。動作正常。'),
  (3, 'corrective', 'ポンプ漏水修理', 'グランドパッキン交換', '佐藤花子', '2025-10-28 13:00:00', '2025-10-28 16:00:00', 3.0, 9000, 3500, 12500, 'completed', 'パッキン交換後、漏水停止確認。'),
  (2, 'inspection', 'エレベーター定期点検', '年次定期点検実施', '外部業者', '2025-10-15 09:00:00', '2025-10-15 14:00:00', 5.0, 25000, 0, 25000, 'completed', '異常なし。次回点検：2026-10-15'),
  (4, 'emergency', '照明器具緊急修理', '蛍光灯切れ交換', '田中一郎', '2025-11-05 15:00:00', '2025-11-05 15:30:00', 0.5, 1500, 800, 2300, 'completed', '蛍光灯交換完了。');

-- ============================================
-- 4. 部品マスタ
-- ============================================

INSERT INTO parts (part_number, name, description, category, manufacturer, unit_price, unit, min_stock_level, current_stock, location) VALUES
  ('FLT-HVAC-001', 'HVACフィルター', '空調機用フィルター（600x400mm）', 'filter', 'ダイキン', 8000, 'piece', 5, 12, '倉庫A-1'),
  ('PKG-PUMP-001', 'グランドパッキン', 'ポンプ用パッキン（φ25mm）', 'mechanical', 'イワキ', 1200, 'piece', 10, 25, '倉庫A-2'),
  ('LAMP-LED-001', 'LED蛍光灯', 'LED蛍光灯40W形', 'electrical', 'パナソニック', 800, 'piece', 20, 45, '倉庫B-1'),
  ('OIL-LUB-001', '潤滑油', '機械用潤滑油（1L）', 'lubricant', 'エネオス', 1500, 'liter', 5, 8, '倉庫A-3'),
  ('BLT-M10-001', 'ボルト M10x40', 'ステンレスボルト', 'mechanical', '汎用', 50, 'piece', 100, 250, '倉庫B-2');

-- 在庫移動履歴
INSERT INTO inventory_transactions (part_id, transaction_type, quantity, unit_price, reference_type, reference_id, notes, performed_by) VALUES
  (1, 'out', -1, 8000, 'work_history', 1, 'HVAC-A号機フィルター交換', '山田太郎'),
  (2, 'out', -2, 1200, 'work_history', 2, 'ポンプP-1パッキン交換', '佐藤花子'),
  (3, 'out', -1, 800, 'work_history', 4, '照明器具修理', '田中一郎'),
  (1, 'in', 10, 7500, 'purchase_order', NULL, '定期発注', '鈴木次郎'),
  (4, 'in', 3, 1500, 'purchase_order', NULL, '潤滑油補充', '鈴木次郎');

-- 作業で使用した部品（work_history_idに対応）
INSERT INTO work_parts (work_history_id, part_id, quantity, unit_price, total_cost, notes) VALUES
  (1, 1, 1, 8000, 8000, 'フィルター1枚使用'),
  (2, 2, 2, 1200, 2400, 'パッキン2個使用'),
  (4, 3, 1, 800, 800, '蛍光灯1本交換');

-- ============================================
-- 5. 故障・不具合報告
-- ============================================

INSERT INTO failure_reports (equipment_id, reporter_name, failure_type, severity, status, title, description, symptoms, downtime_start, downtime_end, downtime_hours, root_cause, corrective_action) VALUES
  (3, '佐藤花子', 'leak', 'high', 'resolved', 'ポンプからの漏水', 'ポンプP-1から水漏れを発見', '軸封部から水が滴下', '2025-10-28 09:00:00', '2025-10-28 16:00:00', 7.0, 'グランドパッキンの劣化', 'グランドパッキンを新品に交換。増し締め実施。'),
  (1, '山田太郎', 'abnormal_sound', 'medium', 'in_repair', 'HVAC異音', 'HVAC-A号機から異音が発生', 'ファン部から「カラカラ」という音', '2025-11-06 09:00:00', NULL, NULL, '調査中', NULL),
  (5, '田中一郎', 'breakdown', 'critical', 'reported', '非常灯不点灯', '3階非常灯が点灯しない', '停電時に点灯せず', NULL, NULL, NULL, NULL, NULL);

-- ============================================
-- 6. 予算管理
-- ============================================

INSERT INTO maintenance_budgets (fiscal_year, department, category, budget_amount, spent_amount) VALUES
  (2025, '施設管理部', 'preventive', 5000000, 1250000),
  (2025, '施設管理部', 'corrective', 3000000, 450000),
  (2025, '施設管理部', 'parts', 2000000, 380000),
  (2025, '施設管理部', 'external', 4000000, 850000);

-- ============================================
-- 7. 設備ドキュメント
-- ============================================

INSERT INTO equipment_documents (equipment_id, document_type, title, file_url, file_type, description, uploaded_by) VALUES
  (1, 'manual', 'HVAC取扱説明書', '/documents/hvac_manual.pdf', 'pdf', 'ダイキン製空調機の取扱説明書', '山田太郎'),
  (1, 'drawing', 'HVAC配管図', '/documents/hvac_piping.pdf', 'pdf', '空調機配管系統図', '山田太郎'),
  (3, 'manual', 'ポンプ取扱説明書', '/documents/pump_manual.pdf', 'pdf', 'イワキ製ポンプの取扱説明書', '佐藤花子'),
  (2, 'certificate', 'エレベーター検査証', '/documents/elevator_cert.pdf', 'pdf', '建築基準法に基づく検査証', '田中一郎');

-- ============================================
-- 8. アラート設定
-- ============================================

INSERT INTO alert_settings (name, alert_type, condition_json, notification_channels, recipients, is_active) VALUES
  ('保守期限アラート', 'maintenance_due', '{"days_before": 7}', '["email", "dashboard"]', '["admin@example.com", "manager@example.com"]', 1),
  ('在庫不足アラート', 'low_stock', '{"threshold_type": "below_minimum"}', '["email", "dashboard"]', '["inventory@example.com"]', 1),
  ('緊急故障通知', 'failure_critical', '{"severity": "critical"}', '["email", "sms", "dashboard"]', '["admin@example.com", "emergency@example.com"]', 1);

-- 通知履歴
INSERT INTO notifications (alert_setting_id, notification_type, title, message, priority, status, reference_type, reference_id, sent_to) VALUES
  (1, 'maintenance_due', '保守期限接近', '設備ID:1 (HVAC-A号機) の定期保守が7日後に期限を迎えます', 'normal', 'read', 'equipment', 1, '["admin@example.com"]'),
  (3, 'failure_critical', '緊急故障発生', '設備ID:5 (非常灯) で緊急度の高い故障が報告されました', 'urgent', 'unread', 'failure_report', 3, '["admin@example.com", "emergency@example.com"]'),
  (2, 'low_stock', '部品在庫不足警告', '部品: 潤滑油 の在庫が最小在庫レベルに達しました', 'normal', 'read', 'part', 4, '["inventory@example.com"]');
4, '["inventory@example.com"]');
