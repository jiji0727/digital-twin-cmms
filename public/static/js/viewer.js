// Advanced Digital Twin CMMS Viewer with LCC SDK
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LCCRender } from '/sdk/lcc-0.5.3.js';

console.log('🚀 Digital Twin CMMS Viewer with LCC SDK starting...');

// Global state
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    lccObject: null,
    equipment: [],
    selectedEquipment: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    markers: [],
    clock: new THREE.Clock(),
    editMode: false,
    isPlacingEquipment: false,
    equipmentToPlace: null,
    draggedMarker: null,
    isDragging: false,
    modelLoaded: false
};

// Initialize the 3D viewer with LCC SDK
async function initViewer() {
    console.log('Initializing 3D viewer with LCC SDK...');
    updateLoadingProgress(5);
    
    const canvas = document.getElementById('viewer-canvas');
    const container = canvas.parentElement;

    // Setup Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0a0a0a);
    updateLoadingProgress(10);

    // Setup Camera
    state.camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        150000
    );
    state.camera.position.set(20, 15, 20);
    updateLoadingProgress(15);

    // Setup Renderer
    state.renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    state.renderer.setSize(container.clientWidth, container.clientHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.2;
    updateLoadingProgress(20);

    // Setup Orbit Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.maxPolarAngle = Math.PI / 1.8;
    state.controls.minDistance = 5;
    state.controls.maxDistance = 200;
    
    // Standard controls (left drag rotate, right drag pan, wheel zoom)
    // Will be dynamically enabled/disabled based on edit mode and dragging state
    
    updateLoadingProgress(25);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    state.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
    state.scene.add(hemiLight);
    updateLoadingProgress(30);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    gridHelper.name = 'gridHelper';
    state.scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.name = 'axesHelper';
    state.scene.add(axesHelper);
    updateLoadingProgress(35);

    // Model matrix for coordinate system transformation
    const modelMatrix = new THREE.Matrix4(
        -1, 0, 0, 0,
        0, 0, 1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
    );

    // Load Big Mirror LCC Model
    console.log('🎨 Loading Big Mirror LCC model...');
    updateLoadingProgress(40);

    try {
        state.lccObject = LCCRender.load({
            camera: state.camera,
            scene: state.scene,
            dataPath: `${location.origin}/r2-models/BigMirror/meta.lcc`,
            renderLib: THREE,
            canvas: state.renderer.domElement,
            renderer: state.renderer,
            useEnv: true,
            useIndexDB: true,
            useLoadingEffect: true,
            modelMatrix: modelMatrix,
            appKey: 'digital-twin-cmms-xgrids-2024'
        }, 
        (mesh) => {
            console.log('✅ LCC Big Mirror model loaded successfully:', mesh);
            updateLoadingProgress(90);
            
            // Store mesh reference in state
            if (state.lccObject) {
                state.lccObject.mesh = mesh;
            }
            state.modelLoaded = true;
            
            // LCC models render themselves, just set a good camera position
            // Set camera to a position that should show the model
            state.camera.position.set(15, 10, 15);
            state.controls.target.set(0, 0, 0);
            state.controls.update();
            
            // Debug: Log scene contents
            console.log('📐 Camera positioned at:', state.camera.position);
            console.log('🎯 Scene children count:', state.scene.children.length);
            console.log('🎯 Scene children types:', state.scene.children.map(c => c.type + (c.name ? ' (' + c.name + ')' : '')));
            console.log('🎯 Model mesh:', mesh);
            console.log('💡 Use mouse to orbit, scroll to zoom');
        }, 
        (percent) => {
            const progress = 40 + (percent * 50); // 40% to 90%
            updateLoadingProgress(progress);
            console.log(`📊 Loading progress: ${(percent * 100).toFixed(1)}%`);
        }, 
        () => {
            console.error('❌ Failed to load LCC model');
            alert('Big Mirrorモデルの読み込みに失敗しました。\nページをリロードしてください。');
        });

        window.lccObj = state.lccObject;
        window.LCCRender = LCCRender;
        
        console.log('🔗 LCC SDK initialized:', LCCRender);
    } catch (error) {
        console.error('❌ Error initializing LCC SDK:', error);
        alert('LCC SDKの初期化に失敗しました: ' + error.message);
    }

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', onClick);
    updateLoadingProgress(92);

    // Load CMMS data
    await loadCMMSData();
    updateLoadingProgress(95);

    // Start animation loop
    animate();
    updateLoadingProgress(100);
    
    setTimeout(() => {
        hideLoadingScreen();
        console.log('✅ Viewer initialized successfully with Big Mirror model');
    }, 500);
}

