// Advanced Digital Twin CMMS Viewer with LCC SDK
import * as THREE from 'three';
import { LCCRender } from '/sdk/lcc-0.5.3.js';

console.log('🚀 Digital Twin CMMS Viewer with LCC SDK starting...');

// Global state
const state = {
    scene: null,
    camera: null,
    renderer: null,
    lccObject: null,
    equipment: [],
    selectedEquipment: null,
    piping: [],
    selectedPiping: null,
    pipingLines: [],
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    markers: [],
    clock: new THREE.Clock(),
    editMode: false,
    isPlacingEquipment: false,
    equipmentToPlace: null,
    draggedMarker: null,
    isDragging: false,
    modelLoaded: false,
    sceneLogged: false,
    savedCameraViews: [],  // Array to store saved camera positions
    // Custom camera controls
    isLeftDragging: false,
    isRightDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    cameraYaw: 0,    // Horizontal rotation (around Y axis)
    cameraPitch: 0,  // Vertical rotation (around X axis)
    moveSpeed: 0.1,
    rotateSpeed: 0.003,
    panSpeed: 0.05
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

    // Setup Custom Camera Controls
    // Initialize camera rotation from current position
    const lookAtCenter = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3().subVectors(lookAtCenter, state.camera.position).normalize();
    state.cameraYaw = Math.atan2(direction.x, direction.z);
    state.cameraPitch = Math.asin(direction.y);

    // Mouse wheel for forward/backward movement
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        // Get camera forward direction (including vertical component)
        // This is the direction the camera is actually looking at (screen center)
        const forward = new THREE.Vector3(
            Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch),
            Math.sin(state.cameraPitch),
            Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch)
        ).normalize();
        
        // Move camera forward or backward based on wheel delta (inverted)
        const moveDistance = -event.deltaY * state.moveSpeed;
        state.camera.position.x += forward.x * moveDistance;
        state.camera.position.y += forward.y * moveDistance;
        state.camera.position.z += forward.z * moveDistance;
    }, { passive: false });

    // Mouse down - start dragging
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left button - FPS rotation
            state.isLeftDragging = true;
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            canvas.style.cursor = 'grabbing';
        } else if (event.button === 2) { // Right button - Pan
            state.isRightDragging = true;
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            canvas.style.cursor = 'move';
        }
    });

    // Mouse move - handle rotation and pan
    canvas.addEventListener('mousemove', (event) => {
        if (state.isLeftDragging) {
            // FPS-style camera rotation (inverted directions)
            const deltaX = event.clientX - state.lastMouseX;
            const deltaY = event.clientY - state.lastMouseY;
            
            state.cameraYaw += deltaX * state.rotateSpeed;
            state.cameraPitch += deltaY * state.rotateSpeed;
            
            // Clamp pitch to prevent flipping
            state.cameraPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, state.cameraPitch));
            
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            
            state.isDragging = true;
        } else if (state.isRightDragging) {
            // Pan camera
            const deltaX = event.clientX - state.lastMouseX;
            const deltaY = event.clientY - state.lastMouseY;
            
            // Calculate camera right and up vectors
            const right = new THREE.Vector3(
                Math.cos(state.cameraYaw),
                0,
                -Math.sin(state.cameraYaw)
            ).normalize();
            
            const up = new THREE.Vector3(0, 1, 0);
            
            // Move camera perpendicular to view direction
            state.camera.position.x -= right.x * deltaX * state.panSpeed;
            state.camera.position.z -= right.z * deltaX * state.panSpeed;
            state.camera.position.y += up.y * deltaY * state.panSpeed;
            
            state.lastMouseX = event.clientX;
            state.lastMouseY = event.clientY;
            
            state.isDragging = true;
        }
    });

    // Mouse up - stop dragging
    canvas.addEventListener('mouseup', () => {
        state.isLeftDragging = false;
        state.isRightDragging = false;
        canvas.style.cursor = 'default';
        
        // Reset isDragging flag after a short delay to allow click events
        setTimeout(() => {
            state.isDragging = false;
        }, 50);
    });

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    
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
            state.camera.lookAt(0, 0, 0);
            
            // Debug: Log scene contents
            console.log('📐 Camera positioned at:', state.camera.position);
            console.log('🎯 Scene children count:', state.scene.children.length);
            console.log('🎯 Scene children types:', state.scene.children.map(c => c.type + (c.name ? ' (' + c.name + ')' : '')));
            console.log('🎯 Model mesh:', mesh);
            console.log('💡 Click to enable FPS controls, WASD to move, Mouse to look, ESC to exit');
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

    // Load saved camera views
    loadSavedViews();

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

    const delta = state.clock.getDelta();

    // Update camera rotation based on yaw and pitch
    const lookDirection = new THREE.Vector3(
        Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch),
        Math.sin(state.cameraPitch),
        Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch)
    );
    
    const lookAtPoint = new THREE.Vector3().addVectors(state.camera.position, lookDirection);
    state.camera.lookAt(lookAtPoint);

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
        
        // Simple occlusion check for LCC models
        // Since LCC Gaussian Splatting models don't provide raycastable geometry,
        // we use a geometric approach based on the model's bounding box
        
        // Define model's approximate bounding box (based on Big Mirror model)
        // This should be adjusted based on actual model dimensions
        const modelMin = new THREE.Vector3(-8, 0, -4);
        const modelMax = new THREE.Vector3(8, 8, 4);
        
        // Check if marker is behind camera (in view space)
        const markerViewPos = marker.position.clone();
        markerViewPos.applyMatrix4(state.camera.matrixWorldInverse);
        
        if (markerViewPos.z > 0) {
            // Marker is behind camera
            marker.visible = false;
            return;
        }
        
        // Create ray from camera to marker
        const cameraPos = state.camera.position;
        const markerPos = marker.position;
        const rayDirection = new THREE.Vector3().subVectors(markerPos, cameraPos).normalize();
        
        // Check if ray intersects with model's bounding box
        const boundingBox = new THREE.Box3(modelMin, modelMax);
        const ray = new THREE.Ray(cameraPos, rayDirection);
        
        const intersectionPoint = new THREE.Vector3();
        const intersects = ray.intersectBox(boundingBox, intersectionPoint);
        
        if (intersects) {
            // Ray intersects bounding box - check if intersection is closer than marker
            const distanceToIntersection = cameraPos.distanceTo(intersectionPoint);
            const distanceToMarker = cameraPos.distanceTo(markerPos);
            
            // If intersection is closer than marker, marker is occluded
            if (distanceToIntersection < distanceToMarker - 0.5) { // 0.5 tolerance
                marker.visible = false;
                return;
            }
        }
        
        // Marker is visible
        marker.visible = true;
        marker.material.opacity = 0.9;
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

        // Load piping data
        const pipingResponse = await axios.get('/api/piping');
        state.piping = pipingResponse.data;
        renderPipingList(state.piping);
        createPipingVisualization(state.piping);

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
    list.innerHTML = equipment.map(eq => {
        const hasSavedView = state.savedCameraViews.some(v => v.equipmentId === eq.id);
        return `
        <div class="glass rounded p-3 hover:bg-white hover:bg-opacity-10 transition">
            <div class="flex items-center justify-between">
                <div class="flex items-center cursor-pointer flex-1" onclick="selectEquipment(${eq.id})">
                    <i class="fas fa-cog mr-2 status-${eq.status}"></i>
                    <span class="text-white text-sm font-medium">${eq.name}</span>
                    ${hasSavedView ? '<i class="fas fa-bookmark ml-2 text-blue-400 text-xs" title="保存済み画角あり"></i>' : ''}
                </div>
                <div class="flex items-center space-x-1">
                    ${hasSavedView ? `
                    <button onclick="clearEquipmentCameraView(${eq.id}); event.stopPropagation();" 
                            class="text-yellow-400 hover:text-yellow-300 p-1"
                            title="画角をクリア">
                        <i class="fas fa-bookmark-slash text-xs"></i>
                    </button>
                    ` : ''}
                    <button onclick="showEquipmentEditDialog(${eq.id}); event.stopPropagation();" 
                            class="text-blue-400 hover:text-blue-300 p-1">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                ${eq.type} | ${eq.last_maintenance || '未実施'}
            </div>
        </div>
        `;
    }).join('');
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
    
    // Update HUD stats (new fullscreen UI)
    if (window.updateHUDStats) {
        window.updateHUDStats(analytics);
    }
    
    // Update system metrics (legacy - now removed from new UI)
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

