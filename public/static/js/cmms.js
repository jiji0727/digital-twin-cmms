// CMMS Feature Functions
// チェックリスト管理、故障報告、作業履歴、部品管理などのUI機能

console.log('🔧 CMMS Feature Module loading...');

// ============================================
// Checklist Management
// ============================================

// Load checklist templates
window.loadChecklistTemplates = async function() {
    try {
        const response = await axios.get('/api/checklists/templates');
        const templates = response.data;
        renderChecklistTemplates(templates);
    } catch (error) {
        console.error('Error loading checklist templates:', error);
    }
};

// Render checklist templates list
function renderChecklistTemplates(templates) {
    const container = document.getElementById('checklist-templates-list');
    if (!container) return;
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="text-gray-400 text-xs text-center py-4">
                <i class="fas fa-clipboard-list text-2xl mb-2 opacity-50"></i>
                <p>テンプレートがありません</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = templates.map(template => `
        <div class="card cursor-pointer hover:border-blue-400" onclick="viewChecklistTemplate(${template.id})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="text-white font-semibold text-sm mb-1">${template.name}</div>
                    <div class="text-gray-400 text-xs mb-2">${template.description || '説明なし'}</div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
                            <i class="fas fa-clock mr-1"></i>${template.frequency}
                        </span>
                        ${template.equipment_type ? `
                            <span class="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                                <i class="fas fa-cogs mr-1"></i>${template.equipment_type}
                            </span>
                        ` : ''}
                        <span class="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                            ${template.item_count || 0}項目
                        </span>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); startChecklistExecution(${template.id})" 
                        class="ml-2 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                    <i class="fas fa-play mr-1"></i>実施
                </button>
            </div>
        </div>
    `).join('');
}

// Start checklist execution
window.startChecklistExecution = async function(templateId) {
    // Get equipment list
    const equipmentResponse = await axios.get('/api/equipment');
    const equipment = equipmentResponse.data;
    
    // Show equipment selection dialog
    const equipmentOptions = equipment.map(eq => 
        `<option value="${eq.id}">${eq.name} (${eq.type})</option>`
    ).join('');
    
    const dialog = `
        <div class="glass rounded-lg p-6 max-w-md mx-auto">
            <h3 class="text-white font-bold text-lg mb-4">
                <i class="fas fa-clipboard-check mr-2 text-blue-400"></i>
                点検実施
            </h3>
            <div class="space-y-4">
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">対象設備</label>
                    <select id="checklist-equipment" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                        ${equipmentOptions}
                    </select>
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">実施者名</label>
                    <input type="text" id="checklist-executor" placeholder="実施者名を入力" 
                           class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                </div>
                <div class="flex gap-2">
                    <button onclick="closeDialog()" 
                            class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">
                        キャンセル
                    </button>
                    <button onclick="executeChecklistStart(${templateId})" 
                            class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                        開始
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showDialog(dialog);
};

// Execute checklist start
window.executeChecklistStart = async function(templateId) {
    const equipmentId = document.getElementById('checklist-equipment').value;
    const executorName = document.getElementById('checklist-executor').value;
    
    if (!executorName) {
        alert('実施者名を入力してください');
        return;
    }
    
    try {
        const response = await axios.post('/api/checklists/executions', {
            template_id: templateId,
            equipment_id: equipmentId,
            executor_name: executorName,
            execution_date: new Date().toISOString()
        });
        
        closeDialog();
        showNotification('点検を開始しました', 'success');
        
        // Open checklist execution UI
        showChecklistExecutionUI(response.data.id, templateId);
    } catch (error) {
        console.error('Error starting checklist:', error);
        showNotification('点検の開始に失敗しました', 'error');
    }
};

// Show checklist execution UI
async function showChecklistExecutionUI(executionId, templateId) {
    try {
        // Get checklist items
        const itemsResponse = await axios.get(`/api/checklists/items/${templateId}`);
        const items = itemsResponse.data;
        
        const itemsHTML = items.map((item, index) => `
            <div class="card mb-3">
                <div class="flex items-start gap-3">
                    <div class="text-blue-400 font-bold text-lg">${index + 1}</div>
                    <div class="flex-1">
                        <div class="text-white font-semibold mb-1">${item.item_text}</div>
                        ${item.category ? `<div class="text-gray-400 text-xs mb-2">${item.category}</div>` : ''}
                        
                        ${item.check_type === 'checkbox' ? `
                            <label class="flex items-center cursor-pointer">
                                <input type="checkbox" class="mr-2" data-item-id="${item.id}">
                                <span class="text-gray-300 text-sm">正常</span>
                            </label>
                        ` : item.check_type === 'numeric' ? `
                            <div class="flex items-center gap-2">
                                <input type="number" 
                                       class="bg-gray-800 text-white rounded px-3 py-1 border border-gray-600 w-32" 
                                       data-item-id="${item.id}"
                                       placeholder="数値を入力">
                                ${item.normal_range ? `
                                    <span class="text-gray-400 text-xs">正常範囲: ${item.normal_range}</span>
                                ` : ''}
                            </div>
                        ` : `
                            <input type="text" 
                                   class="bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 w-full" 
                                   data-item-id="${item.id}"
                                   placeholder="値を入力">
                        `}
                        
                        <div class="mt-2">
                            <input type="text" 
                                   class="bg-gray-800 text-white rounded px-2 py-1 border border-gray-600 w-full text-xs" 
                                   data-item-id="${item.id}-notes"
                                   placeholder="備考（任意）">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        const dialog = `
            <div class="glass rounded-lg p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-white font-bold text-lg">
                        <i class="fas fa-clipboard-check mr-2 text-blue-400"></i>
                        点検実施中
                    </h3>
                    <button onclick="closeDialog()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-3" id="checklist-items-container">
                    ${itemsHTML}
                </div>
                <div class="mt-6 flex gap-2">
                    <button onclick="saveChecklistResults(${executionId}, ${templateId})" 
                            class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">
                        <i class="fas fa-save mr-2"></i>保存して完了
                    </button>
                </div>
            </div>
        `;
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error showing checklist execution UI:', error);
        showNotification('チェックリストの表示に失敗しました', 'error');
    }
}

