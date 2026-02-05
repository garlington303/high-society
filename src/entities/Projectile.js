import Phaser from 'phaser';

export class Projectile {
  constructor(scene, x, y, angleRad, speed = 160, damage = 8, owner = null) {
    this.scene = scene;
    this.damage = damage;
    this.owner = owner;

    // Prefer a dedicated fire sprite for player projectiles when available
    const useFireAnim = scene.textures.exists('fire_02') && owner && (owner === scene.player || owner.isEnemy);
    // Prefer numbered fireball PNG sequence if provided (newer asset set)
    const useFireSequence = scene.textures.exists('fireball_fb001') && owner && (owner === scene.player || owner.isEnemy);
    // Use explosion spritesheet if available for other projectiles, fallback to procedural texture
    const useExplosionAnim = scene.textures.exists('explosion_01') && !useFireAnim;

    if (useFireSequence) {
      // Use numbered PNG sequence animation when available
      this.sprite = scene.physics.add.sprite(x, y, 'fireball_fb001');
      this.sprite.setScale(0.8);
      try { this.sprite.setOrigin(0.5, 0.5); } catch (e) {}
      // Flip/rotation handled after velocity is set below
      try {
        // Play intro if available then transition to looping sequence
        if (this.scene.anims.exists('fireball_intro')) {
          this.sprite.anims.play('fireball_intro');
          this.sprite.on('animationcomplete-fireball_intro', () => {
            try { this.sprite.anims.play('fireball_seq', true); } catch (e) {}
          });
        } else {
          this.sprite.anims.play('fireball_seq', true);
        }
      } catch (e) {}
      // tint tween handled below
    } else if (useFireAnim) {
      // Use the fire sprite sheet for player projectiles and play a short
      // travel animation. Also tween the tint from white -> orange to shift
      // the white artwork into an orange fireball.
      // Create without forcing a specific frame so animation system can take over
      this.sprite = scene.physics.add.sprite(x, y, 'fire_02');
      this.sprite.setScale(0.7);
      try { this.sprite.setOrigin(0.5, 0.5); } catch (e) {}
      try { this.sprite.anims.play('fire_travel_v2', true); } catch (e) {}
      // Flip/rotation handled after velocity is set below

      
    } else if (!useExplosionAnim) {
      const tex = 'proj_rect';
      if (!scene.textures.exists(tex)) {
        const g = scene.add.graphics();
        g.fillStyle(0xffdd66, 0.4);
        g.fillRoundedRect(0, 0, 20, 12, 4);
        g.fillStyle(0xffcc00, 1);
        g.fillRoundedRect(3, 2, 14, 8, 3);
        g.fillStyle(0xffffff, 0.8);
        g.fillRoundedRect(5, 3, 10, 6, 2);
        g.generateTexture(tex, 20, 12);
        g.destroy();
      }
      this.sprite = scene.physics.add.sprite(x, y, tex);
    } else {
      this.sprite = scene.physics.add.sprite(x, y, 'explosion_01');
      this.sprite.setScale(0.5);
      try { this.sprite.play('explosion_burst'); } catch (e) {}
      // Loop the explosion animation for projectile travel
      this.sprite.on('animationcomplete', () => {
        try { this.sprite.play('explosion_burst'); } catch (e) {}
      });
    }

    this.sprite.setDepth(9);
    this.sprite.setData('entity', this);
    this.sprite.body.allowGravity = false;
    // If this is a player fire projectile (sheet or sequence), tween from
    // white to orange so the white artwork becomes an orange fireball.
    if (useFireSequence || useFireAnim) {
      try {
        const from = { r: 255, g: 255, b: 255 };
        const to = { r: 255, g: 127, b: 0 };
        const tintObj = { t: 0 };
        scene.tweens.add({
          targets: tintObj,
          t: 1,
          duration: 600,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            const r = Math.round(Phaser.Math.Linear(from.r, to.r, tintObj.t));
            const g = Math.round(Phaser.Math.Linear(from.g, to.g, tintObj.t));
            const b = Math.round(Phaser.Math.Linear(from.b, to.b, tintObj.t));
            const hex = (r << 16) + (g << 8) + b;
            try { this.sprite.setTint(hex); } catch (e) {}
          }
        });
      } catch (e) {}
    }
    // Ensure sprite is centered and give a reasonable physics body to avoid
    // the visual appearing clipped; use display sizes when available.
    try { this.sprite.setOrigin(0.5, 0.5); } catch (e) {}
    try {
      const dw = Math.round((this.sprite.displayWidth || this.sprite.width) * 0.6) || 24;
      const dh = Math.round((this.sprite.displayHeight || this.sprite.height) * 0.6) || 24;
      this.sprite.body.setSize(Math.max(12, dw), Math.max(12, dh));
      // center the physics body inside the sprite
      const offsetX = Math.round(((this.sprite.displayWidth || this.sprite.width) - (this.sprite.body.width || dw)) / 2);
      const offsetY = Math.round(((this.sprite.displayHeight || this.sprite.height) - (this.sprite.body.height || dh)) / 2);
      if (typeof this.sprite.body.setOffset === 'function') this.sprite.body.setOffset(offsetX, offsetY);
    } catch (e) {}

