import Phaser from 'phaser';

// Drug types and their base properties
export const DRUGS = {
  weed: {
    name: 'Weed',
    basePrice: 20,
    sellPrice: 35,
    heatGain: 2,
    riskLevel: 1
  },
  pills: {
    name: 'Pills',
    basePrice: 50,
    sellPrice: 90,
    heatGain: 4,
    riskLevel: 2
  },
  coke: {
    name: 'Coke',
    basePrice: 150,
    sellPrice: 280,
    heatGain: 8,
    riskLevel: 3
  },
  meth: {
    name: 'Meth',
    basePrice: 200,
    sellPrice: 400,
    heatGain: 12,
    riskLevel: 4
  }
};

export class Dealer {
  constructor(scene, x, y, dealerIndex) {
    this.scene = scene;
    this.direction = 'down';
    this.dealerIndex = dealerIndex;

    // Each dealer specializes in certain products
    this.inventory = this.generateInventory(dealerIndex);
    this.prices = this.generatePrices();

    // Create sprite (dealers don't move)
    this.sprite = scene.physics.add.sprite(x, y, 'dealer_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);

    // Restock timer
    this.restockTimer = 0;
  }

  generateInventory(index) {
    // Different dealers have different stock
    const inventories = [
      { weed: 10, pills: 5 },           // Street dealer
      { pills: 8, coke: 3 },            // Club connection
      { coke: 5, meth: 2 },             // Heavy supplier
      { weed: 15, pills: 10, coke: 5 }  // Big operation
    ];

    return { ...inventories[index % inventories.length] };
  }

  generatePrices() {
    // Prices fluctuate slightly
    const prices = {};
    for (const [drug, data] of Object.entries(DRUGS)) {
      const variance = 0.8 + Math.random() * 0.4; // 80-120% of base
      prices[drug] = Math.floor(data.basePrice * variance);
    }
    return prices;
  }

  update(delta) {
    this.restockTimer += delta;

    // Restock every 60 seconds
    if (this.restockTimer > 60000) {
      this.restock();
      this.restockTimer = 0;
    }
  }

  restock() {
    const baseInventory = this.generateInventory(this.dealerIndex);
    for (const [drug, amount] of Object.entries(baseInventory)) {
      this.inventory[drug] = Math.min(
        (this.inventory[drug] || 0) + Math.ceil(amount / 2),
        amount
      );
    }
    this.prices = this.generatePrices();
  }

  getAvailableStock() {
    const stock = [];
    for (const [drug, amount] of Object.entries(this.inventory)) {
      if (amount > 0) {
        stock.push({
          drug,
          amount,
          price: this.prices[drug],
          info: DRUGS[drug]
        });
      }
    }
    return stock;
  }

  buy(drug, quantity) {
    if (!this.inventory[drug] || this.inventory[drug] < quantity) {
      return { success: false, reason: 'Not enough stock' };
    }

    const totalPrice = this.prices[drug] * quantity;
    const playerMoney = this.scene.registry.get('money');

    if (playerMoney < totalPrice) {
      return { success: false, reason: 'Not enough money' };
    }

    // Transaction
    this.inventory[drug] -= quantity;
    this.scene.registry.set('money', playerMoney - totalPrice);

    // Add to player inventory
    const playerInv = this.scene.registry.get('inventory');
    playerInv[drug] = (playerInv[drug] || 0) + quantity;
    this.scene.registry.set('inventory', playerInv);

    // Heat from transaction
    const heatGain = Math.ceil(DRUGS[drug].heatGain * 0.5);
    this.scene.heatSystem.add(heatGain, 'purchase');

    return {
      success: true,
      drug,
      quantity,
      totalPrice,
      heatGain
    };
  }
}
