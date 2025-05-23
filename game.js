class CosmicCollectionStation {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Initialize modules
        this.renderer = new Renderer(this.canvas, this.ctx);
        this.stationManager = new StationManager();
        
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
        this.discoveredArtifacts = this.loadDiscoveredArtifacts(); // Global collection
        
        this.generateAsteroids();
        this.setupEventListeners();
        this.setupStationUI();
        this.stationManager.loadModuleStates();
        this.stationManager.updateShipCapabilities(this);
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
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
        this.stationManager.createStationGrid(this.station.grid, this);
        this.stationManager.populateModuleList(this.totalResources, this.station.grid);
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
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
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
        
        this.updateUI();
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