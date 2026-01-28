import Phaser from 'phaser';
import { WARES } from '../entities/Alchemist.js';

export class MerchantDialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MerchantDialogueScene' });
  }

  init(data) {
    this.alchemist = data.alchemist;
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.quantity = 1;
  }

  create() {
    // Semi-transparent background overlay with parchment tint
    this.overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x1a1510,
      0.8
    );

    // Main dialogue container
    this.container = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Panel background - medieval parchment style
    const panelWidth = 420;
    const panelHeight = 340;
    this.panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x3d3224, 0.95);
    this.panel.setStrokeStyle(3, 0x8b7355);
    this.container.add(this.panel);

    // Portrait
    this.portrait = this.add.image(0, -110, 'alchemist_portrait');
    this.portrait.setScale(1.5);
    this.container.add(this.portrait);

    // Portrait frame - ornate medieval style
    const frameSize = 100;
    this.portraitFrame = this.add.rectangle(0, -110, frameSize, frameSize);
    this.portraitFrame.setStrokeStyle(2, 0xcd853f);
    this.portraitFrame.setFillStyle(0x000000, 0);
    this.container.add(this.portraitFrame);

    // Dialogue text
    this.dialogueText = this.add.text(0, -30, '', {
      font: '14px Courier New',
      fill: '#f5f0e1',
      align: 'center',
      wordWrap: { width: 380 }
    }).setOrigin(0.5);
    this.container.add(this.dialogueText);

    // Menu items container
    this.menuContainer = this.add.container(0, 40);
    this.container.add(this.menuContainer);

    // Player info (gold)
    const gold = this.registry.get('gold');
    this.goldText = this.add.text(-180, 140, `Gold: ${gold}g`, {
      font: '12px Courier New',
      fill: '#ffd700'
    });
    this.container.add(this.goldText);

    // Instructions
    this.instructionsText = this.add.text(0, 150, '', {
      font: '10px Courier New',
      fill: '#8b7355',
      align: 'center'
    }).setOrigin(0.5);
    this.container.add(this.instructionsText);

    // Setup input
    this.setupInput();

    // Show main menu
    this.showMainMenu();

    // Fade in
    this.cameras.main.fadeIn(150, 0, 0, 0);
  }

  setupInput() {
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Input handler
    this.inputTimer = this.time.addEvent({
      delay: 100,
      callback: this.handleInput,
      callbackScope: this,
      loop: true
    });
  }

  handleInput() {
    const upPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
    const downPressed = Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s);
    const leftPressed = Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a);
    const rightPressed = Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d);
    const confirmPressed = Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    const escPressed = Phaser.Input.Keyboard.JustDown(this.keys.esc);

    if (this.currentMenu === 'main') {
      // Number key shortcuts
      if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
        this.selectedIndex = 0;
        this.confirmSelection();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
        this.selectedIndex = 1;
        this.confirmSelection();
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
        this.selectedIndex = 2;
        this.confirmSelection();
        return;
      }

      if (upPressed) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateMenuHighlight();
      } else if (downPressed) {
        this.selectedIndex = Math.min(2, this.selectedIndex + 1);
        this.updateMenuHighlight();
      } else if (confirmPressed) {
        this.confirmSelection();
      } else if (escPressed) {
        this.closeDialogue();
      }
    } else if (this.currentMenu === 'buy' || this.currentMenu === 'sell') {
      const items = this.currentMenu === 'buy' ? this.stockItems : this.sellItems;
      const maxIndex = items ? items.length - 1 : 0;

      if (upPressed) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.quantity = 1;
        this.updateSubMenuHighlight();
      } else if (downPressed) {
        this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 1);
        this.quantity = 1;
        this.updateSubMenuHighlight();
      } else if (leftPressed && items && items.length > 0) {
        this.quantity = Math.max(1, this.quantity - 1);
        this.updateSubMenuHighlight();
      } else if (rightPressed && items && items.length > 0) {
        const maxQty = items[this.selectedIndex]?.available || items[this.selectedIndex]?.amount || 1;
        this.quantity = Math.min(maxQty, this.quantity + 1);
        this.updateSubMenuHighlight();
      } else if (confirmPressed && items && items.length > 0) {
        this.confirmTransaction();
      } else if (escPressed) {
        this.showMainMenu();
      }
    }
  }

  showMainMenu() {
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.clearMenu();

    // Greeting - fantasy themed
    const greetings = [
      "What brings you to my humble shop?",
      "Seeking rare concoctions, are we?",
      "I have potions for every ailment...",
      "Speak quickly, the inquisitors prowl.",
      "My wares are... discreet."
    ];
    this.dialogueText.setText(Phaser.Math.RND.pick(greetings));

    // Menu options
    this.menuItems = [];
    const options = [
      { label: '[1] BROWSE WARES', desc: 'View my stock' },
      { label: '[2] TRADE', desc: 'Sell your reagents' },
      { label: '[3] FAREWELL', desc: 'May fortune favor you' }
    ];

    options.forEach((opt, i) => {
      const y = i * 36;
      const text = this.add.text(-100, y, `${opt.label}  -  ${opt.desc}`, {
        font: '14px Courier New',
        fill: i === 0 ? '#cd853f' : '#a59d8a'
      });
      this.menuContainer.add(text);
      this.menuItems.push(text);
    });

    this.instructionsText.setText('UP/DOWN: Select | ENTER: Confirm | ESC: Leave');
  }

  showBuyMenu() {
    this.currentMenu = 'buy';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.clearMenu();

    const stock = this.alchemist.getAvailableStock();
    this.stockItems = stock;

    if (stock.length === 0) {
      this.dialogueText.setText("My stores are depleted. Return another day.");
      this.instructionsText.setText('ESC: Back');
      return;
    }

    this.dialogueText.setText("What elixir catches your eye?");
    this.renderBuyMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Quantity | ENTER: Buy | ESC: Back');
  }

  renderBuyMenu() {
    this.clearMenu();
    const gold = this.registry.get('gold');

    this.stockItems.forEach((item, i) => {
      const y = i * 32;
      const isSelected = i === this.selectedIndex;
      const totalCost = item.price * (isSelected ? this.quantity : 1);
      const canAfford = gold >= totalCost;

      let color = '#a59d8a';
      if (isSelected) color = canAfford ? '#cd853f' : '#cd5c5c';

      const prefix = isSelected ? '> ' : '  ';
      const qtyStr = isSelected ? ` x${this.quantity} = ${totalCost}g` : '';

      const text = this.add.text(-180, y,
        `${prefix}${item.info.name}: ${item.price}g/ea (${item.amount} avail)${qtyStr}`, {
        font: '13px Courier New',
        fill: color
      });
      this.menuContainer.add(text);
    });

    // Update gold display
    this.goldText.setText(`Gold: ${gold}g`);
  }

  showSellMenu() {
    this.currentMenu = 'sell';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.clearMenu();

    const inventory = this.registry.get('inventory') || {};
    this.sellItems = Object.entries(inventory)
      .filter(([ware, amount]) => amount > 0)
      .map(([ware, amount]) => ({
        ware,
        name: WARES[ware].name,
        amount,
        sellPrice: Math.floor(this.alchemist.prices[ware] * 0.6)
      }));

    if (this.sellItems.length === 0) {
      this.dialogueText.setText("You carry nothing of interest.");
      this.instructionsText.setText('ESC: Back');
      return;
    }

    this.dialogueText.setText("What reagents do you offer? I pay 60% of market value.");
    this.renderSellMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Quantity | ENTER: Sell | ESC: Back');
  }

  renderSellMenu() {
    this.clearMenu();

    this.sellItems.forEach((item, i) => {
      const y = i * 32;
      const isSelected = i === this.selectedIndex;
      const totalValue = item.sellPrice * (isSelected ? this.quantity : 1);

      const color = isSelected ? '#cd853f' : '#a59d8a';
      const prefix = isSelected ? '> ' : '  ';
      const qtyStr = isSelected ? ` x${this.quantity} = ${totalValue}g` : '';

      const text = this.add.text(-180, y,
        `${prefix}${item.name}: ${item.sellPrice}g/ea (you have ${item.amount})${qtyStr}`, {
        font: '13px Courier New',
        fill: color
      });
      this.menuContainer.add(text);
    });
  }

  clearMenu() {
    this.menuContainer.removeAll(true);
    this.menuItems = [];
  }

  updateMenuHighlight() {
    this.menuItems.forEach((item, i) => {
      item.setColor(i === this.selectedIndex ? '#cd853f' : '#a59d8a');
    });
  }

  updateSubMenuHighlight() {
    if (this.currentMenu === 'buy') {
      this.renderBuyMenu();
    } else if (this.currentMenu === 'sell') {
      this.renderSellMenu();
    }
  }

  confirmSelection() {
    if (this.currentMenu === 'main') {
      switch (this.selectedIndex) {
        case 0:
          this.showBuyMenu();
          break;
        case 1:
          this.showSellMenu();
          break;
        case 2:
          this.closeDialogue();
          break;
      }
    }
  }

  confirmTransaction() {
    if (this.currentMenu === 'buy') {
      this.executeBuy();
    } else if (this.currentMenu === 'sell') {
      this.executeSell();
    }
  }

  executeBuy() {
    const item = this.stockItems[this.selectedIndex];
    if (!item) return;

    const result = this.alchemist.buy(item.ware, this.quantity);
    if (result.success) {
      this.showMessage(`Acquired ${this.quantity} ${item.info.name} for ${result.totalPrice}g`, '#228b22');
      // Refresh the menu
      this.quantity = 1;
      this.showBuyMenu();
    } else {
      this.showMessage(result.reason, '#cd5c5c');
    }
  }

  executeSell() {
    const item = this.sellItems[this.selectedIndex];
    if (!item) return;

    const result = this.alchemist.sell(item.ware, this.quantity);
    if (result.success) {
      this.showMessage(`Sold ${this.quantity} ${item.name} for ${result.totalPrice}g`, '#228b22');
      // Refresh the menu
      this.quantity = 1;
      this.showSellMenu();
    } else {
      this.showMessage(result.reason, '#cd5c5c');
    }
  }

  showMessage(text, color) {
    // Create floating message
    const msg = this.add.text(this.scale.width / 2, this.scale.height / 2 - 180, text, {
      font: '14px Courier New',
      fill: color
    }).setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      y: msg.y - 30,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => msg.destroy()
    });

    // Update gold display
    const gold = this.registry.get('gold');
    this.goldText.setText(`Gold: ${gold}g`);
  }

  closeDialogue() {
    // Clean up
    if (this.inputTimer) {
      this.inputTimer.destroy();
    }

    // Fade out
    this.cameras.main.fadeOut(150, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Resume GameScene
      this.scene.resume('GameScene');
      // Stop this scene
      this.scene.stop();
    });
  }
}
