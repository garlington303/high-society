import Phaser from 'phaser';

const TILE_SIZE = 32;

export class Vehicle {
  constructor(scene, x, y, type = 'civilian') {
    this.scene = scene;
    this.type = type;
    this.variant = type === 'civilian' ? Phaser.Math.RND.between(0, 4) : 'police';

    // Movement
    this.speed = type === 'police' ? 120 : Phaser.Math.RND.between(70, 100);
    this.direction = Phaser.Math.RND.pick(['up', 'down', 'left', 'right']);

    // Waypoint navigation
    this.currentWaypoint = null;
    this.waypointThreshold = 4; // Distance to consider waypoint reached
    this.lastIntersectionTime = 0;
    this.intersectionCooldown = 500; // ms before can turn at another intersection

    // AI state
    this.state = 'driving';
    this.stateTimer = 0;
    this.stopDuration = 0;

    // Create sprite
    const textureName = this.getTextureName();
    this.sprite = scene.physics.add.sprite(x, y, textureName);
    this.sprite.setDepth(4);
    this.sprite.setData('entity', this);
    this.sprite.setData('type', 'vehicle');
    // make vehicles visually smaller relative to the world
    this.sprite.setScale(0.8);

    // Keep the spawn position derived from CityGenerator (it's already correct)
    // Just ensure integer coordinates
    // this.snapToRoad(); // logic removed as it overrides correct spawn points with bad lane logic
  }

  getTextureName() {
    // Use explicit direction suffix so sprite texture matches orientation
    const dir = (this.direction === 'up' || this.direction === 'down' || this.direction === 'left' || this.direction === 'right') ? this.direction : 'down';
    if (this.type === 'police') {
      return `car_police_${dir}`;
    }
    return `car_${this.variant}_${dir}`;
  }

  updateSpriteOrientation() {
    // Update texture to match current direction. If directional textures are available
    // they will be used. This is called whenever the vehicle's direction changes.
    const tex = this.getTextureName();
    if (!this.sprite || !tex) return;

    // If the exact directional texture exists, use it and reset rotation
    if (this.scene.textures.exists(tex)) {
      this.sprite.setTexture(tex);
      this.sprite.setAngle(0);
      this.sprite.setFlip(false, false);
      return;
    }

    // Fallbacks: if left/right textures don't exist, reuse an up/down texture and rotate
    const baseDir = (this.direction === 'left' || this.direction === 'right') ? 'up' : 'down';
    const baseTex = this.type === 'police' ? `car_police_${baseDir}` : `car_${this.variant}_${baseDir}`;

    if (this.scene.textures.exists(baseTex)) {
      this.sprite.setTexture(baseTex);
      // rotate 90 degrees for horizontal directions — set targetAngle for smooth interpolation
      if (this.direction === 'left') {
        this.targetAngle = -90;
      } else if (this.direction === 'right') {
        this.targetAngle = 90;
      } else {
        this.targetAngle = 0;
      }
      this.sprite.setFlip(false, false);
      return;
    }

    // Last resort: just set whatever texture key (may show a placeholder)
    this.sprite.setTexture(tex);
    this.sprite.setAngle(0);
    this.sprite.setFlip(false, false);
  }

  snapToRoad() {
    // Snap position to center of current tile, then offset to correct lane
    // Right-hand traffic: vehicles going up/left use left lanes, down/right use right lanes
    const tileX = Math.floor(this.sprite.x / TILE_SIZE);
    const tileY = Math.floor(this.sprite.y / TILE_SIZE);
    
    // Base position at tile center
    let x = tileX * TILE_SIZE + TILE_SIZE / 2;
    let y = tileY * TILE_SIZE + TILE_SIZE / 2;
    
    // Lane offset (small offset to stay in correct lane within 2-tile road)
    const laneOffset = TILE_SIZE * 0.35; // offset from center of road
    
    // Apply lane offset based on direction
    // For vertical roads (up/down): offset horizontally
    // For horizontal roads (left/right): offset vertically
    switch (this.direction) {
      case 'up':
        x -= laneOffset; // drive on left side of road
        break;
      case 'down':
        x += laneOffset; // drive on right side of road
        break;
      case 'left':
        y -= laneOffset; // drive on top side of road
        break;
      case 'right':
        y += laneOffset; // drive on bottom side of road
        break;
    }
    
    this.sprite.x = x;
    this.sprite.y = y;
    this.laneOffset = laneOffset;
  }

  update(delta) {
    this.stateTimer += delta;

    switch (this.state) {
      case 'driving':
        this.updateDriving(delta);
        break;
      case 'stopped':
        this.updateStopped(delta);
        break;
    }

    // Ensure sprite orientation/texture is correct for current direction
    this.updateSpriteOrientation();

    // Smoothly interpolate angle toward targetAngle when using rotated fallback
    try {
      if (this.targetAngle === undefined) this.targetAngle = this.sprite.angle || 0;
      const current = this.sprite.angle || 0;
      const diff = Phaser.Math.Angle.ShortestBetween(current, this.targetAngle);
      const alpha = Math.min(1, 0.12 * (delta / 16));
      const newAngle = current + diff * alpha;
      this.sprite.setAngle(newAngle);
    } catch (e) {}
  }

