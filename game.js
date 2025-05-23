class CosmicCollectionStation {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Initialize all modules
        this.renderer = new Renderer(this.canvas, this.ctx);
        this.stationManager = new StationManager();
        this.resourceManager = new ResourceManager();
        this.ui = new UIManager();
        
        // Make UI globally accessible for notifications
        window.game = this;
        
        // Game state
        this.gameState = 'mining'; // 'mining' or 'station'
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Ship properties
        this.ship = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            angle: 0,
            vx: 0,
            vy: 0,
            fuel: 100,
            maxFuel: 100,
            cargo: [],
            maxCargo: 6,
            size: 8
        };
        
        // Mining laser
        this.laser = {
            active: false,
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            power: 1
        };
        
        // Game objects
        this.asteroids = [];
        this.particles = [];
        this.resources = [];
        
        // Scanner
        this.scanner = {
            active: false,
            radius: 0,
            maxRadius: 200,
            pulseTime: 0,
            speed: 8
        };
        
        // Auto-mining system
        this.autoMining = {
            enabled: true, // Default to enabled
            target: null,
            searchRadius: 180, // Increased range for better experience
            targetIndicator: { visible: false, x: 0, y: 0 }
        };
        
        // Resources and progression
        this.totalResources = this.loadTotalResources();
        
        // Station system - use stationManager for grid loading
        this.station = {
            grid: this.stationManager.loadStationGrid(),
            size: 1,
            tier: 1,
            selectedModule: null
        };
        
        // Calculate station stats after object is created
        this.station.size = this.stationManager.calculateStationSize(this.station.grid);
        this.station.tier = this.stationManager.calculateStationTier(this.station.grid);
        
        // Use stationManager modules
        this.modules = this.stationManager.modules;
        
        this.expedition = {
            currentField: 1,
            maxFields: 5,
            fieldsCleared: 0,
            returnToStation: false
        };
        
        this.artifacts = []; // Discovered artifacts in current field
        this.discoveredArtifacts = this.resourceManager.loadDiscoveredArtifacts(); // Global collection
        
        this.generateAsteroids();
        this.setupEventListeners();
        this.setupStationUI();
        this.stationManager.loadModuleStates();
        this.stationManager.updateShipCapabilities(this);
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
        this.gameLoop();
        
        // Initialize title sequence with enhanced UI
        this.ui.initializeTitleSequence(this.autoMining.enabled);
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    loadTotalResources() {
        try {
            const saved = localStorage.getItem('totalResources');
            const parsed = parseInt(saved || '0');
            return isNaN(parsed) ? 0 : Math.max(0, parsed);
        } catch (e) {
            console.warn('Failed to load total resources:', e);
            return 0;
        }
    }
    
    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameState === 'mining') {
                    this.activateScanner();
                }
            }
            
            if (e.key.toLowerCase() === 'r' && this.gameState === 'mining') {
                this.returnToStation();
            }
            
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleView();
            }
            
            if (e.key.toLowerCase() === 'x' && this.gameState === 'mining') {
                this.toggleAutoMining();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse for mining (when auto-mining disabled)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === 'mining' && !this.autoMining.enabled) {
                this.mouse.down = true;
                this.startMining();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
            this.stopMining();
        });
        
        // Resize
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    toggleView() {
        if (this.gameState === 'mining') {
            this.gameState = 'station';
            this.ui.switchToStationUI();
            this.stationManager.updateStationDisplay(this.totalResources, this.station);
        } else {
            // Starting a new expedition from station
            const launchCost = 8; // Reduced from 20, more accessible
            if (this.ship.fuel >= launchCost) {
                this.expedition = {
                    currentField: 1,
                    maxFields: 5,
                    fieldsCleared: 0,
                    returnToStation: false
                };
                
                this.gameState = 'mining';
                this.generateAsteroids();
                this.ship.x = this.canvas.width / 2;
                this.ship.y = this.canvas.height / 2;
                this.consumeFuel(launchCost);
                
                this.ui.switchToMiningUI();
                
                // Show auto-mining indicator
                if (this.autoMining.enabled) {
                    document.getElementById('autoMiningIndicator').style.display = 'block';
                }
            } else {
                this.ui.showInsufficientFuel(launchCost);
            }
        }
    }
    
    setupStationUI() {
        this.stationManager.createStationGrid(this.station.grid, this);
        this.stationManager.populateModuleList(this.totalResources, this.station.grid);
    }
    
    generateAsteroids() {
        this.asteroids = this.resourceManager.generateFieldAsteroids(
            this.expedition.currentField, 
            this.canvas.width, 
            this.canvas.height
        );
        this.artifacts = []; // Clear current field artifacts
        
        // Generate artifacts using ResourceManager
        if (this.resourceManager.shouldSpawnArtifact(this.expedition.currentField)) {
            this.spawnArtifact();
        }
    }
    
    spawnArtifact() {
        const artifact = this.resourceManager.generateArtifact(this.expedition.currentField);
        this.artifacts.push(artifact);
    }
    
    loadDiscoveredArtifacts() {
        return this.resourceManager.loadDiscoveredArtifacts();
    }
    
    saveDiscoveredArtifacts() {
        this.resourceManager.saveDiscoveredArtifacts(this.discoveredArtifacts);
    }
    
    updateShip() {
        if (this.gameState !== 'mining') return;
        
        // Auto-mining: find nearest asteroid
        if (this.autoMining.enabled) {
            let nearestAsteroid = null;
            let nearestDistance = this.autoMining.searchRadius;
            
            this.asteroids.forEach(asteroid => {
                const distance = Math.sqrt(
                    (asteroid.x - this.ship.x) ** 2 + 
                    (asteroid.y - this.ship.y) ** 2
                );
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestAsteroid = asteroid;
                }
            });
            
            this.autoMining.target = nearestAsteroid;
            
            // Update target indicator
            if (nearestAsteroid) {
                this.autoMining.targetIndicator.visible = true;
                this.autoMining.targetIndicator.x = nearestAsteroid.x;
                this.autoMining.targetIndicator.y = nearestAsteroid.y;
                
                // Auto-rotate toward target with smooth interpolation
                const targetAngle = Math.atan2(
                    nearestAsteroid.y - this.ship.y, 
                    nearestAsteroid.x - this.ship.x
                );
                
                // Smooth rotation
                let angleDiff = targetAngle - this.ship.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                this.ship.angle += angleDiff * 0.1; // Smooth rotation
                
                // Auto-mine if in range with improved range
                const miningRange = 140; // Increased mining range
                if (nearestDistance < miningRange && this.ship.fuel > 0) {
                    this.laser.active = true;
                    this.laser.x = this.ship.x;
                    this.laser.y = this.ship.y;
                    this.laser.targetX = nearestAsteroid.x;
                    this.laser.targetY = nearestAsteroid.y;
                } else {
                    this.laser.active = false;
                }
            } else {
                this.laser.active = false;
                this.autoMining.targetIndicator.visible = false;
            }
        } else {
            // Manual mode: update ship angle to point towards mouse
            this.ship.angle = Math.atan2(this.mouse.y - this.ship.y, this.mouse.x - this.ship.x);
            this.autoMining.targetIndicator.visible = false;
        }
        
        // Ship movement (same for both modes)
        const acceleration = 0.3;
        const friction = 0.95;
        const maxSpeed = 4;
        
        // Reduced fuel consumption for movement (more exploration-friendly)
        if (this.keys['w'] || this.keys['arrowup']) {
            this.ship.vy -= acceleration;
            this.consumeFuel(0.05);
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.ship.vy += acceleration;
            this.consumeFuel(0.05);
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.ship.vx -= acceleration;
            this.consumeFuel(0.05);
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.ship.vx += acceleration;
            this.consumeFuel(0.05);
        }
        
        // Apply friction
        this.ship.vx *= friction;
        this.ship.vy *= friction;
        
        // Limit speed
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        if (speed > maxSpeed) {
            this.ship.vx = (this.ship.vx / speed) * maxSpeed;
            this.ship.vy = (this.ship.vy / speed) * maxSpeed;
        }
        
        // Update position
        this.ship.x += this.ship.vx;
        this.ship.y += this.ship.vy;
        
        // Screen wrapping
        if (this.ship.x < 0) this.ship.x = this.canvas.width;
        if (this.ship.x > this.canvas.width) this.ship.x = 0;
        if (this.ship.y < 0) this.ship.y = this.canvas.height;
        if (this.ship.y > this.canvas.height) this.ship.y = 0;
    }
    
    startMining() {
        if (this.ship.fuel <= 0) return;
        
        this.laser.active = true;
        this.laser.x = this.ship.x;
        this.laser.y = this.ship.y;
        this.laser.targetX = this.mouse.x;
        this.laser.targetY = this.mouse.y;
    }
    
    stopMining() {
        this.laser.active = false;
    }
    
    updateMining() {
        if (!this.laser.active || this.gameState !== 'mining') return;
        
        this.consumeFuel(0.2);
        
        // Check laser collision with asteroids
        this.asteroids.forEach((asteroid, index) => {
            const dist = this.distanceToLineSegment(
                asteroid.x, asteroid.y,
                this.laser.x, this.laser.y,
                this.laser.targetX, this.laser.targetY
            );
            
            if (dist < asteroid.size) {
                asteroid.health -= this.laser.power;
                
                // Create mining particles
                this.createMiningParticles(asteroid.x, asteroid.y, asteroid.type);
                
                if (asteroid.health <= 0) {
                    this.destroyAsteroid(asteroid, index);
                }
            }
        });

        // Check if all asteroids are cleared
        if (this.asteroids.length === 0 && !this.expedition.returnToStation) {
            this.expedition.fieldsCleared++;
            
            if (this.expedition.currentField < this.expedition.maxFields) {
                // Show field cleared message using UIManager
                setTimeout(async () => {
                    const travelCost = 5 + this.expedition.currentField * 2; // Escalating cost: 7, 9, 11, 13
                    const fuelRemaining = this.ship.fuel - travelCost;
                    
                    const shouldContinue = await this.ui.showFieldComplete(
                        this.expedition.currentField, 
                        this.expedition.maxFields, 
                        travelCost, 
                        fuelRemaining
                    );
                    
                    if (shouldContinue && this.ship.fuel >= travelCost) {
                        this.expedition.currentField++;
                        this.generateAsteroids();
                        this.consumeFuel(travelCost);
                        this.ui.showNotification(`🚀 Entering Field ${this.expedition.currentField}`, 'info', 3000);
                    } else {
                        this.expedition.returnToStation = true;
                        this.dockAtStation();
                    }
                }, 1000);
            } else {
                // Reached max depth using UIManager
                setTimeout(async () => {
                    await this.ui.showExpeditionComplete();
                    this.expedition.returnToStation = true;
                    this.dockAtStation();
                }, 1000);
            }
        }
    }
    
    destroyAsteroid(asteroid, index) {
        // Create explosion particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: asteroid.x + (Math.random() - 0.5) * asteroid.size,
                y: asteroid.y + (Math.random() - 0.5) * asteroid.size,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1,
                decay: 0.02,
                size: 2 + Math.random() * 4,
                color: asteroid.type === 'rare' ? '#ff6b9d' : '#61dafb'
            });
        }
        
        // Create resources using ResourceManager
        const newResources = this.resourceManager.createResource(asteroid.x, asteroid.y, asteroid.type, asteroid.resources);
        this.resources.push(...newResources);
        
        this.asteroids.splice(index, 1);
    }
    
    createMiningParticles(x, y, type) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 0.5,
                decay: 0.02,
                size: 1 + Math.random() * 2,
                color: type === 'rare' ? '#ff6b9d' : '#61dafb'
            });
        }
    }
    
    updateResources() {
        // Use ResourceManager for magnetism and collection
        this.resourceManager.updateResourceMagnetism(this.resources, this.ship);
        
        // Collect nearby artifacts using ResourceManager
        this.artifacts.forEach((artifact, index) => {
            if (artifact.discovered) {
                const distance = Math.sqrt(
                    (artifact.x - this.ship.x) ** 2 + 
                    (artifact.y - this.ship.y) ** 2
                );
                
                if (distance < 40) {
                    // Add to global collection
                    this.discoveredArtifacts.push({
                        ...artifact,
                        discoveredAt: Date.now()
                    });
                    this.resourceManager.saveDiscoveredArtifacts(this.discoveredArtifacts);
                    
                    // Add research value to resources
                    this.totalResources += artifact.value;
                    
                    // Remove from current field
                    this.artifacts.splice(index, 1);
                    
                    // Particle effect and notification
                    this.createParticles(artifact.x, artifact.y, '#FFD700', 15);
                    this.ui.showNotification(`✨ Collected ${artifact.rarity} artifact: ${artifact.name} (+${artifact.value} research)`, 'success', 4000);
                    
                    console.log(`Collected artifact: ${artifact.name} (+${artifact.value} research)`);
                }
            }
        });
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 0.8,
                decay: 0.02,
                size: 2 + Math.random() * 3,
                color: color
            });
        }
    }
    
    activateScanner() {
        if (this.scanner.active) return;
        
        this.scanner.active = true;
        this.scanner.radius = 0;
        this.scanner.pulseTime = 1;
        this.consumeFuel(3); // Reduced from 5 - scanner should be more accessible
    }
    
    updateScanner() {
        if (this.scanner.active) {
            this.scanner.radius += this.scanner.speed;
            this.scanner.pulseTime -= 0.02;
            
            if (this.scanner.pulseTime <= 0) {
                this.scanner.active = false;
            }
            
            // Use ResourceManager for artifact discoveries
            const discoveries = this.resourceManager.discoverArtifacts(this.artifacts, this.ship, this.scanner.radius);
            
            // Show enhanced discovery messages
            discoveries.forEach(artifact => {
                this.createParticles(artifact.x, artifact.y, '#FFD700', 10);
                this.ui.showArtifactDiscovery(artifact);
            });
        }
    }
    
    returnToStation() {
        // Process cargo using ResourceManager
        const resourceValue = this.resourceManager.processCargoAtStation(this.ship);
        this.totalResources += resourceValue;
        
        // Refuel
        this.ship.fuel = this.ship.maxFuel;
        
        // Generate new field
        this.generateAsteroids();
        
        // Save progress
        localStorage.setItem('totalResources', this.totalResources.toString());
        
        // Update station display and show notification
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
        this.ui.showNotification(`⛽ Station docked! +${resourceValue} resources collected`, 'success');
    }
    
    consumeFuel(amount) {
        this.ship.fuel = Math.max(0, this.ship.fuel - amount);
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.size *= 0.99;
            
            if (particle.life <= 0 || particle.size < 0.1) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projection = { x: x1 + t * dx, y: y1 + t * dy };
        
        return Math.sqrt((px - projection.x) * (px - projection.x) + (py - projection.y) * (py - projection.y));
    }
    
    render() {
        if (this.gameState === 'mining') {
            this.renderer.renderMining(this);
        } else {
            this.renderer.renderStation(this);
        }
        
        // Use UIManager for UI updates
        this.ui.updateGameUI(this);
    }
    
    update() {
        this.updateShip();
        this.updateMining();
        this.updateResources();
        this.updateScanner();
        this.updateParticles();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    dockAtStation() {
        // Transfer cargo to station storage using ResourceManager
        const resourceValue = this.resourceManager.processCargoAtStation(this.ship);
        this.totalResources += resourceValue;
        
        // Auto-refuel at station
        this.ship.fuel = this.ship.maxFuel;
        
        // Switch to station view
        this.gameState = 'station';
        this.ui.switchToStationUI();
        this.ui.showStationDocked(resourceValue);
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
        
        // Generate new field for next expedition
        this.generateAsteroids();
        
        // Save progress
        try {
            localStorage.setItem('totalResources', this.totalResources.toString());
        } catch (e) {
            console.warn('Failed to save resources:', e);
        }
    }
    
    // Use UIManager for all modal operations
    showModal(title, message, buttons) {
        return this.ui.showModal(title, message, buttons);
    }
    
    hideModal() {
        this.ui.hideModal();
    }
    
    showAlert(title, message) {
        return this.ui.showAlert(title, message);
    }
    
    showConfirm(title, message) {
        return this.ui.showConfirm(title, message);
    }
    
    toggleAutoMining() {
        this.autoMining.enabled = !this.autoMining.enabled;
        this.autoMining.target = null;
        this.autoMining.targetIndicator.visible = false;
        
        // Use UIManager for auto-mining UI updates
        this.ui.updateAutoMiningUI(this.autoMining.enabled);
        
        if (!this.autoMining.enabled) {
            this.stopMining();
        }
        
        // Show notification about the change
        const status = this.autoMining.enabled ? 'enabled' : 'disabled';
        this.ui.showNotification(`🤖 Auto-mining ${status}`, 'info', 2000);
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new CosmicCollectionStation();
}); 