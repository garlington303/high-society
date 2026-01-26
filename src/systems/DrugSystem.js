import { DRUGS } from '../entities/Dealer.js';

/**
 * Drug System - Manages the economy and risk/reward of dealing
 *
 * Core loop:
 * 1. Buy from dealers (lower risk, wholesale prices)
 * 2. Sell to customers (higher risk, retail markup)
 * 3. Managing inventory vs heat vs opportunity
 *
 * The tension: carrying product makes you vulnerable,
 * but you need product to make money.
 */

export class DrugSystem {
  constructor(scene) {
    this.scene = scene;

    // Market conditions fluctuate
    this.marketConditions = this.generateMarketConditions();

    // Update market periodically
    scene.time.addEvent({
      delay: 30000,
      callback: () => this.updateMarket(),
      callbackScope: this,
      loop: true
    });
  }

  generateMarketConditions() {
    // Each drug has supply/demand affecting prices
    const conditions = {};

    for (const drug of Object.keys(DRUGS)) {
      conditions[drug] = {
        supply: 0.8 + Math.random() * 0.4, // 0.8 - 1.2
        demand: 0.8 + Math.random() * 0.4,
        heatMultiplier: 1
      };
    }

    return conditions;
  }

  updateMarket() {
    // Shift market conditions slightly
    for (const drug of Object.keys(this.marketConditions)) {
      const cond = this.marketConditions[drug];

      // Random walk
      cond.supply += (Math.random() - 0.5) * 0.1;
      cond.supply = Phaser.Math.Clamp(cond.supply, 0.5, 1.5);

      cond.demand += (Math.random() - 0.5) * 0.1;
      cond.demand = Phaser.Math.Clamp(cond.demand, 0.5, 1.5);

      // Heat affects market - high heat = less demand (risky to buy)
      const heat = this.scene.registry.get('heat');
      cond.heatMultiplier = 1 - (heat / 200); // Up to 50% reduction at max heat
    }

    this.scene.events.emit('marketUpdate', this.marketConditions);
  }

  sellToCustomer(customer) {
    const demand = customer.getDemand();
    const inventory = this.scene.registry.get('inventory');

    // Check if player has the product
    if (!inventory[demand.drug] || inventory[demand.drug] < demand.quantity) {
      return {
        success: false,
        reason: `You don't have enough ${DRUGS[demand.drug].name}`
      };
    }

    // Calculate price with market conditions
    const basePrice = demand.price;
    const marketMod = this.marketConditions[demand.drug].demand;
    const finalPrice = Math.floor(basePrice * marketMod);

    // Execute sale
    inventory[demand.drug] -= demand.quantity;
    this.scene.registry.set('inventory', inventory);

    const money = this.scene.registry.get('money');
    this.scene.registry.set('money', money + finalPrice);

    // Calculate heat gain
    const baseHeat = DRUGS[demand.drug].heatGain;
    const heatGain = this.calculateSaleHeat(demand.drug, demand.quantity);

    return {
      success: true,
      drug: demand.drug,
      quantity: demand.quantity,
      price: finalPrice,
      heatGain,
      profit: finalPrice
    };
  }

  calculateSaleHeat(drug, quantity) {
    const baseHeat = DRUGS[drug].heatGain;

    // Factors that increase heat:
    // - Time of day (more heat during day)
    // - Existing heat level (more visible = more heat)
    // - Quantity (bulk sales are riskier)

    const time = this.scene.registry.get('time');
    const isDaytime = time >= 6 && time < 20;
    const timeMod = isDaytime ? 1.3 : 0.7;

    const currentHeat = this.scene.registry.get('heat');
    const heatMod = 1 + (currentHeat / 100) * 0.5;

    const quantityMod = 1 + (quantity - 1) * 0.2;

    // Check for nearby witnesses (civilians)
    const witnessMod = this.checkWitnesses();

    const finalHeat = Math.ceil(
      baseHeat * timeMod * heatMod * quantityMod * witnessMod
    );

    return finalHeat;
  }

  checkWitnesses() {
    // Check how many civilians are nearby
    const playerPos = this.scene.player.sprite;
    let nearbyCount = 0;

    this.scene.civilians.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, c.x, c.y
      );
      if (dist < 80) nearbyCount++;
    });

    // More witnesses = more heat
    return 1 + nearbyCount * 0.15;
  }

  getInventoryValue() {
    const inventory = this.scene.registry.get('inventory');
    let total = 0;

    for (const [drug, amount] of Object.entries(inventory)) {
      if (DRUGS[drug]) {
        total += DRUGS[drug].sellPrice * amount;
      }
    }

    return total;
  }

  getInventoryRisk() {
    // How much heat you'd gain if caught with this inventory
    const inventory = this.scene.registry.get('inventory');
    let risk = 0;

    for (const [drug, amount] of Object.entries(inventory)) {
      if (DRUGS[drug]) {
        risk += DRUGS[drug].riskLevel * amount * 5;
      }
    }

    return risk;
  }

  // Called when player is caught
  onBusted() {
    const inventory = this.scene.registry.get('inventory');
    const value = this.getInventoryValue();

    // Lose all inventory
    this.scene.registry.set('inventory', {});

    // Lose some money (bribe/lawyer fees)
    const money = this.scene.registry.get('money');
    const fine = Math.floor(money * 0.3);
    this.scene.registry.set('money', Math.max(0, money - fine));

    return {
      lostInventory: inventory,
      lostValue: value,
      fine
    };
  }
}
