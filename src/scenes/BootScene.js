import Phaser from 'phaser';
import { generateSprites } from '../utils/SpriteGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Generate all placeholder sprites programmatically
    generateSprites(this);
  }

  create() {
    // Initialize game registry with default values
    this.registry.set('money', 500);
    this.registry.set('heat', 0);
    this.registry.set('maxHeat', 100);
    this.registry.set('inventory', {});
    this.registry.set('day', 1);
    this.registry.set('time', 0); // 0-24 hours

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
