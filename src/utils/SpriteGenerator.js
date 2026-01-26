/**
 * Generates all placeholder sprites programmatically
 * These are simple geometric shapes that clearly convey gameplay meaning
 * Designed to be easily replaced with AI-generated or hand-drawn assets
 */

export function generateSprites(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Player sprites (4 directions) - distinguished by arrow indicating facing
  generatePlayerSprites(scene, g);

  // NPC sprites - civilians
  generateCivilianSprites(scene, g);

  // Police sprites (4 directions)
  generatePoliceSprites(scene, g);

  // Dealer sprites (contacts you can buy from)
  generateDealerSprites(scene, g);

  // Customer sprites (people who buy from you)
  generateCustomerSprites(scene, g);

  // Environment tiles
  generateEnvironmentTiles(scene, g);

  // Vehicle sprites
  generateVehicleSprites(scene, g);

  // UI elements
  generateUIElements(scene, g);

  g.destroy();
}

function generatePlayerSprites(scene, g) {
  const size = 16;
  const directions = ['down', 'up', 'left', 'right'];
  const arrows = [
    [[8, 12], [4, 6], [12, 6]], // down
    [[8, 4], [4, 10], [12, 10]], // up
    [[4, 8], [10, 4], [10, 12]], // left
    [[12, 8], [6, 4], [6, 12]]  // right
  ];

  directions.forEach((dir, i) => {
    g.clear();
    // Body - dark jacket
    g.fillStyle(0x2d3436);
    g.fillRect(2, 2, 12, 12);
    // Head
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 1, 6, 5);
    // Direction indicator
    g.fillStyle(0xe17055);
    g.fillTriangle(...arrows[i].flat());

    g.generateTexture(`player_${dir}`, size, size);
  });

  // Player walking frames (slight offset for animation)
  directions.forEach((dir, i) => {
    g.clear();
    g.fillStyle(0x2d3436);
    g.fillRect(2, 3, 12, 11);
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 1, 6, 5);
    g.fillStyle(0xe17055);
    g.fillTriangle(...arrows[i].flat());

    g.generateTexture(`player_${dir}_walk`, size, size);
  });
}

function generateCivilianSprites(scene, g) {
  const size = 16;
  const colors = [0x74b9ff, 0x55efc4, 0xffeaa7, 0xfd79a8, 0xa29bfe];

  colors.forEach((color, i) => {
    ['down', 'up', 'left', 'right'].forEach(dir => {
      g.clear();
      // Body
      g.fillStyle(color);
      g.fillRect(3, 3, 10, 10);
      // Head
      g.fillStyle(0xdfe6e9);
      g.fillRect(5, 1, 6, 5);

      g.generateTexture(`civilian_${i}_${dir}`, size, size);
    });
  });
}

function generatePoliceSprites(scene, g) {
  const size = 16;
  const directions = ['down', 'up', 'left', 'right'];
  const arrows = [
    [[8, 12], [4, 6], [12, 6]],
    [[8, 4], [4, 10], [12, 10]],
    [[4, 8], [10, 4], [10, 12]],
    [[12, 8], [6, 4], [6, 12]]
  ];

  directions.forEach((dir, i) => {
    g.clear();
    // Body - blue uniform
    g.fillStyle(0x0984e3);
    g.fillRect(2, 2, 12, 12);
    // Badge
    g.fillStyle(0xfdcb6e);
    g.fillRect(6, 6, 4, 4);
    // Head
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 0, 6, 5);
    // Cap
    g.fillStyle(0x2d3436);
    g.fillRect(4, 0, 8, 2);

    g.generateTexture(`police_${dir}`, size, size);
  });

  // Alert police (chasing)
  directions.forEach((dir, i) => {
    g.clear();
    g.fillStyle(0xd63031);
    g.fillRect(2, 2, 12, 12);
    g.fillStyle(0xfdcb6e);
    g.fillRect(6, 6, 4, 4);
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 0, 6, 5);
    g.fillStyle(0x2d3436);
    g.fillRect(4, 0, 8, 2);

    g.generateTexture(`police_alert_${dir}`, size, size);
  });
}

