import Phaser from 'phaser';
import { DRUGS } from '../entities/Dealer.js';

export class DealerDialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DealerDialogueScene' });
  }

  init(data) {
    this.dealer = data.dealer;
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.quantity = 1;
  }

  create() {
    // Semi-transparent background overlay
    this.overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );

    // Main dialogue container
    this.container = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Panel background
    const panelWidth = 420;
    const panelHeight = 340;
    this.panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 0.95);
    this.panel.setStrokeStyle(3, 0x6c5ce7);
    this.container.add(this.panel);

    // Portrait
    this.portrait = this.add.image(0, -110, 'dealer_portrait');
    this.portrait.setScale(1.5);
    this.container.add(this.portrait);

    // Portrait frame
    const frameSize = 100;
    this.portraitFrame = this.add.rectangle(0, -110, frameSize, frameSize);
    this.portraitFrame.setStrokeStyle(2, 0x8e44ad);
    this.portraitFrame.setFillStyle(0x000000, 0);
    this.container.add(this.portraitFrame);

    // Dialogue text
    this.dialogueText = this.add.text(0, -30, '', {
      font: '14px Courier New',
      fill: '#ecf0f1',
      align: 'center',
      wordWrap: { width: 380 }
    }).setOrigin(0.5);
    this.container.add(this.dialogueText);

    // Menu items container
    this.menuContainer = this.add.container(0, 40);
    this.container.add(this.menuContainer);

    // Player info (money)
    const money = this.registry.get('money');
    this.moneyText = this.add.text(-180, 140, `Cash: $${money}`, {
      font: '12px Courier New',
      fill: '#00b894'
    });
    this.container.add(this.moneyText);

    // Instructions
    this.instructionsText = this.add.text(0, 150, '', {
      font: '10px Courier New',
      fill: '#636e72',
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

    // Greeting
    const greetings = [
      "What do you need?",
      "Looking to score?",
      "I got the good stuff...",
      "Keep it quick.",
      "You buying or wasting my time?"
    ];
    this.dialogueText.setText(Phaser.Math.RND.pick(greetings));

    // Menu options
    this.menuItems = [];
    const options = [
      { label: '[1] BUY', desc: 'Browse my stock' },
      { label: '[2] SELL', desc: 'Got something for me?' },
      { label: '[3] LEAVE', desc: 'Later' }
    ];

    options.forEach((opt, i) => {
      const y = i * 36;
      const text = this.add.text(-100, y, `${opt.label}  -  ${opt.desc}`, {
        font: '14px Courier New',
        fill: i === 0 ? '#6c5ce7' : '#b2bec3'
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

    const stock = this.dealer.getAvailableStock();
    this.stockItems = stock;

    if (stock.length === 0) {
      this.dialogueText.setText("I'm out of stock. Come back later.");
      this.instructionsText.setText('ESC: Back');
      return;
    }

    this.dialogueText.setText("What are you buying?");
    this.renderBuyMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Quantity | ENTER: Buy | ESC: Back');
  }

  renderBuyMenu() {
    this.clearMenu();
    const money = this.registry.get('money');

    this.stockItems.forEach((item, i) => {
      const y = i * 32;
      const isSelected = i === this.selectedIndex;
      const totalCost = item.price * (isSelected ? this.quantity : 1);
      const canAfford = money >= totalCost;

      let color = '#b2bec3';
      if (isSelected) color = canAfford ? '#6c5ce7' : '#e17055';

      const prefix = isSelected ? '> ' : '  ';
      const qtyStr = isSelected ? ` x${this.quantity} = $${totalCost}` : '';

      const text = this.add.text(-180, y,
        `${prefix}${item.info.name}: $${item.price}/ea (${item.amount} avail)${qtyStr}`, {
        font: '13px Courier New',
        fill: color
      });
      this.menuContainer.add(text);
    });

    // Update money display
    this.moneyText.setText(`Cash: $${money}`);
  }

  showSellMenu() {
    this.currentMenu = 'sell';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.clearMenu();

    const inventory = this.registry.get('inventory') || {};
    this.sellItems = Object.entries(inventory)
      .filter(([drug, amount]) => amount > 0)
      .map(([drug, amount]) => ({
        drug,
        name: DRUGS[drug].name,
        amount,
        sellPrice: Math.floor(this.dealer.prices[drug] * 0.6)
      }));

    if (this.sellItems.length === 0) {
      this.dialogueText.setText("You got nothing I want.");
      this.instructionsText.setText('ESC: Back');
      return;
    }

    this.dialogueText.setText("What are you selling? I'll give you 60% of street price.");
    this.renderSellMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Quantity | ENTER: Sell | ESC: Back');
  }

  renderSellMenu() {
    this.clearMenu();

    this.sellItems.forEach((item, i) => {
      const y = i * 32;
      const isSelected = i === this.selectedIndex;
      const totalValue = item.sellPrice * (isSelected ? this.quantity : 1);

      const color = isSelected ? '#6c5ce7' : '#b2bec3';
      const prefix = isSelected ? '> ' : '  ';
      const qtyStr = isSelected ? ` x${this.quantity} = $${totalValue}` : '';

      const text = this.add.text(-180, y,
        `${prefix}${item.name}: $${item.sellPrice}/ea (you have ${item.amount})${qtyStr}`, {
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
      item.setColor(i === this.selectedIndex ? '#6c5ce7' : '#b2bec3');
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

    const result = this.dealer.buy(item.drug, this.quantity);
    if (result.success) {
      this.showMessage(`Bought ${this.quantity} ${item.info.name} for $${result.totalPrice}`, '#00b894');
      // Refresh the menu
      this.quantity = 1;
      this.showBuyMenu();
    } else {
      this.showMessage(result.reason, '#e17055');
    }
  }

  executeSell() {
    const item = this.sellItems[this.selectedIndex];
    if (!item) return;

    const result = this.dealer.sell(item.drug, this.quantity);
    if (result.success) {
      this.showMessage(`Sold ${this.quantity} ${item.name} for $${result.totalPrice}`, '#00b894');
      // Refresh the menu
      this.quantity = 1;
      this.showSellMenu();
    } else {
      this.showMessage(result.reason, '#e17055');
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

    // Update money display
    const money = this.registry.get('money');
    this.moneyText.setText(`Cash: $${money}`);
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
