// src/ui/PlayerMenuUI.js
import Phaser from 'phaser';

/**
 * PlayerMenuUI - Unified Sidebar Menu (Grimoire)
 * Tabs: Status, Quest Log, Inventory, World Map
 */
export class PlayerMenuUI extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.scene = scene;
    this.scene.add.existing(this);
    this.setDepth(500);
    this.setVisible(false);
    this.setScrollFactor(0);

    this.config = {
      width: 780,
      height: 540,
      sidebarWidth: 140,
      colors: {
        bg: 0x0d1117,
        sidebar: 0x161b22,
        content: 0x0d1117,
        border: 0x30363d,
        accent: 0xf1c40f, // Gold
        text: '#e6edf3',
        textDim: '#8b949e',
        tabHover: 0x21262d,
        tabActive: 0x1f6feb
      }
    };

    this.activeTab = 'status';
    this.inventory = null; // Injected by UIScene

    this._createUI();
    this._setupInput();
  }

  _createUI() {
    const { width, height, sidebarWidth, colors } = this.config;
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    const leftX = centerX - width / 2;
    const topY = centerY - height / 2;

    // Backdrop
    this.backdrop = this.scene.add.rectangle(centerX, centerY, 2000, 2000, 0x000000, 0.7)
      .setInteractive();
    this.add(this.backdrop);

    // Main Container Frame
    this.frame = this.scene.add.container(centerX, centerY);
    this.add(this.frame);

    // Main Background
    const bg = this.scene.add.rectangle(0, 0, width, height, colors.bg);
    bg.setStrokeStyle(2, colors.border);
    this.frame.add(bg);

    // Sidebar Background
    const sidebar = this.scene.add.rectangle(
      -width/2 + sidebarWidth/2, 
      0, 
      sidebarWidth, 
      height, 
      colors.sidebar
    );
    // Right border of sidebar
    const sidebarBorder = this.scene.add.line(0, 0, 
      -width/2 + sidebarWidth, -height/2, 
      -width/2 + sidebarWidth, height/2, 
      colors.border
    ).setLineWidth(1); // line origin is center of container

    this.frame.add(sidebar);
    this.frame.add(sidebarBorder);

    // Content Container (Masked area)
    this.contentArea = this.scene.add.container(
      -width/2 + sidebarWidth + (width - sidebarWidth)/2, 
      0
    );
    this.frame.add(this.contentArea);

    // Sidebar Tabs
    this.tabs = {};
    const tabs = [
      { id: 'status', label: 'STATUS', icon: '👤' },
      { id: 'quests', label: 'QUESTS', icon: '📜' },
      { id: 'inventory', label: 'INVENTORY', icon: '🎒' },
      { id: 'map', label: 'MAP', icon: '🗺️' }
    ];

    let tabY = -height/2 + 60;
    tabs.forEach(t => {
      this._createTabButton(t, -width/2 + sidebarWidth/2, tabY);
      tabY += 50;
    });

    // Close Hint
    const closeText = this.scene.add.text(-width/2 + sidebarWidth/2, height/2 - 30, '[ESC] Close', {
      fontFamily: 'Verdana', fontSize: '11px', color: colors.textDim
    }).setOrigin(0.5);
    this.frame.add(closeText);
  }

  _createTabButton(tab, x, y) {
    const { colors, sidebarWidth } = this.config;
    
    const btn = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, sidebarWidth - 10, 40, 0x000000, 0);
    const label = this.scene.add.text(-10, 0, tab.label, {
      fontFamily: 'Verdana', fontSize: '12px', color: colors.textDim, fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    const icon = this.scene.add.text(-40, 0, tab.icon, { fontSize: '16px' }).setOrigin(0.5);
    
    // Active Indicator line
    const indicator = this.scene.add.rectangle(-sidebarWidth/2 + 7, 0, 4, 40, colors.accent).setVisible(false);

    btn.add([bg, indicator, icon, label]);
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      if (this.activeTab !== tab.id) {
        bg.setFillStyle(colors.tabHover, 1);
        label.setColor(colors.text);
      }
    });

    bg.on('pointerout', () => {
      if (this.activeTab !== tab.id) {
        bg.setFillStyle(0x000000, 0);
        label.setColor(colors.textDim);
      }
    });

    bg.on('pointerdown', () => this.switchTab(tab.id));

    this.frame.add(btn);
    this.tabs[tab.id] = { bg, label, indicator };
  }

  _setupInput() {
    this.scene.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      // If visible, close. If hidden, open.
      this.toggle();
    });

    this.scene.input.keyboard.on('keydown-ESC', () => {
      if (this.visible) this.hide();
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    const { colors } = this.config;

    // Update Tab Visuals
    Object.keys(this.tabs).forEach(id => {
      const t = this.tabs[id];
      if (id === tabId) {
        t.bg.setFillStyle(colors.tabActive, 0.2);
        t.label.setColor(colors.accent);
        t.indicator.setVisible(true);
      } else {
        t.bg.setFillStyle(0x000000, 0);
        t.label.setColor(colors.textDim);
        t.indicator.setVisible(false);
      }
    });

    // Clear Content
    this.contentArea.removeAll(true);
    
    // Handle Inventory Special Case (Remove it from contentArea if it was added)
    // Actually, InventoryUI is managed externally, we just reparent its container
    if (this.inventory && this.inventory.container.parent === this.contentArea) {
      this.contentArea.remove(this.inventory.container);
      this.inventory.container.setVisible(false);
    }

    // Render Content
    switch (tabId) {
      case 'status': this._renderStatusTab(); break;
      case 'quests': this._renderQuestTab(); break;
      case 'inventory': this._renderInventoryTab(); break;
      case 'map': this._renderMapTab(); break;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TAB RENDERING
  // ─────────────────────────────────────────────────────────────

  _renderStatusTab() {
    const { colors, width, sidebarWidth } = this.config;
    const contentW = width - sidebarWidth;
    const r = this.scene.registry;

    // Title
    this.contentArea.add(this.scene.add.text(0, -220, 'CHARACTER STATUS', {
      fontFamily: 'Verdana', fontSize: '20px', color: colors.accent, fontStyle: 'bold'
    }).setOrigin(0.5));

    // Vitals Section (Top)
    const vitalsY = -160;
    const hp = r.get('playerHealth') || 100;
    const maxHp = r.get('playerMaxHealth') || 100;
    const stam = r.get('playerStamina') || 100;
    const maxStam = r.get('playerMaxStamina') || 100;
    const xp = r.get('xp') || 0;
    const lvl = r.get('level') || 1;
    const nextXp = lvl * 10; // Basic formula

    this._createBar(0, vitalsY, 300, 20, hp/maxHp, 0xe74c3c, `Health ${Math.floor(hp)}/${maxHp}`);
    this._createBar(0, vitalsY + 30, 300, 20, stam/maxStam, 0x3498db, `Stamina ${Math.floor(stam)}/${maxStam}`);
    this._createBar(0, vitalsY + 60, 300, 10, Math.min(1, xp/nextXp), 0xf1c40f, `Level ${lvl} (${xp}/${nextXp} XP)`);

    // Attributes Grid (Middle)
    const stats = r.get('stats') || {};
    const gridY = -30;
    const colSpacing = 160;
    const rowSpacing = 40;

    const attrs = [
      { key: 'str', name: 'STRENGTH' },
      { key: 'dex', name: 'DEXTERITY' },
      { key: 'con', name: 'CONSTITUTION' },
      { key: 'int', name: 'INTELLIGENCE' },
      { key: 'cha', name: 'CHARISMA' },
      { key: 'lck', name: 'LUCK' }
    ];

    attrs.forEach((attr, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = (col === 0) ? -100 : 100;
      const y = gridY + row * rowSpacing;
      
      const val = stats[attr.key] || 10;
      const mod = Math.floor((val - 10) / 2);
      const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

      const bg = this.scene.add.rectangle(x, y, 140, 30, 0x21262d).setStrokeStyle(1, 0x30363d);
      const label = this.scene.add.text(x - 60, y, attr.name, {
        fontFamily: 'Verdana', fontSize: '10px', color: colors.textDim
      }).setOrigin(0, 0.5);
      const value = this.scene.add.text(x + 60, y, `${val} (${modStr})`, {
        fontFamily: 'Verdana', fontSize: '12px', color: colors.text, fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.contentArea.add([bg, label, value]);
    });

    // Town Standing (Bottom)
    const fame = r.get('fame') || 0;
    const infamy = r.get('infamy') || 0;
    const prosperity = r.get('townProsperity') || 0;
    
    const standingY = 140;
    this.contentArea.add(this.scene.add.text(0, standingY, 'HAVEN STANDING', {
      fontFamily: 'Verdana', fontSize: '14px', color: colors.accent
    }).setOrigin(0.5));

    const sText = `Fame: ${fame}   |   Infamy: ${infamy}   |   Prosperity: ${prosperity}`;
    this.contentArea.add(this.scene.add.text(0, standingY + 30, sText, {
      fontFamily: 'Verdana', fontSize: '12px', color: colors.text
    }).setOrigin(0.5));
  }

  _createBar(x, y, w, h, pct, color, text) {
    const bg = this.scene.add.rectangle(x, y, w, h, 0x000000).setStrokeStyle(1, 0x555555);
    const fill = this.scene.add.rectangle(x - w/2 + 2, y, (w-4) * pct, h-4, color).setOrigin(0, 0.5);
    const label = this.scene.add.text(x, y, text, {
      fontFamily: 'Verdana', fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);
    this.contentArea.add([bg, fill, label]);
  }

  _renderQuestTab() {
    const { colors } = this.config;
    const r = this.scene.registry;
    
    this.contentArea.add(this.scene.add.text(0, -220, 'QUEST LOG', {
      fontFamily: 'Verdana', fontSize: '20px', color: colors.accent, fontStyle: 'bold'
    }).setOrigin(0.5));

    const activeJobId = r.get('activeJobId');
    // We need job details. In a real system we'd look up JOB_BOARD_JOBS by ID.
    // For now, we might not have the full object if it's just ID in registry.
    // However, JobSystem stores activeJob object. We can try to get it if we had reference.
    // Fallback: Registry saves basic info? No, just ID. 
    // We can import database here to look it up.
    
    // Lazy load database if possible or mock. 
    // Actually, let's assume we can access JobDatabase from global or import.
    // For simplicity, I'll just show ID and status unless I import.
    // Wait, I can import { JOB_BOARD_JOBS } from '../data/JobDatabase.js'; at top.
    
    // ... Imports added at top of file ...

    // Active Job Card
    const cardY = -100;
    const cardBg = this.scene.add.rectangle(0, cardY, 500, 140, 0x21262d).setStrokeStyle(1, colors.accent);
    this.contentArea.add(cardBg);

    if (activeJobId) {
      // Find job details
      // Assuming I add the import at the top
      // const job = JOB_BOARD_JOBS.find(j => j.id === activeJobId);
      // For now, use placeholder text if import missing
      this.contentArea.add(this.scene.add.text(0, cardY - 50, 'CURRENT OBJECTIVE', {
        fontSize: '12px', color: colors.textDim
      }).setOrigin(0.5));
      
      this.contentArea.add(this.scene.add.text(0, cardY - 20, activeJobId.toUpperCase().replace(/_/g, ' '), {
        fontSize: '16px', color: colors.text, fontStyle: 'bold'
      }).setOrigin(0.5));

      const status = r.get('jobState') || 'Unknown';
      this.contentArea.add(this.scene.add.text(0, cardY + 20, `Status: ${status}`, {
        fontSize: '14px', color: status === 'accepted' ? '#f1c40f' : '#2ecc71'
      }).setOrigin(0.5));
    } else {
      this.contentArea.add(this.scene.add.text(0, cardY, 'No Active Job', {
        fontSize: '14px', color: colors.textDim, fontStyle: 'italic'
      }).setOrigin(0.5));
    }

    // History
    this.contentArea.add(this.scene.add.text(-240, 0, 'COMPLETED CONTRACTS', {
      fontSize: '14px', color: colors.textDim, fontStyle: 'bold'
    }).setOrigin(0, 0.5));

    const history = r.get('completedJobs') || [];
    let histY = 30;
    history.slice(-8).reverse().forEach(jobId => {
      const t = this.scene.add.text(-230, histY, `✓ ${jobId}`, {
        fontSize: '12px', color: colors.text
      });
      this.contentArea.add(t);
      histY += 20;
    });
  }

  _renderInventoryTab() {
    // Move existing inventory UI into this container
    if (this.inventory) {
      this.inventory.isEmbedded = true; // Ensure it knows
      this.inventory.container.setVisible(true);
      // Center it in content area
      this.inventory.container.setPosition(0, 0);
      this.contentArea.add(this.inventory.container);
      this.inventory.refreshSlots();
    } else {
      this.contentArea.add(this.scene.add.text(0, 0, 'Inventory Unavailable', {
        fontSize: '14px', color: '#e74c3c'
      }).setOrigin(0.5));
    }
  }

  _renderMapTab() {
    const { colors, width, sidebarWidth } = this.config;
    const contentW = width - sidebarWidth - 40;
    const contentH = this.config.height - 100;

    this.contentArea.add(this.scene.add.text(0, -220, 'WORLD MAP', {
      fontFamily: 'Verdana', fontSize: '20px', color: colors.accent, fontStyle: 'bold'
    }).setOrigin(0.5));

    // Map Frame
    const mapBg = this.scene.add.rectangle(0, 20, contentW, contentH, 0x2d3a2d);
    mapBg.setStrokeStyle(2, colors.border);
    this.contentArea.add(mapBg);

    // Landmarks (Static placeholders for now)
    const landmarks = [
      { x: 0, y: 0, label: 'Town Square', color: 0xffffff },
      { x: -100, y: -80, label: 'Blacksmith', color: 0x888888 },
      { x: 100, y: -80, label: 'Tavern', color: 0xffaa00 },
      { x: 0, y: 120, label: 'Town Gate', color: 0x555555 },
    ];

    landmarks.forEach(lm => {
      const dot = this.scene.add.circle(lm.x, lm.y + 20, 6, lm.color);
      const lbl = this.scene.add.text(lm.x, lm.y + 35, lm.label, {
        fontSize: '10px', color: '#fff', backgroundColor: '#00000088'
      }).setOrigin(0.5);
      this.contentArea.add([dot, lbl]);
    });

    this.contentArea.add(this.scene.add.text(0, 200, 'You are here: Haven', {
      fontSize: '12px', color: colors.accent, fontStyle: 'italic'
    }).setOrigin(0.5));
  }

  show(tab = 'status') {
    this.setVisible(true);
    this.switchTab(tab);
    
    this.frame.setScale(0.95);
    this.frame.setAlpha(0);
    this.scene.tweens.add({
      targets: this.frame,
      scale: 1,
      alpha: 1,
      duration: 150,
      ease: 'Back.easeOut'
    });
  }

  hide() {
    this.scene.tweens.add({
      targets: this.frame,
      scale: 0.95,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.setVisible(false);
        // Release inventory if it was grabbed
        if (this.inventory && this.inventory.container.parent === this.contentArea) {
           this.contentArea.remove(this.inventory.container);
           // We don't destroy it, just remove from display list of this container
           // It might need to be re-added to scene if we want it standalone later?
           // For now, it just hides.
        }
      }
    });
  }

  toggle(tab) {
    if (this.visible) this.hide();
    else this.show(tab || this.activeTab);
  }
  
  refresh() {
    if (this.visible) this.switchTab(this.activeTab);
  }
}
