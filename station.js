// Station management system for Cosmic Collection Station
class StationManager {
    constructor() {
        this.modules = {
            command: { name: 'Command Pod', icon: '🏠', cost: 0, unlocked: true, built: true },
            storage: { name: 'Storage Bay', icon: '📦', cost: 8, unlocked: true, built: false },
            research: { name: 'Research Lab', icon: '🔬', cost: 12, unlocked: true, built: false },
            workshop: { name: 'Workshop', icon: '🔧', cost: 20, unlocked: false, built: false },
            greenhouse: { name: 'Greenhouse', icon: '🌱', cost: 30, unlocked: false, built: false },
            observatory: { name: 'Observatory', icon: '🔭', cost: 35, unlocked: false, built: false },
            quarters: { name: 'Guest Quarters', icon: '🛏️', cost: 45, unlocked: false, built: false },
            vault: { name: 'Master Vault', icon: '🌌', cost: 100, unlocked: false, built: false, description: 'Requires all 5 Master Artifacts' }
        };
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

    saveStationGrid(grid) {
        try {
            localStorage.setItem('stationGrid', JSON.stringify(grid));
        } catch (e) {
            console.warn('Failed to save station grid:', e);
        }
    }

    calculateStationSize(grid) {
        if (!grid || Object.keys(grid).length === 0) return 1;
        
        let minX = 2, maxX = 2, minY = 2, maxY = 2;
        Object.keys(grid).forEach(pos => {
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

    calculateStationTier(grid) {
        if (!grid) return 1;
        
        const builtCount = Object.keys(grid).length;
        if (builtCount >= 25) return 5;
        if (builtCount >= 16) return 4;
        if (builtCount >= 9) return 3;
        if (builtCount >= 4) return 2;
        return 1;
    }

    createStationGrid(grid, game) {
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
                const moduleType = grid[`${x},${y}`];
                if (moduleType) {
                    cell.classList.add('built');
                    const module = this.modules[moduleType];
                    if (module) {
                        cell.innerHTML = `
                            <div class="module-icon">${module.icon}</div>
                            <div class="module-name">${module.name}</div>
                        `;
                    }
                } else if (this.canBuildAt(x, y, grid)) {
                    cell.classList.add('available');
                } else {
                    cell.classList.add('unavailable');
                }
                
                cell.addEventListener('click', () => this.handleGridClick(x, y, game));
                gridContainer.appendChild(cell);
            }
            gridContainer.appendChild(document.createElement('br'));
        }
    }

    populateModuleList(totalResources, grid) {
        const moduleList = document.getElementById('moduleList');
        moduleList.innerHTML = '';
        
        Object.entries(this.modules).forEach(([key, module]) => {
            if (!module.unlocked) return;
            
            const item = document.createElement('div');
            item.className = 'module-item';
            
            const canAfford = totalResources >= module.cost;
            const alreadyBuilt = module.built || Object.values(grid).includes(key);
            
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
        this.selectedModule = moduleKey;
        
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

    canBuildAt(x, y, grid) {
        if (!grid) return false;
        
        // Can't build if already occupied
        if (grid[`${x},${y}`]) return false;
        
        // Must be adjacent to existing module
        const adjacent = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        return adjacent.some(([ax, ay]) => {
            return grid[`${ax},${ay}`];
        });
    }

    handleGridClick(x, y, game) {
        if (!this.selectedModule) return;
        if (!this.canBuildAt(x, y, game.station.grid)) return;
        
        const module = this.modules[this.selectedModule];
        if (!module || game.totalResources < module.cost) return;
        
        // Build the module
        game.station.grid[`${x},${y}`] = this.selectedModule;
        game.totalResources -= module.cost;
        module.built = true;
        
        // Update station stats
        game.station.size = this.calculateStationSize(game.station.grid);
        game.station.tier = this.calculateStationTier(game.station.grid);
        
        // Save progress immediately
        this.saveStationGrid(game.station.grid);
        this.saveModuleStates();
        try {
            localStorage.setItem('totalResources', game.totalResources.toString());
        } catch (e) {
            console.warn('Failed to save resources:', e);
        }
        
        // Update ship capabilities first
        this.updateShipCapabilities(game);
        
        // Unlock new modules based on what was built
        this.unlockModules(game.station, game.resourceManager);
        
        // Update all displays
        this.createStationGrid(game.station.grid, game);
        this.populateModuleList(game.totalResources, game.station.grid);
        this.updateStationDisplay(game.totalResources, game.station);
        
        // Clear selection
        this.selectedModule = null;
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        console.log('Built module:', this.selectedModule, 'New capabilities:', {
            maxCargo: game.ship.maxCargo,
            laserPower: game.laser.power,
            maxFuel: game.ship.maxFuel
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

    updateShipCapabilities(game) {
        if (!this.modules) return;
        
        // Reset to base values first
        game.ship.maxCargo = 4; // Reduced base capacity
        game.laser.power = 1.5; // Increased base power  
        game.ship.maxFuel = 80; // Reduced base fuel
        
        // Storage Bay increases cargo capacity significantly
        if (this.modules.storage && this.modules.storage.built) {
            game.ship.maxCargo = 8; // Doubled capacity upgrade
        }
        
        // Workshop increases mining power substantially
        if (this.modules.workshop && this.modules.workshop.built) {
            game.laser.power = 3.5; // Much more impactful upgrade
        }
        
        // Greenhouse provides fuel efficiency AND capacity
        if (this.modules.greenhouse && this.modules.greenhouse.built) {
            game.ship.maxFuel = 150; // More meaningful fuel upgrade
        }
        
        // Observatory adds scanner efficiency (new bonus)
        if (this.modules.observatory && this.modules.observatory.built) {
            game.scanner.speed = 12; // Faster scanner
            game.scanner.maxRadius = 300; // Larger range
        }
    }

    unlockModules(station, resourceManager = null) {
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
        if (station && station.grid && Object.keys(station.grid).length >= 6) {
            this.modules.quarters.unlocked = true;
        }
        
        // Master Vault: Requires all 5 Master Artifacts
        if (resourceManager) {
            const masterStatus = resourceManager.getMasterArtifactStatus();
            if (masterStatus.collected === 5) {
                this.modules.vault.unlocked = true;
            }
        }
    }

    updateStationDisplay(totalResources, station) {
        const resourceEl = document.getElementById('stationResourceCount');
        const gridSizeEl = document.getElementById('gridSize');
        const tierEl = document.getElementById('stationTier');
        
        if (resourceEl) resourceEl.textContent = totalResources;
        if (gridSizeEl && station) gridSizeEl.textContent = `${station.size}x${station.size}`;
        if (tierEl && station) tierEl.textContent = station.tier;
        
        this.unlockModules(station);
    }
} 