// Advanced Digital Twin CMMS Viewer
// Using LCC SDK + Three.js for 3D Gaussian Splatting visualization

import * as THREE from '/static/engine/three/three.module.js';
import { OrbitControls } from '/static/engine/three/jsm/controls/OrbitControls.js';
import { FirstPersonControls } from '/static/engine/three/FirstPersonControls.js';
import { LCCRender } from '/sdk/lcc-0.5.3.js';

// Global state
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    lccObject: null,
    equipment: [],
    selectedEquipment: null,
    viewMode: 'orbit', // 'orbit' or 'firstPerson'
    measurementMode: false,
    sectionMode: false,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    clock: new THREE.Clock()
};

// Initialize the 3D viewer
async function initViewer() {
    const canvas = document.getElementById('viewer-canvas');
    const container = canvas.parentElement;

    // Setup Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0a0a0a);

    // Setup Camera
    state.camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
    );
    state.camera.position.set(20, 15, 20);

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

    // Setup Orbit Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.maxPolarAngle = Math.PI / 1.8;
    state.controls.minDistance = 5;
    state.controls.maxDistance = 200;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    state.scene.add(directionalLight);

    // Add hemisphere light for better ambient lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
    state.scene.add(hemiLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    gridHelper.name = 'gridHelper';
    state.scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.name = 'axesHelper';
    state.scene.add(axesHelper);

    // Model matrix for coordinate system transformation
    const modelMatrix = new THREE.Matrix4(
        -1, 0, 0, 0,
        0, 0, 1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
    );

    // Load LCC model (Big Mirror)
    console.log('Loading Big Mirror model...');
    updateLoadingProgress(10);

    try {
        state.lccObject = LCCRender.load({
            camera: state.camera,
            scene: state.scene,
            dataPath: `${location.origin}/models/BigMirror/meta.lcc`,
            renderLib: THREE,
            canvas: state.renderer.domElement,
            renderer: state.renderer,
            useEnv: true,
            useIndexDB: true,
            useLoadingEffect: true,
            modelMatrix: modelMatrix,
            appKey: 'digital-twin-cmms-2024'
        }, 
        (mesh) => {
            console.log('LCC model loaded successfully:', mesh);
            updateLoadingProgress(100);
            hideLoadingScreen();
            
            // Auto-focus on the model
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = state.camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5;
            
            state.camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.7);
            state.controls.target.copy(center);
            state.controls.update();
        }, 
        (percent) => {
            const progress = 10 + (percent * 80);
            updateLoadingProgress(progress);
            console.log('Loading progress:', progress.toFixed(1) + '%');
        }, 
        () => {
            console.error('Failed to load LCC model');
            alert('モデルの読み込みに失敗しました。ページをリロードしてください。');
        });

        window.lccObj = state.lccObject;
        window.LCCRender = LCCRender;
    } catch (error) {
        console.error('Error loading LCC model:', error);
    }

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    // Load CMMS data
    loadCMMSData();

    // Start animation loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (state.controls) {
        state.controls.update();
    }

    if (state.lccObject) {
        LCCRender.update();
    }

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
}

function onClick(event) {
    // Raycasting for object selection
    state.raycaster.setFromCamera(state.mouse, state.camera);
    
    // Check intersection with equipment markers
    // This would be expanded to select actual 3D objects in the scene
    console.log('Click detected at:', state.mouse);
}

// CMMS Data Loading
async function loadCMMSData() {
    try {
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

    } catch (error) {
        console.error('Error loading CMMS data:', error);
    }
}

function renderEquipmentList(equipment) {
    const list = document.getElementById('equipment-list');
    list.innerHTML = equipment.map(eq => `
        <div class="glass rounded p-3 cursor-pointer hover:bg-white hover:bg-opacity-10 transition" 
             onclick="selectEquipment(${eq.id})">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas fa-cog mr-2 status-${eq.status}"></i>
                    <span class="text-white text-sm font-medium">${eq.name}</span>
                </div>
                <i class="fas fa-chevron-right text-gray-400 text-xs"></i>
            </div>
            <div class="text-xs text-gray-400 mt-1">
                最終保守: ${eq.lastMaintenance}
            </div>
        </div>
    `).join('');
}

function renderMaintenanceList(maintenance) {
    const list = document.getElementById('maintenance-list');
    list.innerHTML = maintenance.map(m => {
        const statusColors = {
            'scheduled': 'blue',
            'in-progress': 'yellow',
            'urgent': 'red'
        };
        const color = statusColors[m.status] || 'gray';
        
        return `
            <div class="glass rounded p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-${color}-400 text-xs font-semibold uppercase">${m.type}</span>
                    <span class="text-xs text-gray-400">${m.scheduledDate}</span>
                </div>
                <div class="text-white text-sm">Equipment ID: ${m.equipmentId}</div>
            </div>
        `;
    }).join('');
}

