// src/systems/EventSystem.js
import Phaser from 'phaser';
import { EventDatabase } from '../data/EventDatabase.js';

export class EventSystem {
    constructor(scene) {
        this.scene = scene;
        this.cooldown = 0;
        this.isEventActive = false;
        
        // Encounter system state
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;
        this.distanceTraveled = 0;
        this.encounterCooldown = 0; // ms until next encounter can trigger
        
        // Tuning knobs
        this.encounterDistanceThreshold = 400;  // pixels traveled before roll
        this.encounterChance = 0.25;            // 25% chance per threshold
        this.encounterCooldownTime = 8000;      // ms cooldown after event
    }

    /**
     * Call this every frame from GameScene.update() to track movement and trigger encounters.
     */
    update(delta) {
        if (this.isEventActive) return;
        
        // Reduce cooldown
        if (this.encounterCooldown > 0) {
            this.encounterCooldown -= delta;
            return;
        }
        
        const player = this.scene.player;
        if (!player || !player.sprite) return;
        
        const px = player.sprite.x;
        const py = player.sprite.y;
        
        // Accumulate distance traveled
        const dx = px - this.lastPlayerX;
        const dy = py - this.lastPlayerY;
        const moved = Math.sqrt(dx * dx + dy * dy);
        
        // Only count if player actually moved (ignore teleports/spawns)
        if (moved < 200) {
            this.distanceTraveled += moved;
        }
        
        this.lastPlayerX = px;
        this.lastPlayerY = py;
        
        // Check if we've traveled enough to roll for an encounter
        if (this.distanceTraveled >= this.encounterDistanceThreshold) {
            this.distanceTraveled = 0;
            
            // Roll for encounter
            if (Math.random() < this.encounterChance) {
                this.triggerRandomEvent();
            }
        }
    }

    triggerRandomEvent() {
        if (this.isEventActive) return;

        const randomIndex = Phaser.Math.Between(0, EventDatabase.length - 1);
        const eventData = EventDatabase[randomIndex];

        this.startEvent(eventData);
    }

    startEvent(eventData) {
        this.isEventActive = true;
        
        // Pause game logic if necessary
        // this.scene.physics.world.pause(); 

        // Get UI Scene to show dialog
        const uiScene = this.scene.scene.get('UIScene');
        if (uiScene) {
            uiScene.events.emit('triggerEventUI', eventData, (choice) => this.handleChoice(choice));
        }
    }

    handleChoice(choice) {
        // Execute effect
        const resultText = choice.effect(this.scene);
        
        // Return text to UI to display result
        return resultText;
    }

    completeEvent() {
        this.isEventActive = false;
        // Start cooldown before next encounter can occur
        this.encounterCooldown = this.encounterCooldownTime;
        this.distanceTraveled = 0;
        // Resume game logic
        // this.scene.physics.world.resume();
    }
}
