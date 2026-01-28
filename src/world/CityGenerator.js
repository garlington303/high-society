import Phaser from 'phaser';

const TILE_SIZE = 32;

// Tile types
const TILES = {
  // Road pieces
  ROAD_V_LEFT: 'road_v_left',
  ROAD_V_RIGHT: 'road_v_right',
  ROAD_H_TOP: 'road_h_top',
  ROAD_H_BOTTOM: 'road_h_bottom',

  // Intersections
  ROAD_X_NW: 'road_x_nw',
  ROAD_X_NE: 'road_x_ne',
  ROAD_X_SW: 'road_x_sw',
  ROAD_X_SE: 'road_x_se',

  SIDEWALK: 'sidewalk',
  BUILDING: 'building',
  ALLEY: 'alley',
  GRASS: 'grass',
  STASH: 'stash',
  SAFEHOUSE: 'safehouse'
};

const ROAD_TILES = [
  TILES.ROAD_V_LEFT, TILES.ROAD_V_RIGHT,
  TILES.ROAD_H_TOP, TILES.ROAD_H_BOTTOM,
  TILES.ROAD_X_NW, TILES.ROAD_X_NE, TILES.ROAD_X_SW, TILES.ROAD_X_SE
];

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
    // Road generation tuning: wider roads and larger blocks to make city feel bigger
    this.roadThickness = 2; // number of tiles wide for each road (1 lane each direction)
    this.sidewalkThickness = 3; // number of tiles wide for sidewalks
    this.roadSpacingH = 24; // horizontal road spacing (bigger blocks)
    this.roadSpacingV = 20; // vertical road spacing
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
    const roadSpacingH = this.roadSpacingH;
    const roadSpacingV = this.roadSpacingV;
    // Assuming thickness is 2 for separate lanes
    
    // Horizontal main roads
    for (let y = roadSpacingH; y < this.height; y += roadSpacingH) {
      for (let x = 0; x < this.width; x++) {
        // Top lane (Left-going traffic)
        if (y < this.height) this.grid[y][x] = TILES.ROAD_H_TOP;
        // Bottom lane (Right-going traffic)
        if (y + 1 < this.height) this.grid[y+1][x] = TILES.ROAD_H_BOTTOM;
      }
    }

    // Vertical main roads
    for (let x = roadSpacingV; x < this.width; x += roadSpacingV) {
      for (let y = 0; y < this.height; y++) {
        // Left lane (Down-going traffic)
        if (x < this.width) {
          if (this.grid[y][x] === TILES.ROAD_H_TOP) this.grid[y][x] = TILES.ROAD_X_NW;
          else if (this.grid[y][x] === TILES.ROAD_H_BOTTOM) this.grid[y][x] = TILES.ROAD_X_SW;
          else this.grid[y][x] = TILES.ROAD_V_LEFT;
        }
        
        // Right lane (Up-going traffic)
        if (x + 1 < this.width) {
          const cx = x + 1;
          if (this.grid[y][cx] === TILES.ROAD_H_TOP) this.grid[y][cx] = TILES.ROAD_X_NE;
          else if (this.grid[y][cx] === TILES.ROAD_H_BOTTOM) this.grid[y][cx] = TILES.ROAD_X_SE;
          else this.grid[y][cx] = TILES.ROAD_V_RIGHT;
        }
      }
    }
  }

  isRoadTile(t) {
    return [
      TILES.ROAD_V_LEFT, TILES.ROAD_V_RIGHT,
      TILES.ROAD_H_TOP, TILES.ROAD_H_BOTTOM,
      TILES.ROAD_X_NW, TILES.ROAD_X_NE, TILES.ROAD_X_SW, TILES.ROAD_X_SE
    ].includes(t);
  }

  generateSidewalks() {
    const thickness = this.sidewalkThickness || 2;
    
    // First pass: mark all tiles adjacent to roads
    const adjacentToRoad = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[y][x] === TILES.BUILDING) {
          const neighbors = [
            this.grid[y - 1]?.[x],
            this.grid[y + 1]?.[x],
            this.grid[y]?.[x - 1],
            this.grid[y]?.[x + 1]
          ];

          if (neighbors.some(n => this.isRoadTile(n))) {
            adjacentToRoad.push({ x, y });
          }
        }
      }
    }
    
    for (const tile of adjacentToRoad) {
      this.grid[tile.y][tile.x] = TILES.SIDEWALK;
    }
    
    // Expand sidewalks
    for (let t = 1; t < thickness; t++) {
      const toExpand = [];
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          if (this.grid[y][x] === TILES.BUILDING) {
            const neighbors = [
              this.grid[y - 1]?.[x],
              this.grid[y + 1]?.[x],
              this.grid[y]?.[x - 1],
              this.grid[y]?.[x + 1]
            ];

            if (neighbors.some(n => n === TILES.SIDEWALK)) {
              toExpand.push({ x, y });
            }
          }
        }
      }
      for (const tile of toExpand) {
        this.grid[tile.y][tile.x] = TILES.SIDEWALK;
      }
    }
  }

  generateAlleys() {
    const alleyCount = 8;

    const isWalkable = (tx, ty) => {
      if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return false;
      const t = this.grid[ty][tx];
      return t === TILES.SIDEWALK || this.isRoadTile(t) || t === TILES.ALLEY || t === TILES.GRASS;
    };

    for (let i = 0; i < alleyCount; i++) {
      const attempts = 100;
      for (let a = 0; a < attempts; a++) {
        const x = Phaser.Math.RND.between(3, this.width - 4);
        const y = Phaser.Math.RND.between(3, this.height - 4);

        if (this.grid[y][x] === TILES.BUILDING) {
          const adjacentToWalkable = isWalkable(x-1, y) || isWalkable(x+1, y) || isWalkable(x, y-1) || isWalkable(x, y+1);
          if (!adjacentToWalkable) continue;

          const alleyLength = Phaser.Math.RND.between(2, 3);
          const directions = [];
          if (!isWalkable(x+1, y) && x + alleyLength < this.width) directions.push({ dx: 1, dy: 0 });
          if (!isWalkable(x-1, y) && x - alleyLength >= 0) directions.push({ dx: -1, dy: 0 });
          if (!isWalkable(x, y+1) && y + alleyLength < this.height) directions.push({ dx: 0, dy: 1 });
          if (!isWalkable(x, y-1) && y - alleyLength >= 0) directions.push({ dx: 0, dy: -1 });
          
          if (directions.length === 0) continue;
          const dir = Phaser.Math.RND.pick(directions);

          let valid = true;
          for (let j = 0; j < alleyLength && valid; j++) {
            const ax = x + dir.dx * j;
            const ay = y + dir.dy * j;
            if (ay < 0 || ay >= this.height || ax < 0 || ax >= this.width) valid = false;
            else if (j > 0 && this.grid[ay][ax] !== TILES.BUILDING) valid = false;
          }

          if (valid) {
            for (let j = 0; j < alleyLength; j++) {
              const ax = x + dir.dx * j;
              const ay = y + dir.dy * j;
              this.grid[ay][ax] = TILES.ALLEY;
            }
            const endX = x + dir.dx * (alleyLength - 1);
            const endY = y + dir.dy * (alleyLength - 1);
            this.dealerSpots.push({
              x: endX * TILE_SIZE + TILE_SIZE / 2,
              y: endY * TILE_SIZE + TILE_SIZE / 2
            });
            break;
          }
        }
      }
    }

    // Ensure dealer spots
    while (this.dealerSpots.length < 3) {
      const sidewalks = [];
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === TILES.SIDEWALK) sidewalks.push({ x, y });
        }
      }
      if (sidewalks.length > 0) {
        const spot = Phaser.Math.RND.pick(sidewalks);
        this.dealerSpots.push({
          x: spot.x * TILE_SIZE + TILE_SIZE / 2,
          y: spot.y * TILE_SIZE + TILE_SIZE / 2
        });
      } else break;
    }

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
            if (this.grid[y + py]?.[x + px] !== TILES.BUILDING) valid = false;
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

        if (tile === TILES.BUILDING) {
          const variant = (x + y) % 4;
          texKey = `building_${variant}`;
          const building = this.scene.physics.add.staticSprite(worldX, worldY, texKey);
          buildings.add(building);
          continue;
        }

        // Walkable tiles
        if (this.isRoadTile(tile)) {
          this.roadTiles.push({ x: worldX, y: worldY });
        }

        if (tile === TILES.SIDEWALK || tile === TILES.ALLEY || tile === TILES.GRASS) {
          this.sidewalkTiles.push({ x: worldX, y: worldY });
        }

        if (tile === TILES.SAFEHOUSE) {
          safeHouses.push({ x: worldX, y: worldY });
        }

        const sprite = this.scene.add.sprite(worldX, worldY, texKey);
        sprite.setDepth(0);
      }
    }

    return { buildings, safeHouses };
  }

  getRoadTiles() { return this.roadTiles; }
  getSidewalkTiles() { return this.sidewalkTiles; }
  getDealerSpots() { return this.dealerSpots; }
  getSafeHouseSpots() { return this.safeHouseSpots; }

  getPlayerSpawnPoint() {
    const centerX = (this.width * TILE_SIZE) / 2;
    const centerY = (this.height * TILE_SIZE) / 2;

    if (this.sidewalkTiles && this.sidewalkTiles.length > 0) {
      const sidewalks = this.sidewalkTiles.slice();
      sidewalks.sort((a, b) => {
        return (Math.abs(a.x - centerX) + Math.abs(a.y - centerY)) - (Math.abs(b.x - centerX) + Math.abs(b.y - centerY));
      });
      return sidewalks[0];
    }
    return { x: 400, y: 300 };
  }

  getRoadInfoAt(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return { isRoad: false, isIntersection: false, type: null };
    }

    const tile = this.grid[tileY]?.[tileX];
    const isRoad = this.isRoadTile(tile);
    const isIntersection = [TILES.ROAD_X_NW, TILES.ROAD_X_NE, TILES.ROAD_X_SW, TILES.ROAD_X_SE].includes(tile);
    const isVertical = tile === TILES.ROAD_V_LEFT || tile === TILES.ROAD_V_RIGHT;
    const isHorizontal = tile === TILES.ROAD_H_TOP || tile === TILES.ROAD_H_BOTTOM;

    return { isRoad, isIntersection, type: tile, isVertical, isHorizontal };
  }

  getVehicleSpawnPoints() {
    const spawnPoints = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        if (tile === TILES.ROAD_V_LEFT) {
          // Left lane: Traffic goes DOWN
          spawnPoints.push({ x: worldX, y: worldY, direction: 'down' });
        } else if (tile === TILES.ROAD_V_RIGHT) {
          // Right lane: Traffic goes UP
          spawnPoints.push({ x: worldX, y: worldY, direction: 'up' });
        } else if (tile === TILES.ROAD_H_TOP) {
          // Top lane: Traffic goes LEFT
          spawnPoints.push({ x: worldX, y: worldY, direction: 'left' });
        } else if (tile === TILES.ROAD_H_BOTTOM) {
          // Bottom lane: Traffic goes RIGHT
          spawnPoints.push({ x: worldX, y: worldY, direction: 'right' });
        }
      }
    }
    return spawnPoints;
  }
}