function renderWorkOrdersList(workOrders) {
    const list = document.getElementById('workorder-list');
    list.innerHTML = workOrders.map(wo => {
        const priorityColors = {
            'high': 'red',
            'medium': 'yellow',
            'low': 'green'
        };
        const color = priorityColors[wo.priority] || 'gray';
        
        return `
            <div class="glass rounded p-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white text-sm font-medium">${wo.title}</span>
                    <span class="px-2 py-1 rounded text-xs bg-${color}-500 bg-opacity-20 text-${color}-400">
                        ${wo.priority}
                    </span>
                </div>
                <div class="text-xs text-gray-400">担当: ${wo.assignedTo}</div>
                <div class="text-xs text-gray-400">期限: ${wo.dueDate}</div>
            </div>
        `;
    }).join('');
}

function updateAnalyticsDashboard(analytics) {
    document.getElementById('uptime-display').textContent = analytics.uptime + '%';
}

function createEquipmentMarkers(equipment) {
    // Create 3D markers for equipment locations
    equipment.forEach(eq => {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: eq.status === 'operational' ? 0x10b981 : 
                   eq.status === 'warning' ? 0xf59e0b : 0xef4444,
            transparent: true,
            opacity: 0.8
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(eq.location.x, eq.location.y, eq.location.z);
        marker.userData = { equipmentId: eq.id, equipment: eq };
        marker.name = `equipment-marker-${eq.id}`;
        
        state.scene.add(marker);

        // Add pulsing animation
        marker.userData.animate = (time) => {
            marker.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
        };
    });
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
        
        state.camera.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.5, center.z + cameraZ * 0.7);
        state.controls.target.copy(center);
        state.controls.update();
    }
}

window.toggleViewMode = function() {
    state.viewMode = state.viewMode === 'orbit' ? 'firstPerson' : 'orbit';
    console.log('View mode:', state.viewMode);
    // Implement view mode switching logic
}

window.toggleMeasure = function() {
    state.measurementMode = !state.measurementMode;
    console.log('Measurement mode:', state.measurementMode);
    // Implement measurement tools
}

window.toggleSection = function() {
    state.sectionMode = !state.sectionMode;
    console.log('Section mode:', state.sectionMode);
    // Implement section clipping
}

window.takeScreenshot = function() {
    state.renderer.render(state.scene, state.camera);
    const dataURL = state.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `digital-twin-cmms-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

window.toggleEquipmentMarkers = function(checkbox) {
    state.scene.traverse((obj) => {
        if (obj.name && obj.name.startsWith('equipment-marker-')) {
            obj.visible = checkbox.checked;
        }
    });
}

window.toggleGrid = function(checkbox) {
    const grid = state.scene.getObjectByName('gridHelper');
    if (grid) grid.visible = checkbox.checked;
}

window.toggleEnvironment = function(checkbox) {
    // Toggle environment map rendering
    console.log('Environment toggle:', checkbox.checked);
}

window.updatePointDensity = function(value) {
    console.log('Point density:', value);
    // Update LCC rendering density if API available
}

window.selectEquipment = function(id) {
    const equipment = state.equipment.find(eq => eq.id === id);
    if (!equipment) return;
    
    state.selectedEquipment = equipment;
    
    // Focus camera on equipment
    const marker = state.scene.getObjectByName(`equipment-marker-${id}`);
    if (marker) {
        const targetPos = marker.position.clone();
        const offset = new THREE.Vector3(5, 3, 5);
        state.camera.position.copy(targetPos.clone().add(offset));
        state.controls.target.copy(targetPos);
        state.controls.update();
    }
    
    // Show selection panel
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
                <div class="text-gray-400 text-xs">ステータス</div>
                <div class="status-${equipment.status} font-semibold capitalize">${equipment.status}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">最終保守日</div>
                <div class="text-white">${equipment.lastMaintenance}</div>
            </div>
            <div>
                <div class="text-gray-400 text-xs">位置</div>
                <div class="text-white text-sm">X: ${equipment.location.x}, Y: ${equipment.location.y}, Z: ${equipment.location.z}</div>
            </div>
            <div class="pt-2 border-t border-gray-600">
                <button class="w-full glass rounded px-4 py-2 text-white text-sm hover:bg-white hover:bg-opacity-20 transition">
                    <i class="fas fa-wrench mr-2"></i>保守計画を作成
                </button>
            </div>
        </div>
    `;
    
    panel.classList.remove('hidden');
}

window.closeSelection = function() {
    document.getElementById('selection-panel').classList.add('hidden');
    state.selectedEquipment = null;
}

// Loading screen functions
function updateLoadingProgress(percent) {
    const progressEl = document.getElementById('loading-progress');
    if (progressEl) {
        progressEl.textContent = Math.round(percent) + '%';
    }
}

function hideLoadingScreen() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 500);
}

// Initialize viewer on page load
window.addEventListener('DOMContentLoaded', initViewer);

// Expose state for debugging
window.viewerState = state;
window.THREE = THREE;

console.log('Digital Twin CMMS Viewer initialized');
