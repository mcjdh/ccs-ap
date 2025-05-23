// Resources and Artifacts management system for Cosmic Collection Station
class ResourceManager {
    constructor() {
        // Regular artifacts
        this.artifactTypes = [
            { name: 'Ancient Data Core', icon: '💿', rarity: 'common', value: 5, type: 'regular' },
            { name: 'Alien Crystal Fragment', icon: '💎', rarity: 'uncommon', value: 10, type: 'regular' },
            { name: 'Quantum Resonator', icon: '⚡', rarity: 'rare', value: 20, type: 'regular' },
            { name: 'Stellar Memory Bank', icon: '🧠', rarity: 'epic', value: 50, type: 'regular' },
            { name: 'Master Artifact Shard', icon: '🌟', rarity: 'legendary', value: 100, type: 'regular' },
            { name: 'Void Crystal', icon: '🔮', rarity: 'rare', value: 25, type: 'regular' },
            { name: 'Neural Interface', icon: '🧬', rarity: 'epic', value: 60, type: 'regular' },
            { name: 'Temporal Fragment', icon: '⏰', rarity: 'legendary', value: 120, type: 'regular' }
        ];

        // The 5 Master Artifacts - these are unique and required for victory
        this.masterArtifacts = [
            { 
                id: 'knowledge',
                name: 'Artifact of Knowledge', 
                icon: '📚', 
                rarity: 'master', 
                value: 500,
                type: 'master',
                description: 'Ancient libraries of cosmic wisdom',
                discoveryCondition: 'Found in fields with 3+ epic artifacts discovered',
                requiredArtifacts: 3,
                requiredRarity: 'epic'
            },
            { 
                id: 'growth',
                name: 'Artifact of Growth', 
                icon: '🌱', 
                rarity: 'master', 
                value: 500,
                type: 'master',
                description: 'Living essence of cosmic evolution',
                discoveryCondition: 'Found in fields with 50+ resources collected',
                requiredResources: 50
            },
            { 
                id: 'energy',
                name: 'Artifact of Energy', 
                icon: '⭐', 
                rarity: 'master', 
                value: 500,
                type: 'master',
                description: 'Pure stellar phenomena crystallized',
                discoveryCondition: 'Found in field 5 with perfect mining efficiency',
                requiredField: 5,
                requiredEfficiency: 0.9
            },
            { 
                id: 'time',
                name: 'Artifact of Time', 
                icon: '🕰️', 
                rarity: 'master', 
                value: 500,
                type: 'master',
                description: 'Temporal anomalies frozen in crystal',
                discoveryCondition: 'Found after visiting 20+ asteroid fields',
                requiredFieldsVisited: 20
            },
            { 
                id: 'unity',
                name: 'Artifact of Unity', 
                icon: '🌌', 
                rarity: 'master', 
                value: 1000,
                type: 'master',
                description: 'The convergence of all cosmic forces',
                discoveryCondition: 'Appears only when the first 4 Master Artifacts are collected',
                requiredMasterArtifacts: ['knowledge', 'growth', 'energy', 'time']
            }
        ];
        
        this.rarityColors = {
            'common': '#ffffff',
            'uncommon': '#2ecc71',
            'rare': '#3498db', 
            'epic': '#9b59b6',
            'legendary': '#ff6b9d',
            'master': '#ffd700' // Gold for Master Artifacts
        };

        // Track player's progression for Master Artifact unlock conditions
        this.playerStats = this.loadPlayerStats();
    }

    loadPlayerStats() {
        try {
            const saved = localStorage.getItem('playerStats');
            return saved ? JSON.parse(saved) : {
                fieldsVisited: 0,
                totalResourcesCollected: 0,
                epicArtifactsFound: 0,
                masterArtifactsCollected: []
            };
        } catch (e) {
            console.warn('Failed to load player stats:', e);
            return {
                fieldsVisited: 0,
                totalResourcesCollected: 0,
                epicArtifactsFound: 0,
                masterArtifactsCollected: []
            };
        }
    }

