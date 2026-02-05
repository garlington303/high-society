import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Ranger } from '../entities/Ranger.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { Projectile } from '../entities/Projectile.js';
import { TemporaryUpgradeSystem } from '../systems/TemporaryUpgradeSystem.js';
import { EventSystem } from '../systems/EventSystem.js';

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data) {
    this.from = data.from || null;
    this.direction = data.direction || null;
    this.variant = data.variant || 0;
  }

  create() {
    // Set a larger world for running around
    this.worldWidth = 1600;
    this.worldHeight = 1200;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Overworld terrain using tileset variants (16x16 tiles, 36 cols per row in sheet)
    try {
      const TILE_SIZE = 16;
      const COLS_PER_ROW = 36; // tileset is 576px / 16px = 36 columns
      const tilesWide = Math.ceil(this.worldWidth / TILE_SIZE);
      const tilesTall = Math.ceil(this.worldHeight / TILE_SIZE);

      // Pick tileset variant - use color1 (green) for consistent grass
      const tilesetKey = 'tilemap_color1';

      // Grass fill tiles (interior tiles from the tileset, no edges)
      // Row 1-2, cols 1-3 in the grass section = solid grass centers
      const grassFills = [
        1 + 1 * COLS_PER_ROW,   // (1,1) = 37
        2 + 1 * COLS_PER_ROW,   // (2,1) = 38
        3 + 1 * COLS_PER_ROW,   // (3,1) = 39
        1 + 2 * COLS_PER_ROW,   // (1,2) = 73
        2 + 2 * COLS_PER_ROW,   // (2,2) = 74
        3 + 2 * COLS_PER_ROW,   // (3,2) = 75
      ];

      const map = this.make.tilemap({
        tileWidth: TILE_SIZE,
        tileHeight: TILE_SIZE,
        width: tilesWide,
        height: tilesTall
      });

      const tileset = map.addTilesetImage(tilesetKey, tilesetKey, TILE_SIZE, TILE_SIZE, 0, 0);
      const groundLayer = map.createBlankLayer('ground', tileset);

      // Fill with primary grass tile
      groundLayer.fill(grassFills[0]);

      // Scatter variation tiles for visual interest
      for (let y = 0; y < tilesTall; y++) {
        for (let x = 0; x < tilesWide; x++) {
          if (Math.random() < 0.3) {
            const randTile = grassFills[Math.floor(Math.random() * grassFills.length)];
            groundLayer.putTileAt(randTile, x, y);
          }
        }
      }

      groundLayer.setDepth(-1);
    } catch (e) {
      // Fallback to solid color if tileset failed to load
      const bgOptions = ['#1d7a1d', '#1a5b7a', '#2a1d7a', '#7a3a1d'];
      const color = bgOptions[(this.variant || 0) % bgOptions.length];
      this.cameras.main.setBackgroundColor(color);
    }

    // Place player; if arriving from a direction, place near opposite edge so travel feels continuous
    let startX = Math.floor(this.worldWidth / 2);
    let startY = Math.floor(this.worldHeight / 2);
    try {
      if (this.direction === 'north') startY = this.worldHeight - 96;
      else if (this.direction === 'south') startY = 96;
      else if (this.direction === 'west') startX = this.worldWidth - 96;
      else if (this.direction === 'east') startX = 96;
      // small random jitter so repeated transitions don't perfectly overlap
      startX += Phaser.Math.Between(-24, 24);
      startY += Phaser.Math.Between(-24, 24);
    } catch (e) {}
    this.player = new Player(this, startX, startY);

    // Create combat groups
    this.enemies = this.add.group();
    this.enemyProjectiles = this.add.group();
    this.playerProjectiles = this.add.group();

    // Initialize upgrade system and orb tracking
    this.upgradeSystem = new TemporaryUpgradeSystem(this);
    this.upgradeOrbs = [];
    // Health potion pickups (spawned by enemies)
    this.healthPotions = [];

    // Run timer for extraction tension (tracks time spent in danger zone)
    this.runStartTime = Date.now();
    this.runTimeSeconds = 0;

    // Scatter random houses across the overworld
    this.buildings = this.physics.add.staticGroup();
    this.spawnHouses();

    // Camera follow
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    // Camera smoothing/lookahead settings (match GameScene)
    this.cameraFollowLerp = 0.14;
    this.cameraLookaheadFactor = 0.02;
    this.cameraBaseYOffset = -24;
    this.minCameraZoom = 0.5;
    this.maxCameraZoom = 1.8;
    this.cameraZoomSensitivity = 0.0016;
    this.cameras.main.setZoom(1);

    // Cache input handlers once (don't recreate each frame)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Disable right-click context menu
    this.input.mouse.disableContextMenu();

    // Dash input (Space key)
    this.keys.space.on('down', () => {
      if (this.player && !this.player.isDashing) {
        const success = this.player.attemptDash(this.player.direction);
      }
    });

    // Primary attack (J key or left click)
    this.keys.j.on('down', () => {
      if (this.player) {
        // Use player's facing direction for keyboard attack
        const offsetX = this.player.direction === 'right' ? 50 : this.player.direction === 'left' ? -50 : 0;
        const offsetY = this.player.direction === 'down' ? 50 : this.player.direction === 'up' ? -50 : 0;
        this.player.primaryAttack(this.player.sprite.x + offsetX, this.player.sprite.y + offsetY);
      }
    });

    // Allow left-click as alternative for primary attack (with cursor position)
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && this.player) {
        this.player.primaryAttack(pointer.worldX, pointer.worldY);
      }
    });

    // Secondary attack (K key or E key or right click)
    this.keys.k.on('down', () => {
      if (this.player) {
        this.player.secondaryAttack();
      }
    });

    this.keys.e.on('down', () => {
      if (this.player) {
        this.player.secondaryAttack();
      }
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown() && this.player) {
        this.player.secondaryAttack();
      }
    });

    // Simple instruction
    this.add.text(12, 12, 'Overworld (Press ESC to return). Move to an edge to travel to the other map.', { font: '14px Courier New', fill: '#fff' }).setScrollFactor(0).setDepth(100);

    // Input: ESC returns to village (with fade)
    this.input.keyboard.on('keydown-ESC', () => {
      try {
        // Save player state before returning to GameScene
        if (this.player && typeof this.player.saveToRegistry === 'function') {
          this.player.saveToRegistry();
        }

        const cam = this.cameras.main;
        cam.once('camerafadeoutcomplete', () => {
          try { this.scene.stop(); this.scene.resume('GameScene'); } catch (e) {}
        });
        cam.fadeOut(220, 0, 0, 0);
      } catch (e) {
        try { this.scene.stop(); this.scene.resume('GameScene'); } catch (e) {}
      }
    });

    // Create edge zones so player can move to the other overworld
    try {
      this.edgeZones = this.add.group();
      const pad = 24;
      const zoneW = this.worldWidth - pad * 2;
      const zoneH = this.worldHeight - pad * 2;

      const makeZone = (x, y, w, h, dir) => {
        const z = this.add.zone(x, y, w, h).setOrigin(0.5);
        this.physics.world.enable(z);
        if (z.body) {
          z.body.setAllowGravity(false);
          z.body.setImmovable(true);
        }
        z.setData('direction', dir);
        this.edgeZones.add(z);
        return z;
      };

      // Top, bottom, left, right thin strips
      makeZone(this.worldWidth / 2, pad / 2, zoneW, pad, 'north');
      makeZone(this.worldWidth / 2, this.worldHeight - pad / 2, zoneW, pad, 'south');
      makeZone(pad / 2, this.worldHeight / 2, pad, zoneH, 'west');
      makeZone(this.worldWidth - pad / 2, this.worldHeight / 2, pad, zoneH, 'east');

      // Overlap handler: check if player is returning to town (extraction) or going deeper
      this.physics.add.overlap(this.player.sprite, this.edgeZones, (playerSprite, zone) => {
        try {
          if (zone._cooldown) return;
          zone._cooldown = true;

          // Save player state before transitioning
          if (this.player && typeof this.player.saveToRegistry === 'function') {
            this.player.saveToRegistry();
          }

          this.time.delayedCall(800, () => { zone._cooldown = false; });
          const exitDir = zone.getData('direction');
          
          // Determine if this is an extraction (returning to town)
          // If player exited in the opposite direction of how they entered, they're going back
          const oppositeDir = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
          };
          
          const entryDir = this.direction; // Direction player entered from
          const isExtraction = entryDir && (exitDir === oppositeDir[entryDir]);
          
          if (isExtraction) {
            // EXTRACTION: Return to town with rewards!
            this.performExtraction(exitDir);
          } else {
            // CONTINUE: Go deeper into the overworld
            this.performTransition(exitDir);
          }
        } catch (e) {}
      }, null, this);
    } catch (e) {}

    // Combat event listeners
    this.events.on('playerDashed', (data) => {
      this.emitDashEffect(data.x, data.y);
    });

    this.events.on('playerPrimaryAttack', (data) => {
      const damage = data.damage || 15;
      const proj = new Projectile(this, data.x, data.y, data.angle, 200, damage, this.player);
      // Orange fire for player projectiles
      proj.sprite.setTint(0xff7f00);
      this.playerProjectiles.add(proj.sprite);
    });

    this.events.on('playerSecondaryAttack', (data) => {
      const damage = data.damage || 25;
      this.createSecondaryAttackAOE(data.x, data.y, damage);
    });

    // Event system for random overworld encounters
    this.eventSystem = new EventSystem(this);

    // XP handling
    this.events.on('enemyKilled', (data) => {
      try {
        const gain = (data && data.xp) ? data.xp : 10;
        const cur = this.registry.get('xp') || 0;
        const newXp = cur + gain;
        this.registry.set('xp', newXp);
        try {
          this.events.emit('xpGained', { amount: gain });
          this.registry.events.emit('xpGained', { amount: gain });
        } catch (e) {}

        const level = this.registry.get('level') || 1;
        const xpToNext = 10 * level;
        if (newXp >= xpToNext) {
          const leftover = newXp - xpToNext;
          this.registry.set('level', level + 1);
          this.registry.set('xp', leftover);
          try {
            this.events.emit('playerLeveled', { level: level + 1 });
            this.registry.events.emit('playerLeveled', { level: level + 1 });
          } catch (e) {}
        }
      } catch (e) {}
    });

    // Setup collisions
    this.setupCollisions();

    // Spawn enemies
    this.spawnEnemies();

    // Ensure UIScene renders on top of this scene
    try { this.scene.bringToTop('UIScene'); } catch (e) {}

    // Fade in when this scene appears
    try { this.cameras.main.fadeIn(220, 0, 0, 0); } catch (e) {}

    // Time progression in overworld: keep registry time/day/upkeep in sync with GameScene
    try {
      // Ensure registry defaults exist (BootScene should set them, but guard anyway)
      if (this.registry.get('time') === undefined) this.registry.set('time', 12);
      if (this.registry.get('day') === undefined) this.registry.set('day', 1);
      if (this.registry.get('hunger') === undefined) this.registry.set('hunger', 100);
      if (this.registry.get('thirst') === undefined) this.registry.set('thirst', 100);
      if (this.registry.get('sleep') === undefined) this.registry.set('sleep', 100);

      // Advance time every 5 seconds (same cadence as GameScene)
      this.time.addEvent({ delay: 5000, callback: this.advanceTime, callbackScope: this, loop: true });
    } catch (e) {}
  }

  update(time, delta) {
    // Reuse Player update with cached controls
    if (this.player) this.player.update(this.cursors, this.keys, delta);
    
    // Update enemies
    if (this.enemies) {
      this.enemies.getChildren().forEach(enemySprite => {
        const enemy = enemySprite.getData('entity');
        if (enemy && typeof enemy.update === 'function') {
          enemy.update(delta);
        }
      });
    }

    // Update upgrade system
    if (this.upgradeSystem) {
      this.upgradeSystem.update(delta);
    }

    // Update upgrade orbs (check pickups, handle despawn)
    if (this.upgradeOrbs && this.player) {
      this.upgradeOrbs = this.upgradeOrbs.filter(orb => {
        if (orb.destroyed) return false;
        orb.update(delta, this.player);
        return !orb.destroyed;
      });
    }

    // Update health potions (check pickups, handle despawn)
    if (this.healthPotions && this.player) {
      this.healthPotions = this.healthPotions.filter(potion => {
        if (potion.destroyed) return false;
        potion.update(delta, this.player);
        return !potion.destroyed;
      });
    }

    // Dash collision detection - damage and knockback enemies
    if (this.player && this.player.isDashing && this.enemies) {
      const dashDamage = this.player.getPrimaryDamage() * 1.5; // 1.5x damage on dash hit
      const playerX = this.player.sprite.x;
      const playerY = this.player.sprite.y;
      const dashHitRadius = 28;
      
      this.enemies.getChildren().forEach(enemySprite => {
        const enemy = enemySprite.getData('entity');
        if (!enemy || enemy._dashHitThisFrame) return;
        
        const dist = Phaser.Math.Distance.Between(playerX, playerY, enemySprite.x, enemySprite.y);
        if (dist <= dashHitRadius) {
          // Mark enemy as hit this dash (prevent multi-hit)
          enemy._dashHitThisFrame = true;
          this.time.delayedCall(this.player.dashDuration + 50, () => {
            if (enemy) enemy._dashHitThisFrame = false;
          });
          
          // Calculate knockback direction (away from player)
          const knockbackAngle = Phaser.Math.Angle.Between(playerX, playerY, enemySprite.x, enemySprite.y);
          
          // Apply damage
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(Math.floor(dashDamage), this.player);
          }
          
          // Apply knockback
          if (typeof enemy.applyKnockback === 'function') {
            enemy.applyKnockback(knockbackAngle, 200);
          }
          
          // Screen shake for impact
          this.cameras.main.shake(80, 0.008);
          
          // Impact visual effect
          this.createDashImpactEffect(enemySprite.x, enemySprite.y);
        }
      });
    }

    // Update run timer
    this.runTimeSeconds = Math.floor((Date.now() - this.runStartTime) / 1000);
    
    // Smooth camera lookahead similar to GameScene
    try {
      const cam = this.cameras.main;
      if (cam && this.player && this.player.sprite && this.player.sprite.body) {
        const vx = this.player.sprite.body.velocity.x || 0;
        const vy = this.player.sprite.body.velocity.y || 0;
        const desiredX = vx * this.cameraLookaheadFactor;
        const desiredY = this.cameraBaseYOffset + vy * this.cameraLookaheadFactor * 0.25;
        const curX = (cam.followOffset && cam.followOffset.x) || 0;
        const curY = (cam.followOffset && cam.followOffset.y) || 0;
        const frameAlpha = Math.min(1, this.cameraFollowLerp * (delta / 16));
        const nx = Phaser.Math.Interpolation.Linear([curX, desiredX], frameAlpha);
        const ny = Phaser.Math.Interpolation.Linear([curY, desiredY], frameAlpha);
        cam.setFollowOffset(nx, ny);
      }
    } catch (e) {}
  }

  advanceTime() {
    try {
      let time = this.registry.get('time');
      time = (time + 1) % 24;
      this.registry.set('time', time);

      if (time === 0) {
        const day = this.registry.get('day') || 0;
        this.registry.set('day', day + 1);
      }

      // Upkeep adjustments (copy of GameScene logic)
      try {
        let hunger = this.registry.get('hunger');
        let thirst = this.registry.get('thirst');
        let sleep = this.registry.get('sleep');
        if (typeof hunger === 'number') {
          hunger = Math.max(0, hunger - 1);
          this.registry.set('hunger', hunger);
        }
        if (typeof thirst === 'number') {
          thirst = Math.max(0, thirst - 1);
          this.registry.set('thirst', thirst);
        }
        if (typeof sleep === 'number') {
          const isRestingNight = (time >= 22 || time < 6);
          if (isRestingNight) sleep = Math.min(100, sleep + 4);
          else sleep = Math.max(0, sleep - 1);
          this.registry.set('sleep', sleep);
        }

        if ((hunger !== undefined && hunger <= 10) || (thirst !== undefined && thirst <= 10)) {
          try {
            this.events.emit('upkeepWarning', { hunger, thirst, sleep });
            this.registry.events.emit('upkeepWarning', { hunger, thirst, sleep });
          } catch (e) {}
        }
      } catch (e) {}
    } catch (e) {}
  }

  setupCollisions() {
    // Player vs buildings
    this.physics.add.collider(this.player.sprite, this.buildings);

    // Projectiles destroyed by buildings
    this.physics.add.collider(this.playerProjectiles, this.buildings, (proj) => {
      try { proj.destroy(); } catch (e) {}
    });
    this.physics.add.collider(this.enemyProjectiles, this.buildings, (proj) => {
      try { proj.destroy(); } catch (e) {}
    });

    // Enemies vs buildings
    try { this.physics.add.collider(this.enemies, this.buildings); } catch (e) {}

    // Player projectiles hit enemies
    this.physics.add.overlap(
      this.playerProjectiles,
      this.enemies,
      (projSprite, enemySprite) => {
        const proj = projSprite.getData('entity');
        const enemy = enemySprite.getData('entity');
        if (proj && enemy && typeof proj.onHitEnemy === 'function') {
          proj.onHitEnemy(enemy);
          try { projSprite.destroy(); } catch (e) {}
        }
      },
      null,
      this
    );

    // Enemy projectiles hit player
    this.physics.add.overlap(
      this.player.sprite,
      this.enemyProjectiles,
      (playerSprite, projSprite) => {
        const proj = projSprite.getData('entity');
        if (proj && typeof proj.onHitPlayer === 'function') proj.onHitPlayer(this.player);
        try { projSprite.destroy(); } catch (e) {}
      },
      null,
      this
    );

    // Player collides with enemy bodies
    this.physics.add.overlap(
      this.player.sprite,
      this.enemies,
      (playerSprite, enemySprite) => {
        const enemy = enemySprite.getData('entity');
        if (enemy && typeof enemy.onCollideWithPlayer === 'function') {
          enemy.onCollideWithPlayer(this.player);
        }
      },
      null,
      this
    );
  }

  spawnEnemies() {
    // Spawn enemies scattered around the overworld
    const enemyCount = 8;
    for (let i = 0; i < enemyCount; i++) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(100, this.worldHeight - 100);
      
      // Alternate between Ranger and Melee
      const enemy = i % 2 === 0 
        ? new Ranger(this, x, y)
        : new MeleeEnemy(this, x, y);
      
      this.enemies.add(enemy.sprite);
    }
  }

  spawnHouses() {
    // Prefer custom house assets if present
    const houseKeys = ['house_custom_1', 'house_custom_2', 'house_custom_3'];
    // Filter to only keys that actually loaded
    const available = houseKeys.filter(k => this.textures.exists(k));
    if (available.length === 0) return;

    const houseCount = Phaser.Math.Between(6, 12);
    const margin = 120; // keep away from world edges
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;
    const minPlayerDist = 150; // don't spawn on top of the player
    const minHouseDist = 140; // keep houses apart from each other
    const placed = []; // track positions to avoid overlap

    for (let i = 0; i < houseCount; i++) {
      let hx, hy, valid;
      let attempts = 0;

      // Find a position that doesn't overlap player spawn or other houses
      do {
        hx = Phaser.Math.Between(margin, this.worldWidth - margin);
        hy = Phaser.Math.Between(margin, this.worldHeight - margin);
        valid = Phaser.Math.Distance.Between(hx, hy, playerX, playerY) > minPlayerDist;
        if (valid) {
          for (const p of placed) {
            if (Phaser.Math.Distance.Between(hx, hy, p.x, p.y) < minHouseDist) {
              valid = false;
              break;
            }
          }
        }
        attempts++;
      } while (!valid && attempts < 30);

      if (!valid) continue;

      const tex = Phaser.Math.RND.pick(available);
      const sprite = this.buildings.create(hx, hy, tex);
      
      // Scale houses to a consistent size
      const targetSize = Phaser.Math.Between(56, 80);
      const scale = targetSize / Math.max(sprite.width, sprite.height);
      sprite.setScale(scale).setDepth(1);

      // Set collision body AFTER scaling using the UNSCALED texture dimensions
      // Body size is set in unscaled (texture) space, Phaser handles scaling
      try {
        const baseWidth = sprite.width;  // Unscaled texture width
        const baseHeight = sprite.height; // Unscaled texture height
        
        // Collision box is 25% of the visual size - tight around the building center
        const bodyWidth = baseWidth * 0.25;
        const bodyHeight = baseHeight * 0.25;
        
        // Center the collision box on the sprite
        const offsetX = (baseWidth - bodyWidth) / 2;
        const offsetY = (baseHeight - bodyHeight) / 2;
        
        sprite.body.setSize(bodyWidth, bodyHeight);
        sprite.body.setOffset(offsetX, offsetY);
      } catch (e) {}

      placed.push({ x: hx, y: hy });
    }
  }

  emitDashEffect(x, y) {
    try {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const speed = 60 + Math.random() * 40;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const particle = this.add.circle(x, y, 3, 0x00ffff, 0.8);
        particle.setDepth(5);

        this.tweens.add({
          targets: particle,
          x: x + vx * 0.5,
          y: y + vy * 0.5,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy()
        });
      }
    } catch (e) {}
  }

  /**
   * Create punchy visual effect when player dashes into an enemy
   */
  createDashImpactEffect(x, y) {
    try {
      // Radial burst ring
      const ring = this.add.circle(x, y, 15, 0xffffff, 0);
      ring.setStrokeStyle(4, 0xffaa00, 1);
      ring.setDepth(20);
      
      this.tweens.add({
        targets: ring,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 180,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });
      
      // Impact star particles
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.3;
        const speed = 80 + Math.random() * 60;
        const particle = this.add.star(x, y, 4, 4, 8, 0xffcc00, 1);
        particle.setDepth(21);
        particle.setScale(0.6 + Math.random() * 0.4);
        
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * speed,
          y: y + Math.sin(angle) * speed,
          alpha: 0,
          scale: 0.1,
          rotation: Math.PI * 2,
          duration: 250,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy()
        });
      }
      
      // Central flash
      const flash = this.add.circle(x, y, 25, 0xffffff, 0.9);
      flash.setDepth(19);
      this.tweens.add({
        targets: flash,
        scale: 0.3,
        alpha: 0,
        duration: 100,
        onComplete: () => flash.destroy()
      });
    } catch (e) {}
  }

  createSecondaryAttackAOE(x, y, damage = 25) {
    try {
      const radius = 80;

      // Visual effect
      const circle = this.add.circle(x, y, radius, 0xff6600, 0.4);
      circle.setDepth(5);
      circle.setStrokeStyle(3, 0xff3300, 1.0);

      this.tweens.add({
        targets: circle,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0,
        duration: 350,
        ease: 'Cubic.easeOut',
        onComplete: () => circle.destroy()
      });

      // Damage enemies in radius
      if (this.enemies) {
        this.enemies.getChildren().forEach(enemySprite => {
          const enemy = enemySprite.getData('entity');
          if (enemy) {
            const dist = Phaser.Math.Distance.Between(x, y, enemySprite.x, enemySprite.y);
            if (dist <= radius && typeof enemy.takeDamage === 'function') {
              enemy.takeDamage(damage, this.player);
            }
          }
        });
      }
    } catch (e) {}
  }

  /**
   * Perform successful extraction - return to town with rewards
   * All temporary upgrades are converted to bonus XP
   */
  performExtraction(exitDir) {
    // Emit extraction success event for upgrade system to process
    try {
      this.registry.events.emit('extractionSuccess', {
        runTime: this.runTimeSeconds,
        direction: exitDir
      });
    } catch (e) {}

    // Visual celebration
    try {
      const cam = this.cameras.main;
      cam.flash(300, 255, 215, 0); // Golden flash for success
      
      cam.once('camerafadeoutcomplete', () => {
        try {
          // Stop this scene and resume GameScene
          this.scene.stop();
          this.scene.resume('GameScene', { from: 'extraction', direction: exitDir });
        } catch (e) {}
      });
      
      cam.fadeOut(400, 0, 0, 0);
    } catch (e) {
      // Fallback immediate transition
      this.scene.stop();
      this.scene.resume('GameScene', { from: 'extraction', direction: exitDir });
    }
  }

  /**
   * Transition to next overworld area (continuing exploration)
   */
  performTransition(exitDir) {
    try {
      const cam = this.cameras.main;
      cam.once('camerafadeoutcomplete', () => {
        try {
          this.scene.restart({ 
            from: this.from || 'overworld', 
            direction: exitDir, 
            variant: (this.variant || 0) + 1 
          });
        } catch (e) {}
      });
      cam.flash(200, 180, 220, 255);
      cam.fadeOut(260, 0, 0, 0);
    } catch (e) {
      this.scene.restart({ 
        from: this.from || 'overworld', 
        direction: exitDir, 
        variant: (this.variant || 0) + 1 
      });
    }
  }
}
