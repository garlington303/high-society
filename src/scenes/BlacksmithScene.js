import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Blacksmith } from '../entities/Blacksmith.js';

export class BlacksmithScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BlacksmithScene' });
    this.shopOpen = false;
  }

  init(data) {
    this.returnX = data.fromX || 400;
    this.returnY = data.fromY || 400;
    // Reset flags
    this._exiting = false;
    this.shopOpen = false;
  }

  create() {
    const W = 400;
    const H = 300;
    const offsetX = (800 - W) / 2;
    const offsetY = (600 - H) / 2;

    // Stone floor
    this.add.rectangle(400, 300, W, H, 0x222222).setDepth(0);
    // Stone tiles detail
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 6; j++) {
        const x = offsetX + 25 + i * 50;
        const y = offsetY + 25 + j * 50;
        this.add.rectangle(x, y, 48, 48, 0x333333).setDepth(0);
      }
    }

    // Walls
    this.add.rectangle(400, offsetY, W, 16, 0x444444).setDepth(1); // top
    this.add.rectangle(400, offsetY + H, W, 16, 0x444444).setDepth(1); // bottom
    this.add.rectangle(offsetX, 300, 16, H, 0x444444).setDepth(1); // left
    this.add.rectangle(offsetX + W, 300, 16, H, 0x444444).setDepth(1); // right

    // Forge (Red glowing area)
    this.add.rectangle(offsetX + 60, offsetY + 60, 80, 80, 0x220000).setDepth(1);
    this.add.circle(offsetX + 60, offsetY + 60, 30, 0xff4400, 0.5).setDepth(1);
    // Fire particles would be nice here

    // Anvil (Placeholder)
    this.add.rectangle(offsetX + 150, offsetY + 80, 40, 20, 0x111111).setDepth(2); // base
    this.add.rectangle(offsetX + 150, offsetY + 70, 50, 15, 0x333333).setDepth(2); // top

    // NPC: Blacksmith (use Blacksmith entity)
    const smithX = offsetX + 100;
    const smithY = offsetY + 100;
    this.blacksmithEntity = new Blacksmith(this, smithX, smithY, 0);
    this.blacksmith = this.blacksmithEntity.sprite;
    this.blacksmith.setTint(0x555555); // Soot covered
    
    this.add.text(smithX, smithY - 24, 'Blacksmith', {
      fontSize: '10px', fontFamily: 'Verdana', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(10);

    // Player
    const spawnX = 400;
    const spawnY = offsetY + H - 60;
    this.player = new Player(this, spawnX, spawnY);
    this.player.sprite.setDepth(5);
    this.physics.world.setBounds(offsetX + 16, offsetY + 16, W - 32, H - 32);
    this.player.sprite.body.setCollideWorldBounds(true);

    // Exit
    const exitY = offsetY + H - 20;
    this.exitZone = this.add.rectangle(400, exitY, 40, 20, 0x111111).setDepth(1);
    this.add.text(400, exitY, 'EXIT', { fontSize: '10px', color: '#fff' }).setOrigin(0.5).setDepth(2);
    this.exitBody = this.physics.add.staticImage(400, exitY, '__DEFAULT');
    this.exitBody.setVisible(false);

    // Collisions
    this.physics.add.collider(this.player.sprite, this.blacksmith);
    this.physics.add.overlap(this.player.sprite, this.exitBody, () => this.exitShop());

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Interaction prompt
    this.interactionPrompt = this.add.sprite(0, 0, 'prompt_interact_hd');
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(100);

    this.cameras.main.fadeIn(300);
  }

  update(time, delta) {
    if (this.player) this.player.update(this.cursors, this.keys, delta);
    if (this.blacksmithEntity) this.blacksmithEntity.update(delta);

    // ESC to exit (unless shop UI is open)
    if (!this.shopOpen && Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.exitShop();
      return;
    }

    // Don't allow interaction if shop UI is open
    if (this.shopOpen) return;

    // Check interaction
    const dist = Phaser.Math.Distance.Between(
      this.player.sprite.x, this.player.sprite.y,
      this.blacksmith.x, this.blacksmith.y
    );

    if (dist < 50) {
      this.interactionPrompt.setPosition(this.blacksmith.x, this.blacksmith.y - 32);
      this.interactionPrompt.setVisible(true);
      
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.interact();
      }
    } else {
      this.interactionPrompt.setVisible(false);
    }
  }

  interact() {
    // Check if shop is open
    if (!this.blacksmithEntity.isOpen()) {
      const ui = this.scene.get('UIScene');
      if (ui && ui.eventUI) {
        const time = this.registry.get('time') || 12;
        ui.eventUI.showEvent({
          title: 'The Blacksmith',
          description: `The blacksmith is closed. (Hours: ${this.blacksmithEntity.openHour}:00-${this.blacksmithEntity.closeHour}:00, Current: ${Math.floor(time)}:00)`,
          choices: [{ text: 'Leave.', effect: () => {} }]
        }, () => {});
      }
      return;
    }

    // Open shop UI
    this.openShop();
  }

  openShop() {
    this.shopOpen = true;
    this.player.sprite.setVelocity(0, 0);
    this.createShopUI();
  }

  createShopUI() {
    const W = 500;
    const H = 400;
    const X = (800 - W) / 2;
    const Y = (600 - H) / 2;

    // Background - fixed to camera
    this.shopBg = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7)
      .setDepth(10000)
      .setScrollFactor(0)
      .setInteractive();
    
    this.shopPanel = this.add.rectangle(400, 300, W, H, 0x2a2a2a)
      .setDepth(10001)
      .setScrollFactor(0);
    
    this.shopBorder = this.add.rectangle(400, 300, W + 4, H + 4, 0xaa8844)
      .setDepth(10000)
      .setScrollFactor(0)
      .setStrokeStyle(2, 0xffcc88);

    // Title
    this.shopTitle = this.add.text(400, Y + 20, 'BLACKSMITH SHOP', {
      fontSize: '24px', fontFamily: 'Verdana', color: '#ffcc88', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10002).setScrollFactor(0);

    // Player gold
    const playerGold = this.registry.get('gold') || 0;
    this.goldText = this.add.text(X + W - 20, Y + 20, `Gold: ${playerGold}`, {
      fontSize: '16px', fontFamily: 'Verdana', color: '#ffdd44'
    }).setOrigin(1, 0).setDepth(10002).setScrollFactor(0);

    // Shop hours info
    const time = this.registry.get('time') || 12;
    this.hoursText = this.add.text(400, Y + 50, `Open: ${this.blacksmithEntity.openHour}:00-${this.blacksmithEntity.closeHour}:00 | Current Time: ${Math.floor(time)}:00`, {
      fontSize: '12px', fontFamily: 'Verdana', color: '#888888'
    }).setOrigin(0.5).setDepth(10002).setScrollFactor(0);

    // Item list
    this.itemListY = Y + 90;
    this.itemButtons = [];
    this.itemTexts = [];
    let index = 0;

    const itemNames = {
      iron_sword: 'Iron Sword',
      iron_axe: 'Iron Axe',
      leather_armor: 'Leather Armor',
      iron_shield: 'Iron Shield',
      steel_dagger: 'Steel Dagger'
    };

    for (const [itemKey, stock] of Object.entries(this.blacksmithEntity.inventory)) {
      const itemY = this.itemListY + index * 50;
      const price = this.blacksmithEntity.prices[itemKey];
      const itemName = itemNames[itemKey] || itemKey;

      // Item button
      const btn = this.add.rectangle(400, itemY, 440, 40, 0x444444)
        .setDepth(10001)
        .setScrollFactor(0)
        .setInteractive();
      btn.setStrokeStyle(1, 0x666666);
      
      // Item text
      const txt = this.add.text(X + 30, itemY, `${itemName} - ${price}g (Stock: ${stock})`, {
        fontSize: '16px', fontFamily: 'Verdana', color: '#ffffff'
      }).setOrigin(0, 0.5).setDepth(10002).setScrollFactor(0);

      // Buy button
      const buyBtn = this.add.rectangle(X + W - 80, itemY, 60, 30, 0x44aa44)
        .setDepth(10001)
        .setScrollFactor(0)
        .setInteractive();
      buyBtn.setStrokeStyle(1, 0x88ff88);
      
      const buyTxt = this.add.text(X + W - 80, itemY, 'BUY', {
        fontSize: '14px', fontFamily: 'Verdana', color: '#ffffff', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(10002).setScrollFactor(0);

      // Hover effects
      btn.on('pointerover', () => btn.setFillStyle(0x555555));
      btn.on('pointerout', () => btn.setFillStyle(0x444444));
      
      buyBtn.on('pointerover', () => buyBtn.setFillStyle(0x55cc55));
      buyBtn.on('pointerout', () => buyBtn.setFillStyle(0x44aa44));
      
      buyBtn.on('pointerdown', () => this.buyItem(itemKey, itemName, btn, txt, buyBtn, buyTxt));

      this.itemButtons.push({ btn, buyBtn, buyTxt, itemKey, txt });
      this.itemTexts.push(txt);
      index++;
    }

    // Close button
    this.closeBtn = this.add.rectangle(400, Y + H - 40, 120, 40, 0xaa4444)
      .setDepth(10001)
      .setScrollFactor(0)
      .setInteractive();
    this.closeBtn.setStrokeStyle(2, 0xff8888);
    
    this.closeBtnText = this.add.text(400, Y + H - 40, 'CLOSE', {
      fontSize: '18px', fontFamily: 'Verdana', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10002).setScrollFactor(0);

    this.closeBtn.on('pointerover', () => this.closeBtn.setFillStyle(0xcc5555));
    this.closeBtn.on('pointerout', () => this.closeBtn.setFillStyle(0xaa4444));
    this.closeBtn.on('pointerdown', () => this.closeShop());
  }

  buyItem(itemKey, itemName, btn, txt, buyBtn, buyTxt) {
    const result = this.blacksmithEntity.buy(itemKey, 1);
    
    if (result.success) {
      // Update UI
      this.goldText.setText(`Gold: ${this.registry.get('gold')}`);
      
      // Update stock display
      const stock = this.blacksmithEntity.inventory[itemKey];
      const price = this.blacksmithEntity.prices[itemKey];
      txt.setText(`${itemName} - ${price}g (Stock: ${stock})`);

      // Show feedback
      const feedbackText = this.add.text(400, 250, `Purchased ${itemName}!`, {
        fontSize: '20px', fontFamily: 'Verdana', color: '#44ff44', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(10003).setScrollFactor(0);

      this.tweens.add({
        targets: feedbackText,
        y: 200,
        alpha: 0,
        duration: 1000,
        onComplete: () => feedbackText.destroy()
      });

      // Disable button if out of stock
      if (stock === 0) {
        buyBtn.setFillStyle(0x666666);
        buyBtn.disableInteractive();
        buyTxt.setColor('#888888');
      }
    } else {
      // Show error
      const errorText = this.add.text(400, 250, result.reason, {
        fontSize: '18px', fontFamily: 'Verdana', color: '#ff4444', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(10003).setScrollFactor(0);

      this.tweens.add({
        targets: errorText,
        y: 200,
        alpha: 0,
        duration: 1000,
        onComplete: () => errorText.destroy()
      });
    }
  }

  closeShop() {
    this.shopOpen = false;

    // Destroy all shop UI elements
    if (this.shopBg) this.shopBg.destroy();
    if (this.shopPanel) this.shopPanel.destroy();
    if (this.shopBorder) this.shopBorder.destroy();
    if (this.shopTitle) this.shopTitle.destroy();
    if (this.goldText) this.goldText.destroy();
    if (this.hoursText) this.hoursText.destroy();
    if (this.closeBtn) this.closeBtn.destroy();
    if (this.closeBtnText) this.closeBtnText.destroy();

    this.itemTexts.forEach(t => t.destroy());
    this.itemButtons.forEach(({ btn, buyBtn, buyTxt }) => {
      btn.destroy();
      buyBtn.destroy();
      buyTxt.destroy();
    });

    this.itemButtons = [];
    this.itemTexts = [];
  }

  exitShop() {
    if (this._exiting) return;
    this._exiting = true;
    
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
