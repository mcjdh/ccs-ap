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
            
            document.getElementById('viewIndicator').textContent = 
                `🚀 Expedition - ${fieldInfo} ${asteroidInfo}${fuelWarning}`;
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
} 