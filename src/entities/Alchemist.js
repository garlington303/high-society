import Phaser from 'phaser';

// Fantasy wares and their base properties
export const WARES = {
  moonleaf: {
    name: 'Moonleaf Tea',
    basePrice: 20,
    sellPrice: 35,
    infamyGain: 2,
    riskLevel: 1,
    description: 'A calming herbal brew, mildly prohibited'
  },
  vigor: {
    name: 'Vigor Elixir',
    basePrice: 50,
    sellPrice: 90,
    infamyGain: 4,
    riskLevel: 2,
    description: 'Stamina-enhancing potion, restricted'
  },
  dragonsbreath: {
    name: "Dragon's Breath",
    basePrice: 150,
    sellPrice: 280,
    infamyGain: 8,
    riskLevel: 3,
    description: 'Powerful stimulant distilled from wyrm glands'
  },
  shadowbane: {
    name: 'Shadowbane Extract',
    basePrice: 200,
    sellPrice: 400,
    infamyGain: 12,
    riskLevel: 4,
    description: 'Forbidden dark essence - possession means death'
  }
};

export class Alchemist {
  constructor(scene, x, y, alchemistIndex) {
    this.scene = scene;
    this.direction = 'down';
    this.alchemistIndex = alchemistIndex;

    // Each alchemist specializes in certain wares
    this.inventory = this.generateInventory(alchemistIndex);
    this.prices = this.generatePrices();

    // Create sprite (alchemists don't move)
    this.sprite = scene.physics.add.sprite(x, y, 'alchemist_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);

    // Ensure alchemist isn't placed in an unreachable location relative to the player.
    // If unreachable, try to relocate to the nearest reachable path spot.
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
          // Find candidate path tiles and pick the nearest reachable one
          const paths = scene.townGenerator.getPathTiles();
          let chosen = null;
          for (const s of paths) {
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
    }

    // Restock timer
    this.restockTimer = 0;
  }

  generateInventory(index) {
    // Different alchemists have different stock
    const inventories = [
      { moonleaf: 10, vigor: 5 },             // Hedge witch
      { vigor: 8, dragonsbreath: 3 },          // Back-alley brewer
      { dragonsbreath: 5, shadowbane: 2 },     // Dark apothecary
      { moonleaf: 15, vigor: 10, dragonsbreath: 5 }  // Major supplier
    ];

    return { ...inventories[index % inventories.length] };
  }

  generatePrices() {
    // Prices fluctuate slightly
    const prices = {};
    for (const [ware, data] of Object.entries(WARES)) {
      const variance = 0.8 + Math.random() * 0.4; // 80-120% of base
      prices[ware] = Math.floor(data.basePrice * variance);
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
    const baseInventory = this.generateInventory(this.alchemistIndex);
    for (const [ware, amount] of Object.entries(baseInventory)) {
      this.inventory[ware] = Math.min(
        (this.inventory[ware] || 0) + Math.ceil(amount / 2),
        amount
      );
    }
    this.prices = this.generatePrices();
  }

  getAvailableStock() {
    const stock = [];
    for (const [ware, amount] of Object.entries(this.inventory)) {
      if (amount > 0) {
        stock.push({
          ware,
          amount,
          price: this.prices[ware],
          info: WARES[ware]
        });
      }
    }
    return stock;
  }

  buy(ware, quantity) {
    if (!this.inventory[ware] || this.inventory[ware] < quantity) {
      return { success: false, reason: 'Not enough stock' };
    }

    const totalPrice = this.prices[ware] * quantity;
    const playerGold = this.scene.registry.get('gold');

    if (playerGold < totalPrice) {
      return { success: false, reason: 'Not enough gold' };
    }

    // Transaction
    this.inventory[ware] -= quantity;
    this.scene.registry.set('gold', playerGold - totalPrice);

    // Add to player inventory
    const playerInv = this.scene.registry.get('inventory');
    playerInv[ware] = (playerInv[ware] || 0) + quantity;
    this.scene.registry.set('inventory', playerInv);

    // Infamy from transaction
    const infamyGain = Math.ceil(WARES[ware].infamyGain * 0.5);
    if (this.scene.infamySystem) this.scene.infamySystem.add(infamyGain, 'purchase');

    return {
      success: true,
      ware,
      quantity,
      totalPrice,
      infamyGain
    };
  }

  sell(ware, quantity) {
    const inventory = this.scene.registry.get('inventory');

    if (!inventory[ware] || inventory[ware] < quantity) {
      return { success: false, reason: "You don't have that much" };
    }

    // Alchemists buy at 60% of their selling price
    const buybackRate = 0.6;
    const pricePerUnit = Math.floor(this.prices[ware] * buybackRate);
    const totalPrice = pricePerUnit * quantity;

    // Execute transaction
    inventory[ware] -= quantity;
    this.scene.registry.set('inventory', inventory);

    const gold = this.scene.registry.get('gold');
    this.scene.registry.set('gold', gold + totalPrice);

    // Add to alchemist's inventory
    this.inventory[ware] = (this.inventory[ware] || 0) + quantity;

    return {
      success: true,
      ware,
      quantity,
      totalPrice,
      pricePerUnit
    };
  }
}
