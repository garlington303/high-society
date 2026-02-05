import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { TavernKeeper } from '../entities/TavernKeeper.js';

export class TavernScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TavernScene' });
  }

  init(data) {
    // Remember where the player was in GameScene so we can restore position on exit
    this.returnX = data.fromX || 400;
    this.returnY = data.fromY || 400;
    // Reset exit flag
    this._exiting = false;
  }

  create() {
    const W = 400;
    const H = 300;
    const offsetX = (800 - W) / 2;
    const offsetY = (600 - H) / 2;

    // Dark wood floor
    this.add.rectangle(400, 300, W, H, 0x3b2a1a).setDepth(0);
    // Floor planks (subtle horizontal lines)
    for (let i = 0; i < 10; i++) {
      const y = offsetY + 30 * i;
      this.add.rectangle(400, y, W - 4, 1, 0x4a3828, 0.4).setDepth(0);
    }

    // Walls
    this.add.rectangle(400, offsetY, W, 8, 0x5a3b2b).setDepth(1); // top wall
    this.add.rectangle(400, offsetY + H, W, 8, 0x5a3b2b).setDepth(1); // bottom wall
    this.add.rectangle(offsetX, 300, 8, H, 0x5a3b2b).setDepth(1); // left wall
    this.add.rectangle(offsetX + W, 300, 8, H, 0x5a3b2b).setDepth(1); // right wall

    // Bar counter across the top
    const barY = offsetY + 50;
    this.add.rectangle(400, barY, W - 40, 16, 0x6b4226).setDepth(2);
    this.add.rectangle(400, barY, W - 40, 16).setStrokeStyle(1, 0x8B6914).setDepth(2);

    // Tables (2 small tables)
    const table1X = offsetX + 80;
    const table1Y = offsetY + 160;
    this.add.rectangle(table1X, table1Y, 32, 32, 0x5a3b2b).setDepth(2);
    this.add.rectangle(table1X, table1Y, 32, 32).setStrokeStyle(1, 0x7a5b3b).setDepth(2);

    const table2X = offsetX + W - 80;
    const table2Y = offsetY + 160;
    this.add.rectangle(table2X, table2Y, 32, 32, 0x5a3b2b).setDepth(2);
    this.add.rectangle(table2X, table2Y, 32, 32).setStrokeStyle(1, 0x7a5b3b).setDepth(2);

    // Chairs around tables (small circles)
    [[-20, 0], [20, 0], [0, -20], [0, 20]].forEach(([dx, dy]) => {
      this.add.circle(table1X + dx, table1Y + dy, 4, 0x4a2b1b).setDepth(1);
      this.add.circle(table2X + dx, table2Y + dy, 4, 0x4a2b1b).setDepth(1);
    });

    // "TAVERN" label at top
    this.add.text(400, offsetY + 16, 'THE RUSTY FLAGON', {
      fontSize: '12px', fontFamily: 'Verdana', fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5).setDepth(10);

    // Exit door (bottom center)
    // Move trigger slightly up to be reachable within world bounds
    const exitY = offsetY + H - 20; 
    
    this.exitZone = this.add.rectangle(400, exitY, 40, 12, 0x2a1a0a).setDepth(3);
    this.add.rectangle(400, exitY, 40, 12).setStrokeStyle(1, 0x8B6914).setDepth(3);
    this.add.text(400, exitY, 'EXIT', {
      fontSize: '8px', fontFamily: 'Verdana', color: '#ccaa66'
    }).setOrigin(0.5).setDepth(10);

    // Physics zone for exit detection
    this.exitBody = this.physics.add.staticImage(400, exitY, '__DEFAULT');
    this.exitBody.setSize(40, 12);
    this.exitBody.setVisible(false);

    // Spawn player inside the tavern (near the door)
    const playerSpawnX = 400;
    const playerSpawnY = offsetY + H - 40;
    this.player = new Player(this, playerSpawnX, playerSpawnY);
    this.player.sprite.setDepth(5);

    // Confine player to tavern bounds
    this.physics.world.setBounds(offsetX + 8, offsetY + 8, W - 16, H - 16);
    this.player.sprite.body.setCollideWorldBounds(true);

    // Tavern Keeper behind the bar
    const keeperX = 400;
    const keeperY = barY - 16;
    this.tavernKeeper = new TavernKeeper(this, keeperX, keeperY);

    // Table collision bodies
    this.tableGroup = this.physics.add.staticGroup();
    const t1 = this.tableGroup.create(table1X, table1Y, '__DEFAULT');
    t1.setSize(32, 32); t1.setVisible(false);
    const t2 = this.tableGroup.create(table2X, table2Y, '__DEFAULT');
    t2.setSize(32, 32); t2.setVisible(false);

    // Bar counter collision
    const barCollider = this.tableGroup.create(400, barY, '__DEFAULT');
    barCollider.setSize(W - 40, 16); barCollider.setVisible(false);

    // Collisions
    this.physics.add.collider(this.player.sprite, this.tableGroup);

    // Exit overlap
    this.physics.add.overlap(this.player.sprite, this.exitBody, () => {
      this.exitTavern();
    });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    // Map keys to lowercase properties to match Player.js expectations
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E, // Keep E and ESC uppercase as they are used in TavernScene.js directly
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT, // Needed for sprinting check in Player.js
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Interaction state
    this.currentInteraction = null;
    this.interactionPrompt = this.add.sprite(0, 0, 'prompt_interact_hd');
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(100);
    this.interactionPrompt.setScale(0.8);

    // Camera
    this.cameras.main.fadeIn(300);

    // Handle resume from MerchantDialogue
    this.events.on('resume', () => {
      this._exiting = false;
      // Reset input state to prevent stuck keys
      if (this.cursors) {
        this.cursors.left.reset();
        this.cursors.right.reset();
        this.cursors.up.reset();
        this.cursors.down.reset();
      }
    });
  }

  update(time, delta) {
    if (!this.player || !this.player.sprite || !this.player.sprite.body) return;

    this.player.update(this.cursors, this.keys, delta);

    // Check interaction with tavern keeper
    this.checkInteractions();

    // Handle E key for interaction
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      this.handleInteraction();
    }

    // ESC to exit
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.exitTavern();
    }
  }

  checkInteractions() {
    this.currentInteraction = null;
    this.interactionPrompt.setVisible(false);

    if (!this.tavernKeeper || !this.tavernKeeper.sprite) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      this.tavernKeeper.sprite.x, this.tavernKeeper.sprite.y
    );

    if (dist < 40) {
      this.currentInteraction = { type: 'tavernKeeper', entity: this.tavernKeeper };
      this.interactionPrompt.setPosition(this.tavernKeeper.sprite.x, this.tavernKeeper.sprite.y - 24);
      this.interactionPrompt.setVisible(true);
    }
  }

  handleInteraction() {
    if (!this.currentInteraction) return;

    if (this.currentInteraction.type === 'tavernKeeper') {
      this.tavernKeeper.interact(this);
    }
  }

  exitTavern() {
    if (this._exiting) return;
    this._exiting = true;

    // Save player state
    this.player.saveToRegistry();

    // Store return coordinates so GameScene knows where to place the player
    this.registry.set('tavernReturnX', this.returnX);
    this.registry.set('tavernReturnY', this.returnY);

    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('TavernScene');
      this.scene.resume('GameScene');
    });
  }
}
