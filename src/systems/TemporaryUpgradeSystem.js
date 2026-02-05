/**
 * Temporary Upgrade System
 * 
 * Manages power-ups gained during exploration runs.
 * All upgrades are TEMPORARY and lost on:
 * - Player death (extractionFailed)
 * - Failed extraction
 * 
 * Upgrades are converted to bonus XP on successful extraction.
 * 
 * Design Law: Combat power is temporary.
 */

export const UPGRADE_TYPES = {
  DAMAGE_BOOST: {
    id: 'damage_boost',
    name: 'Fury',
    description: '+25% damage',
    color: 0xff4444,
    effect: { damageMultiplier: 1.25 },
    duration: null, // Permanent until extraction/death
    stackable: true,
    maxStacks: 3
  },
  SPEED_BOOST: {
    id: 'speed_boost',
    name: 'Swiftness',
    description: '+20% movement speed',
    color: 0x44ff44,
    effect: { speedMultiplier: 1.20 },
    duration: null,
    stackable: true,
    maxStacks: 3
  },
  HEALTH_REGEN: {
    id: 'health_regen',
    name: 'Vitality',
    description: 'Regenerate 1 HP/sec',
    color: 0xff88ff,
    effect: { healthRegenPerSecond: 1 },
    duration: null,
    stackable: true,
    maxStacks: 5
  },
  EXTRA_DASH: {
    id: 'extra_dash',
    name: 'Blink',
    description: '+1 dash charge (45s)',
    color: 0x44ffff,
    effect: { extraDashCharges: 1 },
    duration: 45000, // 45 seconds
    stackable: true,
    maxStacks: 2
  },
  STAMINA_EFFICIENCY: {
    id: 'stamina_efficiency',
    name: 'Endurance',
    description: '-20% stamina cost',
    color: 0x88ff88,
    effect: { staminaCostMultiplier: 0.80 },
    duration: null,
    stackable: true,
    maxStacks: 3
  }
};