    savePlayerStats() {
        try {
            localStorage.setItem('playerStats', JSON.stringify(this.playerStats));
        } catch (e) {
            console.warn('Failed to save player stats:', e);
        }
    }

    // Check if a Master Artifact can spawn based on player progression
    checkMasterArtifactAvailability(fieldNumber, sessionStats = {}) {
        const available = [];
        const debugInfo = [];

        // Artifact of Knowledge - 3+ epic artifacts discovered in current session
        if (!this.playerStats.masterArtifactsCollected.includes('knowledge')) {
            const epicCount = sessionStats.epicArtifactsFound || 0;
            debugInfo.push(`Knowledge: ${epicCount}/3 epic artifacts found this session`);
            if (epicCount >= 3) {
                available.push(this.masterArtifacts[0]);
            }
        } else {
            debugInfo.push(`Knowledge: ✅ Already collected`);
        }

        // Artifact of Growth - 50+ resources collected in current session  
        if (!this.playerStats.masterArtifactsCollected.includes('growth')) {
            const resourceCount = sessionStats.resourcesCollected || 0;
            debugInfo.push(`Growth: ${resourceCount}/50 resources collected this session`);
            if (resourceCount >= 50) {
                available.push(this.masterArtifacts[1]);
            }
        } else {
            debugInfo.push(`Growth: ✅ Already collected`);
        }

        // Artifact of Energy - Field 5 with high efficiency
        if (!this.playerStats.masterArtifactsCollected.includes('energy')) {
            const efficiency = Math.max(0, sessionStats.miningEfficiency || 0);
            debugInfo.push(`Energy: Field ${fieldNumber}/5, Efficiency ${(efficiency * 100).toFixed(1)}%/90%`);
            if (fieldNumber === 5 && efficiency >= 0.9) {
                available.push(this.masterArtifacts[2]);
            }
        } else {
            debugInfo.push(`Energy: ✅ Already collected`);
        }

        // Artifact of Time - 20+ fields visited (career total)
        if (!this.playerStats.masterArtifactsCollected.includes('time')) {
            debugInfo.push(`Time: ${this.playerStats.fieldsVisited}/20 fields visited (career)`);
            if (this.playerStats.fieldsVisited >= 20) {
                available.push(this.masterArtifacts[3]);
            }
        } else {
            debugInfo.push(`Time: ✅ Already collected`);
        }

        // Artifact of Unity - all other Master Artifacts collected
        if (!this.playerStats.masterArtifactsCollected.includes('unity')) {
            const required = ['knowledge', 'growth', 'energy', 'time'];
            const collected = required.filter(id => 
                this.playerStats.masterArtifactsCollected.includes(id)
            );
            debugInfo.push(`Unity: ${collected.length}/4 Master Artifacts collected`);
            if (collected.length === 4) {
                available.push(this.masterArtifacts[4]);
            }
        } else {
            debugInfo.push(`Unity: ✅ Already collected`);
        }

        // Store debug info for potential UI display
        this.lastDebugInfo = debugInfo;
        
        return available;
    }

    // Generate a Master Artifact if conditions are met
    generateMasterArtifact(fieldNumber, sessionStats, canvasWidth, canvasHeight) {
        const available = this.checkMasterArtifactAvailability(fieldNumber, sessionStats);
        
        if (available.length === 0) return null;

        // Improved spawn rate: 30% chance to spawn if conditions are met (more generous)
        if (Math.random() > 0.3) return null;

        const artifact = available[Math.floor(Math.random() * available.length)];
        
        return {
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            ...artifact,
            discovered: false,
            pulsePhase: Math.random() * Math.PI * 2,
            isMaster: true
        };
    }

    // Record Master Artifact collection
    collectMasterArtifact(artifactId) {
        if (!this.playerStats.masterArtifactsCollected.includes(artifactId)) {
            this.playerStats.masterArtifactsCollected.push(artifactId);
            this.savePlayerStats();
            
            // Check for victory condition
            if (this.playerStats.masterArtifactsCollected.length === 5) {
                return { victory: true };
            }
        }
        return { victory: false };
    }

