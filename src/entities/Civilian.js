import Phaser from 'phaser';

export class Civilian {
  constructor(scene, x, y) {
    this.scene = scene;
    this.speed = 40;
    this.direction = 'down';
    this.variant = Phaser.Math.RND.between(0, 4);

    // AI state
    this.state = 'walk'; // walk, idle
    this.stateTimer = 0;
    this.walkTarget = null;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, `civilian_${this.variant}_down`);
    this.sprite.setDepth(5);
    this.sprite.setData('entity', this);

    this.pickNewTarget();
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
    if (!this.walkTarget) {
      this.pickNewTarget();
      return;
    }

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.walkTarget.x, this.walkTarget.y
    );

    if (dist < 8) {
      this.sprite.setVelocity(0, 0);
      this.state = 'idle';
      this.stateTimer = 0;
    } else {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x, this.sprite.y,
        this.walkTarget.x, this.walkTarget.y
      );

      const vx = Math.cos(angle) * this.speed;
      const vy = Math.sin(angle) * this.speed;

      this.sprite.setVelocity(vx, vy);

      if (Math.abs(vx) > Math.abs(vy)) {
        this.direction = vx > 0 ? 'right' : 'left';
      } else {
        this.direction = vy > 0 ? 'down' : 'up';
      }
    }
  }

  updateIdle(delta) {
    if (this.stateTimer > Phaser.Math.RND.between(2000, 5000)) {
      this.state = 'walk';
      this.pickNewTarget();
      this.stateTimer = 0;
    }
  }

  pickNewTarget() {
    const sidewalks = this.scene.cityGenerator.getSidewalkTiles();
    if (sidewalks.length > 0) {
      this.walkTarget = Phaser.Math.RND.pick(sidewalks);
    }
  }

  // Civilians can witness crimes
  witness(crimeType) {
    // Chance to report based on crime severity
    const reportChance = {
      'drug_sale': 0.1,
      'sprinting': 0.02,
      'suspicious': 0.05
    };

    if (Math.random() < (reportChance[crimeType] || 0.05)) {
      this.scene.heatSystem.add(3, 'witnessed');
    }
  }
}
