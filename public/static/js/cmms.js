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

// ============================================
// Missing Functions Implementation
// ============================================

// View checklist template details
window.viewChecklistTemplate = async function(templateId) {
    try {
        const response = await axios.get('/api/checklists/templates');
        const template = response.data.find(t => t.id === templateId);
        
        if (!template) {
            showNotification('テンプレートが見つかりません', 'error');
            return;
        }
        
        // Get items for this template
        const itemsResponse = await axios.get('/api/checklists/items/' + templateId);
        const items = itemsResponse.data;
        
        const itemsList = items.length > 0 ? items.map(item => 
            '<li class="text-gray-300 text-sm">' + item.item_text + '</li>'
        ).join('') : '<li class="text-gray-400 text-sm">項目がありません</li>';
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-2xl mx-auto">' +
            '<h3 class="text-white font-bold text-lg mb-4">' +
            '<i class="fas fa-clipboard-check mr-2 text-blue-400"></i>' +
            template.name +
            '</h3>' +
            '<div class="space-y-3">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">説明</label>' +
            '<p class="text-white text-sm">' + (template.description || '説明なし') + '</p>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">頻度</label>' +
            '<p class="text-white text-sm">' + template.frequency + '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">設備タイプ</label>' +
            '<p class="text-white text-sm">' + (template.equipment_type || '全設備') + '</p>' +
            '</div>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs mb-2 block">チェック項目</label>' +
            '<ul class="space-y-1 max-h-64 overflow-y-auto">' + itemsList + '</ul>' +
            '</div>' +
            '<div class="flex gap-2">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            '閉じる' +
            '</button>' +
            '<button onclick="startChecklistExecution(' + templateId + ')" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
            '<i class="fas fa-play mr-2"></i>実施' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error viewing template:', error);
        showNotification('テンプレート情報の取得に失敗しました', 'error');
    }
};

// Show checklist template creation dialog
window.showChecklistTemplateDialog = function() {
    const dialog = '<div class="glass rounded-lg p-6 max-w-md mx-auto">' +
        '<h3 class="text-white font-bold text-lg mb-4">' +
        '<i class="fas fa-clipboard-check mr-2 text-blue-400"></i>' +
        'チェックリストテンプレート作成' +
        '</h3>' +
        '<div class="space-y-4">' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">テンプレート名</label>' +
        '<input type="text" id="template-name" placeholder="日次点検チェックリスト" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">説明</label>' +
        '<textarea id="template-description" placeholder="毎日実施する基本点検" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600" rows="3"></textarea>' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">頻度</label>' +
        '<select id="template-frequency" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '<option value="daily">日次</option>' +
        '<option value="weekly">週次</option>' +
        '<option value="monthly">月次</option>' +
        '<option value="quarterly">四半期</option>' +
        '<option value="yearly">年次</option>' +
        '</select>' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">設備タイプ（任意）</label>' +
        '<input type="text" id="template-equipment-type" placeholder="ポンプ、タンクなど" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div class="flex gap-2">' +
        '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
        'キャンセル' +
        '</button>' +
        '<button onclick="createChecklistTemplate()" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
        '作成' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    showDialog(dialog);
};

// Create checklist template
window.createChecklistTemplate = async function() {
    const name = document.getElementById('template-name').value;
    const description = document.getElementById('template-description').value;
    const frequency = document.getElementById('template-frequency').value;
    const equipmentType = document.getElementById('template-equipment-type').value;
    
    if (!name || !frequency) {
        showNotification('テンプレート名と頻度は必須です', 'error');
        return;
    }
    
    try {
        await axios.post('/api/checklists/templates', {
            name,
            description,
            frequency,
            equipment_type: equipmentType || null
        });
        
        showNotification('テンプレートを作成しました', 'success');
        closeDialog();
        loadChecklistTemplates();
    } catch (error) {
        console.error('Error creating template:', error);
        showNotification('テンプレート作成に失敗しました', 'error');
    }
};