function generateDealerSprites(scene, g) {
  const size = 16;

  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();
    // Hoodie
    g.fillStyle(0x6c5ce7);
    g.fillRect(2, 2, 12, 12);
    // Hood shadow
    g.fillStyle(0x5f27cd);
    g.fillRect(4, 1, 8, 4);
    // Face in shadow
    g.fillStyle(0xb2bec3);
    g.fillRect(5, 2, 6, 4);
    // $ symbol
    g.fillStyle(0x00b894);
    g.fillRect(7, 8, 2, 4);

    g.generateTexture(`dealer_${dir}`, size, size);
  });
}

function generateCustomerSprites(scene, g) {
  const size = 16;

  // Waiting customer
  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();
    g.fillStyle(0xfdcb6e);
    g.fillRect(3, 3, 10, 10);
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 1, 6, 5);
    // Exclamation mark (wants to buy)
    g.fillStyle(0x00cec9);
    g.fillRect(7, 8, 2, 3);
    g.fillRect(7, 12, 2, 1);

    g.generateTexture(`customer_${dir}`, size, size);
  });

  // Served customer
  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();
    g.fillStyle(0x55efc4);
    g.fillRect(3, 3, 10, 10);
    g.fillStyle(0xdfe6e9);
    g.fillRect(5, 1, 6, 5);

    g.generateTexture(`customer_served_${dir}`, size, size);
  });
}

function generateEnvironmentTiles(scene, g) {
  const size = 16;

  // Road tile
  g.clear();
  g.fillStyle(0x2d3436);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x636e72);
  g.fillRect(7, 0, 2, size);
  g.generateTexture('road', size, size);

  // Road horizontal
  g.clear();
  g.fillStyle(0x2d3436);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x636e72);
  g.fillRect(0, 7, size, 2);
  g.generateTexture('road_h', size, size);

  // Intersection
  g.clear();
  g.fillStyle(0x2d3436);
  g.fillRect(0, 0, size, size);
  g.generateTexture('road_cross', size, size);

  // Sidewalk
  g.clear();
  g.fillStyle(0x636e72);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x747d8c);
  g.fillRect(0, 0, size, 1);
  g.fillRect(0, 8, size, 1);
  g.generateTexture('sidewalk', size, size);

  // Building - residential (varied colors)
  const buildingColors = [0x8395a7, 0x576574, 0x6c5ce7, 0x74b9ff];
  buildingColors.forEach((color, i) => {
    g.clear();
    g.fillStyle(color);
    g.fillRect(0, 0, size, size);
    // Windows
    g.fillStyle(0xffeaa7);
    g.fillRect(2, 2, 4, 4);
    g.fillRect(10, 2, 4, 4);
    g.fillRect(2, 10, 4, 4);
    g.fillRect(10, 10, 4, 4);
    g.generateTexture(`building_${i}`, size, size);
  });

  // Building - commercial
  g.clear();
  g.fillStyle(0xdfe6e9);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x74b9ff);
  g.fillRect(1, 1, 14, 8);
  g.fillStyle(0x2d3436);
  g.fillRect(6, 10, 4, 6);
  g.generateTexture('building_shop', size, size);

  // Alley
  g.clear();
  g.fillStyle(0x1a1a2e);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x2d3436);
  g.fillRect(0, 0, 2, size);
  g.fillRect(14, 0, 2, size);
  g.generateTexture('alley', size, size);

  // Park/grass
  g.clear();
  g.fillStyle(0x00b894);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x55efc4);
  g.fillRect(3, 3, 2, 2);
  g.fillRect(11, 7, 2, 2);
  g.fillRect(5, 11, 2, 2);
  g.generateTexture('grass', size, size);

  // Stash spot
  g.clear();
  g.fillStyle(0x2d3436);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0xe17055);
  g.fillRect(4, 4, 8, 8);
  g.fillStyle(0xfdcb6e);
  g.fillRect(6, 6, 4, 4);
  g.generateTexture('stash', size, size);

  // Safe house
  g.clear();
  g.fillStyle(0x00cec9);
  g.fillRect(0, 0, size, size);
  g.fillStyle(0x0984e3);
  g.fillRect(1, 1, 14, 14);
  g.fillStyle(0xdfe6e9);
  g.fillRect(5, 10, 6, 6);
  g.generateTexture('safehouse', size, size);
}

