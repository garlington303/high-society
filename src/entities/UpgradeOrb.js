import Phaser from 'phaser';
import { UPGRADE_TYPES } from '../systems/TemporaryUpgradeSystem.js';

/**
 * UpgradeOrb - Collectible upgrade drop
 * 
 * Spawned when enemies die. Player walks over to collect.
 * Grants a temporary upgrade that persists until death or extraction.
 */

export class UpgradeOrb {
  constructor(scene, x, y, upgradeTypeKey = null) {
    this.scene = scene;
    
    // Pick random upgrade type if not specified
    const upgradeKeys = Object.keys(UPGRADE_TYPES);
    this.upgradeTypeKey = upgradeTypeKey || upgradeKeys[Math.floor(Math.random() * upgradeKeys.length)];
    this.upgradeType = UPGRADE_TYPES[this.upgradeTypeKey];
    
    // Create visual
    this.createSprite(x, y);
    
    // Lifetime before despawn (30 seconds)
    this.lifetime = 30000;
    this.spawnTime = Date.now();
    
    // Pickup radius
    this.pickupRadius = 24;
    
    // Prevent immediate pickup (brief spawn delay)
    this.canPickup = false;
    scene.time.delayedCall(200, () => {
      this.canPickup = true;
    });
  }
  
  createSprite(x, y) {
    const color = this.upgradeType.color;
    
    // Create orb as a glowing circle with pulsing effect
    // Outer glow
    this.glow = this.scene.add.circle(x, y, 14, color, 0.3);
    this.glow.setDepth(8);
    
    // Core orb
    this.sprite = this.scene.add.circle(x, y, 8, color, 1);
    this.sprite.setDepth(9);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.6);
    
    // Inner highlight
    this.highlight = this.scene.add.circle(x - 2, y - 2, 3, 0xffffff, 0.7);
    this.highlight.setDepth(10);
    
    // Store position for pickup detection
    this.x = x;
    this.y = y;
    
    // Pulsing animation
    this.scene.tweens.add({
      targets: [this.glow],
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Bobbing animation
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.highlight],
      y: y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Spawn pop effect
    this.sprite.setScale(0);
    this.glow.setScale(0);
    this.highlight.setScale(0);
    
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.highlight],
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }
  
  /**
   * Check if player is in pickup range
   */
  isPlayerInRange(player) {
    if (!this.canPickup || !player || !player.sprite) return false;
    
    const dist = Phaser.Math.Distance.Between(
      this.x, this.y,
      player.sprite.x, player.sprite.y
    );
    
    return dist <= this.pickupRadius;
  }
  
  /**
   * Called when player picks up the orb
   */
  onPickup(player) {
    // Attempt to add upgrade
    const upgradeSystem = this.scene.upgradeSystem;
    if (upgradeSystem) {
      const success = upgradeSystem.addUpgrade(this.upgradeTypeKey);
      
      if (success) {
        // Pickup effect - burst outward and fade
        this.playPickupEffect();
      } else {
        // Maxed out - just destroy with smaller effect
        this.playMaxedEffect();
      }
    }
    
    this.destroy();
  }
  
  playPickupEffect() {
    const color = this.upgradeType.color;
    
    // Burst particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const particle = this.scene.add.circle(this.x, this.y, 4, color, 0.9);
      particle.setDepth(15);
      
      const dist = 30;
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 350,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Flash effect at center
    const flash = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 0.8);
    flash.setDepth(14);
    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });
    
    // Show upgrade name text
    const text = this.scene.add.text(this.x, this.y - 20, `+${this.upgradeType.name}`, {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(16);
    
    this.scene.tweens.add({
      targets: text,
      y: this.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }
  
  playMaxedEffect() {
    // Smaller fizzle effect for when upgrade is maxed
    const text = this.scene.add.text(this.x, this.y - 10, 'MAX', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#888888',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(16);
    
    this.scene.tweens.add({
      targets: text,
      y: this.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy()
    });
  }
  
  /**
   * Update - check lifetime and player proximity
   */
  update(delta, player) {
    // Check despawn
    const age = Date.now() - this.spawnTime;
    if (age >= this.lifetime) {
      this.fadeAndDestroy();
      return;
    }
    
    // Flash when about to despawn (last 5 seconds)
    if (age >= this.lifetime - 5000) {
      const flashRate = Math.floor((this.lifetime - age) / 500);
      const shouldShow = Math.floor(age / 200) % 2 === 0;
      this.sprite.setAlpha(shouldShow ? 1 : 0.3);
    }
    
    // Check pickup
    if (this.isPlayerInRange(player)) {
      this.onPickup(player);
    }
  }
  
  fadeAndDestroy() {
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.highlight],
      alpha: 0,
      scale: 0,
      duration: 300,
      onComplete: () => this.destroy()
    });
  }
  
  destroy() {
    try { this.sprite?.destroy(); } catch (e) {}
    try { this.glow?.destroy(); } catch (e) {}
    try { this.highlight?.destroy(); } catch (e) {}
    this.destroyed = true;
  }
}
