import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Enable CORS for R2 models
app.use('/r2-models/*', cors())

// R2 Proxy - Serve 3D model files from R2
app.get('/r2-models/*', async (c) => {
  const path = c.req.path.replace('/r2-models/', '')
  
  try {
    const object = await c.env.R2.get(path)
    
    if (!object) {
      return c.notFound()
    }
    
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('cache-control', 'public, max-age=31536000')
    
    return new Response(object.body, {
      headers,
    })
  } catch (error) {
    console.error('R2 fetch error:', error)
    return c.json({ error: 'Failed to fetch from R2' }, 500)
  }
})

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/sdk/*', serveStatic({ root: './public' }))

// ============================================
// Equipment Management API
// ============================================

// Get all equipment
app.get('/api/equipment', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM equipment ORDER BY created_at DESC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch equipment', details: error.message }, 500)
  }
})

// Get single equipment by ID
app.get('/api/equipment/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const equipment = await c.env.DB.prepare(`
      SELECT * FROM equipment WHERE id = ?
    `).bind(id).first()
    
    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404)
    }
    return c.json(equipment)
  } catch (error) {
    return c.json({ error: 'Failed to fetch equipment', details: error.message }, 500)
  }
})

// Create new equipment
app.post('/api/equipment', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO equipment (name, type, status, location_x, location_y, location_z, description, installation_date, next_maintenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.type,
      data.status || 'operational',
      data.location_x,
      data.location_y,
      data.location_z,
      data.description || null,
      data.installation_date || null,
      data.next_maintenance || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create equipment', details: error.message }, 500)
  }
})

// Update equipment
app.put('/api/equipment/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE equipment 
      SET name = ?, type = ?, status = ?, location_x = ?, location_y = ?, location_z = ?,
          description = ?, installation_date = ?, next_maintenance = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name,
      data.type,
      data.status,
      data.location_x,
      data.location_y,
      data.location_z,
      data.description,
      data.installation_date,
      data.next_maintenance,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update equipment', details: error.message }, 500)
  }
})

// Delete equipment
app.delete('/api/equipment/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM equipment WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete equipment', details: error.message }, 500)
  }
})

// ============================================
// Piping System API
// ============================================

// Get all piping
app.get('/api/piping', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM piping ORDER BY created_at DESC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch piping', details: error.message }, 500)
  }
})

// Get single piping by ID
app.get('/api/piping/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const piping = await c.env.DB.prepare(`
      SELECT * FROM piping WHERE id = ?
    `).bind(id).first()
    
    if (!piping) {
      return c.json({ error: 'Piping not found' }, 404)
    }
    return c.json(piping)
  } catch (error) {
    return c.json({ error: 'Failed to fetch piping', details: error.message }, 500)
  }
})

// Create new piping
app.post('/api/piping', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO piping (name, pipe_type, material, diameter, status, pressure_rating, temperature_rating,
                          start_x, start_y, start_z, end_x, end_y, end_z, color, description, 
                          installation_date, next_inspection, connected_equipment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.pipe_type || 'other',
      data.material || null,
      data.diameter || null,
      data.status || 'operational',
      data.pressure_rating || null,
      data.temperature_rating || null,
      data.start_x,
      data.start_y,
      data.start_z,
      data.end_x,
      data.end_y,
      data.end_z,
      data.color || '#2563eb',
      data.description || null,
      data.installation_date || null,
      data.next_inspection || null,
      data.connected_equipment_id || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create piping', details: error.message }, 500)
  }
})

// Update piping
app.put('/api/piping/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE piping 
      SET name = ?, pipe_type = ?, material = ?, diameter = ?, status = ?, 
          pressure_rating = ?, temperature_rating = ?,
          start_x = ?, start_y = ?, start_z = ?, end_x = ?, end_y = ?, end_z = ?,
          color = ?, description = ?, installation_date = ?, next_inspection = ?,
          connected_equipment_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name,
      data.pipe_type,
      data.material,
      data.diameter,
      data.status,
      data.pressure_rating || null,
      data.temperature_rating || null,
      data.start_x,
      data.start_y,
      data.start_z,
      data.end_x,
      data.end_y,
      data.end_z,
      data.color,
      data.description || null,
      data.installation_date || null,
      data.next_inspection || null,
      data.connected_equipment_id || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update piping', details: error.message }, 500)
  }
})

// Delete piping
app.delete('/api/piping/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM piping WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete piping', details: error.message }, 500)
  }
})

// Get piping inspections
app.get('/api/piping/:id/inspections', async (c) => {
  try {
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM piping_inspections WHERE piping_id = ? ORDER BY inspection_date DESC
    `).bind(id).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch inspections', details: error.message }, 500)
  }
})

// Create piping inspection
app.post('/api/piping/:id/inspections', async (c) => {
  try {
    const pipingId = c.req.param('id')
    const data = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO piping_inspections (piping_id, inspection_date, inspector, inspection_type, 
                                       result, findings, corrective_action, next_inspection_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      pipingId,
      data.inspection_date,
      data.inspector || null,
      data.inspection_type,
      data.result,
      data.findings || null,
      data.corrective_action || null,
      data.next_inspection_date || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create inspection', details: error.message }, 500)
  }
})

// ============================================
// Maintenance Plans API
// ============================================

// Get all maintenance plans
app.get('/api/maintenance', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT m.*, e.name as equipment_name, e.type as equipment_type
      FROM maintenance_plans m
      LEFT JOIN equipment e ON m.equipment_id = e.id
      ORDER BY m.next_scheduled ASC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch maintenance plans', details: error.message }, 500)
  }
})

// Get maintenance plans by equipment
app.get('/api/maintenance/equipment/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM maintenance_plans WHERE equipment_id = ? ORDER BY next_scheduled ASC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch maintenance plans', details: error.message }, 500)
  }
})

// Create maintenance plan
app.post('/api/maintenance', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO maintenance_plans (equipment_id, title, description, frequency, next_scheduled, estimated_duration, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.equipment_id,
      data.title,
      data.description || null,
      data.frequency,
      data.next_scheduled,
      data.estimated_duration || null,
      data.priority || 'medium',
      data.status || 'scheduled'
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create maintenance plan', details: error.message }, 500)
  }
})

// Update maintenance plan
app.put('/api/maintenance/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE maintenance_plans 
      SET title = ?, description = ?, frequency = ?, next_scheduled = ?, 
          estimated_duration = ?, priority = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.title,
      data.description,
      data.frequency,
      data.next_scheduled,
      data.estimated_duration,
      data.priority,
      data.status,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update maintenance plan', details: error.message }, 500)
  }
})

// Delete maintenance plan
app.delete('/api/maintenance/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM maintenance_plans WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete maintenance plan', details: error.message }, 500)
  }
})

// ============================================
// Work Orders API
// ============================================

// Get all work orders
app.get('/api/workorders', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT w.*, e.name as equipment_name, e.type as equipment_type
      FROM work_orders w
      LEFT JOIN equipment e ON w.equipment_id = e.id
      ORDER BY 
        CASE w.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        w.scheduled_date ASC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch work orders', details: error.message }, 500)
  }
})

// Get work orders by equipment
app.get('/api/workorders/equipment/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM work_orders WHERE equipment_id = ? ORDER BY scheduled_date ASC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch work orders', details: error.message }, 500)
  }
})

// Create work order
app.post('/api/workorders', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO work_orders (equipment_id, maintenance_plan_id, title, description, type, priority, status, assigned_to, scheduled_date, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.equipment_id,
      data.maintenance_plan_id || null,
      data.title,
      data.description || null,
      data.type,
      data.priority || 'medium',
      data.status || 'pending',
      data.assigned_to || null,
      data.scheduled_date || null,
      data.estimated_hours || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create work order', details: error.message }, 500)
  }
})

// Update work order
app.put('/api/workorders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE work_orders 
      SET title = ?, description = ?, type = ?, priority = ?, status = ?,
          assigned_to = ?, scheduled_date = ?, estimated_hours = ?, actual_hours = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.title,
      data.description,
      data.type,
      data.priority,
      data.status,
      data.assigned_to,
      data.scheduled_date,
      data.estimated_hours,
      data.actual_hours || null,
      data.notes || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update work order', details: error.message }, 500)
  }
})

// Complete work order
app.post('/api/workorders/:id/complete', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE work_orders 
      SET status = 'completed', completed_date = datetime('now'), 
          actual_hours = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(data.actual_hours || null, data.notes || null, id).run()
    
    return c.json({ success: true, id, status: 'completed' })
  } catch (error) {
    return c.json({ error: 'Failed to complete work order', details: error.message }, 500)
  }
})

// Delete work order
app.delete('/api/workorders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM work_orders WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete work order', details: error.message }, 500)
  }
})

// ============================================
// Analytics API
// ============================================

// Get analytics summary
app.get('/api/analytics', async (c) => {
  try {
    // Get equipment counts by status
    const equipmentStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) as operational,
        SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical
      FROM equipment
    `).first()
    
    // Get work order counts by status
    const workOrderStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM work_orders
    `).first()
    
    // Get maintenance compliance (completed vs scheduled)
    const maintenanceStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
      FROM maintenance_plans
    `).first()
    
    // Calculate uptime percentage
    const uptime = equipmentStats.total > 0 
      ? ((equipmentStats.operational / equipmentStats.total) * 100).toFixed(1)
      : 0
    
    // Calculate maintenance compliance percentage
    const maintenanceCompliance = maintenanceStats.total > 0
      ? ((maintenanceStats.completed / maintenanceStats.total) * 100).toFixed(1)
      : 0
    
    return c.json({
      equipment: equipmentStats,
      workOrders: workOrderStats,
      maintenance: maintenanceStats,
      uptime: parseFloat(uptime),
      maintenanceCompliance: parseFloat(maintenanceCompliance),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch analytics', details: error.message }, 500)
  }
})

// Get recent analytics events
app.get('/api/analytics/events', async (c) => {
  try {
    const limit = c.req.query('limit') || '50'
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, e.name as equipment_name
      FROM analytics_events a
      LEFT JOIN equipment e ON a.equipment_id = e.id
      ORDER BY a.timestamp DESC
      LIMIT ?
    `).bind(limit).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch analytics events', details: error.message }, 500)
  }
})

// Create analytics event
app.post('/api/analytics/events', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO analytics_events (equipment_id, event_type, event_data, severity)
      VALUES (?, ?, ?, ?)
    `).bind(
      data.equipment_id || null,
      data.event_type,
      JSON.stringify(data.event_data) || null,
      data.severity || 'info'
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create analytics event', details: error.message }, 500)
  }
})

// ============================================
// Database Initialization (for local dev)
// ============================================

// Initialize database with schema and seed data
app.post('/api/db/init', async (c) => {
  try {
    // Check if tables already exist
    const tableCheck = await c.env.DB.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='equipment'
    `).first()
    
    if (tableCheck) {
      return c.json({ message: 'Database already initialized', status: 'skipped' })
    }
    
    // Read and execute migration file
    // Note: In production, use wrangler d1 migrations apply
    // This is a simplified version for development
    
    return c.json({ 
      message: 'Database initialization complete',
      note: 'Run: wrangler d1 migrations apply digital-twin-cmms-production --local'
    })
  } catch (error) {
    return c.json({ error: 'Failed to initialize database', details: error.message }, 500)
  }
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
            html, body { height: 100%; overflow: hidden; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #000; }
            
            /* Fullscreen 3D Canvas */
            #app { position: fixed; inset: 0; }
            #viewer-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; background: #0a0a0a; }
            
            /* Glass morphism */
            .glass { 
                background: rgba(15, 23, 42, 0.7); 
                backdrop-filter: blur(20px) saturate(180%); 
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            }
            
            /* Slide-in Side Panels */
            .side-panel {
                position: fixed;
                top: 80px;
                height: calc(100% - 80px);
                width: 380px;
                transform: translateX(-100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 40;
                overflow-y: auto;
                overflow-x: hidden;
            }
            .side-panel::-webkit-scrollbar { width: 6px; }
            .side-panel::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
            .side-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
            .side-panel.left { left: 0; }
            .side-panel.right { right: 0; transform: translateX(100%); }
            .side-panel.open { transform: translateX(0); }
            
            /* Trigger Zones for Hover */
            .trigger-zone {
                position: fixed;
                top: 80px;
                height: calc(100% - 80px);
                width: 60px;
                z-index: 39;
                cursor: pointer;
            }
            .trigger-zone.left { left: 0; }
            .trigger-zone.right { right: 0; }
            
            /* Floating Action Buttons */
            .fab {
                position: fixed;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            }
            .fab:hover { transform: scale(1.1); box-shadow: 0 6px 30px rgba(59, 130, 246, 0.5); }
            
            /* Control Button */
            .control-btn { 
                transition: all 0.2s; 
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
            }
            .control-btn:hover { 
                background: rgba(59, 130, 246, 0.3); 
                border-color: #3b82f6;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
            .control-btn.active {
                background: rgba(59, 130, 246, 0.5);
                border-color: #3b82f6;
            }
            
            /* Status Colors */
            .status-operational { color: #10b981; }
            .status-warning { color: #f59e0b; }
            .status-critical { color: #ef4444; }
            
            /* Cards */
            .card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                transition: all 0.3s;
            }
            .card:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            /* Loading Screen */
            #loading-screen {
                position: fixed;
                inset: 0;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                transition: opacity 0.5s;
            }
            #loading-screen.fade-out { opacity: 0; pointer-events: none; }
            .loader {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(59, 130, 246, 0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            /* Mini Stats HUD */
            .hud-stats {
                position: fixed;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 16px;
                z-index: 30;
            }
            .hud-stat {
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 12px 20px;
                text-align: center;
            }
        </style>
        <script>
            // Register Service Worker for data.bin reconstruction
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('[App] Service Worker registered:', reg.scope))
                    .catch(err => console.error('[App] Service Worker registration failed:', err));
            }
        </script>
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
            <!-- 3D Viewer Canvas - Fullscreen Base Layer -->
            <canvas id="viewer-canvas"></canvas>
            
            <!-- Floating Top Navigation Bar -->
            <div class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
                <div class="flex items-center justify-between">
                    <!-- Left: Logo & Title -->
                    <div class="flex items-center space-x-4">
                        <i class="fas fa-cube text-blue-500 text-2xl"></i>
                        <div>
                            <h1 class="text-white text-xl font-bold">Digital Twin CMMS</h1>
                            <p class="text-gray-400 text-xs">次世代デジタルツイン資産管理システム</p>
                        </div>
                    </div>
                    
                    <!-- Center: View Controls -->
                    <div class="flex items-center space-x-2">
                        <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="resetView()">
                            <i class="fas fa-home mr-2"></i>ホーム視点
                        </button>
                        <button class="control-btn px-4 py-2 text-white rounded text-sm" onclick="takeScreenshot()">
                            <i class="fas fa-camera mr-2"></i>スクショ
                        </button>
                    </div>

                    <!-- Right: Stats & User -->
                    <div class="flex items-center space-x-4">
                        <div class="text-right">
                            <div class="text-white text-sm font-semibold">稼働率</div>
                            <div class="text-green-400 text-lg font-bold" id="uptime-display">--</div>
                        </div>
                        <button class="control-btn px-4 py-2 text-white rounded">
                            <i class="fas fa-user-circle mr-2"></i>Admin
                        </button>
                    </div>
                </div>
                
                <!-- Camera Controls Info -->
                <div class="text-gray-400 text-xs mt-2 text-center flex items-center justify-center">
                    <i class="fas fa-info-circle mr-2"></i>
                    <span>マウスホイール: 前進/後退 | 左ドラッグ: 視点回転 | 右ドラッグ: パン移動</span>
                </div>
            </div>

            <!-- Mini HUD Stats -->
            <div class="hud-stats">
                <div class="hud-stat">
                    <div class="text-gray-400 text-xs">設備数</div>
                    <div class="text-white text-xl font-bold" id="hud-equipment-count">--</div>
                </div>
                <div class="hud-stat">
                    <div class="text-gray-400 text-xs">稼働中</div>
                    <div class="text-green-400 text-xl font-bold" id="hud-operational">--</div>
                </div>
                <div class="hud-stat">
                    <div class="text-gray-400 text-xs">警告</div>
                    <div class="text-yellow-400 text-xl font-bold" id="hud-warning">--</div>
                </div>
                <div class="hud-stat">
                    <div class="text-gray-400 text-xs">緊急</div>
                    <div class="text-red-400 text-xl font-bold" id="hud-critical">--</div>
                </div>
            </div>

            <!-- Left Trigger Zone (Hover to Open) -->
            <div class="trigger-zone left" onmouseenter="openLeftPanel()" onmouseleave="closeLeftPanel()"></div>
            
            <!-- Left Side Panel - Equipment & Piping -->
            <div id="left-panel" class="side-panel left glass" onmouseenter="openLeftPanel()" onmouseleave="closeLeftPanel()">
                <div class="p-4 space-y-4">
                    <div class="border-b border-gray-700 pb-3">
                        <h3 class="text-white font-bold text-lg flex items-center">
                            <i class="fas fa-list mr-2 text-blue-400"></i>
                            リソース管理
                        </h3>
                    </div>

                    <!-- Equipment List -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-white font-semibold flex items-center text-sm">
                                <i class="fas fa-cogs mr-2 text-green-400"></i>
                                設備一覧
                            </h4>
                            <button onclick="showEquipmentEditDialog()" 
                                    class="control-btn px-2 py-1 text-white text-xs rounded" 
                                    title="設備を追加">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="space-y-2 max-h-64 overflow-y-auto" id="equipment-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Piping List -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-white font-semibold flex items-center text-sm">
                                <i class="fas fa-grip-lines mr-2 text-cyan-400"></i>
                                配管一覧
                            </h4>
                            <button onclick="showPipingEditDialog()" 
                                    class="control-btn px-2 py-1 text-white text-xs rounded" 
                                    title="配管を追加">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="space-y-2 max-h-64 overflow-y-auto" id="piping-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Maintenance Plans -->
                    <div>
                        <h4 class="text-white font-semibold mb-2 flex items-center text-sm">
                            <i class="fas fa-wrench mr-2 text-orange-400"></i>
                            保守計画
                        </h4>
                        <div class="space-y-2 max-h-48 overflow-y-auto" id="maintenance-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Trigger Zone (Hover to Open) -->
            <div class="trigger-zone right" onmouseenter="openRightPanel()" onmouseleave="closeRightPanel()"></div>
            
            <!-- Right Side Panel - Work Orders & Alerts -->
            <div id="right-panel" class="side-panel right glass" onmouseenter="openRightPanel()" onmouseleave="closeRightPanel()">
                <div class="p-4 space-y-4">
                    <div class="border-b border-gray-700 pb-3">
                        <h3 class="text-white font-bold text-lg flex items-center">
                            <i class="fas fa-tasks mr-2 text-purple-400"></i>
                            作業管理
                        </h3>
                    </div>

                    <!-- Work Orders -->
                    <div>
                        <h4 class="text-white font-semibold mb-2 flex items-center text-sm">
                            <i class="fas fa-clipboard-list mr-2 text-purple-400"></i>
                            作業指示
                        </h4>
                        <div class="space-y-2 max-h-80 overflow-y-auto" id="workorder-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Alerts -->
                    <div>
                        <h4 class="text-white font-semibold mb-2 flex items-center text-sm">
                            <i class="fas fa-bell mr-2 text-red-400"></i>
                            アラート
                        </h4>
                        <div class="space-y-2 max-h-48 overflow-y-auto" id="alert-list">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Real-time Monitoring -->
                    <div>
                        <h4 class="text-white font-semibold mb-2 flex items-center text-sm">
                            <i class="fas fa-chart-area mr-2 text-blue-400"></i>
                            リアルタイム監視
                        </h4>
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

            <!-- Floating Display Settings Panel (Bottom Right) -->
            <div class="fixed bottom-6 right-6 glass rounded-lg p-4 z-40" style="width: 240px;">
                <h4 class="text-white text-sm font-semibold mb-3 flex items-center">
                    <i class="fas fa-sliders-h mr-2 text-blue-400"></i>
                    表示設定
                </h4>
                <div class="space-y-2">
                    <label class="flex items-center text-white text-sm cursor-pointer hover:text-blue-400 transition">
                        <input type="checkbox" checked onchange="toggleEquipmentMarkers(this)" class="mr-2">
                        設備マーカー
                    </label>
                    <label class="flex items-center text-white text-sm cursor-pointer hover:text-blue-400 transition">
                        <input type="checkbox" checked onchange="togglePipingVisibility(this)" class="mr-2">
                        配管表示
                    </label>
                    <label class="flex items-center text-white text-sm cursor-pointer hover:text-blue-400 transition">
                        <input type="checkbox" checked onchange="toggleGrid(this)" class="mr-2">
                        グリッド表示
                    </label>
                    <label class="flex items-center text-white text-sm cursor-pointer hover:text-blue-400 transition">
                        <input type="checkbox" checked onchange="toggleEnvironment(this)" class="mr-2">
                        環境マップ
                    </label>
                </div>
                <div class="mt-4">
                    <label class="text-white text-xs mb-2 block">点群密度</label>
                    <input type="range" min="1" max="10" value="8" class="w-full" onchange="updatePointDensity(this.value)">
                </div>
            </div>

            <!-- Floating Action Buttons (Bottom Left) -->
            <div class="fixed bottom-6 left-6 flex flex-col space-y-3 z-40">
                <button class="fab glass text-white" onclick="resetView()" title="ホーム視点に戻る">
                    <i class="fas fa-home text-xl"></i>
                </button>
                <button class="fab glass text-white" onclick="takeScreenshot()" title="スクリーンショット">
                    <i class="fas fa-camera text-xl"></i>
                </button>
            </div>

            <!-- Selection Info Panel (appears when equipment selected) -->
            <div id="selection-panel" class="fixed bottom-6 left-28 glass rounded-lg p-4 hidden z-40" style="min-width: 320px; max-width: 400px;">
                <div class="flex items-start justify-between mb-3">
                    <h4 class="text-white font-bold flex items-center">
                        <i class="fas fa-info-circle mr-2 text-blue-400"></i>
                        選択中の設備
                    </h4>
                    <button onclick="closeSelection()" class="text-gray-400 hover:text-white transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="selection-content"></div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        
        <!-- Panel Hover Interactions -->
        <script>
            // Panel state management
            let leftPanelTimer, rightPanelTimer;
            
            function openLeftPanel() {
                clearTimeout(leftPanelTimer);
                document.getElementById('left-panel').classList.add('open');
            }
            
            function closeLeftPanel() {
                leftPanelTimer = setTimeout(() => {
                    document.getElementById('left-panel').classList.remove('open');
                }, 300);
            }
            
            function openRightPanel() {
                clearTimeout(rightPanelTimer);
                document.getElementById('right-panel').classList.add('open');
            }
            
            function closeRightPanel() {
                rightPanelTimer = setTimeout(() => {
                    document.getElementById('right-panel').classList.remove('open');
                }, 300);
            }
            
            // Update HUD stats when analytics data loads
            function updateHUDStats(analytics) {
                if (!analytics || !analytics.equipment) return;
                
                document.getElementById('hud-equipment-count').textContent = analytics.equipment.total || 0;
                document.getElementById('hud-operational').textContent = analytics.equipment.operational || 0;
                document.getElementById('hud-warning').textContent = analytics.equipment.warning || 0;
                document.getElementById('hud-critical').textContent = analytics.equipment.critical || 0;
            }
            
            // Make updateHUDStats available globally
            window.updateHUDStats = updateHUDStats;
        </script>
        
        <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
            }
        }
        </script>
        <script src="/static/js/viewer.js" type="module"></script>
    </body>
    </html>
  `)
})

export default app
