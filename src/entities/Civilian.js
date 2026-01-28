import Phaser from 'phaser';

const TILE_SIZE = 16;

export class Civilian {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 35 + Math.random() * 15; // 35-50 speed variation
    this.direction = 'down';
    this.variant = Phaser.Math.RND.between(0, 4);

    // AI state
    this.state = 'walk';
    this.stateTimer = 0;

    // Waypoint navigation
    this.currentWaypoint = null;
    this.waypointThreshold = 4;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, `civilian_${this.variant}_down`);
    this.sprite.setDepth(5);
    this.sprite.setData('entity', this);
    this.sprite.body.setCollideWorldBounds(true);

    // Scale civilians to match player/vehicle perceived size
    this.sprite.setScale(0.6);
    // Adjust physics body to match scaled sprite with slight padding
    if (this.sprite.body) {
      const w = Math.max(4, Math.round(this.sprite.displayWidth * 0.9));
      const h = Math.max(4, Math.round(this.sprite.displayHeight * 0.9));
      this.sprite.body.setSize(w, h, true);
    }

    // Prevent walking through buildings
    if (this.scene.map && this.scene.map.buildings) {
      this.scene.physics.add.collider(this.sprite, this.scene.map.buildings);
    }

    // Snap to sidewalk and get initial waypoint
    this.snapToSidewalk();
    this.updateWaypoint();
  }

  snapToSidewalk() {
    // Snap position to center of current tile
    const tileX = Math.floor(this.sprite.x / TILE_SIZE);
    const tileY = Math.floor(this.sprite.y / TILE_SIZE);
    // If current tile is not walkable, find nearest sidewalk
    const pathfinding = this.scene.pathfinding;
    if (pathfinding && !pathfinding.isWalkable(tileX, tileY)) {
      const nearest = pathfinding.findNearestSidewalk(this.sprite.x, this.sprite.y);
      if (nearest) {
        this.sprite.x = nearest.x;
        this.sprite.y = nearest.y;
        return;
      }
    }

    this.sprite.x = tileX * TILE_SIZE + TILE_SIZE / 2;
    this.sprite.y = tileY * TILE_SIZE + TILE_SIZE / 2;
  }

  update(delta) {
    this.stateTimer += delta;

    switch (this.state) {
      case 'walk':
        this.updateWalk(delta);
        break;
      case 'idle':
        this.updateIdle(delta);
        break;
    }

    this.sprite.setTexture(`civilian_${this.variant}_${this.direction}`);
  }

  updateWalk(delta) {
    if (!this.currentWaypoint) {
      this.updateWaypoint();
      return;
    }

    // Calculate distance to waypoint
    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.currentWaypoint.x, this.currentWaypoint.y
    );

    // Reached waypoint?
    if (dist < this.waypointThreshold) {
      // snap to exact waypoint to avoid jitter
      this.sprite.x = this.currentWaypoint.x;
      this.sprite.y = this.currentWaypoint.y;
      this.sprite.setVelocity(0, 0);

      this.direction = this.currentWaypoint.direction;

      // Random chance to stop and idle
      if (Math.random() < 0.1) {
        this.state = 'idle';
        this.stateTimer = 0;
        return;
      }

      // Get next waypoint
      this.updateWaypoint();
      return; // wait until next frame to move toward new waypoint
    }

    // Move toward waypoint
    this.moveTowardWaypoint();
  }

  updateIdle(delta) {
    // Idle for 2-5 seconds
    const idleDuration = 2000 + Math.random() * 3000;
    if (this.stateTimer > idleDuration) {
      this.state = 'walk';
      this.stateTimer = 0;
      this.updateWaypoint();
    }
  }

  updateWaypoint() {
    const pathfinding = this.scene.pathfinding;
    if (!pathfinding) {
      // Fallback to old behavior
      this.pickRandomTarget();
      return;
    }
    // Try to get a sensible next sidewalk waypoint
    const waypoint = pathfinding.getNextSidewalkWaypoint(
      this.sprite.x,
      this.sprite.y,
      this.direction
    );

    if (!waypoint || (waypoint.x === this.sprite.x && waypoint.y === this.sprite.y)) {
      // If no valid next tile, pick a random nearby sidewalk target
      this.pickRandomTarget();
      return;
    }

    this.currentWaypoint = waypoint;
    this.direction = waypoint.direction || this.direction;
  }

  moveTowardWaypoint() {
    if (!this.currentWaypoint) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    // Move based on current direction (grid-aligned movement), but guard against obstacles
    const body = this.sprite.body;
    switch (this.direction) {
      case 'up':
        body.setVelocity(0, -this.speed);
        break;
      case 'down':
        body.setVelocity(0, this.speed);
        break;
      case 'left':
        body.setVelocity(-this.speed, 0);
        break;
      case 'right':
        body.setVelocity(this.speed, 0);
        break;
      default:
        // Fallback smooth movement
        const dx = this.currentWaypoint.x - this.sprite.x;
        const dy = this.currentWaypoint.y - this.sprite.y;
        const angle = Math.atan2(dy, dx);
        body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    }
  }

  // Fallback for when pathfinding not available
  pickRandomTarget() {
    const sidewalks = this.scene.cityGenerator.getSidewalkTiles();
    if (sidewalks.length > 0) {
      const target = Phaser.Math.RND.pick(sidewalks);
      this.currentWaypoint = {
        x: target.x,
        y: target.y,
        direction: this.direction
      };
    }
  }

  // Civilians can witness crimes
  witness(crimeType) {
    const reportChance = {
      'drug_sale': 0.1,
      'sprinting': 0.02,
      'suspicious': 0.05
    };

    if (Math.random() < (reportChance[crimeType] || 0.05)) {
      if (this.scene.heatSystem) this.scene.heatSystem.add(3, 'witnessed');
    }
  }
}