// Show work history creation dialog
window.showWorkHistoryDialog = async function() {
    try {
        const equipmentResponse = await axios.get('/api/equipment');
        const equipment = equipmentResponse.data;
        
        const equipmentOptions = equipment.map(eq => 
            '<option value="' + eq.id + '">' + eq.name + ' (' + eq.type + ')</option>'
        ).join('');
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-md mx-auto">' +
            '<h3 class="text-white font-bold text-lg mb-4">' +
            '<i class="fas fa-tools mr-2 text-purple-400"></i>' +
            '作業記録' +
            '</h3>' +
            '<div class="space-y-4">' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">対象設備</label>' +
            '<select id="work-equipment" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            equipmentOptions +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">作業タイプ</label>' +
            '<select id="work-type" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '<option value="inspection">点検</option>' +
            '<option value="repair">修理</option>' +
            '<option value="maintenance">メンテナンス</option>' +
            '<option value="replacement">部品交換</option>' +
            '<option value="cleaning">清掃</option>' +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">作業内容</label>' +
            '<textarea id="work-description" placeholder="実施した作業の詳細" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600" rows="3"></textarea>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">作業者名</label>' +
            '<input type="text" id="work-performer" placeholder="作業者名" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">作業時間（分）</label>' +
            '<input type="number" id="work-duration" placeholder="60" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '</div>' +
            '<div class="flex gap-2">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            'キャンセル' +
            '</button>' +
            '<button onclick="submitWorkHistory()" class="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition">' +
            '記録' +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error showing work history dialog:', error);
        showNotification('ダイアログの表示に失敗しました', 'error');
    }
};

// Submit work history
window.submitWorkHistory = async function() {
    const equipmentId = document.getElementById('work-equipment').value;
    const workType = document.getElementById('work-type').value;
    const description = document.getElementById('work-description').value;
    const performerName = document.getElementById('work-performer').value;
    const duration = document.getElementById('work-duration').value;
    
    if (!equipmentId || !workType || !description || !performerName) {
        showNotification('すべての必須項目を入力してください', 'error');
        return;
    }
    
    try {
        await axios.post('/api/work-history', {
            equipment_id: parseInt(equipmentId),
            work_type: workType,
            description,
            performer_name: performerName,
            duration_minutes: duration ? parseInt(duration) : null,
            work_date: new Date().toISOString().split('T')[0],
            status: 'completed'
        });
        
        showNotification('作業を記録しました', 'success');
        closeDialog();
        loadWorkHistory();
    } catch (error) {
        console.error('Error submitting work history:', error);
        showNotification('作業記録に失敗しました', 'error');
    }
};

// Show part creation dialog
window.showPartDialog = function() {
    const dialog = '<div class="glass rounded-lg p-6 max-w-md mx-auto">' +
        '<h3 class="text-white font-bold text-lg mb-4">' +
        '<i class="fas fa-box mr-2 text-yellow-400"></i>' +
        '部品登録' +
        '</h3>' +
        '<div class="space-y-4">' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">部品名</label>' +
        '<input type="text" id="part-name" placeholder="オイルフィルター" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">部品番号</label>' +
        '<input type="text" id="part-number" placeholder="OF-12345" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">カテゴリ</label>' +
        '<select id="part-category" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '<option value="filter">フィルター</option>' +
        '<option value="bearing">ベアリング</option>' +
        '<option value="seal">シール</option>' +
        '<option value="belt">ベルト</option>' +
        '<option value="valve">バルブ</option>' +
        '<option value="sensor">センサー</option>' +
        '<option value="other">その他</option>' +
        '</select>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-4">' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">現在庫数</label>' +
        '<input type="number" id="part-quantity" value="0" min="0" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">最小在庫</label>' +
        '<input type="number" id="part-min-quantity" value="1" min="0" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">単価（円）</label>' +
        '<input type="number" id="part-unit-cost" placeholder="5000" min="0" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div class="flex gap-2">' +
        '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
        'キャンセル' +
        '</button>' +
        '<button onclick="submitPart()" class="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition">' +
        '登録' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    showDialog(dialog);
};

