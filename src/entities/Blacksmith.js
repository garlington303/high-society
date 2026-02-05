import Phaser from 'phaser';

export class Blacksmith {
  constructor(scene, x, y, id = 0) {
    this.scene = scene;
    this.id = id;
    this.merchantType = 'blacksmith';
    this.sprite = scene.physics.add.sprite(x, y, 'merchant_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);

    // Shop hours: open 6:00-20:00 (6am to 8pm)
    this.openHour = 6;
    this.closeHour = 20;

    // Inventory: basic equipment and weapons
    this.inventory = this.generateInventory();
    this.prices = this.generatePrices();

    // Marker icon above merchant
    try {
      if (!scene.textures.exists('icon_anvil')) {
        const g = scene.add.graphics();
        g.fillStyle(0x888888, 1);
        g.fillRect(4, 6, 4, 6);
        g.fillStyle(0x666666, 1);
        g.fillTriangle(6, 6, 3, 2, 9, 2);
        g.generateTexture('icon_anvil', 12, 12);
        g.destroy();
      }
      this.marker = scene.add.image(x, y - (this.sprite.displayHeight / 2) - 8, 'icon_anvil');
      this.marker.setDepth(this.sprite.depth + 1);
      this.marker.setOrigin(0.5, 1);
    } catch (e) {
      this.marker = null;
    }
  }

  generateInventory() {
    return {
      iron_sword: 3,
      iron_axe: 2,
      leather_armor: 4,
      iron_shield: 2,
      steel_dagger: 5
    };
  }

  generatePrices() {
    const basePrices = {
      iron_sword: 150,
      iron_axe: 180,
      leather_armor: 200,
      iron_shield: 120,
      steel_dagger: 80
    };

    // Apply town-fame based modifier
    try {
      const mainTown = this.scene.registry.get('mainTownId') || this.scene.registry.get('currentTownId') || 'haven';
      const townFame = (this.scene.fameSystem && this.scene.fameSystem.getTownFame)
        ? this.scene.fameSystem.getTownFame(mainTown)
        : (this.scene.registry.get('fame') || 0);

      const fameMod = Phaser.Math.Clamp((townFame - 50) / 200, -0.25, 0.25);
      const prices = {};
      for (const k of Object.keys(basePrices)) {
        const base = basePrices[k];
        const modified = Math.max(1, Math.round(base * (1 - fameMod)));
        prices[k] = modified;
      }
      return prices;
    } catch (e) {
      return basePrices;
    }
  }

  update(delta) {
    // Keep marker positioned
    try {
      if (this.marker && this.sprite) {
        this.marker.x = this.sprite.x;
        this.marker.y = this.sprite.y - (this.sprite.displayHeight / 2) - 8;
      }
    } catch (e) {}
  }

  isOpen() {
    const time = this.scene.registry.get('time') || 12;
    return time >= this.openHour && time < this.closeHour;
  }

  buy(item, quantity = 1) {
    if (!this.isOpen()) {
      return { success: false, reason: 'Shop is closed' };
    }

    if (!this.inventory[item] || this.inventory[item] < quantity) {
      return { success: false, reason: 'Not enough stock' };
    }

    const totalPrice = this.prices[item] * quantity;
    const playerGold = this.scene.registry.get('gold');
    if (playerGold < totalPrice) return { success: false, reason: 'Not enough gold' };

    // Deduct gold
    this.scene.registry.set('gold', playerGold - totalPrice);

    // Reduce inventory
    this.inventory[item] -= quantity;

    // Add to player inventory (simplified for now)
    try {
      const inv = this.scene.registry.get('inventory') || {};
      inv[item] = (inv[item] || 0) + quantity;
      this.scene.registry.set('inventory', inv);
    } catch (e) {}

    // Notify systems
    try { this.scene.events.emit('itemPurchased', { item, quantity, merchant: 'blacksmith' }); } catch (e) {}

    return { success: true, item, quantity, totalPrice };
  }
}
