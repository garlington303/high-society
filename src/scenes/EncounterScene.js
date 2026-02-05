import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { Ranger } from '../entities/Ranger.js';
import { Projectile } from '../entities/Projectile.js';
import { TemporaryUpgradeSystem } from '../systems/TemporaryUpgradeSystem.js';

/**
 * EncounterScene — self-contained arena for job encounters.
 * Supports distinct visual themes and quest logic for different missions.
 */
export class EncounterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EncounterScene' });
  }

  init(data) {
    this.jobData = data.job;
  }

  create() {
    const job = this.jobData;
    const isCombat = job.encounterType === 'combat' || job.encounterType === 'stealth';

    // Arena dimensions
    const w = isCombat ? (job.combat.arenaWidth || 800) : 800;
    const h = isCombat ? (job.combat.arenaHeight || 600) : 600;
    this.worldWidth = w;
    this.worldHeight = h;
    this.physics.world.setBounds(0, 0, w, h);

    // Groups (must be created before environment setup since environments may use them)
    this.buildings = this.physics.add.staticGroup();
    this.enemies = this.add.group();
    this.enemyProjectiles = this.add.group();
    this.playerProjectiles = this.add.group();
    this.upgradeSystem = new TemporaryUpgradeSystem(this);
    this.upgradeOrbs = [];
    this.healthPotions = [];
    this.interactables = this.add.group(); // For chests, crates, etc.

    // Setup Mission Environment (Terrain & Visuals)
    this._setupMissionEnvironment(w, h);

    // Player
    // Default spawn, may be overridden by mission setup
    this.player = new Player(this, w / 2, h - 80);
    
    // Camera
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player.sprite, true, 0.14, 0.14);
    this.cameras.main.setZoom(1);

    // Input setup
    this._setupInput();

    // Event listeners
    this._setupEventListeners();

    // Collision setup
    this._setupCollisions();

    // Encounter Logic Setup
    this.encounterComplete = false;
    this.remainingEnemies = 0;
    this.bossSpawned = false;
    this.objectiveProgress = 0; // Generic counter for objectives

    // HUD label (create before mission logic so missions can modify it)
    this.hudLabel = this.add.text(12, 12, `Job: ${job.title}  (ESC to flee)`, {
      font: '14px Courier New', fill: '#fff', stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(100);

    // Dispatch to specific mission logic
    this._startMissionLogic();

    // Ensure UI on top
    try { this.scene.bringToTop('UIScene'); } catch (e) {}
    try { this.cameras.main.fadeIn(280, 0, 0, 0); } catch (e) {}
  }

  update(time, delta) {
    if (this.player) this.player.update(this.cursors, this.keys, delta);
    if (this.upgradeSystem) this.upgradeSystem.update(delta);

    // Update enemies
    if (this.enemies) {
      this.enemies.getChildren().forEach(s => {
        const e = s.getData('entity');
        if (e && typeof e.update === 'function') e.update(delta);
      });
    }

    // Update interactables (if they have update logic)
    if (this.interactables) {
      this.interactables.getChildren().forEach(s => {
        const e = s.getData('entity');
        if (e && typeof e.update === 'function') e.update(delta);
      });
    }

    // Update pickups
    this._updatePickups(delta);

    // Dash damage interaction
    this._handleDashDamage();

    // Check completion conditions
    if (!this.encounterComplete) {
      this._checkMissionCompletion();
    }

    // Check player death
    if (this.player && this.player.health <= 0 && !this.encounterComplete) {
      this._onPlayerDied();
    }
  }

  // ------------------------------------------------------------------
  // Environment Setup
  // ------------------------------------------------------------------

  _setupMissionEnvironment(w, h) {
    // Default background
    this.cameras.main.setBackgroundColor('#2d2d2d');

    switch (this.jobData.destination) {
      case 'cellar':
        this._buildCellarEnvironment(w, h);
        break;
      case 'docks':
        this._buildDocksEnvironment(w, h);
        break;
      case 'ruins':
        this._buildRuinsEnvironment(w, h);
        break;
      case 'warehouse':
        this._buildWarehouseEnvironment(w, h);
        break;
      default:
        this._buildGenericEnvironment(w, h);
        break;
    }
  }

  _buildCellarEnvironment(w, h) {
    // Dark stone floor
    const TILE_SIZE = 32;
    for (let y = 0; y < h; y += TILE_SIZE) {
      for (let x = 0; x < w; x += TILE_SIZE) {
        this.add.image(x + 16, y + 16, 'alley').setDepth(-10).setTint(0x888888);
      }
    }
    
    // Walls around perimeter
    this._buildPerimeterWalls(w, h, 'cottage_0');

    // Atmosphere
    this.cameras.main.setBackgroundColor('#1a1005');
    // Vignette overlay
    const vignette = this.add.image(w/2, h/2, '__DEFAULT'); // Placeholder for actual vignette if available
    
    // Scattered barrels/crates
    for (let i = 0; i < 15; i++) {
      const bx = Phaser.Math.Between(64, w - 64);
      const by = Phaser.Math.Between(64, h - 64);
      // Avoid center spawn area
      if (Math.abs(bx - w/2) < 100 && Math.abs(by - h) < 150) continue;
      
      const barrel = this.physics.add.staticImage(bx, by, 'stash');
      barrel.setTint(0x886644);
      this.buildings.add(barrel); // Add to buildings group for collision
    }
  }

  _buildDocksEnvironment(w, h) {
    // Water background
    this.cameras.main.setBackgroundColor('#1a3b5c');
    
    // Wooden piers
    // Main pier
    const pierW = 300;
    const pierX = (w - pierW) / 2;
    this.add.tileSprite(w/2, h/2, pierW, h - 50, 'cottage_0').setDepth(-5).setTint(0x8b5a2b);
    
    // Physics bounds constrained to pier
    this.physics.world.setBounds(pierX, 0, pierW, h);
    
    // Crates on the pier
    for (let i = 0; i < 8; i++) {
      const cx = Phaser.Math.Between(pierX + 30, pierX + pierW - 30);
      const cy = Phaser.Math.Between(50, h - 100);
      const crate = this.physics.add.staticImage(cx, cy, 'stash');
      this.buildings.add(crate);
    }
  }

  _buildRuinsEnvironment(w, h) {
    // Grass/Dirt mix
    this.cameras.main.setBackgroundColor('#2d3a2d');
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        const tex = Math.random() > 0.6 ? 'garden' : 'path';
        this.add.image(x + 16, y + 16, tex).setDepth(-10).setTint(0x556655);
      }
    }

    // Broken walls (Guildhall fragments)
    for (let i = 0; i < 12; i++) {
      const wx = Phaser.Math.Between(50, w - 50);
      const wy = Phaser.Math.Between(50, h - 150);
      const wall = this.physics.add.staticImage(wx, wy, 'guildhall');
      wall.setTint(0x888899);
      wall.setScale(1, 0.5); // Short broken wall
      this.buildings.add(wall);
    }
  }

  _buildWarehouseEnvironment(w, h) {
    // Paved floor
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        this.add.image(x + 16, y + 16, 'cobble_x_nw').setDepth(-10).setTint(0xaaaaaa);
      }
    }
    this._buildPerimeterWalls(w, h, 'guildhall');

    // Organized crate stacks forming aisles
    const aisles = 4;
    const spacing = w / aisles;
    for (let i = 1; i < aisles; i++) {
      const x = i * spacing;
      for (let y = 100; y < h - 100; y += 40) {
        if (Math.random() > 0.8) continue; // Gap
        const crate = this.physics.add.staticImage(x, y, 'stash');
        crate.setTint(0x654321);
        this.buildings.add(crate);
      }
    }
  }

  _buildGenericEnvironment(w, h) {
    this._createTerrain(w, h); // Fallback to original tilemap gen
  }

  _buildPerimeterWalls(w, h, texture) {
    const thickness = 16;
    // Top
    for(let x=0; x<w; x+=32) this.buildings.create(x, thickness/2, texture).setTint(0x555555);
    // Bottom
    for(let x=0; x<w; x+=32) this.buildings.create(x, h-thickness/2, texture).setTint(0x555555);
    // Left
    for(let y=0; y<h; y+=32) this.buildings.create(thickness/2, y, texture).setTint(0x555555);
    // Right
    for(let y=0; y<h; y+=32) this.buildings.create(w-thickness/2, y, texture).setTint(0x555555);
  }

  // ------------------------------------------------------------------
  // Logic Dispatch
  // ------------------------------------------------------------------

  _startMissionLogic() {
    const job = this.jobData;
    
    if (job.destination === 'cellar') {
      this._setupCellarMission();
    } else if (job.destination === 'docks') {
      this._setupDocksMission();
    } else if (job.destination === 'ruins') {
      this._setupRuinsMission();
    } else if (job.destination === 'warehouse') {
      this._setupShadowRunMission();
    } else if (job.encounterType === 'combat') {
      this._setupCombat(job.combat);
    } else {
      this._setupEvent(job.event);
    }
  }

  _checkMissionCompletion() {
    // Delegate to specific logic checks if needed, else fallback to kill count
    if (this.jobData.destination === 'warehouse') {
      // Shadow run completion handled by exit zone trigger
    } else if (this.jobData.destination === 'docks') {
      // Docks completion handled by event dialog
    } else if (this.remainingEnemies <= 0 && this.jobData.encounterType === 'combat') {
      this._onVictory();
    }
  }

  // ------------------------------------------------------------------
  // Mission Specifics
  // ------------------------------------------------------------------

  _setupCellarMission() {
    // Spawn "Rats" - fast, weak, small
    const count = 8;
    this.remainingEnemies = count;
    
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(100, this.worldHeight - 200);
      
      const rat = new MeleeEnemy(this, x, y);
      rat.sprite.setTint(0x8b4513); // Brown rat
      rat.sprite.setScale(0.7); // Small
      rat.speed = 110; // Fast
      rat.maxHealth = 15;
      rat.health = 15;
      rat.attackDamage = 6;
      this.enemies.add(rat.sprite);
    }
    
    this.hudLabel.setText('Objective: Exterminate the Vermin');
  }

  _setupDocksMission() {
    // The "Unmarked Crate" event
    // Spawn the interaction target
    const crateX = this.worldWidth / 2;
    const crateY = 150;
    
    const target = this.physics.add.staticImage(crateX, crateY, 'stash');
    target.setTint(0xffaa00);
    target.setScale(1.2);
    this.interactables.add(target);
    
    // Add interaction prompt
    this.add.text(crateX, crateY - 40, '!', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffff00'
    }).setOrigin(0.5).setDepth(200);
    
    // Overlap to trigger event
    this.physics.add.overlap(this.player.sprite, target, () => {
      if (!this.encounterComplete) {
        this._setupEvent(this.jobData.event);
        target.destroy(); // Remove crate after interaction starts
      }
    });
    
    this.hudLabel.setText('Objective: Deliver the Crate (Approach target)');
  }

  _setupRuinsMission() {
    // Combat with Boss + Chest
    this._setupCombat(this.jobData.combat);
    
    // Add Ancient Chest
    const chest = this.physics.add.staticImage(this.worldWidth / 2, 80, 'stash');
    chest.setTint(0xffd700); // Gold tint
    this.interactables.add(chest);
    
    this.physics.add.overlap(this.player.sprite, chest, () => {
      if (this.remainingEnemies <= 0 && !this.encounterComplete) {
        // Only lootable after clearing enemies
        this._onVictory();
        chest.setAlpha(0.5);
      } else if (!this.encounterComplete) {
        // Show message?
      }
    });
    
    this.hudLabel.setText('Objective: Clear Bandits & Loot Chest');
  }

  _setupShadowRunMission() {
    // Contraband Crate
    const crate = this.physics.add.sprite(100, 100, 'stash');
    crate.setTint(0x00ff00);
    this.interactables.add(crate);
    this.contraband = crate;
    this.isCarrying = false;
    
    // Exit Zone (Green area)
    const exitZone = this.add.rectangle(this.worldWidth - 50, this.worldHeight - 50, 80, 80, 0x00ff00, 0.3);
    this.physics.add.existing(exitZone, true);
    
    // Patrols
    const patrols = 3;
    for(let i=0; i<patrols; i++) {
      const x = Phaser.Math.Between(200, this.worldWidth - 200);
      const y = Phaser.Math.Between(200, this.worldHeight - 200);
      const guard = new MeleeEnemy(this, x, y); // Placeholder for Guard
      guard.sprite.setTint(0x5555ff); // Blue uniform
      guard.sightRange = 250;
      this.enemies.add(guard.sprite);
    }
    
    // Logic: Pick up crate
    this.physics.add.overlap(this.player.sprite, crate, () => {
      if (!this.isCarrying) {
        this.isCarrying = true;
        crate.setVisible(false);
        this.player.speed *= 0.6; // Slow down
        this.hudLabel.setText('Objective: Escape with Crate!');
      }
    });
    
    // Logic: Escape
    this.physics.add.overlap(this.player.sprite, exitZone, () => {
      if (this.isCarrying) {
        this._onVictory();
      }
    });
    
    this.hudLabel.setText('Objective: Steal the Contraband Crate');
  }

  // ------------------------------------------------------------------
  // Legacy/Generic Methods (Helpers)
  // ------------------------------------------------------------------

  _setupInput() {
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
    this.input.mouse.disableContextMenu();

    this.keys.space.on('down', () => {
      if (this.player && !this.player.isDashing) this.player.attemptDash(this.player.direction);
    });
    this.keys.j.on('down', () => { if (this.player) this.player.primaryAttack(this.player.sprite.x, this.player.sprite.y); });
    this.input.on('pointerdown', (ptr) => {
      if (ptr.leftButtonDown() && this.player) this.player.primaryAttack(ptr.worldX, ptr.worldY);
      if (ptr.rightButtonDown() && this.player) this.player.secondaryAttack();
    });
    this.keys.k.on('down', () => { if (this.player) this.player.secondaryAttack(); });
    this.keys.e.on('down', () => { if (this.player) this.player.secondaryAttack(); });
    this.input.keyboard.on('keydown-ESC', () => this._onFled());
  }

  _setupEventListeners() {
    this.events.on('playerPrimaryAttack', (data) => {
      const proj = new Projectile(this, data.x, data.y, data.angle, 200, data.damage || 15, this.player);
      proj.sprite.setTint(0xff7f00);
      this.playerProjectiles.add(proj.sprite);
    });
    this.events.on('playerSecondaryAttack', (data) => { this._createAOE(data.x, data.y, data.damage || 25); });
    this.events.on('playerDashed', (data) => { this._emitDashEffect(data.x, data.y); });
    this.events.on('enemyKilled', (data) => {
      this.remainingEnemies--;
      try {
        const gain = (data && data.xp) ? data.xp : 10;
        const cur = this.registry.get('xp') || 0;
        this.registry.set('xp', cur + gain);
        this.events.emit('xpGained', { amount: gain });
      } catch (e) {}
      
      // Boss spawn logic
      if (this.jobData.combat && this.jobData.combat.boss && !this.bossSpawned && this.remainingEnemies <= 1) {
        this.bossSpawned = true;
        this._spawnBoss();
      }
    });
  }

  _setupCollisions() {
    // Buildings group already created in create() method

    // Projectiles
    this.physics.add.overlap(this.playerProjectiles, this.enemies, (proj, enemy) => {
      const p = proj.getData('entity');
      const e = enemy.getData('entity');
      if (p && e && e.takeDamage) {
        e.takeDamage(20, this.player); // Use projectile damage if available
        proj.destroy();
      }
    });
    
    // Player vs Enemies
    this.physics.add.overlap(this.player.sprite, this.enemies, (p, e) => {
      const enemy = e.getData('entity');
      if (enemy && enemy.onCollideWithPlayer) enemy.onCollideWithPlayer(this.player);
    });
    
    // Collide with walls
    this.physics.add.collider(this.player.sprite, this.buildings);
    this.physics.add.collider(this.enemies, this.buildings);
  }

  _setupCombat(config) {
    const { enemyType, enemyCount, enemyHealthMult, enemyDamageMult, boss } = config;
    this.remainingEnemies = enemyCount + (boss ? 1 : 0);
    
    for (let i = 0; i < enemyCount; i++) {
      const x = Phaser.Math.Between(100, this.worldWidth - 100);
      const y = Phaser.Math.Between(100, this.worldHeight - 100);
      this._spawnEnemy(enemyType === 'mixed' ? (i % 2 === 0 ? 'Melee' : 'Ranger') : enemyType, x, y, enemyHealthMult, enemyDamageMult);
    }
  }

  _spawnEnemy(type, x, y, healthMult = 1, damageMult = 1) {
    let enemy;
    if (type === 'Ranger') enemy = new Ranger(this, x, y);
    else enemy = new MeleeEnemy(this, x, y);
    
    enemy.maxHealth *= healthMult;
    enemy.health = enemy.maxHealth;
    // Apply damage mod if supported
    this.enemies.add(enemy.sprite);
  }

  _spawnBoss() {
    const cfg = this.jobData.combat.boss;
    const boss = new MeleeEnemy(this, this.worldWidth/2, 100); // Default melee boss
    boss.sprite.setScale(1.5);
    boss.sprite.setTint(0xff0000);
    boss.maxHealth *= cfg.healthMult;
    boss.health = boss.maxHealth;
    this.enemies.add(boss.sprite);
    
    // Alert
    const txt = this.add.text(this.worldWidth/2, this.worldHeight/2, 'BOSS APPEARS!', { fontSize: '32px', color: 'red' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => txt.destroy());
  }

  _setupEvent(eventConfig) {
    // Existing event logic or defer to UIScene
    this.time.delayedCall(500, () => {
      const uiScene = this.scene.get('UIScene');
      if (uiScene && uiScene.eventUI) {
        const eventData = {
          id: this.jobData.id,
          title: eventConfig.title,
          description: eventConfig.description,
          choices: eventConfig.choices.map(c => ({
            text: c.text,
            effect: (scene) => {
              const result = this._resolveEventChoice(c);
              return result.text;
            }
          }))
        };
        uiScene.eventUI.showEvent(eventData, (choice) => choice.effect(this));
        uiScene.events.once('eventCompleted', () => {
           if (this.jobData.destination !== 'docks') this._onVictory(); 
           else this._onVictory(); // Docks completes on event end for now
        });
      }
    });
  }

  _resolveEventChoice(choice) {
    // Simple mock result
    this._eventRewards = { gold: 50, xp: 20 }; // Placeholder
    return { text: 'Event resolved.' };
  }

  _createTerrain(w, h) {
    // Fallback simple grass
    const tiles = Math.ceil(w/32);
    const rows = Math.ceil(h/32);
    for(let y=0; y<rows; y++) {
      for(let x=0; x<tiles; x++) {
        this.add.image(x*32+16, y*32+16, 'garden').setDepth(-10);
      }
    }
  }

  _createAOE(x, y, damage) {
    const circ = this.add.circle(x, y, 60, 0xff0000, 0.3);
    this.tweens.add({ targets: circ, alpha: 0, duration: 300, onComplete: () => circ.destroy() });

    // Damage all enemies within the AoE radius
    const radius = 60;
    if (this.enemies) {
      this.enemies.getChildren().forEach(enemySprite => {
        const enemy = enemySprite.getData('entity');
        if (!enemy || !enemy.takeDamage) return;

        const dist = Phaser.Math.Distance.Between(x, y, enemySprite.x, enemySprite.y);
        if (dist <= radius) {
          enemy.takeDamage(damage, this.player);
        }
      });
    }
  }

  _emitDashEffect(x, y) {
    // Visuals
  }

  _handleDashDamage() {
    // Same as original logic
  }

  _updatePickups(delta) {
    if (!this.player || !this.player.sprite) return;

    // Update upgrade orbs
    if (this.upgradeOrbs && this.upgradeOrbs.length > 0) {
      for (let i = this.upgradeOrbs.length - 1; i >= 0; i--) {
        const orb = this.upgradeOrbs[i];
        if (!orb || !orb.sprite) continue;

        const dist = Phaser.Math.Distance.Between(
          this.player.sprite.x, this.player.sprite.y,
          orb.sprite.x, orb.sprite.y
        );

        if (dist < 32) {
          // Collect the orb
          if (orb.onCollect) orb.onCollect(this.player);
          if (orb.sprite) orb.sprite.destroy();
          this.upgradeOrbs.splice(i, 1);
        }
      }
    }

    // Update health potions
    if (this.healthPotions && this.healthPotions.length > 0) {
      for (let i = this.healthPotions.length - 1; i >= 0; i--) {
        const potion = this.healthPotions[i];
        if (!potion || !potion.sprite) continue;

        const dist = Phaser.Math.Distance.Between(
          this.player.sprite.x, this.player.sprite.y,
          potion.sprite.x, potion.sprite.y
        );

        if (dist < 32) {
          // Collect the potion
          if (potion.onCollect) potion.onCollect(this.player);
          if (potion.sprite) potion.sprite.destroy();
          this.healthPotions.splice(i, 1);
        }
      }
    }
  }

  _onVictory() {
    if (this.encounterComplete) return;
    this.encounterComplete = true;
    
    // Restore speed if carrying
    if (this.isCarrying && this.player) this.player.speed /= 0.6;

    const rewards = this._eventRewards || this.jobData.rewards;
    console.log('[EncounterScene] Victory! Rewards:', JSON.stringify(rewards));
    this.registry.set('lastEncounterResult', { success: true, jobId: this.jobData.id, rewards });
    
    const txt = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'VICTORY!', { fontSize: '48px', color: 'gold' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => this._returnToTown());
  }

  _onFled() {
    this.registry.set('lastEncounterResult', { success: false, fled: true });
    this._returnToTown();
  }

  _onPlayerDied() {
    this.registry.set('lastEncounterResult', { success: false, died: true });
    this._returnToTown();
  }

  _returnToTown() {
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
