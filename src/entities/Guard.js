import Phaser from 'phaser';

export class Guard {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 70;
    this.chaseSpeed = 95;
    this.direction = 'down';
    this.isChasing = false;
    this.chaseTarget = null;
    this.patrolTarget = null;
    this.sightRange = 120;
    this.catchRange = 20;

    // AI state
    this.state = 'patrol'; // patrol, investigate, chase
    this.stateTimer = 0;
    this.lastKnownPlayerPos = null;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'guard_down');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(8);
    this.sprite.setData('entity', this);

    // Set initial patrol target
    this.pickNewPatrolTarget();
  }

  update(delta, player) {
    this.stateTimer += delta;

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(delta);
        this.checkForPlayer(player);
        break;
      case 'investigate':
        this.updateInvestigate(delta, player);
        break;
      case 'chase':
        this.updateChase(delta, player);
        break;
    }

    this.updateSprite();
  }

  updatePatrol(delta) {
    if (!this.patrolTarget) {
      this.pickNewPatrolTarget();
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.patrolTarget.x, this.patrolTarget.y
    );

    if (dist < 10) {
      this.sprite.setVelocity(0, 0);
      if (this.stateTimer > 2000) {
        this.pickNewPatrolTarget();
        this.stateTimer = 0;
      }
    } else {
      this.moveToward(this.patrolTarget, this.speed);
    }
  }

  checkForPlayer(player) {
    if (!player) return;

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      player.sprite.x, player.sprite.y
    );

    const infamy = this.scene.registry.get('infamy');

    // Detection based on distance and infamy
    if (dist < this.sightRange) {
      // Higher infamy = easier to spot
      const detectionChance = (infamy / 100) * (1 - dist / this.sightRange);

      if (infamy > 50 || (infamy > 20 && Math.random() < detectionChance * 0.02)) {
        this.startChase(player);
      }
    }
  }

  updateInvestigate(delta, player) {
    if (!this.lastKnownPlayerPos) {
      this.state = 'patrol';
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y
    );

    if (dist < 20) {
      // Reached last known position, look around
      if (this.stateTimer > 5000) {
        this.state = 'patrol';
        this.lastKnownPlayerPos = null;
        this.stateTimer = 0;
      }
    } else {
      this.moveToward(this.lastKnownPlayerPos, this.speed);
    }

    // Check if player is visible again
    if (player) {
      const playerDist = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        player.sprite.x, player.sprite.y
      );
      if (playerDist < this.sightRange * 0.8) {
        this.startChase(player);
      }
    }
  }

  updateChase(delta, player) {
    if (!player) {
      this.state = 'patrol';
      this.isChasing = false;
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      player.sprite.x, player.sprite.y
    );

    // Catch player
    if (dist < this.catchRange) {
      this.catchPlayer(player);
      return;
    }

    // Lost sight
    if (dist > this.sightRange * 1.5) {
      this.lastKnownPlayerPos = { x: player.sprite.x, y: player.sprite.y };
      this.state = 'investigate';
      this.isChasing = false;
      this.stateTimer = 0;
      return;
    }

    // Chase
    this.moveToward(player.sprite, this.chaseSpeed);
    this.lastKnownPlayerPos = { x: player.sprite.x, y: player.sprite.y };
  }

  startChase(player) {
    this.state = 'chase';
    this.isChasing = true;
    this.chaseTarget = player;
    this.stateTimer = 0;
    this.scene.events.emit('guardAlert', this);
  }

  catchPlayer(player) {
    // Player caught by the guard!
    player.takeDamage(3);
    this.state = 'patrol';
    this.isChasing = false;
    this.stateTimer = 0;
    // If this guard was marked as a bounty hunter, resolve the bounty
    try {
      const isBounty = this.sprite.getData && this.sprite.getData('bounty');
      if (isBounty) {
        const currentTown = this.scene.registry.get('currentTownId');
        const bounties = this.scene.registry.get('townBounties') || {};
        const amount = bounties[currentTown] || 0;
        if (amount > 0) {
          // Penalize player by removing some gold (simple resolution) and clear bounty
          try {
            const gold = this.scene.registry.get('gold') || 0;
            const take = Math.min(amount, Math.floor(gold * 0.5) + Math.floor(amount * 0.1));
            this.scene.registry.set('gold', Math.max(0, gold - take));
          } catch (e) {}
          bounties[currentTown] = 0;
          this.scene.registry.set('townBounties', bounties);
          try { this.scene.events.emit('bountyResolved', { townId: currentTown, amount }); } catch (e) {}
          try { this.scene.events.emit('townBountiesChanged', { townId: currentTown, amount: 0 }); } catch (e) {}
        }
      }
    } catch (e) {}
    this.scene.events.emit('playerCaptured');
  }

  moveToward(target, speed) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      target.x, target.y
    );

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.sprite.setVelocity(vx, vy);

    // Update direction based on velocity
    if (Math.abs(vx) > Math.abs(vy)) {
      this.direction = vx > 0 ? 'right' : 'left';
    } else {
      this.direction = vy > 0 ? 'down' : 'up';
    }
  }

  pickNewPatrolTarget() {
    const roadTiles = this.scene.townGenerator.getCobbleTiles();
    if (roadTiles.length > 0) {
      this.patrolTarget = Phaser.Math.RND.pick(roadTiles);
    }
  }

  updateSprite() {
    const texBase = this.isChasing ? 'guard_alert' : 'guard';
    this.sprite.setTexture(`${texBase}_${this.direction}`);
  }
}
