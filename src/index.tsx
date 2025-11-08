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
// Checklist Management API
// ============================================

// Get all checklist templates
app.get('/api/checklists/templates', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT t.*, 
             COUNT(DISTINCT i.id) as item_count,
             COUNT(DISTINCT e.id) as execution_count
      FROM checklist_templates t
      LEFT JOIN checklist_items i ON t.id = i.template_id
      LEFT JOIN checklist_executions e ON t.id = e.template_id
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch checklist templates', details: error.message }, 500)
  }
})

// Get single checklist template by ID
app.get('/api/checklists/templates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const template = await c.env.DB.prepare(`
      SELECT * FROM checklist_templates WHERE id = ?
    `).bind(id).first()
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404)
    }
    return c.json(template)
  } catch (error) {
    return c.json({ error: 'Failed to fetch template', details: error.message }, 500)
  }
})

// Create new checklist template
app.post('/api/checklists/templates', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO checklist_templates (name, description, frequency, equipment_type, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.description || null,
      data.frequency || 'monthly',
      data.equipment_type || null,
      data.is_active !== undefined ? data.is_active : 1
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create template', details: error.message }, 500)
  }
})

// Update checklist template
app.put('/api/checklists/templates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE checklist_templates 
      SET name = ?, description = ?, frequency = ?, equipment_type = ?, is_active = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name,
      data.description || null,
      data.frequency,
      data.equipment_type || null,
      data.is_active !== undefined ? data.is_active : 1,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update template', details: error.message }, 500)
  }
})

// Delete checklist template
app.delete('/api/checklists/templates/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Delete related items first (cascade)
    await c.env.DB.prepare('DELETE FROM checklist_items WHERE template_id = ?').bind(id).run()
    
    // Delete template
    await c.env.DB.prepare('DELETE FROM checklist_templates WHERE id = ?').bind(id).run()
    
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete template', details: error.message }, 500)
  }
})

// Get checklist items for a template
app.get('/api/checklists/items/:templateId', async (c) => {
  try {
    const templateId = c.req.param('templateId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM checklist_items 
      WHERE template_id = ? 
      ORDER BY item_order ASC
    `).bind(templateId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch checklist items', details: error.message }, 500)
  }
})