function generateVehicleSprites(scene, g) {
  const sizeW = 12;
  const sizeH = 20;

  // Player car
  ['up', 'down'].forEach(dir => {
    g.clear();
    g.fillStyle(0xe17055);
    g.fillRect(0, 0, sizeW, sizeH);
    g.fillStyle(0x2d3436);
    g.fillRect(1, 2, 10, 4);
    g.fillRect(1, 14, 10, 4);
    g.fillStyle(0xdfe6e9);
    g.fillRect(2, dir === 'up' ? 3 : 15, 8, 2);
    g.generateTexture(`car_player_${dir}`, sizeW, sizeH);
  });

  // Civilian car
  const carColors = [0x74b9ff, 0x55efc4, 0xffeaa7, 0xdfe6e9, 0x636e72];
  carColors.forEach((color, i) => {
    ['up', 'down'].forEach(dir => {
      g.clear();
      g.fillStyle(color);
      g.fillRect(0, 0, sizeW, sizeH);
      g.fillStyle(0x2d3436);
      g.fillRect(1, 2, 10, 4);
      g.fillRect(1, 14, 10, 4);
      g.generateTexture(`car_${i}_${dir}`, sizeW, sizeH);
    });
  });

  // Police car
  ['up', 'down'].forEach(dir => {
    g.clear();
    g.fillStyle(0xdfe6e9);
    g.fillRect(0, 0, sizeW, sizeH);
    g.fillStyle(0x0984e3);
    g.fillRect(0, 8, sizeW, 4);
    g.fillStyle(0x2d3436);
    g.fillRect(1, 2, 10, 4);
    g.fillRect(1, 14, 10, 4);
    // Lights
    g.fillStyle(0xd63031);
    g.fillRect(1, 6, 4, 2);
    g.fillStyle(0x0984e3);
    g.fillRect(7, 6, 4, 2);
    g.generateTexture(`car_police_${dir}`, sizeW, sizeH);
  });
}

function generateUIElements(scene, g) {
  // Heat indicator segments
  for (let i = 0; i < 5; i++) {
    g.clear();
    const intensity = (i + 1) / 5;
    const r = Math.floor(255 * intensity);
    const gb = Math.floor(100 * (1 - intensity));
    g.fillStyle((r << 16) | (gb << 8) | gb);
    g.fillRect(0, 0, 20, 8);
    g.generateTexture(`heat_${i}`, 20, 8);
  }

  // Money icon
  g.clear();
  g.fillStyle(0x00b894);
  g.fillCircle(8, 8, 8);
  g.fillStyle(0xffffff);
  g.fillRect(6, 4, 4, 8);
  g.fillRect(4, 5, 2, 2);
  g.fillRect(10, 9, 2, 2);
  g.generateTexture('icon_money', 16, 16);

  // Drug bag icon
  g.clear();
  g.fillStyle(0xdfe6e9);
  g.fillRect(2, 4, 12, 10);
  g.fillStyle(0x636e72);
  g.fillRect(4, 2, 8, 3);
  g.generateTexture('icon_bag', 16, 16);

  // Interaction prompt
  g.clear();
  g.fillStyle(0xffffff);
  g.fillRoundedRect(0, 0, 24, 12, 2);
  g.fillStyle(0x2d3436);
  g.fillRect(10, 3, 4, 6);
  g.generateTexture('prompt_interact', 24, 12);
}
