import Phaser from 'phaser';

const TILE_SIZE = 32;

// Tile types for medieval fantasy town
const TILES = {
  // Main roads (cobblestone)
  ROAD: 'path',  // Using path as base road
  
  // Paths/Sidewalks
  SIDEWALK: 'path',
  ALLEY: 'alley',
  
  // Terrain
  GARDEN: 'garden',
  GRASS: 'garden',
  
  // Buildings
  HOUSE_1: 'house_hay_1',
  HOUSE_2: 'house_hay_2', 
  HOUSE_3: 'house_hay_3',
  HOUSE_4: 'house_hay_4',
  
  // POI
  WELL: 'well_hay',
  CITY_GATE: 'city_gate',
  GUILDHALL: 'guildhall',
  MARKET_SQUARE: 'market_square'
};

// Building sprites array
const HOUSE_SPRITES = [TILES.HOUSE_1, TILES.HOUSE_2, TILES.HOUSE_3, TILES.HOUSE_4];

export class TownGenerator {
  constructor(scene) {
    this.scene = scene;
    this.width = Math.floor(scene.worldWidth / TILE_SIZE);
    this.height = Math.floor(scene.worldHeight / TILE_SIZE);
    this.grid = [];
    this.buildingData = [];
    this.cobbleTiles = [];
    this.pathTiles = [];
    this.alchemistSpots = [];
    this.guildhallSpots = [];
    this.wellSpots = [];
    this.tavernSpots = [];
    this.templeSpots = [];
    this.marketSquareSpots = [];
    this.fountainSpots = [];
  }

