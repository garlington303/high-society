import Phaser from 'phaser';
import { UpgradeOrb } from './UpgradeOrb.js';
import { HealthPotion, HEALTH_POTION_DROP_RATE } from './HealthPotion.js';

export class MeleeEnemy {
  constructor(scene, x, y, behavior = 'chase') {
    this.scene = scene;
    this.behavior = behavior; // 'chase', 'erratic' (rat), 'patrol' (guard)
    
    this.speed = 70;
    this.sightRange = 220;
    this.attackDamage = 12;
    this.attackCooldown = 900; // ms
    this._lastAttack = 0;
    // XP rewarded when killed
    this.xp = 12;
    // Health
    this.maxHealth = 30;
    this.health = this.maxHealth;
    // Drop rate for upgrade orbs (20%)
    this.upgradeDropRate = 0.20;
    
    // AI State
    this.moveTimer = 0;
    this.moveState = 'idle';
    this.targetX = x;
    this.targetY = y;

    const tex = 'enemy_melee';
    if (!scene.textures.exists(tex)) {
      const g = scene.add.graphics();
      g.fillStyle(0xcc3333, 1);
      g.fillCircle(7, 7, 7);
      g.generateTexture(tex, 14, 14);
      g.destroy();
    }

    this.sprite = scene.physics.add.sprite(x, y, tex);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(9);
    this.sprite.setData('entity', this);
  }

  update(delta) {
    const player = this.scene.player;
    if (!player || !player.sprite) return;

    // Erratic behavior (e.g., Rats)
    if (this.behavior === 'erratic') {
      this._updateErratic(delta, player);
      return;
    }

    // Default Chase behavior
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
    if (dist < this.sightRange) {
      // move toward player
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;
      this.sprite.setVelocity(vx, vy);
      this.sprite.setRotation(angle);
    } else {
      // idle
      this.sprite.setVelocity(0, 0);
    }
  }

  _updateErratic(delta, player) {
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
    
    // Flee if too close, otherwise random movement
    if (dist < 60) {
      // Attack lunge or flee? Let's say aggressive swarm
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
      const vx = Math.cos(angle) * (this.speed * 1.5); // Burst speed
      const vy = Math.sin(angle) * (this.speed * 1.5);
      this.sprite.setVelocity(vx, vy);
      this.sprite.setRotation(angle);
      return;
    }

    // Random movement state machine
    this.moveTimer -= delta;
    if (this.moveTimer <= 0) {
      this.moveTimer = Phaser.Math.Between(500, 1500);
      if (Math.random() < 0.6) {
        this.moveState = 'move';
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = this.speed * Phaser.Math.FloatBetween(0.5, 1.0);
        this.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.sprite.setRotation(angle);
      } else {
        this.moveState = 'idle';
        this.sprite.setVelocity(0, 0);
      }
    }
  }

  onCollideWithPlayer(player) {
    const now = Date.now();
    if (now - this._lastAttack < this.attackCooldown) return;
    this._lastAttack = now;
    if (player && typeof player.takeDamage === 'function') {
      player.takeDamage(this.attackDamage);
    }
  }

  takeDamage(amount, source) {
    this.health -= amount;

    // Hit flash
    this.sprite.setTint(0xff8888);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.clearTint) this.sprite.clearTint();
    });

    // Die if health depleted
    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Apply knockback effect - used when player dashes into enemy
   * @param {number} angle - Direction of knockback in radians
   * @param {number} force - Knockback strength in pixels
   */
  applyKnockback(angle, force = 150) {
    if (!this.sprite || !this.sprite.body) return;
    
    // Calculate knockback velocity
    const vx = Math.cos(angle) * force * 8;
    const vy = Math.sin(angle) * force * 8;
    
    // Apply immediate velocity
    this.sprite.setVelocity(vx, vy);
    
    // Heavy hit visual feedback
    this.sprite.setTint(0xffff00); // Yellow flash for impact
    
    // Scale punch effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.4,
      scaleY: 0.7,
      duration: 60,
      yoyo: true,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.sprite) {
          this.sprite.setScale(1);
          this.sprite.clearTint();
        }
      }
    });
    
    // Velocity decay over time (friction)
    this.scene.time.delayedCall(150, () => {
      if (this.sprite && this.sprite.body) {
        this.sprite.setVelocity(
          this.sprite.body.velocity.x * 0.3,
          this.sprite.body.velocity.y * 0.3
        );
      }
    });
  }

  die() {
    const deathX = this.sprite.x;
    const deathY = this.sprite.y;
    
    // Chance to drop upgrade orb
    if (Math.random() < this.upgradeDropRate) {
      try {
        const orb = new UpgradeOrb(this.scene, deathX, deathY);
        if (this.scene.upgradeOrbs) {
          this.scene.upgradeOrbs.push(orb);
        }
      } catch (e) {}
    }
    
    // Chance to drop health potion (separate roll)
    if (Math.random() < HEALTH_POTION_DROP_RATE) {
      try {
        const potion = new HealthPotion(this.scene, deathX + 10, deathY);
        if (this.scene.healthPotions) {
          this.scene.healthPotions.push(potion);
        }
      } catch (e) {}
    }
    
    try { this.scene.events.emit('enemyKilled', { xp: this.xp, enemyType: 'Melee' }); } catch (e) {}
    try { if (this.sprite) this.sprite.destroy(); } catch (e) {}
  }
}