function animate() {
    requestAnimationFrame(animate);

    if (state.controls) {
        state.controls.update();
    }

    // Update LCC rendering
    if (state.lccObject && LCCRender) {
        LCCRender.update();
    }

    // Update equipment markers
    const time = Date.now() * 0.001;
    state.markers.forEach(marker => {
        // Animate scale with pulse effect
        marker.scale.setScalar(1 + Math.sin(time * 2 + marker.position.x) * 0.1);
        
        // Make marker face camera (billboard effect)
        if (marker.userData.isBillboard) {
            marker.quaternion.copy(state.camera.quaternion);
        }
        
        // Occlusion check: Hide markers behind model
        // Cast ray from camera to marker
        const direction = new THREE.Vector3();
        direction.subVectors(marker.position, state.camera.position).normalize();
        
        const raycaster = new THREE.Raycaster(state.camera.position, direction);
        const distanceToMarker = marker.position.distanceTo(state.camera.position);
        
        // Get all scene objects except markers and helpers
        const intersectableObjects = state.scene.children.filter(obj => 
            obj.type !== 'GridHelper' && 
            obj.type !== 'AxesHelper' && 
            !state.markers.includes(obj) &&
            obj.type !== 'AmbientLight' &&
            obj.type !== 'DirectionalLight' &&
            obj.type !== 'HemisphereLight'
        );
        
        const intersects = raycaster.intersectObjects(intersectableObjects, true);
        
        // Check if something is blocking the view to the marker
        let isOccluded = false;
        for (const intersect of intersects) {
            // If intersection is closer than marker, marker is occluded
            if (intersect.distance < distanceToMarker - 0.5) { // 0.5 margin for tolerance
                isOccluded = true;
                break;
            }
        }
        
        // Set visibility based on occlusion
        if (isOccluded) {
            marker.visible = false;
        } else {
            marker.visible = true;
            marker.material.opacity = 0.9;
        }
    });

    state.renderer.render(state.scene, state.camera);
}