// Submit part
window.submitPart = async function() {
    const name = document.getElementById('part-name').value;
    const partNumber = document.getElementById('part-number').value;
    const category = document.getElementById('part-category').value;
    const quantity = document.getElementById('part-quantity').value;
    const minQuantity = document.getElementById('part-min-quantity').value;
    const unitCost = document.getElementById('part-unit-cost').value;
    
    if (!name || !partNumber || !category) {
        showNotification('部品名、部品番号、カテゴリは必須です', 'error');
        return;
    }
    
    try {
        await axios.post('/api/parts', {
            name,
            part_number: partNumber,
            category,
            current_stock: parseInt(quantity) || 0,
            min_stock_level: parseInt(minQuantity) || 1,
            unit_price: unitCost ? parseFloat(unitCost) : null,
            location: 'Main Warehouse'
        });
        
        showNotification('部品を登録しました', 'success');
        closeDialog();
        loadParts();
    } catch (error) {
        console.error('Error submitting part:', error);
        showNotification('部品登録に失敗しました', 'error');
    }
};

// ============================================
// Failure Detail & Edit Functions
// ============================================

// View failure detail
window.viewFailureDetail = async function(failureId) {
    try {
        const response = await axios.get('/api/failures');
        const failure = response.data.find(f => f.id === failureId);
        
        if (!failure) {
            showNotification('故障報告が見つかりません', 'error');
            return;
        }
        
        const getSeverityColor = (severity) => {
            const colors = {
                low: 'bg-green-500',
                medium: 'bg-yellow-500',
                high: 'bg-orange-500',
                critical: 'bg-red-500'
            };
            return colors[severity] || colors.medium;
        };
        
        const getStatusBadge = (status) => {
            const badges = {
                reported: '<span class="px-3 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">報告済</span>',
                investigating: '<span class="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">調査中</span>',
                in_repair: '<span class="px-3 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400">修理中</span>',
                resolved: '<span class="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">解決済</span>',
                closed: '<span class="px-3 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">クローズ</span>'
            };
            return badges[status] || badges.reported;
        };
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-3xl mx-auto max-h-[80vh] overflow-y-auto">' +
            '<div class="flex items-start justify-between mb-4">' +
            '<h3 class="text-white font-bold text-lg">' +
            '<i class="fas fa-exclamation-triangle mr-2 text-red-400"></i>' +
            failure.title +
            '</h3>' +
            '<button onclick="closeDialog()" class="text-gray-400 hover:text-white">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>' +
            
            '<div class="grid grid-cols-2 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">重大度</label>' +
            '<div class="flex items-center gap-2 mt-1">' +
            '<div class="w-3 h-3 rounded-full ' + getSeverityColor(failure.severity) + '"></div>' +
            '<span class="text-white text-sm uppercase">' + failure.severity + '</span>' +
            '</div>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">ステータス</label>' +
            '<div class="mt-1">' + getStatusBadge(failure.status) + '</div>' +
            '</div>' +
            '</div>' +
            
            '<div class="grid grid-cols-2 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">対象設備</label>' +
            '<p class="text-white text-sm mt-1">' +
            '<i class="fas fa-cogs mr-2 text-blue-400"></i>' +
            (failure.equipment_name || '不明') +
            '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">故障タイプ</label>' +
            '<p class="text-white text-sm mt-1">' + (failure.failure_type || '-') + '</p>' +
            '</div>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">報告日時</label>' +
            '<p class="text-white text-sm mt-1">' +
            new Date(failure.report_date || failure.created_at).toLocaleString('ja-JP') +
            '</p>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">症状</label>' +
            '<p class="text-white text-sm mt-1 whitespace-pre-wrap">' +
            (failure.symptoms || '記載なし') +
            '</p>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">詳細説明</label>' +
            '<p class="text-white text-sm mt-1 whitespace-pre-wrap">' +
            (failure.description || '記載なし') +
            '</p>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">報告者</label>' +
            '<p class="text-white text-sm mt-1">' + (failure.reporter_name || '不明') + '</p>' +
            '</div>' +
            
            '<div class="flex gap-2 mt-6">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            '閉じる' +
            '</button>' +
            '<button onclick="editFailure(' + failureId + ')" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
            '<i class="fas fa-edit mr-2"></i>編集' +
            '</button>' +
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error viewing failure detail:', error);
        showNotification('故障報告の取得に失敗しました', 'error');
    }
};

