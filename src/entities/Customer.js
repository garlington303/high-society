import Phaser from 'phaser';
import { DRUGS } from './Dealer.js';

export class Customer {
  constructor(scene, x, y) {
    this.scene = scene;
    this.direction = 'down';
    this.served = false;

    // What they want to buy
    this.generateDemand();

    // Patience - they'll leave if not served
    this.patience = Phaser.Math.RND.between(15000, 30000);
    this.waitTimer = 0;

    // Movement
    this.speed = 35;
    this.wanderTarget = null;
    this.wanderTimer = 0;

    // Create sprite
    this.sprite = scene.physics.add.sprite(x, y, 'customer_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
  }

  generateDemand() {
    // Weighted random - more common drugs are requested more often
    const weights = {
      weed: 50,
      pills: 30,
      coke: 15,
      meth: 5
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [drug, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        this.wantsDrug = drug;
        break;
      }
    }

    this.wantsDrug = this.wantsDrug || 'weed';
    this.wantsQuantity = Phaser.Math.RND.between(1, 3);

    // Price they're willing to pay (with some variance)
    const basePrice = DRUGS[this.wantsDrug].sellPrice;
    this.offerPrice = Math.floor(basePrice * (0.9 + Math.random() * 0.3));
  }

  update(delta, player) {
    if (this.served) {
      this.leaveHappy();
      return;
    }

    this.waitTimer += delta;
    this.wanderTimer += delta;

    // Patience expired - leave
    if (this.waitTimer > this.patience) {
      this.leaveAngry();
      return;
    }

    // Wander around while waiting
    if (this.wanderTimer > 3000) {
      this.pickWanderTarget();
      this.wanderTimer = 0;
    }

    if (this.wanderTarget) {
      this.moveTowardTarget();
    }

    this.updateSprite();
  }

  pickWanderTarget() {
    // Wander in small area
    this.wanderTarget = {
      x: this.sprite.x + Phaser.Math.RND.between(-50, 50),
      y: this.sprite.y + Phaser.Math.RND.between(-50, 50)
    };
  }

  moveTowardTarget() {
    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.wanderTarget.x, this.wanderTarget.y
    );

    if (dist < 8) {
      this.sprite.setVelocity(0, 0);
      this.wanderTarget = null;
    } else {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x, this.sprite.y,
        this.wanderTarget.x, this.wanderTarget.y
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

  updateSprite() {
    const texKey = this.served ? 'customer_served' : 'customer';
    this.sprite.setTexture(`${texKey}_${this.direction}`);
  }

  // Called when player sells to this customer
  purchase() {
    this.served = true;
  }

  leaveHappy() {
    // Fade out and destroy
    this.sprite.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        this.sprite.destroy();
      }
    });
  }

  leaveAngry() {
    // Missed opportunity - slight heat increase (suspicious behavior)
    if (this.scene.heatSystem) this.scene.heatSystem.add(1, 'suspicious_lingering');

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.sprite.destroy();
      }
    });
  }

  getDemand() {
    return {
      drug: this.wantsDrug,
      quantity: this.wantsQuantity,
      price: this.offerPrice * this.wantsQuantity,
      info: DRUGS[this.wantsDrug]
    };
  }
}