    const vx = Math.cos(angleRad) * speed;
    const vy = Math.sin(angleRad) * speed;
    this.sprite.setVelocity(vx, vy);

    // Apply directional rotation/flip for fire projectiles
    if (useFireSequence || useFireAnim) {
      // Convert angle to degrees for easier direction checks
      const angleDeg = Phaser.Math.RadToDeg(angleRad);
      // Normalize to 0-360
      const normAngle = ((angleDeg % 360) + 360) % 360;
      
      // Flip sprite based on horizontal direction
      // The sprite artwork faces left by default, so flip for right-facing (315-360, 0-45 degrees)
      const facingRight = normAngle <= 45 || normAngle >= 315;
      try { this.sprite.setFlipX(facingRight); } catch (e) {}
      
      // For vertical movement, also flip Y to keep flame trailing correctly
      const facingDown = normAngle > 45 && normAngle < 135;
      try { this.sprite.setFlipY(facingDown); } catch (e) {}
      
      // Apply rotation to match travel direction, but adjust for the flip
      // Base sprite points left (180 deg), so offset rotation accordingly
      let visualAngle = angleRad;
      if (facingRight) {
        // When flipped horizontally, we need to mirror the rotation
        visualAngle = Math.PI - angleRad;
      }
      try { this.sprite.setRotation(visualAngle); } catch (e) {}
    } else if (!useExplosionAnim) {
      // Rotate toward travel direction for non-fire, non-explosion projectiles
      try { this.sprite.setRotation(angleRad); } catch (e) {}
    }

    const lifespan = 3000;

    if (useExplosionAnim) {
      // Gradually shrink and fade out toward end of life
      scene.tweens.add({
        targets: this.sprite,
        scale: 0.25,
        alpha: 0.4,
        duration: lifespan * 0.9,
        ease: 'Sine.easeIn'
      });
    }

    // Hard lifespan cap (safety net)
    scene.time.delayedCall(lifespan, () => {
      if (this.sprite && this.sprite.destroy) this.sprite.destroy();
    });
  }

  /**
   * Spawn explosion animation at position
   */
  spawnExplosion(x, y) {
    try {
      if (this.scene.textures.exists('explosion_01')) {
        const explosion = this.scene.add.sprite(x, y, 'explosion_01');
        explosion.setDepth(15);
        explosion.setScale(0.8);
        explosion.play('explosion_burst');
        explosion.on('animationcomplete', () => {
          explosion.destroy();
        });
      }
    } catch (e) {}
  }

  onHitPlayer(player) {
    try {
      // Spawn explosion at impact point
      if (this.sprite) {
        this.spawnExplosion(this.sprite.x, this.sprite.y);
      }
      if (player && typeof player.takeDamage === 'function') {
        player.takeDamage(this.damage);
      }
    } catch (e) {}
  }

  onHitEnemy(enemy) {
    try {
      // Spawn explosion at impact point
      if (this.sprite) {
        this.spawnExplosion(this.sprite.x, this.sprite.y);
      }
      if (enemy && typeof enemy.takeDamage === 'function') {
        enemy.takeDamage(this.damage, this.owner);
      }
    } catch (e) {}
  }
}
