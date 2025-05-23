class CosmicCollectionStation {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
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
        
        // Modal system
        this.modalCallback = null;
        
        // Resources and progression
        this.totalResources = this.loadTotalResources();
        
        // Station system
        this.station = {
            grid: this.loadStationGrid(),
            size: 1, // Will calculate after initialization
            tier: 1, // Will calculate after initialization
            selectedModule: null
        };
        
        // Calculate station stats after object is created
        this.station.size = this.calculateStationSize();
        this.station.tier = this.calculateStationTier();
        
        this.modules = {
            command: { name: 'Command Pod', icon: '🏠', cost: 0, unlocked: true, built: true },
            storage: { name: 'Storage Bay', icon: '📦', cost: 8, unlocked: true, built: false },
            research: { name: 'Research Lab', icon: '🔬', cost: 12, unlocked: true, built: false },
            workshop: { name: 'Workshop', icon: '🔧', cost: 20, unlocked: false, built: false },
            greenhouse: { name: 'Greenhouse', icon: '🌱', cost: 30, unlocked: false, built: false },
            observatory: { name: 'Observatory', icon: '🔭', cost: 35, unlocked: false, built: false },
            quarters: { name: 'Guest Quarters', icon: '🛏️', cost: 45, unlocked: false, built: false },
            vault: { name: 'Master Vault', icon: '💎', cost: 80, unlocked: false, built: false }
        };
        
        this.expedition = {
            currentField: 1,
            maxFields: 5,
            fieldsCleared: 0,
            returnToStation: false
        };
        
        this.artifacts = []; // Discovered artifacts in current field
        this.discoveredArtifacts = this.loadDiscoveredArtifacts(); // Global collection
        
        this.generateAsteroids();
        this.setupEventListeners();
        this.setupStationUI();
        this.loadModuleStates();
        this.updateShipCapabilities();
        this.updateStationDisplay();
        this.gameLoop();
        
        // Hide title after animation
        setTimeout(() => {
            document.getElementById('gameTitle').style.display = 'none';
            // Show auto-mining indicator by default
            if (this.autoMining.enabled) {
                document.getElementById('autoMiningIndicator').style.display = 'block';
            }
        }, 3000);
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
    
    loadStationGrid() {
        const saved = localStorage.getItem('stationGrid');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load saved station grid:', e);
            }
        }
        
        // Initialize with command pod at center
        const grid = {};
        grid['2,2'] = 'command';
        return grid;
    }
    
    saveStationGrid() {
        try {
            localStorage.setItem('stationGrid', JSON.stringify(this.station.grid));
        } catch (e) {
            console.warn('Failed to save station grid:', e);
        }
    }
    
    calculateStationSize() {
        if (!this.station || !this.station.grid || Object.keys(this.station.grid).length === 0) return 1;
        
        let minX = 2, maxX = 2, minY = 2, maxY = 2;
        Object.keys(this.station.grid).forEach(pos => {
            const [x, y] = pos.split(',').map(Number);
            if (!isNaN(x) && !isNaN(y)) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        });
        
        return Math.max(maxX - minX + 1, maxY - minY + 1);
    }
    
    calculateStationTier() {
        if (!this.station || !this.station.grid) return 1;
        
        const builtCount = Object.keys(this.station.grid).length;
        if (builtCount >= 25) return 5;
        if (builtCount >= 16) return 4;
        if (builtCount >= 9) return 3;
        if (builtCount >= 4) return 2;
        return 1;
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
            document.getElementById('miningUI').style.display = 'none';
            document.getElementById('miningControls').style.display = 'none';
            document.getElementById('stationUI').style.display = 'block';
            document.getElementById('stationControls').style.display = 'block';
            document.getElementById('stationGrid').style.display = 'block';
            document.getElementById('viewIndicator').textContent = '🏗️ Station Builder';
            document.getElementById('autoMiningIndicator').style.display = 'none';
            this.updateStationDisplay();
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
                
                document.getElementById('miningUI').style.display = 'block';
                document.getElementById('miningControls').style.display = 'block';
                document.getElementById('stationUI').style.display = 'none';
                document.getElementById('stationControls').style.display = 'none';
                document.getElementById('stationGrid').style.display = 'none';
                document.getElementById('viewIndicator').textContent = '🚀 Mining Expedition - Field 1/5';
                
                // Show auto-mining indicator
                if (this.autoMining.enabled) {
                    document.getElementById('autoMiningIndicator').style.display = 'block';
                }
            } else {
                this.showAlert('Insufficient Fuel', `❌ Not enough fuel for expedition!\nNeed ${launchCost} fuel to launch.`);
            }
        }
    }
    
    setupStationUI() {
        this.createStationGrid();
        this.populateModuleList();
    }
    
    createStationGrid() {
        const gridContainer = document.getElementById('stationGrid');
        gridContainer.innerHTML = '';
        
        // Create 5x5 grid
        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.dataset.pos = `${x},${y}`;
                
                // Check if this position has a module
                const moduleType = this.station.grid[`${x},${y}`];
                if (moduleType) {
                    cell.classList.add('built');
                    const module = this.modules[moduleType];
                    if (module) {
                        cell.innerHTML = `
                            <div class="module-icon">${module.icon}</div>
                            <div class="module-name">${module.name}</div>
                        `;
                    }
                } else if (this.canBuildAt(x, y)) {
                    cell.classList.add('available');
                } else {
                    cell.classList.add('unavailable');
                }
                
                cell.addEventListener('click', () => this.handleGridClick(x, y));
                gridContainer.appendChild(cell);
            }
            gridContainer.appendChild(document.createElement('br'));
        }
    }
    
    populateModuleList() {
        const moduleList = document.getElementById('moduleList');
        moduleList.innerHTML = '';
        
        Object.entries(this.modules).forEach(([key, module]) => {
            if (!module.unlocked) return;
            
            const item = document.createElement('div');
            item.className = 'module-item';
            
            const canAfford = this.totalResources >= module.cost;
            const alreadyBuilt = module.built || Object.values(this.station.grid).includes(key);
            
            if (!canAfford || alreadyBuilt) {
                item.classList.add('unavailable');
            }
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${module.icon} ${module.name}</span>
                    <span style="color: ${canAfford ? '#4CAF50' : '#f44336'};">
                        ${alreadyBuilt ? 'Built' : `${module.cost}💎`}
                    </span>
                </div>
            `;
            
            if (canAfford && !alreadyBuilt) {
                item.addEventListener('click', () => this.selectModule(key));
            }
            
            moduleList.appendChild(item);
        });
    }
    
    selectModule(moduleKey) {
        this.station.selectedModule = moduleKey;
        
        // Update visual selection
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Safely add selection to clicked item
        const clickedItem = event?.target?.closest('.module-item');
        if (clickedItem) {
            clickedItem.classList.add('selected');
        }
    }
    
    canBuildAt(x, y) {
        if (!this.station || !this.station.grid) return false;
        
        // Can't build if already occupied
        if (this.station.grid[`${x},${y}`]) return false;
        
        // Must be adjacent to existing module
        const adjacent = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        return adjacent.some(([ax, ay]) => {
            return this.station.grid[`${ax},${ay}`];
        });
    }
    
    handleGridClick(x, y) {
        if (!this.station.selectedModule) return;
        if (!this.canBuildAt(x, y)) return;
        
        const module = this.modules[this.station.selectedModule];
        if (!module || this.totalResources < module.cost) return;
        
        // Build the module
        this.station.grid[`${x},${y}`] = this.station.selectedModule;
        this.totalResources -= module.cost;
        module.built = true;
        
        // Update station stats
        this.station.size = this.calculateStationSize();
        this.station.tier = this.calculateStationTier();
        
        // Save progress immediately
        this.saveStationGrid();
        this.saveModuleStates();
        try {
            localStorage.setItem('totalResources', this.totalResources.toString());
        } catch (e) {
            console.warn('Failed to save resources:', e);
        }
        
        // Update ship capabilities first
        this.updateShipCapabilities();
        
        // Unlock new modules based on what was built
        this.unlockModules();
        
        // Update all displays
        this.createStationGrid();
        this.populateModuleList();
        this.updateStationDisplay();
        
        // Clear selection
        this.station.selectedModule = null;
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        console.log('Built module:', this.station.selectedModule, 'New capabilities:', {
            maxCargo: this.ship.maxCargo,
            laserPower: this.laser.power,
            maxFuel: this.ship.maxFuel
        });
    }
    
    saveModuleStates() {
        try {
            const moduleStates = {};
            Object.entries(this.modules).forEach(([key, module]) => {
                moduleStates[key] = {
                    built: module.built,
                    unlocked: module.unlocked
                };
            });
            localStorage.setItem('moduleStates', JSON.stringify(moduleStates));
        } catch (e) {
            console.warn('Failed to save module states:', e);
        }
    }
    
    loadModuleStates() {
        try {
            const saved = localStorage.getItem('moduleStates');
            if (saved) {
                const moduleStates = JSON.parse(saved);
                Object.entries(moduleStates).forEach(([key, state]) => {
                    if (this.modules[key]) {
                        this.modules[key].built = state.built || false;
                        this.modules[key].unlocked = state.unlocked || this.modules[key].unlocked;
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load module states:', e);
        }
    }
    
    updateShipCapabilities() {
        if (!this.modules) return;
        
        // Reset to base values first
        this.ship.maxCargo = 4; // Reduced base capacity
        this.laser.power = 1.5; // Increased base power  
        this.ship.maxFuel = 80; // Reduced base fuel
        
        // Storage Bay increases cargo capacity significantly
        if (this.modules.storage && this.modules.storage.built) {
            this.ship.maxCargo = 8; // Doubled capacity upgrade
        }
        
        // Workshop increases mining power substantially
        if (this.modules.workshop && this.modules.workshop.built) {
            this.laser.power = 3.5; // Much more impactful upgrade
        }
        
        // Greenhouse provides fuel efficiency AND capacity
        if (this.modules.greenhouse && this.modules.greenhouse.built) {
            this.ship.maxFuel = 150; // More meaningful fuel upgrade
        }
        
        // Observatory adds scanner efficiency (new bonus)
        if (this.modules.observatory && this.modules.observatory.built) {
            this.scanner.speed = 12; // Faster scanner
            this.scanner.maxRadius = 300; // Larger range
        }
    }
    
    unlockModules() {
        if (!this.modules) return;
        
        // Research Lab should always be unlocked if you have resources
        this.modules.research.unlocked = true;
        
        // Unlock workshop after building storage and research
        if (this.modules.storage.built && this.modules.research.built) {
            this.modules.workshop.unlocked = true;
        }
        
        // Unlock advanced modules after workshop
        if (this.modules.workshop.built) {
            this.modules.greenhouse.unlocked = true;
            this.modules.observatory.unlocked = true;
        }
        
        // Unlock guest quarters after having 6+ modules
        if (this.station && this.station.grid && Object.keys(this.station.grid).length >= 6) {
            this.modules.quarters.unlocked = true;
        }
        
        // Unlock vault for final tier
        if (this.station && this.station.tier >= 4) {
            this.modules.vault.unlocked = true;
        }
    }
    
    updateStationDisplay() {
        const resourceEl = document.getElementById('stationResourceCount');
        const gridSizeEl = document.getElementById('gridSize');
        const tierEl = document.getElementById('stationTier');
        
        if (resourceEl) resourceEl.textContent = this.totalResources;
        if (gridSizeEl && this.station) gridSizeEl.textContent = `${this.station.size}x${this.station.size}`;
        if (tierEl && this.station) tierEl.textContent = this.station.tier;
        
        this.unlockModules();
    }
    
    generateAsteroids() {
        this.asteroids = [];
        this.artifacts = []; // Clear current field artifacts
        
        const fieldDifficulty = this.expedition.currentField;
        const baseCount = 6 + fieldDifficulty * 1; // Reduced: 7-11 asteroids instead of 10-18
        const rareChance = 0.15 + fieldDifficulty * 0.08; // Better rare chances: 15%-55%
        
        for (let i = 0; i < baseCount; i++) {
            const size = 15 + Math.random() * 20;
            const isRare = Math.random() < rareChance;
            
            this.asteroids.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: size,
                health: 20 + fieldDifficulty * 8, // Reduced: 20-60 health (was 60-160)
                maxHealth: 20 + fieldDifficulty * 8,
                type: isRare ? 'rare' : 'common',
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                resources: isRare ? 3 + fieldDifficulty : 1 + Math.floor(fieldDifficulty / 2) // Dynamic resource yield
            });
        }
        
        // Artifacts more common in later fields (25%-85% chance)
        const artifactChance = 0.25 + fieldDifficulty * 0.15;
        if (Math.random() < artifactChance) {
            this.spawnArtifact();
        }
    }
    
    spawnArtifact() {
        const artifactTypes = [
            { name: 'Ancient Data Core', icon: '💿', rarity: 'common', value: 5 },
            { name: 'Alien Crystal Fragment', icon: '💎', rarity: 'uncommon', value: 10 },
            { name: 'Quantum Resonator', icon: '⚡', rarity: 'rare', value: 20 },
            { name: 'Stellar Memory Bank', icon: '🧠', rarity: 'epic', value: 50 },
            { name: 'Master Artifact Shard', icon: '🌟', rarity: 'legendary', value: 100 }
        ];
        
        // Higher field = better artifacts
        const fieldBonus = this.expedition.currentField;
        let availableTypes = artifactTypes.filter(type => {
            if (type.rarity === 'legendary') return fieldBonus >= 4;
            if (type.rarity === 'epic') return fieldBonus >= 3;
            if (type.rarity === 'rare') return fieldBonus >= 2;
            return true; // common and uncommon always available
        });
        
        const artifact = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        this.artifacts.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            ...artifact,
            discovered: false,
            pulsePhase: Math.random() * Math.PI * 2
        });
    }
    
    loadDiscoveredArtifacts() {
        try {
            const saved = localStorage.getItem('discoveredArtifacts');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('Failed to load artifacts:', e);
            return [];
        }
    }
    
    saveDiscoveredArtifacts() {
        try {
            localStorage.setItem('discoveredArtifacts', JSON.stringify(this.discoveredArtifacts));
        } catch (e) {
            console.warn('Failed to save artifacts:', e);
        }
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
                // Show field cleared message and options
                setTimeout(async () => {
                    const travelCost = 5 + this.expedition.currentField * 2; // Escalating cost: 7, 9, 11, 13
                    const fuelRemaining = this.ship.fuel - travelCost;
                    
                    const message = `Field ${this.expedition.currentField} cleared! 🌟\n\nContinue to Field ${this.expedition.currentField + 1}?\n\nTravel Cost: ${travelCost} fuel\nFuel Remaining: ${fuelRemaining}\n\nDeeper fields have rarer materials & artifacts!`;
                    
                    const shouldContinue = await this.showConfirm('Field Complete!', message);
                    
                    if (shouldContinue && this.ship.fuel >= travelCost) {
                        this.expedition.currentField++;
                        this.generateAsteroids();
                        this.consumeFuel(travelCost);
                    } else {
                        this.expedition.returnToStation = true;
                        this.dockAtStation();
                    }
                }, 1000);
            } else {
                // Reached max depth
                setTimeout(async () => {
                    await this.showAlert('Expedition Complete!', '🏆 You\'ve reached the deepest field!\nReturning to station with your treasures.');
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
        
        // Create resources
        for (let i = 0; i < asteroid.resources; i++) {
            this.resources.push({
                x: asteroid.x + (Math.random() - 0.5) * 30,
                y: asteroid.y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                type: asteroid.type,
                life: 1,
                collected: false,
                magnetRange: 80
            });
        }
        
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
        // Collect nearby resources (magnetic effect)
        this.resources.forEach((resource, index) => {
            const distance = Math.sqrt(
                (resource.x - this.ship.x) ** 2 + 
                (resource.y - this.ship.y) ** 2
            );
            
            if (distance < 30) {
                const dx = this.ship.x - resource.x;
                const dy = this.ship.y - resource.y;
                resource.x += dx * 0.2;
                resource.y += dy * 0.2;
                
                if (distance < 15 && this.ship.cargo.length < this.ship.maxCargo) {
                    this.ship.cargo.push(resource);
                    this.resources.splice(index, 1);
                }
            }
        });
        
        // Collect nearby artifacts
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
                    this.saveDiscoveredArtifacts();
                    
                    // Add research value to resources
                    this.totalResources += artifact.value;
                    
                    // Remove from current field
                    this.artifacts.splice(index, 1);
                    
                    // Particle effect
                    this.createParticles(artifact.x, artifact.y, '#FFD700', 15);
                    
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
            
            // Check for artifact discoveries
            this.artifacts.forEach(artifact => {
                if (!artifact.discovered) {
                    const distance = Math.sqrt(
                        (artifact.x - this.ship.x) ** 2 + 
                        (artifact.y - this.ship.y) ** 2
                    );
                    
                    if (distance <= this.scanner.radius) {
                        artifact.discovered = true;
                        this.createParticles(artifact.x, artifact.y, '#FFD700', 10);
                        
                        // Show discovery message
                        setTimeout(async () => {
                            await this.showAlert('Artifact Discovered!', `🎉 ${artifact.icon} ${artifact.name}\nRarity: ${artifact.rarity.toUpperCase()}\nValue: ${artifact.value} research points`);
                        }, 100);
                    }
                }
            });
        }
    }
    
    returnToStation() {
        // Process cargo
        this.ship.cargo.forEach(resource => {
            this.totalResources += resource.type === 'rare' ? 3 : 1;
        });
        this.ship.cargo = [];
        
        // Refuel
        this.ship.fuel = this.ship.maxFuel;
        
        // Generate new field
        this.generateAsteroids();
        
        // Save progress
        localStorage.setItem('totalResources', this.totalResources.toString());
        
        // Update station display
        this.updateStationDisplay();
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
            this.renderMining();
        } else {
            this.renderStation();
        }
        
        this.updateUI();
    }
    
    renderMining() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (background)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137.5) % this.canvas.width;
            const y = (i * 234.7) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        // Draw scanner pulse
        if (this.scanner.active) {
            this.ctx.strokeStyle = `rgba(100, 255, 100, ${this.scanner.pulseTime})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.ship.x, this.ship.y, this.scanner.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw asteroids
        this.asteroids.forEach(asteroid => {
            const healthRatio = asteroid.health / asteroid.maxHealth;
            
            this.ctx.save();
            this.ctx.translate(asteroid.x, asteroid.y);
            this.ctx.rotate(asteroid.rotation);
            
            // Health-based coloring
            if (asteroid.type === 'rare') {
                this.ctx.fillStyle = `rgba(255, 107, 157, ${0.3 + healthRatio * 0.7})`;
            } else {
                this.ctx.fillStyle = `rgba(97, 218, 251, ${0.3 + healthRatio * 0.7})`;
            }
            
            // Draw asteroid shape
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = asteroid.size * (0.8 + Math.sin(angle * 3) * 0.2);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw outline
            this.ctx.strokeStyle = asteroid.type === 'rare' ? '#ff6b9d' : '#61dafb';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            this.ctx.restore();
            
            asteroid.rotation += asteroid.rotationSpeed;
        });
        
        // Draw resources
        this.resources.forEach(resource => {
            this.ctx.fillStyle = resource.type === 'rare' ? '#ff6b9d' : '#61dafb';
            this.ctx.beginPath();
            this.ctx.arc(resource.x, resource.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Glow effect
            this.ctx.fillStyle = resource.type === 'rare' ? 'rgba(255, 107, 157, 0.3)' : 'rgba(97, 218, 251, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(resource.x, resource.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw artifacts
        this.artifacts.forEach(artifact => {
            artifact.pulsePhase += 0.1;
            const pulse = Math.sin(artifact.pulsePhase) * 0.3 + 0.7;
            
            if (artifact.discovered) {
                // Discovered artifacts glow brightly
                this.ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Artifact icon
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '20px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(artifact.icon, artifact.x, artifact.y + 7);
                
                // Rarity indicator
                let rarityColor = '#ffffff';
                if (artifact.rarity === 'legendary') rarityColor = '#ff6b9d';
                else if (artifact.rarity === 'epic') rarityColor = '#9b59b6';
                else if (artifact.rarity === 'rare') rarityColor = '#3498db';
                else if (artifact.rarity === 'uncommon') rarityColor = '#2ecc71';
                
                this.ctx.strokeStyle = rarityColor;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 15, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                // Hidden artifacts show faint energy signature
                this.ctx.fillStyle = `rgba(100, 255, 100, ${pulse * 0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw mining laser
        if (this.laser.active) {
            this.ctx.strokeStyle = '#ff4444';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.laser.x, this.laser.y);
            this.ctx.lineTo(this.laser.targetX, this.laser.targetY);
            this.ctx.stroke();
            
            // Laser glow
            this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
            this.ctx.lineWidth = 6;
            this.ctx.stroke();
        }
        
        // Draw auto-mining target indicator
        if (this.autoMining.enabled && this.autoMining.targetIndicator.visible) {
            const time = Date.now() * 0.005;
            const pulse = Math.sin(time) * 0.3 + 0.7;
            
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(this.autoMining.targetIndicator.x, this.autoMining.targetIndicator.y, 30, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
            
            // Target crosshair
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse * 0.8})`;
            this.ctx.lineWidth = 1;
            const x = this.autoMining.targetIndicator.x;
            const y = this.autoMining.targetIndicator.y;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 10, y);
            this.ctx.lineTo(x + 10, y);
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x, y + 10);
            this.ctx.stroke();
        }
        
        // Draw auto-mining search range when no targets (subtle feedback)
        if (this.autoMining.enabled && !this.autoMining.targetIndicator.visible && this.asteroids.length > 0) {
            const time = Date.now() * 0.002;
            const pulse = Math.sin(time) * 0.1 + 0.15;
            
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`;
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 8]);
            this.ctx.beginPath();
            this.ctx.arc(this.ship.x, this.ship.y, this.autoMining.searchRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
        }
        
        // Draw ship
        this.ctx.save();
        this.ctx.translate(this.ship.x, this.ship.y);
        this.ctx.rotate(this.ship.angle);
        
        // Ship body
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.moveTo(this.ship.size, 0);
        this.ctx.lineTo(-this.ship.size, -this.ship.size/2);
        this.ctx.lineTo(-this.ship.size/2, 0);
        this.ctx.lineTo(-this.ship.size, this.ship.size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Ship outline
        this.ctx.strokeStyle = '#81C784';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    renderStation() {
        // Clear canvas with station background
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw station background pattern
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw centered station diagram
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const cellSize = 40;
        
        this.ctx.save();
        this.ctx.translate(centerX - 2.5 * cellSize, centerY - 2.5 * cellSize);
        
        // Draw grid outline
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        for (let x = 0; x <= 5; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * cellSize, 0);
            this.ctx.lineTo(x * cellSize, 5 * cellSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= 5; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * cellSize);
            this.ctx.lineTo(5 * cellSize, y * cellSize);
            this.ctx.stroke();
        }
        
        // Draw modules
        Object.entries(this.station.grid).forEach(([pos, moduleType]) => {
            const [x, y] = pos.split(',').map(Number);
            const module = this.modules[moduleType];
            
            if (module) {
                this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                this.ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
                
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.font = '20px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(module.icon, x * cellSize + cellSize/2, y * cellSize + cellSize/2 + 7);
                
                this.ctx.font = '8px monospace';
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(module.name, x * cellSize + cellSize/2, y * cellSize + cellSize - 4);
            }
        });
        
        this.ctx.restore();
    }
    
    updateUI() {
        const fuelPercentage = (this.ship.fuel / this.ship.maxFuel) * 100;
        const cargoPercentage = (this.ship.cargo.length / this.ship.maxCargo) * 100;
        
        if (document.getElementById('fuelFill')) {
            document.getElementById('fuelFill').style.width = fuelPercentage + '%';
            
            // Fuel warning colors
            const fuelFill = document.getElementById('fuelFill');
            if (fuelPercentage < 20) {
                fuelFill.style.background = 'linear-gradient(90deg, #f44336, #ff5722)'; // Red warning
            } else if (fuelPercentage < 40) {
                fuelFill.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)'; // Orange caution
            } else {
                fuelFill.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; // Green normal
            }
        }
        
        if (document.getElementById('cargoFill')) {
            document.getElementById('cargoFill').style.width = cargoPercentage + '%';
        }
        if (document.getElementById('cargoCount')) {
            document.getElementById('cargoCount').textContent = this.ship.cargo.length;
        }
        if (document.getElementById('cargoMax')) {
            document.getElementById('cargoMax').textContent = this.ship.maxCargo;
        }
        if (document.getElementById('resourceCount')) {
            document.getElementById('resourceCount').textContent = this.totalResources;
        }
        
        // Update expedition progress in view indicator
        if (this.gameState === 'mining' && document.getElementById('viewIndicator')) {
            const remaining = this.asteroids.length;
            const fuelWarning = this.ship.fuel < 15 ? ' ⚠️ LOW FUEL' : '';
            document.getElementById('viewIndicator').textContent = 
                `🚀 Expedition - Field ${this.expedition.currentField}/${this.expedition.maxFields} (${remaining} asteroids remaining)${fuelWarning}`;
        }
        
        // Emergency fuel warning
        if (this.gameState === 'mining' && this.ship.fuel <= 10 && !this.fuelWarningShown) {
            this.fuelWarningShown = true;
            setTimeout(async () => {
                const shouldReturn = await this.showConfirm('FUEL CRITICAL!', '⚠️ Return to station immediately?\n\nContinuing may strand you in space!');
                if (shouldReturn) {
                    this.returnToStation();
                }
                this.fuelWarningShown = false; // Reset warning
            }, 100);
        }
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
        // Transfer cargo to station storage with proper value calculation
        let resourceValue = 0;
        this.ship.cargo.forEach(resource => {
            if (resource.type === 'rare') {
                resourceValue += 4; // Rare resources worth more
            } else {
                resourceValue += 1; // Common resources base value
            }
        });
        
        this.totalResources += resourceValue;
        this.ship.cargo = [];
        
        // Auto-refuel at station
        this.ship.fuel = this.ship.maxFuel;
        
        // Switch to station view
        this.gameState = 'station';
        document.getElementById('miningUI').style.display = 'none';
        document.getElementById('miningControls').style.display = 'none';
        document.getElementById('stationUI').style.display = 'block';
        document.getElementById('stationControls').style.display = 'block';
        document.getElementById('stationGrid').style.display = 'block';
        document.getElementById('autoMiningIndicator').style.display = 'none';
        document.getElementById('viewIndicator').textContent = `🏗️ Station Builder - Refueled! (+${resourceValue} resources)`;
        this.updateStationDisplay();
        
        // Generate new field for next expedition
        this.generateAsteroids();
        
        // Save progress
        try {
            localStorage.setItem('totalResources', this.totalResources.toString());
        } catch (e) {
            console.warn('Failed to save resources:', e);
        }
    }
    
    // Modal dialog system
    showModal(title, message, buttons) {
        return new Promise((resolve) => {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalText').textContent = message;
            
            const buttonContainer = document.getElementById('modalButtons');
            buttonContainer.innerHTML = '';
            
            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `modal-button ${button.class || 'secondary'}`;
                btn.textContent = button.text;
                btn.onclick = () => {
                    this.hideModal();
                    resolve(button.value);
                };
                buttonContainer.appendChild(btn);
            });
            
            document.getElementById('gameModal').style.display = 'flex';
        });
    }
    
    hideModal() {
        document.getElementById('gameModal').style.display = 'none';
    }
    
    showAlert(title, message) {
        return this.showModal(title, message, [
            { text: 'OK', class: 'primary', value: true }
        ]);
    }
    
    showConfirm(title, message) {
        return this.showModal(title, message, [
            { text: 'Yes', class: 'primary', value: true },
            { text: 'No', class: 'secondary', value: false }
        ]);
    }
    
    toggleAutoMining() {
        this.autoMining.enabled = !this.autoMining.enabled;
        this.autoMining.target = null;
        this.autoMining.targetIndicator.visible = false;
        
        const indicator = document.getElementById('autoMiningIndicator');
        const controlsText = document.querySelector('#miningControls div:nth-child(2)');
        
        if (this.autoMining.enabled) {
            indicator.style.display = 'block';
            if (controlsText) {
                controlsText.innerHTML = '🤖 Auto-Mining: ON (Press X to toggle)';
                controlsText.style.color = '#4CAF50';
            }
        } else {
            indicator.style.display = 'none';
            if (controlsText) {
                controlsText.innerHTML = '🔫 Manual Mode: ON (Press X to toggle)';
                controlsText.style.color = '#ff9800';
            }
            this.stopMining();
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new CosmicCollectionStation();
}); 