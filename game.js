class CosmicCollectionStation {
    constructor() {
        // Game version for save compatibility
        this.version = '0.1.0';
        this.saveVersion = '1.0';
        
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
        
        // Validate and migrate saves if needed
        this.validateSaveData();
        
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
            fuel: 120, // Balanced starting fuel
            maxFuel: 120, // Balanced starting capacity  
            cargo: [],
            maxCargo: 6, // Good starting cargo space
            size: 8,
            fuelEfficiency: 1 // Base efficiency
        };
        
        // Mining laser
        this.laser = {
            active: false,
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            power: 1.5 // Slightly higher base power for better feel
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
        
        // Session tracking for Master Artifact conditions
        this.sessionStats = {
            resourcesCollected: 0,
            epicArtifactsFound: 0,
            asteroidsMined: 0,
            totalAsteroidsMined: 0,
            miningEfficiency: 1.0
        };
        
        // Performance monitoring for stability
        this.performance = {
            frameCount: 0,
            lastFPSCheck: Date.now(),
            currentFPS: 60,
            averageFPS: 60,
            lowFPSWarningShown: false
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
        
        // Show onboarding for new players
        this.checkFirstTimePlayer();
        
        // Console launch message for release
        console.log(`
🌟 COSMIC COLLECTION STATION v${this.version} 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Stable Release - Ready for Adventure!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Goal: Collect 5 Master Artifacts
🏗️ Features: Station building, Auto-mining, Mobile support
🎮 Controls: H for help, Space to scan, WASD to move
📱 Mobile: Touch controls enabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Built for Mini Jam 185 - Theme: Aliens & Limited Space
Performance: ${this.performance.currentFPS} FPS | Save: v${this.saveVersion}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    loadTotalResources() {
        try {
            const saved = localStorage.getItem('totalResources');
            if (saved === null) {
                // First time playing - give starter bonus for better experience
                this.ui.showNotification(`🌟 Welcome to space! Starting bonus: 15 resources`, 'success', 4000);
                return 15;
            }
            const parsed = parseInt(saved || '0');
            return isNaN(parsed) ? 0 : Math.max(0, parsed);
        } catch (e) {
            console.warn('Failed to load total resources:', e);
            return 15; // Default starter bonus on error
        }
    }
    
    validateSaveData() {
        try {
            // Check save version compatibility
            const saveVersion = localStorage.getItem('gameVersion');
            if (!saveVersion) {
                // First time or old save - set current version
                localStorage.setItem('gameVersion', this.saveVersion);
                console.log('🎮 New game initialized with version', this.version);
                return;
            }
            
            // Handle version migrations if needed
            if (saveVersion !== this.saveVersion) {
                console.log('🔄 Migrating save data from version', saveVersion, 'to', this.saveVersion);
                this.migrateSaveData(saveVersion);
                localStorage.setItem('gameVersion', this.saveVersion);
            }
            
            // Validate critical save data
            this.validateCriticalSaveData();
            
        } catch (e) {
            console.warn('Save validation failed:', e);
            this.ui.showNotification('⚠️ Save data validation failed - some progress may be reset', 'warning', 5000);
        }
    }
    
    migrateSaveData(fromVersion) {
        // Future migration logic would go here
        // For now, just log the migration
        console.log('Save migration completed from', fromVersion, 'to', this.saveVersion);
    }
    
    validateCriticalSaveData() {
        // Validate that critical save data isn't corrupted
        const criticalKeys = ['totalResources', 'stationGrid', 'moduleStates', 'playerStats'];
        
        criticalKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data && key !== 'totalResources') {
                    JSON.parse(data); // Test if JSON is valid
                }
            } catch (e) {
                console.warn(`Corrupted save data for ${key}, resetting...`);
                localStorage.removeItem(key);
            }
        });
    }
    
    setupEventListeners() {
        // Enhanced keyboard handling with conflict prevention
        window.addEventListener('keydown', (e) => {
            // Prevent handling when modal is open
            if (document.getElementById('gameModal').style.display === 'flex') {
                return;
            }
            
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.gameState === 'mining') {
                    this.activateScanner();
                }
            }
            
            if (e.key.toLowerCase() === 'r' && this.gameState === 'mining') {
                e.preventDefault(); // Prevent browser refresh
                this.returnToStation();
            }
            
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleView();
            }
            
            if (e.key.toLowerCase() === 'x' && this.gameState === 'mining') {
                e.preventDefault();
                this.toggleAutoMining();
            }
            
            if (e.key.toLowerCase() === 'h') {
                e.preventDefault();
                this.showHelpSystem();
            }
            
            if (e.key.toLowerCase() === 'p' && this.gameState === 'mining') {
                e.preventDefault();
                this.showMasterArtifactProgress();
            }
            
            // Developer cheat system (for testing/demo purposes)
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                this.showCheatMenu();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Enhanced mouse handling for mining
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState === 'mining' && !this.autoMining.enabled) {
                e.preventDefault(); // Prevent context menu or other issues
                this.mouse.down = true;
                this.startMining();
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.mouse.down = false;
            this.stopMining();
        });
        
        // Prevent right-click context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Mobile touch controls
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            
            if (this.gameState === 'mining') {
                // Touch to activate scanner (like spacebar)
                this.activateScanner();
                
                // If auto-mining is disabled, start mining at touch location
                if (!this.autoMining.enabled) {
                    this.mouse.down = true;
                    this.startMining();
                }
            }
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mouse.down = false;
            this.stopMining();
        });
        
        // Handle window resize to maintain responsive design
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
        
        // Handle visibility change to pause/resume game
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Game is hidden, could pause here if needed
                console.log('Game paused (tab hidden)');
            } else {
                // Game is visible again
                console.log('Game resumed (tab visible)');
            }
        });
        
        // Reset progress button
        document.addEventListener('DOMContentLoaded', () => {
            const resetBtn = document.getElementById('resetProgressBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.showResetConfirmation();
                });
            }
        });
        
        // Also set up the button if DOM is already loaded
        setTimeout(() => {
            const resetBtn = document.getElementById('resetProgressBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.showResetConfirmation();
                });
            }
        }, 100);
    }
    
    toggleView() {
        if (this.gameState === 'mining') {
            this.gameState = 'station';
            this.ui.switchToStationUI();
            this.stationManager.updateStationDisplay(this.totalResources, this.station);
            
            // Ensure station grid is visible and properly set up
            this.stationManager.createStationGrid(this.station.grid, this);
            this.stationManager.populateModuleList(this.totalResources, this.station.grid);
            
            // Show the station grid
            const stationGrid = document.getElementById('stationGrid');
            if (stationGrid) {
                stationGrid.style.display = 'block';
            }
            
            // Show helpful guidance for new players at station
            if (this.totalResources < 25) { // Early game guidance
                setTimeout(() => {
                    this.ui.showNotification(`💡 Build Storage Bay & Research Lab to unlock more modules!`, 'info', 5000);
                }, 1000);
            }
        } else {
            // Starting a new expedition from station
            const launchCost = 5; // Reduced further for better early game experience
            if (this.ship.fuel >= launchCost) {
                // Reset session stats for new expedition
                this.sessionStats = {
                    resourcesCollected: 0,
                    epicArtifactsFound: 0,
                    asteroidsMined: 0,
                    totalAsteroidsMined: this.sessionStats.totalAsteroidsMined || 0,
                    miningEfficiency: 1.0
                };
                
                // Reset warning flags for new expedition
                this.emergencyWarningShown = false;
                this.autoReturnTriggered = false;
                this.miningFuelWarningShown = false;
                if (this.ui) {
                    this.ui.criticalFuelWarningShown = false;
                    this.ui.lowFuelWarningShown = false;
                }
                
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
                
                // Hide the station grid
                const stationGrid = document.getElementById('stationGrid');
                if (stationGrid) {
                    stationGrid.style.display = 'none';
                }
                
                // Show auto-mining indicator
                if (this.autoMining.enabled) {
                    document.getElementById('autoMiningIndicator').style.display = 'block';
                }
                
                // Show helpful controls reminder for new players
                if (this.sessionStats.totalAsteroidsMined < 20) {
                    setTimeout(() => {
                        this.ui.showNotification(`🎮 WASD to move, Space to scan, R to return to station`, 'info', 4000);
                    }, 1000);
                }
                
                // Show Master Artifact progress if not all collected
                if (this.resourceManager.playerStats.masterArtifactsCollected.length < 5) {
                    this.ui.showMasterArtifactProgress(this.resourceManager.getMasterArtifactProgress(this.sessionStats));
                }
            } else {
                this.ui.showInsufficientFuel(launchCost);
                
                // Additional guidance if fuel is very low
                if (this.ship.fuel < 20) {
                    setTimeout(() => {
                        this.ui.showNotification(`💡 Build a Greenhouse to increase fuel capacity!`, 'info', 4000);
                    }, 1000);
                }
            }
        }
    }
    
    setupStationUI() {
        // Ensure the station manager creates the grid and populates modules
        this.stationManager.createStationGrid(this.station.grid, this);
        this.stationManager.populateModuleList(this.totalResources, this.station.grid);
        
        // Make sure grid is initially hidden (since we start in mining mode)
        const stationGrid = document.getElementById('stationGrid');
        if (stationGrid) {
            stationGrid.style.display = 'none';
        }
    }
    
    generateAsteroids() {
        this.asteroids = [];
        this.resources = [];
        this.artifacts = [];
        
        // Enhanced progressive field difficulty with guaranteed minimums for Master Artifact conditions
        const baseCount = 10; // Increased base count
        const fieldMultiplier = Math.min(this.expedition.currentField * 0.3, 1.5); // Cap at 1.5x
        const asteroidCount = Math.max(8, Math.floor(baseCount + fieldMultiplier * 4)); // Minimum 8 asteroids, up to 16
        
        // Improved rare asteroid spawning - more generous for better resource collection
        const baseRareChance = 0.25 + (this.expedition.currentField - 1) * 0.08; // 25% to 57%
        const rareChance = Math.min(baseRareChance, 0.6); // Cap at 60%
        
        // Calculate minimum resources needed for Growth Master Artifact (50 resources)
        const estimatedResourcesFromAsteroids = asteroidCount * 2; // Conservative estimate
        const needsBoost = estimatedResourcesFromAsteroids < 60; // Give buffer above 50
        
        for (let i = 0; i < asteroidCount; i++) {
            // Ensure asteroids don't spawn too close to ship starting position
            let x, y, attempts = 0;
            const shipStartX = this.canvas.width / 2;
            const shipStartY = this.canvas.height / 2;
            
            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                attempts++;
                
                // Prevent infinite loop
                if (attempts > 20) break;
                
                const distanceFromShip = Math.sqrt(
                    (x - shipStartX) ** 2 + (y - shipStartY) ** 2
                );
                
                // Ensure minimum distance from ship spawn
                if (distanceFromShip > 100) break;
                
            } while (true);
            
            // Improved rare chance - boost it if we need more resources
            let currentRareChance = rareChance;
            if (needsBoost && i < 4) { // First 4 asteroids get boosted rare chance
                currentRareChance = Math.min(rareChance + 0.3, 0.8); // Up to 80% for resource boost
            }
            
            const isRare = Math.random() < currentRareChance;
            const baseSize = 15 + Math.random() * 10;
            const size = isRare ? baseSize * 1.3 : baseSize;
            const baseHealth = isRare ? 4 : 3;
            const health = baseHealth + Math.floor(this.expedition.currentField / 2);
            
            // Improved resource distribution - ensure good yields
            let resourceCount;
            if (isRare) {
                resourceCount = 3 + Math.floor(Math.random() * 3) + Math.floor(this.expedition.currentField / 2); // 3-5 + field bonus
            } else {
                resourceCount = 1 + Math.floor(Math.random() * 2) + Math.floor(this.expedition.currentField / 3); // 1-2 + field bonus
            }
            
            this.asteroids.push({
                x: x,
                y: y,
                size: size,
                health: health,
                maxHealth: health,
                type: isRare ? 'rare' : 'normal',
                resources: resourceCount,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.02
            });
        }
        
        // Guarantee at least 2 rare asteroids per field for better progression
        const rareCount = this.asteroids.filter(a => a.type === 'rare').length;
        const minRareNeeded = Math.max(2, Math.floor(this.expedition.currentField / 2));
        
        if (rareCount < minRareNeeded) {
            // Convert some normal asteroids to rare
            const normalAsteroids = this.asteroids.filter((a, i) => a.type === 'normal' ? i : -1).slice(0, minRareNeeded - rareCount);
            normalAsteroids.forEach(asteroid => {
                asteroid.type = 'rare';
                asteroid.resources = 3 + Math.floor(Math.random() * 3) + Math.floor(this.expedition.currentField / 2);
                asteroid.size *= 1.3;
            });
        }
        
        // Enhanced artifact spawning with better progression
        this.spawnArtifact();
        
        // Auto-scan if artifacts are present and ship has observatory
        const hasObservatory = Object.values(this.station.grid).includes('observatory');
        if (this.artifacts.length > 0 && hasObservatory) {
            setTimeout(() => {
                this.activateScanner();
                this.ui.showNotification('🔭 Observatory detected anomalies - auto-scanning...', 'info', 3000);
            }, 1500);
        }
        
        // Debug logging for balancing
        const totalPotentialResources = this.asteroids.reduce((sum, a) => sum + a.resources, 0);
        console.log(`Field ${this.expedition.currentField} generated:`, {
            asteroids: this.asteroids.length,
            rareAsteroids: this.asteroids.filter(a => a.type === 'rare').length,
            artifacts: this.artifacts.length,
            expectedRareChance: `${(rareChance * 100).toFixed(1)}%`,
            totalPotentialResources: totalPotentialResources,
            meetsGrowthRequirement: totalPotentialResources >= 50
        });
    }
    
    spawnArtifact() {
        // Clear existing artifacts for this field
        this.artifacts = [];
        
        // Track fields visited for Master Artifact conditions
        this.resourceManager.updatePlayerStats({
            fieldsVisited: this.resourceManager.playerStats.fieldsVisited + 1
        });
        
        // Generate regular artifacts using ResourceManager
        if (this.resourceManager.shouldSpawnArtifact(this.expedition.currentField)) {
            const artifact = this.resourceManager.generateArtifact(this.expedition.currentField);
            if (artifact) {
                // Position artifact randomly but not too close to ship spawn
                let x, y, attempts = 0;
                do {
                    x = Math.random() * this.canvas.width;
                    y = Math.random() * this.canvas.height;
                    attempts++;
                    
                    if (attempts > 20) break;
                    
                    const distanceFromShip = Math.sqrt(
                        (x - this.canvas.width/2) ** 2 + (y - this.canvas.height/2) ** 2
                    );
                    
                    if (distanceFromShip > 120) break;
                } while (true);
                
                artifact.x = x;
                artifact.y = y;
                artifact.discovered = false;
                artifact.pulsePhase = Math.random() * Math.PI * 2;
                
                this.artifacts.push(artifact);
            }
        }

        // Try to generate Master Artifact based on session progress
        const masterArtifact = this.resourceManager.generateMasterArtifact(
            this.expedition.currentField,
            this.sessionStats,
            this.canvas.width,
            this.canvas.height
        );
        
        if (masterArtifact) {
            masterArtifact.discovered = false;
            masterArtifact.pulsePhase = Math.random() * Math.PI * 2;
            masterArtifact.isMaster = true; // Flag for special rendering
            
            this.artifacts.push(masterArtifact);
            console.log(`🌟 Master Artifact available in field ${this.expedition.currentField}:`, masterArtifact.name);
            this.ui.showNotification(`🌟 Master Artifact detected in this field!`, 'legendary', 4000);
        }
        
        // Debug logging for development
        if (this.artifacts.length > 0) {
            console.log(`Artifacts spawned in field ${this.expedition.currentField}:`, 
                this.artifacts.map(a => ({name: a.name, type: a.type, rarity: a.rarity}))
            );
        }
    }
    
    loadDiscoveredArtifacts() {
        return this.resourceManager.loadDiscoveredArtifacts();
    }
    
    saveDiscoveredArtifacts() {
        this.resourceManager.saveDiscoveredArtifacts(this.discoveredArtifacts);
    }
    
    updateShip() {
        if (this.gameState !== 'mining') return;
        
        // Auto-mining: find best asteroid with improved prioritization
        if (this.autoMining.enabled) {
            let bestAsteroid = null;
            let bestScore = -1;
            
            this.asteroids.forEach(asteroid => {
                const distance = Math.sqrt(
                    (asteroid.x - this.ship.x) ** 2 + 
                    (asteroid.y - this.ship.y) ** 2
                );
                
                // Only consider asteroids within range
                if (distance <= this.autoMining.searchRadius) {
                    // Calculate priority score (higher is better)
                    let score = 0;
                    
                    // Rare asteroids get priority bonus
                    if (asteroid.type === 'rare') {
                        score += 100;
                    }
                    
                    // Closer asteroids get higher score (inverted distance)
                    score += (this.autoMining.searchRadius - distance);
                    
                    // Higher resource count gets bonus
                    score += asteroid.resources * 10;
                    
                    // Lower health asteroids get slight bonus (easier to finish)
                    score += (asteroid.maxHealth - asteroid.health) * 5;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestAsteroid = asteroid;
                    }
                }
            });
            
            this.autoMining.target = bestAsteroid;
            
            // Update target indicator
            if (bestAsteroid) {
                this.autoMining.targetIndicator.visible = true;
                this.autoMining.targetIndicator.x = bestAsteroid.x;
                this.autoMining.targetIndicator.y = bestAsteroid.y;
                
                // Auto-rotate toward target with smooth interpolation
                const targetAngle = Math.atan2(
                    bestAsteroid.y - this.ship.y, 
                    bestAsteroid.x - this.ship.x
                );
                
                // Smooth rotation with improved speed
                let angleDiff = targetAngle - this.ship.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                this.ship.angle += angleDiff * 0.15; // Slightly faster rotation
                
                // Auto-mine if in range with improved range calculation
                const miningRange = 140 + (this.ship.maxCargo * 2); // Range scales with ship upgrades
                const distance = Math.sqrt(
                    (bestAsteroid.x - this.ship.x) ** 2 + 
                    (bestAsteroid.y - this.ship.y) ** 2
                );
                
                if (distance < miningRange && this.ship.fuel > 5) { // Reserve 5 fuel for return
                    this.laser.active = true;
                    this.laser.x = this.ship.x;
                    this.laser.y = this.ship.y;
                    this.laser.targetX = bestAsteroid.x;
                    this.laser.targetY = bestAsteroid.y;
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
        
        // Ship movement with improved fuel efficiency
        const acceleration = 0.3;
        const friction = 0.95;
        const maxSpeed = 4;
        
        // Apply fuel efficiency from station upgrades
        const fuelEfficiency = this.ship.fuelEfficiency || 1;
        const baseFuelConsumption = 0.02 / fuelEfficiency; // Reduced from 0.03 for better balance
        
        // Movement fuel consumption (only when actively moving)
        let isMoving = false;
        if (this.keys['w'] || this.keys['arrowup']) {
            this.ship.vy -= acceleration;
            this.consumeFuel(baseFuelConsumption);
            isMoving = true;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.ship.vy += acceleration;
            this.consumeFuel(baseFuelConsumption);
            isMoving = true;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.ship.vx -= acceleration;
            this.consumeFuel(baseFuelConsumption);
            isMoving = true;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.ship.vx += acceleration;
            this.consumeFuel(baseFuelConsumption);
            isMoving = true;
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
        
        // Emergency low fuel warning and auto-return
        if (this.ship.fuel <= 10 && this.ship.fuel > 2 && !this.emergencyWarningShown) {
            this.emergencyWarningShown = true;
            this.ui.showNotification(`⚠️ Low fuel detected! Consider returning to station soon.`, 'warning', 4000);
        }
        
        // Auto-return only if fuel gets critically low (prevents softlock but gives player control)
        if (this.ship.fuel <= 1 && !this.autoReturnTriggered) {
            this.autoReturnTriggered = true;
            this.ui.showNotification(`🚨 Emergency fuel exhausted! Auto-returning to station!`, 'error', 3000);
            setTimeout(() => {
                this.returnToStation();
            }, 2000); // Give player time to see the message
        }
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
        
        // Apply fuel efficiency from station upgrades
        const fuelEfficiency = this.ship.fuelEfficiency || 1;
        const miningFuelCost = 0.08 / fuelEfficiency; // Reduced from 0.15 for better balance
        
        // Only consume fuel if we have enough (reserve some for return)
        if (this.ship.fuel > 3) { // Reduced reserve requirement
            this.consumeFuel(miningFuelCost);
        } else {
            // Stop mining if fuel is too low
            this.laser.active = false;
            if (!this.miningFuelWarningShown) {
                this.miningFuelWarningShown = true;
                this.ui.showNotification(`⛽ Not enough fuel for mining! Return to station.`, 'warning', 3000);
            }
            return;
        }
        
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
        // Track mining efficiency for Master Artifact conditions
        this.sessionStats.asteroidsMined++;
        this.sessionStats.totalAsteroidsMined++;
        
        // Improved mining efficiency calculation with realistic baseline
        // Efficiency = (average resources per asteroid) / (ideal resources per asteroid)
        // Ideal is considered to be 3 resources per asteroid (achievable but good)
        const idealResourcesPerAsteroid = 3.0;
        const currentAverageResources = this.sessionStats.resourcesCollected / Math.max(1, this.sessionStats.asteroidsMined);
        this.sessionStats.miningEfficiency = Math.min(1.0, currentAverageResources / idealResourcesPerAsteroid);
        
        console.log('Mining efficiency updated:', {
            asteroidsMinedThisSession: this.sessionStats.asteroidsMined,
            resourcesCollectedThisSession: this.sessionStats.resourcesCollected,
            averageResourcesPerAsteroid: currentAverageResources.toFixed(2),
            efficiencyPercentage: (this.sessionStats.miningEfficiency * 100).toFixed(1) + '%'
        });
        
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
        // Track resources collected this session before they're modified
        const initialResourceArrayLength = this.resources.length;
        const initialCargoLength = this.ship.cargo.length;
        
        // Use ResourceManager for magnetism and collection
        this.resourceManager.updateResourceMagnetism(this.resources, this.ship);
        
        // Calculate how many resources were actually collected this update
        const cargoIncrease = this.ship.cargo.length - initialCargoLength;
        if (cargoIncrease > 0) {
            // Update session stats immediately when resources are collected
            this.sessionStats.resourcesCollected += cargoIncrease;
            console.log('Resources collected this update:', cargoIncrease, 'Total session:', this.sessionStats.resourcesCollected);
        }

        // Handle artifact collection with Master Artifact support
        const collectionResult = this.resourceManager.updateArtifactCollection(
            this.artifacts, 
            this.ship, 
            this.discoveredArtifacts, 
            this.totalResources
        );

        if (collectionResult.collected) {
            this.totalResources += collectionResult.value;
            
            // Handle Master Artifact collection
            if (collectionResult.masterArtifact) {
                // Epic visual effect for Master Artifacts
                this.createParticles(collectionResult.masterArtifact.x, collectionResult.masterArtifact.y, '#ffd700', 25);
                
                // Special notification for Master Artifacts
                this.ui.showNotification(
                    `🌟 MASTER ARTIFACT COLLECTED: ${collectionResult.masterArtifact.name}! (+${collectionResult.value} research)`, 
                    'legendary', 
                    6000
                );

                // Check for victory condition
                if (collectionResult.victory) {
                    this.handleVictory();
                    return;
                }

                // Update Master Vault availability
                this.stationManager.unlockModules(this.station, this.resourceManager);
            } else {
                // Handle regular artifacts
                // Track epic artifacts for Master Artifact conditions
                if (collectionResult.value >= 50) { // Epic artifacts have value 50+
                    this.sessionStats.epicArtifactsFound++;
                    console.log('Epic artifact found! Session total:', this.sessionStats.epicArtifactsFound);
                }

                // Regular artifact notification
                const artifact = this.artifacts.find(a => a.discovered);
                if (artifact) {
                    this.createParticles(artifact.x, artifact.y, '#FFD700', 15);
                    this.ui.showNotification(
                        `✨ Collected ${artifact.rarity} artifact: ${artifact.name} (+${collectionResult.value} research)`, 
                        'success', 
                        4000
                    );
                }
            }
        }
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
        this.consumeFuel(1.5); // Reduced from 3 - scanner should be more accessible and less fuel intensive
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
        // End the current expedition and dock at station
        this.expedition.returnToStation = true;
        this.dockAtStation();
    }
    
    consumeFuel(amount) {
        this.ship.fuel = Math.max(0, this.ship.fuel - amount);
    }
    
    updateParticles() {
        // Use more efficient array operations to prevent memory buildup
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            if (particle.life <= 0) {
                // Remove dead particles to prevent memory accumulation
                this.particles.splice(i, 1);
            }
        }
        
        // Enforce particle limit to prevent memory issues during intensive mining
        const MAX_PARTICLES = 500;
        if (this.particles.length > MAX_PARTICLES) {
            this.particles.splice(0, this.particles.length - MAX_PARTICLES);
        }
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
        
        // Performance monitoring for stable release
        this.performance.frameCount++;
        const now = Date.now();
        const deltaTime = now - this.performance.lastFPSCheck;
        
        // Update FPS every second
        if (deltaTime >= 1000) {
            this.performance.currentFPS = Math.round((this.performance.frameCount * 1000) / deltaTime);
            this.performance.averageFPS = Math.round((this.performance.averageFPS + this.performance.currentFPS) / 2);
            
            // Show performance warning if FPS drops too low
            if (this.performance.currentFPS < 30 && !this.performance.lowFPSWarningShown) {
                console.warn('⚠️ Low FPS detected:', this.performance.currentFPS);
                this.performance.lowFPSWarningShown = true;
                
                // Show user-friendly notification for severe performance issues
                if (this.performance.currentFPS < 20) {
                    this.ui.showNotification('⚠️ Performance warning: Consider reducing browser tabs', 'warning', 4000);
                }
            }
            
            // Reset for next measurement
            this.performance.frameCount = 0;
            this.performance.lastFPSCheck = now;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    dockAtStation() {
        try {
            // Process cargo using ResourceManager with error handling
            const resourceValue = this.resourceManager.processCargoAtStation(this.ship);
            this.totalResources += resourceValue;
            
            // Explicitly clear cargo and update UI immediately
            this.ship.cargo = []; // Ensure cargo is definitely cleared
            
            // Update session stats with collected resources from this expedition
            this.sessionStats.resourcesCollected += resourceValue;
            
            console.log('Docking debug:', {
                cargoProcessed: resourceValue,
                totalResources: this.totalResources,
                cargoAfterClear: this.ship.cargo.length,
                sessionResourcesCollected: this.sessionStats.resourcesCollected
            });
            
            // Reset expedition state
            this.expedition.currentField = 1;
            this.expedition.returnToStation = false;
            
            // Update player stats for Master Artifact tracking
            this.resourceManager.updatePlayerStats({
                fieldsVisited: this.resourceManager.playerStats.fieldsVisited + this.expedition.fieldsCleared,
                totalResourcesCollected: this.resourceManager.playerStats.totalResourcesCollected + resourceValue
            });
            
            // Save progress with error handling
            try {
                localStorage.setItem('totalResources', this.totalResources.toString());
                this.resourceManager.savePlayerStats();
                this.stationManager.saveStationGrid(this.station.grid);
            } catch (saveError) {
                console.warn('Failed to save game progress:', saveError);
                this.ui.showNotification('⚠️ Save failed - progress may be lost on reload', 'warning', 5000);
            }
            
            // Refuel ship with station capacity
            const fuelBonus = this.stationManager.calculateFuelCapacity ? 
                this.stationManager.calculateFuelCapacity(this.station.grid) : this.ship.maxFuel;
            this.ship.fuel = fuelBonus;
            this.ship.maxFuel = fuelBonus;
            
            // Reset session stats for next expedition (but preserve career totals)
            const careerTotalAsteroids = this.sessionStats.totalAsteroidsMined;
            this.sessionStats = {
                resourcesCollected: 0,
                epicArtifactsFound: 0,
                asteroidsMined: 0,
                totalAsteroidsMined: careerTotalAsteroids, // Preserve career total
                miningEfficiency: 1.0
            };
            
            // Switch to station view and update UI
            this.gameState = 'station';
            this.stationManager.updateShipCapabilities(this);
            this.stationManager.updateStationDisplay(this.totalResources, this.station);
            this.ui.switchToStationUI();
            this.ui.updateGameUI(this); // Force UI refresh to show empty cargo
            
            // Clear any lingering fuel warnings
            this.ui.removeNotificationsOfType('warning');
            this.ui.removeNotificationsOfType('error');
            
            // Reset warning flags
            this.emergencyWarningShown = false;
            this.autoReturnTriggered = false;
            this.miningFuelWarningShown = false;
            this.ui.criticalFuelWarningShown = false;
            this.ui.lowFuelWarningShown = false;
            
            // Show docking confirmation with error handling
            if (resourceValue > 0) {
                this.ui.showStationDocked(resourceValue);
            } else {
                this.ui.showNotification('🏠 Docked at station - ready for next expedition!', 'info', 3000);
            }
            
        } catch (error) {
            console.error('Error during station docking:', error);
            this.ui.showNotification('🚨 Docking error - some progress may be lost', 'error', 5000);
            
            // Fallback: ensure game state is still playable
            this.gameState = 'station';
            this.expedition.returnToStation = false;
            this.ship.cargo = []; // Emergency cargo clear
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
    
    // New method to handle victory condition
    handleVictory() {
        // Save final progress
        localStorage.setItem('totalResources', this.totalResources.toString());
        this.resourceManager.saveDiscoveredArtifacts(this.discoveredArtifacts);
        
        // Show victory screen
        this.ui.showVictoryScreen();
        
        console.log('🎉 VICTORY! All 5 Master Artifacts collected!');
    }
    
    // Help system
    showHelpSystem() {
        const helpContent = `🌟 COSMIC COLLECTION STATION v${this.version} 🌟

🚀 CONTROLS:
• WASD/Arrow Keys: Move ship
• Space: Scanner pulse (reveals artifacts) | Continue through popups
• X: Toggle auto-mining/manual mode
• R: Return to station early
• Tab: Switch between mining/station
• H: Show this help
• P: Show Master Artifact progress (while mining)
• ~ (tilde): Developer cheats menu

🎯 MASTER ARTIFACTS (Victory Goal):
• 📚 Knowledge: Find 3+ epic artifacts in one expedition
• 🌱 Growth: Collect 50+ resources in one expedition  
• ⭐ Energy: Achieve 90%+ efficiency in Field 5
• 🕰️ Time: Visit 20+ fields in your career
• 🌌 Unity: Collect all other 4 Master Artifacts

🏗️ STATION BUILDING:
• Build Storage Bay for more cargo space
• Build Research Lab to unlock advanced modules
• Build Workshop for stronger mining laser
• Build Observatory for better scanning
• Build Master Vault when you have all 5 Master Artifacts

💡 TIPS:
• Deeper fields have better rewards but cost more fuel
• Rare asteroids (pink) give more resources
• Epic/Legendary artifacts are worth lots of research
• Auto-mining is on by default - very convenient!
• Session stats reset each expedition
• Watch the top bar for real-time session progress
• Auto-scan activates when entering artifact-rich fields

🎮 QUALITY OF LIFE:
• Press Space or Enter to continue through popups
• Use Escape to cancel/go back in dialogs
• Master Artifact progress shown at expedition start
• Session stats displayed in expedition header
• Help available anytime with H key

📊 GAME INFO:
• Version: ${this.version}
• Save Version: ${this.saveVersion}
• Current FPS: ${this.performance.currentFPS}
• Average FPS: ${this.performance.averageFPS}

🎨 CREDITS:
• Game Design & Development: AI Assistant & Human Collaboration
• Built for Mini Jam 185 - Theme: Aliens & Limited Space
• Created with HTML5 Canvas, JavaScript, and CSS`;

        this.ui.showAlert('Help & Guide', helpContent);
    }

    // Show current Master Artifact progress
    showMasterArtifactProgress() {
        const progress = this.resourceManager.getMasterArtifactProgress(this.sessionStats);
        
        // Add helpful tips for achieving conditions
        const tips = [];
        
        if (!progress.knowledge.collected && progress.knowledge.current < progress.knowledge.required) {
            tips.push(`💡 Knowledge: Look for purple/legendary artifacts - they're usually epic!`);
        }
        
        if (!progress.growth.collected && progress.growth.current < progress.growth.required) {
            const needed = progress.growth.required - progress.growth.current;
            tips.push(`💡 Growth: Mine ${needed} more resources this expedition (target rare asteroids!)`);
        }
        
        if (!progress.energy.collected && this.expedition.currentField === 5) {
            const currentEfficiency = (progress.energy.current * 100).toFixed(1);
            if (progress.energy.current < progress.energy.required) {
                tips.push(`💡 Energy: Current efficiency ${currentEfficiency}% - target rare asteroids for better efficiency!`);
            }
        }
        
        if (!progress.time.collected) {
            const needed = progress.time.required - progress.time.current;
            tips.push(`💡 Time: Visit ${needed} more fields in your career (keep exploring!)`);
        }
        
        this.ui.showMasterArtifactProgress(progress, tips);
    }
    
    // Simple cheat system for testing/demo
    showCheatMenu() {
        const cheatOptions = [
            { text: 'Add 1000 Resources', action: () => this.addResources(1000) },
            { text: 'Boost Session Stats', action: () => this.boostSessionStats() },
            { text: 'Unlock Master Vault', action: () => this.unlockMasterVault() },
            { text: 'Reset Progress', action: () => this.resetProgress() },
            { text: 'Cancel', action: () => {} }
        ];
        
        const cheatText = `🔧 DEVELOPER CHEATS 🔧\n\nFor testing and demonstration purposes.\nSelect an option:`;
        
        this.ui.showModal('Developer Cheats', cheatText, 
            cheatOptions.map((option, index) => ({
                text: option.text,
                class: index === cheatOptions.length - 1 ? 'secondary' : 'primary',
                value: index
            }))
        ).then(selectedIndex => {
            if (selectedIndex >= 0 && selectedIndex < cheatOptions.length) {
                cheatOptions[selectedIndex].action();
            }
        });
    }
    
    addResources(amount) {
        this.totalResources += amount;
        localStorage.setItem('totalResources', this.totalResources.toString());
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
        this.ui.showNotification(`🔧 Added ${amount} resources (cheat)`, 'info', 3000);
    }
    
    boostSessionStats() {
        this.sessionStats.resourcesCollected = 60;
        this.sessionStats.epicArtifactsFound = 5;
        this.sessionStats.miningEfficiency = 1.0;
        this.resourceManager.updatePlayerStats({
            fieldsVisited: this.resourceManager.playerStats.fieldsVisited + 25
        });
        this.ui.showNotification('🔧 Boosted session stats for Master Artifacts (cheat)', 'info', 3000);
    }
    
    unlockMasterVault() {
        // Simulate having all Master Artifacts
        this.resourceManager.playerStats.masterArtifactsCollected = ['knowledge', 'growth', 'energy', 'time'];
        this.resourceManager.savePlayerStats();
        this.stationManager.unlockModules(this.station, this.resourceManager);
        this.stationManager.updateStationDisplay(this.totalResources, this.station);
        this.ui.showNotification('🔧 Unlocked Master Vault (cheat)', 'info', 3000);
    }
    
    resetProgress() {
        localStorage.clear();
        this.ui.showNotification('🔧 Progress reset - reload page to restart', 'warning', 5000);
    }
    
    showResetConfirmation() {
        this.ui.showModal(
            '⚠️ Reset Game Progress',
            'Are you sure you want to reset ALL game progress? This will:\n\n• Clear all resources and station modules\n• Reset Master Artifact progress\n• Clear all discovered artifacts\n• Reset station building progress\n\nThis action cannot be undone!',
            [
                { text: 'Cancel', class: 'secondary', value: 'cancel' },
                { text: 'Reset Everything', class: 'primary', value: 'confirm', style: 'background: #f44336; border-color: #f44336;' }
            ]
        ).then(result => {
            if (result === 'confirm') {
                this.performReset();
            }
        });
    }
    
    performReset() {
        // Clear all localStorage data
        localStorage.clear();
        
        // Show confirmation and reload instructions
        this.ui.showNotification('🔄 Game progress reset! Reloading page...', 'warning', 3000);
        
        // Auto-reload after a brief delay
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
    
    checkFirstTimePlayer() {
        const isFirstTime = !localStorage.getItem('hasPlayedBefore');
        const tutorialComplete = localStorage.getItem('tutorialComplete');
        
        if (isFirstTime) {
            localStorage.setItem('hasPlayedBefore', 'true');
            
            // Show welcome sequence for brand new players
            setTimeout(() => {
                this.showWelcomeSequence();
            }, 3000); // After title fade
        } else if (!tutorialComplete && this.sessionStats.totalAsteroidsMined < 10) {
            // Show quick reminder for players who haven't completed basic tutorial
            setTimeout(() => {
                this.ui.showNotification('💡 Press H for help, Space to scan for artifacts!', 'info', 5000);
            }, 2000);
        }
    }
    
    showWelcomeSequence() {
        this.ui.showModal(
            '🌟 Welcome to Cosmic Collection Station!',
            `🚀 GETTING STARTED:

🎯 Your Goal: Build an amazing space station and collect 5 Master Artifacts!

⚡ AUTO-MINING: Enabled by default - your ship automatically targets asteroids
🎮 WASD: Move your ship around
⭐ SPACE: Scanner pulse to find artifacts
🏠 TAB: Switch between mining and station building

💡 Start by mining some asteroids, then return to build your station!

Ready to begin your cosmic adventure?`,
            [
                { text: 'Start Playing!', class: 'primary', value: true },
                { text: 'Show Full Help', class: 'secondary', value: false }
            ]
        ).then(startPlaying => {
            if (startPlaying) {
                this.ui.showNotification('🎮 Auto-mining is active! WASD to move, Space to scan!', 'success', 6000);
                localStorage.setItem('tutorialComplete', 'basic');
            } else {
                this.showHelpSystem();
            }
        });
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new CosmicCollectionStation();
}); 