// Save checklist results
window.saveChecklistResults = async function(executionId, templateId) {
    try {
        // Collect results
        const items = document.querySelectorAll('#checklist-items-container [data-item-id]');
        const results = [];
        
        items.forEach(input => {
            const itemId = input.getAttribute('data-item-id');
            if (itemId.includes('-notes')) return; // Skip notes inputs
            
            const notesInput = document.querySelector(`[data-item-id="${itemId}-notes"]`);
            const value = input.type === 'checkbox' ? (input.checked ? '1' : '0') : input.value;
            const isNormal = input.type === 'checkbox' ? (input.checked ? 1 : 0) : (value ? 1 : 0);
            
            results.push({
                execution_id: executionId,
                item_id: parseInt(itemId),
                check_value: value,
                is_normal: isNormal,
                notes: notesInput ? notesInput.value : null
            });
        });
        
        // Save all results
        for (const result of results) {
            await axios.post('/api/checklists/results', result);
        }
        
        // Update execution status
        const abnormalCount = results.filter(r => !r.is_normal).length;
        await axios.put(`/api/checklists/executions/${executionId}`, {
            status: 'completed',
            notes: abnormalCount > 0 ? `${abnormalCount}件の異常を検出` : '正常'
        });
        
        closeDialog();
        showNotification('点検結果を保存しました', 'success');
        loadChecklistTemplates();
    } catch (error) {
        console.error('Error saving checklist results:', error);
        showNotification('保存に失敗しました', 'error');
    }
};

// ============================================
// Failure Reports
// ============================================

// Load failures
window.loadFailures = async function(status = null) {
    try {
        const url = status ? `/api/failures?status=${status}` : '/api/failures';
        const response = await axios.get(url);
        const failures = response.data;
        renderFailuresList(failures);
    } catch (error) {
        console.error('Error loading failures:', error);
    }
};

