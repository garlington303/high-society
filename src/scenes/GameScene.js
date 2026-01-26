import Phaser from 'phaser';
import { Player } from '../entities/Player.js';
import { Police } from '../entities/Police.js';
import { Civilian } from '../entities/Civilian.js';
import { Dealer } from '../entities/Dealer.js';
import { Customer } from '../entities/Customer.js';
import { CityGenerator } from '../world/CityGenerator.js';
import { HeatSystem } from '../systems/HeatSystem.js';
import { DrugSystem } from '../systems/DrugSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // World bounds
    this.worldWidth = 1600;
    this.worldHeight = 1200;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    // Generate city
    this.cityGenerator = new CityGenerator(this);
    this.map = this.cityGenerator.generate();

    // Create entity groups
    this.civilians = this.add.group();
    this.police = this.add.group();
    this.dealers = this.add.group();
    this.customers = this.add.group();

    // Systems
    this.heatSystem = new HeatSystem(this);
    this.drugSystem = new DrugSystem(this);

    // Create player
    this.player = new Player(this, 400, 300);

    // Spawn initial entities
    this.spawnDealers();
    this.spawnCivilians(30);
    this.spawnPolice(3);

    // Camera follow
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    // Collision setup
    this.setupCollisions();

    // Customer spawn timer
    this.time.addEvent({
      delay: 8000,
      callback: this.trySpawnCustomer,
      callbackScope: this,
      loop: true
    });

    // Heat decay timer
    this.time.addEvent({
      delay: 1000,
      callback: () => this.heatSystem.decay(),
      callbackScope: this,
      loop: true
    });

    // Time progression
    this.time.addEvent({
      delay: 5000,
      callback: this.advanceTime,
      callbackScope: this,
      loop: true
    });

    // Interaction prompt
    this.interactionPrompt = this.add.sprite(0, 0, 'prompt_interact');
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(100);

    // Current interaction target
    this.currentInteraction = null;
  }

  setupCollisions() {
    // Player vs buildings
    this.physics.add.collider(this.player.sprite, this.map.buildings);

    // Police vs buildings
    this.physics.add.collider(this.police, this.map.buildings);

    // Police sees player
    this.physics.add.overlap(
      this.player.sprite,
      this.police,
      this.onPoliceSpotPlayer,
      null,
      this
    );
  }

  spawnDealers() {
    // Fixed dealer locations in alleyways
    const dealerSpots = this.cityGenerator.getDealerSpots();
    dealerSpots.forEach((spot, i) => {
      const dealer = new Dealer(this, spot.x, spot.y, i);
      this.dealers.add(dealer.sprite);
    });
  }

  spawnCivilians(count) {
    const sidewalkTiles = this.cityGenerator.getSidewalkTiles();
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Math.RND.pick(sidewalkTiles);
      if (spot) {
        const civilian = new Civilian(this, spot.x, spot.y);
        this.civilians.add(civilian.sprite);
      }
    }
  }

  spawnPolice(count) {
    const roadTiles = this.cityGenerator.getRoadTiles();
    for (let i = 0; i < count; i++) {
      const spot = Phaser.Math.RND.pick(roadTiles);
      if (spot) {
        const cop = new Police(this, spot.x, spot.y);
        this.police.add(cop.sprite);
      }
    }
  }

  trySpawnCustomer() {
    const heat = this.registry.get('heat');
    const inventory = this.registry.get('inventory');
    const hasProduct = Object.values(inventory).some(amount => amount > 0);

    // More customers when low heat and you have product
    if (hasProduct && heat < 50 && this.customers.getLength() < 5) {
      const sidewalks = this.cityGenerator.getSidewalkTiles();
      const spot = Phaser.Math.RND.pick(sidewalks);
      if (spot) {
        const customer = new Customer(this, spot.x, spot.y);
        this.customers.add(customer.sprite);
      }
    }
  }

  onPoliceSpotPlayer(playerSprite, policeSprite) {
    const police = policeSprite.getData('entity');
    const heat = this.registry.get('heat');

    if (heat > 30 && police && !police.isChasing) {
      // Chance to be spotted based on heat
      const spotChance = heat / 100;
      if (Math.random() < spotChance) {
        police.startChase(this.player);
        this.heatSystem.add(5, 'spotted_by_police');
      }
    }
  }

  advanceTime() {
    let time = this.registry.get('time');
    time = (time + 1) % 24;
    this.registry.set('time', time);

    if (time === 0) {
      const day = this.registry.get('day');
      this.registry.set('day', day + 1);
    }

    // Adjust police count based on time
    const isNight = time >= 20 || time < 6;
    this.updatePolicePatrols(isNight);
  }

  updatePolicePatrols(isNight) {
    const currentCount = this.police.getLength();
    const targetCount = isNight ? 5 : 3;
    const heat = this.registry.get('heat');

    // More police if high heat
    const heatBonus = Math.floor(heat / 25);
    const finalTarget = targetCount + heatBonus;

    if (currentCount < finalTarget) {
      this.spawnPolice(1);
    }
  }

  update(time, delta) {
    // Update player
    this.player.update(this.cursors, this.keys, delta);

    // Update all entities
    this.civilians.getChildren().forEach(c => {
      const entity = c.getData('entity');
      if (entity) entity.update(delta);
    });

    this.police.getChildren().forEach(p => {
      const entity = p.getData('entity');
      if (entity) entity.update(delta, this.player);
    });

    this.customers.getChildren().forEach(c => {
      const entity = c.getData('entity');
      if (entity) entity.update(delta, this.player);
    });

    // Check for interactions
    this.checkInteractions();

    // Handle interaction input
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.handleInteraction();
    }
  }

  checkInteractions() {
    this.currentInteraction = null;
    this.interactionPrompt.setVisible(false);

    const playerPos = this.player.sprite;
    const interactRange = 32;

    // Check dealers
    this.dealers.getChildren().forEach(d => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, d.x, d.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'dealer', entity: d.getData('entity') };
        this.interactionPrompt.setPosition(d.x, d.y - 20);
        this.interactionPrompt.setVisible(true);
      }
    });

    // Check customers
    this.customers.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, c.x, c.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'customer', entity: c.getData('entity') };
        this.interactionPrompt.setPosition(c.x, c.y - 20);
        this.interactionPrompt.setVisible(true);
      }
    });

    // Check safe houses
    this.map.safeHouses.forEach(sh => {
      const dist = Phaser.Math.Distance.Between(
        playerPos.x, playerPos.y, sh.x, sh.y
      );
      if (dist < interactRange) {
        this.currentInteraction = { type: 'safehouse', entity: sh };
        this.interactionPrompt.setPosition(sh.x, sh.y - 20);
        this.interactionPrompt.setVisible(true);
      }
    });
  }

  handleInteraction() {
    if (!this.currentInteraction) return;

    const { type, entity } = this.currentInteraction;

    switch (type) {
      case 'dealer':
        this.openDealerMenu(entity);
        break;
      case 'customer':
        this.sellToCustomer(entity);
        break;
      case 'safehouse':
        this.enterSafeHouse(entity);
        break;
    }
  }

  openDealerMenu(dealer) {
    // Emit event for UI to handle
    this.events.emit('openDealer', dealer);
  }

  sellToCustomer(customer) {
    const result = this.drugSystem.sellToCustomer(customer);
    if (result.success) {
      customer.purchase();
      this.heatSystem.add(result.heatGain, 'drug_sale');
      this.events.emit('sale', result);
    } else {
      this.events.emit('saleFailed', result);
    }
  }

  enterSafeHouse(safehouse) {
    // Reduce heat significantly
    this.heatSystem.reduce(30);
    this.events.emit('safehouse', { message: 'Laying low... Heat reduced.' });
  }
}