// Create checklist item
app.post('/api/checklists/items', async (c) => {
  try {
    const data = await c.req.json()
    
    // Get max order for this template
    const maxOrder = await c.env.DB.prepare(`
      SELECT COALESCE(MAX(item_order), 0) as max_order 
      FROM checklist_items 
      WHERE template_id = ?
    `).bind(data.template_id).first()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO checklist_items (template_id, item_text, category, check_type, 
                                    normal_range, options, item_order, is_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.template_id,
      data.item_text || data.item_name, // Accept both field names
      data.category || null,
      data.check_type || 'checkbox',
      data.normal_range || data.expected_value || null,
      data.options || null,
      (maxOrder?.max_order || 0) + 1,
      data.is_required !== undefined ? data.is_required : 1
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create checklist item', details: error.message }, 500)
  }
})

// Update checklist item
app.put('/api/checklists/items/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE checklist_items 
      SET item_text = ?, category = ?, check_type = ?, normal_range = ?,
          options = ?, item_order = ?, is_required = ?
      WHERE id = ?
    `).bind(
      data.item_text || data.item_name,
      data.category || null,
      data.check_type,
      data.normal_range || data.expected_value || null,
      data.options || null,
      data.item_order,
      data.is_required,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update checklist item', details: error.message }, 500)
  }
})

// Delete checklist item
app.delete('/api/checklists/items/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM checklist_items WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete checklist item', details: error.message }, 500)
  }
})

// Get checklist executions for equipment
app.get('/api/checklists/executions/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT e.*, t.name as template_name, t.equipment_type,
             eq.name as equipment_name
      FROM checklist_executions e
      LEFT JOIN checklist_templates t ON e.template_id = t.id
      LEFT JOIN equipment eq ON e.equipment_id = eq.id
      WHERE e.equipment_id = ?
      ORDER BY e.execution_date DESC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch executions', details: error.message }, 500)
  }
})

// Get all checklist executions
app.get('/api/checklists/executions', async (c) => {
  try {
    const status = c.req.query('status')
    const limit = c.req.query('limit') || '50'
    
    let query = `
      SELECT e.*, t.name as template_name, t.equipment_type,
             eq.name as equipment_name
      FROM checklist_executions e
      LEFT JOIN checklist_templates t ON e.template_id = t.id
      LEFT JOIN equipment eq ON e.equipment_id = eq.id
    `
    
    if (status) {
      query += ` WHERE e.status = ?`
    }
    
    query += ` ORDER BY e.execution_date DESC LIMIT ?`
    
    const { results } = status 
      ? await c.env.DB.prepare(query).bind(status, limit).all()
      : await c.env.DB.prepare(query).bind(limit).all()
    
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch executions', details: error.message }, 500)
  }
})

// Start new checklist execution
app.post('/api/checklists/executions', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO checklist_executions (template_id, equipment_id, executor_name, 
                                         execution_date, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.template_id,
      data.equipment_id,
      data.executor_name || data.inspector_name || null,
      data.execution_date || new Date().toISOString(),
      'in_progress'
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data, status: 'in_progress' }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to start execution', details: error.message }, 500)
  }
})

// Update checklist execution (complete)
app.put('/api/checklists/executions/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE checklist_executions 
      SET status = ?, notes = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      data.status || 'completed',
      data.notes || null,
      data.status === 'completed' ? new Date().toISOString() : null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update execution', details: error.message }, 500)
  }
})

// Record checklist result
app.post('/api/checklists/results', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO checklist_results (execution_id, item_id, check_value, 
                                      is_normal, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.execution_id,
      data.item_id,
      data.check_value || data.result_value || null,
      data.is_normal !== undefined ? data.is_normal : (data.is_pass !== undefined ? data.is_pass : 1),
      data.notes || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to record result', details: error.message }, 500)
  }
})

// Get results for an execution
app.get('/api/checklists/results/:executionId', async (c) => {
  try {
    const executionId = c.req.param('executionId')
    const { results } = await c.env.DB.prepare(`
      SELECT r.*, i.item_text, i.check_type, i.normal_range, i.options
      FROM checklist_results r
      LEFT JOIN checklist_items i ON r.item_id = i.id
      WHERE r.execution_id = ?
      ORDER BY i.item_order ASC
    `).bind(executionId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch results', details: error.message }, 500)
  }
})

// ============================================
// Work History API
// ============================================

// Get work history by equipment
app.get('/api/work-history/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT w.*, e.name as equipment_name, e.type as equipment_type
      FROM work_history w
      LEFT JOIN equipment e ON w.equipment_id = e.id
      WHERE w.equipment_id = ?
      ORDER BY w.work_date DESC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch work history', details: error.message }, 500)
  }
})

// Get all work history
app.get('/api/work-history', async (c) => {
  try {
    const limit = c.req.query('limit') || '100'
    const workType = c.req.query('type')
    
    let query = `
      SELECT w.*, e.name as equipment_name, e.type as equipment_type
      FROM work_history w
      LEFT JOIN equipment e ON w.equipment_id = e.id
    `
    
    if (workType) {
      query += ` WHERE w.work_type = ?`
    }
    
    query += ` ORDER BY w.work_date DESC LIMIT ?`
    
    const { results } = workType
      ? await c.env.DB.prepare(query).bind(workType, limit).all()
      : await c.env.DB.prepare(query).bind(limit).all()
    
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch work history', details: error.message }, 500)
  }
})

// Create work history record
app.post('/api/work-history', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO work_history (equipment_id, work_order_id, work_type, title,
                                 description, executor_name, start_time, end_time, actual_hours, 
                                 labor_cost, parts_cost, other_cost, total_cost, status, result_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.equipment_id,
      data.work_order_id || null,
      data.work_type,
      data.title || data.work_description || 'Work performed',
      data.description || data.work_description || null,
      data.executor_name || data.performed_by || null,
      data.start_time || data.work_date || new Date().toISOString(),
      data.end_time || null,
      data.actual_hours || data.duration_hours || null,
      data.labor_cost || null,
      data.parts_cost || data.material_cost || null,
      data.other_cost || null,
      data.total_cost || null,
      data.status || data.result || 'completed',
      data.result_notes || data.notes || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create work history', details: error.message }, 500)
  }
})

// Update work history
app.put('/api/work-history/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE work_history 
      SET work_type = ?, title = ?, description = ?, executor_name = ?,
          start_time = ?, end_time = ?, actual_hours = ?,
          labor_cost = ?, parts_cost = ?, other_cost = ?, total_cost = ?,
          status = ?, result_notes = ?
      WHERE id = ?
    `).bind(
      data.work_type,
      data.title || data.work_description,
      data.description || data.work_description,
      data.executor_name || data.performed_by || null,
      data.start_time || data.work_date,
      data.end_time || null,
      data.actual_hours || data.duration_hours || null,
      data.labor_cost || null,
      data.parts_cost || data.material_cost || null,
      data.other_cost || null,
      data.total_cost || null,
      data.status || data.result,
      data.result_notes || data.notes || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update work history', details: error.message }, 500)
  }
})

