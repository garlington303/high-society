// src/systems/TownResourceSystem.js
import Phaser from 'phaser';
import { getItem } from '../data/ItemDatabase.js';

export class TownResourceSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Initial resource levels (or load from registry)
    this.resources = this.scene.registry.get('townResources') || {
      gold: 0,
      wood: 0,
      stone: 0,
      iron_ore: 0,
      cloth: 0,
      leather: 0
    };
    
    this.prosperity = this.calculateProsperity();
    this.level = this.calculateLevel();
    
    // Listen for gold changes if we want to auto-track (but contribution is manual usually)
  }

  // ------------------------------------------------------------------
  // Contribution Logic
  // ------------------------------------------------------------------

  /**
   * Contribute an item to the town stockpile.
   * @param {string} itemId - Item ID (must be material)
   * @param {number} amount - Quantity
   * @returns {Object} Result { success, fameGained, newTotal }
   */
  contributeItem(itemId, amount) {
    const item = getItem(itemId);
    if (!item || amount <= 0) return { success: false, reason: 'Invalid item' };
    
    // Only allow materials or specific items
    if (item.category !== 'material' && itemId !== 'gold') { // Gold handled separately usually, but unified here for simplicity logic
       // Actually let's allow materials primarily
    }

    if (!this.resources.hasOwnProperty(itemId)) {
      this.resources[itemId] = 0;
    }

    this.resources[itemId] += amount;
    
    // Calculate Fame Reward
    // Base 1 fame per 10 value donated?
    const value = item.value * amount;
    const fameReward = Math.ceil(value / 20); // 1 fame per 20g value
    
    if (fameReward > 0 && this.scene.fameSystem) {
      this.scene.fameSystem.add(fameReward, 'donation');
    }

    this._updateRegistry();
    
    return { 
      success: true, 
      fameGained: fameReward, 
      newTotal: this.resources[itemId],
      message: `Contributed ${amount} ${item.name}`
    };
  }

  contributeGold(amount) {
    if (amount <= 0) return { success: false };
    
    this.resources.gold += amount;
    
    const fameReward = Math.ceil(amount / 50); // 1 fame per 50g
    if (fameReward > 0 && this.scene.fameSystem) {
      this.scene.fameSystem.add(fameReward, 'donation_gold');
    }

    this._updateRegistry();
    return { success: true, fameGained: fameReward, newTotal: this.resources.gold };
  }

  // ------------------------------------------------------------------
  // Queries
  // ------------------------------------------------------------------

  calculateProsperity() {
    let score = 0;
    score += this.resources.gold;
    score += (this.resources.wood || 0) * 5;
    score += (this.resources.stone || 0) * 5;
    score += (this.resources.iron_ore || 0) * 10;
    // ... add other weights
    return score;
  }

  calculateLevel() {
    const p = this.calculateProsperity();
    if (p < 500) return 1; // Struggling
    if (p < 1500) return 2; // Stable
    if (p < 3500) return 3; // Growing
    if (p < 7000) return 4; // Prosperous
    return 5; // Golden Age
  }

  getLevelName() {
    const levels = ['Ruined', 'Struggling', 'Stable', 'Growing', 'Prosperous', 'Golden Age'];
    return levels[this.level] || 'Unknown';
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  _updateRegistry() {
    this.prosperity = this.calculateProsperity();
    this.level = this.calculateLevel();
    
    this.scene.registry.set('townResources', this.resources);
    this.scene.registry.set('townProsperity', this.prosperity);
    this.scene.registry.set('townLevel', this.level);
    
    this.scene.events.emit('townResourcesChanged', this.resources);
  }
}
