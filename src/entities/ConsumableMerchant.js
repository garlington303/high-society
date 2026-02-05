import Phaser from 'phaser';
import { CONSUMABLES } from './Consumables.js';

export class ConsumableMerchant {
  constructor(scene, x, y, id = 0) {
    this.scene = scene;
    this.id = id;
    this.merchantType = 'consumable';
    this.sprite = scene.physics.add.sprite(x, y, 'merchant_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);

    // Shop hours: open 6:00-22:00 (6am to 10pm)
    this.openHour = 6;
    this.closeHour = 22;

    // Inventory: simple stocked counts for each consumable
    this.inventory = this.generateInventory();
    this.prices = this.generatePrices();

    // Marker icon above merchant to help players visually identify consumable vendors
    try {
      if (!scene.textures.exists('icon_food')) {
        const g = scene.add.graphics();
        g.fillStyle(0xffcc66, 1);
        g.fillCircle(6, 6, 6);
        g.generateTexture('icon_food', 12, 12);
        g.destroy();
      }
      this.marker = scene.add.image(x, y - (this.sprite.displayHeight / 2) - 8, 'icon_food');
      this.marker.setDepth(this.sprite.depth + 1);
      this.marker.setOrigin(0.5, 1);
    } catch (e) {
      this.marker = null;
    }
  }

  generateInventory() {
    // Basic starting stock
    return {
      bread: 8,
      water: 12,
      stew: 4,
      ale: 6,
      bed_pass: 1
    };
  }

  generatePrices() {
    const prices = {};
    // Base prices
    for (const [k, v] of Object.entries(CONSUMABLES)) prices[k] = v.price;

    // Apply a simple town-fame based modifier (single persistent town)
    try {
      const mainTown = this.scene.registry.get('mainTownId') || this.scene.registry.get('currentTownId') || 'haven';
      const townFame = (this.scene.fameSystem && this.scene.fameSystem.getTownFame)
        ? this.scene.fameSystem.getTownFame(mainTown)
        : (this.scene.registry.get('fame') || 0);

      // fame 0-100 -> price modifier range [-25%..+25%] where higher fame = cheaper
      const fameMod = Phaser.Math.Clamp((townFame - 50) / 200, -0.25, 0.25);
      for (const k of Object.keys(prices)) {
        const base = prices[k];
        const modified = Math.max(1, Math.round(base * (1 - fameMod)));
        prices[k] = modified;
      }
    } catch (e) {}

    return prices;
  }

  update(delta) {
    // Could implement restocking over time; keep simple for now
    // Keep the marker positioned above the merchant sprite
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

  // Buy and immediately consume (applies effects to player)
  buyAndConsume(ware, quantity = 1) {
    if (!this.isOpen()) {
      return { success: false, reason: 'Shop is closed' };
    }

    if (!this.inventory[ware] || this.inventory[ware] < quantity) {
      return { success: false, reason: 'Not enough stock' };
    }

    const totalPrice = this.prices[ware] * quantity;
    const playerGold = this.scene.registry.get('gold');
    if (playerGold < totalPrice) return { success: false, reason: 'Not enough gold' };

    // Deduct gold
    this.scene.registry.set('gold', playerGold - totalPrice);

    // Reduce inventory
    this.inventory[ware] -= quantity;

    // Apply effects to registry upkeep stats
    for (let i = 0; i < quantity; i++) {
      try {
        const c = CONSUMABLES[ware];
        if (!c) continue;
        const hunger = Math.min(100, (this.scene.registry.get('hunger') || 0) + (c.hungerRestore || 0));
        const thirst = Math.min(100, (this.scene.registry.get('thirst') || 0) + (c.thirstRestore || 0));
        const sleep = Math.min(100, (this.scene.registry.get('sleep') || 0) + (c.sleepRestore || 0));
        this.scene.registry.set('hunger', hunger);
        this.scene.registry.set('thirst', thirst);
        this.scene.registry.set('sleep', sleep);
      } catch (e) {}
    }

    // Notify systems
    try { this.scene.events.emit('consumed', { ware, quantity }); } catch (e) {}

    return { success: true, ware, quantity, totalPrice };
  }
}