    // Update player progression stats
    updatePlayerStats(updates) {
        Object.assign(this.playerStats, updates);
        this.savePlayerStats();
    }

    // Check if player has achieved victory (all 5 Master Artifacts)
    checkVictoryCondition() {
        return this.playerStats.masterArtifactsCollected.length === 5;
    }

    // Get Master Artifacts collection status for UI
    getMasterArtifactStatus() {
        return {
            collected: this.playerStats.masterArtifactsCollected.length,
            total: 5,
            artifacts: this.masterArtifacts.map(artifact => ({
                ...artifact,
                collected: this.playerStats.masterArtifactsCollected.includes(artifact.id)
            }))
        };
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

    saveDiscoveredArtifacts(artifacts) {
        try {
            localStorage.setItem('discoveredArtifacts', JSON.stringify(artifacts));
        } catch (e) {
            console.warn('Failed to save artifacts:', e);
        }
    }

    generateArtifact(fieldNumber) {
        // Higher field = better artifacts
        let availableTypes = this.artifactTypes.filter(type => {
            if (type.rarity === 'legendary') return fieldNumber >= 4;
            if (type.rarity === 'epic') return fieldNumber >= 3;
            if (type.rarity === 'rare') return fieldNumber >= 2;
            return true; // common and uncommon always available
        });
        
        const artifact = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            ...artifact,
            discovered: false,
            pulsePhase: Math.random() * Math.PI * 2
        };
    }

