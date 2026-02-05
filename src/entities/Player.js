import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 100;
    this.sprintSpeed = 160;
    this.direction = 'down';
    this.isMoving = false;
    this.isSprinting = false;

    // Health - load from registry
    this.maxHealth = scene.registry.get('playerMaxHealth') ?? 100;
    this.health = scene.registry.get('playerHealth') ?? this.maxHealth;

    // Upkeep stats local tracking (read/write from registry in scene)
    // Player maintains a timer for upkeep damage when starving/dehydrated
    this.upkeepDamageTimer = 0;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player_down');
    // scale player smaller so city feels larger
    this.sprite.setScale(0.6);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setData('entity', this);

    // When true, an external controller drives movement instead
    this.disableManualInput = false;

    // Sprinting costs heat over time
    this.sprintHeatTimer = 0;

    // Dash system (3 charges, positioning tool, not immunity)
    this.maxDashCharges = 3;
    this.dashCharges = scene.registry.get('playerDashCharges') ?? this.maxDashCharges;
    this.dashCooldownPerCharge = 2500; // ms to recharge one charge
    this.dashDistance = 650; // pixels
    this.dashDuration = 280; // ms
    this.dashRecovery = 100; // ms lock after dash ends
    this.isDashing = false;
    this.dashRecovering = false;
    this.dashRechargeTimers = []; // track per-charge recharge progress

    // Stamina system (shared across sprint, primary, secondary)
    this.maxStamina = scene.registry.get('playerMaxStamina') ?? 100;
    this.stamina = scene.registry.get('playerStamina') ?? this.maxStamina;
    this.staminaRegenRate = 15; // per second
    this.staminaRegenDelay = 1200; // ms delay after use before regen starts
    this.lastStaminaUse = 0;
    this.sprintStaminaCost = 0; // per second (reduced by 100%)
    this.primaryAttackStaminaCost = 0; // (reduced by 100%)
    this.secondaryAttackStaminaCost = 0; // (reduced by 100%)

    // Combat properties
    this.primaryAttackCooldown = 450; // ms
    this.secondaryAttackCooldown = 1200; // ms
    this.lastPrimaryAttack = scene.registry.get('playerLastPrimaryAttack') || 0;
    this.lastSecondaryAttack = scene.registry.get('playerLastSecondaryAttack') || 0;
    
    // Base damage values (modified by upgrade system)
    this.basePrimaryDamage = 15;
    this.baseSecondaryDamage = 25;
  }

  /**
   * Get buff multiplier from upgrade system
   * @param {string} buffName - e.g. 'damageMultiplier', 'speedMultiplier'
   * @returns {number} - Buff value or default
   */
  getBuff(buffName) {
    try {
      const upgradeSystem = this.scene.upgradeSystem;
      if (upgradeSystem) {
        return upgradeSystem.getBuff(buffName);
      }
    } catch (e) {}
    
    // Default values
    switch (buffName) {
      case 'damageMultiplier': return 1.0;
      case 'speedMultiplier': return 1.0;
      case 'extraDashCharges': return 0;
      case 'staminaCostMultiplier': return 1.0;
      case 'healthRegenPerSecond': return 0;
      default: return 1.0;
    }
  }

  /**
   * Get current damage output (base * multiplier)
   */
  getPrimaryDamage() {
    return Math.floor(this.basePrimaryDamage * this.getBuff('damageMultiplier'));
  }

  getSecondaryDamage() {
    return Math.floor(this.baseSecondaryDamage * this.getBuff('damageMultiplier'));
  }

  saveToRegistry() {
    this.scene.registry.set('playerHealth', this.health);
    this.scene.registry.set('playerMaxHealth', this.maxHealth);
    this.scene.registry.set('playerStamina', this.stamina);
    this.scene.registry.set('playerMaxStamina', this.maxStamina);
    this.scene.registry.set('playerDashCharges', this.dashCharges);
    this.scene.registry.set('playerLastPrimaryAttack', this.lastPrimaryAttack);
    this.scene.registry.set('playerLastSecondaryAttack', this.lastSecondaryAttack);
  }

  update(cursors, keys, delta) {
    // If external input is controlling movement, derive animation from current velocity
    if (this.disableManualInput) {
      const vx = this.sprite.body.velocity.x;
      const vy = this.sprite.body.velocity.y;
      if (vx !== 0 || vy !== 0) {
        this.isMoving = true;
        // Determine primary direction for sprite
        if (Math.abs(vx) > Math.abs(vy)) {
          this.direction = vx > 0 ? 'right' : 'left';
        } else {
          this.direction = vy > 0 ? 'down' : 'up';
        }
        const walkFrame = Math.floor(Date.now() / 200) % 2;
        const texKey = walkFrame === 0 ? `player_${this.direction}` : `player_${this.direction}_walk`;
        this.sprite.setTexture(texKey);
      } else {
        this.isMoving = false;
        this.sprite.setTexture(`player_${this.direction}`);
      }
      // Skip default input handling
      return;
    }

    let vx = 0;
    let vy = 0;
    let newDirection = this.direction;

    // WASD or Arrow keys
    if (cursors.left.isDown || keys.a.isDown) {
      vx = -1;
      newDirection = 'left';
    } else if (cursors.right.isDown || keys.d.isDown) {
      vx = 1;
      newDirection = 'right';
    }

    if (cursors.up.isDown || keys.w.isDown) {
      vy = -1;
      newDirection = 'up';
    } else if (cursors.down.isDown || keys.s.isDown) {
      vy = 1;
      newDirection = 'down';
    }

    // Sprinting (requires stamina)
    const canSprint = this.stamina > 0 && keys.shift.isDown && (vx !== 0 || vy !== 0);
    this.isSprinting = canSprint;
    let currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;

    // Apply speed buff from upgrades (Swiftness)
    currentSpeed = Math.floor(currentSpeed * this.getBuff('speedMultiplier'));

    // Apply upkeep penalties (hunger/thirst reduce movement and may cause damage)
    try {
      const hunger = this.scene.registry.get('hunger');
      const thirst = this.scene.registry.get('thirst');
      const sleep = this.scene.registry.get('sleep');
      // If very low on hunger or thirst, movement impaired
      if ((hunger !== undefined && hunger <= 10) || (thirst !== undefined && thirst <= 10)) {
        currentSpeed = Math.floor(currentSpeed * 0.7);
      }
      // Extreme tiredness slows movement slightly
      if (sleep !== undefined && sleep <= 10) {
        currentSpeed = Math.floor(currentSpeed * 0.85);
      }
    } catch (e) {}

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.sprite.setVelocity(vx * currentSpeed, vy * currentSpeed);

    // Update direction and animation
    if (vx !== 0 || vy !== 0) {
      this.isMoving = true;
      if (newDirection !== this.direction) {
        this.direction = newDirection;
      }
      // Toggle walk sprite
      const walkFrame = Math.floor(Date.now() / 200) % 2;
      const texKey = walkFrame === 0 ? `player_${this.direction}` : `player_${this.direction}_walk`;
      this.sprite.setTexture(texKey);
      // Emit footstep particle via scene helper (throttled)
      try {
        if (this.scene && typeof this.scene.emitFootstep === 'function') {
          this.scene.emitFootstep(this.sprite.x, this.sprite.y, this.isSprinting);
        }
      } catch (e) {}
    } else {
      this.isMoving = false;
      this.sprite.setTexture(`player_${this.direction}`);
    }

    // Sprinting generates heat and consumes stamina
    if (this.isSprinting) {
      this.sprintHeatTimer += delta;
      if (this.sprintHeatTimer > 2000) {
        if (this.scene.heatSystem) this.scene.heatSystem.add(1, 'sprinting');
        this.sprintHeatTimer = 0;
      }
      // Consume stamina
      const staminaCost = (this.sprintStaminaCost * delta) / 1000;
      this.stamina = Math.max(0, this.stamina - staminaCost);
      this.lastStaminaUse = Date.now();
    } else {
      this.sprintHeatTimer = 0;
    }

    // Stamina regeneration (delayed after use)
    const timeSinceUse = Date.now() - this.lastStaminaUse;
    if (timeSinceUse > this.staminaRegenDelay && this.stamina < this.maxStamina) {
      const regenAmount = (this.staminaRegenRate * delta) / 1000;
      this.stamina = Math.min(this.maxStamina, this.stamina + regenAmount);
    }

    // Upkeep damage if starving/dehydrated
    try {
      const hunger = this.scene.registry.get('hunger') || 0;
      const thirst = this.scene.registry.get('thirst') || 0;
      // Only apply periodic damage when critically low
      if (hunger <= 5 || thirst <= 5) {
        this.upkeepDamageTimer += delta;
        if (this.upkeepDamageTimer > 2000) {
          this.takeDamage(1);
          this.upkeepDamageTimer = 0;
        }
      } else {
        this.upkeepDamageTimer = 0;
      }
    } catch (e) {}

    // Save state to registry for scene transitions
    this.saveToRegistry();
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  primaryAttack(targetX, targetY) {
    const now = Date.now();
    if (now - this.lastPrimaryAttack < this.primaryAttackCooldown) {
      return false;
    }
    if (this.stamina < this.primaryAttackStaminaCost) {
      return false;
    }

    // Calculate angle toward mouse/target position (360 degrees)
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const angle = Math.atan2(dy, dx);

    // Update facing direction based on angle for animations
    const angleDeg = Phaser.Math.RadToDeg(angle);
    if (angleDeg >= -45 && angleDeg < 45) {
      this.direction = 'right';
    } else if (angleDeg >= 45 && angleDeg < 135) {
      this.direction = 'down';
    } else if (angleDeg >= 135 || angleDeg < -135) {
      this.direction = 'left';
    } else {
      this.direction = 'up';
    }

    // Consume stamina
    this.stamina -= this.primaryAttackStaminaCost;
    this.lastStaminaUse = now;
    this.lastPrimaryAttack = now;

    // Emit event for projectile creation with 360-degree angle
    const damage = this.getPrimaryDamage();
    this.scene.events.emit('playerPrimaryAttack', {
      x: this.sprite.x,
      y: this.sprite.y,
      angle: angle,
      direction: this.direction,
      damage: damage
    });
    this.scene.registry.events.emit('playerPrimaryAttack', {
      x: this.sprite.x,
      y: this.sprite.y,
      angle: angle,
      direction: this.direction,
      damage: damage
    });

    return true;
  }

  secondaryAttack() {
    const now = Date.now();
    if (now - this.lastSecondaryAttack < this.secondaryAttackCooldown) {
      return false;
    }
    if (this.stamina < this.secondaryAttackStaminaCost) {
      return false;
    }

    // Consume stamina
    this.stamina -= this.secondaryAttackStaminaCost;
    this.lastStaminaUse = now;
    this.lastSecondaryAttack = now;

    // Emit event for secondary attack (AOE burst)
    const damage = this.getSecondaryDamage();
    this.scene.events.emit('playerSecondaryAttack', {
      x: this.sprite.x,
      y: this.sprite.y,
      damage: damage
    });
    this.scene.registry.events.emit('playerSecondaryAttack', {
      x: this.sprite.x,
      y: this.sprite.y,
      damage: damage
    });

    return true;
  }

  attemptDash(direction) {
    // Can't dash if no charges, already dashing, or in recovery
    if (this.dashCharges <= 0 || this.isDashing || this.dashRecovering) {
      return false;
    }

    // Consume charge
    this.dashCharges--;

    // Calculate dash velocity
    const speed = this.dashDistance / (this.dashDuration / 1000);
    let vx = 0, vy = 0;

    if (direction === 'left') vx = -1;
    else if (direction === 'right') vx = 1;
    else if (direction === 'up') vy = -1;
    else if (direction === 'down') vy = 1;

    // Normalize if diagonal (though dash uses last faced direction)
    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > 0) {
      vx /= mag;
      vy /= mag;
    }

    // Apply dash velocity
    this.sprite.setVelocity(vx * speed, vy * speed);
    this.isDashing = true;

    // Emit dash event for VFX
    this.scene.events.emit('playerDashed', { x: this.sprite.x, y: this.sprite.y, direction });
    this.scene.registry.events.emit('playerDashed', { x: this.sprite.x, y: this.sprite.y, direction });

    // End dash after duration
    this.scene.time.delayedCall(this.dashDuration, () => {
      this.isDashing = false;
      this.sprite.setVelocity(0, 0);

      // Recovery period
      this.dashRecovering = true;
      this.scene.time.delayedCall(this.dashRecovery, () => {
        this.dashRecovering = false;
      });
    });

    // Start recharge timer for this consumed charge
    const timerEvent = this.scene.time.delayedCall(this.dashCooldownPerCharge, () => {
      this.dashCharges = Math.min(this.maxDashCharges, this.dashCharges + 1);
      // Remove this timer from tracking
      const idx = this.dashRechargeTimers.indexOf(timerEvent);
      if (idx >= 0) this.dashRechargeTimers.splice(idx, 1);
    });
    this.dashRechargeTimers.push(timerEvent);

    return true;
  }

  getDashCharges() {
    return this.dashCharges;
  }

  getMaxDashCharges() {
    // Base + extra from upgrades (Blink)
    return this.maxDashCharges + Math.floor(this.getBuff('extraDashCharges'));
  }

  getDashRechargeProgress(chargeIndex) {
    // Return 0-1 progress for a specific recharging slot
    if (chargeIndex < 0 || chargeIndex >= this.dashRechargeTimers.length) {
      return 0;
    }
    const timer = this.dashRechargeTimers[chargeIndex];
    if (!timer) return 0;
    const elapsed = timer.elapsed;
    const total = this.dashCooldownPerCharge;
    return Math.min(1, elapsed / total);
  }

  takeDamage(amount) {
    // Invincibility during dash (i-frames)
    if (this.isDashing) {
      return; // No damage taken while dashing
    }
    
    // Reduce health
    this.health = Math.max(0, this.health - amount);

    // Notify systems/UI
    this.scene.events.emit('playerDamaged', {
      amount,
      health: this.health,
      maxHealth: this.maxHealth,
      x: this.sprite.x,
      y: this.sprite.y
    });
    this.scene.registry.events.emit('playerDamaged', {
      amount,
      health: this.health,
      maxHealth: this.maxHealth,
      x: this.sprite.x,
      y: this.sprite.y
    });

    // Add heat as well (being hit attracts attention)
    if (this.scene.heatSystem) this.scene.heatSystem.add(Math.ceil(amount / 5), 'hit_by_vehicle');

    // Death
    if (this.health <= 0) {
      this.scene.events.emit('playerDied', { x: this.sprite.x, y: this.sprite.y });
      this.scene.registry.events.emit('playerDied', { x: this.sprite.x, y: this.sprite.y });
      // disable movement
      this.sprite.setVelocity(0, 0);
      this.sprite.setTint(0x550000);
      this.sprite.body.enable = false;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.events.emit('playerHealed', { health: this.health, maxHealth: this.maxHealth });
    this.scene.registry.events.emit('playerHealed', { health: this.health, maxHealth: this.maxHealth });
  }
}
