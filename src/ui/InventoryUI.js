/**
 * Inventory UI
 * 
 * Premium inventory grid with drag-drop, tooltips, and context menus.
 * Designed as a reusable component for UIScene.
 */

import { getItem, getItemRarityColor, ITEM_CATEGORIES } from '../data/ItemDatabase.js';
import { getGlobalInventory } from '../systems/InventorySystem.js';

export class InventoryUI {
  /**
   * @param {Phaser.Scene} scene - The UI scene
   * @param {Object} config - Configuration options
   */
  constructor(scene, config = {}) {
    this.scene = scene;
    
    // Configuration
    this.x = config.x || scene.scale.width / 2;
    this.y = config.y || scene.scale.height / 2;
    this.cols = config.cols || 5;
    this.rows = config.rows || 4;
    this.slotSize = config.slotSize || 48;
    this.slotPadding = config.slotPadding || 6;
    this.isEmbedded = config.isEmbedded || false;
    this.visible = false;
    
    // Visual theme
    this.theme = {
      panelBg: 0x0d1117,
      panelBorder: 0x30363d,
      slotBg: 0x161b22,
      slotBorder: 0x21262d,
      slotHover: 0x238636,
      slotSelected: 0x1f6feb,
      textPrimary: '#e6edf3',
      textSecondary: '#8b949e',
      textGold: '#ffd700',
      shadow: 0x000000
    };
    
    // State
    this.selectedSlot = null;
    this.hoveredSlot = null;
    this.draggedSlot = null;
    this.isDragging = false;
    this.dragGhost = null;
    this.dragStartPos = null;
    this.contextMenu = null;
    this.tooltip = null;
    
    // Create all elements
    this.createContainer();
    this.createPanel();
    this.createSlots();
    this.createHeader();
    this.createTooltip();
    this.createContextMenu();
    this.createDragGhost();
    
    // Initially hidden
    this.container.setVisible(false);
    
    // Listen for inventory changes
    this.setupEventListeners();
    
    // Global mouse tracking for drag
    this.setupDragListeners();
  }

  // ═══════════════════════════════════════════════
  // CREATION
  // ═══════════════════════════════════════════════

  createContainer() {
    // If embedded, position relative to 0,0 (parent container handles position)
    const px = this.isEmbedded ? 0 : this.x;
    const py = this.isEmbedded ? 0 : this.y;
    this.container = this.scene.add.container(px, py);
    this.container.setDepth(500);
  }

  createPanel() {
    const totalWidth = this.cols * (this.slotSize + this.slotPadding) + this.slotPadding + 24;
    const totalHeight = this.rows * (this.slotSize + this.slotPadding) + this.slotPadding + 80;
    
    this.panelWidth = totalWidth;
    this.panelHeight = totalHeight;

    // Skip background panel if embedded (parent handles it)
    if (this.isEmbedded) return;
    
    // Shadow
    const shadow = this.scene.add.rectangle(4, 4, totalWidth, totalHeight, this.theme.shadow, 0.5);
    shadow.setOrigin(0.5);
    this.container.add(shadow);
    
    // Main panel background
    const panel = this.scene.add.graphics();
    panel.fillStyle(this.theme.panelBg, 0.98);
    panel.fillRoundedRect(-totalWidth/2, -totalHeight/2, totalWidth, totalHeight, 12);
    panel.lineStyle(2, this.theme.panelBorder, 1);
    panel.strokeRoundedRect(-totalWidth/2, -totalHeight/2, totalWidth, totalHeight, 12);
    this.container.add(panel);
    
    // Decorative header bar
    const headerBar = this.scene.add.graphics();
    headerBar.fillStyle(this.theme.slotBorder, 1);
    headerBar.fillRoundedRect(-totalWidth/2 + 8, -totalHeight/2 + 8, totalWidth - 16, 36, 6);
    this.container.add(headerBar);
  }

