/**
 * Three.js Visualization for Etsy Analytics Dashboard
 * Creates an interactive 3D scatter plot visualization of the data
 */

class ThreeVisualization {
    constructor() {
        this.container = document.getElementById('threejs-container');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.points = [];
        this.pointMeshes = [];
        this.axisHelpers = [];
        this.data = null;
        this.initialized = false;
        this.axesLabels = {
            x: 'Total Views',
            y: 'Hearts',
            z: 'Price'
        };
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.cameraRotation = { x: 0, y: 0 };
        this.cameraDistance = 20;
    }

    /**
     * Initialize the Three.js scene
     */
    initialize() {
        if (this.initialized) return;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(15, 15, 15);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.container.appendChild(this.renderer.domElement);

        // Add simple controls (since OrbitControls might be causing issues)
        this.setupSimpleControls();

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1).normalize();
        this.scene.add(directionalLight);

        // Add grid and axes helpers
        this.addHelpers();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        this.initialized = true;
    }

    /**
     * Set up simple mouse controls as an alternative to OrbitControls
     */
    setupSimpleControls() {
        const canvas = this.renderer.domElement;

        // Mouse down event
        canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Mouse up event
        canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        // Mouse move event - rotate camera if mouse is down
        canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;

            const deltaX = e.clientX - this.mouseX;
            const deltaY = e.clientY - this.mouseY;

            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            this.cameraRotation.y += deltaX * 0.01;
            this.cameraRotation.x += deltaY * 0.01;

            // Limit vertical rotation
            this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

            this.updateCameraPosition();
        });

        // Scroll wheel event - zoom in/out
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 0.05;
            this.cameraDistance = Math.max(5, Math.min(50, this.cameraDistance));
            this.updateCameraPosition();
        });

        // Initial camera position
        this.cameraRotation = { x: 0.5, y: 0.5 };
        this.updateCameraPosition();
    }

    /**
     * Update camera position based on rotation and distance
     */
    updateCameraPosition() {
        const x = this.cameraDistance * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        const y = this.cameraDistance * Math.sin(this.cameraRotation.x);
        const z = this.cameraDistance * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Handle window resize events
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Add grid and axes helpers to the scene
     */
    addHelpers() {
        // Add a grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x666666, 0x444444);
        this.scene.add(gridHelper);

        // Add axes
        this.createAxes();
    }

    /**
     * Create axes with labels
     */
    createAxes() {
        // Clear previous axes
        this.axisHelpers.forEach(helper => this.scene.remove(helper));
        this.axisHelpers = [];

        // Create axes
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        this.axisHelpers.push(axesHelper);

        // X-axis label (red)
        this.addAxisLabel(this.axesLabels.x, new THREE.Vector3(11, 0, 0), 0xff0000);

        // Y-axis label (green)
        this.addAxisLabel(this.axesLabels.y, new THREE.Vector3(0, 11, 0), 0x00ff00);

        // Z-axis label (blue)
        this.addAxisLabel(this.axesLabels.z, new THREE.Vector3(0, 0, 11), 0x0000ff);
    }

    /**
     * Add text label for an axis
     * @param {string} text - The label text
     * @param {THREE.Vector3} position - The position of the label
     * @param {number} color - The color of the label (hex)
     */
    addAxisLabel(text, position, color) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 2; // For high DPI displays
        canvas.width = 128 * scale;
        canvas.height = 64 * scale;

        // Set text properties and draw
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, 64, 32);

        // Create texture and sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, color: color });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(3, 1.5, 1);

        this.scene.add(sprite);
        this.axisHelpers.push(sprite);
    }

    /**
     * Update the visualization with new data
     * @param {Object} data - The data object with processed listings
     * @param {Object} options - Options for axes and display
     */
    updateVisualization(data, options = {}) {
        if (!this.initialized) {
            this.initialize();
        }

        this.data = data;

        // Update axes labels
        this.axesLabels = {
            x: options.xAxis || 'Total Views',
            y: options.yAxis || 'Hearts',
            z: options.zAxis || 'Price'
        };

        // Update axes
        this.createAxes();

        // Remove existing points
        this.pointMeshes.forEach(mesh => this.scene.remove(mesh));
        this.pointMeshes = [];

        // Extract data values and normalize
        this.processDataForVisualization(data.listings, options);
    }

    /**
     * Process data for visualization
     * @param {Array} listings - The listings data
     * @param {Object} options - Options for axes and display
     */
    processDataForVisualization(listings, options) {
        // Determine which fields to use for axes
        const xField = options.xAxis || 'totalViews';
        const yField = options.yAxis || 'hearts';
        const zField = options.zAxis || 'price';
        const sizeField = options.sizeField || 'estSales';

        // Find min/max for normalization
        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;
        let zMin = Infinity, zMax = -Infinity;
        let sizeMin = Infinity, sizeMax = -Infinity;

        listings.forEach(item => {
            xMin = Math.min(xMin, item[xField] || 0);
            xMax = Math.max(xMax, item[xField] || 0);
            
            yMin = Math.min(yMin, item[yField] || 0);
            yMax = Math.max(yMax, item[yField] || 0);
            
            zMin = Math.min(zMin, item[zField] || 0);
            zMax = Math.max(zMax, item[zField] || 0);
            
            sizeMin = Math.min(sizeMin, item[sizeField] || 0);
            sizeMax = Math.max(sizeMax, item[sizeField] || 0);
        });

        // Ensure min/max are different to avoid division by zero
        if (xMin === xMax) xMax = xMin + 1;
        if (yMin === yMax) yMax = yMin + 1;
        if (zMin === zMax) zMax = zMin + 1;
        if (sizeMin === sizeMax) sizeMax = sizeMin + 1;

        // Create points
        listings.forEach(item => {
            // Normalize values to range [0, 10]
            const x = 10 * ((item[xField] || 0) - xMin) / (xMax - xMin);
            const y = 10 * ((item[yField] || 0) - yMin) / (yMax - yMin);
            const z = 10 * ((item[zField] || 0) - zMin) / (zMax - zMin);
            
            // Size based on sales or revenue, normalized to range [0.1, 1]
            const sizeValue = (item[sizeField] || 0);
            const size = 0.1 + 0.9 * ((sizeValue - sizeMin) / (sizeMax - sizeMin));
            
            // Create a sphere for each point
            this.createPoint(x, y, z, size, item);
        });
    }

    /**
     * Create a 3D point representation
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @param {number} size - Size factor
     * @param {Object} item - The original data item
     */
    createPoint(x, y, z, size, item) {
        // Create geometry and material
        const geometry = new THREE.SphereGeometry(0.1 + size * 0.4, 16, 16);
        
        // Color based on price range (blue to red)
        const priceMax = Math.max(...this.data.listings.map(i => i.price));
        const priceRatio = item.price / priceMax;
        const color = new THREE.Color();
        color.setRGB(0.5 + priceRatio * 0.5, 0.5 - priceRatio * 0.3, 1 - priceRatio * 0.8);
        
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 50,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        
        // Store original data with the mesh for tooltips/interaction
        mesh.userData = item;
        
        this.scene.add(mesh);
        this.pointMeshes.push(mesh);
    }
}