function createPipingVisualization(piping) {
    console.log('🔧 Creating piping visualization...');
    
    if (!piping || piping.length === 0) {
        console.warn('⚠️ No piping data to visualize');
        return;
    }
    
    // Clear existing piping lines
    state.pipingLines.forEach(line => {
        state.scene.remove(line);
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
    });
    state.pipingLines = [];
    
    piping.forEach(pipe => {
        // Create line from start to end point
        const start = new THREE.Vector3(
            parseFloat(pipe.start_x) || 0,
            parseFloat(pipe.start_y) || 0,
            parseFloat(pipe.start_z) || 0
        );
        const end = new THREE.Vector3(
            parseFloat(pipe.end_x) || 0,
            parseFloat(pipe.end_y) || 0,
            parseFloat(pipe.end_z) || 0
        );
        
        // Create tube geometry for pipe
        const direction = new THREE.Vector3().subVectors(end, start);
        const length = direction.length();
        const radius = (parseFloat(pipe.diameter) || 100) / 1000; // Convert mm to meters and use as radius
        
        // Create cylinder aligned with the pipe direction
        const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
        
        // Color based on pipe type and status
        let color = pipe.color || '#2563eb';
        if (pipe.status === 'warning') color = '#f59e0b';
        if (pipe.status === 'critical') color = '#ef4444';
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8,
            roughness: 0.4,
            metalness: 0.6
        });
        
        const pipeMesh = new THREE.Mesh(geometry, material);
        
        // Position and orient the cylinder
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        pipeMesh.position.copy(midpoint);
        
        // Orient cylinder to point from start to end
        pipeMesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );
        
        pipeMesh.userData = { pipingId: pipe.id, piping: pipe };
        pipeMesh.name = `piping-${pipe.id}`;
        
        state.scene.add(pipeMesh);
        state.pipingLines.push(pipeMesh);
    });
    
    console.log(`✅ Created ${piping.length} piping visualizations`);
}