// Delete work history
app.delete('/api/work-history/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM work_history WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete work history', details: error.message }, 500)
  }
})

// Get parts used in work history
app.get('/api/work-history/:id/parts', async (c) => {
  try {
    const workHistoryId = c.req.param('id')
    const { results } = await c.env.DB.prepare(`
      SELECT wp.*, p.name as part_name, p.part_number, p.unit_price
      FROM work_parts wp
      LEFT JOIN parts p ON wp.part_id = p.id
      WHERE wp.work_history_id = ?
    `).bind(workHistoryId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch work parts', details: error.message }, 500)
  }
})

// Add part usage to work history
app.post('/api/work-history/:id/parts', async (c) => {
  try {
    const workHistoryId = c.req.param('id')
    const data = await c.req.json()
    
    const result = await c.env.DB.prepare(`
      INSERT INTO work_parts (work_history_id, part_id, quantity_used, unit_cost, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      workHistoryId,
      data.part_id,
      data.quantity_used,
      data.unit_cost || null,
      data.notes || null
    ).run()
    
    // Update inventory
    await c.env.DB.prepare(`
      INSERT INTO inventory_transactions (part_id, transaction_type, quantity, 
                                           unit_price, reference_type, reference_id, notes)
      VALUES (?, 'out', ?, ?, 'work_history', ?, ?)
    `).bind(
      data.part_id,
      data.quantity_used,
      data.unit_cost || null,
      workHistoryId,
      `Used in work: ${workHistoryId}`
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to add work part', details: error.message }, 500)
  }
})

// ============================================
// Failure Reports API
// ============================================

// Get all failure reports
app.get('/api/failures', async (c) => {
  try {
    const status = c.req.query('status')
    const severity = c.req.query('severity')
    const limit = c.req.query('limit') || '100'
    
    let query = `
      SELECT f.*, e.name as equipment_name, e.type as equipment_type
      FROM failure_reports f
      LEFT JOIN equipment e ON f.equipment_id = e.id
      WHERE 1=1
    `
    
    const bindings = []
    
    if (status) {
      query += ` AND f.status = ?`
      bindings.push(status)
    }
    
    if (severity) {
      query += ` AND f.severity = ?`
      bindings.push(severity)
    }
    
    query += ` ORDER BY f.failure_date DESC LIMIT ?`
    bindings.push(limit)
    
    const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch failure reports', details: error.message }, 500)
  }
})

// Get failure reports by equipment
app.get('/api/failures/equipment/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM failure_reports 
      WHERE equipment_id = ?
      ORDER BY failure_date DESC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch failure reports', details: error.message }, 500)
  }
})

// Create failure report
app.post('/api/failures', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO failure_reports (equipment_id, reporter_name, report_date, failure_type, severity,
                                     title, description, symptoms, root_cause, corrective_action, 
                                     status, downtime_start, downtime_hours, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.equipment_id,
      data.reporter_name || data.reported_by || 'Unknown',
      data.report_date || data.failure_date || new Date().toISOString(),
      data.failure_type || 'other',
      data.severity || 'medium',
      data.title || 'Failure Report',
      data.description,
      data.symptoms || null,
      data.root_cause || null,
      data.corrective_action || null,
      data.status || 'reported',
      data.downtime_start || null,
      data.downtime_hours || null,
      data.assigned_to || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create failure report', details: error.message }, 500)
  }
})

// Update failure report
app.put('/api/failures/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE failure_reports 
      SET failure_type = ?, severity = ?, title = ?, description = ?, symptoms = ?,
          root_cause = ?, corrective_action = ?, status = ?, assigned_to = ?,
          resolved_date = ?, downtime_end = ?, downtime_hours = ?, cost = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.failure_type,
      data.severity,
      data.title,
      data.description,
      data.symptoms || null,
      data.root_cause || null,
      data.corrective_action || null,
      data.status,
      data.assigned_to || null,
      data.status === 'resolved' ? new Date().toISOString() : null,
      data.downtime_end || null,
      data.downtime_hours || null,
      data.cost || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update failure report', details: error.message }, 500)
  }
})

// Delete failure report
app.delete('/api/failures/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM failure_reports WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete failure report', details: error.message }, 500)
  }
})

// Get failure statistics
app.get('/api/failures/statistics', async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        AVG(downtime_hours) as avg_downtime
      FROM failure_reports
    `).first()
    
    return c.json(stats)
  } catch (error) {
    return c.json({ error: 'Failed to fetch failure statistics', details: error.message }, 500)
  }
})

// ============================================
// Parts & Inventory Management API
// ============================================

// Get all parts
app.get('/api/parts', async (c) => {
  try {
    const category = c.req.query('category')
    const lowStock = c.req.query('low_stock')
    
    let query = `
      SELECT p.*,
             COALESCE(
               (SELECT SUM(CASE 
                 WHEN transaction_type = 'in' THEN quantity
                 WHEN transaction_type = 'out' THEN -quantity
                 ELSE 0 END)
                FROM inventory_transactions 
                WHERE part_id = p.id), 0
             ) as calculated_stock
      FROM parts p
      WHERE 1=1
    `
    
    const bindings = []
    
    if (category) {
      query += ` AND p.category = ?`
      bindings.push(category)
    }
    
    if (lowStock === 'true') {
      query += ` HAVING calculated_stock <= p.min_stock_level`
    }
    
    query += ` ORDER BY p.name ASC`
    
    const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch parts', details: error.message }, 500)
  }
})

// Get single part with stock info
app.get('/api/parts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const part = await c.env.DB.prepare(`
      SELECT p.*,
             COALESCE(
               (SELECT SUM(CASE 
                 WHEN transaction_type = 'in' THEN quantity
                 WHEN transaction_type = 'out' THEN -quantity
                 ELSE 0 END)
                FROM inventory_transactions 
                WHERE part_id = p.id), 0
             ) as calculated_stock
      FROM parts p
      WHERE p.id = ?
    `).bind(id).first()
    
    if (!part) {
      return c.json({ error: 'Part not found' }, 404)
    }
    
    return c.json(part)
  } catch (error) {
    return c.json({ error: 'Failed to fetch part', details: error.message }, 500)
  }
})

// Create new part
app.post('/api/parts', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO parts (name, part_number, category, description, 
                         unit_price, unit, min_stock_level, current_stock, 
                         manufacturer, model_number, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.part_number || null,
      data.category || 'general',
      data.description || null,
      data.unit_price || null,
      data.unit || 'piece',
      data.min_stock_level || 0,
      data.current_stock || 0,
      data.manufacturer || null,
      data.model_number || null,
      data.location || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create part', details: error.message }, 500)
  }
})

// Update part
app.put('/api/parts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE parts 
      SET name = ?, part_number = ?, category = ?, description = ?,
          unit_price = ?, unit = ?, min_stock_level = ?, current_stock = ?,
          manufacturer = ?, model_number = ?, location = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name,
      data.part_number || null,
      data.category,
      data.description || null,
      data.unit_price || null,
      data.unit,
      data.min_stock_level,
      data.current_stock,
      data.manufacturer || null,
      data.model_number || null,
      data.location || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update part', details: error.message }, 500)
  }
})

// Delete part
app.delete('/api/parts/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM parts WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete part', details: error.message }, 500)
  }
})

// Get inventory transactions for a part
app.get('/api/parts/:id/transactions', async (c) => {
  try {
    const partId = c.req.param('id')
    const limit = c.req.query('limit') || '50'
    
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM inventory_transactions 
      WHERE part_id = ?
      ORDER BY transaction_date DESC
      LIMIT ?
    `).bind(partId, limit).all()
    
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch transactions', details: error.message }, 500)
  }
})