  createHeader() {
    // Skip header if embedded
    if (this.isEmbedded) return;

    const headerY = -this.panelHeight/2 + 26;
    
    // Title
    this.titleText = this.scene.add.text(-this.panelWidth/2 + 20, headerY, 'INVENTORY', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: this.theme.textPrimary
    }).setOrigin(0, 0.5);
    this.container.add(this.titleText);
    
    // Slot count
    this.slotCountText = this.scene.add.text(this.panelWidth/2 - 20, headerY, '0/20', {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      color: this.theme.textSecondary
    }).setOrigin(1, 0.5);
    this.container.add(this.slotCountText);
    
    // Gold display
    this.goldText = this.scene.add.text(0, headerY, '0g', {
      fontFamily: 'Consolas, monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: this.theme.textGold
    }).setOrigin(0.5);
    this.container.add(this.goldText);
    
    // Close button
    const closeBtn = this.scene.add.text(this.panelWidth/2 - 16, -this.panelHeight/2 + 16, '✕', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: this.theme.textSecondary
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    closeBtn.on('pointerover', () => closeBtn.setColor('#f85149'));
    closeBtn.on('pointerout', () => closeBtn.setColor(this.theme.textSecondary));
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  createSlots() {
    this.slotGraphics = [];
    this.slotIcons = [];
    this.slotQuantities = [];
    this.slotHitAreas = [];
    
    // If embedded, center the slots based on rows/cols
    const gridW = this.cols * (this.slotSize + this.slotPadding);
    const gridH = this.rows * (this.slotSize + this.slotPadding);
    
    let startX = -gridW / 2 + this.slotSize / 2;
    let startY = -gridH / 2 + this.slotSize / 2;

    if (!this.isEmbedded) {
      // Legacy offsets for standalone panel
      startX = -this.panelWidth/2 + this.slotPadding + 12 + this.slotSize/2;
      startY = -this.panelHeight/2 + 56 + this.slotPadding + this.slotSize/2;
    }
    
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const index = row * this.cols + col;
        const x = startX + col * (this.slotSize + this.slotPadding);
        const y = startY + row * (this.slotSize + this.slotPadding);
        
        // Slot background
        const slotGfx = this.scene.add.graphics();
        this.drawSlot(slotGfx, x, y, 'normal');
        this.container.add(slotGfx);
        this.slotGraphics[index] = { gfx: slotGfx, x, y };
        
        // Item icon placeholder (image)
        const icon = this.scene.add.image(x, y, '__DEFAULT').setScale(1.5);
        icon.setVisible(false);
        this.container.add(icon);
        this.slotIcons[index] = icon;
        
        // Quantity text
        const qtyText = this.scene.add.text(x + this.slotSize/2 - 6, y + this.slotSize/2 - 6, '', {
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(1, 1).setVisible(false);
        this.container.add(qtyText);
        this.slotQuantities[index] = qtyText;
        
        // Interactive hit area
        const hitArea = this.scene.add.rectangle(x, y, this.slotSize, this.slotSize, 0xffffff, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.slotIndex = index;
        this.setupSlotInteractions(hitArea, index);
        this.container.add(hitArea);
        this.slotHitAreas[index] = hitArea;
      }
    }
  }

  drawSlot(gfx, x, y, state = 'normal') {
    gfx.clear();
    
    const half = this.slotSize / 2;
    const radius = 6;
    
    // Background
    let bgColor = this.theme.slotBg;
    let borderColor = this.theme.slotBorder;
    
    if (state === 'hover') {
      borderColor = this.theme.slotHover;
    } else if (state === 'selected') {
      borderColor = this.theme.slotSelected;
    } else if (state === 'drag') {
      bgColor = 0x1f6feb;
      borderColor = 0x58a6ff;
    }
    
    gfx.fillStyle(bgColor, 1);
    gfx.fillRoundedRect(x - half, y - half, this.slotSize, this.slotSize, radius);
    gfx.lineStyle(2, borderColor, 1);
    gfx.strokeRoundedRect(x - half, y - half, this.slotSize, this.slotSize, radius);
  }

  setupSlotInteractions(hitArea, index) {
    hitArea.on('pointerover', () => {
      this.hoveredSlot = index;
      if (!this.isDragging) {
        this.updateSlotVisual(index, 'hover');
        this.showTooltip(index);
      } else if (this.draggedSlot !== index) {
        // Highlight as drop target
        this.updateSlotVisual(index, 'drag');
      }
    });
    
    hitArea.on('pointerout', () => {
      if (this.hoveredSlot === index) {
        this.hoveredSlot = null;
        if (!this.isDragging) {
          this.updateSlotVisual(index, this.selectedSlot === index ? 'selected' : 'normal');
          this.hideTooltip();
        } else if (this.draggedSlot !== index) {
          this.updateSlotVisual(index, 'normal');
        }
      }
    });
    
    hitArea.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        this.showContextMenu(index, pointer);
      } else {
        // Start drag if slot has item
        this.startDrag(index, pointer);
      }
    });
  }

  // ═══════════════════════════════════════════════
  // DRAG AND DROP
  // ═══════════════════════════════════════════════

  createDragGhost() {
    // Ghost container follows mouse during drag
    this.dragGhostContainer = this.scene.add.container(0, 0);
    this.dragGhostContainer.setDepth(700);
    this.dragGhostContainer.setVisible(false);
    
    // Background glow
    this.dragGhostBg = this.scene.add.circle(0, 0, this.slotSize / 2 + 4, 0x1f6feb, 0.3);
    this.dragGhostContainer.add(this.dragGhostBg);
    
    // Item icon
    this.dragGhostIcon = this.scene.add.image(0, 0, '__DEFAULT').setScale(1.6);
    this.dragGhostContainer.add(this.dragGhostIcon);
    
    // Quantity text
    this.dragGhostQty = this.scene.add.text(14, 14, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(1, 1);
    this.dragGhostContainer.add(this.dragGhostQty);
  }

  setupDragListeners() {
    // Track mouse movement globally during drag
    this.scene.input.on('pointermove', (pointer) => {
      if (this.isDragging && this.visible) {
        this.updateDragPosition(pointer);
      }
    });
    
    // Handle drop on mouse up
    this.scene.input.on('pointerup', (pointer) => {
      if (this.isDragging && this.visible) {
        this.endDrag(pointer);
      }
    });
  }

  startDrag(slotIndex, pointer) {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    const slotData = inventory.getSlotWithItem(slotIndex);
    if (!slotData || !slotData.item) return;
    
    // Set drag state
    this.isDragging = true;
    this.draggedSlot = slotIndex;
    this.dragStartPos = { x: pointer.x, y: pointer.y };
    
    // Hide tooltip during drag
    this.hideTooltip();
    
    // Configure ghost icon
    const textureKey = slotData.item.icon || 'item_potion_red';
    try {
      if (this.scene.textures.exists(textureKey)) {
        this.dragGhostIcon.setTexture(textureKey);
      }
    } catch (e) {}
    
    // Show quantity on ghost
    if (slotData.slot.quantity > 1) {
      this.dragGhostQty.setText(slotData.slot.quantity.toString());
      this.dragGhostQty.setVisible(true);
    } else {
      this.dragGhostQty.setVisible(false);
    }
    
    // Position and show ghost
    this.dragGhostContainer.setPosition(pointer.x, pointer.y);
    this.dragGhostContainer.setScale(0.8);
    this.dragGhostContainer.setAlpha(0.9);
    this.dragGhostContainer.setVisible(true);
    
    // Animate ghost appearing
    this.scene.tweens.add({
      targets: this.dragGhostContainer,
      scale: 1,
      duration: 100,
      ease: 'Back.easeOut'
    });
    
    // Dim the source slot icon
    const sourceIcon = this.slotIcons[slotIndex];
    if (sourceIcon) {
      sourceIcon.setAlpha(0.3);
    }
    
    // Mark source slot as dragging
    this.updateSlotVisual(slotIndex, 'selected');
  }

  updateDragPosition(pointer) {
    if (!this.isDragging) return;
    
    // Smooth follow with slight offset
    this.dragGhostContainer.setPosition(pointer.x, pointer.y);
  }

  endDrag(pointer) {
    if (!this.isDragging) return;
    
    const inventory = getGlobalInventory(this.scene);
    const sourceSlot = this.draggedSlot;
    const targetSlot = this.hoveredSlot;
    
    // Reset source icon alpha
    const sourceIcon = this.slotIcons[sourceSlot];
    if (sourceIcon) {
      sourceIcon.setAlpha(1);
    }
    
    // Animate ghost disappearing
    this.scene.tweens.add({
      targets: this.dragGhostContainer,
      scale: 0.5,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.dragGhostContainer.setVisible(false);
      }
    });
    
    // Perform move if dropped on valid target
    if (targetSlot !== null && targetSlot !== sourceSlot && inventory) {
      inventory.moveSlot(sourceSlot, targetSlot);
      
      // Visual feedback for successful drop
      this.showDropEffect(targetSlot);
    }
    
    // Reset all slot visuals
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.updateSlotVisual(i, i === this.hoveredSlot ? 'hover' : 'normal');
    }
    
    // Reset drag state
    this.isDragging = false;
    this.draggedSlot = null;
    this.dragStartPos = null;
    
    // Refresh display
    this.refreshSlots();
  }

  showDropEffect(slotIndex) {
    const slot = this.slotGraphics[slotIndex];
    if (!slot) return;
    
    const x = this.container.x + slot.x;
    const y = this.container.y + slot.y;
    
    // Green pulse for successful drop
    const pulse = this.scene.add.circle(x, y, this.slotSize / 2, 0x238636, 0.5);
    pulse.setDepth(550);
    
    this.scene.tweens.add({
      targets: pulse,
      scale: 1.3,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy()
    });
  }

  updateSlotVisual(index, state) {
    const slot = this.slotGraphics[index];
    if (slot) {
      this.drawSlot(slot.gfx, slot.x, slot.y, state);
    }
  }

  // ═══════════════════════════════════════════════
  // TOOLTIP
  // ═══════════════════════════════════════════════

  createTooltip() {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setDepth(600);
    this.tooltipContainer.setVisible(false);
    
    this.tooltipBg = this.scene.add.graphics();
    this.tooltipContainer.add(this.tooltipBg);
    
    this.tooltipTitle = this.scene.add.text(10, 8, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    this.tooltipContainer.add(this.tooltipTitle);
    
    this.tooltipDesc = this.scene.add.text(10, 26, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#8b949e',
      wordWrap: { width: 180 }
    });
    this.tooltipContainer.add(this.tooltipDesc);
    
    this.tooltipValue = this.scene.add.text(10, 0, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#ffd700'
    });
    this.tooltipContainer.add(this.tooltipValue);
  }

  showTooltip(slotIndex) {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    const slotData = inventory.getSlotWithItem(slotIndex);
    if (!slotData || !slotData.item) {
      this.hideTooltip();
      return;
    }
    
    const item = slotData.item;
    const rarityColor = getItemRarityColor(item);
    const colorHex = '#' + rarityColor.toString(16).padStart(6, '0');
    
    this.tooltipTitle.setText(item.name);
    this.tooltipTitle.setColor(colorHex);
    
    this.tooltipDesc.setText(item.description);
    
    // Calculate tooltip height
    const descBounds = this.tooltipDesc.getBounds();
    const tooltipHeight = 26 + descBounds.height + 24;
    
    // Value line
    this.tooltipValue.setText(`Value: ${item.value}g`);
    this.tooltipValue.setY(tooltipHeight - 20);
    
    // Background
    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x0d1117, 0.95);
    this.tooltipBg.fillRoundedRect(0, 0, 200, tooltipHeight, 6);
    this.tooltipBg.lineStyle(1, rarityColor, 0.8);
    this.tooltipBg.strokeRoundedRect(0, 0, 200, tooltipHeight, 6);
    
    // Position near slot
    const slot = this.slotGraphics[slotIndex];
    if (slot) {
      const worldX = this.container.x + slot.x + this.slotSize;
      const worldY = this.container.y + slot.y - tooltipHeight/2;
      this.tooltipContainer.setPosition(worldX + 10, worldY);
    }
    
    this.tooltipContainer.setVisible(true);
  }

  hideTooltip() {
    this.tooltipContainer.setVisible(false);
  }

  // ═══════════════════════════════════════════════
  // CONTEXT MENU
  // ═══════════════════════════════════════════════

  createContextMenu() {
    this.contextContainer = this.scene.add.container(0, 0);
    this.contextContainer.setDepth(650);
    this.contextContainer.setVisible(false);
    
    this.contextBg = this.scene.add.graphics();
    this.contextContainer.add(this.contextBg);
    
    this.contextOptions = [];
  }

  showContextMenu(slotIndex, pointer) {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    const slotData = inventory.getSlotWithItem(slotIndex);
    if (!slotData || !slotData.item) {
      this.hideContextMenu();
      return;
    }
    
    const item = slotData.item;
    const options = [];
    
    // Add options based on item type
    if (item.consumable) {
      options.push({ label: 'Use', action: () => this.useItem(slotIndex) });
    }
    
    if (slotData.quantity > 1 && item.stackable) {
      options.push({ label: 'Split Stack', action: () => this.splitStack(slotIndex) });
    }
    
    options.push({ label: 'Drop', action: () => this.dropItem(slotIndex) });
    
    // Clear old options
    this.contextOptions.forEach(o => o.destroy());
    this.contextOptions = [];
    
    // Draw background
    const menuWidth = 100;
    const menuHeight = options.length * 28 + 8;
    
    this.contextBg.clear();
    this.contextBg.fillStyle(0x161b22, 0.98);
    this.contextBg.fillRoundedRect(0, 0, menuWidth, menuHeight, 6);
    this.contextBg.lineStyle(1, 0x30363d, 1);
    this.contextBg.strokeRoundedRect(0, 0, menuWidth, menuHeight, 6);
    
    // Create option buttons
    options.forEach((opt, i) => {
      const y = 4 + i * 28;
      
      const btn = this.scene.add.text(8, y + 6, opt.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#e6edf3',
        backgroundColor: '#00000000',
        padding: { x: 4, y: 4 }
      }).setInteractive({ useHandCursor: true });
      
      btn.on('pointerover', () => btn.setColor('#58a6ff'));
      btn.on('pointerout', () => btn.setColor('#e6edf3'));
      btn.on('pointerdown', () => {
        opt.action();
        this.hideContextMenu();
      });
      
      this.contextContainer.add(btn);
      this.contextOptions.push(btn);
    });
    
    // Position at pointer
    this.contextContainer.setPosition(pointer.x, pointer.y);
    this.contextContainer.setVisible(true);
    this.contextSlot = slotIndex;
    
    // Click outside to close
    this.scene.input.once('pointerdown', (p) => {
      if (p !== pointer) {
        this.hideContextMenu();
      }
    });
  }

  hideContextMenu() {
    this.contextContainer.setVisible(false);
    this.contextSlot = null;
  }

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════

  onSlotClick(index) {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    if (this.selectedSlot === null) {
      // First click - select slot if it has an item
      const slot = inventory.getSlot(index);
      if (slot) {
        this.selectedSlot = index;
        this.updateSlotVisual(index, 'selected');
      }
    } else if (this.selectedSlot === index) {
      // Click same slot - deselect
      this.selectedSlot = null;
      this.updateSlotVisual(index, this.hoveredSlot === index ? 'hover' : 'normal');
    } else {
      // Click different slot - move/swap
      inventory.moveSlot(this.selectedSlot, index);
      const prevSelected = this.selectedSlot;
      this.selectedSlot = null;
      this.updateSlotVisual(prevSelected, 'normal');
      this.refreshSlots();
    }
  }

  useItem(slotIndex) {
    const inventory = getGlobalInventory(this.scene);
    if (inventory) {
      const effect = inventory.useItem(slotIndex);
      if (effect) {
        // Visual feedback
        this.showUseEffect(slotIndex);
      }
    }
  }

  splitStack(slotIndex) {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    const slot = inventory.getSlot(slotIndex);
    if (!slot || slot.quantity <= 1) return;
    
    // Split in half
    const splitAmount = Math.floor(slot.quantity / 2);
    inventory.splitStack(slotIndex, splitAmount);
  }

  dropItem(slotIndex) {
    const inventory = getGlobalInventory(this.scene);
    if (inventory) {
      inventory.removeFromSlot(slotIndex, 1);
    }
  }

  showUseEffect(slotIndex) {
    const slot = this.slotGraphics[slotIndex];
    if (!slot) return;
    
    const x = this.container.x + slot.x;
    const y = this.container.y + slot.y;
    
    const flash = this.scene.add.circle(x, y, this.slotSize/2, 0x4ecdc4, 0.6);
    flash.setDepth(550);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => flash.destroy()
    });
  }

  // ═══════════════════════════════════════════════
  // DATA REFRESH
  // ═══════════════════════════════════════════════

  refreshSlots() {
    const inventory = getGlobalInventory(this.scene);
    if (!inventory) return;
    
    const slots = inventory.getAllSlots();
    let usedSlots = 0;
    
    slots.forEach((slotData, index) => {
      const icon = this.slotIcons[index];
      const qtyText = this.slotQuantities[index];
      
      if (slotData.slot && slotData.item) {
        usedSlots++;
        
        // Update icon with actual texture
        const textureKey = slotData.item.icon || 'item_potion_red';
        try {
          if (this.scene.textures.exists(textureKey)) {
            icon.setTexture(textureKey);
          } else {
            icon.setTexture('item_potion_red'); // Fallback
          }
          icon.setVisible(true);
        } catch (e) {
          icon.setVisible(false);
        }
        
        // Update quantity
        if (slotData.slot.quantity > 1) {
          qtyText.setText(slotData.slot.quantity.toString());
          qtyText.setVisible(true);
        } else {
          qtyText.setVisible(false);
        }
      } else {
        icon.setVisible(false);
        qtyText.setVisible(false);
      }
    });
    
    // Update header
    this.slotCountText.setText(`${usedSlots}/${inventory.maxSlots}`);
    this.goldText.setText(`${inventory.getGold()}g`);
  }

  // ═══════════════════════════════════════════════
  // VISIBILITY
  // ═══════════════════════════════════════════════

  show() {
    this.visible = true;
    this.container.setVisible(true);
    this.refreshSlots();
    
    if (!this.isEmbedded) {
      // Animate in only for standalone mode
      this.container.setScale(0.9);
      this.container.setAlpha(0);
      this.scene.tweens.add({
        targets: this.container,
        scale: 1,
        alpha: 1,
        duration: 150,
        ease: 'Back.easeOut'
      });
    } else {
        this.container.setAlpha(1);
        this.container.setScale(1);
    }
  }

  hide() {
    // Cancel any active drag
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedSlot = null;
      this.dragGhostContainer.setVisible(false);
    }
    
    if (!this.isEmbedded) {
      this.scene.tweens.add({
        targets: this.container,
        scale: 0.9,
        alpha: 0,
        duration: 100,
        onComplete: () => {
          this.visible = false;
          this.container.setVisible(false);
          this.hideTooltip();
          this.hideContextMenu();
          this.selectedSlot = null;
        }
      });
    } else {
        this.visible = false;
        this.container.setVisible(false);
        this.hideTooltip();
        this.hideContextMenu();
    }
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  isVisible() {
    return this.visible;
  }

  // ═══════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════

  setupEventListeners() {
    try {
      this.scene.registry.events.on('inventoryChanged', () => {
        if (this.visible) {
          this.refreshSlots();
        }
      });
    } catch (e) {}
  }

  destroy() {
    this.container.destroy();
    this.tooltipContainer.destroy();
    this.contextContainer.destroy();
    if (this.dragGhostContainer) {
      this.dragGhostContainer.destroy();
    }
  }
}