function renderPipingList(piping) {
    const list = document.getElementById('piping-list');
    if (!list) return; // Element doesn't exist yet
    
    if (!piping || piping.length === 0) {
        list.innerHTML = '<div class="text-gray-400 text-sm text-center py-4">配管データがありません</div>';
        return;
    }
    
    list.innerHTML = piping.map(pipe => {
        const typeIcons = {
            supply: 'fa-arrow-right',
            return: 'fa-arrow-left',
            drain: 'fa-arrow-down',
            vent: 'fa-arrow-up',
            other: 'fa-grip-lines'
        };
        const icon = typeIcons[pipe.pipe_type] || typeIcons.other;
        
        return `
        <div class="glass rounded p-3 hover:bg-white hover:bg-opacity-10 transition">
            <div class="flex items-center justify-between">
                <div class="flex items-center cursor-pointer flex-1" onclick="selectPiping(${pipe.id})">
                    <i class="fas ${icon} mr-2 status-${pipe.status}"></i>
                    <span class="text-white text-sm font-medium">${pipe.name}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <button onclick="showPipingEditDialog(${pipe.id}); event.stopPropagation();" 
                            class="text-blue-400 hover:text-blue-300 p-1">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                ${pipe.pipe_type} | ${pipe.material || '材質不明'} | Ø${pipe.diameter || '?'}mm
            </div>
        </div>
        `;
    }).join('');
}

window.selectPiping = function(id) {
    const piping = state.piping.find(p => p.id === id);
    if (!piping) return;
    
    state.selectedPiping = piping;
    
    // Focus camera on piping midpoint
    const midpoint = new THREE.Vector3(
        (parseFloat(piping.start_x) + parseFloat(piping.end_x)) / 2,
        (parseFloat(piping.start_y) + parseFloat(piping.end_y)) / 2,
        (parseFloat(piping.start_z) + parseFloat(piping.end_z)) / 2
    );
    
    const offset = new THREE.Vector3(8, 5, 8);
    const targetPos = midpoint.clone().add(offset);
    
    // Smooth camera transition
    const startPos = state.camera.position.clone();
    let progress = 0;
    const duration = 1000;
    const startTime = Date.now();
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        state.camera.position.lerpVectors(startPos, targetPos, eased);
        
        if (progress === 1) {
            state.camera.lookAt(midpoint);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }
    animateCamera();
    
    showPipingPanel(piping);
}

