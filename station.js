// Station management system for Cosmic Collection Station
class StationManager {
    constructor() {
        this.modules = {
            command: { 
                name: 'Command Pod', 
                icon: '🏠', 
                cost: [0, 0, 0], 
                tier: 1,
                unlocked: true, 
                built: true,
                description: 'Central hub of your station',
                benefits: ['Base docking capability', 'Station network core', 'Emergency systems'],
                stationTierBonus: [0, 0, 0]
            },
            storage: { 
                name: 'Storage Bay', 
                icon: '📦', 
                cost: [8, 25, 60], 
                tier: 1,
                unlocked: true, 
                built: false,
                description: 'Specialized resource storage',
                benefits: ['+25 storage capacity', '+50 storage + sorting', '+100 storage + quantum compression'],
                storageTypes: ['basic', 'specialized', 'quantum'],
                stationTierBonus: [5, 10, 20]
            },
            research: { 
                name: 'Research Lab', 
                icon: '🔬', 
                cost: [12, 35, 80], 
                tier: 1,
                unlocked: true, 
                built: false,
                description: 'Analyze artifacts and unlock blueprints',
                benefits: ['Basic analysis', 'Advanced research', 'Quantum archaeology'],
                researchSpeed: [1, 2, 4],
                artifactBonus: [1, 1.5, 2.5],
                stationTierBonus: [2, 5, 10]
            },
            workshop: { 
                name: 'Workshop', 
                icon: '🔧', 
                cost: [20, 50, 120], 
                tier: 1,
                unlocked: false, 
                built: false,
                description: 'Craft equipment and ship upgrades',
                benefits: ['Basic tools', 'Advanced manufacturing', 'Nano-fabrication'],
                efficiency: [1, 1.5, 2.5],
                miningBonus: [0.5, 1.0, 2.0],
                stationTierBonus: [3, 7, 15]
            },
            greenhouse: { 
                name: 'Greenhouse', 
                icon: '🌱', 
                cost: [30, 70, 150], 
                tier: 1,
                unlocked: false, 
                built: false,
                description: 'Fuel production and life support',
                benefits: ['+20 fuel capacity', '+40 fuel + efficiency', '+80 fuel + regeneration'],
                fuelBonus: [20, 40, 80],
                efficiency: [1, 1.25, 1.5],
                fuelRegen: [0, 0.1, 0.25],
                stationTierBonus: [2, 5, 10]
            },
            garden: {
                name: 'Hydro Garden',
                icon: '🌿',
                cost: [25, 60, 140],
                tier: 1,
                unlocked: false,
                built: false,
                description: 'Advanced biological research and crew comfort',
                benefits: ['Basic bio-processing', 'Enhanced crew efficiency', 'Exotic bio-synthesis'],
                efficiency: [1, 1.3, 1.8],
                comfortBonus: [0.1, 0.25, 0.5],
                bioResourceMultiplier: [1.2, 1.5, 2.0],
                stationTierBonus: [2, 4, 8]
            },
            observatory: { 
                name: 'Observatory', 
                icon: '🔭', 
                cost: [35, 80, 180], 
                tier: 1,
                unlocked: false, 
                built: false,
                description: 'Enhanced scanner and navigation',
                benefits: ['+25% scanner range', '+50% range + speed', '+100% range + deep space detection'],
                scanBonus: [1.25, 1.5, 2.0],
                artifactDetection: [1, 1.5, 2.5],
                fieldDiscoveryBonus: [0, 0.1, 0.25],
                stationTierBonus: [3, 6, 12]
            },
            factory: {
                name: 'Auto-Factory',
                icon: '🏭',
                cost: [50, 120, 250],
                tier: 1,
                unlocked: false,
                built: false,
                description: 'Automated resource processing and refinement',
                benefits: ['Basic automation', 'Advanced processing', 'Quantum manufacturing'],
                efficiency: [1.2, 1.6, 2.5],
                resourceMultiplier: [1.1, 1.3, 1.8],
                automationLevel: [0.1, 0.3, 0.6],
                stationTierBonus: [4, 8, 16]
            },
            quarters: { 
                name: 'Crew Quarters', 
                icon: '🛏️', 
                cost: [45, 100, 200], 
                tier: 1,
                unlocked: false, 
                built: false,
                description: 'Advanced station operations and crew support',
                benefits: ['Basic crew support', 'Automated systems', 'AI assistance'],
                automation: [0, 0.1, 0.25],
                efficiencyBonus: [0.05, 0.15, 0.3],
                stationTierBonus: [3, 6, 12]
            },
            reactor: {
                name: 'Fusion Reactor',
                icon: '⚛️',
                cost: [80, 180, 350],
                tier: 1,
                unlocked: false,
                built: false,
                description: 'Power generation and energy management',
                benefits: ['Basic power grid', 'Enhanced energy systems', 'Quantum power core'],
                powerOutput: [1, 2, 4],
                efficiencyBonus: [0.1, 0.25, 0.5],
                stationWideBonus: [0.05, 0.15, 0.3],
                stationTierBonus: [5, 10, 20]
            },
            vault: { 
                name: 'Master Vault', 
                icon: '🌌', 
                cost: [100, 250, 500], 
                tier: 1,
                unlocked: false, 
                built: false, 
                description: 'Houses Master Artifacts and cosmic technologies',
                benefits: ['Artifact storage', 'Quantum resonance', 'Cosmic convergence'],
                masterArtifactBonus: [1, 1.5, 2.0],
                cosmicEfficiency: [1, 1.3, 2.0],
                stationTierBonus: [10, 20, 50]
            }
        };

        // Resource types for specialized storage
        this.resourceTypes = {
            basic: { name: 'Basic Materials', icon: '⚙️', color: '#888888' },
            precious: { name: 'Precious Metals', icon: '💎', color: '#FFD700' },
            energy: { name: 'Energy Crystals', icon: '⚡', color: '#00FFFF' },
            biological: { name: 'Bio-Matter', icon: '🧬', color: '#00FF00' },
            quantum: { name: 'Quantum Materials', icon: '🔮', color: '#9966FF' }
        };

        // Track station efficiency bonuses
        this.adjacencyBonuses = new Map();
        this.specializationBonuses = new Map();
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
        
        // Calculate adjacency bonuses first
        this.calculateAdjacencyBonuses(grid);
        
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
                        const tier = module.tier || 1;
                        cell.dataset.tier = tier;
                        
                        let tierDisplay = '';
                        if (tier > 1) {
                            tierDisplay = `<span class="tier-indicator">T${tier}</span>`;
                        }
                        
                        // Check for adjacency bonus
                        const adjacencyBonus = this.adjacencyBonuses.get(`${x},${y}`);
                        let efficiencyDisplay = '';
                        if (adjacencyBonus) {
                            const bonusPercent = Math.round((adjacencyBonus.multiplier - 1) * 100);
                            efficiencyDisplay = `<div class="efficiency-badge">+${bonusPercent}%</div>`;
                        }
                        
                        cell.innerHTML = `
                            <div class="module-icon">${module.icon}</div>
                            <div class="module-name">${module.name} ${tierDisplay}</div>
                            ${efficiencyDisplay}
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
            
            const currentTier = module.tier || 1;
            const currentCost = Array.isArray(module.cost) ? module.cost[currentTier - 1] : module.cost;
            const nextTierCost = Array.isArray(module.cost) ? module.cost[currentTier] : null;
            
            const canAfford = totalResources >= currentCost;
            const alreadyBuilt = module.built || Object.values(grid).includes(key);
            const canUpgrade = alreadyBuilt && currentTier < 3 && nextTierCost && totalResources >= nextTierCost;
            
            if (!canAfford && !alreadyBuilt) {
                item.classList.add('unavailable');
            }
            
            if (canUpgrade) {
                item.classList.add('upgradeable');
            }
            
            // Tier indicator
            let tierDisplay = '';
            if (currentTier > 1) {
                tierDisplay = `<span class="tier-indicator">T${currentTier}</span>`;
            }
            
            // Cost/action text with better styling
            let actionText = '';
            let costClass = '';
            if (!alreadyBuilt) {
                actionText = `${currentCost}💎`;
                costClass = canAfford ? 'affordable' : 'expensive';
            } else if (canUpgrade) {
                actionText = `⬆ ${nextTierCost}💎`;
                costClass = 'affordable';
            } else if (currentTier >= 3) {
                actionText = 'MAX';
                costClass = 'max';
            } else {
                actionText = 'Built';
                costClass = 'built';
            }
            
            item.innerHTML = `
                <div class="module-header">
                    <div class="module-title">
                        <span>${module.icon}</span>
                        <span>${module.name}</span>
                        ${tierDisplay}
                    </div>
                    <div class="module-cost ${costClass}">
                        ${actionText}
                    </div>
                </div>
                <div class="module-benefits">
                    ${module.benefits ? module.benefits[currentTier - 1] : ''}
                </div>
            `;
            
            if ((canAfford && !alreadyBuilt) || canUpgrade) {
                item.addEventListener('click', () => {
                    if (canUpgrade) {
                        const upgradeCost = this.upgradeModule(key, totalResources, grid);
                        if (upgradeCost && window.game) {
                            // Deduct resources from game
                            window.game.totalResources -= upgradeCost;
                            
                            // Save the updated resources
                            try {
                                localStorage.setItem('totalResources', window.game.totalResources.toString());
                            } catch (e) {
                                console.warn('Failed to save resources:', e);
                            }
                            
                            // Update ship capabilities with new tier
                            this.updateShipCapabilities(window.game);
                            
                            // Immediately refresh all displays to show the upgrade
                            this.createStationGrid(grid, window.game);
                            this.populateModuleList(window.game.totalResources, grid);
                            this.updateStationDisplay(window.game.totalResources, window.game.station);
                        }
                    } else {
                        // For new builds, select the module
                        this.selectModule(key);
                        
                        // Update UI to show selection
                        document.querySelectorAll('.module-item').forEach(i => i.classList.remove('selected'));
                        item.classList.add('selected');
                        
                        // Show helpful instruction
                        if (window.game && window.game.ui) {
                            window.game.ui.showNotification(
                                `✅ ${this.modules[key].name} selected! Click a green grid cell to build.`, 
                                'info', 
                                3000
                            );
                        }
                    }
                });
            }
            
            moduleList.appendChild(item);
        });
        
        // Add adjacency bonus display
        this.updateAdjacencyDisplay(grid);
        
        // Update module count
        this.updateModuleCount(grid);
    }

    updateModuleCount(grid) {
        const moduleCount = document.getElementById('moduleCount');
        if (moduleCount) {
            const count = Object.keys(grid).length;
            moduleCount.textContent = count;
        }
    }

    selectModule(moduleKey) {
        // Store selection in the game object for consistency
        if (window.game && window.game.station) {
            window.game.station.selectedModule = moduleKey;
        }
        
        // Also store locally for fallback
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
        
        console.log('Module selected:', moduleKey);
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
        try {
            const posKey = `${x},${y}`;
            
            // Validate coordinates are within bounds
            if (x < 0 || x >= 5 || y < 0 || y >= 5) {
                console.warn('Grid click outside valid bounds:', x, y);
                return;
            }
            
            // Check if cell is already occupied
            if (game.station.grid[posKey]) {
                const existingModule = game.station.grid[posKey];
                const moduleData = this.modules[existingModule];
                
                if (!moduleData) {
                    console.error('Invalid module data for:', existingModule);
                    return;
                }
                
                // Try to upgrade existing module
                const upgraded = this.upgradeModule(existingModule, game.totalResources, game.station.grid);
                if (upgraded.success) {
                    game.totalResources = upgraded.newTotal;
                    
                    // Save progress
                    try {
                        localStorage.setItem('totalResources', game.totalResources.toString());
                        this.saveModuleStates();
                        this.saveStationGrid(game.station.grid);
                    } catch (saveError) {
                        console.warn('Failed to save upgrade progress:', saveError);
                        game.ui.showNotification('⚠️ Upgrade saved locally but may not persist', 'warning', 4000);
                    }
                    
                    // Immediately refresh the UI to show upgrade
                    this.createStationGrid(game.station.grid, game);
                    this.populateModuleList(game.totalResources, game.station.grid);
                    this.updateStationDisplay(game.totalResources, game.station);
                    this.updateShipCapabilities(game);
                    
                    game.ui.showNotification(upgraded.message, 'success', 4000);
                } else {
                    game.ui.showNotification(upgraded.message, 'warning', 3000);
                }
                return;
            }
            
            // Check if we have a module selected for building
            if (!game.station.selectedModule) {
                console.warn('No module selected for building');
                game.ui.showNotification('Select a module first, then click a green cell to build', 'info', 3000);
                return;
            }
            
            console.log('Building attempt:', {
                selectedModule: game.station.selectedModule,
                position: posKey,
                resources: game.totalResources
            });
            
            // Validate the selected module exists
            const moduleType = game.station.selectedModule;
            const moduleData = this.modules[moduleType];
            
            if (!moduleData) {
                console.error('Invalid selected module:', moduleType);
                game.station.selectedModule = null;
                this.updateStationDisplay(game.totalResources, game.station);
                return;
            }
            
            // Check if module is unlocked
            if (!moduleData.unlocked) {
                game.ui.showNotification(`${moduleData.name} is not yet unlocked`, 'warning', 3000);
                return;
            }
            
            // Check if we can build at this location
            if (!this.canBuildAt(x, y, game.station.grid)) {
                game.ui.showNotification('Cannot build here - must be adjacent to existing modules', 'warning', 3000);
                return;
            }
            
            // Check resource cost
            const cost = moduleData.cost[moduleData.tier - 1] || moduleData.cost[0];
            if (game.totalResources < cost) {
                const shortfall = cost - game.totalResources;
                game.ui.showNotification(
                    `💎 Need ${cost} resources to build ${moduleData.name} (you have ${game.totalResources}, need ${shortfall} more)`, 
                    'warning', 
                    4000
                );
                return;
            }
            
            // All checks passed - build the module
            game.station.grid[posKey] = moduleType;
            game.totalResources -= cost;
            moduleData.built = true;
            
            // Update station stats
            game.station.size = this.calculateStationSize(game.station.grid);
            game.station.tier = this.calculateStationTier(game.station.grid);
            
            // Clear selection
            game.station.selectedModule = null;
            this.selectedModule = null; // Also clear local fallback
            
            // Clear visual selection from module list
            document.querySelectorAll('.module-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Save progress with error handling
            try {
                localStorage.setItem('totalResources', game.totalResources.toString());
                this.saveModuleStates();
                this.saveStationGrid(game.station.grid);
            } catch (saveError) {
                console.warn('Failed to save building progress:', saveError);
                game.ui.showNotification('⚠️ Module built but save failed - progress may be lost', 'warning', 5000);
            }
            
            // Update displays and capabilities
            this.updateStationDisplay(game.totalResources, game.station);
            this.updateShipCapabilities(game);
            this.unlockModules(game.station, game.resourceManager);
            
            // Immediately refresh the station grid and module list to show changes
            this.createStationGrid(game.station.grid, game);
            this.populateModuleList(game.totalResources, game.station.grid);
            
            // Add a satisfying build effect to the newly built cell
            setTimeout(() => {
                const builtCell = document.querySelector(`[data-pos="${posKey}"]`);
                if (builtCell) {
                    builtCell.style.animation = 'buildPulse 0.8s ease-out';
                    setTimeout(() => {
                        builtCell.style.animation = '';
                    }, 800);
                }
            }, 100);
            
            // Success notification
            game.ui.showNotification(
                `✅ Built ${moduleData.name}! Station tier: ${game.station.tier}`, 
                'success', 
                4000
            );
            
            console.log('Module built successfully:', {
                module: moduleData.name,
                position: posKey,
                cost: cost,
                remainingResources: game.totalResources,
                stationTier: game.station.tier
            });
            
        } catch (error) {
            console.error('Error in handleGridClick:', error);
            game.ui.showNotification('🚨 Building error - please try again', 'error', 4000);
            
            // Reset selection to prevent stuck state
            game.station.selectedModule = null;
            this.selectedModule = null; // Also clear local fallback
            this.updateStationDisplay(game.totalResources, game.station);
        }
    }

    saveModuleStates() {
        try {
            const moduleStates = {};
            Object.entries(this.modules).forEach(([key, module]) => {
                moduleStates[key] = {
                    built: module.built,
                    unlocked: module.unlocked,
                    tier: module.tier || 1
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
                        this.modules[key].tier = state.tier || 1;
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
        game.ship.maxCargo = 6; // Slightly higher base capacity
        game.laser.power = 1.5; // Base power  
        game.ship.maxFuel = 120; // Generous base fuel to prevent softlocks
        
        // Initialize additional capabilities
        if (!game.ship.fuelEfficiency) game.ship.fuelEfficiency = 1;
        if (!game.scanner) game.scanner = { speed: 8, maxRadius: 200, artifactDetection: 1 };
        if (!game.research) game.research = { speed: 1 };
        if (!game.automation) game.automation = { level: 0 };
        
        // Station tier bonuses
        const stationTier = this.calculateStationTier(game.station.grid);
        const tierMultiplier = 1 + (stationTier - 1) * 0.1; // 10% bonus per tier above 1
        
        // Calculate total station tier bonus from all modules
        let totalStationTierBonus = 0;
        
        // Calculate capabilities based on built modules and their tiers
        Object.keys(game.station.grid).forEach(pos => {
            const moduleType = game.station.grid[pos];
            const module = this.modules[moduleType];
            if (!module || !module.built) return;
            
            const tier = module.tier || 1;
            const efficiency = this.getModuleEfficiency(moduleType, pos, game.station.grid);
            
            // Add station tier bonus
            if (module.stationTierBonus) {
                totalStationTierBonus += module.stationTierBonus[tier - 1] * efficiency;
            }
            
            switch (moduleType) {
                case 'storage':
                    // Storage increases cargo capacity based on tier and efficiency
                    const cargoIncrease = [4, 8, 16][tier - 1] || 4;
                    game.ship.maxCargo += Math.floor(cargoIncrease * efficiency * tierMultiplier);
                    break;
                    
                case 'workshop':
                    // Workshop increases mining power based on tier and efficiency
                    const powerIncrease = [2, 4, 8][tier - 1] || 2;
                    const miningBonus = module.miningBonus[tier - 1] || 0.5;
                    game.laser.power += (powerIncrease + miningBonus) * efficiency * tierMultiplier;
                    break;
                    
                case 'greenhouse':
                    // Greenhouse increases fuel capacity and efficiency
                    const fuelIncrease = module.fuelBonus[tier - 1] || 20;
                    game.ship.maxFuel += Math.floor(fuelIncrease * efficiency * tierMultiplier);
                    
                    // Higher tiers improve fuel efficiency and regeneration
                    if (tier >= 2) {
                        game.ship.fuelEfficiency *= module.efficiency[tier - 1] * efficiency;
                    }
                    if (tier >= 3 && module.fuelRegen[tier - 1] > 0) {
                        game.ship.fuelRegenRate = module.fuelRegen[tier - 1] * efficiency;
                    }
                    break;
                    
                case 'garden':
                    // Garden provides bio-resource bonuses and crew comfort
                    const comfortBonus = module.comfortBonus[tier - 1] || 0.1;
                    const bioMultiplier = module.bioResourceMultiplier[tier - 1] || 1.2;
                    
                    // Garden improves overall station efficiency
                    game.garden = {
                        comfortBonus: comfortBonus * efficiency,
                        bioMultiplier: bioMultiplier * efficiency,
                        tier: tier
                    };
                    break;
                    
                case 'observatory':
                    // Observatory improves scanner capabilities
                    const scanBonus = module.scanBonus[tier - 1] || 1.25;
                    game.scanner.speed = Math.floor(12 * scanBonus * efficiency * tierMultiplier);
                    game.scanner.maxRadius = Math.floor(300 * scanBonus * efficiency * tierMultiplier);
                    
                    // Higher tiers improve artifact detection
                    if (tier >= 2) {
                        game.scanner.artifactDetection = module.artifactDetection[tier - 1] * efficiency;
                    }
                    
                    // Field discovery bonus for deeper exploration
                    if (module.fieldDiscoveryBonus && module.fieldDiscoveryBonus[tier - 1] > 0) {
                        game.scanner.fieldDiscoveryBonus = module.fieldDiscoveryBonus[tier - 1] * efficiency;
                    }
                    break;
                    
                case 'factory':
                    // Factory provides automation and resource processing
                    const resourceMultiplier = module.resourceMultiplier[tier - 1] || 1.1;
                    const automationLevel = module.automationLevel[tier - 1] || 0.1;
                    
                    game.factory = {
                        resourceMultiplier: resourceMultiplier * efficiency,
                        automationLevel: automationLevel * efficiency,
                        tier: tier
                    };
                    break;
                    
                case 'research':
                    // Research lab improves artifact analysis speed
                    const researchSpeed = module.researchSpeed[tier - 1] || 1;
                    const artifactBonus = module.artifactBonus[tier - 1] || 1;
                    game.research.speed = researchSpeed * efficiency * tierMultiplier;
                    game.research.artifactBonus = artifactBonus * efficiency;
                    break;
                    
                case 'quarters':
                    // Quarters provide automation bonuses and crew efficiency
                    const automation = module.automation[tier - 1] || 0;
                    const efficiencyBonus = module.efficiencyBonus[tier - 1] || 0.05;
                    game.automation.level += automation * efficiency;
                    game.automation.efficiencyBonus = efficiencyBonus * efficiency;
                    break;
                    
                case 'reactor':
                    // Reactor provides power and station-wide bonuses
                    const powerOutput = module.powerOutput[tier - 1] || 1;
                    const stationWideBonus = module.stationWideBonus[tier - 1] || 0.05;
                    
                    game.reactor = {
                        powerOutput: powerOutput * efficiency,
                        stationWideBonus: stationWideBonus * efficiency,
                        tier: tier
                    };
                    break;
                    
                case 'vault':
                    // Vault enhances Master Artifact bonuses
                    const masterBonus = module.masterArtifactBonus[tier - 1] || 1;
                    const cosmicEfficiency = module.cosmicEfficiency[tier - 1] || 1;
                    game.masterArtifactBonus = masterBonus * efficiency;
                    game.vault = {
                        cosmicEfficiency: cosmicEfficiency * efficiency,
                        tier: tier
                    };
                    break;
            }
        });
        
        // Apply reactor station-wide bonus if present
        if (game.reactor && game.reactor.stationWideBonus > 0) {
            const reactorBonus = 1 + game.reactor.stationWideBonus;
            game.ship.maxCargo = Math.floor(game.ship.maxCargo * reactorBonus);
            game.laser.power *= reactorBonus;
            game.ship.maxFuel = Math.floor(game.ship.maxFuel * reactorBonus);
        }
        
        // Apply garden comfort bonus to all systems
        if (game.garden && game.garden.comfortBonus > 0) {
            const comfortBonus = 1 + game.garden.comfortBonus;
            game.ship.fuelEfficiency *= comfortBonus;
            if (game.scanner) game.scanner.speed = Math.floor(game.scanner.speed * comfortBonus);
        }
        
        // Apply automation efficiency bonus
        if (game.automation && game.automation.efficiencyBonus > 0) {
            const autoBonus = 1 + game.automation.efficiencyBonus;
            game.laser.power *= autoBonus;
        }
        
        // Apply total station tier bonus as resources
        if (totalStationTierBonus > 0) {
            game.stationTierResourceBonus = Math.floor(totalStationTierBonus);
        }
        
        // Ensure minimum values
        game.ship.maxCargo = Math.max(4, Math.floor(game.ship.maxCargo));
        game.laser.power = Math.max(1.5, game.laser.power);
        game.ship.maxFuel = Math.max(80, Math.floor(game.ship.maxFuel));
        
        // Cap current fuel if it exceeds new max
        if (game.ship.fuel > game.ship.maxFuel) {
            game.ship.fuel = game.ship.maxFuel;
        }
    }

    unlockModules(station, resourceManager = null) {
        if (!this.modules) return;
        
        // Basic modules always unlocked
        this.modules.storage.unlocked = true;
        this.modules.research.unlocked = true;
        
        // Unlock greenhouse early for fuel management
        this.modules.greenhouse.unlocked = true;
        
        // Get station size and tier for unlock conditions
        const stationSize = station && station.grid ? Object.keys(station.grid).length : 1;
        const stationTier = this.calculateStationTier(station.grid);
        
        // Unlock workshop after building storage OR research (not both)
        if (this.modules.storage.built || this.modules.research.built) {
            this.modules.workshop.unlocked = true;
        }
        
        // Unlock garden and observatory after workshop
        if (this.modules.workshop.built) {
            this.modules.garden.unlocked = true;
            this.modules.observatory.unlocked = true;
        }
        
        // Unlock factory after having workshop + storage (automation requires infrastructure)
        if (this.modules.workshop.built && this.modules.storage.built && stationSize >= 4) {
            this.modules.factory.unlocked = true;
        }
        
        // Unlock quarters after having 5+ modules (crew needs living space)
        if (stationSize >= 5) {
            this.modules.quarters.unlocked = true;
        }
        
        // Unlock reactor after having workshop + observatory (power grid needs advanced tech)
        if (this.modules.workshop.built && this.modules.observatory.built && stationSize >= 6) {
            this.modules.reactor.unlocked = true;
        }
        
        // Master Vault: Requires research lab + observatory + station tier 3+
        if (this.modules.research.built && this.modules.observatory.built && stationTier >= 3) {
            // Also check if we have any Master Artifacts
            if (resourceManager) {
                const masterStatus = resourceManager.getMasterArtifactStatus();
                if (masterStatus.collected >= 1 || masterStatus.total >= 3) {
                    this.modules.vault.unlocked = true;
                }
            } else {
                this.modules.vault.unlocked = true; // Fallback if no resource manager
            }
        }
        
        // Provide feedback when new modules are unlocked
        const newlyUnlocked = [];
        Object.entries(this.modules).forEach(([key, module]) => {
            if (module.unlocked && !module.built && !module.notificationShown) {
                newlyUnlocked.push(module.name);
                module.notificationShown = true;
            }
        });
        
        if (newlyUnlocked.length > 0 && window.game && window.game.ui) {
            window.game.ui.showNotification(
                `🔓 New modules unlocked: ${newlyUnlocked.join(', ')}!`,
                'success'
            );
        }
    }

    updateStationDisplay(totalResources, station) {
        const resourceEl = document.getElementById('stationResourceCount');
        const gridSizeEl = document.getElementById('gridSize');
        const tierEl = document.getElementById('stationTier');
        const tierDisplayEl = document.getElementById('stationTierDisplay');
        
        // Update basic info
        if (resourceEl) resourceEl.textContent = totalResources;
        if (gridSizeEl && station) gridSizeEl.textContent = `${station.size}x${station.size}`;
        if (tierEl && station) tierEl.textContent = station.tier;
        if (tierDisplayEl && station) tierDisplayEl.textContent = station.tier;
        
        // Update station capabilities display
        this.updateCapabilitiesDisplay();
        
        // Update storage info
        this.updateStorageDisplay(station);
        
        // Unlock modules based on current state
        this.unlockModules(station);
    }
    
    updateCapabilitiesDisplay() {
        if (!window.game) return;
        
        const cargoEl = document.getElementById('cargoCapability');
        const laserEl = document.getElementById('laserCapability');
        const fuelEl = document.getElementById('fuelCapability');
        
        if (cargoEl) cargoEl.textContent = window.game.ship.maxCargo;
        if (laserEl) laserEl.textContent = `${window.game.laser.power.toFixed(1)}x`;
        if (fuelEl) fuelEl.textContent = window.game.ship.maxFuel;
        
        // Update capabilities with color coding based on improvements
        const baseCargo = 4, baseLaser = 1.5, baseFuel = 80;
        
        if (cargoEl && window.game.ship.maxCargo > baseCargo) {
            cargoEl.style.color = '#4CAF50';
            cargoEl.title = `+${window.game.ship.maxCargo - baseCargo} from modules`;
        }
        
        if (laserEl && window.game.laser.power > baseLaser) {
            laserEl.style.color = '#4CAF50';
            laserEl.title = `+${(window.game.laser.power - baseLaser).toFixed(1)} from modules`;
        }
        
        if (fuelEl && window.game.ship.maxFuel > baseFuel) {
            fuelEl.style.color = '#4CAF50';
            fuelEl.title = `+${window.game.ship.maxFuel - baseFuel} from modules`;
        }
    }
    
    updateStorageDisplay(station) {
        if (!station || !station.grid) return;
        
        const storageInfo = this.calculateStorageCapacity(station.grid);
        
        // You could add a storage display element here
        // For now, we'll just store the info for potential use
        this.currentStorageInfo = storageInfo;
    }

    upgradeModule(moduleKey, totalResources, grid) {
        const module = this.modules[moduleKey];
        if (!module || !module.built) return false;
        
        const currentTier = module.tier || 1;
        if (currentTier >= 3) return false;
        
        const upgradeCost = Array.isArray(module.cost) ? module.cost[currentTier] : null;
        if (!upgradeCost || totalResources < upgradeCost) return false;
        
        // Perform upgrade
        module.tier = currentTier + 1;
        this.saveModuleStates();
        
        // Create a notification about the upgrade
        if (window.game && window.game.ui) {
            window.game.ui.showNotification(`🔧 ${module.name} upgraded to Tier ${module.tier}!`, 'epic');
        }
        
        // Return the cost for the game to deduct
        return upgradeCost;
    }

    calculateAdjacencyBonuses(grid) {
        this.adjacencyBonuses.clear();
        
        const adjacencyRules = {
            research: ['observatory', 'vault', 'factory'], // Research + Observatory/Vault/Factory = faster analysis
            workshop: ['storage', 'greenhouse', 'factory'], // Workshop + Storage/Greenhouse/Factory = efficiency boost
            greenhouse: ['observatory', 'research', 'garden'], // Greenhouse + Observatory/Research/Garden = fuel efficiency
            garden: ['greenhouse', 'quarters', 'research'], // Garden + Greenhouse/Quarters/Research = bio bonuses
            storage: ['workshop', 'command', 'factory'], // Storage + Workshop/Command/Factory = capacity boost
            observatory: ['research', 'vault', 'reactor'], // Observatory + Research/Vault/Reactor = enhanced scanning
            factory: ['workshop', 'storage', 'reactor'], // Factory + Workshop/Storage/Reactor = automation boost
            quarters: ['garden', 'reactor'], // Quarters + Garden/Reactor = crew efficiency
            reactor: ['*'], // Reactor provides power bonus to all adjacent modules
            vault: ['research', 'observatory', 'reactor'] // Vault + Research/Observatory/Reactor = artifact bonuses
        };
        
        Object.keys(grid).forEach(pos => {
            const [x, y] = pos.split(',').map(Number);
            const moduleType = grid[pos];
            const module = this.modules[moduleType];
            
            if (!module || !adjacencyRules[moduleType]) return;
            
            const adjacent = [
                [x-1, y], [x+1, y], [x, y-1], [x, y+1]
            ];
            
            let bonusMultiplier = 1;
            let bonusDescription = [];
            
            adjacent.forEach(([ax, ay]) => {
                const adjacentModule = grid[`${ax},${ay}`];
                if (!adjacentModule) return;
                
                const rules = adjacencyRules[moduleType];
                if (rules.includes(adjacentModule) || rules.includes('*')) {
                    // Different modules provide different synergy bonuses
                    let synergyBonus = 0.15; // Base 15%
                    
                    // Special synergy bonuses
                    if (moduleType === 'reactor' || adjacentModule === 'reactor') {
                        synergyBonus = 0.25; // Reactor provides 25% bonus
                    } else if ((moduleType === 'research' && adjacentModule === 'vault') || 
                               (moduleType === 'vault' && adjacentModule === 'research')) {
                        synergyBonus = 0.3; // Research + Vault = 30% bonus
                    } else if ((moduleType === 'workshop' && adjacentModule === 'factory') || 
                               (moduleType === 'factory' && adjacentModule === 'workshop')) {
                        synergyBonus = 0.2; // Workshop + Factory = 20% bonus
                    }
                    
                    bonusMultiplier += synergyBonus;
                    bonusDescription.push(this.modules[adjacentModule].name);
                }
            });
            
            if (bonusMultiplier > 1) {
                this.adjacencyBonuses.set(pos, {
                    multiplier: bonusMultiplier,
                    description: `+${Math.round((bonusMultiplier - 1) * 100)}% efficiency from ${bonusDescription.join(', ')}`,
                    modules: bonusDescription
                });
            }
        });
    }

    updateAdjacencyDisplay(grid) {
        this.calculateAdjacencyBonuses(grid);
        
        const adjacencyContainer = document.getElementById('adjacencyBonuses');
        if (!adjacencyContainer) return;
        
        adjacencyContainer.innerHTML = '';
        
        if (this.adjacencyBonuses.size === 0) {
            adjacencyContainer.innerHTML = '<div style="color: #666; text-align: center; padding: 10px;">No synergy bonuses active</div>';
            return;
        }
        
        this.adjacencyBonuses.forEach((bonus, pos) => {
            const [x, y] = pos.split(',').map(Number);
            const moduleType = grid[pos];
            const module = this.modules[moduleType];
            
            const bonusItem = document.createElement('div');
            bonusItem.className = 'adjacency-bonus';
            bonusItem.innerHTML = `
                <div class="bonus-header">
                    <span>${module.icon} ${module.name}</span>
                    <span class="bonus-value">+${Math.round((bonus.multiplier - 1) * 100)}%</span>
                </div>
                <div class="bonus-desc">
                    Synergy with: ${bonus.modules.join(', ')}
                </div>
            `;
            adjacencyContainer.appendChild(bonusItem);
        });
    }

    getModuleEfficiency(moduleType, position, grid) {
        const baseModule = this.modules[moduleType];
        if (!baseModule) return 1;
        
        let efficiency = 1;
        
        // Tier bonus
        const tier = baseModule.tier || 1;
        if (baseModule.efficiency) {
            efficiency *= baseModule.efficiency[tier - 1];
        }
        
        // Adjacency bonus
        const adjacencyBonus = this.adjacencyBonuses.get(position);
        if (adjacencyBonus) {
            efficiency *= adjacencyBonus.multiplier;
        }
        
        return efficiency;
    }

    calculateStorageCapacity(grid) {
        let baseCapacity = 50; // Starting capacity
        let specializedStorage = {};
        
        Object.keys(grid).forEach(pos => {
            const moduleType = grid[pos];
            const module = this.modules[moduleType];
            
            if (moduleType === 'storage' && module) {
                const tier = module.tier || 1;
                const efficiency = this.getModuleEfficiency(moduleType, pos, grid);
                
                if (tier === 1) {
                    baseCapacity += Math.floor(25 * efficiency);
                } else if (tier === 2) {
                    baseCapacity += Math.floor(50 * efficiency);
                    // Tier 2 storage can sort basic vs precious materials
                    specializedStorage.basic = true;
                    specializedStorage.precious = true;
                } else if (tier === 3) {
                    baseCapacity += Math.floor(100 * efficiency);
                    // Tier 3 storage can handle all resource types
                    Object.keys(this.resourceTypes).forEach(type => {
                        specializedStorage[type] = true;
                    });
                }
            }
        });
        
        return { capacity: baseCapacity, specialized: specializedStorage };
    }
    
    calculateFuelCapacity(grid) {
        let baseFuel = 120; // Starting fuel capacity
        
        Object.keys(grid).forEach(pos => {
            const moduleType = grid[pos];
            const module = this.modules[moduleType];
            
            if (moduleType === 'greenhouse' && module) {
                const tier = module.tier || 1;
                const efficiency = this.getModuleEfficiency(moduleType, pos, grid);
                const fuelBonus = module.fuelBonus[tier - 1] || 20;
                baseFuel += Math.floor(fuelBonus * efficiency);
            }
        });
        
        return Math.max(120, baseFuel); // Ensure minimum fuel capacity
    }
} 