  updateDriving(delta) {
    if (!this.currentWaypoint) {
      this.updateWaypoint(false);
      return;
    }

    // Calculate distance to waypoint
    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.currentWaypoint.x, this.currentWaypoint.y
    );

    // Reached waypoint?
    if (dist < this.waypointThreshold) {
      // Update direction from waypoint
      this.direction = this.currentWaypoint.direction;
      this.updateSpriteOrientation();

      // At intersection - maybe stop or turn
      if (this.currentWaypoint.isIntersection) {
        const timeSinceLastIntersection = this.stateTimer - this.lastIntersectionTime;

          if (timeSinceLastIntersection > this.intersectionCooldown) {
          this.lastIntersectionTime = this.stateTimer;

          // Small chance to stop at intersection
          if (Math.random() < 0.15) {
            this.state = 'stopped';
            this.stopDuration = Phaser.Math.RND.between(300, 800);
            this.stateTimer = 0;
            this.sprite.setVelocity(0, 0);
            this.updateWaypoint(true); // Pick new direction while stopped
            return;
          }

          // Get new waypoint with potential direction change
          this.updateWaypoint(true);
          // ensure sprite reflects any new direction chosen inside updateWaypoint
          this.updateSpriteOrientation();
        } else {
          // Too soon since last intersection, continue straight
          this.updateWaypoint(false);
        }
      } else {
        // Not at intersection, continue in same direction
        this.updateWaypoint(false);
        this.updateSpriteOrientation();
      }
    }

    // Move toward waypoint
    this.moveTowardWaypoint();
  }

  updateStopped(delta) {
    if (this.stateTimer >= this.stopDuration) {
      this.state = 'driving';
      this.stateTimer = 0;
      this.moveTowardWaypoint();
    }
  }

  updateWaypoint(canTurn) {
    const pathfinding = this.scene.pathfinding;
    if (!pathfinding) {
      // Fallback if pathfinding not available
      this.setDirectionVelocity();
      return;
    }

    const waypoint = pathfinding.getNextRoadWaypoint(
      this.sprite.x,
      this.sprite.y,
      this.direction,
      canTurn
    );

    this.currentWaypoint = waypoint;
    this.direction = waypoint.direction;
    this.updateSpriteOrientation();
  }

  moveTowardWaypoint() {
    if (!this.currentWaypoint) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    // Calculate direction to waypoint
    const dx = this.currentWaypoint.x - this.sprite.x;
    const dy = this.currentWaypoint.y - this.sprite.y;

    // Move based on current direction (keeps movement grid-aligned)
    switch (this.direction) {
      case 'up':
        this.sprite.setVelocity(0, -this.speed);
        break;
      case 'down':
        this.sprite.setVelocity(0, this.speed);
        break;
      case 'left':
        this.sprite.setVelocity(-this.speed, 0);
        break;
      case 'right':
        this.sprite.setVelocity(this.speed, 0);
        break;
      default:
        // Smooth movement toward waypoint if direction unclear
        const angle = Math.atan2(dy, dx);
        this.sprite.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
    }

    // Check bounds
    this.checkBounds();
  }

  setDirectionVelocity() {
    switch (this.direction) {
      case 'up':
        this.sprite.setVelocity(0, -this.speed);
        break;
      case 'down':
        this.sprite.setVelocity(0, this.speed);
        break;
      case 'left':
        this.sprite.setVelocity(-this.speed, 0);
        break;
      case 'right':
        this.sprite.setVelocity(this.speed, 0);
        break;
    }
  }

  checkBounds() {
    const margin = 48;
    const worldWidth = this.scene.worldWidth;
    const worldHeight = this.scene.worldHeight;

    const opposite = {
      'up': 'down',
      'down': 'up',
      'left': 'right',
      'right': 'left'
    };

    let needsTurn = false;

    if (this.sprite.x < margin && this.direction === 'left') {
      this.direction = opposite[this.direction];
      needsTurn = true;
    } else if (this.sprite.x > worldWidth - margin && this.direction === 'right') {
      this.direction = opposite[this.direction];
      needsTurn = true;
    } else if (this.sprite.y < margin && this.direction === 'up') {
      this.direction = opposite[this.direction];
      needsTurn = true;
    } else if (this.sprite.y > worldHeight - margin && this.direction === 'down') {
      this.direction = opposite[this.direction];
      needsTurn = true;
    }

    if (needsTurn) {
      this.updateWaypoint(false);
    }
  }

  hitPlayer(player) {
    if (this.type === 'police') {
      if (this.scene.heatSystem) this.scene.heatSystem.add(15, 'hit_by_police_car');
    }

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      player.sprite.x, player.sprite.y
    );

    // Calculate damage based on vehicle speed and whether player is on the road
    let onRoad = false;
    const pathfinding = this.scene.pathfinding;
    if (pathfinding) {
      const tile = pathfinding.worldToTile(player.sprite.x, player.sprite.y);
      onRoad = pathfinding.isRoad(tile.x, tile.y);
    }

    const baseDamage = Math.max(10, Math.round(this.speed * (onRoad ? 0.6 : 0.2)));
    if (player.takeDamage) player.takeDamage(baseDamage);

    // Knockback
    player.sprite.setVelocity(
      Math.cos(angle) * 200,
      Math.sin(angle) * 200
    );
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
