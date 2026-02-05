import Phaser from 'phaser';
import { getItemsByCategory } from '../data/ItemDatabase.js';

export class ContributionDialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ContributionDialogueScene' });
  }

  init() {
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.parentScene = 'GameScene';
    
    // Get reference to system via registry or scene search
    try {
      const gameScene = this.scene.get('GameScene');
      if (gameScene) {
        this.townResourceSystem = gameScene.townResourceSystem;
      }
    } catch (e) {
      console.error('TownResourceSystem not found');
    }
  }

  create() {
    // Semi-transparent background
    this.overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x1a1510,
      0.85
    );

    this.container = this.add.container(this.scale.width / 2, this.scale.height / 2);

    // Panel
    const panelWidth = 460;
    const panelHeight = 380;
    this.panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2c3e50, 0.95);
    this.panel.setStrokeStyle(3, 0xf1c40f);
    this.container.add(this.panel);

    // Header
    const titleBg = this.add.rectangle(0, -160, panelWidth, 40, 0x34495e);
    const titleText = this.add.text(0, -160, 'TOWN HALL TREASURY', {
      font: '18px Verdana', fontStyle: 'bold', fill: '#f1c40f'
    }).setOrigin(0.5);
    this.container.add([titleBg, titleText]);

    // Town Status Panel
    this.statusText = this.add.text(0, -110, '', {
      font: '13px Courier New', fill: '#ecf0f1', align: 'center'
    }).setOrigin(0.5);
    this.container.add(this.statusText);

    // Resource Grid text
    this.resourceText = this.add.text(0, -60, '', {
      font: '12px Courier New', fill: '#bdc3c7', align: 'center',
      wordWrap: { width: 440 }
    }).setOrigin(0.5);
    this.container.add(this.resourceText);

    // Menu Container
    this.menuContainer = this.add.container(0, 20);
    this.container.add(this.menuContainer);

    // Instructions
    this.instructionsText = this.add.text(0, 160, '', {
      font: '11px Verdana', fill: '#95a5a6'
    }).setOrigin(0.5);
    this.container.add(this.instructionsText);

    this.updateStatusDisplay();
    this.setupInput();
    this.showMainMenu();

    this.cameras.main.fadeIn(150, 0, 0, 0);
  }

  updateStatusDisplay() {
    if (!this.townResourceSystem) return;
    
    const level = this.townResourceSystem.level;
    const name = this.townResourceSystem.getLevelName();
    const prosperity = this.townResourceSystem.prosperity;
    
    this.statusText.setText(`Town Status: ${name} (Level ${level})\nProsperity Score: ${prosperity}`);
    
    const r = this.townResourceSystem.resources;
    this.resourceText.setText(
      `Stockpile:\n` +
      `Gold: ${r.gold} | Wood: ${r.wood} | Stone: ${r.stone}\n` +
      `Iron: ${r.iron_ore} | Cloth: ${r.cloth} | Leather: ${r.leather}`
    );
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
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.inputTimer = this.time.addEvent({
      delay: 120,
      callback: this.handleInput,
      callbackScope: this,
      loop: true
    });
  }

  handleInput() {
    const up = this.keys.up.isDown || this.keys.w.isDown;
    const down = this.keys.down.isDown || this.keys.s.isDown;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const confirm = Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    const esc = Phaser.Input.Keyboard.JustDown(this.keys.esc);

    // Simple cooldown for nav keys
    if (up || down || left || right) {
      // Logic handled by timer frequency mostly, but direct check is okay for scrolling
    }

    if (this.currentMenu === 'main') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateMenuHighlight();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
        this.selectedIndex = Math.min(2, this.selectedIndex + 1);
        this.updateMenuHighlight();
      } else if (confirm) {
        this.confirmSelection();
      } else if (esc) {
        this.closeDialogue();
      }
    } else if (this.currentMenu === 'materials' || this.currentMenu === 'gold') {
      const items = this.menuListItems || [];
      const maxIndex = Math.max(0, items.length - 1);

      if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.quantity = 1;
        this.updateSubMenuHighlight();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
        this.selectedIndex = Math.min(maxIndex, this.selectedIndex + 1);
        this.quantity = 1;
        this.updateSubMenuHighlight();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
        this.quantity = Math.max(1, this.quantity - 1);
        this.updateSubMenuHighlight();
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
        // Limit quantity based on player inventory
        const item = items[this.selectedIndex];
        const max = item.amount || 999;
        this.quantity = Math.min(max, this.quantity + 1);
        this.updateSubMenuHighlight();
      } else if (confirm && items.length > 0) {
        this.executeContribution();
      } else if (esc) {
        this.showMainMenu();
      }
    }
  }

  showMainMenu() {
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.menuContainer.removeAll(true);
    this.menuTextItems = [];

    const options = [
      { text: '[ Donate Materials ]', desc: 'Contribute Wood, Stone, etc.' },
      { text: '[ Donate Gold ]', desc: 'Contribute Coin to the treasury' },
      { text: '[ Leave ]', desc: 'Return to town' }
    ];

    options.forEach((opt, i) => {
      const t = this.add.text(0, i * 40, `${opt.text}\n${opt.desc}`, {
        font: '14px Verdana', fill: i === 0 ? '#f1c40f' : '#bdc3c7', align: 'center'
      }).setOrigin(0.5);
      this.menuContainer.add(t);
      this.menuTextItems.push(t);
    });

    this.instructionsText.setText('UP/DOWN: Select | ENTER: Confirm');
  }

  showMaterialsMenu() {
    this.currentMenu = 'materials';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.menuContainer.removeAll(true);
    
    // Get inventory
    const inventory = this.registry.get('inventory') || {};
    // Filter for material category items
    const mats = ['wood', 'stone', 'iron_ore', 'leather', 'cloth'];
    
    this.menuListItems = mats.filter(id => inventory[id] > 0).map(id => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' '),
      amount: inventory[id]
    }));

    if (this.menuListItems.length === 0) {
      const msg = this.add.text(0, 0, 'You have no building materials.', { font: '14px Verdana', fill: '#e74c3c' }).setOrigin(0.5);
      this.menuContainer.add(msg);
      this.instructionsText.setText('ESC: Back');
      return;
    }

    this.renderSubMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Amount | ENTER: Donate');
  }

  showGoldMenu() {
    this.currentMenu = 'gold';
    this.selectedIndex = 0;
    this.quantity = 1;
    this.menuContainer.removeAll(true);

    const playerGold = this.registry.get('gold') || 0;
    // Options
    this.menuListItems = [
      { id: 'gold', name: 'Gold Coins', amount: playerGold }
    ];

    // For gold, quantity selector acts as multiplier of 10 or 100? 
    // Let's just treat amount as 1 = 10g for convenience? No, let's keep 1=1 but step by 10 with L/R
    
    this.renderSubMenu();
    this.instructionsText.setText('UP/DOWN: Select | LEFT/RIGHT: Amount (+10) | ENTER: Donate');
  }

  renderSubMenu() {
    this.menuContainer.removeAll(true);
    this.menuTextItems = [];

    this.menuListItems.forEach((item, i) => {
      const isSel = i === this.selectedIndex;
      const color = isSel ? '#f1c40f' : '#bdc3c7';
      const prefix = isSel ? '> ' : '  ';
      
      // Special logic for Gold quantity steps
      let qty = this.quantity;
      if (this.currentMenu === 'gold') {
        // Override standard quantity logic for gold to step by 10s
        // Actually handleInput logic is generic +1/-1. 
        // We can override display or logic. 
        // Let's simplify: 1 unit = 10 gold for donation menu
        qty = this.quantity * 10;
      }

      const txt = this.add.text(-140, i * 30, 
        `${prefix}${item.name} (Have: ${item.amount}) x${qty}`, {
        font: '14px Courier New', fill: color
      });
      this.menuContainer.add(txt);
      this.menuTextItems.push(txt);
    });
  }

  updateMenuHighlight() {
    this.menuTextItems.forEach((t, i) => {
      t.setColor(i === this.selectedIndex ? '#f1c40f' : '#bdc3c7');
    });
  }

  updateSubMenuHighlight() {
    this.renderSubMenu();
  }

  confirmSelection() {
    if (this.selectedIndex === 0) this.showMaterialsMenu();
    else if (this.selectedIndex === 1) this.showGoldMenu();
    else this.closeDialogue();
  }

  executeContribution() {
    const item = this.menuListItems[this.selectedIndex];
    if (!item) return;

    let qty = this.quantity;
    if (this.currentMenu === 'gold') qty *= 10;

    if (qty > item.amount) qty = item.amount; // Safety clamp

    if (!this.townResourceSystem) return;

    let result;
    if (this.currentMenu === 'gold') {
      // Remove from player registry
      const curGold = this.registry.get('gold');
      if (curGold < qty) return;
      this.registry.set('gold', curGold - qty);
      // Contribute
      result = this.townResourceSystem.contributeGold(qty);
    } else {
      // Remove from inventory
      const inv = this.registry.get('inventory');
      if (inv[item.id] < qty) return;
      inv[item.id] -= qty;
      this.registry.set('inventory', inv); // Trigger update
      // Contribute
      result = this.townResourceSystem.contributeItem(item.id, qty);
    }

    if (result && result.success) {
      this.showMessage(`Donated! +${result.fameGained} Fame`, '#2ecc71');
      // Refresh
      this.quantity = 1;
      if (this.currentMenu === 'gold') this.showGoldMenu();
      else this.showMaterialsMenu();
      this.updateStatusDisplay();
    }
  }

  showMessage(text, color) {
    const msg = this.add.text(0, 100, text, {
      font: '16px Verdana', fontStyle: 'bold', fill: color, stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.container.add(msg);
    this.tweens.add({
      targets: msg, y: msg.y - 40, alpha: 0, duration: 1500,
      onComplete: () => msg.destroy()
    });
  }

  closeDialogue() {
    if (this.inputTimer) this.inputTimer.destroy();
    this.cameras.main.fadeOut(150);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.resume(this.parentScene);
      this.scene.stop();
    });
  }
}
