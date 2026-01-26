import Phaser from 'phaser';

const TILE_SIZE = 16;

// Tile types
const TILES = {
  ROAD_V: 'road',
  ROAD_H: 'road_h',
  ROAD_X: 'road_cross',
  SIDEWALK: 'sidewalk',
  BUILDING: 'building',
  ALLEY: 'alley',
  GRASS: 'grass',
  STASH: 'stash',
  SAFEHOUSE: 'safehouse'
};

export class CityGenerator {
  constructor(scene) {
    this.scene = scene;
    this.width = Math.floor(scene.worldWidth / TILE_SIZE);
    this.height = Math.floor(scene.worldHeight / TILE_SIZE);
    this.grid = [];
    this.roadTiles = [];
    this.sidewalkTiles = [];
    this.dealerSpots = [];
    this.safeHouseSpots = [];
  }

  generate() {
    // Initialize grid
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = TILES.BUILDING;
      }
    }

    // Generate road network
    this.generateRoads();

    // Add sidewalks
    this.generateSidewalks();

    // Add alleys and special locations
    this.generateAlleys();

    // Add parks
    this.generateParks();

    // Create tilemap
    return this.createTilemap();
  }

  generateRoads() {
    // Main grid roads
    const roadSpacingH = 12; // Horizontal roads every N tiles
    const roadSpacingV = 10; // Vertical roads every N tiles

    // Horizontal main roads
    for (let y = roadSpacingH; y < this.height; y += roadSpacingH) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = TILES.ROAD_H;
        this.grid[y + 1] = this.grid[y + 1] || [];
        if (y + 1 < this.height) {
          this.grid[y + 1][x] = TILES.ROAD_H;
        }
      }
    }

    // Vertical main roads
    for (let x = roadSpacingV; x < this.width; x += roadSpacingV) {
      for (let y = 0; y < this.height; y++) {
        // Check for intersection
        if (this.grid[y][x] === TILES.ROAD_H) {
          this.grid[y][x] = TILES.ROAD_X;
          if (x + 1 < this.width) this.grid[y][x + 1] = TILES.ROAD_X;
        } else {
          this.grid[y][x] = TILES.ROAD_V;
          if (x + 1 < this.width) {
            this.grid[y][x + 1] = TILES.ROAD_V;
          }
        }
      }
    }
  }

  generateSidewalks() {
    // Add sidewalks adjacent to roads
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] === TILES.BUILDING) {
          // Check if adjacent to road
          const neighbors = [
            this.grid[y - 1]?.[x],
            this.grid[y + 1]?.[x],
            this.grid[y]?.[x - 1],
            this.grid[y]?.[x + 1]
          ];

          const adjacentToRoad = neighbors.some(n =>
            n === TILES.ROAD_V || n === TILES.ROAD_H || n === TILES.ROAD_X
          );

          if (adjacentToRoad) {
            this.grid[y][x] = TILES.SIDEWALK;
          }
        }
      }
    }
  }

  generateAlleys() {
    // Add alleys between buildings (potential dealer spots)
    const alleyCount = 8;

    for (let i = 0; i < alleyCount; i++) {
      const attempts = 50;
      for (let a = 0; a < attempts; a++) {
        const x = Phaser.Math.RND.between(3, this.width - 4);
        const y = Phaser.Math.RND.between(3, this.height - 4);

        // Find a building tile not adjacent to road
        if (this.grid[y][x] === TILES.BUILDING) {
          // Create small alley
          const alleyLength = Phaser.Math.RND.between(2, 4);
          const vertical = Math.random() > 0.5;

          let valid = true;
          for (let j = 0; j < alleyLength && valid; j++) {
            const ax = vertical ? x : x + j;
            const ay = vertical ? y + j : y;

            if (ay >= this.height || ax >= this.width) {
              valid = false;
            } else if (this.grid[ay][ax] !== TILES.BUILDING) {
              valid = false;
            }
          }

          if (valid) {
            for (let j = 0; j < alleyLength; j++) {
              const ax = vertical ? x : x + j;
              const ay = vertical ? y + j : y;
              this.grid[ay][ax] = TILES.ALLEY;
            }

            // Mark middle of alley as dealer spot
            const midX = vertical ? x : x + Math.floor(alleyLength / 2);
            const midY = vertical ? y + Math.floor(alleyLength / 2) : y;
            this.dealerSpots.push({
              x: midX * TILE_SIZE + TILE_SIZE / 2,
              y: midY * TILE_SIZE + TILE_SIZE / 2
            });

            break;
          }
        }
      }
    }

    // Ensure at least 3 dealer spots
    while (this.dealerSpots.length < 3) {
      const sidewalks = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === TILES.SIDEWALK) {
            sidewalks.push({ x, y });
          }
        }
      }
      if (sidewalks.length > 0) {
        const spot = Phaser.Math.RND.pick(sidewalks);
        this.dealerSpots.push({
          x: spot.x * TILE_SIZE + TILE_SIZE / 2,
          y: spot.y * TILE_SIZE + TILE_SIZE / 2
        });
      } else {
        break;
      }
    }

    // Add safe houses
    this.generateSafeHouses();
  }

  generateSafeHouses() {
    const safeHouseCount = 2;

    for (let i = 0; i < safeHouseCount; i++) {
      const attempts = 30;
      for (let a = 0; a < attempts; a++) {
        const x = Phaser.Math.RND.between(2, this.width - 3);
        const y = Phaser.Math.RND.between(2, this.height - 3);

        if (this.grid[y][x] === TILES.BUILDING) {
          this.grid[y][x] = TILES.SAFEHOUSE;
          this.safeHouseSpots.push({
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2
          });
          break;
        }
      }
    }
  }

  generateParks() {
    // Add a few small parks
    const parkCount = 3;

    for (let i = 0; i < parkCount; i++) {
      const attempts = 30;
      for (let a = 0; a < attempts; a++) {
        const x = Phaser.Math.RND.between(4, this.width - 8);
        const y = Phaser.Math.RND.between(4, this.height - 8);
        const size = Phaser.Math.RND.between(3, 5);

        let valid = true;
        for (let py = 0; py < size && valid; py++) {
          for (let px = 0; px < size && valid; px++) {
            if (this.grid[y + py]?.[x + px] !== TILES.BUILDING) {
              valid = false;
            }
          }
        }

        if (valid) {
          for (let py = 0; py < size; py++) {
            for (let px = 0; px < size; px++) {
              this.grid[y + py][x + px] = TILES.GRASS;
            }
          }
          break;
        }
      }
    }
  }

  createTilemap() {
    const buildings = this.scene.physics.add.staticGroup();
    const safeHouses = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        let texKey = tile;

        // Handle building variants
        if (tile === TILES.BUILDING) {
          const variant = (x + y) % 4;
          texKey = `building_${variant}`;

          // Buildings are collidable
          const building = this.scene.physics.add.staticSprite(worldX, worldY, texKey);
          buildings.add(building);
          continue;
        }

        // Track walkable tiles
        if (tile === TILES.ROAD_V || tile === TILES.ROAD_H || tile === TILES.ROAD_X) {
          this.roadTiles.push({ x: worldX, y: worldY });
        }

        if (tile === TILES.SIDEWALK || tile === TILES.ALLEY || tile === TILES.GRASS) {
          this.sidewalkTiles.push({ x: worldX, y: worldY });
        }

        // Safe houses
        if (tile === TILES.SAFEHOUSE) {
          safeHouses.push({ x: worldX, y: worldY });
        }

        // Create sprite
        const sprite = this.scene.add.sprite(worldX, worldY, texKey);
        sprite.setDepth(0);
      }
    }

    return {
      buildings,
      safeHouses
    };
  }

  getRoadTiles() {
    return this.roadTiles;
  }

  getSidewalkTiles() {
    return this.sidewalkTiles;
  }

  getDealerSpots() {
    return this.dealerSpots;
  }

  getSafeHouseSpots() {
    return this.safeHouseSpots;
  }
}