// Render failures list
function renderFailuresList(failures) {
    const container = document.getElementById('failures-list');
    if (!container) return;
    
    if (failures.length === 0) {
        container.innerHTML = `
            <div class="text-gray-400 text-xs text-center py-4">
                <i class="fas fa-check-circle text-2xl mb-2 opacity-50"></i>
                <p>故障報告はありません</p>
            </div>
        `;
        return;
    }
    
    const getSeverityColor = (severity) => {
        const colors = {
            low: 'text-green-400 bg-green-500/20',
            medium: 'text-yellow-400 bg-yellow-500/20',
            high: 'text-orange-400 bg-orange-500/20',
            critical: 'text-red-400 bg-red-500/20'
        };
        return colors[severity] || colors.medium;
    };
    
    const getStatusColor = (status) => {
        const colors = {
            reported: 'text-yellow-400',
            investigating: 'text-blue-400',
            in_repair: 'text-orange-400',
            resolved: 'text-green-400',
            closed: 'text-gray-400'
        };
        return colors[status] || colors.reported;
    };
    
    container.innerHTML = failures.map(failure => `
        <div class="card cursor-pointer hover:border-red-400" onclick="viewFailureDetail(${failure.id})">
            <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="px-2 py-0.5 rounded-full text-xs ${getSeverityColor(failure.severity)}">
                            ${failure.severity}
                        </span>
                        <span class="${getStatusColor(failure.status)} text-xs">
                            <i class="fas fa-circle text-xs mr-1"></i>${failure.status}
                        </span>
                    </div>
                    <div class="text-white font-semibold text-sm mb-1">${failure.title}</div>
                    <div class="text-gray-400 text-xs mb-1">
                        <i class="fas fa-cogs mr-1"></i>${failure.equipment_name || '設備不明'}
                    </div>
                    <div class="text-gray-500 text-xs">
                        ${new Date(failure.report_date || failure.created_at).toLocaleString('ja-JP')}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Show failure report dialog
window.showFailureReportDialog = async function() {
    // Get equipment list
    const equipmentResponse = await axios.get('/api/equipment');
    const equipment = equipmentResponse.data;
    
    const equipmentOptions = equipment.map(eq => 
        `<option value="${eq.id}">${eq.name} (${eq.type})</option>`
    ).join('');
    
    const dialog = `
        <div class="glass rounded-lg p-6 max-w-lg mx-auto">
            <h3 class="text-white font-bold text-lg mb-4">
                <i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>
                故障報告
            </h3>
            <div class="space-y-4">
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">対象設備 *</label>
                    <select id="failure-equipment" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                        ${equipmentOptions}
                    </select>
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">タイトル *</label>
                    <input type="text" id="failure-title" placeholder="例: 異常音発生" 
                           class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">重大度 *</label>
                    <select id="failure-severity" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                        <option value="low">低</option>
                        <option value="medium" selected>中</option>
                        <option value="high">高</option>
                        <option value="critical">緊急</option>
                    </select>
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">故障タイプ</label>
                    <select id="failure-type" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                        <option value="breakdown">故障</option>
                        <option value="malfunction">動作不良</option>
                        <option value="abnormal_sound">異常音</option>
                        <option value="leak">漏れ</option>
                        <option value="other">その他</option>
                    </select>
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">説明 *</label>
                    <textarea id="failure-description" rows="3" placeholder="故障の詳細を記入"
                              class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600"></textarea>
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">症状</label>
                    <input type="text" id="failure-symptoms" placeholder="例: ガタガタという振動音" 
                           class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                </div>
                <div>
                    <label class="text-gray-300 text-sm mb-2 block">報告者名 *</label>
                    <input type="text" id="failure-reporter" placeholder="報告者名を入力" 
                           class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">
                </div>
                <div class="flex gap-2">
                    <button onclick="closeDialog()" 
                            class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">
                        キャンセル
                    </button>
                    <button onclick="submitFailureReport()" 
                            class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition">
                        報告
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showDialog(dialog);
};

// Submit failure report
window.submitFailureReport = async function() {
    const equipmentId = document.getElementById('failure-equipment').value;
    const title = document.getElementById('failure-title').value;
    const severity = document.getElementById('failure-severity').value;
    const failureType = document.getElementById('failure-type').value;
    const description = document.getElementById('failure-description').value;
    const symptoms = document.getElementById('failure-symptoms').value;
    const reporterName = document.getElementById('failure-reporter').value;
    
    if (!title || !description || !reporterName) {
        alert('必須項目を入力してください');
        return;
    }
    
    try {
        await axios.post('/api/failures', {
            equipment_id: equipmentId,
            title,
            severity,
            failure_type: failureType,
            description,
            symptoms,
            reporter_name: reporterName,
            report_date: new Date().toISOString()
        });
        
        closeDialog();
        showNotification('故障報告を作成しました', 'success');
        loadFailures();
    } catch (error) {
        console.error('Error creating failure report:', error);
        showNotification('報告の作成に失敗しました', 'error');
    }
};

// ============================================
// Work History
// ============================================

// Load work history
window.loadWorkHistory = async function() {
    try {
        const response = await axios.get('/api/work-history?limit=50');
        const workHistory = response.data;
        renderWorkHistoryList(workHistory);
    } catch (error) {
        console.error('Error loading work history:', error);
    }
};

// Render work history list
function renderWorkHistoryList(workHistory) {
    const container = document.getElementById('work-history-list');
    if (!container) return;
    
    if (workHistory.length === 0) {
        container.innerHTML = `
            <div class="text-gray-400 text-xs text-center py-4">
                <i class="fas fa-tools text-2xl mb-2 opacity-50"></i>
                <p>作業履歴はありません</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = workHistory.map(work => `
        <div class="card cursor-pointer hover:border-purple-400" onclick="viewWorkDetail(${work.id})">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="text-white font-semibold text-sm mb-1">${work.title}</div>
                    <div class="text-gray-400 text-xs mb-1">
                        <i class="fas fa-cogs mr-1"></i>${work.equipment_name || '設備不明'}
                    </div>
                    <div class="flex items-center gap-2 flex-wrap mt-2">
                        <span class="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                            ${work.work_type}
                        </span>
                        ${work.actual_hours ? `
                            <span class="text-gray-500 text-xs">
                                <i class="fas fa-clock mr-1"></i>${work.actual_hours}h
                            </span>
                        ` : ''}
                        ${work.total_cost ? `
                            <span class="text-gray-500 text-xs">
                                <i class="fas fa-yen-sign mr-1"></i>¥${work.total_cost.toLocaleString()}
                            </span>
                        ` : ''}
                    </div>
                    <div class="text-gray-500 text-xs mt-1">
                        ${new Date(work.start_time || work.created_at).toLocaleString('ja-JP')}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// Parts Management
// ============================================

// Load parts
window.loadParts = async function() {
    try {
        const [partsResponse, lowStockResponse] = await Promise.all([
            axios.get('/api/parts'),
            axios.get('/api/inventory/low-stock')
        ]);
        
        const parts = partsResponse.data;
        const lowStockParts = lowStockResponse.data;
        
        // Update low stock alert
        const alertElement = document.getElementById('low-stock-alert');
        if (lowStockParts.length > 0) {
            alertElement.classList.remove('hidden');
            document.getElementById('low-stock-count').textContent = lowStockParts.length;
        } else {
            alertElement.classList.add('hidden');
        }
        
        renderPartsList(parts);
    } catch (error) {
        console.error('Error loading parts:', error);
    }
};

// Render parts list
function renderPartsList(parts) {
    const container = document.getElementById('parts-list');
    if (!container) return;
    
    if (parts.length === 0) {
        container.innerHTML = `
            <div class="text-gray-400 text-xs text-center py-4">
                <i class="fas fa-box text-2xl mb-2 opacity-50"></i>
                <p>部品がありません</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = parts.map(part => {
        const stock = part.calculated_stock || part.current_stock || 0;
        const isLowStock = stock <= part.min_stock_level;
        
        return `
            <div class="card cursor-pointer hover:border-yellow-400" onclick="viewPartDetail(${part.id})">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="text-white font-semibold text-sm mb-1">${part.name}</div>
                        ${part.part_number ? `
                            <div class="text-gray-400 text-xs mb-1">
                                品番: ${part.part_number}
                            </div>
                        ` : ''}
                        <div class="flex items-center gap-2 flex-wrap mt-2">
                            <span class="px-2 py-0.5 rounded-full text-xs ${isLowStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}">
                                <i class="fas fa-box mr-1"></i>在庫: ${stock}
                            </span>
                            ${part.unit_price ? `
                                <span class="text-gray-500 text-xs">
                                    <i class="fas fa-yen-sign mr-1"></i>¥${part.unit_price.toLocaleString()}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Utility Functions
// ============================================

// Show dialog
function showDialog(html) {
    const dialogContainer = document.getElementById('dialog-container');
    if (!dialogContainer) {
        const container = document.createElement('div');
        container.id = 'dialog-container';
        container.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        container.innerHTML = html;
        document.body.appendChild(container);
    } else {
        dialogContainer.innerHTML = html;
        dialogContainer.style.display = 'flex';
    }
}

// Close dialog
window.closeDialog = function() {
    const dialogContainer = document.getElementById('dialog-container');
    if (dialogContainer) {
        dialogContainer.style.display = 'none';
    }
};

// Show notification
function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-6 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50 transition-all`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions
window.showNotification = showNotification;
window.showDialog = showDialog;

console.log('✅ CMMS Feature Module loaded');

// Initialize on page load - resources tab is active by default
// Other tabs will load their data when switched
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing CMMS UI...');
    
    // Resources tab is already loaded by viewer.js
    // Other tabs will auto-load when user switches to them via switchTab()
});
