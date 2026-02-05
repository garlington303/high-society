import Phaser from 'phaser';

/**
 * HealthPotion - Collectible health pickup
 * 
 * Spawned when enemies die (chance-based).
 * Heals player instantly for a portion, then heals over time for the rest.
 */

export class HealthPotion {
  constructor(scene, x, y) {
    this.scene = scene;
    
    // Heal amounts - instant + over time
    this.totalHeal = 60;
    this.instantHealPercent = 0.35; // 35% instant (21 HP)
    this.hotDuration = 4000; // 4 seconds for remaining heal
    
    // Create visual
    this.createSprite(x, y);
    
    // Lifetime before despawn (20 seconds)
    this.lifetime = 20000;
    this.spawnTime = Date.now();
    
    // Pickup radius
    this.pickupRadius = 20;
    
    // Prevent immediate pickup
    this.canPickup = false;
    scene.time.delayedCall(150, () => {
      this.canPickup = true;
    });
  }
  
  createSprite(x, y) {
    // Red/pink potion bottle
    const color = 0xff4488;
    
    // Outer glow
    this.glow = this.scene.add.circle(x, y, 12, color, 0.25);
    this.glow.setDepth(8);
    
    // Bottle shape (simple circle for now)
    this.sprite = this.scene.add.circle(x, y, 7, color, 1);
    this.sprite.setDepth(9);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.7);
    
    // Cross/plus symbol for health
    this.cross = this.scene.add.text(x, y, '+', {
      fontSize: '10px',
      fontFamily: 'Verdana',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
    
    // Store position
    this.x = x;
    this.y = y;
    
    // Bobbing animation
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.cross],
      y: y - 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Glow pulse
    this.scene.tweens.add({
      targets: this.glow,
      scale: 1.3,
      alpha: 0.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Spawn pop effect
    this.sprite.setScale(0);
    this.glow.setScale(0);
    this.cross.setScale(0);
    
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.cross],
      scaleX: 1,
      scaleY: 1,
      duration: 250,
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
   * Called when player picks up the potion
   */
  onPickup(player) {
    if (!player || typeof player.heal !== 'function') return;
    
    // Calculate instant vs HoT amounts
    const instantAmount = Math.floor(this.totalHeal * this.instantHealPercent);
    const hotAmount = this.totalHeal - instantAmount;
    
    // Instant heal
    const actualInstant = player.heal(instantAmount);
    
    // Start heal over time
    this.startHealOverTime(player, hotAmount);
    
    // Pickup effect
    this.playPickupEffect(this.totalHeal);
    
    // Emit event with HoT info for ghost bar UI
    try {
      this.scene.events.emit('potionUsed', { 
        instantHeal: actualInstant, 
        hotAmount: hotAmount,
        hotDuration: this.hotDuration
      });
      this.scene.registry.events.emit('potionUsed', { 
        instantHeal: actualInstant, 
        hotAmount: hotAmount,
        hotDuration: this.hotDuration
      });
    } catch (e) {}
    
    this.destroy();
  }
  
  /**
   * Start heal over time effect on player
   */
  startHealOverTime(player, totalHot) {
    const tickInterval = 250; // Tick every 250ms
    const tickCount = this.hotDuration / tickInterval;
    const healPerTick = totalHot / tickCount;
    
    // Set ghost bar target in registry
    const currentGhostTarget = this.scene.registry.get('ghostHealthTarget') || player.health;
    const newGhostTarget = Math.min(player.maxHealth, currentGhostTarget + totalHot);
    this.scene.registry.set('ghostHealthTarget', newGhostTarget);
    
    let ticksRemaining = tickCount;
    
    const hotTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: tickCount - 1,
      callback: () => {
        if (!player || player.health <= 0) {
          hotTimer.remove();
          return;
        }
        
        player.heal(Math.ceil(healPerTick));
        ticksRemaining--;
        
        // Update ghost bar target as we heal
        if (ticksRemaining <= 0) {
          // Clear ghost bar when HoT completes
          this.scene.registry.set('ghostHealthTarget', null);
        }
      }
    });
  }
  
  playPickupEffect(healAmount) {
    // Green heal particles
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const particle = this.scene.add.circle(this.x, this.y, 3, 0x44ff44, 0.9);
      particle.setDepth(15);
      
      const dist = 20;
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist - 15, // Float upward
        alpha: 0,
        scale: 0.3,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Heal number text
    const text = this.scene.add.text(this.x, this.y - 15, `+${healAmount}`, {
      fontFamily: 'Verdana',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(16);
    
    this.scene.tweens.add({
      targets: text,
      y: this.y - 45,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
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
    
    // Flash when about to despawn (last 4 seconds)
    if (age >= this.lifetime - 4000) {
      const shouldShow = Math.floor(age / 150) % 2 === 0;
      this.sprite.setAlpha(shouldShow ? 1 : 0.3);
      this.cross.setAlpha(shouldShow ? 1 : 0.3);
    }
    
    // Check pickup
    if (this.isPlayerInRange(player)) {
      this.onPickup(player);
    }
  }
  
  fadeAndDestroy() {
    this.scene.tweens.add({
      targets: [this.sprite, this.glow, this.cross],
      alpha: 0,
      scale: 0,
      duration: 200,
      onComplete: () => this.destroy()
    });
  }
  
  destroy() {
    try { this.sprite?.destroy(); } catch (e) {}
    try { this.glow?.destroy(); } catch (e) {}
    try { this.cross?.destroy(); } catch (e) {}
    this.destroyed = true;
  }
}

// Drop chance constant
export const HEALTH_POTION_DROP_RATE = 0.20; // 20% chance
