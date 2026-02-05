import Phaser from 'phaser';

/**
 * TownRelationshipBar - Comprehensive panel showing Fame and Infamy using the
 * same scroll/banner art as HP/MP/XP bars.
 */
export class TownRelationshipBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;

    // Panel dimensions
    this.panelW = 180;
    this.barW = 120;
    this.barH = 14;
    this.rowGap = 4;

    // Colors
    this.fameColor = 0x44cc88;
    this.infamyColor = 0xdd4444;
    this.prosperityColor = 0xf1c40f; // Gold/Yellow

    // Build the panel
    this.buildPanel();
    this.setDepth(105);
    scene.add.existing(this);

    // Start hidden; UIScene shows when in town
    this.setVisible(false);

    // Initial update
    this.updateFromRegistry();

    // Listen for registry events. Register with context so the handler
    // is called with the correct `this` and avoid arrow-capture edge cases.
    this.scene.registry.events.on('infamyChanged', this.updateFromRegistry, this);
    this.scene.registry.events.on('fameChanged', this.updateFromRegistry, this);
    this.scene.registry.events.on('townResourcesChanged', this.updateFromRegistry, this);
  }

  buildPanel() {
    const s = this.scene;
    const leftLabelX = -this.panelW / 2;
    const barX = leftLabelX + 45;
    let yOff = 0;

    // Title
    this.titleText = s.add.text(0, yOff, 'TOWN STANDING', {
      fontSize: '10px', fontFamily: 'Verdana', color: '#cccccc', fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    this.add(this.titleText);
    yOff += 16;

    // Fame row
    this.fameLabel = s.add.text(leftLabelX, yOff + 2, '★ Fame', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#44cc88'
    }).setOrigin(0, 0);
    this.add(this.fameLabel);
    this.fameBar = this.createScrollBar(barX, yOff, this.barW, this.barH, this.fameColor);
    this.fameValText = s.add.text(barX + this.barW + 6, yOff + 2, '0', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#ffffff'
    }).setOrigin(0, 0);
    this.add(this.fameValText);
    yOff += this.barH + this.rowGap;

    // Infamy row
    this.infamyLabel = s.add.text(leftLabelX, yOff + 2, '⚠ Infamy', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#dd6666'
    }).setOrigin(0, 0);
    this.add(this.infamyLabel);
    this.infamyBar = this.createScrollBar(barX, yOff, this.barW, this.barH, this.infamyColor);
    this.infamyValText = s.add.text(barX + this.barW + 6, yOff + 2, '0', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#ffffff'
    }).setOrigin(0, 0);
    this.add(this.infamyValText);
    yOff += this.barH + this.rowGap;

    // Prosperity row
    this.prosperityLabel = s.add.text(leftLabelX, yOff + 2, '⛃ Wealth', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#f1c40f'
    }).setOrigin(0, 0);
    this.add(this.prosperityLabel);
    this.prosperityBar = this.createScrollBar(barX, yOff, this.barW, this.barH, this.prosperityColor);
    this.prosperityValText = s.add.text(barX + this.barW + 6, yOff + 2, '0', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#ffffff'
    }).setOrigin(0, 0);
    this.add(this.prosperityValText);
    yOff += this.barH + this.rowGap + 2;

    // Net standing row
    this.standingLabel = s.add.text(leftLabelX, yOff, 'Standing:', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#aaaaaa'
    }).setOrigin(0, 0);
    this.add(this.standingLabel);
    this.standingText = s.add.text(barX, yOff, 'Neutral', {
      fontSize: '10px', fontFamily: 'Verdana', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0, 0);
    this.add(this.standingText);
  }

  /**
   * Create a scroll-style bar using the same healthbar frame PNG if available.
   */
  createScrollBar(x, y, w, h, fillColor) {
    const s = this.scene;
    const depth = 10;

    // If the healthbar frame texture doesn't exist, fall back to a plain rect
    if (!s.textures.exists('ui_healthbar_frame')) {
      const bg = s.add.rectangle(x + w / 2, y + h / 2, w, h, 0x222222).setOrigin(0.5);
      const fill = s.add.rectangle(x, y + h / 2, 0, h - 2, fillColor).setOrigin(0, 0.5);
      this.add([bg, fill]);
      return {
        setPercent: (p) => { fill.displayWidth = Math.max(0, w * Phaser.Math.Clamp(p, 0, 1)); },
        setFillColor: (c) => { fill.setFillStyle(c); }
      };
    }

    // Get texture dimensions
    const tex = s.textures.get('ui_healthbar_frame');
    const img = tex.getSourceImage();
    const texW = img.width;
    const texH = img.height;
    const scaleX = w / texW;
    const scaleY = h / texH;

    // Inner fill area (same offsets as UIScene scrollbar)
    const innerLeftPct = 0.12;
    const innerRightPct = 0.12;
    const innerTopPct = 0.35;
    const innerBottomPct = 0.35;

    const innerLeft = texW * innerLeftPct * scaleX;
    const innerRight = w - texW * innerRightPct * scaleX;
    const innerTop = texH * innerTopPct * scaleY;
    const innerBottom = h - texH * innerBottomPct * scaleY;
    const innerWidth = innerRight - innerLeft;
    const innerHeight = innerBottom - innerTop;

    let currentPct = 0;
    let currentColor = fillColor;

    // Fill graphics
    const gfx = s.add.graphics().setDepth(depth);
    const drawFill = () => {
      gfx.clear();
      if (currentPct > 0) {
        gfx.fillStyle(currentColor, 1);
        gfx.fillRoundedRect(x + innerLeft, y + innerTop, Math.max(0, innerWidth * currentPct), innerHeight, 2);
      }
    };
    drawFill();
    this.add(gfx);

    // Frame image on top
    const frame = s.add.image(x, y, 'ui_healthbar_frame').setOrigin(0, 0).setScale(scaleX, scaleY).setDepth(depth + 2);
    this.add(frame);

    return {
      setPercent: (p) => { currentPct = Phaser.Math.Clamp(p, 0, 1); drawFill(); },
      setFillColor: (c) => { currentColor = c; drawFill(); }
    };
  }

  updateFromRegistry() {
    // Guard: if the scene or registry is not available (scene destroyed
    // or object partially torn down), bail out to avoid uncaught errors.
    if (!this.scene || !this.scene.registry) return;
    // Use the single persistent main town's fame if available, fallback to global fame
    const mainTownId = this.scene.registry.get('mainTownId') || this.scene.registry.get('currentTownId') || 'haven';
    const towns = this.scene.registry.get('townRelations') || {};
    const fame = (typeof towns[mainTownId] === 'number') ? towns[mainTownId] : (this.scene.registry.get('fame') || 0);
    const maxFame = this.scene.registry.get('maxFame') || 100;
    const infamy = this.scene.registry.get('infamy') || 0;
    const maxInfamy = this.scene.registry.get('maxInfamy') || 100;
    const townName = this.scene.registry.get('mainTownName') || mainTownId;

    // Update title to include town name
    try { this.titleText.setText((townName + ' STANDING').toUpperCase()); } catch (e) {}

    // Update bars
    this.fameBar.setPercent(fame / maxFame);
    this.infamyBar.setPercent(infamy / maxInfamy);

    const prosperity = this.scene.registry.get('townProsperity') || 0;
    // Assume 5000 is "Max" visual for now (Level 4)
    this.prosperityBar.setPercent(Math.min(1, prosperity / 5000));

    // Update value texts
    this.fameValText.setText(Math.floor(fame).toString());
    this.infamyValText.setText(Math.floor(infamy).toString());
    this.prosperityValText.setText(Math.floor(prosperity).toString());

    // Net standing calculation
    const net = fame - infamy;
    let standingLabel = 'Neutral';
    let standingColor = '#aaaaaa';
    if (net >= 60) { standingLabel = 'Beloved'; standingColor = '#44ffaa'; }
    else if (net >= 30) { standingLabel = 'Respected'; standingColor = '#44cc88'; }
    else if (net >= 10) { standingLabel = 'Friendly'; standingColor = '#88cc88'; }
    else if (net <= -60) { standingLabel = 'Hated'; standingColor = '#ff4444'; }
    else if (net <= -30) { standingLabel = 'Despised'; standingColor = '#dd6666'; }
    else if (net <= -10) { standingLabel = 'Distrusted'; standingColor = '#cc8866'; }
    this.standingText.setText(standingLabel);
    this.standingText.setColor(standingColor);
  }

  show() { this.setVisible(true); }
  hide() { this.setVisible(false); }
}
