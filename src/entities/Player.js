import Phaser from 'phaser';

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 100;
    this.sprintSpeed = 160;
    this.direction = 'down';
    this.isMoving = false;
    this.isSprinting = false;

    // Health
    this.maxHealth = 100;
    this.health = this.maxHealth;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player_down');
    // scale player smaller so city feels larger
    this.sprite.setScale(0.6);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setData('entity', this);

    // When true, an external controller drives movement instead
    this.disableManualInput = false;

    // Sprinting costs heat over time
    this.sprintHeatTimer = 0;
  }

  update(cursors, keys, delta) {
    // If external input is controlling movement, derive animation from current velocity
    if (this.disableManualInput) {
      const vx = this.sprite.body.velocity.x;
      const vy = this.sprite.body.velocity.y;
      if (vx !== 0 || vy !== 0) {
        this.isMoving = true;
        // Determine primary direction for sprite
        if (Math.abs(vx) > Math.abs(vy)) {
          this.direction = vx > 0 ? 'right' : 'left';
        } else {
          this.direction = vy > 0 ? 'down' : 'up';
        }
        const walkFrame = Math.floor(Date.now() / 200) % 2;
        const texKey = walkFrame === 0 ? `player_${this.direction}` : `player_${this.direction}_walk`;
        this.sprite.setTexture(texKey);
      } else {
        this.isMoving = false;
        this.sprite.setTexture(`player_${this.direction}`);
      }
      // Skip default input handling
      return;
    }

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
        if (this.scene.heatSystem) this.scene.heatSystem.add(1, 'sprinting');
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
    // Reduce health
    this.health = Math.max(0, this.health - amount);

    // Notify systems/UI
    this.scene.events.emit('playerDamaged', {
      amount,
      health: this.health,
      maxHealth: this.maxHealth,
      x: this.sprite.x,
      y: this.sprite.y
    });

    // Add heat as well (being hit attracts attention)
    if (this.scene.heatSystem) this.scene.heatSystem.add(Math.ceil(amount / 5), 'hit_by_vehicle');

    // Death
    if (this.health <= 0) {
      this.scene.events.emit('playerDied', { x: this.sprite.x, y: this.sprite.y });
      // disable movement
      this.sprite.setVelocity(0, 0);
      this.sprite.setTint(0x550000);
      this.sprite.body.enable = false;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.events.emit('playerHealed', { health: this.health, maxHealth: this.maxHealth });
  }
}