// Edit failure
window.editFailure = async function(failureId) {
    try {
        const response = await axios.get('/api/failures');
        const failure = response.data.find(f => f.id === failureId);
        
        if (!failure) {
            showNotification('故障報告が見つかりません', 'error');
            return;
        }
        
        // Get equipment list
        const equipmentResponse = await axios.get('/api/equipment');
        const equipment = equipmentResponse.data;
        
        const equipmentOptions = equipment.map(eq => 
            '<option value="' + eq.id + '" ' + (eq.id === failure.equipment_id ? 'selected' : '') + '>' +
            eq.name + ' (' + eq.type + ')' +
            '</option>'
        ).join('');
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-lg mx-auto max-h-[80vh] overflow-y-auto">' +
            '<h3 class="text-white font-bold text-lg mb-4">' +
            '<i class="fas fa-edit mr-2 text-blue-400"></i>' +
            '故障報告編集' +
            '</h3>' +
            '<div class="space-y-4">' +
            
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">対象設備 *</label>' +
            '<select id="edit-failure-equipment" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            equipmentOptions +
            '</select>' +
            '</div>' +
            
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">タイトル *</label>' +
            '<input type="text" id="edit-failure-title" value="' + (failure.title || '') + '" placeholder="故障の概要" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '</div>' +
            
            '<div class="grid grid-cols-2 gap-4">' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">重大度 *</label>' +
            '<select id="edit-failure-severity" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '<option value="low" ' + (failure.severity === 'low' ? 'selected' : '') + '>低</option>' +
            '<option value="medium" ' + (failure.severity === 'medium' ? 'selected' : '') + '>中</option>' +
            '<option value="high" ' + (failure.severity === 'high' ? 'selected' : '') + '>高</option>' +
            '<option value="critical" ' + (failure.severity === 'critical' ? 'selected' : '') + '>緊急</option>' +
            '</select>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">ステータス *</label>' +
            '<select id="edit-failure-status" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '<option value="reported" ' + (failure.status === 'reported' ? 'selected' : '') + '>報告済</option>' +
            '<option value="investigating" ' + (failure.status === 'investigating' ? 'selected' : '') + '>調査中</option>' +
            '<option value="in_repair" ' + (failure.status === 'in_repair' ? 'selected' : '') + '>修理中</option>' +
            '<option value="resolved" ' + (failure.status === 'resolved' ? 'selected' : '') + '>解決済</option>' +
            '<option value="closed" ' + (failure.status === 'closed' ? 'selected' : '') + '>クローズ</option>' +
            '</select>' +
            '</div>' +
            '</div>' +
            
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">故障タイプ</label>' +
            '<input type="text" id="edit-failure-type" value="' + (failure.failure_type || '') + '" placeholder="電気、機械、制御など" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
            '</div>' +
            
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">症状</label>' +
            '<textarea id="edit-failure-symptoms" placeholder="故障の症状を記入" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600" rows="2">' +
            (failure.symptoms || '') +
            '</textarea>' +
            '</div>' +
            
            '<div>' +
            '<label class="text-gray-300 text-sm mb-2 block">詳細説明</label>' +
            '<textarea id="edit-failure-description" placeholder="詳しい説明" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600" rows="3">' +
            (failure.description || '') +
            '</textarea>' +
            '</div>' +
            
            '<div class="flex gap-2">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            'キャンセル' +
            '</button>' +
            '<button onclick="updateFailure(' + failureId + ')" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
            '<i class="fas fa-save mr-2"></i>更新' +
            '</button>' +
            '</div>' +
            
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error editing failure:', error);
        showNotification('編集画面の表示に失敗しました', 'error');
    }
};