function showPipingPanel(piping) {
    const panel = document.getElementById('selection-panel');
    const content = document.getElementById('selection-content');
    
    content.innerHTML = `
        <div class="space-y-3">
            <div>
                <div class="text-gray-400 text-xs">配管名</div>
                <div class="text-white font-semibold">${piping.name}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">種類</div>
                <div class="text-white text-sm">${piping.pipe_type}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">ステータス</div>
                <div class="status-${piping.status} font-semibold capitalize">${piping.status}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">材質</div>
                <div class="text-white">${piping.material || '不明'}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">口径</div>
                <div class="text-white">${piping.diameter || '?'} mm</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">次回点検予定</div>
                <div class="text-white">${piping.next_inspection || '未定'}</div>
            </div>
            ${piping.description ? `
            <div>
                <div class="text-gray-400 text-xs">説明</div>
                <div class="text-white text-sm">${piping.description}</div>
            </div>
            ` : ''}
            <div class="pt-2 border-t border-gray-600 space-y-2">
                <button class="w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition"
                        onclick="showPipingInspectionDialog(${piping.id})">
                    <i class="fas fa-clipboard-check mr-2"></i>点検記録
                </button>
            </div>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

window.showPipingEditDialog = function(id) {
    showNotification('配管編集機能は開発中です', 'info');
}

window.showPipingInspectionDialog = function(id) {
    showNotification('配管点検記録機能は開発中です', 'info');
}

window.togglePipingVisibility = function(checkbox) {
    state.pipingLines.forEach(line => {
        line.visible = checkbox.checked;
    });
}

// Control Functions
window.resetView = function() {
    state.camera.position.set(20, 15, 20);
    
    // Reset yaw and pitch to look at center
    const lookDir = new THREE.Vector3(0, 0, 0).sub(state.camera.position).normalize();
    state.cameraYaw = Math.atan2(lookDir.x, lookDir.z);
    state.cameraPitch = Math.asin(lookDir.y);
    
    showNotification('ホーム視点にリセットしました', 'info');
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
        
        // Check if there's a saved camera view for this equipment
        const savedView = getSavedViewForEquipment(id);
        
        let endPos, endYaw, endPitch;
        if (savedView) {
            // Use saved camera position and rotation (yaw/pitch)
            endPos = new THREE.Vector3(savedView.position.x, savedView.position.y, savedView.position.z);
            endYaw = savedView.yaw !== undefined ? savedView.yaw : state.cameraYaw;
            endPitch = savedView.pitch !== undefined ? savedView.pitch : state.cameraPitch;
        } else {
            // Use default offset
            const offset = new THREE.Vector3(8, 5, 8);
            endPos = targetPos.clone().add(offset);
            
            // Calculate yaw and pitch to look at marker
            const lookDir = new THREE.Vector3().subVectors(targetPos, endPos).normalize();
            endYaw = Math.atan2(lookDir.x, lookDir.z);
            endPitch = Math.asin(lookDir.y);
        }
        
        // Smooth camera transition
        const startPos = state.camera.position.clone();
        const startYaw = state.cameraYaw;
        const startPitch = state.cameraPitch;
        
        let progress = 0;
        const duration = 1000;
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            
            const eased = 1 - Math.pow(1 - progress, 3);
            
            state.camera.position.lerpVectors(startPos, endPos, eased);
            
            // Lerp yaw and pitch
            state.cameraYaw = startYaw + (endYaw - startYaw) * eased;
            state.cameraPitch = startPitch + (endPitch - startPitch) * eased;
            
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
            <div class="pt-2 border-t border-gray-600 space-y-2">
                <button class="w-full glass rounded px-4 py-2 text-blue-400 text-sm hover:bg-white hover:bg-opacity-20 transition"
                        onclick="saveEquipmentCameraView(${equipment.id})">
                    <i class="fas fa-bookmark mr-2"></i>現在の画角を保存
                </button>
                <button class="w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition"
                        onclick="createMaintenancePlan(${equipment.id})">
                    <i class="fas fa-wrench mr-2"></i>保守計画を作成
                </button>
            </div>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

// Camera View Management Functions (Equipment-specific)
window.saveEquipmentCameraView = function(equipmentId) {
    if (!state.camera) {
        showNotification('カメラが初期化されていません', 'error');
        return;
    }
    
    if (!state.selectedEquipment || state.selectedEquipment.id !== equipmentId) {
        showNotification('設備が選択されていません', 'error');
        return;
    }
    
    // Save camera position and rotation (yaw/pitch) for this equipment
    const cameraView = {
        equipmentId: equipmentId,
        position: {
            x: state.camera.position.x,
            y: state.camera.position.y,
            z: state.camera.position.z
        },
        yaw: state.cameraYaw,
        pitch: state.cameraPitch,
        timestamp: new Date().toISOString()
    };
    
    // Update or add to saved views
    const existingIndex = state.savedCameraViews.findIndex(v => v.equipmentId === equipmentId);
    if (existingIndex >= 0) {
        state.savedCameraViews[existingIndex] = cameraView;
    } else {
        state.savedCameraViews.push(cameraView);
    }
    
    // Save to localStorage
    try {
        localStorage.setItem('cmms_equipment_views', JSON.stringify(state.savedCameraViews));
        showNotification(`${state.selectedEquipment.name}の画角を保存しました`, 'success');
        updateEquipmentListIcons();
    } catch (error) {
        console.error('Failed to save camera view:', error);
        showNotification('画角の保存に失敗しました', 'error');
    }
}

window.clearEquipmentCameraView = function(equipmentId) {
    const equipment = state.equipment.find(eq => eq.id === equipmentId);
    if (!equipment) return;
    
    if (!confirm(`${equipment.name}の保存された画角を削除しますか?`)) return;
    
    state.savedCameraViews = state.savedCameraViews.filter(v => v.equipmentId !== equipmentId);
    
    // Update localStorage
    try {
        localStorage.setItem('cmms_equipment_views', JSON.stringify(state.savedCameraViews));
        showNotification(`${equipment.name}の画角を削除しました`, 'success');
        updateEquipmentListIcons();
    } catch (error) {
        console.error('Failed to delete camera view:', error);
        showNotification('画角の削除に失敗しました', 'error');
    }
}

function getSavedViewForEquipment(equipmentId) {
    return state.savedCameraViews.find(v => v.equipmentId === equipmentId);
}

function loadSavedViews() {
    try {
        const savedData = localStorage.getItem('cmms_equipment_views');
        if (savedData) {
            state.savedCameraViews = JSON.parse(savedData);
            
            // Convert old rotation format to yaw/pitch if needed
            state.savedCameraViews.forEach(view => {
                if (view.rotation && (view.yaw === undefined || view.pitch === undefined)) {
                    // Convert Euler rotation to yaw/pitch
                    const euler = new THREE.Euler(view.rotation.x, view.rotation.y, view.rotation.z);
                    const quaternion = new THREE.Quaternion().setFromEuler(euler);
                    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
                    
                    view.yaw = Math.atan2(direction.x, direction.z);
                    view.pitch = Math.asin(direction.y);
                    
                    // Remove old rotation data
                    delete view.rotation;
                }
            });
            
            // Save converted data back to localStorage
            localStorage.setItem('cmms_equipment_views', JSON.stringify(state.savedCameraViews));
            
            console.log(`📷 Loaded ${state.savedCameraViews.length} equipment camera views`);
            updateEquipmentListIcons();
        }
    } catch (error) {
        console.error('Failed to load saved camera views:', error);
    }
}

function updateEquipmentListIcons() {
    // Update equipment list to show which items have saved views
    if (state.equipment && state.equipment.length > 0) {
        renderEquipmentList(state.equipment);
    }
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

// Notification system
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    const bgColors = {
        success: 'rgba(16, 185, 129, 0.95)',
        error: 'rgba(239, 68, 68, 0.95)',
        warning: 'rgba(245, 158, 11, 0.95)',
        info: 'rgba(59, 130, 246, 0.95)'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    notification.style.cssText = `
        background: ${bgColors[type] || bgColors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
        backdrop-filter: blur(10px);
        min-width: 300px;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info} text-lg"></i>
        <span style="flex: 1;">${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            container.removeChild(notification);
            if (container.children.length === 0) {
                document.body.removeChild(container);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
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
