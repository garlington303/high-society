import Phaser from 'phaser';

export class TownCustomizationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TownCustomizationScene' });
  }

  create() {
    // Semi-transparent background
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.8
    );

    // Panel
    const panel = this.add.rectangle(400, 300, 500, 400, 0x2c3e50).setStrokeStyle(4, 0xf1c40f);
    
    // Title
    this.add.text(400, 140, 'RENOVATE HAVEN', {
      fontFamily: 'Verdana', fontSize: '24px', fontStyle: 'bold', color: '#f1c40f'
    }).setOrigin(0.5);

    this.add.text(400, 180, 'Choose a new architectural style for the town:', {
      fontFamily: 'Verdana', fontSize: '14px', color: '#ecf0f1'
    }).setOrigin(0.5);

    // Options
    const themes = [
      { id: 'black', name: 'Obsidian Order', color: 0x333333 },
      { id: 'blue', name: 'Azure Alliance', color: 0x3498db },
      { id: 'purple', name: 'Royal Violet', color: 0x9b59b6 },
      { id: 'red', name: 'Crimson Guard', color: 0xe74c3c },
      { id: 'yellow', name: 'Golden Era', color: 0xf1c40f }
    ];

    let startY = 230;
    const spacing = 50;

    themes.forEach((theme, index) => {
      const y = startY + index * spacing;
      
      // Button background
      const btn = this.add.rectangle(400, y, 400, 40, 0x34495e)
        .setInteractive({ useHandCursor: true });
        
      // Hover effect
      btn.on('pointerover', () => btn.setFillStyle(0x4e6d87));
      btn.on('pointerout', () => btn.setFillStyle(0x34495e));
      
      // Select action
      btn.on('pointerdown', () => this.applyTheme(theme.id));

      // Color swatch
      this.add.rectangle(230, y, 24, 24, theme.color).setStrokeStyle(1, 0xffffff);

      // Text
      this.add.text(260, y, theme.name, {
        fontFamily: 'Verdana', fontSize: '16px', color: '#ffffff'
      }).setOrigin(0, 0.5);
    });

    // Close button
    const closeBtn = this.add.text(400, 460, '[ Cancel ]', {
      fontFamily: 'Verdana', fontSize: '14px', color: '#95a5a6'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerdown', () => {
      this.scene.resume('GameScene');
      this.scene.stop();
    });
  }

  applyTheme(themeId) {
    // Set new theme
    this.registry.set('townTheme', themeId);
    
    // Save current player state so we don't lose progress on reload
    // We can rely on SaveSystem if implemented, or just force a restart logic
    // For MVE, a scene restart is cleanest to regenerate the town.
    
    // Show feedback
    this.add.rectangle(400, 300, 800, 600, 0x000000, 1).setDepth(1000);
    this.add.text(400, 300, 'Renovating Town...', {
      fontFamily: 'Verdana', fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(1001);

    this.time.delayedCall(1000, () => {
      // Restart GameScene to trigger TownGenerator with new theme
      this.scene.stop('GameScene');
      this.scene.start('GameScene');
      this.scene.stop(); // Stop self
    });
  }
}
