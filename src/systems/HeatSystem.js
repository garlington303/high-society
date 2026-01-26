/**
 * Heat System - The core tension mechanic
 *
 * Heat represents how "visible" the player is to law enforcement.
 * It accumulates through risky actions and decays slowly over time.
 *
 * Heat thresholds:
 * 0-20:  Safe - Police ignore you
 * 21-40: Suspicious - Police may investigate if you're near
 * 41-60: Wanted - Police actively look for you
 * 61-80: Hot - Police chase on sight
 * 81-100: Hunted - Maximum police response, very hard to escape
 */

export class HeatSystem {
  constructor(scene) {
    this.scene = scene;
    this.decayRate = 1; // Heat lost per decay tick
    this.decayDelay = 5000; // ms since last heat gain before decay starts
    this.lastHeatGain = 0;

    // Track heat sources for analytics/feedback
    this.heatLog = [];
  }

  add(amount, source) {
    const currentHeat = this.scene.registry.get('heat');
    const maxHeat = this.scene.registry.get('maxHeat');
    const newHeat = Math.min(currentHeat + amount, maxHeat);

    this.scene.registry.set('heat', newHeat);
    this.lastHeatGain = Date.now();

    // Log for feedback
    this.heatLog.push({
      time: Date.now(),
      amount,
      source,
      total: newHeat
    });

    // Keep log manageable
    if (this.heatLog.length > 50) {
      this.heatLog.shift();
    }

    // Emit event for UI
    this.scene.events.emit('heatChanged', {
      heat: newHeat,
      change: amount,
      source
    });

    // Check for threshold crossings
    this.checkThresholds(currentHeat, newHeat);
  }

  reduce(amount) {
    const currentHeat = this.scene.registry.get('heat');
    const newHeat = Math.max(currentHeat - amount, 0);
    this.scene.registry.set('heat', newHeat);

    this.scene.events.emit('heatChanged', {
      heat: newHeat,
      change: -amount,
      source: 'cooldown'
    });
  }

  decay() {
    // Only decay if enough time has passed since last heat gain
    if (Date.now() - this.lastHeatGain < this.decayDelay) {
      return;
    }

    const currentHeat = this.scene.registry.get('heat');
    if (currentHeat > 0) {
      // Decay is slower at high heat (harder to shake attention)
      const decayAmount = currentHeat > 60 ? 0.5 : this.decayRate;
      this.reduce(decayAmount);
    }
  }

  checkThresholds(oldHeat, newHeat) {
    const thresholds = [20, 40, 60, 80, 100];

    thresholds.forEach(threshold => {
      if (oldHeat < threshold && newHeat >= threshold) {
        this.onThresholdCrossed(threshold, 'up');
      } else if (oldHeat >= threshold && newHeat < threshold) {
        this.onThresholdCrossed(threshold, 'down');
      }
    });
  }

  onThresholdCrossed(threshold, direction) {
    const messages = {
      20: {
        up: 'You\'re drawing attention...',
        down: 'Things are cooling off.'
      },
      40: {
        up: 'Police are getting suspicious.',
        down: 'Heat is dropping.'
      },
      60: {
        up: 'You\'re wanted! Lay low!',
        down: 'Pressure is easing.'
      },
      80: {
        up: 'Heavy police presence! Get to safety!',
        down: 'Still hot, but manageable.'
      },
      100: {
        up: 'MAXIMUM HEAT! You\'re being hunted!',
        down: 'Coming down from critical.'
      }
    };

    const message = messages[threshold]?.[direction];
    if (message) {
      this.scene.events.emit('heatWarning', { threshold, direction, message });
    }
  }

  getHeatLevel() {
    const heat = this.scene.registry.get('heat');

    if (heat >= 80) return 'hunted';
    if (heat >= 60) return 'hot';
    if (heat >= 40) return 'wanted';
    if (heat >= 20) return 'suspicious';
    return 'safe';
  }

  getHeatMultiplier() {
    // Returns a multiplier for various systems based on heat
    const heat = this.scene.registry.get('heat');
    return 1 + (heat / 100);
  }

  // For debugging/analytics
  getRecentSources() {
    const recentTime = Date.now() - 30000; // Last 30 seconds
    return this.heatLog
      .filter(log => log.time > recentTime)
      .reduce((acc, log) => {
        acc[log.source] = (acc[log.source] || 0) + log.amount;
        return acc;
      }, {});
  }
}