// Update failure
window.updateFailure = async function(failureId) {
    const equipmentId = document.getElementById('edit-failure-equipment').value;
    const title = document.getElementById('edit-failure-title').value;
    const severity = document.getElementById('edit-failure-severity').value;
    const status = document.getElementById('edit-failure-status').value;
    const failureType = document.getElementById('edit-failure-type').value;
    const symptoms = document.getElementById('edit-failure-symptoms').value;
    const description = document.getElementById('edit-failure-description').value;
    
    if (!equipmentId || !title || !severity || !status) {
        showNotification('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        await axios.put('/api/failures/' + failureId, {
            equipment_id: parseInt(equipmentId),
            title,
            severity,
            status,
            failure_type: failureType || null,
            symptoms: symptoms || null,
            description: description || null
        });
        
        showNotification('故障報告を更新しました', 'success');
        closeDialog();
        loadFailures();
    } catch (error) {
        console.error('Error updating failure:', error);
        showNotification('更新に失敗しました', 'error');
    }
};

// ============================================
// Work History Detail Functions
// ============================================

// View work history detail
window.viewWorkDetail = async function(workId) {
    try {
        const response = await axios.get('/api/work-history');
        const work = response.data.find(w => w.id === workId);
        
        if (!work) {
            showNotification('作業履歴が見つかりません', 'error');
            return;
        }
        
        // Get work parts
        let workParts = [];
        try {
            const partsResponse = await axios.get('/api/work-history/' + workId + '/parts');
            workParts = partsResponse.data;
        } catch (error) {
            console.log('No parts for this work');
        }
        
        const partsHTML = workParts.length > 0 ? 
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">使用部品</label>' +
            '<div class="mt-2 space-y-2">' +
            workParts.map(part => 
                '<div class="bg-gray-800/50 rounded p-2">' +
                '<div class="text-white text-sm">' + part.part_name + '</div>' +
                '<div class="text-gray-400 text-xs">数量: ' + part.quantity + ' | 単価: ¥' + (part.unit_cost || 0).toLocaleString() + '</div>' +
                '</div>'
            ).join('') +
            '</div>' +
            '</div>' : '';
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">' +
            '<div class="flex items-start justify-between mb-4">' +
            '<h3 class="text-white font-bold text-lg">' +
            '<i class="fas fa-tools mr-2 text-purple-400"></i>' +
            (work.title || '作業詳細') +
            '</h3>' +
            '<button onclick="closeDialog()" class="text-gray-400 hover:text-white">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>' +
            
            '<div class="grid grid-cols-2 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">対象設備</label>' +
            '<p class="text-white text-sm mt-1">' +
            '<i class="fas fa-cogs mr-2 text-blue-400"></i>' +
            (work.equipment_name || '不明') +
            '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">作業タイプ</label>' +
            '<p class="text-white text-sm mt-1">' + (work.work_type || '-') + '</p>' +
            '</div>' +
            '</div>' +
            
            '<div class="grid grid-cols-3 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">作業時間</label>' +
            '<p class="text-white text-sm mt-1">' + (work.actual_hours || 0) + '時間</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">合計コスト</label>' +
            '<p class="text-white text-sm mt-1">¥' + (work.total_cost || 0).toLocaleString() + '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">ステータス</label>' +
            '<p class="text-white text-sm mt-1">' + (work.status || '-') + '</p>' +
            '</div>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">作業日時</label>' +
            '<p class="text-white text-sm mt-1">' +
            new Date(work.start_time || work.created_at).toLocaleString('ja-JP') +
            (work.end_time ? ' - ' + new Date(work.end_time).toLocaleString('ja-JP') : '') +
            '</p>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">作業内容</label>' +
            '<p class="text-white text-sm mt-1 whitespace-pre-wrap">' +
            (work.description || '記載なし') +
            '</p>' +
            '</div>' +
            
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs">作業者</label>' +
            '<p class="text-white text-sm mt-1">' + (work.performer_name || '不明') + '</p>' +
            '</div>' +
            
            partsHTML +
            
            '<div class="flex gap-2 mt-6">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            '閉じる' +
            '</button>' +
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error viewing work detail:', error);
        showNotification('作業履歴の取得に失敗しました', 'error');
    }
};

