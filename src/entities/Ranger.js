import Phaser from 'phaser';
import { Projectile } from './Projectile.js';
import { UpgradeOrb } from './UpgradeOrb.js';
import { HealthPotion, HEALTH_POTION_DROP_RATE } from './HealthPotion.js';

export class Ranger {
  constructor(scene, x, y) {
    this.scene = scene;
    this.isEnemy = true;
    this.fireInterval = 1400; // ms between shots
    this.projectileSpeed = 150; // mild speed so player can dodge
    this.damage = 8;
    // XP rewarded when killed
    this.xp = 8;
    // Health
    this.maxHealth = 18;
    this.health = this.maxHealth;
    // Drop rate for upgrade orbs (30% - rangers are harder)
    this.upgradeDropRate = 0.30;

    // Create placeholder texture if missing
    const tex = 'enemy_ranger';
    if (!scene.textures.exists(tex)) {
      const g = scene.add.graphics();
      g.fillStyle(0x3399ff, 1);
      g.fillCircle(6, 6, 6);
      g.generateTexture(tex, 12, 12);
      g.destroy();
    }

    this.sprite = scene.physics.add.sprite(x, y, tex);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(9);
    this.sprite.setData('entity', this);

    // Fire timer
    this.fireTimer = scene.time.addEvent({
      delay: this.fireInterval,
      callback: this.shootAtPlayer,
      callbackScope: this,
      loop: true
    });
  }

  shootAtPlayer() {
    const player = this.scene.player;
    if (!player || !player.sprite || !player.sprite.body) return;

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      player.sprite.x,
      player.sprite.y
    );

    const proj = new Projectile(this.scene, this.sprite.x, this.sprite.y, angle, this.projectileSpeed, this.damage, this);

    // Add to scene projectile group if present
    try {
      if (this.scene.enemyProjectiles) this.scene.enemyProjectiles.add(proj.sprite);
    } catch (e) {}
  }

  update(delta) {
    // face player visually by rotating towards them
    try {
      const p = this.scene.player;
      if (p && p.sprite) {
        const ang = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, p.sprite.x, p.sprite.y);
        this.sprite.setRotation(ang);
      }
    } catch (e) {}
  }

  onCollideWithPlayer(player) {
    // Rangers are ranged; collision should still hurt lightly
    if (player && typeof player.takeDamage === 'function') player.takeDamage(4);
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
    
    try { if (this.fireTimer) this.fireTimer.remove(false); } catch (e) {}
    try { this.scene.events.emit('enemyKilled', { xp: this.xp, enemyType: 'Ranger' }); } catch (e) {}
    try { if (this.sprite) this.sprite.destroy(); } catch (e) {}
  }
}

