import Phaser from 'phaser';
import { generateSprites } from '../utils/SpriteGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load high-resolution assets for medieval fantasy town
    // Cobblestone roads
    this.load.image('cobble_v_left', 'assets/buildings/roads/cobble_v_left.png');
    this.load.image('cobble_v_right', 'assets/buildings/roads/cobble_v_right.png');
    this.load.image('cobble_h_top', 'assets/buildings/roads/cobble_h_top.png');
    this.load.image('cobble_h_bottom', 'assets/buildings/roads/cobble_h_bottom.png');
    
    // Cobblestone intersections
    this.load.image('cobble_x_nw', 'assets/buildings/roads/cobble_x_nw.png');
    this.load.image('cobble_x_ne', 'assets/buildings/roads/cobble_x_ne.png');
    this.load.image('cobble_x_sw', 'assets/buildings/roads/cobble_x_sw.png');
    this.load.image('cobble_x_se', 'assets/buildings/roads/cobble_x_se.png');
    
    // Paths and terrain
    this.load.image('path', 'assets/buildings/roads/path.png');
    this.load.image('garden', 'assets/buildings/terrain/garden.png');
    this.load.image('alley', 'assets/buildings/roads/alley.png');
    
    // Medieval village buildings (actual sprites)
    this.load.image('house_hay_1', 'assets/buildings/House_Hay_1.png');
    this.load.image('house_hay_2', 'assets/buildings/House_Hay_2.png');
    this.load.image('house_hay_3', 'assets/buildings/House_Hay_3.png');
    this.load.image('house_hay_4', 'assets/buildings/House_Hay_4_Purple.png');
    
    // Well
    this.load.image('well_hay', 'assets/buildings/Well_Hay_1.png');
    
    // City gate
    this.load.image('city_gate', 'assets/buildings/CityWall_Gate_1.png');

    // Generate remaining placeholder sprites
    generateSprites(this);

    // Optional ambient audio (non-fatal if file missing)
    // Provide both ogg and mp3 fallbacks; if files are absent Phaser will skip playback later
    try {
      this.load.audio('ambient_loop', ['assets/audio/ambient_loop.ogg', 'assets/audio/ambient_loop.mp3']);
    } catch (e) {}
  }

  create() {
    // Initialize game registry with fantasy-themed default values
    this.registry.set('gold', 500);
    this.registry.set('inventory', {});
    this.registry.set('day', 1);
    this.registry.set('time', 0); // 0-24 hours
    this.registry.set('infamy', 0);
    this.registry.set('maxInfamy', 100);

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