// ============================================
// Part Detail Functions
// ============================================

// View part detail
window.viewPartDetail = async function(partId) {
    try {
        const response = await axios.get('/api/parts');
        const part = response.data.find(p => p.id === partId);
        
        if (!part) {
            showNotification('部品が見つかりません', 'error');
            return;
        }
        
        const stock = part.calculated_stock || part.current_stock || 0;
        const isLowStock = stock <= part.min_stock_level;
        
        // Get inventory transactions
        let transactions = [];
        try {
            const txResponse = await axios.get('/api/parts/' + partId + '/transactions');
            transactions = txResponse.data;
        } catch (error) {
            console.log('No transactions for this part');
        }
        
        const transactionsHTML = transactions.length > 0 ?
            '<div class="mb-4">' +
            '<label class="text-gray-400 text-xs mb-2 block">在庫移動履歴</label>' +
            '<div class="max-h-48 overflow-y-auto space-y-2">' +
            transactions.map(tx => {
                const isIn = tx.transaction_type === 'in';
                return '<div class="bg-gray-800/50 rounded p-2">' +
                    '<div class="flex items-center justify-between">' +
                    '<span class="text-white text-sm">' +
                    '<i class="fas fa-' + (isIn ? 'arrow-down text-green-400' : 'arrow-up text-red-400') + ' mr-2"></i>' +
                    (isIn ? '入庫' : '出庫') + ': ' + tx.quantity +
                    '</span>' +
                    '<span class="text-gray-400 text-xs">' +
                    new Date(tx.transaction_date).toLocaleDateString('ja-JP') +
                    '</span>' +
                    '</div>' +
                    (tx.notes ? '<div class="text-gray-400 text-xs mt-1">' + tx.notes + '</div>' : '') +
                    '</div>';
            }).join('') +
            '</div>' +
            '</div>' : '';
        
        const dialog = '<div class="glass rounded-lg p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">' +
            '<div class="flex items-start justify-between mb-4">' +
            '<h3 class="text-white font-bold text-lg">' +
            '<i class="fas fa-box mr-2 text-yellow-400"></i>' +
            part.name +
            '</h3>' +
            '<button onclick="closeDialog()" class="text-gray-400 hover:text-white">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>' +
            
            (isLowStock ? 
                '<div class="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">' +
                '<div class="flex items-center text-red-400 text-sm">' +
                '<i class="fas fa-exclamation-triangle mr-2"></i>' +
                '<span>低在庫アラート - 発注が必要です</span>' +
                '</div>' +
                '</div>' : '') +
            
            '<div class="grid grid-cols-2 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">品番</label>' +
            '<p class="text-white text-sm mt-1">' + (part.part_number || '-') + '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">カテゴリ</label>' +
            '<p class="text-white text-sm mt-1">' + (part.category || '-') + '</p>' +
            '</div>' +
            '</div>' +
            
            '<div class="grid grid-cols-3 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">現在庫数</label>' +
            '<p class="text-white text-lg font-bold mt-1 ' + (isLowStock ? 'text-red-400' : 'text-green-400') + '">' +
            stock +
            '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">最小在庫</label>' +
            '<p class="text-white text-sm mt-1">' + (part.min_stock_level || 0) + '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">単価</label>' +
            '<p class="text-white text-sm mt-1">¥' + (part.unit_price || 0).toLocaleString() + '</p>' +
            '</div>' +
            '</div>' +
            
            '<div class="grid grid-cols-2 gap-4 mb-4">' +
            '<div>' +
            '<label class="text-gray-400 text-xs">保管場所</label>' +
            '<p class="text-white text-sm mt-1">' + (part.location || '-') + '</p>' +
            '</div>' +
            '<div>' +
            '<label class="text-gray-400 text-xs">メーカー</label>' +
            '<p class="text-white text-sm mt-1">' + (part.manufacturer || '-') + '</p>' +
            '</div>' +
            '</div>' +
            
            (part.description ? 
                '<div class="mb-4">' +
                '<label class="text-gray-400 text-xs">説明</label>' +
                '<p class="text-white text-sm mt-1 whitespace-pre-wrap">' + part.description + '</p>' +
                '</div>' : '') +
            
            transactionsHTML +
            
            '<div class="flex gap-2 mt-6">' +
            '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
            '閉じる' +
            '</button>' +
            '<button onclick="showInventoryMovement(' + partId + ')" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
            '<i class="fas fa-exchange-alt mr-2"></i>在庫移動' +
            '</button>' +
            '</div>' +
            '</div>';
        
        showDialog(dialog);
    } catch (error) {
        console.error('Error viewing part detail:', error);
        showNotification('部品情報の取得に失敗しました', 'error');
    }
};

