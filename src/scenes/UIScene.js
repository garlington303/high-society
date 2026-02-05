import Phaser from 'phaser';
import { WARES } from '../entities/Alchemist.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { JobUI } from '../ui/JobUI.js';
import { EventUI } from '../ui/EventUI.js';
import { TownRelationshipBar } from '../ui/TownRelationshipBar.js';
import { JobBoardUI } from '../ui/JobBoardUI.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';

/**
 * UIScene - Clean, minimal HUD overlay
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    // Active scene helper
    this.getActiveGameScene = () => {
      const overworld = this.scene.get('OverworldScene');
      const game = this.scene.get('GameScene');
      return (overworld?.scene.isActive()) ? overworld : game;
    };

    // Day/Night overlay
    this.dayNightTint = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height,
      0x001133, 0
    ).setOrigin(0.5).setDepth(-5);

    // Colors
    this.colors = {
      health: 0xe53935,
      // Stamina renamed to Mana visually — use blue color
      stamina: 0x42a5f5,
      xp: 0xffd54f,
      hunger: 0x8bc34a,
      thirst: 0x42a5f5,
      rest: 0xab47bc,
      dash: 0x26c6da,
      barBg: 0x1a1a1a,
      panelBg: 0x000000
    };

    // Create HUD sections
    this.createTopLeftPanel();    // Health, Stamina, XP, Gold, Level
    this.createUpkeepPanel();     // Hunger, Thirst, Rest
    this.createDashPanel();       // Dash charges
    this.createWaresPanel();      // Inventory
    this.createTimePanel();       // Day/Time
    this.createMessageLog();      // Events

    // --- NEW SYSTEMS UI ---
    // Job UI (Top Right, slightly offset)
    this.jobUI = new JobUI(this, this.scale.width - 20, 80);
    // Town relationship bar (shows when in town/GameScene only)
    try {
      this.townRelBar = new TownRelationshipBar(this, Math.round(this.scale.width / 2), 44);
    } catch (e) { this.townRelBar = null; }
    
    // Event UI (Center Modal)
    this.eventUI = new EventUI(this);

    // Job Board UI (Center Modal)
    this.jobBoardUI = new JobBoardUI(this);

    // Inventory modal
    this.inventoryUI = new InventoryUI(this, {
      x: this.scale.width / 2,
      y: this.scale.height / 2,
      cols: 5, rows: 4,
      slotSize: 52, slotPadding: 8,
      isEmbedded: true // Start in embedded mode for menu integration
    });

    // Player Menu (Stats, Quest Log, Inventory, World Map)
    this.playerMenuUI = new PlayerMenuUI(this);
    this.playerMenuUI.inventory = this.inventoryUI;

    // Listen for system updates
    this.events.on('updateJobUI', (job, jobState) => {
        this.jobUI.updateJob(job, jobState);
    });

    // Job board open request from GameScene
    this.events.on('openJobBoard', (jobs, onAccept) => {
        if (this.jobBoardUI) {
          this.jobBoardUI.show(jobs, onAccept);
        }
    });

    this.events.on('triggerEventUI', (eventData, callback) => {
        this.eventUI.showEvent(eventData, callback);
    });

    this.events.on('eventCompleted', () => {
        const gameScene = this.getActiveGameScene();
        if (gameScene && gameScene.eventSystem) {
             gameScene.eventSystem.completeEvent();
        }
    });

    // Fame change listener
    this.registry.events.on('fameChanged', this.onFameChanged, this);

    // Refresh player menu on stat changes
    this.registry.events.on('goldChanged', () => this.playerMenuUI?.refresh());
    this.registry.events.on('xpGained', () => this.playerMenuUI?.refresh());
    this.registry.events.on('playerLeveled', () => this.playerMenuUI?.refresh());
    this.registry.events.on('jobAccepted', () => this.playerMenuUI?.refresh());
    this.registry.events.on('jobCompleted', () => this.playerMenuUI?.refresh());

    // Unified Menu Keybindings
    this.input.keyboard.on('keydown-I', () => {
        // Open menu directly to inventory tab
        if (this.playerMenuUI.visible && this.playerMenuUI.activeTab === 'inventory') {
            this.playerMenuUI.hide();
        } else {
            this.playerMenuUI.show('inventory');
        }
    });
    
    // TAB handled by PlayerMenuUI but we override here to ensure consistency if needed, 
    // though PlayerMenuUI handles its own toggling.
    // The PlayerMenuUI internal handler toggles visibility, default tab is 'status'.

    // Events
    this.setupEventListeners();

    // Update loop
    this.time.addEvent({ delay: 50, callback: this.updateUI, callbackScope: this, loop: true });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOP LEFT: Health, Stamina, XP, Gold, Level
  // ─────────────────────────────────────────────────────────────────────────────
  createTopLeftPanel() {
    const x = 10;
    const barW = 120;
    // The visual bar height used when creating scroll bars
    const barH = 18;
    // Anchor stacked HP/ST/XP bars to bottom-left with minimal padding
    const paddingLeft = 4;
    const paddingBottom = 4;
    const xPos = paddingLeft;
    // Start Y so the stacked bars (3 * barH) sit above the bottom padding
    const yStart = this.scale.height - paddingBottom - (barH * 3) - 2;
    const gap = 0; // no gap — stack seamlessly

    // Panel background removed per user preference (keep text and bars only)

    // Gold (kept at top-left)
    this.goldText = this.add.text(x, 10, '💰 500', {
      fontSize: '14px', fontFamily: 'Verdana', color: '#ffd700', fontStyle: 'bold'
    }).setDepth(10);

    // Level
    this.levelText = this.add.text(x + 80, 10, 'Lv 1', {
      fontSize: '14px', fontFamily: 'Verdana', color: '#fff', fontStyle: 'bold'
    }).setDepth(10);

    // Health / Stamina / XP bars - stacked in bottom-left
    const hpY = yStart;
    this.add.text(xPos + 2, hpY, 'HP', { fontSize: '10px', fontFamily: 'Verdana', color: '#ffffff', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' }).setDepth(15);
    this.healthBar = this.createScrollHealthBar(xPos + 25, hpY - 2, 140, barH);
    this.healthText = this.add.text(xPos + barW + 40, hpY + 2, '100', {
      fontSize: '10px', fontFamily: 'Verdana', color: '#fff'
    }).setDepth(10);

    // Stamina bar — use the scroll-style frame like HP so visuals match
    const stY = hpY + (barH + gap); // directly below HP
    this.add.text(xPos + 2, stY, 'MP', { fontSize: '10px', fontFamily: 'Verdana', color: '#ffffff', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' }).setDepth(15);
    this.staminaBar = this.createScrollHealthBar(xPos + 25, stY - 2, 140, barH);
    if (this.staminaBar?.setFillColor) this.staminaBar.setFillColor(this.colors.stamina);

    // XP bar removed from bottom-left stack — now centered with dash panel.
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPKEEP: Hunger, Thirst, Rest (small vertical bars)
  // ─────────────────────────────────────────────────────────────────────────────
  createUpkeepPanel() {
    // Reposition hunger/thirst/rest as a vertical stack on the left side of the center area
    const centerX = Math.round(this.scale.width / 2);
    const xPos = centerX - 390; // nudged 20px right
    const yStart = Math.round(this.scale.height / 2 - 60);
    // Scale upkeep bars down by 2x for a compact vertical stack
    const barW = 60; // was 120
    const barH = 5;  // was 10
    const gap = 6;

    // Hunger (top)
    this.add.text(xPos - 2, yStart, '🍖', { fontSize: '12px' }).setDepth(10);
    this.hungerBar = this.createBar(xPos + 12, yStart + 3, barW, barH, { fillColor: this.colors.hunger, bgColor: this.colors.barBg, imageKey: 'ui_bar_empty' });

    // Thirst (middle)
    const thirstY = yStart + barH + gap + 6;
    this.add.text(xPos - 2, thirstY, '💧', { fontSize: '12px' }).setDepth(10);
    this.thirstBar = this.createBar(xPos + 12, thirstY + 3, barW, barH, { fillColor: this.colors.thirst, bgColor: this.colors.barBg, imageKey: 'ui_bar_empty' });

    // Rest / Sleep (bottom)
    const restY = thirstY + barH + gap + 6;
    this.add.text(xPos - 2, restY, '😴', { fontSize: '12px' }).setDepth(10);
    this.restBar = this.createBar(xPos + 12, restY + 3, barW, barH, { fillColor: this.colors.rest, bgColor: this.colors.barBg, imageKey: 'ui_bar_empty' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DASH: 3 charge indicators (bottom center)
  // ─────────────────────────────────────────────────────────────────────────────
  createDashPanel() {
    const centerX = this.scale.width / 2;
    const y = this.scale.height - 45;

    // Active modifiers display (above dash pips)
    this.modifierContainer = this.add.container(centerX, y - 35).setDepth(12);
    this.modifierElements = [];

    // Dash pips using button sprites
    this.dashPips = [];
    this.bonusDashPips = []; // Extra pips for Blink bonus
    for (let i = 0; i < 3; i++) {
      const cx = centerX - 28 + i * 28;
      const pip = this.add.image(cx, y, 'ui_btn_blue_round').setScale(0.35).setDepth(11);
      this.dashPips.push(pip);
    }

    // Label
    this.add.text(centerX, y + 18, 'SPACE', {
      fontSize: '8px', fontFamily: 'Verdana', color: '#555'
    }).setOrigin(0.5).setDepth(10);

    // Centered XP bar below the SPACE tooltip
    try {
      const xpBarWidth = 180;
      const xpBarHeight = 14;
      const xpX = Math.round(centerX - xpBarWidth / 2);
      const xpY = y + 29; // raised 5px (closer to the SPACE label)

      // XP label to left of bar
      this.add.text(xpX - 18, xpY + 2, 'XP', {
        fontSize: '10px', fontFamily: 'Verdana', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
      }).setDepth(15);

      this.xpBar = this.createScrollHealthBar(xpX, xpY - 2, xpBarWidth, xpBarHeight);
      if (this.xpBar?.setFillColor) this.xpBar.setFillColor(this.colors.xp);

      this.xpText = this.add.text(xpX + xpBarWidth + 6, xpY + 2, '0/10', {
        fontSize: '9px', fontFamily: 'Verdana', color: '#dddddd',
        stroke: '#000000', strokeThickness: 2
      }).setDepth(15);
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WARES: Removed - obsolete
  // ─────────────────────────────────────────────────────────────────────────────
  createWaresPanel() {
    // Removed per user request - wares panel is obsolete
    this.invItems = [];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIME: Day and clock (top center)
  // ─────────────────────────────────────────────────────────────────────────────
  createTimePanel() {
    const centerX = this.scale.width / 2;
    const y = 10;

    // Panel background removed per user preference (keep text and bars only)

    // Day
    this.dayText = this.add.text(centerX, y + 5, 'Day 1', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#888'
    }).setOrigin(0.5).setDepth(10);

    // Clock
    this.clockText = this.add.text(centerX, y + 20, '00:00', {
      fontSize: '14px', fontFamily: 'Verdana', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MESSAGE LOG (bottom left)
  // ─────────────────────────────────────────────────────────────────────────────
  createMessageLog() {
    const x = 10;
    const y = this.scale.height - 90;

    // Message log background removed per user request; keep text only

    this.messages = [];
    this.messageTexts = [];
    for (let i = 0; i < 4; i++) {
      const text = this.add.text(x, y + i * 16, '', {
        fontSize: '10px', fontFamily: 'Verdana', color: '#888'
      }).setDepth(9);
      this.messageTexts.push(text);
    }
  }

  // CONTROLS HINT removed — implemented later if needed
  createControlsHint() {
    // Intentionally left blank; control hint tooltips removed per request.
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────────────────────────
  setupEventListeners() {
    const e = this.registry.events;
    e.on('infamyChanged', this.onInfamyChanged, this);
    e.on('fameChanged', this.onFameChanged, this);
    e.on('sale', this.onSale, this);
    e.on('saleFailed', this.onSaleFailed, this);
    e.on('guardAlert', () => this.addMessage('⚔ Guards spotted you!', '#ff4444'), this);
    e.on('playerCaptured', () => this.addMessage('🔒 Captured!', '#ff4444'), this);
    e.on('captured', () => this.showGameOver('CAPTURED', '#f44336'), this);
    e.on('playerDamaged', this.onPlayerDamaged, this);
    e.on('playerDied', () => this.showGameOver('YOU DIED', '#b71c1c'), this);
    e.on('xpGained', (d) => this.addMessage(`★ +${d?.amount || 0} XP`, '#ffd700'), this);
    e.on('playerLeveled', (d) => this.addMessage(`⬆ Level ${d?.level}!`, '#44ff44'), this);
    e.on('upgradeGained', this.onUpgradeGained, this);
    e.on('upgradesLost', (d) => d?.count && this.addMessage(`Lost ${d.count} upgrades`, '#ff4444'), this);
    e.on('extractionSuccess', () => this.showFloating('EXTRACTED!', '#ffd700'), this);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE LOOP
  // ─────────────────────────────────────────────────────────────────────────────
  updateUI() {
    const scene = this.getActiveGameScene();
    const player = scene?.player;

    // Gold & Level
    this.goldText.setText(`💰 ${this.registry.get('gold') || 0}`);
    this.levelText.setText(`Lv ${this.registry.get('level') || 1}`);

    // Health
    if (player) {
      const hpPct = player.health / player.maxHealth;
      if (this.healthBar?.setPercent) this.healthBar.setPercent(hpPct);
      if (this.healthBar?.setFillColor) this.healthBar.setFillColor(hpPct < 0.25 ? 0xff0000 : this.colors.health);
      this.healthText.setText(Math.floor(player.health).toString());
      
      // Ghost bar for heal-over-time visualization
      const ghostTarget = this.registry.get('ghostHealthTarget');
      if (ghostTarget && this.healthBar?.setGhostPercent) {
        const ghostPct = ghostTarget / player.maxHealth;
        this.healthBar.setGhostPercent(ghostPct);
      } else if (this.healthBar?.setGhostPercent) {
        this.healthBar.setGhostPercent(0);
      }

      // Stamina
      const stPct = player.stamina / player.maxStamina;
      if (this.staminaBar?.setPercent) this.staminaBar.setPercent(stPct);
      if (this.staminaBar?.setFillColor) this.staminaBar.setFillColor(stPct < 0.25 ? 0xff8800 : this.colors.stamina);

      // Dash - show base charges + bonus from Blink
      const baseCharges = player.getDashCharges?.() ?? 3;
      const bonusCharges = this.registry.get('progressionBuffs')?.extraDashCharges || 0;
      const totalMaxCharges = 3 + bonusCharges;
      
      // Update base pips
      this.dashPips.forEach((pip, i) => {
        if (i < baseCharges) {
          pip.setAlpha(1);
          pip.setTint(0xffffff);
        } else {
          pip.setAlpha(0.3);
          pip.setTint(0x333333);
        }
      });
      
      // Update bonus pips (create/destroy as needed)
      this.updateBonusDashPips(bonusCharges, baseCharges);
    }
    
    // Update active modifiers display
    this.updateModifierDisplay();

    // XP - use progression system values if available
    const xp = this.registry.get('xp') || 0;
    const level = this.registry.get('level') || 1;
    // XP thresholds from ProgressionSystem (0, 50, 120, 220, 350, 520, 730, 1000, 1350, 1800)
    const LEVEL_XP = [0, 50, 120, 220, 350, 520, 730, 1000, 1350, 1800];
    const prevLevelXP = level > 1 ? LEVEL_XP[level - 1] : 0;
    const nextLevelXP = level < LEVEL_XP.length ? LEVEL_XP[level] : LEVEL_XP[LEVEL_XP.length - 1] * 1.5;
    const xpProgress = (nextLevelXP > prevLevelXP) ? (xp - prevLevelXP) / (nextLevelXP - prevLevelXP) : 1;
    if (this.xpBar?.setPercent) this.xpBar.setPercent(Math.min(1, Math.max(0, xpProgress)));
    if (this.xpText) this.xpText.setText(`${xp}/${nextLevelXP}`);

    // Upkeep
    const hunger = this.registry.get('hunger') || 0;
    const thirst = this.registry.get('thirst') || 0;
    const sleep = this.registry.get('sleep') || 0;
    this.hungerBar?.setPercent(hunger / 100);
    this.thirstBar?.setPercent(thirst / 100);
    this.restBar?.setPercent(sleep / 100);

    // Critical colors
    this.hungerBar?.setFillColor(hunger <= 20 ? 0xff5722 : this.colors.hunger);
    this.thirstBar?.setFillColor(thirst <= 20 ? 0xff1744 : this.colors.thirst);
    this.restBar?.setFillColor(sleep <= 20 ? 0xffc107 : this.colors.rest);

    // Time
    const day = this.registry.get('day') || 1;
    const time = this.registry.get('time') || 0;
    this.dayText.setText(`Day ${day}`);
    this.clockText.setText(`${time.toString().padStart(2, '0')}:00`);

    // Show town relationship bar only when the active game scene is the in-town GameScene
    try {
      const active = this.scene.get('GameScene');
      const isTown = (this.getActiveGameScene()?.scene?.key === 'GameScene');
      if (this.townRelBar) {
        if (isTown) this.townRelBar.show(); else this.townRelBar.hide();
      }
    } catch (e) {}

    // Day/night
    let alpha = 0;
    if (time >= 20 || time < 6) alpha = 0.35;
    else if (time >= 18 || time < 8) alpha = 0.12;
    this.dayNightTint.setAlpha(alpha);

    // Wares
    const inv = this.registry.get('inventory') || {};
    this.invItems.forEach(item => {
      const amt = inv[item.ware] || 0;
      item.amount.setText(amt.toString());
      item.amount.setColor(amt > 0 ? '#fff' : '#555');
      item.label.setColor(amt > 0 ? '#aaa' : '#666');
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  createBar(x, y, w, h, opts = {}) {
    const imageKey = opts.imageKey;
    const depth = opts.depth || 10;
    const bgColor = opts.bgColor || this.colors.barBg;
    const fillColor = opts.fillColor || 0xffffff;
    const initialPct = (typeof opts.initialPct === 'number') ? opts.initialPct : 1;

    if (imageKey && this.textures && this.textures.exists(imageKey)) {
      // Determine depths: for ui_exp_bar we want the fill drawn above the frame so it's visible;
      // for other bars keep the fill beneath the frame so it shows through transparency.
      const frameDepth = (imageKey === 'ui_exp_bar') ? (depth + 1) : (depth + 2);
      const fillDepth = (imageKey === 'ui_exp_bar') ? (depth + 2) : (depth + 1);

      const frameImage = this.add.image(x, y, imageKey).setOrigin(0, 0).setDepth(frameDepth);
      // Scale proportionally to the target width and vertically center
      try {
        const tex = this.textures.get(imageKey);
        const src = (tex && typeof tex.getSourceImage === 'function') ? tex.getSourceImage() : null;
        const texW = src ? src.width : frameImage.width;
        const texH = src ? src.height : frameImage.height;
        if (texW && texH) {
          const scale = w / texW;
          const displayW = Math.round(w);
          const displayH = Math.round(texH * scale);
          frameImage.setDisplaySize(displayW, displayH);
          // Move image up so the visual frame vertically centers over the intended bar rectangle
          frameImage.y = y - Math.round((displayH - h) / 2);
        }
      } catch (e) {}
      const fillGraphics = this.add.graphics().setDepth(fillDepth);

      // Track current state
      let currentFill = fillColor;
      let currentPercent = Math.max(0, Math.min(1, initialPct));

      // Configure inner insets for image-backed bars (so decorative frame isn't overdrawn)
      let innerLeft = 0;
      let innerRight = 0;
      let innerTop = 0;
      let innerBottom = 0;
      try {
        // Default: keep fill within the provided rectangle
        innerLeft = 0; innerRight = 0; innerTop = 0; innerBottom = 0;
        // Special-case artist EXP frame: leave square area on left and short right inset
        if (imageKey === 'ui_exp_bar') {
          // Make the left inset roughly the bar height (square knob), and small right inset
          innerLeft = Math.round(h * 0.95);
          innerRight = Math.round(h * 0.6);
          innerTop = 1;
          innerBottom = 1;
        }
      } catch (e) {}

      const draw = () => {
        fillGraphics.clear();
        // Draw the filled portion only (no semi-transparent background box)
        const fx = x + innerLeft;
        const fy = y + innerTop;
        const fw = Math.max(0, w - innerLeft - innerRight);
        const fh = Math.max(0, h - innerTop - innerBottom);
        if (currentPercent > 0) {
          fillGraphics.fillStyle(currentFill, 1);
          fillGraphics.fillRect(fx, fy, Math.max(0, fw * currentPercent), fh);
        }
      };

      // Initial draw
      draw();

      return {
        setPercent: (p) => {
          currentPercent = Math.max(0, Math.min(1, p));
          draw();
        },
        setFillColor: (c) => {
          currentFill = c;
          draw();
        },
        destroy: () => { try { fillGraphics.destroy(); frameImage.destroy(); } catch (e) {} }
      };
    }

    // Fallback to simple rectangles if image not available
    const bg = this.add.rectangle(x, y, w, h, bgColor).setOrigin(0, 0).setDepth(depth);
    const fill = this.add.rectangle(x, y, w * initialPct, h, fillColor).setOrigin(0, 0).setDepth(depth + 1);
    return {
      setPercent: (p) => { fill.width = Math.max(0, w * p); },
      setFillColor: (c) => { fill.setFillStyle(c); },
      destroy: () => { try { bg.destroy(); fill.destroy(); } catch (e) {} }
    };
  }

  /**
   * Creates a custom scroll-style healthbar using the parchment PNG frame
   * with a dynamic red fill layer contained within the visible area.
   * Supports ghost bar for incoming heal visualization.
   * @param {number} x - X position
   * @param {number} y - Y position  
   * @param {number} w - Display width
   * @param {number} h - Display height
   */
  createScrollHealthBar(x, y, w, h) {
    const depth = 10;
    
    // Check if the healthbar frame texture exists
    if (!this.textures.exists('ui_healthbar_frame')) {
      // Fallback to simple bar if image not loaded
      return this.createBar(x, y, w, h, { 
        fillColor: this.colors.health, 
        bgColor: this.colors.barBg 
      });
    }
    
    // Get the texture dimensions for proper scaling
    const texture = this.textures.get('ui_healthbar_frame');
    const frame = texture.getSourceImage();
    const texWidth = frame.width;
    const texHeight = frame.height;
    
    // Calculate scale to fit desired dimensions
    const scaleX = w / texWidth;
    const scaleY = h / texHeight;
    
    // Create container for all healthbar elements
    const container = this.add.container(x, y).setDepth(depth);
    
    // Define the inner fill area (relative to the parchment image)
    // These values define the visible parchment area where red fill should appear
    // Adjusted for the scroll frame: inner area is roughly 15% from edges
    const innerLeftPct = 0.12;   // Left padding as % of width
    const innerRightPct = 0.12;  // Right padding as % of width
    const innerTopPct = 0.35;    // Top padding as % of height
    const innerBottomPct = 0.35; // Bottom padding as % of height
    
    const innerLeft = texWidth * innerLeftPct * scaleX;
    const innerRight = w - (texWidth * innerRightPct * scaleX);
    const innerTop = texHeight * innerTopPct * scaleY;
    const innerBottom = h - (texHeight * innerBottomPct * scaleY);
    const innerWidth = innerRight - innerLeft;
    const innerHeight = innerBottom - innerTop;
    
    // Create the red fill rectangle (positioned inside the parchment area)
    let currentFillColor = this.colors.health;
    let currentPercent = 1;
    let ghostPercent = 0; // Ghost bar for incoming heals
    
    // Ghost bar graphics (behind main fill)
    const ghostGraphics = this.add.graphics().setDepth(depth - 1);
    const fillGraphics = this.add.graphics().setDepth(depth);
    
    const drawGhost = () => {
      ghostGraphics.clear();
      if (ghostPercent > currentPercent) {
        // Draw ghost bar slightly ahead of current health
        ghostGraphics.fillStyle(0x88ff88, 0.5); // Light green, semi-transparent
        ghostGraphics.fillRoundedRect(
          x + innerLeft, 
          y + innerTop, 
          Math.max(0, innerWidth * ghostPercent), 
          innerHeight,
          2
        );
      }
    };
    
    const drawFill = () => {
      fillGraphics.clear();
      // Draw only the health/stamina/XP fill (no semi-transparent background box)
      if (currentPercent > 0) {
        fillGraphics.fillStyle(currentFillColor, 1);
        fillGraphics.fillRoundedRect(
          x + innerLeft, 
          y + innerTop, 
          Math.max(0, innerWidth * currentPercent), 
          innerHeight,
          2
        );
      }
    };
    
    drawGhost();
    drawFill();
    
    // Create the parchment frame image on top
    const frameImage = this.add.image(0, 0, 'ui_healthbar_frame')
      .setOrigin(0, 0)
      .setScale(scaleX, scaleY)
      .setDepth(depth + 2);
    
    container.add(frameImage);
    
    // Return control interface
    return {
      setPercent: (p) => {
        currentPercent = Math.max(0, Math.min(1, p));
        drawGhost();
        drawFill();
      },
      setFillColor: (c) => {
        currentFillColor = c;
        drawFill();
      },
      setGhostPercent: (p) => {
        ghostPercent = Math.max(0, Math.min(1, p));
        drawGhost();
      },
      destroy: () => {
        try {
          ghostGraphics.destroy();
          fillGraphics.destroy();
          container.destroy();
        } catch (e) {}
      }
    };
  }

  /**
   * Update bonus dash pips (from Blink ability)
   */
  updateBonusDashPips(bonusCount, currentCharges) {
    const centerX = this.scale.width / 2;
    const y = this.scale.height - 45;
    const baseOffset = 3 * 28; // After the 3 base pips
    
    // Remove excess pips
    while (this.bonusDashPips.length > bonusCount) {
      const pip = this.bonusDashPips.pop();
      pip?.destroy();
    }
    
    // Add new pips if needed
    while (this.bonusDashPips.length < bonusCount) {
      const i = this.bonusDashPips.length;
      const cx = centerX - 28 + baseOffset + i * 28;
      
      // Cyan color for bonus pips
      const pip = this.add.circle(cx, y, 8, 0x44ffff, 1).setDepth(11);
      pip.setStrokeStyle(2, 0xffffff, 0.5);
      
      // Pulsing effect to show it's temporary
      this.tweens.add({
        targets: pip,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1
      });
      
      this.bonusDashPips.push(pip);
    }
    
    // Update pip states (show if charge is available)
    const bonusChargesUsed = Math.max(0, 3 - currentCharges);
    this.bonusDashPips.forEach((pip, i) => {
      const isAvailable = currentCharges > 3 + i;
      pip.setAlpha(isAvailable ? 1 : 0.3);
    });
  }

  /**
   * Update active modifiers display above dash pips
   */
  updateModifierDisplay() {
    const modifiers = this.registry.get('activeModifiers') || [];
    
    // Clear old elements
    this.modifierElements.forEach(el => el?.destroy());
    this.modifierElements = [];
    
    if (modifiers.length === 0) return;
    
    // Create modifier indicators
    const spacing = 50;
    const startX = -((modifiers.length - 1) * spacing) / 2;
    
    modifiers.forEach((mod, i) => {
      const x = startX + i * spacing;
      
      // Background circle with color
      const bg = this.add.circle(x, 0, 12, mod.color, 0.8).setDepth(12);
      bg.setStrokeStyle(2, 0xffffff, 0.5);
      this.modifierContainer.add(bg);
      this.modifierElements.push(bg);
      
      // Timer text if timed
      if (mod.remaining !== null) {
        const seconds = Math.ceil(mod.remaining / 1000);
        const timerText = this.add.text(x, 18, `${seconds}s`, {
          fontSize: '8px', fontFamily: 'Verdana', color: '#ffffff',
          stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(12);
        this.modifierContainer.add(timerText);
        this.modifierElements.push(timerText);
      }
      
      // Stack indicator if stacked
      if (mod.stacks > 1) {
        const stackText = this.add.text(x + 8, -8, `x${mod.stacks}`, {
          fontSize: '7px', fontFamily: 'Verdana', color: '#ffff00',
          stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(13);
        this.modifierContainer.add(stackText);
        this.modifierElements.push(stackText);
      }
    });
  }

  addMessage(text, color = '#888') {
    this.messages.push({ text, color });
    if (this.messages.length > 4) this.messages.shift();
    this.messageTexts.forEach((t, i) => {
      if (this.messages[i]) {
        t.setText(this.messages[i].text);
        t.setColor(this.messages[i].color);
      } else {
        t.setText('');
      }
    });
  }

  showFloating(text, color) {
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.3, text, {
      fontSize: '24px', fontFamily: 'Verdana', color, fontStyle: 'bold',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(150).setAlpha(0);

    this.tweens.add({
      targets: t, alpha: 1, y: t.y - 30, duration: 300,
      onComplete: () => this.tweens.add({
        targets: t, alpha: 0, y: t.y - 30, duration: 600, delay: 1000,
        onComplete: () => t.destroy()
      })
    });
  }

  showGameOver(title, color) {
    const overlay = this.add.rectangle(
      this.scale.width / 2, this.scale.height / 2,
      this.scale.width, this.scale.height, 0x000000, 0
    ).setDepth(100);
    this.tweens.add({ targets: overlay, fillAlpha: 0.8, duration: 500 });

    const text = this.add.text(this.scale.width / 2, this.scale.height / 2 - 20, title, {
      fontSize: '40px', fontFamily: 'Verdana', color, fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: text, alpha: 1, y: text.y - 15, duration: 400 });

    const hint = this.add.text(this.scale.width / 2, this.scale.height / 2 + 40, 'Press SPACE to restart', {
      fontSize: '14px', fontFamily: 'Verdana', color: '#888'
    }).setOrigin(0.5).setDepth(101).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 400 });

    this.input.keyboard.once('keydown-SPACE', () => this.restartGame());
  }

  restartGame() {
    ['OverworldScene', 'MerchantDialogueScene', 'GameScene', 'UIScene'].forEach(s => {
      try { this.scene.stop(s); } catch (e) {}
    });
    this.scene.start('BootScene');
  }

  onInfamyChanged(data) {
    if (data?.change > 5) this.addMessage(`⚠ Infamy +${data.change}`, '#ff4444');
  }

  onFameChanged(data) {
    if (data?.change > 0) this.addMessage(`★ Fame +${data.change}`, '#44cc88');
    else if (data?.change < 0) this.addMessage(`▼ Fame ${data.change}`, '#8888ff');
    // forward to town bar if present
    try { if (this.townRelBar) this.townRelBar.updateFromRegistry(); } catch (e) {}
  }

  onSale(data) {
    this.addMessage(`✓ Sold ${data.quantity} ${WARES[data.ware]?.name} for ${data.price}g`, '#44ff44');
    this.tweens.add({ targets: this.goldText, scaleX: 1.2, scaleY: 1.2, duration: 100, yoyo: true });
  }

  onSaleFailed(data) {
    this.addMessage(`✗ ${data.reason}`, '#ffaa00');
  }

  onPlayerDamaged(data) {
    try {
      const scene = this.getActiveGameScene();
      scene?.cameras?.main?.shake(150, 0.01);
      scene?.cameras?.main?.flash(80, 255, 0, 0, true);
    } catch (e) {}
  }

  onUpgradeGained(data) {
    if (!data?.upgrade) return;
    const color = '#' + data.upgrade.color.toString(16).padStart(6, '0');
    this.addMessage(`+${data.upgrade.name}`, color);
  }
}
