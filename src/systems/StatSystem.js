/**
 * StatSystem - RPG-style character stats
 * 
 * Stats:
 *   STR (Strength)  - Physical power, lifting, melee damage
 *   DEX (Dexterity) - Agility, speed, ranged accuracy
 *   INT (Intelligence) - Magic power, knowledge checks
 *   CHA (Charisma) - Persuasion, bartering, reputation effects
 *   CON (Constitution) - Health pool, poison resistance
 *   LCK (Luck) - Critical chance, loot quality, random event outcomes
 * 
 * Base stats start at 10. Checks roll 1d20 + modifier vs difficulty.
 */
export class StatSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Initialize stats from registry or use defaults
    this.initStats();
  }

  initStats() {
    const r = this.scene.registry;
    
    // Only set defaults if not already present
    if (r.get('stats') === undefined) {
      r.set('stats', {
        str: 10,  // Strength
        dex: 10,  // Dexterity
        int: 10,  // Intelligence
        cha: 10,  // Charisma
        con: 10,  // Constitution
        lck: 10   // Luck
      });
    }
  }

  /**
   * Get a stat value
   */
  getStat(stat) {
    const stats = this.scene.registry.get('stats') || {};
    return stats[stat.toLowerCase()] || 10;
  }

  /**
   * Get stat modifier (D&D style: (stat - 10) / 2)
   */
  getModifier(stat) {
    const value = this.getStat(stat);
    return Math.floor((value - 10) / 2);
  }

  /**
   * Modify a stat permanently
   */
  modifyStat(stat, amount) {
    const stats = this.scene.registry.get('stats') || {};
    const key = stat.toLowerCase();
    stats[key] = Math.max(1, Math.min(30, (stats[key] || 10) + amount));
    this.scene.registry.set('stats', stats);
    this.scene.events.emit('statChanged', { stat: key, value: stats[key], change: amount });
  }

  /**
   * Set a stat to a specific value
   */
  setStat(stat, value) {
    const stats = this.scene.registry.get('stats') || {};
    const key = stat.toLowerCase();
    stats[key] = Math.max(1, Math.min(30, value));
    this.scene.registry.set('stats', stats);
  }

  /**
   * Perform a stat check (roll 1d20 + modifier vs difficulty)
   * @param {string} stat - The stat to check (str, dex, int, cha, con, lck)
   * @param {number} difficulty - Target number to beat (easy=8, medium=12, hard=16, extreme=20)
   * @returns {{success: boolean, roll: number, modifier: number, total: number, difficulty: number}}
   */
  check(stat, difficulty = 12) {
    const modifier = this.getModifier(stat);
    const roll = Math.floor(Math.random() * 20) + 1; // 1d20
    const total = roll + modifier;
    const success = total >= difficulty;
    
    return {
      success,
      roll,
      modifier,
      total,
      difficulty,
      criticalSuccess: roll === 20,
      criticalFailure: roll === 1
    };
  }

  /**
   * Opposed check - your stat vs opponent's stat
   */
  opposedCheck(yourStat, opponentStatValue = 10) {
    const yourMod = this.getModifier(yourStat);
    const oppMod = Math.floor((opponentStatValue - 10) / 2);
    
    const yourRoll = Math.floor(Math.random() * 20) + 1;
    const oppRoll = Math.floor(Math.random() * 20) + 1;
    
    const yourTotal = yourRoll + yourMod;
    const oppTotal = oppRoll + oppMod;
    
    return {
      success: yourTotal > oppTotal,
      yourRoll,
      yourTotal,
      oppRoll,
      oppTotal,
      margin: yourTotal - oppTotal
    };
  }

  /**
   * Get all stats as an object
   */
  getAllStats() {
    return this.scene.registry.get('stats') || {
      str: 10, dex: 10, int: 10, cha: 10, con: 10, lck: 10
    };
  }

  /**
   * Check difficulty helper constants
   */
  static get DIFFICULTY() {
    return {
      TRIVIAL: 5,
      EASY: 8,
      MEDIUM: 12,
      HARD: 15,
      VERY_HARD: 18,
      EXTREME: 22,
      LEGENDARY: 25
    };
  }
}
