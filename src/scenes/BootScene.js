import Phaser from 'phaser';
import { generateSprites } from '../utils/SpriteGenerator.js';
import { createGlobalInventory } from '../systems/InventorySystem.js';
import { FIREBALL_FRAMES } from '../particles/fireball_frames.js';
import { loadGame } from '../systems/SaveSystem.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load high-resolution assets for medieval fantasy town
    // NOTE: in dev we may not have all artist assets available; generate simple placeholders
    // for commonly referenced keys to avoid bundler / loader failures.
    const placeholderKeys = [
      'cobble_v_left','cobble_v_right','cobble_h_top','cobble_h_bottom',
      'cobble_x_nw','cobble_x_ne','cobble_x_sw','cobble_x_se',
      'path','garden','alley',
      'house_hay_1','house_hay_2','house_hay_3','house_hay_4',
      'well_hay','city_gate',
      'barracks','monastery','tower','archery','castle'
    ];

    // NOTE: removed automatic placeholder texture generation for production keys
    // to avoid overriding artist-provided assets. If a placeholder is required
    // in development, add a prefixed key (e.g. `ph_*`) to avoid collisions.

    // Load production building assets from all color folders
    try {
      const colors = ['Black', 'Blue', 'Purple', 'Red', 'Yellow'];
      const buildings = ['Archery', 'Barracks', 'Castle', 'House1', 'House2', 'House3', 'Monastery', 'Tower'];

      colors.forEach(color => {
        const colorKey = color.toLowerCase();
        buildings.forEach(building => {
          const key = `building_${colorKey}_${building.toLowerCase()}`;
          this.load.image(key, `assets/buildings/${color} Buildings/${building}.png`);
        });
      });

      // Special handling for Yellow-only assets or specific overrides
      this.load.image('well_hay', 'assets/buildings/Yellow Buildings/Well_Hay_1.png');
      this.load.image('city_gate', 'assets/buildings/Yellow Buildings/CityWall_Gate_1.png');
      
      // Aliases for initial load (default to Black theme or specific choices)
      // These are kept for backward compatibility with existing code until fully refactored
      this.load.image('house_hay_1', 'assets/buildings/Black Buildings/House1.png');
      this.load.image('house_hay_2', 'assets/buildings/Black Buildings/House2.png');
      this.load.image('house_hay_3', 'assets/buildings/Black Buildings/House3.png');
      this.load.image('house_custom_1', 'assets/buildings/Yellow Buildings/House1.png');
      this.load.image('house_custom_2', 'assets/buildings/Yellow Buildings/House2.png');
      this.load.image('house_custom_3', 'assets/buildings/Yellow Buildings/House3.png');
      
      // Special building aliases (Default Theme)
      this.load.image('tavern', 'assets/buildings/Yellow Buildings/Monastery.png');
      this.load.image('blacksmith_building', 'assets/buildings/Yellow Buildings/Barracks.png');
      this.load.image('black_market_building', 'assets/buildings/Yellow Buildings/Tower.png');
      
      // Additional building tiles / atlas
      this.load.image('buildings_atlas', 'assets/buildings/Atlas/Buildings.png');
      this.load.image('city_tileset', 'assets/buildings/City Tileset/CP_V1.0.4.png');
      this.load.image('grey_brick', 'assets/buildings/grey-brick.png');
      this.load.image('grey_brick2', 'assets/buildings/grey-brick2.png');
      this.load.image('red_brick', 'assets/buildings/red-brick.png');
      this.load.image('red_brick2', 'assets/buildings/red-brick2.jpg');
      this.load.image('red_brick3', 'assets/buildings/red-brick3.png');

      // Resource Icons
      this.load.image('resource_gold', 'assets/Terrain/Resources/Gold/Gold Resource/Gold_Resource.png');
      this.load.image('resource_meat', 'assets/Terrain/Resources/Meat/Meat Resource/Meat Resource.png');
      this.load.image('resource_tool', 'assets/Terrain/Resources/Tools/Tool_01.png');
      this.load.image('resource_wood', 'assets/Terrain/Resources/Wood/Wood Resource/Wood Resource.png');
    } catch (e) {
      // If assets are missing on disk, loader will continue and `generateSprites`
      // will still provide placeholders for gameplay to continue in dev.
    }

    // Load terrain tilesets (5 color variants, 16x16 tiles, 0 margin/spacing)
    // Load as spritesheets with 16x16 tile size for frame-based access
    try {
      for (let i = 1; i <= 5; i++) {
        this.load.spritesheet(`tilemap_color${i}`, `assets/Terrain/Tileset/Tilemap_color${i}.png`, { 
          frameWidth: 16, 
          frameHeight: 16 
        });
      }
    } catch (e) {}

    // Load bush/hedge decoration tiles for garden plots
    try {
      this.load.image('bush_1', 'assets/Terrain/Decorations/Bushes/Bushe1.png');
      this.load.image('bush_2', 'assets/Terrain/Decorations/Bushes/Bushe2.png');
      this.load.image('bush_3', 'assets/Terrain/Decorations/Bushes/Bushe3.png');
      this.load.image('bush_4', 'assets/Terrain/Decorations/Bushes/Bushe4.png');
    } catch (e) {}

    // Load particle FX spritesheets
    try {
      this.load.spritesheet('fire_02', 'assets/Particle FX/Fire_02.png', { frameWidth: 64, frameHeight: 64 });
      // Explosion_01 is 1536x192 with 8 frames, so each frame is 192x192
      this.load.spritesheet('explosion_01', 'assets/Particle FX/Explosion_01.png', { frameWidth: 192, frameHeight: 192 });
    } catch (e) {}

    // If the artist provided separate numbered fireball PNGs, preload them
    try {
      if (Array.isArray(FIREBALL_FRAMES) && FIREBALL_FRAMES.length) {
        FIREBALL_FRAMES.forEach(f => {
          try { this.load.image(f.key, f.path); } catch (e) {}
        });
      }
    } catch (e) {}

    // Load UI Elements assets for premium HUD (only assets that exist on disk)
    try {
      // Custom healthbar frame (scroll-style parchment)
      this.load.image('ui_healthbar_frame', 'assets/HUD&UI/Healthbar_no_fill.png');
      // EXP bar
      this.load.image('ui_exp_bar', 'assets/HUD&UI/EXP_BAR.png');
      // Controls keys artwork (optional - place your PNG at the path to use pixel-perfect art)
      this.load.image('controls_keys', 'assets/HUD&UI/controls_keys.png');
    } catch (e) {}

    // Generate remaining procedural sprites (characters, UI, environment)
    generateSprites(this);

    // Do not attempt to load ambient audio by default in dev; many setups
    // don't include audio files and the browser logs decoding errors which
    // are noisy and not actionable. The game can enable ambient audio when
    // real files are present and the loader is configured.
    try { this.registry.set('ambient_ok', false); } catch (e) {}
  }

  create() {
    // Initialize game registry with fantasy-themed default values
    this.registry.set('gold', 500);
    this.registry.set('day', 1);
    this.registry.set('time', 0); // 0-24 hours
    this.registry.set('infamy', 0);
    this.registry.set('maxInfamy', 100);
    // Fame/reputation for positive town standing (separate from infamy)
    this.registry.set('fame', 0);
    this.registry.set('maxFame', 100);

    // Job system state
    this.registry.set('activeJobId', null);
    this.registry.set('jobState', 'idle');
    this.registry.set('lastEncounterResult', null);
    this.registry.set('merchantPriceModifier', 1.0);
    this.registry.set('completedJobs', []);

    // SINGLE PERSISTENT TOWN: define the one town the player always visits
    const mainTownId = 'haven';
    const mainTownName = 'Haven';
    this.registry.set('mainTownId', mainTownId);
    this.registry.set('mainTownName', mainTownName);
    // townRelations stores per-town fame/relations; initialize for the main town
    this.registry.set('townRelations', { [mainTownId]: 0 });
    // townInfamy stores per-town infamy levels (optional)
    this.registry.set('townInfamy', { [mainTownId]: 0 });
    // townBounties stores active bounty amounts per town
    this.registry.set('townBounties', { [mainTownId]: 0 });
    // currentTownId points to where the player currently is (starts in the town)
    this.registry.set('currentTownId', mainTownId);
    // Tavern tutorial flag (set true after first tavern visit dialogue)
    this.registry.set('tavernTutorialSeen', false);

    // Attempt to load persistent save (overrides defaults where present)
    try { loadGame(this); } catch (e) {}

    // Player stats (RPG attributes)
    this.registry.set('stats', {
      str: 10,  // Strength - physical power, lifting, melee
      dex: 12,  // Dexterity - agility, speed, ranged
      int: 10,  // Intelligence - magic, knowledge
      cha: 10,  // Charisma - persuasion, bartering
      con: 10,  // Constitution - health, resistance
      lck: 10   // Luck - crits, loot, random outcomes
    });
    // Player upkeep stats (0-100)
    this.registry.set('hunger', 100);
    this.registry.set('thirst', 100);
    // Sleep represents restfulness (100 = fully rested). Recover at night.
    this.registry.set('sleep', 100);

    // Initialize new inventory system
    const inventory = createGlobalInventory(this, { 
      maxSlots: 20, 
      initialGold: 500 
    });
    
    // Add starter items for testing
    inventory.addItem('health_potion', 3);
    inventory.addItem('bread', 5);
    inventory.addItem('water_flask', 2);
    
    // Legacy compatibility - keep empty object for old systems during migration
    this.registry.set('inventory', {});

    // Player vitality and progression
    this.registry.set('vitality', 100);
    this.registry.set('maxVitality', 100);

    // Experience / level defaults (start with 25% XP for debug)
    const initialLevel = 1;
    this.registry.set('level', initialLevel);
    const xpNext = 10 * initialLevel;
    this.registry.set('xp', Math.floor(xpNext * 0.25));
    // XP scaling multiplier for tuning (0.5 = half XP per kill)
    this.registry.set('xpScale', 0.5);

    // Player combat stats (will be loaded by Player constructor)
    this.registry.set('playerHealth', 100);
    this.registry.set('playerMaxHealth', 100);
    this.registry.set('playerStamina', 100);
    this.registry.set('playerMaxStamina', 100);
    this.registry.set('playerDashCharges', 3);
    this.registry.set('playerLastPrimaryAttack', 0);
    this.registry.set('playerLastSecondaryAttack', 0);

    // Create fire projectile animations from spritesheet
    // Burn phase: first 5 frames loop (bright fire), Fizzle phase: last 5 frames play once (dying out)
    try {
      if (this.textures.exists('fire_02')) {
        // Full travel/burn animation covers the whole provided sheet (frames 0-7)
        this.anims.create({
          key: 'fire_burn_v2',
          frames: this.anims.generateFrameNumbers('fire_02', { start: 0, end: 7 }),
          frameRate: 10,
          repeat: -1
        });
        // Short 'ball' intro: frames 0-2 played once to give a round fireball start
        this.anims.create({
          key: 'fire_ball_v2',
          frames: this.anims.generateFrameNumbers('fire_02', { start: 0, end: 2 }),
          frameRate: 6,
          repeat: 0
        });
        // Travel animation: play the early round-to-flame frames while projectile moves
        this.anims.create({
          key: 'fire_travel_v2',
          frames: this.anims.generateFrameNumbers('fire_02', { start: 0, end: 7 }),
          frameRate: 12,
          repeat: -1
        });
        this.anims.create({
          key: 'fire_fizzle_v2',
          frames: this.anims.generateFrameNumbers('fire_02', { start: 4, end: 7 }),
          frameRate: 8,
          repeat: 0
        });

        // If separate numbered fireball PNGs were loaded, create a sequence animation
        try {
          if (Array.isArray(FIREBALL_FRAMES) && FIREBALL_FRAMES.length && this.textures.exists(FIREBALL_FRAMES[0].key)) {
            const fbFrames = FIREBALL_FRAMES.map(f => ({ key: f.key }));
            this.anims.create({ key: 'fireball_seq', frames: fbFrames, frameRate: 12, repeat: -1 });
            this.anims.create({ key: 'fireball_intro', frames: fbFrames.slice(0, 3), frameRate: 10, repeat: 0 });
          }
        } catch (e) {}
      }
    } catch (e) {}

    // Create explosion animation (8 frames)
    try {
      if (this.textures.exists('explosion_01')) {
        this.anims.create({
          key: 'explosion_burst',
          frames: this.anims.generateFrameNumbers('explosion_01', { start: 0, end: 7 }),
          frameRate: 16,
          repeat: 0
        });
      }
    } catch (e) {}

    // Use the bush image as the garden texture if loaded successfully
    try {
      if (this.textures.exists('bush_1')) {
        // Remove the procedural garden texture and replace with the bush image
        if (this.textures.exists('garden')) {
          this.textures.remove('garden');
        }
        // Copy the bush texture to 'garden' key for use in town generation
        const bushTex = this.textures.get('bush_1');
        const source = bushTex.getSourceImage();
        this.textures.addImage('garden', source);
      }
    } catch (e) {
      console.warn('Failed to set garden texture from bush:', e);
    }

    // If the artist-provided custom house images are missing, generate
    // small runtime placeholders so the Town/Overworld still renders.
    try {
      const customHouseKeys = ['house_custom_1', 'house_custom_2', 'house_custom_3'];
      customHouseKeys.forEach((key, idx) => {
        if (!this.textures.exists(key)) {
          const w = 64, h = 64;
          const g = this.add.graphics({ x: 0, y: 0 });
          g.fillStyle(0x111111, 1);
          g.fillRect(0, 0, w, h);
          const baseColors = [0x9bd07f, 0xf2d18a, 0xd6a46a];
          g.fillStyle(baseColors[idx % baseColors.length], 1);
          g.fillRect(8, 24, w - 16, h - 24);
          g.fillStyle(0x5a3b2b, 1);
          g.fillRect(Math.floor(w / 2 - 6), h - 18, 12, 14);
          g.fillStyle(0x7a3b2b, 1);
          g.fillTriangle(w / 2, 8, w - 8, 24, 8, 24);
          g.generateTexture(key, w, h);
          g.destroy();
        }
      });
    } catch (e) {}

    // Generate placeholders for special buildings if images are missing
    try {
      const specialBuildings = [
        { key: 'tavern', color: 0x8B4513, label: 'T' },
        { key: 'blacksmith_building', color: 0x555555, label: 'B' },
        { key: 'black_market_building', color: 0x2a0a3a, label: '?' }
      ];
      specialBuildings.forEach(({ key, color }) => {
        if (!this.textures.exists(key)) {
          const w = 80, h = 80;
          const g = this.add.graphics({ x: 0, y: 0 });
          g.fillStyle(0x111111, 1);
          g.fillRect(0, 0, w, h);
          g.fillStyle(color, 1);
          g.fillRect(6, 20, w - 12, h - 20);
          g.fillStyle(0x5a3b2b, 1);
          g.fillRect(Math.floor(w / 2 - 8), h - 22, 16, 18);
          g.fillStyle(0x7a3b2b, 1);
          g.fillTriangle(w / 2, 4, w - 4, 20, 4, 20);
          g.generateTexture(key, w, h);
          g.destroy();
        }
      });
    } catch (e) {}

    // Ensure commonly referenced UI textures exist; generate simple
    // placeholders for any missing UI assets to prevent "failed to process"
    // errors in the browser console and to allow the UI to render in dev.
    try {
      const uiKeys = [
        'ui_bar_big_base','ui_bar_big_fill','ui_bar_small_base','ui_bar_small_fill',
        'ui_banner','ui_banner_slots','ui_ribbon_big','ui_ribbon_small',
        'ui_avatar','ui_healthbar_frame',
        'ui_btn_blue_big','ui_btn_blue_big_pressed','ui_btn_red_big','ui_btn_red_big_pressed',
        'ui_btn_blue_round','ui_btn_blue_round_pressed','ui_btn_red_round','ui_btn_red_round_pressed',
        'ui_btn_blue_square','ui_btn_red_square','ui_btn_tiny_blue','ui_btn_tiny_red'
      ];
      // Add icon keys ui_icon_01..12
      for (let i = 1; i <= 12; i++) uiKeys.push(`ui_icon_${i.toString().padStart(2,'0')}`);

      uiKeys.forEach((k) => {
        if (!this.textures.exists(k)) {
          const w = 64, h = 24;
          const g = this.add.graphics({ x: 0, y: 0 });
          g.fillStyle(0x222222, 1);
          g.fillRoundedRect(0, 0, w, h, 4);
          g.lineStyle(2, 0x666666, 1);
          g.strokeRoundedRect(0, 0, w, h, 4);
          g.fillStyle(0xffffff, 1);
          g.fillRect(6, 6, 12, 12);
          g.generateTexture(k, w, h);
          g.destroy();
        }
      });
    } catch (e) {}

    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}

// Create lightweight placeholder house textures at runtime when artist assets
// are not present on disk. This keeps the world rendering usable in dev.
// We purposely keep these placeholders simple to avoid overriding real art.