// Record inventory transaction
app.post('/api/inventory/transactions', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO inventory_transactions (part_id, transaction_type, quantity,
                                           unit_price, reference_type, reference_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.part_id,
      data.transaction_type,
      data.quantity,
      data.unit_price || null,
      data.reference_type || null,
      data.reference_id || null,
      data.notes || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to record transaction', details: error.message }, 500)
  }
})

// Get low stock alerts
app.get('/api/inventory/low-stock', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*,
             COALESCE(
               (SELECT SUM(CASE 
                 WHEN transaction_type = 'in' THEN quantity
                 WHEN transaction_type = 'out' THEN -quantity
                 ELSE 0 END)
                FROM inventory_transactions 
                WHERE part_id = p.id), 0
             ) as calculated_stock
      FROM parts p
      HAVING calculated_stock <= p.min_stock_level
      ORDER BY calculated_stock ASC
    `).all()
    
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch low stock items', details: error.message }, 500)
  }
})

// ============================================
// Cost Management & Budget API
// ============================================

// Get maintenance budgets
app.get('/api/budgets', async (c) => {
  try {
    const fiscalYear = c.req.query('fiscal_year')
    
    let query = `SELECT * FROM maintenance_budgets WHERE 1=1`
    const bindings = []
    
    if (fiscalYear) {
      query += ` AND fiscal_year = ?`
      bindings.push(fiscalYear)
    }
    
    query += ` ORDER BY fiscal_year DESC, category ASC`
    
    const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch budgets', details: error.message }, 500)
  }
})

// Create budget
app.post('/api/budgets', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO maintenance_budgets (fiscal_year, department, category, budget_amount, 
                                        spent_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.fiscal_year,
      data.department || null,
      data.category,
      data.budget_amount || data.budgeted_amount,
      data.spent_amount || 0,
      data.notes || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create budget', details: error.message }, 500)
  }
})

// Update budget
app.put('/api/budgets/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE maintenance_budgets 
      SET budget_amount = ?, spent_amount = ?, notes = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.budget_amount || data.budgeted_amount,
      data.spent_amount,
      data.notes || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update budget', details: error.message }, 500)
  }
})

// Get cost analysis
app.get('/api/costs/analysis', async (c) => {
  try {
    const startDate = c.req.query('start_date')
    const endDate = c.req.query('end_date')
    const groupBy = c.req.query('group_by') || 'month' // month, category, equipment
    
    // Total costs by work type
    const costsByType = await c.env.DB.prepare(`
      SELECT 
        work_type,
        COUNT(*) as work_count,
        SUM(labor_cost) as total_labor,
        SUM(parts_cost) as total_parts,
        SUM(other_cost) as total_other,
        SUM(total_cost) as total_cost
      FROM work_history
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY work_type
    `).bind(startDate || '2020-01-01', endDate || '2099-12-31').all()
    
    // Costs by equipment
    const costsByEquipment = await c.env.DB.prepare(`
      SELECT 
        e.id, e.name, e.type,
        COUNT(w.id) as work_count,
        SUM(w.total_cost) as total_cost
      FROM equipment e
      LEFT JOIN work_history w ON e.id = w.equipment_id
      WHERE w.start_time >= ? AND w.start_time <= ?
      GROUP BY e.id
      HAVING total_cost > 0
      ORDER BY total_cost DESC
      LIMIT 10
    `).bind(startDate || '2020-01-01', endDate || '2099-12-31').all()
    
    // Monthly trend
    const monthlyTrend = await c.env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', start_time) as month,
        COUNT(*) as work_count,
        SUM(total_cost) as total_cost
      FROM work_history
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY month
      ORDER BY month ASC
    `).bind(startDate || '2020-01-01', endDate || '2099-12-31').all()
    
    return c.json({
      costsByType: costsByType.results,
      costsByEquipment: costsByEquipment.results,
      monthlyTrend: monthlyTrend.results
    })
  } catch (error) {
    return c.json({ error: 'Failed to fetch cost analysis', details: error.message }, 500)
  }
})

