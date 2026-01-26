import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 100;
    this.sprintSpeed = 160;
    this.direction = 'down';
    this.isMoving = false;
    this.isSprinting = false;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player_down');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setData('entity', this);

    // Sprinting costs heat over time
    this.sprintHeatTimer = 0;
  }

  update(cursors, keys, delta) {
    let vx = 0;
    let vy = 0;
    let newDirection = this.direction;

    // WASD or Arrow keys
    if (cursors.left.isDown || keys.a.isDown) {
      vx = -1;
      newDirection = 'left';
    } else if (cursors.right.isDown || keys.d.isDown) {
      vx = 1;
      newDirection = 'right';
    }

    if (cursors.up.isDown || keys.w.isDown) {
      vy = -1;
      newDirection = 'up';
    } else if (cursors.down.isDown || keys.s.isDown) {
      vy = 1;
      newDirection = 'down';
    }

    // Sprinting
    this.isSprinting = keys.shift.isDown && (vx !== 0 || vy !== 0);
    const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.sprite.setVelocity(vx * currentSpeed, vy * currentSpeed);

    // Update direction and animation
    if (vx !== 0 || vy !== 0) {
      this.isMoving = true;
      if (newDirection !== this.direction) {
        this.direction = newDirection;
      }
      // Toggle walk sprite
      const walkFrame = Math.floor(Date.now() / 200) % 2;
      const texKey = walkFrame === 0 ? `player_${this.direction}` : `player_${this.direction}_walk`;
      this.sprite.setTexture(texKey);
    } else {
      this.isMoving = false;
      this.sprite.setTexture(`player_${this.direction}`);
    }

    // Sprinting generates heat
    if (this.isSprinting) {
      this.sprintHeatTimer += delta;
      if (this.sprintHeatTimer > 2000) {
        this.scene.heatSystem.add(1, 'sprinting');
        this.sprintHeatTimer = 0;
      }
    } else {
      this.sprintHeatTimer = 0;
    }
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  takeDamage(amount) {
    // For now, getting caught just increases heat massively
    this.scene.heatSystem.add(amount * 10, 'caught');

    // Could implement arrest/death later
    if (this.scene.registry.get('heat') >= 100) {
      this.scene.events.emit('busted');
    }
  }
}
