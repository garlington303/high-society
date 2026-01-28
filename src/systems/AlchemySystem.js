import { WARES } from "../entities/Alchemist.js";

/**
 * Alchemy System - Manages the economy and risk/reward of contraband trading
 *
 * Core loop:
 * 1. Buy from alchemists (lower risk, wholesale prices)
 * 2. Sell to patrons (higher risk, retail markup)
 * 3. Managing inventory vs infamy vs opportunity
 *
 * The tension: carrying contraband makes you vulnerable,
 * but you need wares to make gold.
 */

export class AlchemySystem {
  constructor(scene) {
    this.scene = scene;

    // Market conditions fluctuate
    this.marketConditions = this.generateMarketConditions();

    // Update market periodically
    scene.time.addEvent({
      delay: 30000,
      callback: () => this.updateMarket(),
      callbackScope: this,
      loop: true,
    });
  }

  generateMarketConditions() {
    // Each ware has supply/demand affecting prices
    const conditions = {};

    for (const ware of Object.keys(WARES)) {
      conditions[ware] = {
        supply: 0.8 + Math.random() * 0.4, // 0.8 - 1.2
        demand: 0.8 + Math.random() * 0.4,
        infamyMultiplier: 1,
      };
    }

    return conditions;
  }

  updateMarket() {
    // Shift market conditions slightly
    for (const ware of Object.keys(this.marketConditions)) {
      const cond = this.marketConditions[ware];

      // Random walk
      cond.supply += (Math.random() - 0.5) * 0.1;
      cond.supply = Phaser.Math.Clamp(cond.supply, 0.5, 1.5);

      cond.demand += (Math.random() - 0.5) * 0.1;
      cond.demand = Phaser.Math.Clamp(cond.demand, 0.5, 1.5);

      // Infamy affects market - high infamy = less demand (risky to buy from wanted rogue)
      const infamy = this.scene.registry.get("infamy");
      cond.infamyMultiplier = 1 - infamy / 200; // Up to 50% reduction at max infamy
    }

    this.scene.events.emit("marketUpdate", this.marketConditions);
  }

  sellToPatron(patron) {
    const demand = patron.getDemand();
    const inventory = this.scene.registry.get("inventory");

    // Check if player has the wares
    if (!inventory[demand.ware] || inventory[demand.ware] < demand.quantity) {
      return {
        success: false,
        reason: `You don't have enough ${WARES[demand.ware].name}`,
      };
    }

    // Calculate price with market conditions
    const basePrice = demand.price;
    const marketMod = this.marketConditions[demand.ware].demand;
    const finalPrice = Math.floor(basePrice * marketMod);

    // Execute sale
    inventory[demand.ware] -= demand.quantity;
    this.scene.registry.set("inventory", inventory);

    const gold = this.scene.registry.get("gold");
    this.scene.registry.set("gold", gold + finalPrice);

    // Calculate infamy gain
    const baseInfamy = WARES[demand.ware].infamyGain;
    const infamyGain = this.calculateSaleInfamy(demand.ware, demand.quantity);

    return {
      success: true,
      ware: demand.ware,
      quantity: demand.quantity,
      price: finalPrice,
      infamyGain,
      profit: finalPrice,
    };
  }

  calculateSaleInfamy(ware, quantity) {
    const baseInfamy = WARES[ware].infamyGain;

    // Factors that increase infamy:
    // - Time of day (more infamy during day - guards are watching)
    // - Existing infamy level (more visible = more infamy)
    // - Quantity (bulk sales are riskier)

    const time = this.scene.registry.get("time");
    const isDaytime = time >= 6 && time < 20;
    const timeMod = isDaytime ? 1.3 : 0.7;

    const currentInfamy = this.scene.registry.get("infamy");
    const infamyMod = 1 + (currentInfamy / 100) * 0.5;

    const quantityMod = 1 + (quantity - 1) * 0.2;

    // Check for nearby witnesses (villagers)
    const witnessMod = this.checkWitnesses();

    const finalInfamy = Math.ceil(
      baseInfamy * timeMod * infamyMod * quantityMod * witnessMod,
    );

    return finalInfamy;
  }

  checkWitnesses() {
    // Check how many villagers are nearby
    const playerPos = this.scene.player.sprite;
    let nearbyCount = 0;

    this.scene.villagers.getChildren().forEach((v) => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x,
        playerPos.y,
        v.x,
        v.y,
      );
      if (dist < 80) nearbyCount++;
    });

    // More witnesses = more infamy
    return 1 + nearbyCount * 0.15;
  }

  getInventoryValue() {
    const inventory = this.scene.registry.get("inventory");
    let total = 0;

    for (const [ware, amount] of Object.entries(inventory)) {
      if (WARES[ware]) {
        total += WARES[ware].sellPrice * amount;
      }
    }

    return total;
  }

  getInventoryRisk() {
    // How much infamy you'd gain if caught with this inventory
    const inventory = this.scene.registry.get("inventory");
    let risk = 0;

    for (const [ware, amount] of Object.entries(inventory)) {
      if (WARES[ware]) {
        risk += WARES[ware].riskLevel * amount * 5;
      }
    }

    return risk;
  }

  // Called when player is caught by guards
  onCaptured() {
    const inventory = this.scene.registry.get("inventory");
    const value = this.getInventoryValue();

    // Lose all inventory (confiscated)
    this.scene.registry.set("inventory", {});

    // Lose some gold (bribe/fine to the crown)
    const gold = this.scene.registry.get("gold");
    const fine = Math.floor(gold * 0.3);
    this.scene.registry.set("gold", Math.max(0, gold - fine));

    return {
      lostInventory: inventory,
      lostValue: value,
      fine,
    };
  }
}