// ============================================
// Equipment Documents API
// ============================================

// Get documents for equipment
app.get('/api/documents/equipment/:equipmentId', async (c) => {
  try {
    const equipmentId = c.req.param('equipmentId')
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM equipment_documents 
      WHERE equipment_id = ?
      ORDER BY uploaded_date DESC
    `).bind(equipmentId).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch documents', details: error.message }, 500)
  }
})

// Get all documents
app.get('/api/documents', async (c) => {
  try {
    const docType = c.req.query('type')
    const limit = c.req.query('limit') || '100'
    
    let query = `
      SELECT d.*, e.name as equipment_name
      FROM equipment_documents d
      LEFT JOIN equipment e ON d.equipment_id = e.id
      WHERE 1=1
    `
    
    const bindings = []
    
    if (docType) {
      query += ` AND d.document_type = ?`
      bindings.push(docType)
    }
    
    query += ` ORDER BY d.uploaded_date DESC LIMIT ?`
    bindings.push(limit)
    
    const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch documents', details: error.message }, 500)
  }
})

// Create document record
app.post('/api/documents', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO equipment_documents (equipment_id, document_type, document_name,
                                        file_path, file_size, uploaded_by, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.equipment_id || null,
      data.document_type,
      data.document_name,
      data.file_path,
      data.file_size || null,
      data.uploaded_by || null,
      data.description || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create document', details: error.message }, 500)
  }
})

// Update document
app.put('/api/documents/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE equipment_documents 
      SET document_name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.document_name,
      data.description || null,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update document', details: error.message }, 500)
  }
})

// Delete document
app.delete('/api/documents/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM equipment_documents WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete document', details: error.message }, 500)
  }
})

// ============================================
// Notifications & Alerts API
// ============================================

// Get notifications
app.get('/api/notifications', async (c) => {
  try {
    const status = c.req.query('status') // unread, read, acknowledged, all
    const limit = c.req.query('limit') || '50'
    
    let query = `SELECT * FROM notifications WHERE 1=1`
    const bindings = []
    
    if (status && status !== 'all') {
      query += ` AND status = ?`
      bindings.push(status)
    }
    
    query += ` ORDER BY sent_at DESC LIMIT ?`
    bindings.push(limit)
    
    const { results } = await c.env.DB.prepare(query).bind(...bindings).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch notifications', details: error.message }, 500)
  }
})

// Create notification
app.post('/api/notifications', async (c) => {
  try {
    const data = await c.req.json()
    const result = await c.env.DB.prepare(`
      INSERT INTO notifications (notification_type, title, message, priority, status,
                                  reference_type, reference_id, sent_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.notification_type,
      data.title,
      data.message,
      data.priority || data.severity || 'normal',
      data.status || 'unread',
      data.reference_type || null,
      data.reference_id || null,
      data.sent_to || null
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create notification', details: error.message }, 500)
  }
})

// Mark notification as read
app.put('/api/notifications/:id/read', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(`
      UPDATE notifications 
      SET status = 'read', read_at = datetime('now')
      WHERE id = ?
    `).bind(id).run()
    
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to mark notification as read', details: error.message }, 500)
  }
})