  generate() {
    // Initialize grid with grass
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = TILES.GRASS;
      }
    }

    // Step 1: Create main thoroughfares (major roads)
    this.generateThoroughfares();
    
    // Step 2: Create building blocks with sidewalks
    this.generateBuildingBlocks();
    
    // Step 3: Add back alleys between buildings
    this.generateBackAlleys();
    
    // Step 4: Place buildings in organized rows
    this.placeBuildings();
    
    // Step 5: Add POIs (wells, etc.)
    this.placePOIs();

    // Create tilemap
    return this.createTilemap();
  }
  
  // Create main roads forming crossroads and T-intersections
  generateThoroughfares() {
    // Main horizontal thoroughfare (center)
    const mainHorizontalY = Math.floor(this.height / 2);
    this.drawRoad(0, mainHorizontalY, this.width, 2, 'horizontal');
    
    // Secondary horizontal roads
    const topRoadY = Math.floor(this.height / 4);
    const bottomRoadY = Math.floor(this.height * 3 / 4);
    this.drawRoad(0, topRoadY, this.width, 2, 'horizontal');
    this.drawRoad(0, bottomRoadY, this.width, 2, 'horizontal');
    
    // Main vertical thoroughfare (center)
    const mainVerticalX = Math.floor(this.width / 2);
    this.drawRoad(mainVerticalX, 0, 2, this.height, 'vertical');
    
    // Secondary vertical roads for T-intersections
    const leftRoadX = Math.floor(this.width / 4);
    const rightRoadX = Math.floor(this.width * 3 / 4);
    
    // Left road - T intersection (doesn't go all the way)
    this.drawRoad(leftRoadX, topRoadY, 2, bottomRoadY - topRoadY + 2, 'vertical');
    
    // Right road - full length
    this.drawRoad(rightRoadX, 0, 2, this.height, 'vertical');
  }
  
  // Draw a road segment
  drawRoad(startX, startY, width, height, direction) {
    for (let y = startY; y < startY + height && y < this.height; y++) {
      for (let x = startX; x < startX + width && x < this.width; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          this.grid[y][x] = TILES.ROAD;
        }
      }
    }
  }
  
  // Create building blocks with sidewalks
  generateBuildingBlocks() {
    // Find rectangular areas between roads
    const blocks = this.findBlocks();
    
    for (const block of blocks) {
      // Add sidewalk border around the block
      this.addSidewalkBorder(block);
    }
  }
  
  // Find areas between roads
  findBlocks() {
    const blocks = [];
    const visited = new Set();
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (this.grid[y][x] !== TILES.GRASS) continue;
        
        // Flood fill to find block extent
        let minX = x, maxX = x, minY = y, maxY = y;
        const queue = [{x, y}];
        const blockTiles = [];
        
        while (queue.length > 0) {
          const current = queue.shift();
          const ck = `${current.x},${current.y}`;
          if (visited.has(ck)) continue;
          if (current.x < 0 || current.x >= this.width) continue;
          if (current.y < 0 || current.y >= this.height) continue;
          if (this.grid[current.y][current.x] !== TILES.GRASS) continue;
          
          visited.add(ck);
          blockTiles.push(current);
          
          minX = Math.min(minX, current.x);
          maxX = Math.max(maxX, current.x);
          minY = Math.min(minY, current.y);
          maxY = Math.max(maxY, current.y);
          
          queue.push({x: current.x + 1, y: current.y});
          queue.push({x: current.x - 1, y: current.y});
          queue.push({x: current.x, y: current.y + 1});
          queue.push({x: current.x, y: current.y - 1});
        }
        
        if (blockTiles.length >= 9) { // Minimum block size
          blocks.push({
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            tiles: blockTiles
          });
        }
      }
    }
    
    return blocks;
  }
  
  // Add sidewalk border around a block
  addSidewalkBorder(block) {
    const { x, y, width, height } = block;
    
    // Top sidewalk
    for (let px = x; px < x + width; px++) {
      if (this.isValidAndGrass(px, y)) {
        this.grid[y][px] = TILES.SIDEWALK;
      }
    }
    
    // Bottom sidewalk
    for (let px = x; px < x + width; px++) {
      if (this.isValidAndGrass(px, y + height - 1)) {
        this.grid[y + height - 1][px] = TILES.SIDEWALK;
      }
    }
    
    // Left sidewalk
    for (let py = y; py < y + height; py++) {
      if (this.isValidAndGrass(x, py)) {
        this.grid[py][x] = TILES.SIDEWALK;
      }
    }
    
    // Right sidewalk
    for (let py = y; py < y + height; py++) {
      if (this.isValidAndGrass(x + width - 1, py)) {
        this.grid[py][x + width - 1] = TILES.SIDEWALK;
      }
    }
  }
  
  isValidAndGrass(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && 
           this.grid[y][x] === TILES.GRASS;
  }
  
  // Create back alleys between building rows
  generateBackAlleys() {
    // Find blocks again and add alleys through centers
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== TILES.GRASS) continue;
        
        // Check if we're in the middle of a large grass area
        let grassWidth = 0;
        let startX = x;
        while (startX + grassWidth < this.width && this.grid[y][startX + grassWidth] === TILES.GRASS) {
          grassWidth++;
        }
        
        // If wide enough, add a vertical alley in the center
        if (grassWidth >= 6) {
          const alleyX = startX + Math.floor(grassWidth / 2);
          if (this.grid[y][alleyX] === TILES.GRASS) {
            this.grid[y][alleyX] = TILES.ALLEY;
          }
        }
      }
    }
    
    // Add horizontal alleys
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[y][x] !== TILES.GRASS) continue;
        
        let grassHeight = 0;
        let startY = y;
        while (startY + grassHeight < this.height && this.grid[startY + grassHeight][x] === TILES.GRASS) {
          grassHeight++;
        }
        
        if (grassHeight >= 6) {
          const alleyY = startY + Math.floor(grassHeight / 2);
          if (this.grid[alleyY][x] === TILES.GRASS) {
            this.grid[alleyY][x] = TILES.ALLEY;
          }
        }
      }
    }
  }
  
  // Place buildings in organized rows within blocks
  placeBuildings() {
    // Multiple passes with different building sizes to maximize density
    const buildingSizes = [
      { width: 3, height: 3, passes: 2 },  // 3x3 buildings - main pass
      { width: 2, height: 3, passes: 1 },  // 2x3 buildings - fill gaps
      { width: 3, height: 2, passes: 1 },  // 3x2 buildings - fill gaps
      { width: 2, height: 2, passes: 2 }   // 2x2 buildings - fill remaining gaps
    ];
    
    for (const size of buildingSizes) {
      for (let pass = 0; pass < size.passes; pass++) {
        // Scan the entire grid looking for placement opportunities
        for (let y = 0; y < this.height - size.height; y++) {
          for (let x = 0; x < this.width - size.width; x++) {
            // Try to place a building here
            if (this.canPlaceBuilding(x, y, size.width, size.height)) {
              // Mark tiles as occupied
              for (let py = 0; py < size.height; py++) {
                for (let px = 0; px < size.width; px++) {
                  this.grid[y + py][x + px] = 'BUILDING';
                }
              }
              
              // Store building data
              const sprite = Phaser.Math.RND.pick(HOUSE_SPRITES);
              this.buildingData.push({
                x: (x + size.width / 2) * TILE_SIZE,
                y: (y + size.height / 2) * TILE_SIZE,
                sprite: sprite,
                width: size.width,
                height: size.height
              });
            }
          }
        }
      }
    }
  }
  
  canPlaceBuilding(x, y, width, height) {
    // Check all tiles in the footprint
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const tx = x + px;
        const ty = y + py;
        
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) {
          return false;
        }
        
        const tile = this.grid[ty][tx];
        // Only place on grass tiles
        if (tile !== TILES.GRASS && tile !== TILES.GARDEN) {
          return false;
        }
      }
    }
    
    // Check that at least one edge is adjacent to a path/road
    let hasAccess = false;
    
    // Check top edge
    for (let px = 0; px < width; px++) {
      if (y > 0 && this.isWalkable(x + px, y - 1)) hasAccess = true;
    }
    // Check bottom edge
    for (let px = 0; px < width; px++) {
      if (y + height < this.height && this.isWalkable(x + px, y + height)) hasAccess = true;
    }
    // Check left edge
    for (let py = 0; py < height; py++) {
      if (x > 0 && this.isWalkable(x - 1, y + py)) hasAccess = true;
    }
    // Check right edge
    for (let py = 0; py < height; py++) {
      if (x + width < this.width && this.isWalkable(x + width, y + py)) hasAccess = true;
    }
    
    return hasAccess;
  }
  
  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.grid[y][x];
    return tile === TILES.ROAD || tile === TILES.SIDEWALK || tile === TILES.ALLEY;
  }
  
  // Place POIs
  placePOIs() {
    // Place wells at intersections
    const wellPositions = [
      { x: Math.floor(this.width / 4), y: Math.floor(this.height / 2) },
      { x: Math.floor(this.width * 3 / 4), y: Math.floor(this.height / 2) },
      { x: Math.floor(this.width / 2), y: Math.floor(this.height / 4) },
      { x: Math.floor(this.width / 2), y: Math.floor(this.height * 3 / 4) }
    ];
    
    for (const pos of wellPositions) {
      // Find nearest sidewalk/path tile
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const tx = pos.x + dx;
          const ty = pos.y + dy;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            if (this.grid[ty][tx] === TILES.SIDEWALK || this.grid[ty][tx] === TILES.ROAD) {
              this.grid[ty][tx] = TILES.WELL;
              this.wellSpots.push({
                x: tx * TILE_SIZE + TILE_SIZE / 2,
                y: ty * TILE_SIZE + TILE_SIZE / 2,
                type: 'well'
              });
              break;
            }
          }
        }
        if (this.wellSpots.length > wellPositions.indexOf(pos)) break;
      }
    }
    
    // Create alchemist spots (for NPCs)
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.RND.between(3, this.width - 4);
      const y = Phaser.Math.RND.between(3, this.height - 4);
      if (this.grid[y][x] === TILES.ALLEY || this.grid[y][x] === TILES.SIDEWALK) {
        this.alchemistSpots.push({
          x: x * TILE_SIZE + TILE_SIZE / 2,
          y: y * TILE_SIZE + TILE_SIZE / 2
        });
      }
    }
    
    // Ensure minimum alchemist spots
    while (this.alchemistSpots.length < 3) {
      for (let y = 0; y < this.height && this.alchemistSpots.length < 3; y++) {
        for (let x = 0; x < this.width && this.alchemistSpots.length < 3; x++) {
          if (this.grid[y][x] === TILES.SIDEWALK) {
            this.alchemistSpots.push({
              x: x * TILE_SIZE + TILE_SIZE / 2,
              y: y * TILE_SIZE + TILE_SIZE / 2
            });
          }
        }
      }
      break;
    }
  }

  createTilemap() {
    const buildings = this.scene.physics.add.staticGroup();

    // First pass: render ALL ground tiles (including under buildings)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldY = y * TILE_SIZE + TILE_SIZE / 2;

        // Track walkable tiles
        if (tile === TILES.ROAD || tile === TILES.SIDEWALK) {
          this.pathTiles.push({ x: worldX, y: worldY });
          this.cobbleTiles.push({ x: worldX, y: worldY });
        }

        if (tile === TILES.ALLEY) {
          this.pathTiles.push({ x: worldX, y: worldY });
        }
        
        // For well tiles, track as walkable but render separately
        if (tile === TILES.WELL) {
          this.pathTiles.push({ x: worldX, y: worldY });
        }
        
        // Determine ground texture
        let texKey = tile;
        
        // For building tiles, render grass underneath
        if (tile === 'BUILDING') {
          texKey = 'garden';
        }
        // For grass tiles, use garden texture
        else if (tile === TILES.GRASS) {
          texKey = 'garden';
        }
        // For well tiles, render grass underneath (well sprite comes later)
        else if (tile === TILES.WELL) {
          texKey = 'garden';
        }
        
        // Render ground tile at depth 0
        const sprite = this.scene.add.sprite(worldX, worldY, texKey);
        sprite.setDepth(0);
      }
    }
    
    // Second pass: render buildings on top (depth 1)
    for (const building of this.buildingData) {
      const sprite = this.scene.add.sprite(building.x, building.y, building.sprite);
      
      // Scale sprite to fit building footprint
      const targetWidth = building.width * TILE_SIZE;
      const targetHeight = building.height * TILE_SIZE;
      
      const scaleX = targetWidth / sprite.width;
      const scaleY = targetHeight / sprite.height;
      const scale = Math.min(scaleX, scaleY) * 1.1;
      
      sprite.setScale(scale);
      sprite.setDepth(1);
      
      // Add physics body for collision
      const physicsSprite = this.scene.physics.add.staticSprite(building.x, building.y, building.sprite);
      physicsSprite.setScale(scale * 0.7);
      physicsSprite.setAlpha(0);
      physicsSprite.body.setSize(targetWidth * 0.7, targetHeight * 0.7);
      buildings.add(physicsSprite);
    }
    
    // Third pass: render wells on top (depth 2)
    for (const wellSpot of this.wellSpots) {
      const wellSprite = this.scene.add.sprite(wellSpot.x, wellSpot.y, 'well_hay');
      wellSprite.setScale(1.2);
      wellSprite.setDepth(2);
    }

    return { 
      buildings, 
      guildhalls: this.guildhallSpots,
      taverns: this.tavernSpots,
      temples: this.templeSpots,
      marketSquares: this.marketSquareSpots,
      wells: this.wellSpots,
      fountains: this.fountainSpots
    };
  }

  // Getters
  getCobbleTiles() { return this.cobbleTiles; }
  getPathTiles() { return this.pathTiles; }
  getAlchemistSpots() { return this.alchemistSpots; }
  getGuildhallSpots() { return this.guildhallSpots; }
  getTavernSpots() { return this.tavernSpots; }
  getTempleSpots() { return this.templeSpots; }
  getMarketSquareSpots() { return this.marketSquareSpots; }
  getWellSpots() { return this.wellSpots; }
  getFountainSpots() { return this.fountainSpots; }

  // Aliases
  getRoadTiles() { return this.cobbleTiles; }
  getSidewalkTiles() { return this.pathTiles; }
  getDealerSpots() { return this.alchemistSpots; }
  getSafeHouseSpots() { return this.guildhallSpots; }

  getPlayerSpawnPoint() {
    const centerX = (this.width * TILE_SIZE) / 2;
    const centerY = (this.height * TILE_SIZE) / 2;

    if (this.pathTiles.length > 0) {
      const paths = this.pathTiles.slice();
      paths.sort((a, b) => {
        return (Math.abs(a.x - centerX) + Math.abs(a.y - centerY)) - 
               (Math.abs(b.x - centerX) + Math.abs(b.y - centerY));
      });
      return paths[0];
    }
    return { x: centerX, y: centerY };
  }

  getRoadInfoAt(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return { isRoad: false, isIntersection: false, type: null };
    }
    const tile = this.grid[tileY]?.[tileX];
    const isRoad = tile === TILES.ROAD || tile === TILES.SIDEWALK;
    return { isRoad, isIntersection: false, type: tile };
  }

  getPatrolSpawnPoints() {
    const spawnPoints = [];
    // Spawn guards on roads
    for (const tile of this.cobbleTiles) {
      if (Phaser.Math.RND.frac() < 0.02) { // 2% of road tiles
        spawnPoints.push({ 
          x: tile.x, 
          y: tile.y, 
          direction: Phaser.Math.RND.pick(['up', 'down', 'left', 'right']) 
        });
      }
    }
    return spawnPoints;
  }

  getVehicleSpawnPoints() { return this.getPatrolSpawnPoints(); }
}
