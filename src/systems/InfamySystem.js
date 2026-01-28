/**
 * Infamy System - The core tension mechanic
 *
 * Infamy represents how "notorious" the player is to the royal guards and guilds.
 * It accumulates through illegal trades and decays slowly over time.
 *
 * Infamy thresholds:
 * 0-20:  Unknown - Guards ignore you
 * 21-40: Suspicious - Guards may investigate if you're near
 * 41-60: Wanted - Guards actively search for you
 * 61-80: Notorious - Guards chase on sight
 * 81-100: Hunted - Inquisitors dispatched, very hard to escape
 */

export class InfamySystem {
  constructor(scene) {
    this.scene = scene;
    this.decayRate = 1; // Infamy lost per decay tick
    this.decayDelay = 5000; // ms since last infamy gain before decay starts
    this.lastInfamyGain = 0;

    // Track infamy sources for analytics/feedback
    this.infamyLog = [];
  }

  add(amount, source) {
    const currentInfamy = this.scene.registry.get('infamy');
    const maxInfamy = this.scene.registry.get('maxInfamy');
    const newInfamy = Math.min(currentInfamy + amount, maxInfamy);

    this.scene.registry.set('infamy', newInfamy);
    this.lastInfamyGain = Date.now();

    // Log for feedback
    this.infamyLog.push({
      time: Date.now(),
      amount,
      source,
      total: newInfamy
    });

    // Keep log manageable
    if (this.infamyLog.length > 50) {
      this.infamyLog.shift();
    }

    // Emit event for UI
    this.scene.events.emit('infamyChanged', {
      infamy: newInfamy,
      change: amount,
      source
    });

    // Check for threshold crossings
    this.checkThresholds(currentInfamy, newInfamy);
  }

  reduce(amount) {
    const currentInfamy = this.scene.registry.get('infamy');
    const newInfamy = Math.max(currentInfamy - amount, 0);
    this.scene.registry.set('infamy', newInfamy);

    this.scene.events.emit('infamyChanged', {
      infamy: newInfamy,
      change: -amount,
      source: 'cooldown'
    });
  }

  decay() {
    // Only decay if enough time has passed since last infamy gain
    if (Date.now() - this.lastInfamyGain < this.decayDelay) {
      return;
    }

    const currentInfamy = this.scene.registry.get('infamy');
    if (currentInfamy > 0) {
      // Decay is slower at high infamy (harder to shake notoriety)
      const decayAmount = currentInfamy > 60 ? 0.5 : this.decayRate;
      this.reduce(decayAmount);
    }
  }

  checkThresholds(oldInfamy, newInfamy) {
    const thresholds = [20, 40, 60, 80, 100];

    thresholds.forEach(threshold => {
      if (oldInfamy < threshold && newInfamy >= threshold) {
        this.onThresholdCrossed(threshold, 'up');
      } else if (oldInfamy >= threshold && newInfamy < threshold) {
        this.onThresholdCrossed(threshold, 'down');
      }
    });
  }

  onThresholdCrossed(threshold, direction) {
    const messages = {
      20: {
        up: 'The guards are taking notice...',
        down: 'Your notoriety fades.'
      },
      40: {
        up: 'The city watch grows suspicious.',
        down: 'The guards lose interest.'
      },
      60: {
        up: 'You\'re wanted by the Crown! Lay low!',
        down: 'The hunt is easing.'
      },
      80: {
        up: 'Royal guards patrol every street! Find sanctuary!',
        down: 'Still notorious, but manageable.'
      },
      100: {
        up: 'THE INQUISITION IS UPON YOU! FLEE!',
        down: 'Coming down from maximum alert.'
      }
    };

    const message = messages[threshold]?.[direction];
    if (message) {
      this.scene.events.emit('infamyWarning', { threshold, direction, message });
    }
  }

  getInfamyLevel() {
    const infamy = this.scene.registry.get('infamy');

    if (infamy >= 80) return 'hunted';
    if (infamy >= 60) return 'notorious';
    if (infamy >= 40) return 'wanted';
    if (infamy >= 20) return 'suspicious';
    return 'unknown';
  }

  getInfamyMultiplier() {
    // Returns a multiplier for various systems based on infamy
    const infamy = this.scene.registry.get('infamy');
    return 1 + (infamy / 100);
  }

  // For debugging/analytics
  getRecentSources() {
    const recentTime = Date.now() - 30000; // Last 30 seconds
    return this.infamyLog
      .filter(log => log.time > recentTime)
      .reduce((acc, log) => {
        acc[log.source] = (acc[log.source] || 0) + log.amount;
        return acc;
      }, {});
  }
}