// Mark all notifications as read
app.put('/api/notifications/read-all', async (c) => {
  try {
    await c.env.DB.prepare(`
      UPDATE notifications 
      SET status = 'read', read_at = datetime('now')
      WHERE status = 'unread'
    `).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to mark all notifications as read', details: error.message }, 500)
  }
})

// Delete notification
app.delete('/api/notifications/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete notification', details: error.message }, 500)
  }
})

// Get alert settings
app.get('/api/alerts/settings', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM alert_settings WHERE is_active = 1
      ORDER BY created_at DESC
    `).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'Failed to fetch alert settings', details: error.message }, 500)
  }
})

// Create alert setting
app.post('/api/alerts/settings', async (c) => {
  try {
    const data = await c.req.json()
    
    // Build condition JSON
    const conditionJson = JSON.stringify({
      field: data.condition_field,
      operator: data.condition_operator,
      value: data.condition_value
    })
    
    const result = await c.env.DB.prepare(`
      INSERT INTO alert_settings (name, alert_type, condition_json,
                                    notification_channels, recipients, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      data.name || data.alert_name,
      data.alert_type,
      conditionJson,
      data.notification_channels ? JSON.stringify(data.notification_channels) : null,
      data.recipients ? JSON.stringify(data.recipients) : null,
      data.is_active !== undefined ? data.is_active : 1
    ).run()
    
    return c.json({ id: result.meta.last_row_id, ...data }, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create alert setting', details: error.message }, 500)
  }
})

