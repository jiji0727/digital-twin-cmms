// Advanced Digital Twin CMMS Viewer - Simplified approach
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log('🚀 Digital Twin CMMS Viewer starting...');

// Global state
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    equipment: [],
    selectedEquipment: null,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    markers: []
};

// Initialize the 3D viewer - WITHOUT LCC SDK for now
async function initViewer() {
    console.log('Initializing 3D viewer...');
    updateLoadingProgress(10);
    
    const canvas = document.getElementById('viewer-canvas');
    const container = canvas.parentElement;

    // Setup Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0a0a0a);
    updateLoadingProgress(20);

    // Setup Camera
    state.camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
    );
    state.camera.position.set(30, 20, 30);
    state.camera.lookAt(0, 0, 0);
    updateLoadingProgress(30);

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
    updateLoadingProgress(40);

    // Setup Orbit Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.maxPolarAngle = Math.PI / 1.8;
    state.controls.minDistance = 5;
    state.controls.maxDistance = 200;
    updateLoadingProgress(50);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    state.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
    state.scene.add(hemiLight);
    updateLoadingProgress(60);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    gridHelper.name = 'gridHelper';
    state.scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.name = 'axesHelper';
    state.scene.add(axesHelper);
    updateLoadingProgress(70);

    // Create demo 3D building structure
    createDemoBuilding();
    updateLoadingProgress(85);

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    updateLoadingProgress(90);

    // Load CMMS data
    await loadCMMSData();
    updateLoadingProgress(95);

    // Start animation loop
    animate();
    updateLoadingProgress(100);
    
    setTimeout(() => {
        hideLoadingScreen();
        console.log('✅ Viewer initialized successfully');
    }, 500);
}

// Create a demo building structure
function createDemoBuilding() {
    console.log('Creating demo building...');
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    state.scene.add(ground);

    // Main building
    const buildingGeometry = new THREE.BoxGeometry(20, 15, 15);
    const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2c3e50,
        roughness: 0.7,
        metalness: 0.3
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(0, 7.5, 0);
    building.castShadow = true;
    building.receiveShadow = true;
    state.scene.add(building);

    // Windows
    for (let i = -2; i <= 2; i++) {
        for (let j = 1; j <= 2; j++) {
            const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb,
                emissive: 0x87ceeb,
                emissiveIntensity: 0.3
            });
            const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
            window1.position.set(i * 4, j * 5, 7.51);
            state.scene.add(window1);
        }
    }

    // Roof
    const roofGeometry = new THREE.ConeGeometry(12, 5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b4513,
        roughness: 0.9
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 17.5, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    state.scene.add(roof);

    console.log('Demo building created');
}

function animate() {
    requestAnimationFrame(animate);

    if (state.controls) {
        state.controls.update();
    }

    // Animate equipment markers
    const time = Date.now() * 0.001;
    state.markers.forEach(marker => {
        marker.scale.setScalar(1 + Math.sin(time * 2 + marker.position.x) * 0.1);
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
}

function onClick(event) {
    state.raycaster.setFromCamera(state.mouse, state.camera);
    
    const intersects = state.raycaster.intersectObjects(state.markers);
    if (intersects.length > 0) {
        const marker = intersects[0].object;
        if (marker.userData.equipmentId) {
            window.selectEquipment(marker.userData.equipmentId);
        }
    }
}

// CMMS Data Loading
async function loadCMMSData() {
    try {
        console.log('Loading CMMS data...');
        
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
        
        console.log('✅ CMMS data loaded');
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
    console.log('Creating equipment markers...');
    
    equipment.forEach(eq => {
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: eq.status === 'operational' ? 0x10b981 : 
                   eq.status === 'warning' ? 0xf59e0b : 0xef4444,
            emissive: eq.status === 'operational' ? 0x10b981 : 
                      eq.status === 'warning' ? 0xf59e0b : 0xef4444,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(eq.location.x, eq.location.y, eq.location.z);
        marker.userData = { equipmentId: eq.id, equipment: eq };
        marker.name = `equipment-marker-${eq.id}`;
        marker.castShadow = true;
        
        state.scene.add(marker);
        state.markers.push(marker);
    });
    
    console.log(`Created ${equipment.length} equipment markers`);
}

// Control Functions
window.resetView = function() {
    state.camera.position.set(30, 20, 30);
    state.camera.lookAt(0, 0, 0);
    state.controls.target.set(0, 0, 0);
    state.controls.update();
}

window.toggleViewMode = function() {
    console.log('View mode toggle');
}

window.toggleMeasure = function() {
    console.log('Measurement mode toggle');
}

window.toggleSection = function() {
    console.log('Section mode toggle');
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
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            
            // Easing function
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

console.log('✅ Digital Twin CMMS Viewer module loaded');