function onWindowResize() {
    const container = state.renderer.domElement.parentElement;
    state.camera.aspect = container.clientWidth / container.clientHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseMove(event) {
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Handle marker dragging
    if (state.isDragging && state.draggedMarker && state.modelLoaded) {
        state.raycaster.setFromCamera(state.mouse, state.camera);
        
        // Try raycasting against scene objects
        const intersectableObjects = state.scene.children.filter(obj => 
            obj.type !== 'GridHelper' && 
            obj.type !== 'AxesHelper' && 
            !state.markers.includes(obj) &&
            obj.type !== 'AmbientLight' &&
            obj.type !== 'DirectionalLight' &&
            obj.type !== 'HemisphereLight'
        );
        
        const intersects = state.raycaster.intersectObjects(intersectableObjects, true);
        
        if (intersects.length > 0) {
            // Found intersection
            state.draggedMarker.position.copy(intersects[0].point);
        } else {
            // No intersection - move along a plane perpendicular to camera
            const currentDistance = state.draggedMarker.position.distanceTo(state.camera.position);
            const newPos = new THREE.Vector3();
            newPos.copy(state.raycaster.ray.direction).multiplyScalar(currentDistance).add(state.raycaster.ray.origin);
            state.draggedMarker.position.copy(newPos);
        }
    }
}

function onMouseDown(event) {
    // Only handle left click for marker dragging
    if (event.button !== 0) return;
    
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const intersects = state.raycaster.intersectObjects(state.markers);
    
    if (intersects.length > 0 && state.editMode) {
        const marker = intersects[0].object;
        state.draggedMarker = marker;
        state.isDragging = true;
        
        // Disable controls while dragging marker
        if (state.controls) {
            state.controls.enabled = false;
        }
        
        document.getElementById('viewer-canvas').style.cursor = 'grabbing';
    }
}

function onMouseUp(event) {
    if (state.isDragging && state.draggedMarker) {
        const equipmentId = state.draggedMarker.userData.equipmentId;
        const newPosition = state.draggedMarker.position.clone();
        
        updateEquipmentPosition(equipmentId, newPosition);
        
        state.isDragging = false;
        state.draggedMarker = null;
        
        // Re-enable controls after dragging
        if (state.controls) {
            state.controls.enabled = true;
        }
        
        document.getElementById('viewer-canvas').style.cursor = state.editMode ? 'pointer' : 'default';
    }
}

function onClick(event) {
    state.raycaster.setFromCamera(state.mouse, state.camera);
    
    // If in equipment placement mode
    if (state.isPlacingEquipment && state.equipmentToPlace) {
        placeEquipmentAtClick();
        return;
    }
    
    // Check if clicking on a marker
    const markerIntersects = state.raycaster.intersectObjects(state.markers);
    if (markerIntersects.length > 0) {
        const marker = markerIntersects[0].object;
        if (marker.userData.equipmentId) {
            if (state.editMode) {
                // In edit mode, prepare to drag marker
                state.draggedMarker = marker;
            } else {
                // In normal mode, select equipment
                window.selectEquipment(marker.userData.equipmentId);
            }
        }
        return;
    }
    
    // If edit mode and clicked on model surface
    if (state.editMode && state.modelLoaded) {
        // Raycast against all objects in the scene (excluding markers and helpers)
        const intersectableObjects = state.scene.children.filter(obj => 
            obj.type !== 'GridHelper' && 
            obj.type !== 'AxesHelper' && 
            !state.markers.includes(obj) &&
            obj.type !== 'AmbientLight' &&
            obj.type !== 'DirectionalLight' &&
            obj.type !== 'HemisphereLight'
        );
        
        const modelIntersects = state.raycaster.intersectObjects(intersectableObjects, true);
        if (modelIntersects.length > 0) {
            const point = modelIntersects[0].point;
            console.log('🎯 Clicked on model at:', point);
            console.log('🎯 Intersected object:', modelIntersects[0].object);
            showPositionInfo(point);
        }
    }
}

function placeEquipmentAtClick() {
    if (!state.modelLoaded) {
        showNotification('モデルの読み込みが完了していません。しばらくお待ちください...', 'warning');
        return;
    }
    
    // Calculate 3D position from camera and mouse position
    // Use raycaster to project from camera through mouse position
    state.raycaster.setFromCamera(state.mouse, state.camera);
    
    // Try raycasting against scene objects first
    const intersectableObjects = state.scene.children.filter(obj => 
        obj.type !== 'GridHelper' && 
        obj.type !== 'AxesHelper' && 
        !state.markers.includes(obj) &&
        obj.type !== 'AmbientLight' &&
        obj.type !== 'DirectionalLight' &&
        obj.type !== 'HemisphereLight'
    );
    
    let point = null;
    const intersects = state.raycaster.intersectObjects(intersectableObjects, true);
    
    if (intersects.length > 0) {
        // Found intersection with scene objects
        point = intersects[0].point.clone();
        console.log('📍 Found intersection with object:', intersects[0].object.type);
    } else {
        // No intersection - place at a fixed distance from camera along ray direction
        const distance = state.camera.position.length() * 0.5; // Half distance to origin
        point = new THREE.Vector3();
        point.copy(state.raycaster.ray.direction).multiplyScalar(distance).add(state.raycaster.ray.origin);
        console.log('📍 No intersection - placing at calculated position');
    }
    
    console.log('📍 Placing equipment at:', point);
    
    if (state.equipmentToPlace.id) {
        // Update existing equipment position
        updateEquipmentPosition(state.equipmentToPlace.id, point);
    } else {
        // Create new equipment at this position
        state.equipmentToPlace.location_x = point.x;
        state.equipmentToPlace.location_y = point.y;
        state.equipmentToPlace.location_z = point.z;
        createNewEquipment(state.equipmentToPlace);
    }
    
    exitPlacementMode();
    return;
    
    // Fallback (should never reach here)
    if (false) {
        showNotification('モデル表面をクリックしてください', 'warning');
    }
}

function showPositionInfo(point) {
    const info = `
        位置情報:
        X: ${point.x.toFixed(2)}
        Y: ${point.y.toFixed(2)}
        Z: ${point.z.toFixed(2)}
    `;
    console.log(info);
}

// CMMS Data Loading
async function loadCMMSData() {
    try {
        console.log('📋 Loading CMMS data...');
        
        // Load equipment data
        const equipmentResponse = await axios.get('/api/equipment');
        state.equipment = equipmentResponse.data;
        renderEquipmentList(state.equipment);
        createEquipmentMarkers(state.equipment);

        // Load maintenance data
        const maintenanceResponse = await axios.get('/api/maintenance');
        renderMaintenanceList(maintenanceResponse.data);

        // Load work orders
        const workOrdersResponse = await axios.get('/api/workorders');
        renderWorkOrdersList(workOrdersResponse.data);

        // Load analytics
        const analyticsResponse = await axios.get('/api/analytics');
        updateAnalyticsDashboard(analyticsResponse.data);
        
        console.log('✅ CMMS data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading CMMS data:', error);
    }
}

function renderEquipmentList(equipment) {
    const list = document.getElementById('equipment-list');
    if (!equipment || equipment.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">設備データがありません</div>';
        return;
    }
    list.innerHTML = equipment.map(eq => `
        <div class="glass rounded p-3 hover:bg-white hover:bg-opacity-10 transition">
            <div class="flex items-center justify-between">
                <div class="flex items-center cursor-pointer flex-1" onclick="selectEquipment(${eq.id})">
                    <i class="fas fa-cog mr-2 status-${eq.status}"></i>
                    <span class="text-white text-sm font-medium">${eq.name}</span>
                </div>
                <button onclick="showEquipmentEditDialog(${eq.id}); event.stopPropagation();" 
                        class="text-blue-400 hover:text-blue-300 ml-2 p-1">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                ${eq.type} | ${eq.last_maintenance || '未実施'}
            </div>
        </div>
    `).join('');
}

function renderMaintenanceList(maintenance) {
    const list = document.getElementById('maintenance-list');
    if (!maintenance || maintenance.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">保守計画がありません</div>';
        return;
    }
    list.innerHTML = maintenance.slice(0, 10).map(m => {
        const statusColors = {
            'scheduled': 'blue',
            'in-progress': 'yellow',
            'completed': 'green',
            'overdue': 'red'
        };
        const color = statusColors[m.status] || 'gray';
        
        return `
            <div class="glass rounded p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-${color}-400 text-xs font-semibold uppercase">${m.status}</span>
                    <span class="text-xs text-gray-400">${m.next_scheduled ? new Date(m.next_scheduled).toLocaleDateString('ja-JP') : '-'}</span>
                </div>
                <div class="text-white text-sm font-medium">${m.title}</div>
                <div class="text-xs text-gray-400 mt-1">${m.equipment_name || 'Equipment #' + m.equipment_id}</div>
            </div>
        `;
    }).join('');
}

function renderWorkOrdersList(workOrders) {
    const list = document.getElementById('workorder-list');
    if (!workOrders || workOrders.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">作業指示がありません</div>';
        return;
    }
    list.innerHTML = workOrders.slice(0, 10).map(wo => {
        const priorityColors = {
            'critical': 'red',
            'high': 'red',
            'medium': 'yellow',
            'low': 'green'
        };
        const statusColors = {
            'pending': 'gray',
            'in-progress': 'blue',
            'completed': 'green'
        };
        const priorityColor = priorityColors[wo.priority] || 'gray';
        const statusColor = statusColors[wo.status] || 'gray';
        
        return `
            <div class="glass rounded p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white text-sm font-medium">${wo.title}</span>
                    <span class="px-2 py-1 rounded text-xs bg-${priorityColor}-500 bg-opacity-20 text-${priorityColor}-400">
                        ${wo.priority}
                    </span>
                </div>
                <div class="text-xs text-${statusColor}-400 mb-1">${wo.status}</div>
                <div class="text-xs text-gray-400">担当: ${wo.assigned_to || '未割当'}</div>
                <div class="text-xs text-gray-400">期限: ${wo.scheduled_date ? new Date(wo.scheduled_date).toLocaleDateString('ja-JP') : '-'}</div>
            </div>
        `;
    }).join('');
}

function updateAnalyticsDashboard(analytics) {
    console.log('📊 Analytics data:', analytics);
    
    // Update uptime display
    if (analytics.uptime !== undefined) {
        document.getElementById('uptime-display').textContent = analytics.uptime.toFixed(1) + '%';
    }
    
    // Update system metrics
    const metricsContainer = document.getElementById('system-metrics');
    if (analytics.equipment && metricsContainer) {
        metricsContainer.innerHTML = `
            <div class="metric-card glass rounded p-3">
                <div class="text-gray-400 text-xs">総設備数</div>
                <div class="text-white text-2xl font-bold">${analytics.equipment.total || 0}</div>
            </div>
            <div class="metric-card glass rounded p-3">
                <div class="text-gray-400 text-xs">稼働中</div>
                <div class="text-green-400 text-2xl font-bold">${analytics.equipment.operational || 0}</div>
            </div>
            <div class="metric-card glass rounded p-3">
                <div class="text-gray-400 text-xs">警告</div>
                <div class="text-yellow-400 text-2xl font-bold">${analytics.equipment.warning || 0}</div>
            </div>
            <div class="metric-card glass rounded p-3">
                <div class="text-gray-400 text-xs">緊急</div>
                <div class="text-red-400 text-2xl font-bold">${analytics.equipment.critical || 0}</div>
            </div>
        `;
    }
    
    // Update alerts list with recent critical events
    loadRecentAlerts();
}

function createEquipmentMarkers(equipment) {
    console.log('🎯 Creating equipment markers...');
    
    if (!equipment || equipment.length === 0) {
        console.warn('⚠️ No equipment data to create markers');
        return;
    }
    
    equipment.forEach(eq => {
        // Smaller marker (0.4 instead of 0.8)
        const geometry = new THREE.SphereGeometry(0.4, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: eq.status === 'operational' ? 0x10b981 : 
                   eq.status === 'warning' ? 0xf59e0b : 0xef4444,
            emissive: eq.status === 'operational' ? 0x10b981 : 
                      eq.status === 'warning' ? 0xf59e0b : 0xef4444,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            depthWrite: true
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(
            parseFloat(eq.location_x) || 0, 
            parseFloat(eq.location_y) || 0, 
            parseFloat(eq.location_z) || 0
        );
        marker.userData = { equipmentId: eq.id, equipment: eq };
        marker.name = `equipment-marker-${eq.id}`;
        marker.castShadow = true;
        
        // Make marker always face camera (billboard effect)
        marker.userData.isBillboard = true;
        
        state.scene.add(marker);
        state.markers.push(marker);
    });
    
    console.log(`✅ Created ${equipment.length} equipment markers`);
}

// Control Functions
window.resetView = function() {
    if (state.lccObject && state.lccObject.mesh) {
        const box = new THREE.Box3().setFromObject(state.lccObject.mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = state.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5;
        
        state.camera.position.set(
            center.x + cameraZ * 0.7, 
            center.y + cameraZ * 0.5, 
            center.z + cameraZ * 0.7
        );
        state.controls.target.copy(center);
        state.controls.update();
    } else {
        state.camera.position.set(20, 15, 20);
        state.camera.lookAt(0, 0, 0);
        state.controls.target.set(0, 0, 0);
        state.controls.update();
    }
}

window.toggleViewMode = function() {
    console.log('View mode toggle - Feature coming soon');
}

window.toggleMeasure = function() {
    console.log('Measurement mode toggle - Feature coming soon');
}

window.toggleSection = function() {
    console.log('Section mode toggle - Feature coming soon');
}

window.takeScreenshot = function() {
    state.renderer.render(state.scene, state.camera);
    const dataURL = state.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `digital-twin-cmms-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    console.log('📸 Screenshot saved');
}

window.toggleEquipmentMarkers = function(checkbox) {
    state.markers.forEach(marker => {
        marker.visible = checkbox.checked;
    });
}

window.toggleGrid = function(checkbox) {
    const grid = state.scene.getObjectByName('gridHelper');
    if (grid) grid.visible = checkbox.checked;
}

window.toggleEnvironment = function(checkbox) {
    console.log('Environment toggle:', checkbox.checked);
}

window.updatePointDensity = function(value) {
    console.log('Point density:', value);
}

window.selectEquipment = function(id) {
    const equipment = state.equipment.find(eq => eq.id === id);
    if (!equipment) return;
    
    state.selectedEquipment = equipment;
    
    // Focus camera on equipment
    const marker = state.markers.find(m => m.userData.equipmentId === id);
    if (marker) {
        const targetPos = marker.position.clone();
        const offset = new THREE.Vector3(8, 5, 8);
        
        // Smooth camera transition
        const startPos = state.camera.position.clone();
        const endPos = targetPos.clone().add(offset);
        const startTarget = state.controls.target.clone();
        const endTarget = targetPos.clone();
        
        let progress = 0;
        const duration = 1000;
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            
            const eased = 1 - Math.pow(1 - progress, 3);
            
            state.camera.position.lerpVectors(startPos, endPos, eased);
            state.controls.target.lerpVectors(startTarget, endTarget, eased);
            state.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }
        animateCamera();
    }
    
    showSelectionPanel(equipment);
}

function showSelectionPanel(equipment) {
    const panel = document.getElementById('selection-panel');
    const content = document.getElementById('selection-content');
    
    content.innerHTML = `
        <div class="space-y-3">
            <div>
                <div class="text-gray-400 text-xs">設備名</div>
                <div class="text-white font-semibold">${equipment.name}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">タイプ</div>
                <div class="text-white text-sm">${equipment.type}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">ステータス</div>
                <div class="status-${equipment.status} font-semibold capitalize">${equipment.status}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">最終保守日</div>
                <div class="text-white">${equipment.last_maintenance || '未実施'}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">次回保守予定</div>
                <div class="text-white">${equipment.next_maintenance || '未定'}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">位置</div>
                <div class="text-white text-sm">X: ${equipment.location_x}, Y: ${equipment.location_y}, Z: ${equipment.location_z}</div>
            </div>
            ${equipment.description ? `
            <div>
                <div class="text-gray-400 text-xs">説明</div>
                <div class="text-white text-sm">${equipment.description}</div>
            </div>
            ` : ''}
            <div class="pt-2 border-t border-gray-600">
                <button class="w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition"
                        onclick="createMaintenancePlan(${equipment.id})">
                    <i class="fas fa-wrench mr-2"></i>保守計画を作成
                </button>
            </div>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

// Load recent alerts from analytics events
async function loadRecentAlerts() {
    try {
        const response = await axios.get('/api/analytics/events?limit=10');
        const events = response.data;
        
        const alertList = document.getElementById('alert-list');
        if (!alertList) return;
        
        const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'warning');
        
        if (criticalEvents.length === 0) {
            alertList.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">アラートはありません</div>';
            return;
        }
        
        alertList.innerHTML = criticalEvents.slice(0, 5).map(event => {
            const borderColor = event.severity === 'critical' ? 'red' : 'yellow';
            const textColor = event.severity === 'critical' ? 'red' : 'yellow';
            const timeAgo = getTimeAgo(new Date(event.timestamp));
            
            return `
                <div class="glass rounded p-3 border-l-4 border-${borderColor}-500">
                    <div class="text-${textColor}-400 font-semibold text-sm">${event.severity === 'critical' ? '緊急' : '警告'}</div>
                    <div class="text-white text-xs mt-1">${event.equipment_name || 'System'}: ${event.event_type}</div>
                    <div class="text-gray-400 text-xs mt-1">${timeAgo}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
}

window.createMaintenancePlan = function(equipmentId) {
    alert(`設備ID: ${equipmentId}の保守計画作成機能は開発中です`);
}

window.closeSelection = function() {
    document.getElementById('selection-panel').classList.add('hidden');
    state.selectedEquipment = null;
}

// ============================================
// Equipment Position Editing Functions
// ============================================

// Toggle edit mode
window.toggleEditMode = function() {
    // Check if model is loaded
    if (!state.modelLoaded) {
        showNotification('モデルの読み込みが完了するまでお待ちください...', 'warning');
        return;
    }
    
    state.editMode = !state.editMode;
    
    const btn = document.getElementById('edit-mode-btn');
    if (btn) {
        if (state.editMode) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-edit mr-2"></i>編集モード: ON';
            showNotification('編集モードが有効になりました。設備をクリックして移動できます。', 'info');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-edit mr-2"></i>編集モード';
            exitPlacementMode();
            showNotification('編集モードが無効になりました', 'info');
        }
    }
    
    // Update controls
    if (state.controls) {
        state.controls.enabled = !state.editMode || !state.isPlacingEquipment;
    }
}

// Enter equipment placement mode
window.startPlacingEquipment = function(equipment = null) {
    // Check if model is loaded
    if (!state.modelLoaded) {
        showNotification('モデルの読み込みが完了するまでお待ちください...', 'warning');
        return;
    }
    
    state.isPlacingEquipment = true;
    state.equipmentToPlace = equipment || {
        name: '新規設備',
        type: 'Other',
        status: 'operational',
        description: ''
    };
    
    if (state.controls) {
        state.controls.enabled = false;
    }
    
    showNotification('モデル表面をクリックして設備位置を指定してください', 'info');
    
    // Change cursor
    document.getElementById('viewer-canvas').style.cursor = 'crosshair';
}

// Exit placement mode
function exitPlacementMode() {
    state.isPlacingEquipment = false;
    state.equipmentToPlace = null;
    
    if (state.controls && !state.editMode) {
        state.controls.enabled = true;
    }
    
    document.getElementById('viewer-canvas').style.cursor = 'default';
}

// Update equipment position
async function updateEquipmentPosition(equipmentId, newPosition) {
    try {
        const equipment = state.equipment.find(eq => eq.id === equipmentId);
        if (!equipment) return;
        
        const updatedData = {
            ...equipment,
            location_x: newPosition.x,
            location_y: newPosition.y,
            location_z: newPosition.z
        };
        
        const response = await axios.put(`/api/equipment/${equipmentId}`, updatedData);
        
        if (response.status === 200) {
            // Update local state
            Object.assign(equipment, updatedData);
            
            // Update marker position
            const marker = state.markers.find(m => m.userData.equipmentId === equipmentId);
            if (marker) {
                marker.position.set(newPosition.x, newPosition.y, newPosition.z);
            }
            
            showNotification(`${equipment.name}の位置を更新しました`, 'success');
            console.log('✅ Equipment position updated:', equipment);
        }
    } catch (error) {
        console.error('Error updating equipment position:', error);
        showNotification('位置の更新に失敗しました', 'error');
    }
}

// Create new equipment
async function createNewEquipment(equipmentData) {
    try {
        const response = await axios.post('/api/equipment', equipmentData);
        
        if (response.status === 201) {
            const newEquipment = response.data;
            state.equipment.push(newEquipment);
            
            // Create marker for new equipment
            createEquipmentMarkers([newEquipment]);
            
            // Refresh equipment list
            renderEquipmentList(state.equipment);
            
            showNotification(`${newEquipment.name}を作成しました`, 'success');
            console.log('✅ Equipment created:', newEquipment);
        }
    } catch (error) {
        console.error('Error creating equipment:', error);
        showNotification('設備の作成に失敗しました', 'error');
    }
}

// Show equipment edit dialog
window.showEquipmentEditDialog = function(equipmentId = null) {
    const equipment = equipmentId ? state.equipment.find(eq => eq.id === equipmentId) : null;
    
    const dialogHTML = `
        <div id="equipment-dialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="panel rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-white text-xl font-bold">
                        ${equipment ? '設備編集' : '新規設備作成'}
                    </h3>
                    <button onclick="closeEquipmentDialog()" class="text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="text-gray-300 text-sm block mb-1">設備名</label>
                        <input type="text" id="eq-name" value="${equipment?.name || ''}" 
                               class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none">
                    </div>
                    
                    <div>
                        <label class="text-gray-300 text-sm block mb-1">タイプ</label>
                        <select id="eq-type" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none">
                            <option value="HVAC" ${equipment?.type === 'HVAC' ? 'selected' : ''}>HVAC</option>
                            <option value="Electrical" ${equipment?.type === 'Electrical' ? 'selected' : ''}>Electrical</option>
                            <option value="Plumbing" ${equipment?.type === 'Plumbing' ? 'selected' : ''}>Plumbing</option>
                            <option value="Safety" ${equipment?.type === 'Safety' ? 'selected' : ''}>Safety</option>
                            <option value="Security" ${equipment?.type === 'Security' ? 'selected' : ''}>Security</option>
                            <option value="Transportation" ${equipment?.type === 'Transportation' ? 'selected' : ''}>Transportation</option>
                            <option value="Other" ${equipment?.type === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="text-gray-300 text-sm block mb-1">ステータス</label>
                        <select id="eq-status" class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none">
                            <option value="operational" ${equipment?.status === 'operational' ? 'selected' : ''}>Operational</option>
                            <option value="warning" ${equipment?.status === 'warning' ? 'selected' : ''}>Warning</option>
                            <option value="critical" ${equipment?.status === 'critical' ? 'selected' : ''}>Critical</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="text-gray-300 text-sm block mb-1">説明</label>
                        <textarea id="eq-description" rows="3" 
                                  class="w-full bg-gray-800 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 outline-none">${equipment?.description || ''}</textarea>
                    </div>
                    
                    <div class="glass rounded p-3">
                        <div class="text-gray-300 text-sm mb-2">位置情報</div>
                        ${equipment ? `
                            <div class="text-white text-sm">
                                X: ${equipment.location_x.toFixed(2)}, 
                                Y: ${equipment.location_y.toFixed(2)}, 
                                Z: ${equipment.location_z.toFixed(2)}
                            </div>
                            <button onclick="startRepositioning(${equipment.id})" 
                                    class="mt-2 w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition">
                                <i class="fas fa-map-marker-alt mr-2"></i>位置を変更
                            </button>
                        ` : `
                            <button onclick="startPositionSelection()" 
                                    class="w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition">
                                <i class="fas fa-map-marker-alt mr-2"></i>3D空間で位置を指定
                            </button>
                        `}
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="saveEquipment(${equipment?.id || null})" 
                                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-semibold transition">
                            <i class="fas fa-save mr-2"></i>保存
                        </button>
                        <button onclick="closeEquipmentDialog()" 
                                class="flex-1 glass text-white rounded px-4 py-2 font-semibold hover:bg-white hover:bg-opacity-20 transition">
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
}

window.closeEquipmentDialog = function() {
    const dialog = document.getElementById('equipment-dialog');
    if (dialog) dialog.remove();
}

window.startRepositioning = function(equipmentId) {
    const equipment = state.equipment.find(eq => eq.id === equipmentId);
    if (equipment) {
        closeEquipmentDialog();
        state.editMode = true;
        startPlacingEquipment(equipment);
    }
}

window.startPositionSelection = function() {
    const name = document.getElementById('eq-name').value;
    const type = document.getElementById('eq-type').value;
    const status = document.getElementById('eq-status').value;
    const description = document.getElementById('eq-description').value;
    
    if (!name) {
        alert('設備名を入力してください');
        return;
    }
    
    closeEquipmentDialog();
    state.editMode = true;
    startPlacingEquipment({
        name,
        type,
        status,
        description,
        installation_date: new Date().toISOString().split('T')[0]
    });
}

window.saveEquipment = async function(equipmentId) {
    const name = document.getElementById('eq-name').value;
    const type = document.getElementById('eq-type').value;
    const status = document.getElementById('eq-status').value;
    const description = document.getElementById('eq-description').value;
    
    if (!name) {
        alert('設備名を入力してください');
        return;
    }
    
    if (equipmentId) {
        // Update existing equipment
        const equipment = state.equipment.find(eq => eq.id === equipmentId);
        if (equipment) {
            try {
                const updatedData = {
                    ...equipment,
                    name,
                    type,
                    status,
                    description
                };
                
                const response = await axios.put(`/api/equipment/${equipmentId}`, updatedData);
                
                if (response.status === 200) {
                    Object.assign(equipment, updatedData);
                    renderEquipmentList(state.equipment);
                    
                    // Update marker color based on status
                    const marker = state.markers.find(m => m.userData.equipmentId === equipmentId);
                    if (marker) {
                        const color = status === 'operational' ? 0x10b981 : 
                                     status === 'warning' ? 0xf59e0b : 0xef4444;
                        marker.material.color.setHex(color);
                        marker.material.emissive.setHex(color);
                    }
                    
                    closeEquipmentDialog();
                    showNotification('設備を更新しました', 'success');
                }
            } catch (error) {
                console.error('Error updating equipment:', error);
                showNotification('更新に失敗しました', 'error');
            }
        }
    } else {
        alert('位置を設定してから保存してください');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const colors = {
        info: 'bg-blue-600',
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Loading screen functions
function updateLoadingProgress(percent) {
    const progressEl = document.getElementById('loading-progress');
    if (progressEl) {
        progressEl.textContent = Math.round(percent) + '%';
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Initialize viewer on page load
window.addEventListener('DOMContentLoaded', initViewer);

// Expose state for debugging
window.viewerState = state;
window.THREE = THREE;

console.log('✅ Digital Twin CMMS Viewer module loaded with LCC SDK support');
