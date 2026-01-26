import Phaser from 'phaser';
import { DRUGS } from '../entities/Dealer.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    // UI styling
    this.style = {
      font: '12px Courier New',
      fontLarge: '14px Courier New',
      colorText: '#ffffff',
      colorMuted: '#b2bec3',
      colorMoney: '#00b894',
      colorHeat: '#d63031',
      colorWarning: '#fdcb6e',
      padding: 10
    };

    // Create UI elements
    this.createMoneyDisplay();
    this.createHeatMeter();
    this.createInventoryPanel();
    this.createTimeDisplay();
    this.createMessageLog();
    this.createControlsHint();

    // Dealer menu (hidden by default)
    this.dealerMenu = this.createDealerMenu();
    this.dealerMenu.setVisible(false);

    // Listen for events
    this.setupEventListeners();

    // Update loop
    this.time.addEvent({
      delay: 100,
      callback: this.updateUI,
      callbackScope: this,
      loop: true
    });
  }

  createMoneyDisplay() {
    const x = this.style.padding;
    const y = this.style.padding;

    this.moneyBg = this.add.rectangle(x + 50, y + 12, 120, 28, 0x000000, 0.7);
    this.moneyBg.setOrigin(0.5);

    this.add.image(x + 10, y + 12, 'icon_money').setScale(0.8);

    this.moneyText = this.add.text(x + 25, y + 5, '$500', {
      font: this.style.fontLarge,
      fill: this.style.colorMoney
    });
  }

  createHeatMeter() {
    const x = this.style.padding;
    const y = 50;

    this.add.text(x, y, 'HEAT', {
      font: this.style.font,
      fill: this.style.colorMuted
    });

    // Heat bar background
    this.heatBarBg = this.add.rectangle(x + 50, y + 6, 100, 12, 0x2d3436);
    this.heatBarBg.setOrigin(0, 0.5);

    // Heat bar fill
    this.heatBarFill = this.add.rectangle(x + 51, y + 6, 0, 10, 0xd63031);
    this.heatBarFill.setOrigin(0, 0.5);

    // Heat level text
    this.heatLevelText = this.add.text(x + 155, y, 'SAFE', {
      font: this.style.font,
      fill: this.style.colorMuted
    });
  }

  createInventoryPanel() {
    const x = this.scale.width - 130;
    const y = this.style.padding;

    // Background
    this.invBg = this.add.rectangle(x + 55, y + 50, 120, 100, 0x000000, 0.7);

    this.add.text(x, y, 'INVENTORY', {
      font: this.style.font,
      fill: this.style.colorMuted
    });

    this.invItems = [];
    const drugs = ['weed', 'pills', 'coke', 'meth'];
    drugs.forEach((drug, i) => {
      const itemY = y + 20 + i * 18;
      const label = this.add.text(x + 5, itemY, DRUGS[drug].name, {
        font: this.style.font,
        fill: this.style.colorText
      });
      const amount = this.add.text(x + 80, itemY, '0', {
        font: this.style.font,
        fill: this.style.colorMuted
      });
      this.invItems.push({ drug, label, amount });
    });
  }

  createTimeDisplay() {
    const x = this.scale.width - 80;
    const y = this.scale.height - 40;

    this.timeBg = this.add.rectangle(x + 30, y + 12, 70, 28, 0x000000, 0.7);

    this.timeText = this.add.text(x, y, 'DAY 1', {
      font: this.style.font,
      fill: this.style.colorMuted
    });

    this.clockText = this.add.text(x, y + 14, '00:00', {
      font: this.style.font,
      fill: this.style.colorText
    });
  }

  createMessageLog() {
    const x = this.style.padding;
    const y = this.scale.height - 100;

    this.messageBg = this.add.rectangle(x + 150, y + 40, 310, 80, 0x000000, 0.5);
    this.messageBg.setOrigin(0.5);

    this.messages = [];
    this.messageTexts = [];

    for (let i = 0; i < 4; i++) {
      const text = this.add.text(x, y + i * 18, '', {
        font: this.style.font,
        fill: this.style.colorMuted
      });
      this.messageTexts.push(text);
    }
  }

  createControlsHint() {
    const x = this.scale.width / 2;
    const y = this.scale.height - 20;

    this.add.text(x, y, 'WASD: Move | SHIFT: Sprint | E: Interact', {
      font: '10px Courier New',
      fill: '#636e72'
    }).setOrigin(0.5);
  }

  createDealerMenu() {
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Background
    const bg = this.add.rectangle(0, 0, 300, 250, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x6c5ce7);
    container.add(bg);

    // Title
    const title = this.add.text(0, -100, 'DEALER', {
      font: '16px Courier New',
      fill: '#6c5ce7'
    }).setOrigin(0.5);
    container.add(title);

    // Stock items
    this.dealerStockTexts = [];
    for (let i = 0; i < 4; i++) {
      const itemText = this.add.text(-130, -60 + i * 40, '', {
        font: this.style.font,
        fill: this.style.colorText
      });
      container.add(itemText);
      this.dealerStockTexts.push(itemText);
    }

    // Close hint
    const closeHint = this.add.text(0, 100, 'Press E or ESC to close', {
      font: '10px Courier New',
      fill: '#636e72'
    }).setOrigin(0.5);
    container.add(closeHint);

    // Keys for buying
    this.buyKeys = this.input.keyboard.addKeys({
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      e: Phaser.Input.Keyboard.KeyCodes.E
    });

    return container;
  }

  setupEventListeners() {
    // Heat changes
    this.gameScene.events.on('heatChanged', this.onHeatChanged, this);
    this.gameScene.events.on('heatWarning', this.onHeatWarning, this);

    // Dealer menu
    this.gameScene.events.on('openDealer', this.openDealerMenu, this);

    // Sales
    this.gameScene.events.on('sale', this.onSale, this);
    this.gameScene.events.on('saleFailed', this.onSaleFailed, this);

    // Safe house
    this.gameScene.events.on('safehouse', this.onSafehouse, this);

    // Police events
    this.gameScene.events.on('policeAlert', this.onPoliceAlert, this);
    this.gameScene.events.on('playerCaught', this.onPlayerCaught, this);
    this.gameScene.events.on('busted', this.onBusted, this);
  }

  updateUI() {
    // Money
    const money = this.registry.get('money');
    this.moneyText.setText(`$${money}`);

    // Heat
    const heat = this.registry.get('heat');
    const maxHeat = this.registry.get('maxHeat');
    const heatPercent = heat / maxHeat;

    this.heatBarFill.width = Math.floor(98 * heatPercent);

    // Heat color gradient
    if (heatPercent < 0.4) {
      this.heatBarFill.setFillStyle(0x00b894);
      this.heatLevelText.setText('SAFE');
      this.heatLevelText.setColor('#00b894');
    } else if (heatPercent < 0.6) {
      this.heatBarFill.setFillStyle(0xfdcb6e);
      this.heatLevelText.setText('WANTED');
      this.heatLevelText.setColor('#fdcb6e');
    } else if (heatPercent < 0.8) {
      this.heatBarFill.setFillStyle(0xe17055);
      this.heatLevelText.setText('HOT');
      this.heatLevelText.setColor('#e17055');
    } else {
      this.heatBarFill.setFillStyle(0xd63031);
      this.heatLevelText.setText('HUNTED');
      this.heatLevelText.setColor('#d63031');
    }

    // Inventory
    const inventory = this.registry.get('inventory');
    this.invItems.forEach(item => {
      const amount = inventory[item.drug] || 0;
      item.amount.setText(amount.toString());
      item.amount.setColor(amount > 0 ? '#ffffff' : '#636e72');
    });

    // Time
    const day = this.registry.get('day');
    const time = this.registry.get('time');
    this.timeText.setText(`DAY ${day}`);
    this.clockText.setText(`${time.toString().padStart(2, '0')}:00`);
  }

  addMessage(text, color = '#b2bec3') {
    this.messages.push({ text, color, time: Date.now() });

    // Keep only last 4
    if (this.messages.length > 4) {
      this.messages.shift();
    }

    // Update display
    this.messageTexts.forEach((t, i) => {
      if (this.messages[i]) {
        t.setText(this.messages[i].text);
        t.setColor(this.messages[i].color);
      } else {
        t.setText('');
      }
    });
  }

  onHeatChanged(data) {
    if (data.change > 5) {
      this.addMessage(`Heat +${data.change} (${data.source})`, '#e17055');
    }
  }

  onHeatWarning(data) {
    this.addMessage(data.message, data.direction === 'up' ? '#d63031' : '#00b894');
  }

  openDealerMenu(dealer) {
    this.currentDealer = dealer;
    this.dealerMenu.setVisible(true);

    // Update stock display
    const stock = dealer.getAvailableStock();
    this.dealerStockTexts.forEach((text, i) => {
      if (stock[i]) {
        const s = stock[i];
        text.setText(`[${i + 1}] ${s.info.name}: $${s.price} (x${s.amount})`);
        text.setData('drug', s.drug);
      } else {
        text.setText('');
        text.setData('drug', null);
      }
    });

    // Handle input
    this.dealerInputHandler = this.time.addEvent({
      delay: 100,
      callback: this.handleDealerInput,
      callbackScope: this,
      loop: true
    });
  }

  handleDealerInput() {
    if (!this.dealerMenu.visible) return;

    // Close menu
    if (Phaser.Input.Keyboard.JustDown(this.buyKeys.esc) ||
        Phaser.Input.Keyboard.JustDown(this.buyKeys.e)) {
      this.closeDealerMenu();
      return;
    }

    // Buy items
    const keys = [this.buyKeys.one, this.buyKeys.two, this.buyKeys.three, this.buyKeys.four];
    keys.forEach((key, i) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const drug = this.dealerStockTexts[i]?.getData('drug');
        if (drug && this.currentDealer) {
          const result = this.currentDealer.buy(drug, 1);
          if (result.success) {
            this.addMessage(`Bought 1 ${DRUGS[drug].name} for $${result.totalPrice}`, '#00b894');
            // Refresh menu
            this.openDealerMenu(this.currentDealer);
          } else {
            this.addMessage(result.reason, '#e17055');
          }
        }
      }
    });
  }

  closeDealerMenu() {
    this.dealerMenu.setVisible(false);
    this.currentDealer = null;
    if (this.dealerInputHandler) {
      this.dealerInputHandler.destroy();
    }
  }

  onSale(data) {
    this.addMessage(
      `Sold ${data.quantity} ${DRUGS[data.drug].name} for $${data.price}`,
      '#00b894'
    );
  }

  onSaleFailed(data) {
    this.addMessage(data.reason, '#e17055');
  }

  onSafehouse(data) {
    this.addMessage(data.message, '#00cec9');
  }

  onPoliceAlert(police) {
    this.addMessage('Police spotted you!', '#d63031');
  }

  onPlayerCaught() {
    this.addMessage('CAUGHT! You got away but paid the price.', '#d63031');
  }

  onBusted() {
    // Game over state
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.8
    );

    const bustedText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 40,
      'BUSTED',
      {
        font: '48px Courier New',
        fill: '#d63031'
      }
    ).setOrigin(0.5);

    const restartText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 40,
      'Press SPACE to restart',
      {
        font: '14px Courier New',
        fill: '#ffffff'
      }
    ).setOrigin(0.5);

    // Restart handler
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
    });
  }
}
