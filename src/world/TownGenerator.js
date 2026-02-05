import Phaser from "phaser";

const TILE_SIZE = 32;

// Tile types for medieval fantasy town
const TILES = {
  // Main roads (cobblestone)
  ROAD: "path", // Using path as base road

  // Paths/Sidewalks
  SIDEWALK: "path",
  ALLEY: "alley",

  // Terrain
  GARDEN: "garden",
  GRASS: "garden",

  // Buildings - main residential (prefer custom houses when available)
  HOUSE_1: "house_custom_1",
  HOUSE_2: "house_custom_2",
  HOUSE_3: "house_custom_3",
  HOUSE_4: "house_custom_1",

  // Buildings - special structures
  BARRACKS: "barracks",
  MONASTERY: "house_custom_1",
  TOWER: "tower",
  ARCHERY: "archery",
  CASTLE: "castle",

  // POI
  WELL: "well_hay",
  CITY_GATE: "city_gate",
  GUILDHALL: "guildhall",
  MARKET_SQUARE: "market_square",
};

// Building sprites array - use the three custom house assets
const HOUSE_SPRITES = [TILES.HOUSE_1, TILES.HOUSE_2, TILES.HOUSE_3];

export class TownGenerator {
  constructor(scene) {
    this.scene = scene;
    // Get theme from registry or default to 'black'
    this.theme = (this.scene.registry.get('townTheme') || 'black').toLowerCase();
    
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

    // Step 4.5b: Designate special buildings (tavern, blacksmith, black market)
    this.designateSpecialBuildings();

    // Step 4.5: Clean up grass tiles adjacent to alleys
    this.cleanupNorthernEdge();

    // Step 5: Add POIs (wells, etc.)
    this.placePOIs();
    
    // Step 6: Connect buildings with paths and remove ALL stray grass tiles
    this.connectBuildingsWithPaths();
    this.finalCleanup();



    // Create tilemap
    return this.createTilemap();
  }

