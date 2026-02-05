/**
 * Progression System
 * 
 * The core of the gameplay loop: XP → Levels → Abilities
 * 
 * Killing enemies + discovering things = XP
 * XP fills bar = Level up
 * Level up = Ability point
 * Abilities = Permanent upgrades that change gameplay
 */

// Ability definitions with effects
export const ABILITIES = {
  // Tier 1 - 1 point each
  DAMAGE_1: {
    id: 'damage_1',
    name: 'Sharpened Edge',
    description: '+15% damage',
    tier: 1,
    cost: 1,
    icon: '⚔️',
    effect: { damageMultiplier: 1.15 },
    requires: null
  },
  SPEED_1: {
    id: 'speed_1',
    name: 'Light Feet',
    description: '+12% move speed',
    tier: 1,
    cost: 1,
    icon: '👟',
    effect: { speedMultiplier: 1.12 },
    requires: null
  },
  HEALTH_1: {
    id: 'health_1',
    name: 'Tough Hide',
    description: '+20 max health',
    tier: 1,
    cost: 1,
    icon: '❤️',
    effect: { maxHealthBonus: 20 },
    requires: null
  },
  TRADE_1: {
    id: 'trade_1',
    name: 'Silver Tongue',
    description: '+25% sell prices',
    tier: 1,
    cost: 1,
    icon: '💰',
    effect: { sellPriceMultiplier: 1.25 },
    requires: null
  },
  
  // Tier 2 - 2 points each, may require Tier 1
  DAMAGE_2: {
    id: 'damage_2',
    name: 'Brutal Force',
    description: '+30% damage',
    tier: 2,
    cost: 2,
    icon: '🗡️',
    effect: { damageMultiplier: 1.30 },
    requires: 'damage_1'
  },
  DASH_EXTRA: {
    id: 'dash_extra',
    name: 'Wind Walker',
    description: '+1 dash charge',
    tier: 2,
    cost: 2,
    icon: '💨',
    effect: { extraDashCharges: 1 },
    requires: 'speed_1'
  },
  HEALTH_2: {
    id: 'health_2',
    name: 'Iron Will',
    description: '+40 max health, slow regen',
    tier: 2,
    cost: 2,
    icon: '🛡️',
    effect: { maxHealthBonus: 40, healthRegen: 1 },
    requires: 'health_1'
  },
  AOE_SIZE: {
    id: 'aoe_size',
    name: 'Expanding Force',
    description: '+50% AOE attack size',
    tier: 2,
    cost: 2,
    icon: '💥',
    effect: { aoeMultiplier: 1.5 },
    requires: 'damage_1'
  },
  
  // Tier 3 - 3 points each
  LIFESTEAL: {
    id: 'lifesteal',
    name: 'Vampiric Strike',
    description: 'Heal 10% of damage dealt',
    tier: 3,
    cost: 3,
    icon: '🩸',
    effect: { lifestealPercent: 0.10 },
    requires: 'damage_2'
  },
  DOUBLE_DASH: {
    id: 'double_dash',
    name: 'Blink Step',
    description: 'Dash twice as far',
    tier: 3,
    cost: 3,
    icon: '⚡',
    effect: { dashDistanceMultiplier: 2.0 },
    requires: 'dash_extra'
  }
};

// XP required for each level (exponential curve)
export const LEVEL_XP = [
  0,      // Level 1 (starting)
  50,     // Level 2
  120,    // Level 3
  220,    // Level 4
  350,    // Level 5
  520,    // Level 6
  730,    // Level 7
  1000,   // Level 8
  1350,   // Level 9
  1800    // Level 10
];

// XP rewards for various actions
export const XP_REWARDS = {
  KILL_MELEE: 15,
  KILL_RANGER: 20,
  KILL_GUARD: 25,
  OPEN_CACHE: 10,
  COMPLETE_TRADE: 8,
  DISCOVER_ZONE: 30,
  COMPLETE_OBJECTIVE: 50
};

