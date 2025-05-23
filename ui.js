// UI Management system for Cosmic Collection Station
class UIManager {
    constructor() {
        this.modalCallback = null;
        this.notifications = [];
        this.notificationDuration = 3000; // 3 seconds
    }

    // Modal dialog system
    showModal(title, message, buttons) {
        return new Promise((resolve) => {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalText').textContent = message;
            
            const buttonContainer = document.getElementById('modalButtons');
            buttonContainer.innerHTML = '';
            
            let primaryButton = null;
            
            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `modal-button ${button.class || 'secondary'}`;
                btn.textContent = button.text;
                btn.onclick = () => {
                    this.hideModal();
                    resolve(button.value);
                };
                
                // Track primary button for space key support
                if (button.class === 'primary') {
                    primaryButton = btn;
                }
                
                buttonContainer.appendChild(btn);
            });
            
            // Add keyboard support for space and enter keys
            const keyHandler = (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    if (primaryButton) {
                        primaryButton.click();
                    } else {
                        // If no primary button, click the first button
                        const firstButton = buttonContainer.querySelector('.modal-button');
                        if (firstButton) firstButton.click();
                    }
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    // Click secondary button or last button
                    const secondaryButton = buttonContainer.querySelector('.modal-button.secondary');
                    if (secondaryButton) {
                        secondaryButton.click();
                    }
                }
            };
            
            // Store the handler so we can remove it later
            this.currentKeyHandler = keyHandler;
            document.addEventListener('keydown', keyHandler);
            
            document.getElementById('gameModal').style.display = 'flex';
            