  // Create main alleyways forming a fully interconnected network
  // Uses ALLEY tiles which are visually distinct (dark brown)
  generateThoroughfares() {
    // Main alleyway width (wider for main crossroad)
    const mainAlleyWidth = 4;
    const secondaryAlleyWidth = 2;

    // ═══════════════════════════════════════════════════════════════════════
    // MAIN CROSSROAD - Wide alleyways through center to ALL edges
    // ═══════════════════════════════════════════════════════════════════════

    // Main horizontal alleyway through center (left edge to right edge)
    const mainHorizY =
      Math.floor(this.height / 2) - Math.floor(mainAlleyWidth / 2);
    for (let ay = 0; ay < mainAlleyWidth; ay++) {
      for (let x = 0; x < this.width; x++) {
        if (mainHorizY + ay >= 0 && mainHorizY + ay < this.height) {
          this.grid[mainHorizY + ay][x] = TILES.ALLEY;
        }
      }
    }

    // Main vertical alleyway through center (top edge to bottom edge)
    const mainVertX =
      Math.floor(this.width / 2) - Math.floor(mainAlleyWidth / 2);
    for (let ax = 0; ax < mainAlleyWidth; ax++) {
      for (let y = 0; y < this.height; y++) {
        if (mainVertX + ax >= 0 && mainVertX + ax < this.width) {
          this.grid[y][mainVertX + ax] = TILES.ALLEY;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECONDARY ALLEYWAYS - Connect between main crossroad and edges
    // ═══════════════════════════════════════════════════════════════════════

    // Top horizontal alley (full width)
    const topAlleyY = Math.floor(this.height * 0.25);
    for (let ay = 0; ay < secondaryAlleyWidth; ay++) {
      for (let x = 0; x < this.width; x++) {
        if (topAlleyY + ay >= 0 && topAlleyY + ay < this.height) {
          this.grid[topAlleyY + ay][x] = TILES.ALLEY;
        }
      }
    }

    // Bottom horizontal alley (full width)
    const bottomAlleyY = Math.floor(this.height * 0.75);
    for (let ay = 0; ay < secondaryAlleyWidth; ay++) {
      for (let x = 0; x < this.width; x++) {
        if (bottomAlleyY + ay >= 0 && bottomAlleyY + ay < this.height) {
          this.grid[bottomAlleyY + ay][x] = TILES.ALLEY;
        }
      }
    }

    // Left vertical alley (full height)
    const leftAlleyX = Math.floor(this.width * 0.25);
    for (let ax = 0; ax < secondaryAlleyWidth; ax++) {
      for (let y = 0; y < this.height; y++) {
        if (leftAlleyX + ax >= 0 && leftAlleyX + ax < this.width) {
          this.grid[y][leftAlleyX + ax] = TILES.ALLEY;
        }
      }
    }

    // Right vertical alley (full height)
    const rightAlleyX = Math.floor(this.width * 0.75);
    for (let ax = 0; ax < secondaryAlleyWidth; ax++) {
      for (let y = 0; y < this.height; y++) {
        if (rightAlleyX + ax >= 0 && rightAlleyX + ax < this.width) {
          this.grid[y][rightAlleyX + ax] = TILES.ALLEY;
        }
      }
    }
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
        let minX = x,
          maxX = x,
          minY = y,
          maxY = y;
        const queue = [{ x, y }];
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

          queue.push({ x: current.x + 1, y: current.y });
          queue.push({ x: current.x - 1, y: current.y });
          queue.push({ x: current.x, y: current.y + 1 });
          queue.push({ x: current.x, y: current.y - 1 });
        }

        if (blockTiles.length >= 9) {
          // Minimum block size
          blocks.push({
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            tiles: blockTiles,
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
    return (
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height &&
      this.grid[y][x] === TILES.GRASS
    );
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
        while (
          startX + grassWidth < this.width &&
          this.grid[y][startX + grassWidth] === TILES.GRASS
        ) {
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
        while (
          startY + grassHeight < this.height &&
          this.grid[startY + grassHeight][x] === TILES.GRASS
        ) {
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
      { width: 3, height: 3, passes: 2 }, // 3x3 buildings - main pass
      { width: 2, height: 3, passes: 1 }, // 2x3 buildings - fill gaps
      { width: 3, height: 2, passes: 1 }, // 3x2 buildings - fill gaps
      { width: 2, height: 2, passes: 2 }, // 2x2 buildings - fill remaining gaps
    ];

    // Available house keys for current theme
    const houses = [
      `building_${this.theme}_house1`, 
      `building_${this.theme}_house2`, 
      `building_${this.theme}_house3`
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
                  this.grid[y + py][x + px] = "BUILDING";
                }
              }
              // Reserve a one-tile buffer around the building for walkways
              for (let py = -1; py <= size.height; py++) {
                for (let px = -1; px <= size.width; px++) {
                  const bx = x + px;
                  const by = y + py;
                  if (bx < 0 || bx >= this.width || by < 0 || by >= this.height)
                    continue;
                  // If the surrounding tile is plain grass, convert it to sidewalk to create clear paths
                  if (this.grid[by][bx] === TILES.GRASS) {
                    this.grid[by][bx] = TILES.SIDEWALK;
                  }
                }
              }

              // Store building data
              const sprite = Phaser.Math.RND.pick(houses);
              this.buildingData.push({
                x: (x + size.width / 2) * TILE_SIZE,
                y: (y + size.height / 2) * TILE_SIZE,
                sprite: sprite,
                width: size.width,
                height: size.height,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Designate specific buildings as tavern, blacksmith, and black market.
   * Picks buildings closest to town center and assigns them distinct sprites.
   */
  designateSpecialBuildings() {
    if (this.buildingData.length < 3) return;

    const centerX = (this.width / 2) * TILE_SIZE;
    const centerY = (this.height / 2) * TILE_SIZE;

    // Sort buildings by distance to center
    const sorted = [...this.buildingData].sort((a, b) => {
      const da = Math.abs(a.x - centerX) + Math.abs(a.y - centerY);
      const db = Math.abs(b.x - centerX) + Math.abs(b.y - centerY);
      return da - db;
    });

    // Pick 3 closest buildings that are at least 2 tiles wide (skip tiny ones)
    const candidates = sorted.filter(b => b.width >= 2 && b.height >= 2);
    if (candidates.length < 3) return;

    // Tavern = closest, Blacksmith = 2nd, Black Market = 3rd
    const tavern = candidates[0];
    const blacksmith = candidates[1];
    const blackMarket = candidates[2];

    // Mark with type and assign distinct sprites (using theme)
    tavern.type = 'tavern';
    tavern.sprite = `building_${this.theme}_monastery`; // Using Monastery sprite for tavern
    this.tavernSpots.push({ x: tavern.x, y: tavern.y, width: tavern.width, height: tavern.height, type: 'tavern' });

    blacksmith.type = 'blacksmith';
    blacksmith.sprite = `building_${this.theme}_barracks`; // Using Barracks sprite for blacksmith
    this.marketSquareSpots.push({ x: blacksmith.x, y: blacksmith.y, width: blacksmith.width, height: blacksmith.height, type: 'blacksmith' });

    blackMarket.type = 'blackMarket';
    blackMarket.sprite = `building_${this.theme}_tower`; // Using Tower for Guildhall/BlackMarket
    this.guildhallSpots.push({ x: blackMarket.x, y: blackMarket.y, width: blackMarket.width, height: blackMarket.height, type: 'blackMarket' });
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

    // Ensure a one-tile buffer area around the footprint is available (not another building)
    for (let py = -1; py <= height; py++) {
      for (let px = -1; px <= width; px++) {
        const bx = x + px;
        const by = y + py;
        if (bx < 0 || bx >= this.width || by < 0 || by >= this.height) continue;
        if (this.grid[by][bx] === "BUILDING") return false;
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
      if (y + height < this.height && this.isWalkable(x + px, y + height))
        hasAccess = true;
    }
    // Check left edge
    for (let py = 0; py < height; py++) {
      if (x > 0 && this.isWalkable(x - 1, y + py)) hasAccess = true;
    }
    // Check right edge
    for (let py = 0; py < height; py++) {
      if (x + width < this.width && this.isWalkable(x + width, y + py))
        hasAccess = true;
    }

    return hasAccess;
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.grid[y][x];
    return (
      tile === TILES.ROAD || tile === TILES.SIDEWALK || tile === TILES.ALLEY
    );
  }

  // Place POIs
  placePOIs() {
    // Place wells at intersections
    const wellPositions = [
      { x: Math.floor(this.width / 4), y: Math.floor(this.height / 2) },
      { x: Math.floor((this.width * 3) / 4), y: Math.floor(this.height / 2) },
      { x: Math.floor(this.width / 2), y: Math.floor(this.height / 4) },
      { x: Math.floor(this.width / 2), y: Math.floor((this.height * 3) / 4) },
    ];

    for (const pos of wellPositions) {
      // Find nearest sidewalk/path tile
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const tx = pos.x + dx;
          const ty = pos.y + dy;
          if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            if (
              this.grid[ty][tx] === TILES.SIDEWALK ||
              this.grid[ty][tx] === TILES.ROAD
            ) {
              this.grid[ty][tx] = TILES.WELL;
              this.wellSpots.push({
                x: tx * TILE_SIZE + TILE_SIZE / 2,
                y: ty * TILE_SIZE + TILE_SIZE / 2,
                type: "well",
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
      if (
        this.grid[y][x] === TILES.ALLEY ||
        this.grid[y][x] === TILES.SIDEWALK
      ) {
        this.alchemistSpots.push({
          x: x * TILE_SIZE + TILE_SIZE / 2,
          y: y * TILE_SIZE + TILE_SIZE / 2,
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
              y: y * TILE_SIZE + TILE_SIZE / 2,
            });
          }
        }
      }
      break;
    }
  }

  /**
   * Clean up grass/garden tiles that appear oddly adjacent to alleys.
   * This scans the ENTIRE grid and converts orphaned grass tiles 
   * (adjacent to alleys) to sidewalk tiles for visual consistency.
   * Runs multiple passes to catch cascading isolated tiles.
   */
  cleanupNorthernEdge() {
    // Run multiple passes to catch cascading cleanup needs
    for (let pass = 0; pass < 3; pass++) {
      // Scan entire grid for grass tiles adjacent to alleys
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const tile = this.grid[y][x];
          if (tile !== TILES.GRASS && tile !== TILES.GARDEN) continue;
          
          // Check neighbors to determine if this is an orphan grass tile
          let adjacentAlleyCount = 0;
          let adjacentSidewalkCount = 0;
          let adjacentGrassCount = 0;
          let adjacentBuildingCount = 0;
          
          const neighbors = [
            { dx: 0, dy: -1 },  // above
            { dx: 0, dy: 1 },   // below
            { dx: -1, dy: 0 },  // left
            { dx: 1, dy: 0 }    // right
          ];
          
          for (const n of neighbors) {
            const nx = x + n.dx;
            const ny = y + n.dy;
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            
            const neighborTile = this.grid[ny][nx];
            if (neighborTile === TILES.ALLEY) adjacentAlleyCount++;
            if (neighborTile === TILES.SIDEWALK || neighborTile === TILES.ROAD) adjacentSidewalkCount++;
            if (neighborTile === TILES.GRASS || neighborTile === TILES.GARDEN) adjacentGrassCount++;
            if (neighborTile === 'BUILDING') adjacentBuildingCount++;
          }
          
          // Convert to sidewalk if:
          // 1. Adjacent to an alley AND has few grass/building neighbors (isolated strip)
          // 2. Surrounded mostly by walkable tiles
          // 3. Forms a thin strip (grass on both left-right or top-bottom, but alley on other axis)
          const isIsolatedStrip = adjacentAlleyCount >= 1 && adjacentGrassCount <= 1;
          const isSurroundedByWalkable = (adjacentAlleyCount + adjacentSidewalkCount) >= 3;
          
          // Check for horizontal strip pattern (grass left-right, alley above or below)
          let isHorizontalStrip = false;
          const leftTile = x > 0 ? this.grid[y][x - 1] : null;
          const rightTile = x < this.width - 1 ? this.grid[y][x + 1] : null;
          const aboveTile = y > 0 ? this.grid[y - 1][x] : null;
          const belowTile = y < this.height - 1 ? this.grid[y + 1][x] : null;
          
          // Horizontal strip: grass continues left-right but alley is above or below
          if ((aboveTile === TILES.ALLEY || belowTile === TILES.ALLEY) &&
              (leftTile === TILES.GRASS || leftTile === TILES.GARDEN || 
               rightTile === TILES.GRASS || rightTile === TILES.GARDEN)) {
            // Check if this is a thin strip (only 1-2 tiles tall of grass)
            let grassAbove = 0, grassBelow = 0;
            for (let dy = -1; dy >= -2 && y + dy >= 0; dy--) {
              if (this.grid[y + dy][x] === TILES.GRASS || this.grid[y + dy][x] === TILES.GARDEN) {
                grassAbove++;
              } else break;
            }
            for (let dy = 1; dy <= 2 && y + dy < this.height; dy++) {
              if (this.grid[y + dy][x] === TILES.GRASS || this.grid[y + dy][x] === TILES.GARDEN) {
                grassBelow++;
              } else break;
            }
            // If thin strip (2 or fewer grass tiles vertically), convert
            if (grassAbove + grassBelow <= 2) {
              isHorizontalStrip = true;
            }
          }
          
          if (isIsolatedStrip || isSurroundedByWalkable || isHorizontalStrip) {
            this.grid[y][x] = TILES.SIDEWALK;
          }
        }
      }
    }
  }

  /**
   * Connect each building to the nearest alley/road with a path of sidewalk tiles.
   * This ensures all buildings are fully accessible via walkable paths.
   */
  connectBuildingsWithPaths() {
    for (const building of this.buildingData) {
      // Get building footprint boundaries (tile coordinates)
      const bTileX = Math.floor(building.x / TILE_SIZE);
      const bTileY = Math.floor(building.y / TILE_SIZE);
      const halfW = Math.floor(building.width / 2);
      const halfH = Math.floor(building.height / 2);
      
      // Check each edge for connectivity to an alley
      const edges = [
        { dir: 'up', x: bTileX, y: bTileY - halfH - 1 },
        { dir: 'down', x: bTileX, y: bTileY + halfH + 1 },
        { dir: 'left', x: bTileX - halfW - 1, y: bTileY },
        { dir: 'right', x: bTileX + halfW + 1, y: bTileY }
      ];
      
      let hasAlleyConnection = false;
      for (const e of edges) {
        if (e.x >= 0 && e.x < this.width && e.y >= 0 && e.y < this.height) {
          if (this.grid[e.y][e.x] === TILES.ALLEY) {
            hasAlleyConnection = true;
            break;
          }
        }
      }
      
      // If no direct alley connection, extend sidewalk paths toward nearest alley
      if (!hasAlleyConnection) {
        for (const e of edges) {
          if (e.x < 0 || e.x >= this.width || e.y < 0 || e.y >= this.height) continue;
          
          // Extend a path from this edge toward the nearest alley
          if (e.dir === 'up' || e.dir === 'down') {
            const dy = e.dir === 'up' ? -1 : 1;
            let cy = e.y;
            let pathLength = 0;
            while (cy >= 0 && cy < this.height && pathLength < 10) {
              const tile = this.grid[cy][e.x];
              if (tile === TILES.ALLEY) break;
              if (tile === TILES.GRASS || tile === TILES.GARDEN) {
                this.grid[cy][e.x] = TILES.SIDEWALK;
              }
              cy += dy;
              pathLength++;
            }
          } else {
            const dx = e.dir === 'left' ? -1 : 1;
            let cx = e.x;
            let pathLength = 0;
            while (cx >= 0 && cx < this.width && pathLength < 10) {
              const tile = this.grid[e.y][cx];
              if (tile === TILES.ALLEY) break;
              if (tile === TILES.GRASS || tile === TILES.GARDEN) {
                this.grid[e.y][cx] = TILES.SIDEWALK;
              }
              cx += dx;
              pathLength++;
            }
          }
        }
      }
    }
  }

  /**
   * Final cleanup pass - remove only truly isolated/stray grass tiles.
   * Preserves intentional garden plots around buildings.
   */
  finalCleanup() {
    // Only remove grass tiles that are isolated (surrounded mostly by walkable tiles)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        if (tile !== TILES.GRASS && tile !== TILES.GARDEN) continue;
        
        // Count neighbors
        let walkableNeighbors = 0;
        let grassNeighbors = 0;
        let buildingNeighbors = 0;
        let totalNeighbors = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            
            totalNeighbors++;
            const neighborTile = this.grid[ny][nx];
            if (neighborTile === TILES.SIDEWALK || neighborTile === TILES.ROAD || neighborTile === TILES.ALLEY) {
              walkableNeighbors++;
            }
            if (neighborTile === TILES.GRASS || neighborTile === TILES.GARDEN) {
              grassNeighbors++;
            }
            if (neighborTile === 'BUILDING') {
              buildingNeighbors++;
            }
          }
        }
        
        // Only convert if truly isolated: mostly surrounded by walkable tiles
        // and not adjacent to buildings (which would make it a garden plot)
        if (buildingNeighbors === 0 && grassNeighbors <= 1 && walkableNeighbors >= 3) {
          this.grid[y][x] = TILES.SIDEWALK;
        }
      }
    }
    
    // Explicit fix: remove known stray grass tile at (34, 11)
    if (this.grid[11] && this.grid[11][34] !== undefined) {
      const currentTile = this.grid[11][34];
      if (currentTile === TILES.GRASS || currentTile === TILES.GARDEN || currentTile === 'BUILDING') {
        this.grid[11][34] = TILES.SIDEWALK;
      }
    }
  }


  createTilemap() {
    // 'buildings' group will now hold colliders for garden/grass plots
    const buildings = this.scene.physics.add.staticGroup();

    // Tileset configuration for grass/garden tiles (16x16 tiles)
    const TILESET_KEY = "tilemap_color1";
    const TILESET_TILE_SIZE = 16;
    const TILESET_COLS = 36; // 576px / 16px = 36 columns per row

    // Grass fill tiles (solid interior grass tiles from the tileset)
    // These are the center/fill tiles that look seamless when tiled
    const grassFillFrames = [
      1 + 1 * TILESET_COLS, // (1,1) = 37
      2 + 1 * TILESET_COLS, // (2,1) = 38
      1 + 2 * TILESET_COLS, // (1,2) = 73
      2 + 2 * TILESET_COLS, // (2,2) = 74
    ];

    // Check if tileset is loaded, fallback to old method if not
    const useTileset = this.scene.textures.exists(TILESET_KEY);

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

        // Check if this tile should render as grass/garden
        const isGrassTile =
          tile === "BUILDING" ||
          tile === TILES.GRASS ||
          tile === TILES.GARDEN ||
          tile === TILES.WELL;

        if (isGrassTile && useTileset) {
          // Render 2x2 tileset tiles (16px each) to fill the 32px grid cell
          for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
              const tileX =
                x * TILE_SIZE + tx * TILESET_TILE_SIZE + TILESET_TILE_SIZE / 2;
              const tileY =
                y * TILE_SIZE + ty * TILESET_TILE_SIZE + TILESET_TILE_SIZE / 2;

              // Pick a random grass fill frame for visual variety
              const frameIndex = Phaser.Math.RND.pick(grassFillFrames);

              const sprite = this.scene.add.sprite(
                tileX,
                tileY,
                TILESET_KEY,
                frameIndex,
              );
              sprite.setDepth(0);
            }
          }
        } else {
          // Fallback: use old texture key method for non-grass or if tileset not loaded
          let texKey = tile;

          if (tile === "BUILDING") {
            texKey = "garden";
          } else if (tile === TILES.GRASS) {
            texKey = "garden";
          } else if (tile === TILES.WELL) {
            texKey = "garden";
          }

          // Render ground tile at depth 0
          const sprite = this.scene.add.sprite(worldX, worldY, texKey);
          sprite.setDepth(0);
        }
      }
    }

    // Second pass: render buildings on top (depth 1)
    // NOTE: We intentionally DO NOT add physics bodies to building sprites here.
    // Collisions will instead be applied to garden/grass plots so players can
    // walk cleanly around building visuals while still blocking green plots.
    for (const building of this.buildingData) {
      const sprite = this.scene.add.sprite(
        building.x,
        building.y,
        building.sprite,
      );

      // Scale sprite to fit building footprint
      const targetWidth = building.width * TILE_SIZE;
      const targetHeight = building.height * TILE_SIZE;

      const scaleX = targetWidth / sprite.width;
      const scaleY = targetHeight / sprite.height;
      const scale = Math.min(scaleX, scaleY) * 1.1;

      sprite.setScale(scale);
      sprite.setDepth(1);

      // Add label for special buildings
      if (building.type) {
        let labelText = '';
        if (building.type === 'tavern') labelText = 'Tavern';
        else if (building.type === 'blacksmith') labelText = 'Blacksmith';
        else if (building.type === 'blackMarket') labelText = 'Black Market';

        if (labelText) {
          const label = this.scene.add.text(building.x, building.y - (sprite.displayHeight / 2) - 12, labelText, {
            fontFamily: 'Verdana',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#00000088',
            padding: { x: 6, y: 3 }
          });
          label.setOrigin(0.5);
          label.setDepth(20); // High depth to float above everything
        }
      }
    }

    // Wells removed - no longer rendering well_hay sprites

    // Fourth pass: group adjacent garden/grass tiles into larger colliders.
    // This reduces the number of colliders and avoids many tiny boxes; we
    // also shrink the collision box slightly so it doesn't feel too wide.
    const visited = new Uint8Array(this.width * this.height);
    const groups = [];

    const idx = (xx, yy) => yy * this.width + xx;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (visited[idx(x, y)]) continue;
        const tile = this.grid[y][x];
        if (tile !== TILES.GRASS && tile !== TILES.GARDEN) continue;

        // Flood-fill component
        const q = [{ x, y }];
        visited[idx(x, y)] = 1;
        let minX = x,
          maxX = x,
          minY = y,
          maxY = y;

        while (q.length > 0) {
          const cur = q.shift();
          minX = Math.min(minX, cur.x);
          maxX = Math.max(maxX, cur.x);
          minY = Math.min(minY, cur.y);
          maxY = Math.max(maxY, cur.y);

          const neighbors = [
            { x: cur.x + 1, y: cur.y },
            { x: cur.x - 1, y: cur.y },
            { x: cur.x, y: cur.y + 1 },
            { x: cur.x, y: cur.y - 1 },
          ];

          for (const n of neighbors) {
            if (n.x < 0 || n.x >= this.width || n.y < 0 || n.y >= this.height)
              continue;
            if (visited[idx(n.x, n.y)]) continue;
            const nt = this.grid[n.y][n.x];
            if (nt === TILES.GRASS || nt === TILES.GARDEN) {
              visited[idx(n.x, n.y)] = 1;
              q.push(n);
            }
          }
        }

        groups.push({ minX, maxX, minY, maxY });
      }
    }

    // Create one collider per group, but shrink the body size to avoid feeling too wide
    for (const g of groups) {
      const gx = ((g.minX + g.maxX + 1) / 2) * TILE_SIZE;
      const gy = ((g.minY + g.maxY + 1) / 2) * TILE_SIZE;
      const groupWidth = (g.maxX - g.minX + 1) * TILE_SIZE;
      const groupHeight = (g.maxY - g.minY + 1) * TILE_SIZE;

      // Create a static invisible sprite to act as collider
      const collider = this.scene.physics.add.staticSprite(gx, gy, "garden");
      collider.setAlpha(0);
      collider.setDepth(3);

      // Shrink body to 60% of group size so edges feel less blocking
      const shrinkFactor = 0.6;
      const bodyW = Math.max(8, groupWidth * shrinkFactor);
      const bodyH = Math.max(8, groupHeight * shrinkFactor);

      try {
        collider.body.setSize(bodyW, bodyH);
        // center body (Phaser's static sprites keep origin centered)
        collider.body.setOffset(
          -bodyW / 2 + collider.width / 2,
          -bodyH / 2 + collider.height / 2,
        );
      } catch (e) {
        // some Phaser builds may not expose setOffset; ignore if so
      }

      buildings.add(collider);
    }

    // Fifth pass: create colliders for building footprints so houses block movement.
    // We keep building visuals non-collidable but add an invisible static body
    // matching the building footprint so the player cannot walk through them.
    for (const building of this.buildingData) {
      const worldX = building.x;
      const worldY = building.y;
      const targetWidth = building.width * TILE_SIZE;
      const targetHeight = building.height * TILE_SIZE;

      const bcoll = this.scene.physics.add.staticSprite(
        worldX,
        worldY,
        building.sprite,
      );
      bcoll.setAlpha(0);
      bcoll.setDepth(4);

      // Make collider slightly inset so edges don't feel too wide but still block
      const insetFactor = 0.92;
      const bw = Math.max(8, targetWidth * insetFactor);
      const bh = Math.max(8, targetHeight * insetFactor);
      try {
        bcoll.body.setSize(bw, bh);
        // keep centered; setOffset may not be necessary on all builds
        try {
          bcoll.body.setOffset(
            -bw / 2 + bcoll.width / 2,
            -bh / 2 + bcoll.height / 2,
          );
        } catch (e) {}
      } catch (e) {}

      buildings.add(bcoll);
    }

    return {
      buildings,
      guildhalls: this.guildhallSpots,
      taverns: this.tavernSpots,
      temples: this.templeSpots,
      marketSquares: this.marketSquareSpots,
      wells: this.wellSpots,
      fountains: this.fountainSpots,
    };
  }

  // Getters
  getCobbleTiles() {
    return this.cobbleTiles;
  }
  getPathTiles() {
    return this.pathTiles;
  }
  getAlchemistSpots() {
    return this.alchemistSpots;
  }
  getGuildhallSpots() {
    return this.guildhallSpots;
  }
  getTavernSpots() {
    return this.tavernSpots;
  }
  getTempleSpots() {
    return this.templeSpots;
  }
  getMarketSquareSpots() {
    return this.marketSquareSpots;
  }
  getWellSpots() {
    return this.wellSpots;
  }
  getFountainSpots() {
    return this.fountainSpots;
  }

  // Aliases
  getRoadTiles() {
    return this.cobbleTiles;
  }
  getSidewalkTiles() {
    return this.pathTiles;
  }
  getDealerSpots() {
    return this.alchemistSpots;
  }
  getSafeHouseSpots() {
    return this.guildhallSpots;
  }

  getPlayerSpawnPoint() {
    const centerX = (this.width * TILE_SIZE) / 2;
    const centerY = (this.height * TILE_SIZE) / 2;

    if (this.pathTiles.length > 0) {
      const paths = this.pathTiles.slice();
      paths.sort((a, b) => {
        return (
          Math.abs(a.x - centerX) +
          Math.abs(a.y - centerY) -
          (Math.abs(b.x - centerX) + Math.abs(b.y - centerY))
        );
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
      if (Phaser.Math.RND.frac() < 0.02) {
        // 2% of road tiles
        spawnPoints.push({
          x: tile.x,
          y: tile.y,
          direction: Phaser.Math.RND.pick(["up", "down", "left", "right"]),
        });
      }
    }
    return spawnPoints;
  }

  getVehicleSpawnPoints() {
    return this.getPatrolSpawnPoints();
  }
}
