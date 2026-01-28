import Phaser from 'phaser';

const TILE_SIZE = 32;

/**
 * Pathfinding utility for navigating the city grid
 * Provides waypoint-based navigation for vehicles and pedestrians
 */
export class Pathfinding {
  constructor(cityGenerator) {
    this.cityGenerator = cityGenerator;
    this.grid = cityGenerator.grid;
    this.width = cityGenerator.width;
    this.height = cityGenerator.height;
  }

  /**
   * Get the tile coordinates from world position
   */
  worldToTile(x, y) {
    return {
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE)
    };
  }

  /**
   * Get world position from tile coordinates (center of tile)
   */
  tileToWorld(tileX, tileY) {
    return {
      x: tileX * TILE_SIZE + TILE_SIZE / 2,
      y: tileY * TILE_SIZE + TILE_SIZE / 2
    };
  }

  /**
   * Check if a tile is a road
   */
  isRoad(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }
    const tile = this.grid[tileY]?.[tileX];
    return [
      'road_v_left', 'road_v_right',
      'road_h_top', 'road_h_bottom',
      'road_x_nw', 'road_x_ne', 'road_x_sw', 'road_x_se'
    ].includes(tile);
  }

  /**
   * Check if a tile is a sidewalk or walkable area
   */
  isWalkable(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }
    const tile = this.grid[tileY]?.[tileX];
    return tile === 'sidewalk' || tile === 'alley' || tile === 'grass' || tile === 'safehouse';
  }

  /**
   * Check if a tile is an intersection
   */
  isIntersection(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }
    const tile = this.grid[tileY]?.[tileX];
    return ['road_x_nw', 'road_x_ne', 'road_x_sw', 'road_x_se'].includes(tile);
  }

  /**
   * Get implicit direction allowed for a tile type
   */
  getTileAllowedDirection(tile) {
    if (tile === 'road_v_left') return 'down';
    if (tile === 'road_v_right') return 'up';
    if (tile === 'road_h_top') return 'left';
    if (tile === 'road_h_bottom') return 'right';
    return 'all'; // Intersections etc. allow all
  }

  /**
   * Get adjacent road tiles from current position
   * Returns array of {tileX, tileY, direction}
   */
  getAdjacentRoads(tileX, tileY) {
    const adjacent = [];
    const directions = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' }
    ];

    for (const { dx, dy, dir } of directions) {
      const nx = tileX + dx;
      const ny = tileY + dy;
      if (this.isRoad(nx, ny)) {
        const nextTile = this.grid[ny]?.[nx];
        const allowed = this.getTileAllowedDirection(nextTile);
        
        if (allowed === 'all' || allowed === dir) {
          adjacent.push({ tileX: nx, tileY: ny, direction: dir });
        }
      }
    }

    return adjacent;
  }

  /**
   * Get adjacent walkable tiles from current position
   * Returns array of {tileX, tileY, direction}
   */
  getAdjacentWalkable(tileX, tileY) {
    const adjacent = [];
    const directions = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' }
    ];

    for (const { dx, dy, dir } of directions) {
      const nx = tileX + dx;
      const ny = tileY + dy;
      if (this.isWalkable(nx, ny)) {
        adjacent.push({ tileX: nx, tileY: ny, direction: dir });
      }
    }

    return adjacent;
  }

  /**
   * Apply lane offset - Disabled for 32px separate lane tiles
   */
  applyLaneOffset(worldX, worldY, direction) {
    // With 32px separate lane tiles, the tile center IS the lane center.
    // No offset needed.
    return { x: worldX, y: worldY };
  }

  /**
   * Get the next road waypoint for a vehicle
   * @param {number} worldX - Current world X position
   * @param {number} worldY - Current world Y position
   * @param {string} currentDirection - Current direction (up, down, left, right)
   * @param {boolean} atIntersection - Whether to pick a new direction at intersection
   * @returns {object} - {x, y, direction, isIntersection}
   */
  getNextRoadWaypoint(worldX, worldY, currentDirection, atIntersection = false) {
    const tile = this.worldToTile(worldX, worldY);
    const isIntersection = this.isIntersection(tile.x, tile.y);

    // Get direction deltas
    const directionDeltas = {
      'up': { dx: 0, dy: -1 },
      'down': { dx: 0, dy: 1 },
      'left': { dx: -1, dy: 0 },
      'right': { dx: 1, dy: 0 }
    };

    const opposite = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    // At intersection, potentially pick a new direction
    if (isIntersection && atIntersection) {
      const adjacentRoads = this.getAdjacentRoads(tile.x, tile.y);

      // Filter out the direction we came from
      const validDirs = adjacentRoads.filter(r => r.direction !== opposite[currentDirection]);

      if (validDirs.length > 0) {
        // Weight straight direction more heavily
        const weighted = [];
        for (const dir of validDirs) {
          if (dir.direction === currentDirection) {
            // 60% chance to go straight
            weighted.push(dir, dir, dir);
          } else {
            // 40% chance split between turns
            weighted.push(dir);
          }
        }

        const chosen = Phaser.Math.RND.pick(weighted);
        const worldPos = this.tileToWorld(chosen.tileX, chosen.tileY);
        const lanePos = this.applyLaneOffset(worldPos.x, worldPos.y, chosen.direction);
        return {
          x: lanePos.x,
          y: lanePos.y,
          direction: chosen.direction,
          isIntersection: true
        };
      }
    }

    // Continue in current direction
    const delta = directionDeltas[currentDirection];
    if (delta) {
      const nextTileX = tile.x + delta.dx;
      const nextTileY = tile.y + delta.dy;

      if (this.isRoad(nextTileX, nextTileY)) {
        const worldPos = this.tileToWorld(nextTileX, nextTileY);
        const lanePos = this.applyLaneOffset(worldPos.x, worldPos.y, currentDirection);
        return {
          x: lanePos.x,
          y: lanePos.y,
          direction: currentDirection,
          isIntersection: this.isIntersection(nextTileX, nextTileY)
        };
      } else {
        // Hit a dead end or edge, need to turn around or find alternative
        const adjacentRoads = this.getAdjacentRoads(tile.x, tile.y);
        const validDirs = adjacentRoads.filter(r => r.direction !== currentDirection);

        if (validDirs.length > 0) {
          const chosen = Phaser.Math.RND.pick(validDirs);
          const worldPos = this.tileToWorld(chosen.tileX, chosen.tileY);
          const lanePos = this.applyLaneOffset(worldPos.x, worldPos.y, chosen.direction);
          return {
            x: lanePos.x,
            y: lanePos.y,
            direction: chosen.direction,
            isIntersection: this.isIntersection(chosen.tileX, chosen.tileY)
          };
        }
      }
    }

    // Fallback - stay in place
    const worldPos = this.tileToWorld(tile.x, tile.y);
    const lanePos = this.applyLaneOffset(worldPos.x, worldPos.y, currentDirection);
    return {
      x: lanePos.x,
      y: lanePos.y,
      direction: currentDirection,
      isIntersection: isIntersection
    };
  }

  /**
   * Get the next sidewalk waypoint for a pedestrian
   * @param {number} worldX - Current world X position
   * @param {number} worldY - Current world Y position
   * @param {string} currentDirection - Current direction
   * @param {string} preferredDirection - Preferred direction to continue (optional)
   * @returns {object} - {x, y, direction}
   */
  getNextSidewalkWaypoint(worldX, worldY, currentDirection, preferredDirection = null) {
    const tile = this.worldToTile(worldX, worldY);
    const adjacent = this.getAdjacentWalkable(tile.x, tile.y);

    if (adjacent.length === 0) {
      // No adjacent walkable tiles, stay in place
      const worldPos = this.tileToWorld(tile.x, tile.y);
      return { x: worldPos.x, y: worldPos.y, direction: currentDirection };
    }

    const opposite = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    // Filter out the direction we came from (unless it's the only option)
    let validDirs = adjacent.filter(a => a.direction !== opposite[currentDirection]);
    if (validDirs.length === 0) {
      validDirs = adjacent;
    }

    // Prefer to continue in current direction or preferred direction
    const preferred = preferredDirection || currentDirection;
    const sameDir = validDirs.find(a => a.direction === preferred);

    let chosen;
    if (sameDir && Math.random() < 0.7) {
      // 70% chance to continue in same direction
      chosen = sameDir;
    } else {
      // Pick randomly from valid directions
      chosen = Phaser.Math.RND.pick(validDirs);
    }

    const worldPos = this.tileToWorld(chosen.tileX, chosen.tileY);
    return {
      x: worldPos.x,
      y: worldPos.y,
      direction: chosen.direction
    };
  }

  /**
   * Find the nearest road tile to a world position
   */
  findNearestRoad(worldX, worldY) {
    const tile = this.worldToTile(worldX, worldY);
    let nearest = null;
    let nearestDist = Infinity;

    // Search in expanding squares
    for (let radius = 1; radius < 20; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const checkX = tile.x + dx;
          const checkY = tile.y + dy;

          if (this.isRoad(checkX, checkY)) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = { tileX: checkX, tileY: checkY };
            }
          }
        }
      }

      if (nearest) break;
    }

    if (nearest) {
      return this.tileToWorld(nearest.tileX, nearest.tileY);
    }

    return null;
  }

  /**
   * Find the nearest sidewalk tile to a world position
   */
  findNearestSidewalk(worldX, worldY) {
    const tile = this.worldToTile(worldX, worldY);
    let nearest = null;
    let nearestDist = Infinity;

    for (let radius = 1; radius < 20; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const checkX = tile.x + dx;
          const checkY = tile.y + dy;

          if (this.isWalkable(checkX, checkY)) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = { tileX: checkX, tileY: checkY };
            }
          }
        }
      }

      if (nearest) break;
    }

    if (nearest) {
      return this.tileToWorld(nearest.tileX, nearest.tileY);
    }

    return null;
  }
}