            // Focus the primary button for better accessibility
            if (primaryButton) {
                setTimeout(() => primaryButton.focus(), 100);
            }
        });
    }

    hideModal() {
        document.getElementById('gameModal').style.display = 'none';
        
        // Remove the keyboard event listener
        if (this.currentKeyHandler) {
            document.removeEventListener('keydown', this.currentKeyHandler);
            this.currentKeyHandler = null;
        }
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

    // Enhanced notification system
    showNotification(message, type = 'info', duration = null) {
        const notification = {
            id: Date.now(),
            message,
            type,
            duration: duration || this.notificationDuration,
            startTime: Date.now()
        };
        
        this.notifications.push(notification);
        this.createNotificationElement(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, notification.duration);
    }

    createNotificationElement(notification) {
        const container = this.getOrCreateNotificationContainer();
        
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.id = `notification-${notification.id}`;
        element.innerHTML = `
            <div class="notification-content">${notification.message}</div>
            <div class="notification-close" onclick="game.ui.removeNotification(${notification.id})">×</div>
        `;
        
        container.appendChild(element);
        
        // Animate in
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        });
    }

    getOrCreateNotificationContainer() {
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    removeNotification(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    // UI update methods
    updateGameUI(game) {
        this.updateFuelBar(game.ship);
        this.updateCargoBar(game.ship);
        this.updateResourceCounter(game.totalResources);
        this.updateStationTier(game.station);
        this.updateExpeditionInfo(game);
        this.updateFuelWarnings(game.ship);
    }

    updateFuelBar(ship) {
        const fuelPercentage = (ship.fuel / ship.maxFuel) * 100;
        const fuelFill = document.getElementById('fuelFill');
        
        if (fuelFill) {
            fuelFill.style.width = fuelPercentage + '%';
            
            // Dynamic fuel warning colors
            if (fuelPercentage < 20) {
                fuelFill.style.background = 'linear-gradient(90deg, #f44336, #ff5722)'; // Red warning
            } else if (fuelPercentage < 40) {
                fuelFill.style.background = 'linear-gradient(90deg, #ff9800, #ffc107)'; // Orange caution
            } else {
                fuelFill.style.background = 'linear-gradient(90deg, #4CAF50, #81C784)'; // Green normal
            }
        }
    }

    updateCargoBar(ship) {
        const cargoPercentage = (ship.cargo.length / ship.maxCargo) * 100;
        const cargoFill = document.getElementById('cargoFill');
        
        if (cargoFill) {
            cargoFill.style.width = cargoPercentage + '%';
        }
        
        if (document.getElementById('cargoCount')) {
            document.getElementById('cargoCount').textContent = ship.cargo.length;
        }
        if (document.getElementById('cargoMax')) {
            document.getElementById('cargoMax').textContent = ship.maxCargo;
        }
    }

    updateResourceCounter(totalResources) {
        if (document.getElementById('resourceCount')) {
            document.getElementById('resourceCount').textContent = totalResources;
        }
        if (document.getElementById('stationResourceCount')) {
            document.getElementById('stationResourceCount').textContent = totalResources;
        }
    }

    updateStationTier(station) {
        if (document.getElementById('stationTier')) {
            document.getElementById('stationTier').textContent = station.tier;
        }
        if (document.getElementById('gridSize')) {
            document.getElementById('gridSize').textContent = `${station.size}x${station.size}`;
        }
    }

    updateExpeditionInfo(game) {
        if (game.gameState === 'mining' && document.getElementById('viewIndicator')) {
            const remaining = game.asteroids.length;
            const fuelWarning = game.ship.fuel < 15 ? ' ⚠️ LOW FUEL' : '';
            const fieldInfo = `Field ${game.expedition.currentField}/${game.expedition.maxFields}`;
            const asteroidInfo = `(${remaining} asteroids remaining)`;
            
            // Add session stats for Master Artifact tracking
            const sessionInfo = ` | Session: ${game.sessionStats.resourcesCollected}R ${game.sessionStats.epicArtifactsFound}E ${(game.sessionStats.miningEfficiency * 100).toFixed(0)}%Eff`;
            
            document.getElementById('viewIndicator').textContent = 
                `🚀 Expedition - ${fieldInfo} ${asteroidInfo}${sessionInfo}${fuelWarning}`;
        }
    }

    updateFuelWarnings(ship) {
        // This will be called from the main game loop for emergency warnings
        if (ship.fuel <= 10 && !this.fuelWarningShown) {
            this.fuelWarningShown = true;
            this.showNotification('⚠️ FUEL CRITICAL! Return to station immediately!', 'warning', 5000);
            
            // Reset flag after a delay
            setTimeout(() => {
                this.fuelWarningShown = false;
            }, 10000);
        }
    }

    // Auto-mining toggle UI
    updateAutoMiningUI(enabled) {
        const indicator = document.getElementById('autoMiningIndicator');
        const controlsText = document.querySelector('#miningControls div:nth-child(2)');
        
        if (enabled) {
            if (indicator) indicator.style.display = 'block';
            if (controlsText) {
                controlsText.innerHTML = '🤖 Auto-Mining: ON (Press X to toggle)';
                controlsText.style.color = '#4CAF50';
            }
        } else {
            if (indicator) indicator.style.display = 'none';
            if (controlsText) {
                controlsText.innerHTML = '🔫 Manual Mode: ON (Press X to toggle)';
                controlsText.style.color = '#ff9800';
            }
        }
    }

    // Game state UI switching
    switchToMiningUI() {
        document.getElementById('miningUI').style.display = 'block';
        document.getElementById('miningControls').style.display = 'block';
        document.getElementById('stationUI').style.display = 'none';
        document.getElementById('stationControls').style.display = 'none';
        document.getElementById('stationGrid').style.display = 'none';
        document.getElementById('viewIndicator').textContent = '🚀 Mining Expedition - Field 1/5';
        document.getElementById('autoMiningIndicator').style.display = 'none';
    }

    switchToStationUI() {
        document.getElementById('miningUI').style.display = 'none';
        document.getElementById('miningControls').style.display = 'none';
        document.getElementById('stationUI').style.display = 'block';
        document.getElementById('stationControls').style.display = 'block';
        document.getElementById('stationGrid').style.display = 'block';
        document.getElementById('viewIndicator').textContent = '🏗️ Station Builder';
        document.getElementById('autoMiningIndicator').style.display = 'none';
    }

    // Enhanced artifact discovery feedback
    showArtifactDiscovery(artifact) {
        const rarityColor = this.getRarityColor(artifact.rarity);
        const message = `🎉 ${artifact.icon} ${artifact.name} discovered!\nRarity: ${artifact.rarity.toUpperCase()}\nValue: ${artifact.value} research`;
        
        this.showAlert('Artifact Discovered!', message);
        this.showNotification(`✨ Found ${artifact.rarity} artifact: ${artifact.name}`, 'success', 4000);
    }

    // Field completion UI
    async showFieldComplete(currentField, maxFields, travelCost, fuelRemaining) {
        const message = `Field ${currentField} cleared! 🌟\n\nContinue to Field ${currentField + 1}?\n\nTravel Cost: ${travelCost} fuel\nFuel Remaining: ${fuelRemaining}\n\nDeeper fields have rarer materials & artifacts!`;
        
        return await this.showConfirm('Field Complete!', message);
    }

    // Expedition complete UI
    showExpeditionComplete() {
        return this.showAlert('Expedition Complete!', '🏆 You\'ve reached the deepest field!\nReturning to station with your treasures.');
    }

    // Station docking feedback
    showStationDocked(resourceValue) {
        document.getElementById('viewIndicator').textContent = `🏗️ Station Builder - Refueled! (+${resourceValue} resources)`;
        this.showNotification(`⛽ Docked successfully! +${resourceValue} resources collected`, 'success');
    }

    // Insufficient fuel warning
    showInsufficientFuel(requiredFuel) {
        return this.showAlert('Insufficient Fuel', `❌ Not enough fuel for expedition!\nNeed ${requiredFuel} fuel to launch.`);
    }

    // Helper method for rarity colors
    getRarityColor(rarity) {
        const colors = {
            'common': '#ffffff',
            'uncommon': '#2ecc71',
            'rare': '#3498db',
            'epic': '#9b59b6',
            'legendary': '#ff6b9d'
        };
        return colors[rarity] || '#ffffff';
    }

    // Initialize title sequence
    initializeTitleSequence(autoMiningEnabled) {
        setTimeout(() => {
            const titleElement = document.getElementById('gameTitle');
            if (titleElement) {
                titleElement.style.display = 'none';
            }
            
            // Show auto-mining indicator if enabled
            if (autoMiningEnabled) {
                document.getElementById('autoMiningIndicator').style.display = 'block';
            }
            
            // Welcome notification
            this.showNotification('🌟 Welcome to Cosmic Collection Station!', 'info', 4000);
        }, 3000);
    }

    // Victory screen for collecting all 5 Master Artifacts
    showVictoryScreen() {
        const victoryMessage = `🎉 COSMIC VICTORY! 🎉

You have collected all 5 Master Artifacts and achieved the ultimate goal!

🌌 Artifact of Unity
📚 Artifact of Knowledge  
🌱 Artifact of Growth
⭐ Artifact of Energy
🕰️ Artifact of Time

Your Tier 5 Stellar Research Station is now complete, unlocking the secrets of the cosmos! The universe's greatest mysteries are now within your grasp.

Congratulations, Space Pioneer! 🚀✨

The cosmos await your next adventure...`;

        // Create a special victory modal
        const victoryModal = document.createElement('div');
        victoryModal.innerHTML = `
            <div class="modal" style="display: flex; background: rgba(0,0,0,0.9);">
                <div class="modal-content" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: 3px solid #ffd700;
                    border-radius: 15px;
                    text-align: center;
                    padding: 30px;
                    max-width: 600px;
                    box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
                ">
                    <h2 style="color: #ffd700; font-size: 2.5em; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
                        🌟 COSMIC VICTORY! 🌟
                    </h2>
                    <div style="color: white; font-size: 1.1em; line-height: 1.6; white-space: pre-line; margin-bottom: 30px;">
                        ${victoryMessage.split('\n').slice(2).join('\n')}
                    </div>
                    <button onclick="location.reload()" style="
                        background: linear-gradient(45deg, #ffd700, #ffed4e);
                        color: #333;
                        border: none;
                        padding: 15px 30px;
                        font-size: 1.2em;
                        font-weight: bold;
                        border-radius: 25px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🚀 Start New Journey
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(victoryModal);
        
        // Trigger confetti effect with notifications
        this.showNotification('🎊 ALL MASTER ARTIFACTS COLLECTED! 🎊', 'legendary', 8000);
        setTimeout(() => {
            this.showNotification('🌌 TIER 5 STELLAR RESEARCH STATION ACHIEVED! 🌌', 'legendary', 8000);
        }, 2000);
        
        // Play victory sound effect if possible
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRvIAAABXQVZFZm10IAAAAAABABAIAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
            audio.play().catch(() => {}); // Fail silently if audio doesn't work
        } catch (e) {
            // Audio not supported, continue silently
        }
    }

    // Show Master Artifact progress for players
    showMasterArtifactProgress(progress) {
        const progressLines = [];
        
        Object.entries(progress).forEach(([key, data]) => {
            if (!data.collected) {
                let progressText;
                if (key === 'energy') {
                    progressText = `${data.description}: ${(data.current * 100).toFixed(1)}%/${(data.required * 100)}%`;
                } else {
                    progressText = `${data.description}: ${data.current}/${data.required}`;
                }
                
                // Add progress indicator
                const percentage = Math.min(100, (data.current / data.required) * 100);
                const bars = Math.floor(percentage / 10);
                const progressBar = '█'.repeat(bars) + '░'.repeat(10 - bars);
                
                progressLines.push(`${progressText} [${progressBar}]`);
            }
        });
        
        if (progressLines.length > 0) {
            this.showNotification(
                `🌟 Master Artifact Progress:\n${progressLines.join('\n')}`,
                'info',
                6000
            );
        }
    }
} 