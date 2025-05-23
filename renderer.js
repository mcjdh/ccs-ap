// Rendering system for Cosmic Collection Station
class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    renderMining(game) {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (background)
        this.drawStars();
        
        // Draw scanner pulse
        if (game.scanner.active) {
            this.drawScannerPulse(game.ship, game.scanner);
        }
        
        // Draw asteroids
        game.asteroids.forEach(asteroid => {
            this.drawAsteroid(asteroid);
        });
        
        // Draw resources
        game.resources.forEach(resource => {
            this.drawResource(resource);
        });
        
        // Draw artifacts
        game.artifacts.forEach(artifact => {
            this.drawArtifact(artifact);
        });
        
        // Draw particles
        game.particles.forEach(particle => {
            this.drawParticle(particle);
        });
        
        // Draw mining laser
        if (game.laser.active) {
            this.drawMiningLaser(game.laser);
        }
        
        // Draw auto-mining indicators
        if (game.autoMining.enabled) {
            this.drawAutoMiningIndicators(game.autoMining, game.asteroids, game.ship);
        }
        
        // Draw ship
        this.drawShip(game.ship);
    }

    renderStation(game) {
        // Clear canvas with station background
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw station background pattern
        this.drawStationBackground();
        
        // Draw centered station diagram
        this.drawStationGrid(game.station, game.modules);
    }

    drawStars() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137.5) % this.canvas.width;
            const y = (i * 234.7) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }

    drawScannerPulse(ship, scanner) {
        this.ctx.strokeStyle = `rgba(100, 255, 100, ${scanner.pulseTime})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(ship.x, ship.y, scanner.radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawAsteroid(asteroid) {
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
    }

    drawResource(resource) {
        this.ctx.fillStyle = resource.type === 'rare' ? '#ff6b9d' : '#61dafb';
        this.ctx.beginPath();
        this.ctx.arc(resource.x, resource.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Glow effect
        this.ctx.fillStyle = resource.type === 'rare' ? 'rgba(255, 107, 157, 0.3)' : 'rgba(97, 218, 251, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(resource.x, resource.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawArtifact(artifact) {
        artifact.pulsePhase += 0.1;
        const pulse = Math.sin(artifact.pulsePhase) * 0.3 + 0.7;
        
        if (artifact.discovered) {
            // Special handling for Master Artifacts
            if (artifact.isMaster) {
                // Master Artifacts are much larger and more spectacular
                const masterPulse = Math.sin(artifact.pulsePhase * 1.5) * 0.4 + 0.6;
                
                // Multiple layered golden glows
                this.ctx.fillStyle = `rgba(255, 215, 0, ${masterPulse * 0.8})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 40, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(255, 215, 0, ${masterPulse * 0.6})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 30, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.fillStyle = `rgba(255, 215, 0, ${masterPulse})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 25, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Swirling outer ring
                const time = Date.now() * 0.003;
                for (let i = 0; i < 8; i++) {
                    const angle = (time + i * Math.PI / 4) % (Math.PI * 2);
                    const ringX = artifact.x + Math.cos(angle) * 35;
                    const ringY = artifact.y + Math.sin(angle) * 35;
                    
                    this.ctx.fillStyle = `rgba(255, 215, 0, ${masterPulse * 0.7})`;
                    this.ctx.beginPath();
                    this.ctx.arc(ringX, ringY, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Master Artifact icon (larger)
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = 'bold 32px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 2;
                this.ctx.strokeText(artifact.icon, artifact.x, artifact.y + 12);
                this.ctx.fillText(artifact.icon, artifact.x, artifact.y + 12);
                
                // Master rarity border (golden)
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 20, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Inner golden border
                this.ctx.strokeStyle = '#FFED4E';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 17, 0, Math.PI * 2);
                this.ctx.stroke();
                
            } else {
                // Regular discovered artifacts
                this.ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                this.ctx.beginPath();
                this.ctx.arc(artifact.x, artifact.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Regular artifact icon
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = '20px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(artifact.icon, artifact.x, artifact.y + 7);
                
                // Regular rarity indicator
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
            }
        } else {
            // Hidden artifacts show faint energy signature
            // Master Artifacts have stronger signatures even when hidden
            const hiddenPulse = artifact.isMaster ? pulse * 0.5 : pulse * 0.3;
            const hiddenColor = artifact.isMaster ? 'rgba(255, 215, 0, ' : 'rgba(100, 255, 100, ';
            
            this.ctx.fillStyle = `${hiddenColor}${hiddenPulse})`;
            this.ctx.beginPath();
            this.ctx.arc(artifact.x, artifact.y, artifact.isMaster ? 8 : 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawParticle(particle) {
        this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawMiningLaser(laser) {
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(laser.x, laser.y);
        this.ctx.lineTo(laser.targetX, laser.targetY);
        this.ctx.stroke();
        
        // Laser glow
        this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
        this.ctx.lineWidth = 6;
        this.ctx.stroke();
    }

    drawAutoMiningIndicators(autoMining, asteroids, ship) {
        // Draw target indicator
        if (autoMining.targetIndicator.visible) {
            const time = Date.now() * 0.005;
            const pulse = Math.sin(time) * 0.3 + 0.7;
            
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(autoMining.targetIndicator.x, autoMining.targetIndicator.y, 30, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
            
            // Target crosshair
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse * 0.8})`;
            this.ctx.lineWidth = 1;
            const x = autoMining.targetIndicator.x;
            const y = autoMining.targetIndicator.y;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 10, y);
            this.ctx.lineTo(x + 10, y);
            this.ctx.moveTo(x, y - 10);
            this.ctx.lineTo(x, y + 10);
            this.ctx.stroke();
        }
        
        // Draw search range when no targets (subtle feedback)
        if (!autoMining.targetIndicator.visible && asteroids.length > 0) {
            const time = Date.now() * 0.002;
            const pulse = Math.sin(time) * 0.1 + 0.15;
            
            this.ctx.strokeStyle = `rgba(76, 175, 80, ${pulse})`;
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 8]);
            this.ctx.beginPath();
            this.ctx.arc(ship.x, ship.y, autoMining.searchRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
        }
    }

    drawShip(ship) {
        this.ctx.save();
        this.ctx.translate(ship.x, ship.y);
        this.ctx.rotate(ship.angle);
        
        // Ship body
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.beginPath();
        this.ctx.moveTo(ship.size, 0);
        this.ctx.lineTo(-ship.size, -ship.size/2);
        this.ctx.lineTo(-ship.size/2, 0);
        this.ctx.lineTo(-ship.size, ship.size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Ship outline
        this.ctx.strokeStyle = '#81C784';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawStationBackground() {
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
    }

    drawStationGrid(station, modules) {
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
        Object.entries(station.grid).forEach(([pos, moduleType]) => {
            const [x, y] = pos.split(',').map(Number);
            const module = modules[moduleType];
            
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
} 