// Resources and Artifacts management system for Cosmic Collection Station
class ResourceManager {
    constructor() {
        this.artifactTypes = [
            { name: 'Ancient Data Core', icon: '💿', rarity: 'common', value: 5 },
            { name: 'Alien Crystal Fragment', icon: '💎', rarity: 'uncommon', value: 10 },
            { name: 'Quantum Resonator', icon: '⚡', rarity: 'rare', value: 20 },
            { name: 'Stellar Memory Bank', icon: '🧠', rarity: 'epic', value: 50 },
            { name: 'Master Artifact Shard', icon: '🌟', rarity: 'legendary', value: 100 },
            // New artifact types!
            { name: 'Void Crystal', icon: '🔮', rarity: 'rare', value: 25 },
            { name: 'Neural Interface', icon: '🧬', rarity: 'epic', value: 60 },
            { name: 'Temporal Fragment', icon: '⏰', rarity: 'legendary', value: 120 }
        ];
        
        this.rarityColors = {
            'common': '#ffffff',
            'uncommon': '#2ecc71',
            'rare': '#3498db', 
            'epic': '#9b59b6',
            'legendary': '#ff6b9d'
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
        artifacts.forEach((artifact, index) => {
            if (artifact.discovered) {
                const distance = Math.sqrt(
                    (artifact.x - ship.x) ** 2 + 
                    (artifact.y - ship.y) ** 2
                );
                
                if (distance < 40) {
                    // Add to global collection
                    discoveredArtifacts.push({
                        ...artifact,
                        discoveredAt: Date.now()
                    });
                    this.saveDiscoveredArtifacts(discoveredArtifacts);
                    
                    // Add research value to resources
                    totalResources += artifact.value;
                    
                    // Remove from current field
                    artifacts.splice(index, 1);
                    
                    console.log(`Collected artifact: ${artifact.name} (+${artifact.value} research)`);
                    return { collected: true, value: artifact.value };
                }
            }
        });
        return { collected: false, value: 0 };
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
} 