export class TemporaryUpgradeSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Active upgrades: Map of upgradeId -> { type, stacks, appliedAt }
    this.activeUpgrades = new Map();
    
    // Computed buff totals (recalculated on change)
    this.buffs = {
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      healthRegenPerSecond: 0,
      extraDashCharges: 0,
      staminaCostMultiplier: 1.0
    };
    
    // Track total upgrades collected this run (for extraction bonus)
    this.totalUpgradesCollected = 0;
    
    // Health regen timer
    this.regenTimer = 0;
    
    // Listen for extraction/death events
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Clear all upgrades on death
    this.scene.registry.events.on('playerDied', () => {
      this.onExtractionFailed();
    });
    
    // Clear upgrades on successful extraction (with bonus)
    this.scene.registry.events.on('extractionSuccess', () => {
      this.onExtractionSuccess();
    });
  }
  
  /**
   * Add an upgrade to the player
   * @param {string} upgradeTypeId - Key from UPGRADE_TYPES
   * @returns {boolean} - Whether the upgrade was added
   */
  addUpgrade(upgradeTypeId) {
    const upgradeType = UPGRADE_TYPES[upgradeTypeId];
    if (!upgradeType) {
      console.warn(`Unknown upgrade type: ${upgradeTypeId}`);
      return false;
    }
    
    const existing = this.activeUpgrades.get(upgradeType.id);
    
    if (existing) {
      // Check if we can stack
      if (!upgradeType.stackable || existing.stacks >= upgradeType.maxStacks) {
        // Can't add more - emit feedback
        this.scene.events.emit('upgradeMaxed', { upgrade: upgradeType });
        return false;
      }
      
      // Add stack
      existing.stacks++;
    } else {
      // New upgrade
      this.activeUpgrades.set(upgradeType.id, {
        type: upgradeType,
        stacks: 1,
        appliedAt: Date.now()
      });
    }
    
    this.totalUpgradesCollected++;
    this.recalculateBuffs();
    
    // Emit event for UI/feedback
    this.scene.events.emit('upgradeGained', {
      upgrade: upgradeType,
      stacks: this.activeUpgrades.get(upgradeType.id).stacks,
      totalActive: this.activeUpgrades.size
    });
    
    this.scene.registry.events.emit('upgradeGained', {
      upgrade: upgradeType,
      stacks: this.activeUpgrades.get(upgradeType.id).stacks,
      totalActive: this.activeUpgrades.size
    });
    
    return true;
  }
  
  /**
   * Recalculate all buff totals from active upgrades
   */
  recalculateBuffs() {
    // Reset to defaults
    this.buffs = {
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      healthRegenPerSecond: 0,
      extraDashCharges: 0,
      staminaCostMultiplier: 1.0
    };
    
    // Apply each active upgrade
    this.activeUpgrades.forEach((upgrade) => {
      const effect = upgrade.type.effect;
      const stacks = upgrade.stacks;
      
      if (effect.damageMultiplier) {
        // Multiplicative stacking: 1.25^stacks
        this.buffs.damageMultiplier *= Math.pow(effect.damageMultiplier, stacks);
      }
      if (effect.speedMultiplier) {
        this.buffs.speedMultiplier *= Math.pow(effect.speedMultiplier, stacks);
      }
      if (effect.healthRegenPerSecond) {
        // Additive stacking
        this.buffs.healthRegenPerSecond += effect.healthRegenPerSecond * stacks;
      }
      if (effect.extraDashCharges) {
        this.buffs.extraDashCharges += effect.extraDashCharges * stacks;
      }
      if (effect.staminaCostMultiplier) {
        this.buffs.staminaCostMultiplier *= Math.pow(effect.staminaCostMultiplier, stacks);
      }
    });
    
    // Notify systems that buffs changed
    this.scene.events.emit('buffsChanged', this.buffs);
    this.scene.registry.events.emit('buffsChanged', this.buffs);
  }
  
  /**
   * Update loop - handles health regen and timed upgrades
   * @param {number} delta - Time since last frame in ms
   */
  update(delta) {
    const now = Date.now();
    
    // Check for expired timed upgrades
    const expiredUpgrades = [];
    this.activeUpgrades.forEach((upgrade, id) => {
      if (upgrade.type.duration) {
        const elapsed = now - upgrade.appliedAt;
        const remaining = upgrade.type.duration - elapsed;
        
        if (remaining <= 0) {
          expiredUpgrades.push(id);
        }
      }
    });
    
    // Remove expired upgrades
    if (expiredUpgrades.length > 0) {
      expiredUpgrades.forEach(id => {
        const upgrade = this.activeUpgrades.get(id);
        this.activeUpgrades.delete(id);
        
        // Notify UI
        this.scene.events.emit('upgradeExpired', { upgrade: upgrade.type });
        this.scene.registry.events.emit('upgradeExpired', { upgrade: upgrade.type });
      });
      
      this.recalculateBuffs();
    }
    
    // Emit active modifiers for UI display
    this.emitActiveModifiers();
    
    // Health regeneration
    if (this.buffs.healthRegenPerSecond > 0 && this.scene.player) {
      this.regenTimer += delta;
      
      if (this.regenTimer >= 1000) {
        this.regenTimer -= 1000;
        const player = this.scene.player;
        
        if (player.health < player.maxHealth) {
          player.heal(Math.floor(this.buffs.healthRegenPerSecond));
        }
      }
    }
  }
  
  /**
   * Emit current active modifiers with remaining time for UI
   */
  emitActiveModifiers() {
    const now = Date.now();
    const modifiers = [];
    
    this.activeUpgrades.forEach((upgrade) => {
      const remaining = upgrade.type.duration 
        ? Math.max(0, upgrade.type.duration - (now - upgrade.appliedAt))
        : null;
      
      modifiers.push({
        id: upgrade.type.id,
        name: upgrade.type.name,
        icon: upgrade.type.icon || '⚡',
        color: upgrade.type.color,
        stacks: upgrade.stacks,
        remaining: remaining,
        duration: upgrade.type.duration
      });
    });
    
    // Only emit if there are active modifiers (performance)
    if (modifiers.length > 0 || this._lastModifierCount > 0) {
      this.scene.registry.set('activeModifiers', modifiers);
      this._lastModifierCount = modifiers.length;
    }
  }
  
  /**
   * Get current buff value for a specific stat
   */
  getBuff(buffName) {
    return this.buffs[buffName] ?? 1.0;
  }
  
  /**
   * Get all active upgrades for UI display
   * @returns {Array} - Array of { type, stacks }
   */
  getActiveUpgrades() {
    return Array.from(this.activeUpgrades.values()).map(u => ({
      type: u.type,
      stacks: u.stacks
    }));
  }
  
  /**
   * Called when player dies or fails to extract
   * All upgrades LOST with no benefit
   */
  onExtractionFailed() {
    const lost = this.activeUpgrades.size;
    
    // Clear everything
    this.activeUpgrades.clear();
    this.totalUpgradesCollected = 0;
    this.recalculateBuffs();
    
    // Notify
    this.scene.events.emit('upgradesLost', { count: lost, reason: 'death' });
    this.scene.registry.events.emit('upgradesLost', { count: lost, reason: 'death' });
  }
  
  /**
   * Called when player successfully extracts to town
   * Upgrades converted to bonus XP
   */
  onExtractionSuccess() {
    const upgradeCount = this.totalUpgradesCollected;
    const bonusXP = upgradeCount * 5; // 5 XP per upgrade collected
    
    // Award bonus XP
    if (bonusXP > 0) {
      const currentXP = this.scene.registry.get('xp') || 0;
      this.scene.registry.set('xp', currentXP + bonusXP);
      
      this.scene.events.emit('extractionBonus', { 
        upgrades: upgradeCount, 
        bonusXP 
      });
      this.scene.registry.events.emit('extractionBonus', {
        upgrades: upgradeCount,
        bonusXP
      });
    }
    
    // Clear upgrades (they don't persist between runs)
    this.activeUpgrades.clear();
    this.totalUpgradesCollected = 0;
    this.recalculateBuffs();
  }
  
  /**
   * Check if player has a specific upgrade
   */
  hasUpgrade(upgradeTypeId) {
    const type = UPGRADE_TYPES[upgradeTypeId];
    return type ? this.activeUpgrades.has(type.id) : false;
  }
  
  /**
   * Get stack count for a specific upgrade
   */
  getUpgradeStacks(upgradeTypeId) {
    const type = UPGRADE_TYPES[upgradeTypeId];
    if (!type) return 0;
    const upgrade = this.activeUpgrades.get(type.id);
    return upgrade ? upgrade.stacks : 0;
  }
}
