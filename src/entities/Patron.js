import Phaser from 'phaser';
import { WARES } from './Alchemist.js';

export class Patron {
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
    this.sprite = scene.physics.add.sprite(x, y, 'patron_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
  }

  generateDemand() {
    // Weighted random - more common wares are requested more often
    const weights = {
      moonleaf: 50,
      vigor: 30,
      dragonsbreath: 15,
      shadowbane: 5
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [ware, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        this.wantsWare = ware;
        break;
      }
    }

    this.wantsWare = this.wantsWare || 'moonleaf';
    this.wantsQuantity = Phaser.Math.RND.between(1, 3);

    // Price they're willing to pay (with some variance)
    const basePrice = WARES[this.wantsWare].sellPrice;
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
    const texKey = this.served ? 'patron_served' : 'patron';
    this.sprite.setTexture(`${texKey}_${this.direction}`);
  }

  // Called when player sells to this patron
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
    // Missed opportunity - slight infamy increase (suspicious behavior draws attention)
    if (this.scene.infamySystem) this.scene.infamySystem.add(1, 'suspicious_lingering');

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
      ware: this.wantsWare,
      quantity: this.wantsQuantity,
      price: this.offerPrice * this.wantsQuantity,
      info: WARES[this.wantsWare]
    };
  }
}