    createResource(x, y, type, amount = 1) {
        const resources = [];
        for (let i = 0; i < amount; i++) {
            resources.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                type: type,
                life: 1,
                collected: false,
                magnetRange: 80
            });
        }
        return resources;
    }

    collectResource(resource, ship) {
        if (ship.cargo.length >= ship.maxCargo) return false;
        
        ship.cargo.push(resource);
        return true;
    }

    processCargoAtStation(ship) {
        let resourceValue = 0;
        ship.cargo.forEach(resource => {
            if (resource.type === 'rare') {
                resourceValue += 4; // Rare resources worth more
            } else {
                resourceValue += 1; // Common resources base value
            }
        });
        ship.cargo = [];
        return resourceValue;
    }

    updateResourceMagnetism(resources, ship) {
        resources.forEach((resource, index) => {
            const distance = Math.sqrt(
                (resource.x - ship.x) ** 2 + 
                (resource.y - ship.y) ** 2
            );
            
            if (distance < 30) {
                const dx = ship.x - resource.x;
                const dy = ship.y - resource.y;
                resource.x += dx * 0.2;
                resource.y += dy * 0.2;
                
                if (distance < 15 && this.collectResource(resource, ship)) {
                    resources.splice(index, 1);
                }
            }
        });
    }

    updateArtifactCollection(artifacts, ship, discoveredArtifacts, totalResources) {
        let collectionResults = { collected: false, value: 0, masterArtifact: null, victory: false };
        
        artifacts.forEach((artifact, index) => {
            if (artifact.discovered) {
                const distance = Math.sqrt(
                    (artifact.x - ship.x) ** 2 + 
                    (artifact.y - ship.y) ** 2
                );
                
                if (distance < 40) {
                    // Handle Master Artifacts differently
                    if (artifact.isMaster) {
                        const result = this.collectMasterArtifact(artifact.id);
                        collectionResults.masterArtifact = artifact;
                        collectionResults.victory = result.victory;
                        collectionResults.collected = true;
                        collectionResults.value = artifact.value;
                        
                        // Remove from current field
                        artifacts.splice(index, 1);
                        
                        console.log(`🌟 MASTER ARTIFACT COLLECTED: ${artifact.name}! (+${artifact.value} research)`);
                        return;
                    }
                    
                    // Handle regular artifacts
                    discoveredArtifacts.push({
                        ...artifact,
                        discoveredAt: Date.now()
                    });
                    this.saveDiscoveredArtifacts(discoveredArtifacts);
                    
                    // Add research value to resources
                    totalResources += artifact.value;
                    
                    // Update player stats for epic artifacts (Master Artifact tracking)
                    if (artifact.rarity === 'epic') {
                        // This will be handled by the session stats tracking in game.js
                    }
                    
                    // Remove from current field
                    artifacts.splice(index, 1);
                    
                    collectionResults.collected = true;
                    collectionResults.value = artifact.value;
                    
                    console.log(`Collected artifact: ${artifact.name} (+${artifact.value} research)`);
                }
            }
        });
        
        return collectionResults;
    }

    discoverArtifacts(artifacts, ship, scannerRadius) {
        let discoveries = [];
        
        artifacts.forEach(artifact => {
            if (!artifact.discovered) {
                const distance = Math.sqrt(
                    (artifact.x - ship.x) ** 2 + 
                    (artifact.y - ship.y) ** 2
                );
                
                if (distance <= scannerRadius) {
                    artifact.discovered = true;
                    discoveries.push(artifact);
                }
            }
        });
        
        return discoveries;
    }

    // Enhanced asteroid generation with better resource distribution
    generateFieldAsteroids(fieldNumber, canvasWidth, canvasHeight) {
        const asteroids = [];
        const baseCount = 6 + fieldNumber * 1; // 7-11 asteroids
        const rareChance = 0.15 + fieldNumber * 0.08; // 15%-55% rare chance
        
        for (let i = 0; i < baseCount; i++) {
            const size = 15 + Math.random() * 20;
            const isRare = Math.random() < rareChance;
            
            asteroids.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                size: size,
                health: 20 + fieldNumber * 8, // 20-60 health
                maxHealth: 20 + fieldNumber * 8,
                type: isRare ? 'rare' : 'common',
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.05,
                resources: isRare ? 3 + fieldNumber : 1 + Math.floor(fieldNumber / 2)
            });
        }
        
        return asteroids;
    }

    // Artifact spawn chance calculation
    shouldSpawnArtifact(fieldNumber) {
        const artifactChance = 0.25 + fieldNumber * 0.15; // 25%-85% chance
        return Math.random() < artifactChance;
    }

    // Get rarity color for rendering
    getRarityColor(rarity) {
        return this.rarityColors[rarity] || '#ffffff';
    }

    // Calculate total artifact collection value
    calculateArtifactCollectionValue(discoveredArtifacts) {
        return discoveredArtifacts.reduce((total, artifact) => total + artifact.value, 0);
    }

    // Get artifact statistics for UI
    getArtifactStats(discoveredArtifacts) {
        const stats = {
            total: discoveredArtifacts.length,
            byRarity: {}
        };
        
        this.artifactTypes.forEach(type => {
            if (!stats.byRarity[type.rarity]) {
                stats.byRarity[type.rarity] = 0;
            }
        });
        
        discoveredArtifacts.forEach(artifact => {
            stats.byRarity[artifact.rarity] = (stats.byRarity[artifact.rarity] || 0) + 1;
        });
        
        return stats;
    }

    // Get progress toward Master Artifacts for UI display
    getMasterArtifactProgress(sessionStats = {}) {
        const progress = {
            knowledge: {
                current: sessionStats.epicArtifactsFound || 0,
                required: 3,
                description: "Epic artifacts found this session",
                collected: this.playerStats.masterArtifactsCollected.includes('knowledge')
            },
            growth: {
                current: sessionStats.resourcesCollected || 0,
                required: 50,
                description: "Resources collected this session",
                collected: this.playerStats.masterArtifactsCollected.includes('growth')
            },
            energy: {
                current: Math.max(0, sessionStats.miningEfficiency || 0),
                required: 0.9,
                description: "Mining efficiency in Field 5",
                collected: this.playerStats.masterArtifactsCollected.includes('energy')
            },
            time: {
                current: this.playerStats.fieldsVisited,
                required: 20,
                description: "Fields visited (career total)",
                collected: this.playerStats.masterArtifactsCollected.includes('time')
            },
            unity: {
                current: this.playerStats.masterArtifactsCollected.length,
                required: 4,
                description: "Other Master Artifacts collected",
                collected: this.playerStats.masterArtifactsCollected.includes('unity')
            }
        };

        return progress;
    }
} 