export class ProgressionSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Load existing progress or initialize
    this.xp = scene.registry.get('playerXP') || 0;
    this.level = scene.registry.get('playerLevel') || 1;
    this.abilityPoints = scene.registry.get('abilityPoints') || 0;
    this.unlockedAbilities = new Set(scene.registry.get('unlockedAbilities') || []);
    
    // Calculated buffs from abilities
    this.activeBuffs = {};
    this.recalculateBuffs();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Sync to registry
    this.saveToRegistry();
    
    console.log(`[ProgressionSystem] Initialized: Level ${this.level}, XP ${this.xp}/${this.getXPForNextLevel()}`);
  }
  
  setupEventListeners() {
    // Listen for XP-granting events
    this.scene.events.on('enemyKilled', (data) => this.onEnemyKilled(data));
    this.scene.events.on('cacheOpened', (data) => this.addXP(XP_REWARDS.OPEN_CACHE, 'cache'));
    this.scene.events.on('sale', (data) => this.addXP(XP_REWARDS.COMPLETE_TRADE, 'trade'));
    this.scene.events.on('zoneDiscovered', (data) => this.addXP(XP_REWARDS.DISCOVER_ZONE, 'exploration'));
    
    // Cross-scene events
    this.scene.registry.events.on('enemyKilled', (data) => this.onEnemyKilled(data));
    this.scene.registry.events.on('sale', (data) => this.addXP(XP_REWARDS.COMPLETE_TRADE, 'trade'));
  }
  
  /**
   * Handle enemy killed - determine XP based on enemy type
   */
  onEnemyKilled(data) {
    const enemyType = data?.type || data?.enemyType || 'melee';
    let xpReward = XP_REWARDS.KILL_MELEE;
    
    if (enemyType === 'ranger' || enemyType === 'Ranger') {
      xpReward = XP_REWARDS.KILL_RANGER;
    } else if (enemyType === 'guard' || enemyType === 'Guard') {
      xpReward = XP_REWARDS.KILL_GUARD;
    }
    
    this.addXP(xpReward, `kill_${enemyType}`);
  }
  
  /**
   * Add XP and check for level up
   */
  addXP(amount, source = 'unknown') {
    const oldXP = this.xp;
    const oldLevel = this.level;
    
    this.xp += amount;
    
    // Check for level up(s)
    while (this.level < LEVEL_XP.length && this.xp >= this.getXPForNextLevel()) {
      this.levelUp();
    }
    
    // Save to registry
    this.saveToRegistry();
    
    // Emit XP gained event for UI
    this.scene.events.emit('xpGained', {
      amount,
      source,
      totalXP: this.xp,
      level: this.level,
      xpForNextLevel: this.getXPForNextLevel(),
      leveledUp: this.level > oldLevel
    });
    
    // Also emit via registry for cross-scene communication (UIScene)
    this.scene.registry.events.emit('xpGained', {
      amount,
      source,
      totalXP: this.xp,
      level: this.level,
      xpForNextLevel: this.getXPForNextLevel(),
      leveledUp: this.level > oldLevel
    });
    
    console.log(`[ProgressionSystem] +${amount} XP from ${source}. Total: ${this.xp}/${this.getXPForNextLevel()}`);
  }
  
  /**
   * Level up!
   */
  levelUp() {
    this.level++;
    this.abilityPoints++;
    
    console.log(`[ProgressionSystem] LEVEL UP! Now level ${this.level}. Ability points: ${this.abilityPoints}`);
    
    // Emit level up event for UI celebration
    this.scene.events.emit('levelUp', {
      newLevel: this.level,
      abilityPoints: this.abilityPoints,
      xpForNextLevel: this.getXPForNextLevel()
    });
    
    // Also emit via registry for cross-scene communication (UIScene listens to 'playerLeveled')
    this.scene.registry.events.emit('playerLeveled', {
      level: this.level,
      abilityPoints: this.abilityPoints
    });
    
    // Visual/audio feedback
    try {
      this.scene.events.emit('message', `🎉 LEVEL UP! You are now level ${this.level}!`);
    } catch (e) {}
  }
  
  /**
   * Get XP needed for next level
   */
  getXPForNextLevel() {
    if (this.level >= LEVEL_XP.length) {
      // Max level reached
      return Infinity;
    }
    return LEVEL_XP[this.level];
  }
  
  /**
   * Get XP progress as percentage (0-1)
   */
  getXPProgress() {
    const prevLevelXP = this.level > 1 ? LEVEL_XP[this.level - 1] : 0;
    const nextLevelXP = this.getXPForNextLevel();
    
    if (nextLevelXP === Infinity) return 1;
    
    const progressXP = this.xp - prevLevelXP;
    const neededXP = nextLevelXP - prevLevelXP;
    
    return Math.min(1, progressXP / neededXP);
  }
  
  /**
   * Unlock an ability
   */
  unlockAbility(abilityId) {
    const ability = ABILITIES[abilityId] || Object.values(ABILITIES).find(a => a.id === abilityId);
    
    if (!ability) {
      console.warn(`[ProgressionSystem] Unknown ability: ${abilityId}`);
      return { success: false, reason: 'Unknown ability' };
    }
    
    if (this.unlockedAbilities.has(ability.id)) {
      return { success: false, reason: 'Already unlocked' };
    }
    
    if (this.abilityPoints < ability.cost) {
      return { success: false, reason: 'Not enough ability points' };
    }
    
    if (ability.requires && !this.unlockedAbilities.has(ability.requires)) {
      const reqAbility = Object.values(ABILITIES).find(a => a.id === ability.requires);
      return { success: false, reason: `Requires ${reqAbility?.name || ability.requires}` };
    }
    
    // Unlock it!
    this.abilityPoints -= ability.cost;
    this.unlockedAbilities.add(ability.id);
    
    // Recalculate buffs
    this.recalculateBuffs();
    
    // Save to registry
    this.saveToRegistry();
    
    // Emit event
    this.scene.events.emit('abilityUnlocked', {
      ability,
      remainingPoints: this.abilityPoints
    });
    
    console.log(`[ProgressionSystem] Unlocked ability: ${ability.name}`);
    
    try {
      this.scene.events.emit('message', `✨ Unlocked: ${ability.icon} ${ability.name}!`);
    } catch (e) {}
    
    return { success: true, ability };
  }
  
  /**
   * Recalculate all buff values from unlocked abilities
   */
  recalculateBuffs() {
    this.activeBuffs = {
      damageMultiplier: 1,
      speedMultiplier: 1,
      maxHealthBonus: 0,
      sellPriceMultiplier: 1,
      extraDashCharges: 0,
      healthRegen: 0,
      aoeMultiplier: 1,
      lifestealPercent: 0,
      dashDistanceMultiplier: 1
    };
    
    for (const abilityId of this.unlockedAbilities) {
      const ability = Object.values(ABILITIES).find(a => a.id === abilityId);
      if (!ability || !ability.effect) continue;
      
      for (const [key, value] of Object.entries(ability.effect)) {
        if (key.includes('Multiplier')) {
          // Multiply multipliers
          this.activeBuffs[key] = (this.activeBuffs[key] || 1) * value;
        } else if (key.includes('Bonus') || key.includes('extra') || key.includes('Percent') || key.includes('Regen')) {
          // Add additive bonuses
          this.activeBuffs[key] = (this.activeBuffs[key] || 0) + value;
        }
      }
    }
    
    // Emit buffs changed for systems that care
    this.scene.events.emit('buffsChanged', this.activeBuffs);
  }
  
  /**
   * Get a specific buff value
   */
  getBuff(buffName) {
    return this.activeBuffs[buffName] ?? (buffName.includes('Multiplier') ? 1 : 0);
  }
  
  /**
   * Get all available abilities for UI
   */
  getAvailableAbilities() {
    return Object.values(ABILITIES).filter(ability => {
      // Not already unlocked
      if (this.unlockedAbilities.has(ability.id)) return false;
      // Requirements met
      if (ability.requires && !this.unlockedAbilities.has(ability.requires)) return false;
      return true;
    });
  }
  
  /**
   * Get all unlocked abilities
   */
  getUnlockedAbilities() {
    return Array.from(this.unlockedAbilities).map(id => 
      Object.values(ABILITIES).find(a => a.id === id)
    ).filter(Boolean);
  }
  
  /**
   * Get current progression state for UI
   */
  getState() {
    return {
      xp: this.xp,
      level: this.level,
      xpProgress: this.getXPProgress(),
      xpForNextLevel: this.getXPForNextLevel(),
      abilityPoints: this.abilityPoints,
      unlockedAbilities: this.getUnlockedAbilities(),
      availableAbilities: this.getAvailableAbilities(),
      buffs: { ...this.activeBuffs }
    };
  }
  
  /**
   * Save progression to registry for persistence across scenes
   */
  saveToRegistry() {
    this.scene.registry.set('playerXP', this.xp);
    this.scene.registry.set('playerLevel', this.level);
    this.scene.registry.set('abilityPoints', this.abilityPoints);
    this.scene.registry.set('unlockedAbilities', Array.from(this.unlockedAbilities));
    this.scene.registry.set('progressionBuffs', this.activeBuffs);
    // Also sync to the keys UIScene expects
    this.scene.registry.set('xp', this.xp);
    this.scene.registry.set('level', this.level);
  }
  
  /**
   * Update loop - handle health regen if unlocked
   */
  update(delta) {
    if (this.activeBuffs.healthRegen > 0) {
      // Regen health slowly
      const player = this.scene.player;
      if (player && player.health < player.maxHealth) {
        const regenAmount = this.activeBuffs.healthRegen * (delta / 1000);
        player.heal(regenAmount);
      }
    }
  }
}

/**
 * Create a global progression instance accessible across scenes
 */
export function createGlobalProgression(scene) {
  const existing = scene.registry.get('progressionSystem');
  if (existing) return existing;
  
  const progression = new ProgressionSystem(scene);
  scene.registry.set('progressionSystem', progression);
  return progression;
}

/**
 * Get the global progression instance
 */
export function getGlobalProgression(scene) {
  return scene.registry.get('progressionSystem');
}
