import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Guard } from '../entities/Guard.js';
import { Villager } from '../entities/Villager.js';
import { Alchemist } from '../entities/Alchemist.js';
import { ConsumableMerchant } from '../entities/ConsumableMerchant.js';
import { Patron } from '../entities/Patron.js';
import { TownGenerator } from '../world/TownGenerator.js';
import { Pathfinding } from '../utils/Pathfinding.js';
import { InfamySystem } from '../systems/InfamySystem.js';
import { FameSystem } from '../systems/FameSystem.js';
import { StatSystem } from '../systems/StatSystem.js';
import { saveGame } from '../systems/SaveSystem.js';
import { AlchemySystem } from '../systems/AlchemySystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { JobSystem } from '../systems/JobSystem.js';
import { EventSystem } from '../systems/EventSystem.js';
import { TownResourceSystem } from '../systems/TownResourceSystem.js';
import { Ranger } from '../entities/Ranger.js';
import { MeleeEnemy } from '../entities/MeleeEnemy.js';
import { Projectile } from '../entities/Projectile.js';
import { GuildMaster } from '../entities/GuildMaster.js';


export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // World bounds (larger to accommodate wider roads and paths)
    this.worldWidth = 2400;
    this.worldHeight = 1800;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Generate medieval town
    this.townGenerator = new TownGenerator(this);
    this.map = this.townGenerator.generate();

    // Store the tavern position for global access (e.g., quests, navigation)
    if (this.map.taverns && this.map.taverns.length > 0) {
      this.registry.set('tavernPosition', this.map.taverns[0]);
    } else {
      this.registry.set('tavernPosition', null);
    }

    // Pathfinding helper for navigation
    this.pathfinding = new Pathfinding(this.townGenerator);

    // Create entity groups
    this.villagers = this.add.group();
    this.guards = this.add.group();
    this.alchemists = this.add.group();
    this.consumableMerchants = this.add.group();
    this.patrons = this.add.group();
    // Enemies and enemy projectiles (created only if enabled)
    this.enemies = this.add.group();
    this.enemyProjectiles = this.add.group();
    // Player projectiles
    this.playerProjectiles = this.add.group();
    
    // Pickup arrays
    this.upgradeOrbs = [];
    this.healthPotions = [];

    // Toggle to enable/disable enemies in this scene. Set to `true` to re-enable.
    this.enableEnemies = false;
    // Toggle to enable/disable guard NPCs in this scene. Set to `true` to re-enable.
    this.enableGuards = false;

    // Systems
    this.infamySystem = new InfamySystem(this);
    this.fameSystem = new FameSystem(this);
    this.statSystem = new StatSystem(this);
    this.alchemySystem = new AlchemySystem(this);
    this.progressionSystem = new ProgressionSystem(this);
    this.jobSystem = new JobSystem(this);
    this.eventSystem = new EventSystem(this);
    this.townResourceSystem = new TownResourceSystem(this);

    // Ensure currentTownId is set to the single persistent main town
    try {
      const mainTown = this.registry.get('mainTownId') || 'haven';
      if (!this.registry.get('currentTownId')) this.registry.set('currentTownId', mainTown);
    } catch (e) {}


    // Create player on a valid path tile (not inside buildings)
    const spawnTile = this.townGenerator.getPlayerSpawnPoint();
    this.player = new Player(this, spawnTile.x, spawnTile.y);

    // Spawn initial entities
    // Note: Alchemists/black market merchants only spawn in BlackMarketScene interior
    // Consumable merchant is now the Tavern Keeper inside the tavern building
    this.spawnVillagers(12);
    this.spawnGuildMaster();

    // Create exit zones on the outermost path tiles (top/left/right/bottom)
    this.createExitZones();
    if (this.enableGuards) this.spawnGuards(3);

    // Camera follow
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    // Start follow with moderate lerp; we'll apply a small lookahead offset for smoother centering
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12, 0, -24);

    // Camera smoothing/lookahead settings
    this.cameraFollowLerp = 0.14; // base lerp for offset smoothing
    this.cameraLookaheadFactor = 0.02; // multiplier from player velocity -> pixels of lookahead
    this.cameraBaseYOffset = -24; // vertical base offset so player sits lower on screen

    // Camera zoom settings
    this.minCameraZoom = 0.5;
    this.maxCameraZoom = 1.8;
    this.cameraZoomSensitivity = 0.0016; // multiplier for wheel delta
    this.cameras.main.setZoom(1);

    // Mouse wheel -> zoom towards pointer
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const cam = this.cameras.main;
      // Cancel existing camera zoom tween if running
      try { if (this.cameraZoomTween) this.cameraZoomTween.stop(); } catch (e) {}

      // World point under cursor before zoom (keep constant)
      const worldUnderPointer = cam.getWorldPoint(pointer.x, pointer.y);

      // Compute clamped target zoom
      const targetZoom = Phaser.Math.Clamp(cam.zoom - deltaY * this.cameraZoomSensitivity, this.minCameraZoom, this.maxCameraZoom);
      if (Math.abs(targetZoom - cam.zoom) < 0.001) return;

      // Tween an object and apply zoom on update while preserving pointer focus
      const zoomObj = { z: cam.zoom };
      this.cameraZoomTween = this.tweens.add({
        targets: zoomObj,
        z: targetZoom,
        duration: 300,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          try {
            // setZoom then adjust scroll so the world point under the pointer remains the same
            cam.setZoom(zoomObj.z);
            const after = cam.getWorldPoint(pointer.x, pointer.y);
            cam.scrollX += (worldUnderPointer.x - after.x);
            cam.scrollY += (worldUnderPointer.y - after.y);
          } catch (e) {}
        },
        onComplete: () => { this.cameraZoomTween = null; }
      });
    });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    // Disable right-click context menu
    this.input.mouse.disableContextMenu();

    // Dash input (Space key)
    this.keys.space.on('down', () => {
      if (this.player && !this.player.isDashing) {
        const success = this.player.attemptDash(this.player.direction);
        if (!success) {
          // Optional: play error sound or visual feedback
        }
      }
    });

    // Secondary attack (K key)
    this.keys.k.on('down', () => {
      if (this.player) {
        this.player.secondaryAttack();
      }
    });

    // Mouse input for attacks
    this.input.on('pointerdown', (pointer) => {
      if (!this.player) return;
      
      if (pointer.leftButtonDown()) {
        this.player.primaryAttack(pointer.worldX, pointer.worldY);
      } else if (pointer.rightButtonDown()) {
        this.player.secondaryAttack();
      }
    });

    // Collision setup
    this.setupCollisions();

    // Spawn enemies only when enabled (keeps their code present but inactive)
    if (this.enableEnemies) {
      this.spawnEnemies();
    }

    // Patron spawn timer
    this.time.addEvent({
      delay: 12000,
      callback: this.trySpawnPatron,
      callbackScope: this,
      loop: true
    });

    // Infamy decay
    this.time.addEvent({
      delay: 2000,
      callback: () => this.infamySystem.decay(),
      callbackScope: this,
      loop: true
    });

    // Save on town relation / infamy changes
    this.events.on('townRelationChanged', () => {
      try { saveGame(this); } catch (e) {}
    });
    this.events.on('townInfamyChanged', () => {
      try { saveGame(this); } catch (e) {}
    });
    this.events.on('townBountiesChanged', () => {
      try { saveGame(this); } catch (e) {}
    });

    // React to infamy threshold events (spawn bounty guards / escalate patrols)
    this.events.on('infamyWarning', (data) => {
      try {
        if (!data) return;
        const threshold = data.threshold || 0;
        const dir = data.direction || 'up';
        if (dir === 'up' && threshold >= 60) {
          // Spawn a few extra guards as bounty hunters
          if (this.enableGuards) {
            const bonus = Math.min(3, Math.max(1, Math.floor((threshold - 50) / 10)));
            for (let i = 0; i < bonus; i++) {
              this.spawnGuards(1);
              // Mark the most recently added guard as a bounty hunter
              try {
                const children = this.guards.getChildren();
                const last = children && children.length ? children[children.length - 1] : null;
                const ent = last ? last.getData('entity') : null;
                if (ent && ent.sprite) ent.sprite.setData('bounty', true);
              } catch (e) {}
            }
            // Increase town bounty pool and notify player
            try {
              const currentTown = this.registry.get('currentTownId');
              const bounties = this.registry.get('townBounties') || {};
              const inc = 25 * bonus; // simple bounty amount per extra guard
              bounties[currentTown] = (bounties[currentTown] || 0) + inc;
              this.registry.set('townBounties', bounties);
              this.events.emit('townBountiesChanged', { townId: currentTown, amount: bounties[currentTown] });
              try { saveGame(this); } catch (e) {}
              this.events.emit('message', `Bounty hunters arrive! Bounty: ${bounties[currentTown]} gold.`);
            } catch (e) {}
          }
        }
      } catch (e) {}
    });

    // Time progression
    this.time.addEvent({
      delay: 5000,
      callback: this.advanceTime,
      callbackScope: this,
      loop: true
    });

    // If the scene is resumed (e.g., returning from Overworld), temporarily disable exit triggers
    // and move the player away from the edge to prevent immediate re-trigger
    this.events.on('resume', (from, data) => {
      try {
        if (this.exitZones && this.exitZones.getChildren) {
          for (const z of this.exitZones.getChildren()) {
            try { z._cooldown = true; } catch (e) {}
            try { this.time.delayedCall(1200, () => { z._cooldown = false; }); } catch (e) {}
          }
        }

        // Check if returning from tavern (restore exact position)
        const tavernReturnX = this.registry.get('tavernReturnX');
        const tavernReturnY = this.registry.get('tavernReturnY');
        if (tavernReturnX !== undefined && tavernReturnY !== undefined && this.player && this.player.sprite) {
          this.player.sprite.x = tavernReturnX;
          this.player.sprite.y = tavernReturnY;
          this.registry.set('tavernReturnX', undefined);
          this.registry.set('tavernReturnY', undefined);
        } else {
          // Move player away from edges to prevent overlap re-trigger
          if (this.player && this.player.sprite) {
            const margin = 80;
            const px = this.player.sprite.x;
            const py = this.player.sprite.y;
            if (px < margin) this.player.sprite.x = margin;
            if (px > this.worldWidth - margin) this.player.sprite.x = this.worldWidth - margin;
            if (py < margin) this.player.sprite.y = margin;
            if (py > this.worldHeight - margin) this.player.sprite.y = this.worldHeight - margin;
          }
        }

        // Fade back in
        try { this.cameras.main.fadeIn(200); } catch (e) {}

        // Check if returning from an encounter
        this._handleEncounterReturn();
      } catch (e) {}
    });

    // XP handling: when an enemy dies emit 'enemyKilled' (from entity) and
    // award XP into the registry. Emit 'xpGained' and 'playerLeveled' when appropriate.
    this.events.on('enemyKilled', (data) => {
      try {
        // Base XP from enemy or fallback
        const baseGain = (data && data.xp) ? data.xp : 10;
        // Apply global XP scale (tunable via registry)
        const xpScale = (typeof this.registry.get('xpScale') === 'number') ? this.registry.get('xpScale') : 1;
        const gain = Math.max(1, Math.round(baseGain * xpScale));

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

    // Dash VFX: emit particle burst when player dashes
    this.events.on('playerDashed', (data) => {
      this.emitDashEffect(data.x, data.y);
    });

    // Primary attack: create player projectile
    this.events.on('playerPrimaryAttack', (data) => {
      const proj = new Projectile(this, data.x, data.y, data.angle, 200, 15, this.player);
      // Use orange fire tint for player-fired projectiles
      proj.sprite.setTint(0xff7f00);
      this.playerProjectiles.add(proj.sprite);
    });

    // Secondary attack: create AOE damage zone
    this.events.on('playerSecondaryAttack', (data) => {
      this.createSecondaryAttackAOE(data.x, data.y);
    });

    // Interaction prompt
    this.interactionPrompt = this.add.sprite(0, 0, 'prompt_interact_hd');
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(100);
    // Slightly scale down so HD prompt doesn't appear oversized in UI
    this.interactionPrompt.setScale(0.9);

    // Current interaction target
    this.currentInteraction = null;

    // Spawn job board in town
    this.spawnJobBoard();

    // Play ambient audio loop if it was loaded successfully in BootScene
    try {
      const ambientOk = this.registry.get('ambient_ok');
      if (ambientOk && this.cache && this.cache.audio && this.cache.audio.exists && this.cache.audio.exists('ambient_loop')) {
        try {
          this.ambient = this.sound.add('ambient_loop', { loop: true, volume: 0.45 });
          // small fade-in to avoid abruptness
          this.ambient.play();
          try { this.tweens.add({ targets: this.ambient, volume: { value: 0.55, duration: 800 } }); } catch (e) {}
        } catch (e) {
          // If playback fails, ensure we don't leave uncaught promises
          console.warn('Ambient audio failed to play:', e);
          try { this.registry.set('ambient_ok', false); } catch (e) {}
        }
      }
    } catch (e) {}

    // Footstep particle helper: create a tiny dust texture if missing
    try {
      const texName = 'fx_dust';
      if (!this.textures.exists(texName)) {
        const g = this.add.graphics();
        g.fillStyle(0xcccccc, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture(texName, 8, 8);
        g.destroy();
      }
      this.footstepParticles = this.add.particles('fx_dust');
      this.footstepEmitter = this.footstepParticles.createEmitter({
        speed: { min: 10, max: 40 },
        lifespan: 400,
        quantity: 0,
        scale: { start: 0.9, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        rotate: { min: 0, max: 360 }
      });
      this.lastFootstepTime = 0;
    } catch (e) {}

    // Sale particle burst emitter (brighter, larger)
    try {
      const saleTex = 'fx_sale';
      if (!this.textures.exists(saleTex)) {
        const g2 = this.add.graphics();
        g2.fillStyle(0xffd54f, 1);
        g2.fillCircle(5, 5, 5);
        g2.generateTexture(saleTex, 10, 10);
        g2.destroy();
      }
      this.saleParticles = this.add.particles('fx_sale');
      this.saleEmitter = this.saleParticles.createEmitter({
        speed: { min: 40, max: 120 },
        lifespan: 700,
        quantity: 0,
        scale: { start: 1.0, end: 0.3 },
        alpha: { start: 1.0, end: 0 },
        rotate: { min: 0, max: 360 }
      });
    } catch (e) {}

    // Debug HUD removed per user request
  }

  createExitZones() {
    try {
      this.exitZones = this.add.group();

      const makeZone = (x, y, width, height, dir) => {
        // Create invisible physics-enabled zone at world edge
        const z = this.add.zone(x, y, width, height).setOrigin(0.5);
        this.physics.world.enable(z);
        if (z.body) {
          z.body.setAllowGravity(false);
          z.body.setImmovable(true);
        }
        z.setData('direction', dir);
        this.exitZones.add(z);
        return z;
      };

      // Create thin border zones at world edges
      const edgeThickness = 32;
      const halfThick = edgeThickness / 2;

      // North border
      makeZone(this.worldWidth / 2, halfThick, this.worldWidth, edgeThickness, 'north');
      
      // South border
      makeZone(this.worldWidth / 2, this.worldHeight - halfThick, this.worldWidth, edgeThickness, 'south');
      
      // West border
      makeZone(halfThick, this.worldHeight / 2, edgeThickness, this.worldHeight, 'west');
      
      // East border
      makeZone(this.worldWidth - halfThick, this.worldHeight / 2, edgeThickness, this.worldHeight, 'east');

      // Overlap handler
      this.physics.add.overlap(this.player.sprite, this.exitZones, (playerSprite, zone) => {
        try {
          const dir = zone.getData('direction');
          // Disable zone briefly to avoid immediate re-trigger
          if (zone._cooldown) return;
          zone._cooldown = true;
          this.time.delayedCall(1000, () => { zone._cooldown = false; });
          this.transitionToOverworld(dir);
        } catch (e) {}
      }, null, this);
    } catch (e) {}
  }

  transitionToOverworld(direction) {
    try {
      // Save player state to registry before transitioning
      if (this.player && typeof this.player.saveToRegistry === 'function') {
        this.player.saveToRegistry();
      }

      // If player has an accepted job, route to EncounterScene instead
      if (this.jobSystem && this.jobSystem.hasActiveJob() && this.jobSystem.getJobState() === 'accepted') {
        this.jobSystem.beginTravel();
        const job = this.jobSystem.getActiveJob();

        try {
          const cam = this.cameras.main;
          cam.once('camerafadeoutcomplete', () => {
            try {
              this.scene.launch('EncounterScene', { job });
              this.scene.bringToTop('EncounterScene');
              this.scene.pause();
            } catch (e) {}
          });
          cam.fadeOut(280, 0, 0, 0);
        } catch (e) {
          this.scene.launch('EncounterScene', { job });
          this.scene.bringToTop('EncounterScene');
          this.scene.pause();
        }
        return;
      }

      // Fade out then pause and launch overworld for a smooth transition
      try {
        const cam = this.cameras.main;
        cam.once('camerafadeoutcomplete', () => {
          try {
            this.scene.launch('OverworldScene', { from: 'village', direction });
            this.scene.pause();
            try { this.events.emit('message', `Traveling ${direction}...`); } catch (e) {}
          } catch (e) {}
        });
        cam.fadeOut(280, 0, 0, 0);
      } catch (e) {
        // fallback: immediate
        this.scene.launch('OverworldScene', { from: 'village', direction });
        this.scene.pause();
      }
    } catch (e) {}
  }

  setupCollisions() {
    // Player vs buildings (cottages)
    this.physics.add.collider(this.player.sprite, this.map.buildings);

    // Guards vs buildings and guard spotting (only if guards are enabled)
    if (this.enableGuards) {
      try { this.physics.add.collider(this.guards, this.map.buildings); } catch (e) {}

      // Guard spots player
      this.physics.add.overlap(
        this.player.sprite,
        this.guards,
        this.onGuardSpotPlayer,
        null,
        this
      );
    }
    // Enemy-related colliders/overlaps (only if enemies are enabled)
    if (this.enableEnemies) {
      // Enemies vs buildings
      try { this.physics.add.collider(this.enemies, this.map.buildings); } catch (e) {}

      // Player collides with enemy bodies (push-back collision to prevent clipping)
      this.physics.add.collider(this.player.sprite, this.enemies);

      // Player overlaps with enemy bodies (melee damage)
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

      // Player projectiles vs buildings
      this.physics.add.collider(
        this.playerProjectiles,
        this.map.buildings,
        (projSprite) => {
          try { projSprite.destroy(); } catch (e) {}
        },
        null,
        this
      );

      // Player hit by enemy projectiles
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

      // Projectiles vs world should be blocked/destroyed by buildings
      try {
        this.physics.add.collider(this.enemyProjectiles, this.map.buildings, (p) => {
          try { p.destroy(); } catch (e) {}
        });
      } catch (e) {}
    }
  }

  // Build connectivity map from player position using flood fill
  // Call this once after player spawns to determine all reachable tiles
  buildConnectedTilesSet() {
    const pathfinding = this.pathfinding;
    if (!pathfinding || !this.player) return null;
    
    const playerTile = pathfinding.worldToTile(this.player.sprite.x, this.player.sprite.y);
    if (!playerTile) return null;
    
    const connected = new Set();
    const visited = new Uint8Array(pathfinding.width * pathfinding.height);
    const q = [{ x: playerTile.x, y: playerTile.y }];
    visited[playerTile.y * pathfinding.width + playerTile.x] = 1;
    
    while (q.length > 0) {
      const cur = q.shift();
      connected.add(`${cur.x},${cur.y}`);
      
      const dirs = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx < 0 || ny < 0 || nx >= pathfinding.width || ny >= pathfinding.height) continue;
        const idx = ny * pathfinding.width + nx;
        if (visited[idx]) continue;
        if (pathfinding.isWalkable(nx, ny)) {
          visited[idx] = 1;
          q.push({ x: nx, y: ny });
        }
      }
    }
    
    this.connectedTiles = connected;
    return connected;
  }
  
  // Check if a world position is in the connected walkable network
  isPositionReachable(worldX, worldY) {
    if (!this.pathfinding || !this.connectedTiles) return true;
    const tile = this.pathfinding.worldToTile(worldX, worldY);
    
    // Check if target tile is in connected set
    const key = `${tile.x},${tile.y}`;
    if (this.connectedTiles.has(key)) return true;
    
    // Also check immediate neighbors (in case position is on edge)
    const dirs = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
    for (const d of dirs) {
      const nk = `${tile.x + d.dx},${tile.y + d.dy}`;
      if (this.connectedTiles.has(nk)) return true;
    }
    
    return false;
  }

  spawnAlchemists() {
    // Fixed alchemist locations in alleyways, but avoid unreachable/locked spots
    const alchemistSpots = this.townGenerator.getAlchemistSpots();
    if (!alchemistSpots || alchemistSpots.length === 0) return;

    // Ensure connected tiles set is built
    if (!this.connectedTiles) {
      this.buildConnectedTilesSet();
    }

    const reachable = alchemistSpots.filter(spot => {
      try {
        return this.isPositionReachable(spot.x, spot.y);
      } catch (e) {
        return false;
      }
    });

    // If none reachable, fall back to original behavior
    const finalSpots = reachable.length > 0 ? reachable : alchemistSpots;

    // Filter out spots that overlap with special buildings
    const specialBuildingCoords = [];
    if (this.map.taverns) specialBuildingCoords.push(...this.map.taverns.map(t => ({ x: t.x, y: t.y })));
    if (this.map.marketSquares) specialBuildingCoords.push(...this.map.marketSquares.filter(m => m.type === 'blacksmith').map(m => ({ x: m.x, y: m.y })));
    if (this.map.guildhalls) specialBuildingCoords.push(...this.map.guildhalls.filter(g => g.type === 'blackMarket').map(g => ({ x: g.x, y: g.y })));

    const nonOverlappingSpots = finalSpots.filter(spot => {
      return !specialBuildingCoords.some(building =>
        Math.abs(spot.x - building.x) < 64 && Math.abs(spot.y - building.y) < 64
      );
    });

    nonOverlappingSpots.forEach((spot, i) => {
      const alchemist = new Alchemist(this, spot.x, spot.y, i);
      this.alchemists.add(alchemist.sprite);
      // subtle idle bobbing (scale) to make NPCs feel alive
      try {
        this.tweens.add({
          targets: alchemist.sprite,
          scaleX: { value: alchemist.sprite.scaleX * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
          scaleY: { value: alchemist.sprite.scaleY * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.RND.between(0, 400)
        });
      } catch (e) {}
    });
  }

  spawnVillagers(count) {
    // Ensure connected tiles set is built
    if (!this.connectedTiles) {
      this.buildConnectedTilesSet();
    }
    
    // Filter path tiles to only include reachable ones
    const allPathTiles = this.townGenerator.getPathTiles();
    const reachablePaths = allPathTiles.filter(spot => 
      this.isPositionReachable(spot.x, spot.y)
    );
    
    const pathTiles = reachablePaths.length > 0 ? reachablePaths : allPathTiles;
    
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Math.RND.pick(pathTiles);
      if (spot) {
        const villager = new Villager(this, spot.x, spot.y);
        this.villagers.add(villager.sprite);
        // subtle idle bobbing (scale)
        try {
          this.tweens.add({
            targets: villager.sprite,
            scaleX: { value: villager.sprite.scaleX * 1.03, duration: 1200 + Phaser.Math.RND.between(-300,300), ease: 'Sine.easeInOut' },
            scaleY: { value: villager.sprite.scaleY * 1.03, duration: 1200 + Phaser.Math.RND.between(-300,300), ease: 'Sine.easeInOut' },
            yoyo: true,
            repeat: -1,
            delay: Phaser.Math.RND.between(0, 500)
          });
        } catch (e) {}
      }
    }
  }

  spawnConsumableMerchant() {
    // Prefer spawning the merchant near the player's current location for easier discovery
    const pathTiles = this.townGenerator.getPathTiles() || [];
    let spot = null;
    try {
      const px = this.player && this.player.sprite ? this.player.sprite.x : null;
      const py = this.player && this.player.sprite ? this.player.sprite.y : null;
      if (px !== null && py !== null && pathTiles.length > 0) {
        // find nearby path tiles within ~160px radius
        const nearby = pathTiles.filter(t => Phaser.Math.Distance.Between(px, py, t.x, t.y) <= 160);
        if (nearby.length > 0) spot = Phaser.Math.RND.pick(nearby);
      }
      // fallback to any path tile
      if (!spot && pathTiles.length > 0) spot = Phaser.Math.RND.pick(pathTiles);
      // final fallback to just beside the player or player spawn
      if (!spot) {
        if (px !== null && py !== null) spot = { x: px + 48, y: py + 48 };
        else {
          const p = this.townGenerator.getPlayerSpawnPoint();
          spot = { x: p.x + 32, y: p.y + 32 };
        }
      }
    } catch (e) {
      const p = this.townGenerator.getPlayerSpawnPoint();
      spot = { x: p.x + 32, y: p.y + 32 };
    }

    const merchant = new ConsumableMerchant(this, spot.x, spot.y, 0);
    // Ensure sprite is added and visible
    try {
      if (!merchant.sprite.scene) this.add.existing(merchant.sprite);
      merchant.sprite.setAlpha(1);
      merchant.sprite.setVisible(true);
      merchant.sprite.setDepth(6);
    } catch (e) {}
    try { this.physics.add.existing(merchant.sprite, true); } catch (e) {}
    this.consumableMerchants.add(merchant.sprite);
    // store entity reference for dialogue
    merchant.sprite.setData('entity', merchant);
    // (Removed temporary debug label/log for merchant spawn)
    try {
      this.tweens.add({
        targets: merchant.sprite,
        scaleX: { value: merchant.sprite.scaleX * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
        scaleY: { value: merchant.sprite.scaleY * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.RND.between(0, 400)
      });
    } catch (e) {}
  }

  spawnGuards(count) {
    const cobbleTiles = this.townGenerator.getCobbleTiles();
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Math.RND.pick(cobbleTiles);
      if (spot) {
        // Only create guards if enabled (guard-level safety in case spawnGuards is called elsewhere)
        if (this.enableGuards) {
          const guard = new Guard(this, spot.x, spot.y);
          this.guards.add(guard.sprite);
        }
      }
    }
  }

  spawnEnemies() {
    // Find some free spawn positions near paths
    const paths = this.townGenerator.getPathTiles();
    if (!paths || paths.length === 0) return;

    // Ranger: place a bit away from player
    const rangerSpot = Phaser.Math.RND.pick(paths);
    if (rangerSpot) {
      const ranger = new Ranger(this, rangerSpot.x + Phaser.Math.Between(-40, 40), rangerSpot.y + Phaser.Math.Between(-40, 40));
      this.enemies.add(ranger.sprite);
    }

    // Melee enemy: place somewhere else
    const meleeSpot = Phaser.Math.RND.pick(paths);
    if (meleeSpot) {
      const mele = new MeleeEnemy(this, meleeSpot.x + Phaser.Math.Between(-20, 20), meleeSpot.y + Phaser.Math.Between(-20, 20));
      this.enemies.add(mele.sprite);
    }
  }

  trySpawnPatron() {
    const inventory = this.registry.get('inventory');
    const hasWares = Object.values(inventory).some(amount => amount > 0);

    // More patrons when low infamy and you have wares
    if (hasWares && this.patrons.getLength() < 3) {
      const paths = this.townGenerator.getPathTiles();
      const spot = Phaser.Math.RND.pick(paths);
      if (spot) {
        const patron = new Patron(this, spot.x, spot.y);
        this.patrons.add(patron.sprite);
        // subtle bobbing for patron while waiting
        try {
          this.tweens.add({
            targets: patron.sprite,
            scaleX: { value: patron.sprite.scaleX * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
            scaleY: { value: patron.sprite.scaleY * 1.03, duration: 1200, ease: 'Sine.easeInOut' },
            yoyo: true,
            repeat: -1,
            delay: Phaser.Math.RND.between(0, 400)
          });
        } catch (e) {}
      }
    }
  }

  onGuardSpotPlayer(playerSprite, guardSprite) {
    const guard = guardSprite.getData('entity');
    if (guard && !guard.isChasing) {
      const infamy = this.registry.get('infamy');
      // Detection based on infamy level
      const spotChance = 0.3 + (infamy / 200);
      if (Math.random() < spotChance) {
        guard.startChase(this.player);
      }
    }
  }

  advanceTime() {
    let time = this.registry.get('time');
    time = (time + 1) % 24;
    this.registry.set('time', time);

    if (time === 0) {
      const day = this.registry.get('day');
      this.registry.set('day', day + 1);
    }

    // Adjust guard count based on time
    const isNight = time >= 20 || time < 6;
    this.updateGuardPatrols(isNight);

    // Upkeep stat changes each hour
    try {
      // Hunger and thirst slowly decrease during the day
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

      // Sleep recovers at night and depletes slowly during the day
      if (typeof sleep === 'number') {
        // Consider 'night' hours for rest: 22..5
        const isRestingNight = (time >= 22 || time < 6);
        if (isRestingNight) sleep = Math.min(100, sleep + 4);
        else sleep = Math.max(0, sleep - 1);
        this.registry.set('sleep', sleep);
      }

      // If critical levels, emit a message / event for UI
      if ((hunger !== undefined && hunger <= 10) || (thirst !== undefined && thirst <= 10)) {
        this.events.emit('upkeepWarning', { hunger, thirst, sleep });
      }
    } catch (e) {}
  }

  updateGuardPatrols(isNight) {
    const currentCount = this.guards.getLength();
    // Prefer town-scoped infamy if available
    const currentTown = this.registry.get('currentTownId');
    const townInfamyMap = this.registry.get('townInfamy') || {};
    const infamy = (currentTown && typeof townInfamyMap[currentTown] === 'number') ? townInfamyMap[currentTown] : this.registry.get('infamy');
    const baseTarget = isNight ? 5 : 3;
    const infamyBonus = Math.floor(infamy / 25);
    const targetCount = baseTarget + infamyBonus;

    // Only spawn guards if enabled
    if (this.enableGuards && currentCount < targetCount) {
      this.spawnGuards(1);
    }
  }

  update(time, delta) {
    // Update player
    this.player.update(this.cursors, this.keys, delta);

    // Smooth camera lookahead: nudge follow offset slightly toward movement direction
    try {
      const cam = this.cameras.main;
      if (cam && this.player && this.player.sprite && this.player.sprite.body) {
        const vx = this.player.sprite.body.velocity.x || 0;
        const vy = this.player.sprite.body.velocity.y || 0;
        const desiredX = vx * this.cameraLookaheadFactor;
        // Keep vertical lookahead smaller to keep horizon stable
        const desiredY = this.cameraBaseYOffset + vy * this.cameraLookaheadFactor * 0.25;
        const curX = (cam.followOffset && cam.followOffset.x) || 0;
        const curY = (cam.followOffset && cam.followOffset.y) || 0;
        const frameAlpha = Math.min(1, this.cameraFollowLerp * (delta / 16));
        const nx = Phaser.Math.Interpolation.Linear([curX, desiredX], frameAlpha);
        const ny = Phaser.Math.Interpolation.Linear([curY, desiredY], frameAlpha);
        cam.setFollowOffset(nx, ny);
      }
    } catch (e) {}

    // Update all entities
    this.villagers.getChildren().forEach(v => {
      const entity = v.getData('entity');
      if (entity) entity.update(delta);
    });

    // Update guards (skip entirely when guards are disabled)
    if (this.enableGuards) {
      this.guards.getChildren().forEach(g => {
        const entity = g.getData('entity');
        if (entity) entity.update(delta, this.player);
      });
    } else {
      // If guards are disabled, ensure any existing sprites are removed
      if (this.guards.getLength() > 0) this.guards.clear(true, true);
    }

    this.patrons.getChildren().forEach(p => {
      const entity = p.getData('entity');
      if (entity) entity.update(delta, this.player);
    });

    // Update enemies (only if enabled)
    if (this.enableEnemies) {
      this.enemies.getChildren().forEach(e => {
        const entity = e.getData('entity');
        if (entity) entity.update && entity.update(delta);
      });
    }

    // Update progression system (handles health regen from abilities)
    if (this.progressionSystem) {
      this.progressionSystem.update(delta);
    }
    
    // Update event encounter system (triggers random events as player walks)
    if (this.eventSystem) {
      this.eventSystem.update(delta);
    }
    
    // Update pickups (upgrade orbs and health potions)
    this.updatePickups(delta);

    // Check for interactions
    this.checkInteractions();

    // Handle interaction input
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.handleInteraction();
    }
  }

  checkInteractions() {
    this.currentInteraction = null;
    this.interactionPrompt.setVisible(false);

    // Clear previous highlights
    try {
      this.alchemists.getChildren().forEach(a => { if (a && a.setTint) { a.clearTint(); a.setScale(1); } });
      this.patrons.getChildren().forEach(p => { if (p && p.setTint) { p.clearTint(); p.setScale(1); } });
      this.consumableMerchants.getChildren().forEach(m => { if (m && m.setTint) { m.clearTint(); m.setScale(1); } });
    } catch (e) {}

    const playerPos = this.player.sprite;
    const interactRange = 32;

    // Check alchemists
    this.alchemists.getChildren().forEach(a => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, a.x, a.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'alchemist', entity: a.getData('entity') };
        this.interactionPrompt.setPosition(a.x, a.y - 20);
        this.interactionPrompt.setVisible(true);
        // highlight
        try { a.setTint(0xffffaa); a.setScale(1.08); } catch (e) {}
      }
    });

    // Check consumable merchants
    this.consumableMerchants.getChildren().forEach(m => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, m.x, m.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'consumable', entity: m.getData('entity') };
        this.interactionPrompt.setPosition(m.x, m.y - 20);
        this.interactionPrompt.setVisible(true);
        // highlight
        try { m.setTint(0xffffaa); m.setScale(1.08); } catch (e) {}
      }
    });

    // Check patrons
    this.patrons.getChildren().forEach(p => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, p.x, p.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'patron', entity: p.getData('entity') };
        this.interactionPrompt.setPosition(p.x, p.y - 20);
        this.interactionPrompt.setVisible(true);
        // highlight
        try { p.setTint(0xffffaa); p.setScale(1.08); } catch (e) {}
      }
    });

    // Check guildhalls (sanctuaries)
    this.map.guildhalls.forEach(gh => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, gh.x, gh.y
      );
      // Dynamic range based on building size (approx radius + interact range)
      const sizeRadius = Math.max(gh.width || 2, gh.height || 2) * 16; 
      if (dist < sizeRadius + interactRange) {
        this.currentInteraction = { type: 'guildhall', entity: gh };
        this.interactionPrompt.setPosition(gh.x, gh.y - sizeRadius - 16);
        this.interactionPrompt.setVisible(true);
      }
    });

    // Check taverns
    if (this.map.taverns) {
      this.map.taverns.forEach(tavern => {
        const dist = Phaser.Math.Distance.Between(
          playerPos.x, playerPos.y, tavern.x, tavern.y
        );
        // Dynamic range based on building size (approx radius + interact range)
        const sizeRadius = Math.max(tavern.width || 3, tavern.height || 3) * 16;
        if (dist < sizeRadius + interactRange + 8) {
          this.currentInteraction = { type: 'tavern', entity: tavern };
          this.interactionPrompt.setPosition(tavern.x, tavern.y - sizeRadius - 16);
          this.interactionPrompt.setVisible(true);
        }
      });
    }

    // Check Town Hall (Market Squares)
    if (this.map.marketSquares) {
      this.map.marketSquares.forEach(hall => {
        const dist = Phaser.Math.Distance.Between(
          playerPos.x, playerPos.y, hall.x, hall.y
        );
        const sizeRadius = Math.max(hall.width || 3, hall.height || 3) * 16;
        if (dist < sizeRadius + interactRange + 8) {
          this.currentInteraction = { type: 'townHall', entity: hall };
          this.interactionPrompt.setPosition(hall.x, hall.y - sizeRadius - 16);
          this.interactionPrompt.setVisible(true);
        }
      });
    }

    // Check blacksmith building (from marketSquares with type='blacksmith')
    if (this.map.marketSquares) {
      const blacksmiths = this.map.marketSquares.filter(b => b.type === 'blacksmith');
      blacksmiths.forEach(blacksmith => {
        const dist = Phaser.Math.Distance.Between(
          playerPos.x, playerPos.y, blacksmith.x, blacksmith.y
        );
        const sizeRadius = Math.max(blacksmith.width || 3, blacksmith.height || 3) * 16;
        if (dist < sizeRadius + interactRange + 8) {
          this.currentInteraction = { type: 'blacksmith', entity: blacksmith };
          this.interactionPrompt.setPosition(blacksmith.x, blacksmith.y - sizeRadius - 16);
          this.interactionPrompt.setVisible(true);
        }
      });
    }

    // Check black market building (from marketSquares OR guildhallSpots with type='blackmarket' or 'blackMarket')
    const blackMarkets = [];
    if (this.map.marketSquares) {
      blackMarkets.push(...this.map.marketSquares.filter(b => b.type === 'blackmarket' || b.type === 'blackMarket'));
    }
    if (this.map.guildhalls) {
      blackMarkets.push(...this.map.guildhalls.filter(b => b.type === 'blackmarket' || b.type === 'blackMarket'));
    }
    blackMarkets.forEach(blackMarket => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, blackMarket.x, blackMarket.y
      );
      const sizeRadius = Math.max(blackMarket.width || 3, blackMarket.height || 3) * 16;
      if (dist < sizeRadius + interactRange + 8) {
        this.currentInteraction = { type: 'blackmarket', entity: blackMarket };
        this.interactionPrompt.setPosition(blackMarket.x, blackMarket.y - sizeRadius - 16);
        this.interactionPrompt.setVisible(true);
      }
    });

    // Check job board
    if (this.jobBoardPosition) {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, this.jobBoardPosition.x, this.jobBoardPosition.y
      );
      if (dist < interactRange + 8) {
        this.currentInteraction = { type: 'jobBoard', entity: null };
        this.interactionPrompt.setPosition(this.jobBoardPosition.x, this.jobBoardPosition.y - 24);
        this.interactionPrompt.setVisible(true);
      }
    }
  }

  /**
   * Update all pickup items (orbs, potions) and remove destroyed ones
   */
  updatePickups(delta) {
    // Update upgrade orbs
    if (this.upgradeOrbs) {
      this.upgradeOrbs = this.upgradeOrbs.filter(orb => {
        if (orb.destroyed) return false;
        orb.update(delta, this.player);
        return !orb.destroyed;
      });
    }
    
    // Update health potions
    if (this.healthPotions) {
      this.healthPotions = this.healthPotions.filter(potion => {
        if (potion.destroyed) return false;
        potion.update(delta, this.player);
        return !potion.destroyed;
      });
    }
  }

  handleInteraction() {
    if (!this.currentInteraction) return;

    const { type, entity } = this.currentInteraction;

    switch (type) {
      case 'alchemist':
        this.openAlchemistMenu(entity);
        break;
      case 'consumable':
        this.openAlchemistMenu(entity);
        break;
      case 'patron':
        this.sellToPatron(entity);
        break;
      case 'guildhall':
        this.enterGuildhall(entity);
        break;
      case 'tavern':
        this.enterTavern(entity);
        break;
      case 'townHall':
        this.openTownHall(entity);
        break;
      case 'blacksmith':
        this.enterBlacksmith(entity);
        break;
      case 'blackmarket':
        this.enterBlackMarket(entity);
        break;
      case 'jobBoard':
        this.openJobBoard();
        break;
    }
  }

  openAlchemistMenu(alchemist) {
    // Launch merchant dialogue scene
    this.scene.launch('MerchantDialogueScene', { alchemist });
    this.scene.pause();
  }

  // ------------------------------------------------------------------
  // Job Board
  // ------------------------------------------------------------------

  spawnJobBoard() {
    // Place the board at a market square or guildhall, avoiding special buildings
    let spot = null;

    // Filter out special buildings from marketSquares
    const normalMarketSquares = (this.map.marketSquares || []).filter(s => !s.type || s.type === 'marketSquare');
    // Filter out special buildings from guildhalls
    const normalGuildhalls = (this.map.guildhalls || []).filter(s => !s.type || s.type === 'guildhall');

    if (normalMarketSquares.length > 0) {
      spot = normalMarketSquares[0];
    } else if (normalGuildhalls.length > 0) {
      spot = normalGuildhalls[0];
    } else {
      // Fallback: near player spawn
      const spawn = this.townGenerator.getPlayerSpawnPoint();
      spot = { x: spawn.x + 48, y: spawn.y - 48 };
    }

    this.jobBoardPosition = { x: spot.x, y: spot.y - 16 };

    // Visual: simple rectangle + label
    const board = this.add.rectangle(this.jobBoardPosition.x, this.jobBoardPosition.y, 24, 30, 0x8B4513);
    board.setStrokeStyle(2, 0xFFD700);
    board.setDepth(8);

    this.add.text(this.jobBoardPosition.x, this.jobBoardPosition.y - 22, 'JOBS', {
      fontSize: '9px', fontFamily: 'Verdana', fontStyle: 'bold', fill: '#FFD700'
    }).setOrigin(0.5).setDepth(9);
  }

  openJobBoard() {
    if (!this.jobSystem) return;
    const uiScene = this.scene.get('UIScene');
    if (uiScene) {
      const jobs = this.jobSystem.getAvailableJobs();
      uiScene.events.emit('openJobBoard', jobs, (jobId) => {
        const accepted = this.jobSystem.acceptJob(jobId);
        if (accepted) {
          try { this.events.emit('message', `Job accepted: ${this.jobSystem.getActiveJob().title}`); } catch (e) {}

          // DEBUG: Immediately start the encounter
          this.jobSystem.beginTravel();
          const job = this.jobSystem.getActiveJob();

          // Save player state
          if (this.player && typeof this.player.saveToRegistry === 'function') {
            this.player.saveToRegistry();
          }

          // Immediate transition (no fade for debugging)
          try {
            this.scene.launch('EncounterScene', { job });
            this.scene.bringToTop('EncounterScene');
            this.scene.pause();
          } catch (e) {
            console.error('Failed to launch EncounterScene:', e);
          }
        }
      });
    }
  }

  // ------------------------------------------------------------------
  // Encounter return handling
  // ------------------------------------------------------------------

  _handleEncounterReturn() {
    const result = this.registry.get('lastEncounterResult');
    console.log('[GameScene] _handleEncounterReturn - result:', JSON.stringify(result));
    if (!result) return;

    // Clear it immediately
    this.registry.set('lastEncounterResult', null);

    // Feed result into job system
    if (this.jobSystem && this.jobSystem.hasActiveJob()) {
      this.jobSystem.onEncounterComplete(result);
      const completion = this.jobSystem.completeJob();
      console.log('[GameScene] Job completed. Completion:', JSON.stringify(completion));

      if (completion) {
        const { job, rewards } = completion;
        // Show return summary
        const parts = [];
        if (result.success) parts.push('Job Complete!');
        else if (result.fled) parts.push('Job Failed — you fled.');
        else if (result.died) parts.push('Job Failed — you were defeated.');

        if (rewards.gold) parts.push(`+${rewards.gold} gold`);
        if (rewards.xp) parts.push(`+${rewards.xp} XP`);
        if (rewards.fame > 0) parts.push(`+${rewards.fame} fame`);
        if (rewards.infamy > 0) parts.push(`+${rewards.infamy} infamy`);
        if (rewards.infamy < 0) parts.push(`${rewards.infamy} infamy`);

        try { this.events.emit('message', parts.join('  ')); } catch (e) {}
      }
    }

    // Apply town reactions
    this.applyTownReactions();
  }

  applyTownReactions() {
    const fame = this.registry.get('fame') || 0;
    const infamy = this.registry.get('infamy') || 0;

    // Enable guards if infamy is high enough
    if (infamy > 20 && !this.enableGuards) {
      this.enableGuards = true;
      this.spawnGuards(Math.max(1, Math.floor(infamy / 20)));
    }

    // Merchant price modifier: fame = discount, infamy = markup
    const priceModifier = 1.0 - (fame * 0.002) + (infamy * 0.003);
    this.registry.set('merchantPriceModifier', Math.max(0.8, Math.min(1.5, priceModifier)));

    // Atmosphere message
    if (infamy > 40) {
      try { this.events.emit('message', 'The guards eye you with suspicion as you enter town...'); } catch (e) {}
    } else if (fame > 40) {
      try { this.events.emit('message', 'The townsfolk greet you warmly. Your deeds are known.'); } catch (e) {}
    }
  }

  sellToPatron(patron) {
    const result = this.alchemySystem.sellToPatron(patron);
    if (result.success) {
      patron.purchase();
      this.events.emit('sale', result);
      this.registry.events.emit('sale', result);
      // celebratory particle burst for sale
      try {
        if (this.saleEmitter && this.saleParticles) {
          this.saleEmitter.explode(18, patron.x, patron.y);
        } else if (this.footstepEmitter) {
          this.footstepEmitter.explode(6, patron.x, patron.y);
        }
      } catch (e) {}
      // Add infamy for the sale
      if (result.infamyGain > 0) {
        this.infamySystem.add(result.infamyGain, 'contraband_sale');
      }
    } else {
      this.events.emit('saleFailed', result);
      this.registry.events.emit('saleFailed', result);
    }
  }

  // Helper to emit dash VFX (particle burst + afterimage trail)
  emitDashEffect(x, y) {
    try {
      // Large radial burst of cyan/white particles
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 90 + Math.random() * 70;
        const pvx = Math.cos(angle) * speed;
        const pvy = Math.sin(angle) * speed;
        const size = 2 + Math.random() * 3;
        const color = Math.random() > 0.4 ? 0x00ffff : 0xffffff;

        const particle = this.add.circle(x, y, size, color, 0.9);
        particle.setDepth(5);

        this.tweens.add({
          targets: particle,
          x: x + pvx * 0.6,
          y: y + pvy * 0.6,
          alpha: 0,
          scale: 0.2,
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy()
        });
      }

      // Ground shockwave ring
      const ring = this.add.circle(x, y, 8, 0x00ffff, 0);
      ring.setStrokeStyle(3, 0x00ffff, 0.9);
      ring.setDepth(4);
      this.tweens.add({
        targets: ring,
        radius: 48,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 350,
        ease: 'Cubic.easeOut',
        onUpdate: () => { try { ring.setStrokeStyle(2, 0x00ffff, ring.alpha * 0.8); } catch (e) {} },
        onComplete: () => ring.destroy()
      });

      // Afterimage trail: spawn fading copies along dash path
      if (this.player && this.player.sprite) {
        const sprite = this.player.sprite;
        for (let t = 1; t <= 3; t++) {
          this.time.delayedCall(t * 40, () => {
            try {
              const ghost = this.add.sprite(sprite.x, sprite.y, sprite.texture.key);
              ghost.setScale(sprite.scaleX, sprite.scaleY);
              ghost.setDepth(sprite.depth - 1);
              ghost.setAlpha(0.5);
              ghost.setTint(0x00ccff);
              this.tweens.add({
                targets: ghost,
                alpha: 0,
                duration: 250,
                ease: 'Cubic.easeOut',
                onComplete: () => ghost.destroy()
              });
            } catch (e) {}
          });
        }
      }
    } catch (e) {}
  }

  // Secondary attack: AOE damage zone
  createSecondaryAttackAOE(x, y) {
    try {
      const radius = 80;
      const damage = 25;

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
      if (this.enableEnemies && this.enemies) {
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

  // Helper to emit a single footstep particle or small burst
  emitFootstep(x, y, strong = false) {
    try {
      const now = Date.now();
      const minDelay = strong ? 80 : 200;
      if (now - (this.lastFootstepTime || 0) < minDelay) return;
      this.lastFootstepTime = now;
      if (this.footstepEmitter) {
        const count = strong ? 2 : 1;
        this.footstepEmitter.explode(count, x, y);
      }
    } catch (e) {}
  }

  enterGuildhall(guildhall) {
    // Entering a guildhall reduces infamy significantly
    const reduction = 25;
    this.infamySystem.reduce(reduction);
    this.events.emit('guildhall', { message: 'Seeking sanctuary...', reduction });
    this.registry.events.emit('guildhall', { message: 'Seeking sanctuary...', reduction });
  }

  enterTavern(tavern) {
    // Save player position before entering
    this.player.saveToRegistry();

    // Launch tavern scene with player's current position for return
    this.scene.launch('TavernScene', {
      fromX: this.player.sprite.x,
      fromY: this.player.sprite.y
    });
    this.scene.pause();
  }

  enterBlacksmith(hall) {
    // Enter blacksmith interior
    this.scene.launch('BlacksmithScene');
    this.scene.pause();
  }

  enterBlackMarket(hall) {
    // Enter black market interior
    this.scene.launch('BlackMarketScene', {
      fromX: this.player.sprite.x,
      fromY: this.player.sprite.y
    });
    this.scene.pause();
  }

  spawnGuildMaster() {
    this.guildMasters = this.add.group();
    if (this.map.guildhalls) {
      // Skip spots that are designated as special buildings (blacksmith is in guildhalls array)
      const normalGuildhalls = this.map.guildhalls.filter(spot => !spot.type || spot.type === 'guildhall');
      normalGuildhalls.forEach(spot => {
        const gm = new GuildMaster(this, spot.x, spot.y);
        this.guildMasters.add(gm.sprite);
      });
    }
  }
}