// Update alert setting
app.put('/api/alerts/settings/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const data = await c.req.json()
    
    // Build condition JSON if fields provided
    let conditionJson = data.condition_json
    if (data.condition_field && data.condition_operator && data.condition_value) {
      conditionJson = JSON.stringify({
        field: data.condition_field,
        operator: data.condition_operator,
        value: data.condition_value
      })
    }
    
    await c.env.DB.prepare(`
      UPDATE alert_settings 
      SET name = ?, condition_json = ?, notification_channels = ?,
          recipients = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name || data.alert_name,
      conditionJson,
      data.notification_channels ? JSON.stringify(data.notification_channels) : null,
      data.recipients ? JSON.stringify(data.recipients) : null,
      data.is_active,
      id
    ).run()
    
    return c.json({ id, ...data })
  } catch (error) {
    return c.json({ error: 'Failed to update alert setting', details: error.message }, 500)
  }
})

// Delete alert setting
app.delete('/api/alerts/settings/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM alert_settings WHERE id = ?').bind(id).run()
    return c.json({ success: true, id })
  } catch (error) {
    return c.json({ error: 'Failed to delete alert setting', details: error.message }, 500)
  }
})

// ============================================
// Analytics API
// ============================================

// Get comprehensive analytics summary
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
    
    // Get checklist execution stats
    const checklistStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN abnormal_items = 0 AND status = 'completed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN abnormal_items > 0 THEN 1 ELSE 0 END) as failed
      FROM checklist_executions
    `).first()
    
    // Get failure report stats
    const failureStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_failures,
        AVG(downtime_hours) as avg_downtime
      FROM failure_reports
    `).first()
    
    // Get work history costs (last 30 days)
    const costStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as work_count,
        SUM(labor_cost) as total_labor,
        SUM(parts_cost) as total_parts,
        SUM(total_cost) as total_cost
      FROM work_history
      WHERE start_time >= date('now', '-30 days')
    `).first()
    
    // Get low stock parts count
    const lowStockCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM parts p
      WHERE (
        SELECT COALESCE(SUM(CASE 
          WHEN transaction_type = 'in' THEN quantity
          WHEN transaction_type = 'out' THEN -quantity
          ELSE 0 END), 0)
        FROM inventory_transactions 
        WHERE part_id = p.id
      ) <= p.min_stock_level
    `).first()
    
    // Calculate uptime percentage
    const uptime = equipmentStats.total > 0 
      ? ((equipmentStats.operational / equipmentStats.total) * 100).toFixed(1)
      : 0
    
    // Calculate maintenance compliance percentage
    const maintenanceCompliance = maintenanceStats.total > 0
      ? ((maintenanceStats.completed / maintenanceStats.total) * 100).toFixed(1)
      : 0
    
    // Calculate checklist pass rate
    const checklistPassRate = checklistStats.total > 0
      ? ((checklistStats.passed / checklistStats.total) * 100).toFixed(1)
      : 0
    
    // Calculate MTBF (Mean Time Between Failures) - in days
    const mtbf = failureStats.total > 0 && equipmentStats.total > 0
      ? (365 / (failureStats.total / equipmentStats.total)).toFixed(1)
      : 0
    
    // Calculate MTTR (Mean Time To Repair) - in hours
    const mttr = failureStats.avg_downtime 
      ? failureStats.avg_downtime.toFixed(1)
      : 0
    
    return c.json({
      equipment: equipmentStats,
      workOrders: workOrderStats,
      maintenance: maintenanceStats,
      checklists: checklistStats,
      failures: failureStats,
      costs: costStats,
      inventory: {
        low_stock_count: lowStockCount.count
      },
      kpis: {
        uptime: parseFloat(uptime),
        maintenanceCompliance: parseFloat(maintenanceCompliance),
        checklistPassRate: parseFloat(checklistPassRate),
        mtbf: parseFloat(mtbf),
        mttr: parseFloat(mttr)
      },
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
            
            /* Tab Navigation */
            .tab-btn {
                flex: 1;
                padding: 12px 8px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: rgba(255, 255, 255, 0.5);
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 4px;
            }
            .tab-btn:hover {
                color: rgba(255, 255, 255, 0.8);
                background: rgba(255, 255, 255, 0.05);
            }
            .tab-btn.active {
                color: #3b82f6;
                border-bottom-color: #3b82f6;
                background: rgba(59, 130, 246, 0.1);
            }
            .tab-btn i {
                font-size: 16px;
            }
            .tab-label {
                font-weight: 600;
            }
            
            /* Tab Content */
            .tab-content {
                animation: fadeIn 0.3s ease-in-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Filter Buttons */
            .filter-btn {
                padding: 4px 12px;
                font-size: 11px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                transition: all 0.2s;
            }
            .filter-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.9);
            }
            .filter-btn.active {
                background: rgba(59, 130, 246, 0.3);
                border-color: #3b82f6;
                color: #3b82f6;
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
            
            <!-- Left Side Panel - CMMS Navigation -->
            <div id="left-panel" class="side-panel left glass" onmouseenter="openLeftPanel()" onmouseleave="closeLeftPanel()">
                <!-- Tab Navigation -->
                <div class="flex border-b border-gray-700">
                    <button class="tab-btn active" data-tab="resources" onclick="switchTab('resources')">
                        <i class="fas fa-cogs mr-1"></i>
                        <span class="tab-label">リソース</span>
                    </button>
                    <button class="tab-btn" data-tab="checklists" onclick="switchTab('checklists')">
                        <i class="fas fa-clipboard-check mr-1"></i>
                        <span class="tab-label">点検</span>
                    </button>
                    <button class="tab-btn" data-tab="failures" onclick="switchTab('failures')">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        <span class="tab-label">故障</span>
                    </button>
                    <button class="tab-btn" data-tab="work" onclick="switchTab('work')">
                        <i class="fas fa-tools mr-1"></i>
                        <span class="tab-label">作業</span>
                    </button>
                    <button class="tab-btn" data-tab="parts" onclick="switchTab('parts')">
                        <i class="fas fa-box mr-1"></i>
                        <span class="tab-label">部品</span>
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="p-4 space-y-4">
                    <!-- Resources Tab -->
                    <div id="tab-resources" class="tab-content active">
                        <div class="space-y-4">
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

                    <!-- Checklists Tab -->
                    <div id="tab-checklists" class="tab-content" style="display: none;">
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-white font-semibold text-sm flex items-center">
                                    <i class="fas fa-clipboard-check mr-2 text-blue-400"></i>
                                    チェックリスト
                                </h4>
                                <button onclick="showChecklistTemplateDialog()" 
                                        class="control-btn px-2 py-1 text-white text-xs rounded" 
                                        title="テンプレートを作成">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="space-y-2 max-h-96 overflow-y-auto" id="checklist-templates-list">
                                <!-- Populated by JavaScript -->
                            </div>
                        </div>
                    </div>

                    <!-- Failures Tab -->
                    <div id="tab-failures" class="tab-content" style="display: none;">
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-white font-semibold text-sm flex items-center">
                                    <i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>
                                    故障報告
                                </h4>
                                <button onclick="showFailureReportDialog()" 
                                        class="control-btn px-2 py-1 text-white text-xs rounded" 
                                        title="故障を報告">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <!-- Filter Buttons -->
                            <div class="flex gap-2 flex-wrap">
                                <button class="filter-btn active" data-filter="all" onclick="filterFailures('all')">
                                    全て
                                </button>
                                <button class="filter-btn" data-filter="reported" onclick="filterFailures('reported')">
                                    報告済
                                </button>
                                <button class="filter-btn" data-filter="in_repair" onclick="filterFailures('in_repair')">
                                    修理中
                                </button>
                                <button class="filter-btn" data-filter="resolved" onclick="filterFailures('resolved')">
                                    解決済
                                </button>
                            </div>
                            <div class="space-y-2 max-h-80 overflow-y-auto" id="failures-list">
                                <!-- Populated by JavaScript -->
                            </div>
                        </div>
                    </div>

                    <!-- Work History Tab -->
                    <div id="tab-work" class="tab-content" style="display: none;">
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-white font-semibold text-sm flex items-center">
                                    <i class="fas fa-tools mr-2 text-purple-400"></i>
                                    作業履歴
                                </h4>
                                <button onclick="showWorkHistoryDialog()" 
                                        class="control-btn px-2 py-1 text-white text-xs rounded" 
                                        title="作業を記録">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="space-y-2 max-h-96 overflow-y-auto" id="work-history-list">
                                <!-- Populated by JavaScript -->
                            </div>
                        </div>
                    </div>

                    <!-- Parts Tab -->
                    <div id="tab-parts" class="tab-content" style="display: none;">
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <h4 class="text-white font-semibold text-sm flex items-center">
                                    <i class="fas fa-box mr-2 text-yellow-400"></i>
                                    部品・在庫
                                </h4>
                                <button onclick="showPartDialog()" 
                                        class="control-btn px-2 py-1 text-white text-xs rounded" 
                                        title="部品を登録">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <!-- Low Stock Alert -->
                            <div id="low-stock-alert" class="hidden bg-red-500/20 border border-red-500 rounded-lg p-2">
                                <div class="flex items-center text-red-400 text-xs">
                                    <i class="fas fa-exclamation-circle mr-2"></i>
                                    <span id="low-stock-count">0</span>件の低在庫アラート
                                </div>
                            </div>
                            <div class="space-y-2 max-h-80 overflow-y-auto" id="parts-list">
                                <!-- Populated by JavaScript -->
                            </div>
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
            
            // Tab switching function
            function switchTab(tabName) {
                // Update tab buttons
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelector('[data-tab="' + tabName + '"]').classList.add('active');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                document.getElementById('tab-' + tabName).style.display = 'block';
                
                // Load data for the selected tab
                switch(tabName) {
                    case 'checklists':
                        if (window.loadChecklistTemplates) window.loadChecklistTemplates();
                        break;
                    case 'failures':
                        if (window.loadFailures) window.loadFailures();
                        break;
                    case 'work':
                        if (window.loadWorkHistory) window.loadWorkHistory();
                        break;
                    case 'parts':
                        if (window.loadParts) window.loadParts();
                        break;
                }
            }
            
            // Filter functions
            function filterFailures(status) {
                // Update filter button states
                document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelector('[data-filter="' + status + '"]').classList.add('active');
                
                // Load filtered failures
                if (window.loadFailures) {
                    window.loadFailures(status === 'all' ? null : status);
                }
            }
            
            // Make functions globally available
            window.switchTab = switchTab;
            window.filterFailures = filterFailures;
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
        <script src="/static/js/cmms.js"></script>
    </body>
    </html>
  `)
})

export default app
