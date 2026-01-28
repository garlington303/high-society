import Phaser from 'phaser';
import { WARES } from '../entities/Alchemist.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    // Day/Night tint overlay (behind UI elements in this scene)
    try {
      this.dayNightTint = this.add.rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width,
        this.scale.height,
        0x001133,
        0
      ).setOrigin(0.5).setDepth(-5);
    } catch (e) {}

    // UI styling - medieval fantasy theme
    this.style = {
      font: '12px Courier New',
      fontLarge: '14px Courier New',
      colorText: '#f5f0e1',
      colorMuted: '#a59d8a',
      colorGold: '#ffd700',
      colorInfamy: '#8b0000',
      colorWarning: '#cd853f',
      colorSuccess: '#228b22',
      padding: 10
    };

    // Create UI elements
    this.createGoldDisplay();
    this.createHealthDisplay();
    this.createInfamyMeter();
    this.createInventoryPanel();
    this.createTimeDisplay();
    this.createMessageLog();
    this.createControlsHint();

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

  createGoldDisplay() {
    const x = this.style.padding;
    const y = this.style.padding;
    // Left-aligned gold box
    this.goldBg = this.add.rectangle(x, y, 120, 28, 0x2a2418, 0.85).setOrigin(0, 0);
    this.add.image(x + 6, y + 14, 'icon_gold').setScale(0.8).setOrigin(0, 0.5);

    this.goldText = this.add.text(x + 36, y + 6, '500g', {
      font: this.style.fontLarge,
      fill: this.style.colorGold
    }).setOrigin(0, 0);

    // remember top layout positions for subsequent UI elements
    this._topUI_x = x;
    this._topUI_y = y;
    this._topUI_height = 28;
  }

  createHealthDisplay() {
    // Top-center health bar
    const hpWidth = 160;
    const centerX = Math.floor(this.scale.width / 2);
    const y = this.style.padding;

    const left = centerX - Math.floor(hpWidth / 2);
    this.hpBg = this.add.rectangle(left, y, hpWidth, 14, 0x2a2418, 0.85).setOrigin(0, 0);
    this.hpFill = this.add.rectangle(left + 2, y + 7, 0, 10, 0xb22222).setOrigin(0, 0.5);
    this.hpText = this.add.text(centerX, y + 2, 'VITALITY 100/100', {
      font: this.style.font,
      fill: this.style.colorText
    }).setOrigin(0.5, 0);
    this.hpTween = null;

    this._healthUI_y = y;
    this._healthUI_height = 14;
  }

  createInfamyMeter() {
    // Infamy meter below health
    const meterWidth = 160;
    const centerX = Math.floor(this.scale.width / 2);
    const y = this._healthUI_y + this._healthUI_height + 6;

    const left = centerX - Math.floor(meterWidth / 2);
    this.infamyBg = this.add.rectangle(left, y, meterWidth, 12, 0x2a2418, 0.85).setOrigin(0, 0);
    this.infamyFill = this.add.rectangle(left + 2, y + 6, 0, 8, 0x8b0000).setOrigin(0, 0.5);
    this.infamyText = this.add.text(centerX, y, 'INFAMY 0', {
      font: '10px Courier New',
      fill: this.style.colorMuted
    }).setOrigin(0.5, 0);
    this.infamyTween = null;
  }

  createInventoryPanel() {
    const x = this.scale.width - 140;
    const y = this.style.padding;

    // Background with medieval styling
    this.invBg = this.add.rectangle(x + 60, y + 55, 130, 110, 0x2a2418, 0.85);

    this.add.text(x, y, 'WARES', {
      font: this.style.font,
      fill: this.style.colorMuted
    });

    // Inventory rendered as small icon + count for each ware
    this.invItems = [];
    const wares = ['moonleaf', 'vigor', 'dragonsbreath', 'shadowbane'];
    const wareColors = {
      moonleaf: 0x90ee90,
      vigor: 0x4169e1,
      dragonsbreath: 0xff4500,
      shadowbane: 0x4b0082
    };

    wares.forEach((ware, i) => {
      const itemY = y + 22 + i * 22;

      // Icon (colored rectangle)
      const icon = this.add.rectangle(x + 8, itemY, 10, 10, wareColors[ware]);
      icon.setOrigin(0, 0.5);

      // Label (ware name)
      const label = this.add.text(x + 24, itemY, WARES[ware].name, {
        font: '10px Courier New',
        fill: this.style.colorText
      }).setOrigin(0, 0.5);

      // Count (right aligned)
      const amount = this.add.text(x + 120, itemY, '0', {
        font: this.style.font,
        fill: this.style.colorMuted
      }).setOrigin(1, 0.5);

      this.invItems.push({ ware, icon, label, amount });
    });
  }

  createTimeDisplay() {
    const x = this.scale.width - 80;
    const y = this.scale.height - 40;

    this.timeBg = this.add.rectangle(x + 30, y + 12, 70, 28, 0x2a2418, 0.85);

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

    this.messageBg = this.add.rectangle(x + 150, y + 40, 310, 80, 0x2a2418, 0.5);
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
      fill: '#5c5344'
    }).setOrigin(0.5);
  }

  setupEventListeners() {
    // Infamy events
    this.gameScene.events.on('infamyChanged', this.onInfamyChanged, this);
    this.gameScene.events.on('infamyWarning', this.onInfamyWarning, this);

    // Sales
    this.gameScene.events.on('sale', this.onSale, this);
    this.gameScene.events.on('saleFailed', this.onSaleFailed, this);

    // Guildhall (sanctuary)
    this.gameScene.events.on('guildhall', this.onGuildhall, this);

    // Guard events
    this.gameScene.events.on('guardAlert', this.onGuardAlert, this);
    this.gameScene.events.on('playerCaptured', this.onPlayerCaptured, this);
    this.gameScene.events.on('captured', this.onCaptured, this);

    // Player damage/death events
    this.gameScene.events.on('playerDamaged', this.onPlayerDamaged, this);
    this.gameScene.events.on('playerDied', this.onPlayerDied, this);
  }

  updateUI() {
    // Gold
    const gold = this.registry.get('gold');
    this.goldText.setText(`${gold}g`);

    // Infamy meter
    const infamy = this.registry.get('infamy') || 0;
    const maxInfamy = this.registry.get('maxInfamy') || 100;
    const infamyPercent = infamy / maxInfamy;
    const meterWidth = this.infamyBg.width - 4;
    const targetInfamyW = Math.floor(meterWidth * infamyPercent);
    
    if (Math.abs(this.infamyFill.width - targetInfamyW) > 1) {
      if (this.infamyTween) this.infamyTween.stop();
      this.infamyTween = this.tweens.add({
        targets: this.infamyFill,
        props: { width: { value: targetInfamyW, duration: 200, ease: 'Cubic.easeOut' } },
        onComplete: () => { this.infamyTween = null; }
      });
    }
    this.infamyText.setText(`INFAMY ${Math.floor(infamy)}`);
    
    // Color based on level
    if (infamy >= 80) {
      this.infamyFill.setFillStyle(0xff0000);
    } else if (infamy >= 60) {
      this.infamyFill.setFillStyle(0xdc143c);
    } else if (infamy >= 40) {
      this.infamyFill.setFillStyle(0xcd5c5c);
    } else {
      this.infamyFill.setFillStyle(0x8b0000);
    }

    // Day/night tint: simple thresholds for now
    try {
      const time = this.registry.get('time') || 12;
      let alpha = 0;
      if (time >= 20 || time < 6) alpha = 0.36;
      else if (time >= 18 || time < 8) alpha = 0.12;
      else alpha = 0;
      if (this.dayNightTint) this.dayNightTint.setAlpha(alpha);
    } catch (e) {}

    // Inventory (icon + count)
    const inventory = this.registry.get('inventory') || {};
    this.invItems.forEach(item => {
      const amount = inventory[item.ware] || 0;
      item.amount.setText(amount.toString());
      item.amount.setColor(amount > 0 ? '#f5f0e1' : '#5c5344');
      // Dim icon when amount is zero
      item.icon.setAlpha(amount > 0 ? 1 : 0.25);
      // Label color
      if (item.label) item.label.setColor(amount > 0 ? this.style.colorText : this.style.colorMuted);
    });

    // Time
    const day = this.registry.get('day');
    const time = this.registry.get('time');
    this.timeText.setText(`DAY ${day}`);
    this.clockText.setText(`${time.toString().padStart(2, '0')}:00`);

    // Health UI
    if (this.gameScene && this.gameScene.player) {
      const player = this.gameScene.player;
      const hp = player.health || 0;
      const maxHp = player.maxHealth || 100;
      const hpPercent = hp / maxHp;

      // Animate hp fill width
      const innerWidth = Math.max(4, this.hpBg.width - 4);
      const targetHpW = Math.floor(innerWidth * hpPercent);
      if (Math.abs(this.hpFill.width - targetHpW) > 1) {
        if (this.hpTween) this.hpTween.stop();
        this.hpTween = this.tweens.add({
          targets: this.hpFill,
          props: { width: { value: targetHpW, duration: 200, ease: 'Cubic.easeOut' } },
          onComplete: () => { this.hpTween = null; }
        });
      }

      this.hpText.setText(`VITALITY ${hp}/${maxHp}`);
    }
  }

  addMessage(text, color = '#a59d8a') {
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

  onInfamyChanged(data) {
    if (data.change > 5) {
      this.addMessage(`Infamy +${data.change} (${data.source})`, '#cd5c5c');
    }
  }

  onInfamyWarning(data) {
    this.addMessage(data.message, data.direction === 'up' ? '#8b0000' : '#228b22');
    // Pulse the infamy meter to draw attention
    try {
      if (this.infamyBg) {
        if (this.infamyTween) this.infamyTween.stop();
        this.infamyBg.setScale(1,1);
        this.infamyTween = this.tweens.add({
          targets: this.infamyBg,
          scaleX: { value: 1.06, duration: 120, ease: 'Cubic.easeOut' },
          scaleY: { value: 1.06, duration: 120, ease: 'Cubic.easeOut' },
          yoyo: true,
          repeat: 0,
          onComplete: () => { this.infamyTween = null; }
        });
      }
    } catch (e) {}
  }

  onSale(data) {
    this.addMessage(
      `Sold ${data.quantity} ${WARES[data.ware].name} for ${data.price}g`,
      '#228b22'
    );
    // Flash the inventory slot for the ware sold
    try {
      const item = this.invItems.find(i => i.ware === data.ware);
      if (item) {
        this.tweens.add({
          targets: [item.icon, item.amount],
          scaleX: { value: 1.4, duration: 120, ease: 'Cubic.easeOut' },
          scaleY: { value: 1.4, duration: 120, ease: 'Cubic.easeOut' },
          yoyo: true,
          repeat: 0
        });
      }
    } catch (e) {}
  }

  onSaleFailed(data) {
    this.addMessage(data.reason, '#cd853f');
  }

  onGuildhall(data) {
    this.addMessage(`${data.message} (-${data.reduction} infamy)`, '#4682b4');
  }

  onGuardAlert(guard) {
    this.addMessage('The guards have spotted you!', '#8b0000');
  }

  onPlayerCaptured() {
    this.addMessage('CAPTURED! You bribed your way free...', '#8b0000');
  }

  onCaptured() {
    // Game over state
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.8
    );

    const capturedText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 40,
      'CAPTURED',
      {
        font: '48px Courier New',
        fill: '#8b0000'
      }
    ).setOrigin(0.5);

    const restartText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 40,
      'Press SPACE to restart',
      {
        font: '14px Courier New',
        fill: '#f5f0e1'
      }
    ).setOrigin(0.5);

    // Restart handler
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
    });
  }

  onPlayerDamaged(data) {
    // show a temporary health bar above player's head
    const cam = this.gameScene.cameras.main;
    const screenX = Math.round(data.x - cam.scrollX);
    const screenY = Math.round(data.y - cam.scrollY) - 28;

    const width = 48;
    const bg = this.add.rectangle(screenX - width/2, screenY, width, 8, 0x2a2418, 0.8).setOrigin(0,0.5);
    const fillW = Math.max(0, Math.floor((data.health / data.maxHealth) * width));
    const fill = this.add.rectangle(screenX - width/2, screenY, fillW, 6, 0xb22222).setOrigin(0,0.5);

    // Fade out after 1.5s
    this.tweens.add({
      targets: [bg, fill],
      alpha: { value: 0, ease: 'Linear', duration: 400 },
      delay: 1500,
      onComplete: () => { bg.destroy(); fill.destroy(); }
    });
  }
    // Camera shake to emphasize impact
    try {
      if (this.gameScene && this.gameScene.cameras && this.gameScene.cameras.main) {
        this.gameScene.cameras.main.shake(200, 0.01);
      }
    } catch (e) {}

  onPlayerDied(data) {
    this.addMessage('You have fallen!', '#8b0000');
    // Fullscreen overlay
    const overlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );

    const text = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, 'YOU HAVE FALLEN', {
      font: '36px Courier New',
      fill: '#b22222'
    }).setOrigin(0.5);

    const hint = this.add.text(this.scale.width / 2, this.scale.height / 2 + 30, 'Press SPACE to restart', {
      font: '14px Courier New',
      fill: '#f5f0e1'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown-SPACE', () => {
      overlay.destroy(); text.destroy(); hint.destroy();
      this.scene.stop('GameScene');
      this.scene.stop('UIScene');
      this.scene.start('BootScene');
    });
  }
}
