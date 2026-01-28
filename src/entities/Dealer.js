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

    // Ensure dealer isn't placed in an unreachable location relative to the player.
    // If unreachable, try to relocate to the nearest reachable sidewalk spot.
    try {
      const pathfinding = scene.pathfinding;
      const player = scene.player;
      if (pathfinding && player) {
        const startTile = pathfinding.worldToTile(player.sprite.x, player.sprite.y);
        const tgtTile = pathfinding.worldToTile(this.sprite.x, this.sprite.y);

        const reachable = (() => {
          if (!startTile) return false;
          const w = pathfinding.width;
          const h = pathfinding.height;
          const visited = new Uint8Array(w * h);
          const q = [];
          q.push({ x: startTile.x, y: startTile.y });
          visited[startTile.y * w + startTile.x] = 1;
          const dirs = [ {dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0} ];
          const maxSteps = 20000;
          let steps = 0;
          while (q.length > 0 && steps < maxSteps) {
            const cur = q.shift();
            steps++;
            if (cur.x === tgtTile.x && cur.y === tgtTile.y) return true;
            for (const d of dirs) {
              const nx = cur.x + d.dx;
              const ny = cur.y + d.dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const idx = ny * w + nx;
              if (visited[idx]) continue;
              visited[idx] = 1;
              if (nx === tgtTile.x && ny === tgtTile.y) return true;
              if (pathfinding.isWalkable(nx, ny)) q.push({ x: nx, y: ny });
            }
          }
          return false;
        })();

        if (!reachable) {
          // Find candidate sidewalk tiles and pick the nearest reachable one
          const sidewalks = scene.cityGenerator.getSidewalkTiles();
          let chosen = null;
          for (const s of sidewalks) {
            const st = pathfinding.worldToTile(s.x, s.y);
            // BFS from player to st (cheapening by early exit)
            const w = pathfinding.width;
            const h = pathfinding.height;
            const visited = new Uint8Array(w * h);
            const q = [];
            q.push({ x: startTile.x, y: startTile.y });
            visited[startTile.y * w + startTile.x] = 1;
            const dirs = [ {dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0} ];
            const maxSteps = 5000;
            let steps = 0;
            let ok = false;
            while (q.length > 0 && steps < maxSteps) {
              const cur = q.shift();
              steps++;
              if (cur.x === st.x && cur.y === st.y) { ok = true; break; }
              for (const d of dirs) {
                const nx = cur.x + d.dx;
                const ny = cur.y + d.dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const idx = ny * w + nx;
                if (visited[idx]) continue;
                visited[idx] = 1;
                if (nx === st.x && ny === st.y) { ok = true; break; }
                if (pathfinding.isWalkable(nx, ny)) q.push({ x: nx, y: ny });
              }
            }
            if (ok) { chosen = s; break; }
          }

          if (chosen) {
            this.sprite.x = chosen.x;
            this.sprite.y = chosen.y;
          }
        }
      }
    } catch (e) {
      // Non-fatal; just skip relocation on error
      // console.warn('Dealer relocation check failed', e);
    }

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
    if (this.scene.heatSystem) this.scene.heatSystem.add(heatGain, 'purchase');

    return {
      success: true,
      drug,
      quantity,
      totalPrice,
      heatGain
    };
  }

  sell(drug, quantity) {
    const inventory = this.scene.registry.get('inventory');

    if (!inventory[drug] || inventory[drug] < quantity) {
      return { success: false, reason: "You don't have that much" };
    }

    // Dealers buy at 60% of their selling price
    const buybackRate = 0.6;
    const pricePerUnit = Math.floor(this.prices[drug] * buybackRate);
    const totalPrice = pricePerUnit * quantity;

    // Execute transaction
    inventory[drug] -= quantity;
    this.scene.registry.set('inventory', inventory);

    const money = this.scene.registry.get('money');
    this.scene.registry.set('money', money + totalPrice);

    // Add to dealer's inventory
    this.inventory[drug] = (this.inventory[drug] || 0) + quantity;

    return {
      success: true,
      drug,
      quantity,
      totalPrice,
      pricePerUnit
    };
  }
}
