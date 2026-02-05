import Phaser from 'phaser';

export class GuildMaster {
  constructor(scene, x, y) {
    this.scene = scene;
    
    // Use an alchemist sprite as a placeholder for the Guild Master (wise elder look)
    this.sprite = scene.physics.add.sprite(x, y, 'alchemist_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);
    this.sprite.setTint(0xffd700); // Gold tint for authority

    // Label above head
    this.nameLabel = scene.add.text(x, y - 24, 'Guild Master', {
      fontSize: '8px', fontFamily: 'Verdana', fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5).setDepth(10);
  }

  interact() {
    this.openCustomizationMenu();
  }

  openCustomizationMenu() {
    // Launch the customization UI
    this.scene.scene.launch('TownCustomizationScene');
    this.scene.scene.pause();
  }
}
