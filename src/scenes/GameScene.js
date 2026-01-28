import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Guard } from '../entities/Guard.js';
import { Villager } from '../entities/Villager.js';
import { Alchemist } from '../entities/Alchemist.js';
import { Patron } from '../entities/Patron.js';
import { TownGenerator } from '../world/TownGenerator.js';
import { Pathfinding } from '../utils/Pathfinding.js';
import { InfamySystem } from '../systems/InfamySystem.js';
import { AlchemySystem } from '../systems/AlchemySystem.js';

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

    // Pathfinding helper for navigation
    this.pathfinding = new Pathfinding(this.townGenerator);

    // Create entity groups
    this.villagers = this.add.group();
    this.guards = this.add.group();
    this.alchemists = this.add.group();
    this.patrons = this.add.group();

    // Systems
    this.infamySystem = new InfamySystem(this);
    this.alchemySystem = new AlchemySystem(this);

    // Create player on a valid path tile (not inside buildings)
    const spawnTile = this.townGenerator.getPlayerSpawnPoint();
    this.player = new Player(this, spawnTile.x, spawnTile.y);

    // Spawn initial entities
    this.spawnAlchemists();
    this.spawnVillagers(12);
    this.spawnGuards(3);

    // Camera follow
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Camera zoom settings
    this.minCameraZoom = 0.5;
    this.maxCameraZoom = 1.8;
    this.cameraZoomSensitivity = 0.0016; // multiplier for wheel delta
    this.cameras.main.setZoom(1);

    // Mouse wheel -> zoom towards pointer
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const cam = this.cameras.main;
      // World point under cursor before zoom
      const before = cam.getWorldPoint(pointer.x, pointer.y);

      // Compute new zoom (scroll down positive -> zoom out)
      const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * this.cameraZoomSensitivity, this.minCameraZoom, this.maxCameraZoom);
      cam.setZoom(newZoom);

      // World point under cursor after zoom; shift camera so pointer stays focused
      const after = cam.getWorldPoint(pointer.x, pointer.y);
      cam.scrollX += (before.x - after.x);
      cam.scrollY += (before.y - after.y);
    });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    // Collision setup
    this.setupCollisions();

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

    // Time progression
    this.time.addEvent({
      delay: 5000,
      callback: this.advanceTime,
      callbackScope: this,
      loop: true
    });

    // Interaction prompt
    this.interactionPrompt = this.add.sprite(0, 0, 'prompt_interact_hd');
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(100);
    // Slightly scale down so HD prompt doesn't appear oversized in UI
    this.interactionPrompt.setScale(0.9);

    // Current interaction target
    this.currentInteraction = null;
  }

  setupCollisions() {
    // Player vs buildings (cottages)
    this.physics.add.collider(this.player.sprite, this.map.buildings);

    // Guards vs buildings
    this.physics.add.collider(this.guards, this.map.buildings);

    // Guard spots player
    this.physics.add.overlap(
      this.player.sprite,
      this.guards,
      this.onGuardSpotPlayer,
      null,
      this
    );
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

    finalSpots.forEach((spot, i) => {
      const alchemist = new Alchemist(this, spot.x, spot.y, i);
      this.alchemists.add(alchemist.sprite);
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
      }
    }
  }

  spawnGuards(count) {
    const cobbleTiles = this.townGenerator.getCobbleTiles();
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Math.RND.pick(cobbleTiles);
      if (spot) {
        const guard = new Guard(this, spot.x, spot.y);
        this.guards.add(guard.sprite);
      }
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
  }

  updateGuardPatrols(isNight) {
    const currentCount = this.guards.getLength();
    const infamy = this.registry.get('infamy');
    const baseTarget = isNight ? 5 : 3;
    const infamyBonus = Math.floor(infamy / 25);
    const targetCount = baseTarget + infamyBonus;

    if (currentCount < targetCount) {
      this.spawnGuards(1);
    }
  }

  update(time, delta) {
    // Update player
    this.player.update(this.cursors, this.keys, delta);

    // Update all entities
    this.villagers.getChildren().forEach(v => {
      const entity = v.getData('entity');
      if (entity) entity.update(delta);
    });

    this.guards.getChildren().forEach(g => {
      const entity = g.getData('entity');
      if (entity) entity.update(delta, this.player);
    });

    this.patrons.getChildren().forEach(p => {
      const entity = p.getData('entity');
      if (entity) entity.update(delta, this.player);
    });

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
      }
    });

    // Check guildhalls (sanctuaries)
    this.map.guildhalls.forEach(gh => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, gh.x, gh.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'guildhall', entity: gh };
        this.interactionPrompt.setPosition(gh.x, gh.y - 20);
        this.interactionPrompt.setVisible(true);
      }
    });
  }

  handleInteraction() {
    if (!this.currentInteraction) return;

    const { type, entity } = this.currentInteraction;

    switch (type) {
      case 'alchemist':
        this.openAlchemistMenu(entity);
        break;
      case 'patron':
        this.sellToPatron(entity);
        break;
      case 'guildhall':
        this.enterGuildhall(entity);
        break;
    }
  }

  openAlchemistMenu(alchemist) {
    // Launch merchant dialogue scene
    this.scene.launch('MerchantDialogueScene', { alchemist });
    this.scene.pause();
  }

  sellToPatron(patron) {
    const result = this.alchemySystem.sellToPatron(patron);
    if (result.success) {
      patron.purchase();
      this.events.emit('sale', result);
      // Add infamy for the sale
      if (result.infamyGain > 0) {
        this.infamySystem.add(result.infamyGain, 'contraband_sale');
      }
    } else {
      this.events.emit('saleFailed', result);
    }
  }

  enterGuildhall(guildhall) {
    // Entering a guildhall reduces infamy significantly
    const reduction = 25;
    this.infamySystem.reduce(reduction);
    this.events.emit('guildhall', { message: 'Seeking sanctuary...', reduction });
  }
}