// Show inventory movement dialog
window.showInventoryMovement = async function(partId) {
    const response = await axios.get('/api/parts');
    const part = response.data.find(p => p.id === partId);
    
    if (!part) {
        showNotification('部品が見つかりません', 'error');
        return;
    }
    
    const dialog = '<div class="glass rounded-lg p-6 max-w-md mx-auto">' +
        '<h3 class="text-white font-bold text-lg mb-4">' +
        '<i class="fas fa-exchange-alt mr-2 text-blue-400"></i>' +
        '在庫移動' +
        '</h3>' +
        '<div class="mb-4">' +
        '<p class="text-gray-300 text-sm">部品: <span class="text-white font-semibold">' + part.name + '</span></p>' +
        '<p class="text-gray-400 text-xs mt-1">現在庫: ' + (part.current_stock || 0) + '</p>' +
        '</div>' +
        '<div class="space-y-4">' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">移動タイプ</label>' +
        '<select id="inventory-tx-type" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '<option value="in">入庫</option>' +
        '<option value="out">出庫</option>' +
        '</select>' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">数量</label>' +
        '<input type="number" id="inventory-tx-quantity" min="1" value="1" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div>' +
        '<label class="text-gray-300 text-sm mb-2 block">備考（任意）</label>' +
        '<input type="text" id="inventory-tx-notes" placeholder="移動理由など" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600">' +
        '</div>' +
        '<div class="flex gap-2">' +
        '<button onclick="closeDialog()" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition">' +
        'キャンセル' +
        '</button>' +
        '<button onclick="submitInventoryMovement(' + partId + ')" class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition">' +
        '実行' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    
    showDialog(dialog);
};

// Submit inventory movement
window.submitInventoryMovement = async function(partId) {
    const txType = document.getElementById('inventory-tx-type').value;
    const quantity = document.getElementById('inventory-tx-quantity').value;
    const notes = document.getElementById('inventory-tx-notes').value;
    
    if (!quantity || parseInt(quantity) <= 0) {
        showNotification('数量を正しく入力してください', 'error');
        return;
    }
    
    try {
        await axios.post('/api/inventory/transactions', {
            part_id: partId,
            transaction_type: txType,
            quantity: parseInt(quantity),
            transaction_date: new Date().toISOString().split('T')[0],
            notes: notes || null
        });
        
        showNotification('在庫移動を記録しました', 'success');
        closeDialog();
        loadParts();
    } catch (error) {
        console.error('Error submitting inventory movement:', error);
        showNotification('在庫移動に失敗しました', 'error');
    }
};

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
