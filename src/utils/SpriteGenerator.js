/**
 * Generates polished placeholder sprites programmatically
 * Fantasy/Medieval pixel art style with proper shading and detail
 * Designed to be easily replaced with final assets
 */

export function generateSprites(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.setScale(2); // Scale up for 32x32 high-res tiles for World Objects

  // Player sprites (4 directions) - Fantasy Rogue
  generatePlayerSprites(scene, g);

  // NPC sprites - villagers
  generateVillagerSprites(scene, g);

  // Guard sprites (4 directions)
  generateGuardSprites(scene, g);

  // Alchemist sprites
  generateAlchemistSprites(scene, g);

  // Consumable merchant sprites (food vendors)
  generateMerchantSprites(scene, g);

  // Exit sign texture
  generateExitSign(scene, g);

  // Patron sprites
  generatePatronSprites(scene, g);

  // Environment tiles - Medieval fantasy
  generateEnvironmentTiles(scene, g);

  // UI elements - Reset scale for UI
  g.setScale(1);
  generateUIElements(scene, g);

  // Item icons for inventory
  generateItemIcons(scene, g);

  g.destroy();
}

// Helper to draw a fantasy character body with cloak
function drawFantasyCharacterBase(g, cloakColor, cloakDark, skinColor, hairColor) {
  // Shadow under character
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(8, 15, 10, 4);

  // Cloak/body base
  g.fillStyle(cloakDark);
  g.fillRect(4, 6, 8, 8);

  // Cloak highlight
  g.fillStyle(cloakColor);
  g.fillRect(4, 6, 7, 7);

  // Arms with sleeves
  g.fillStyle(cloakDark);
  g.fillRect(2, 7, 2, 5);
  g.fillRect(12, 7, 2, 5);
  g.fillStyle(cloakColor);
  g.fillRect(2, 7, 2, 4);
  g.fillRect(12, 7, 2, 4);

  // Head
  g.fillStyle(skinColor);
  g.fillRoundedRect(5, 1, 6, 6, 1);

  // Hair
  g.fillStyle(hairColor);
  g.fillRect(5, 1, 6, 2);

  // Boots
  g.fillStyle(0x4a3728);
  g.fillRect(5, 13, 2, 3);
  g.fillRect(9, 13, 2, 3);
}

function generatePlayerSprites(scene, g) {
  const size = 32;
  const directions = ['down', 'up', 'left', 'right'];

  // Fantasy rogue colors
  const cloakColor = 0x2d4739;
  const cloakDark = 0x1e3126;
  const skinColor = 0xf5d6ba;
  const hairColor = 0x4a3728;
  const accentColor = 0x8b4513;

  directions.forEach((dir, i) => {
    g.clear();

    // Base character
    drawFantasyCharacterBase(g, cloakColor, cloakDark, skinColor, hairColor);

    // Direction-specific details
    if (dir === 'down') {
      // Eyes
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 4, 1, 1);
      g.fillRect(9, 4, 1, 1);
      // Hood edge accent
      g.fillStyle(accentColor);
      g.fillRect(5, 6, 1, 2);
      g.fillRect(10, 6, 1, 2);
    } else if (dir === 'up') {
      // Back of hood/hair
      g.fillStyle(cloakDark);
      g.fillRect(5, 1, 6, 4);
    } else if (dir === 'left') {
      // Side profile
      g.fillStyle(0x2c3e50);
      g.fillRect(5, 4, 1, 1);
      g.fillStyle(accentColor);
      g.fillRect(4, 6, 1, 2);
    } else {
      // Side profile right
      g.fillStyle(0x2c3e50);
      g.fillRect(10, 4, 1, 1);
      g.fillStyle(accentColor);
      g.fillRect(11, 6, 1, 2);
    }

    g.generateTexture(`player_${dir}`, size, size);
  });

  // Walking frames
  directions.forEach((dir, i) => {
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Body slightly shifted for walk animation
    g.fillStyle(cloakDark);
    g.fillRect(4, 7, 8, 7);
    g.fillStyle(cloakColor);
    g.fillRect(4, 7, 7, 6);

    // Arms swinging
    g.fillStyle(cloakColor);
    g.fillRect(2, 8, 2, 4);
    g.fillRect(12, 6, 2, 4);

    // Head
    g.fillStyle(skinColor);
    g.fillRoundedRect(5, 2, 6, 6, 1);
    g.fillStyle(hairColor);
    g.fillRect(5, 2, 6, 2);

    // Legs - walking pose
    g.fillStyle(0x4a3728);
    g.fillRect(4, 13, 2, 3);
    g.fillRect(10, 12, 2, 3);

    // Face details based on direction
    if (dir === 'down') {
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 5, 1, 1);
      g.fillRect(9, 5, 1, 1);
      g.fillStyle(accentColor);
      g.fillRect(5, 7, 1, 2);
      g.fillRect(10, 7, 1, 2);
    } else if (dir === 'up') {
      g.fillStyle(cloakDark);
      g.fillRect(5, 2, 6, 4);
    }

    g.generateTexture(`player_${dir}_walk`, size, size);
  });
}

function generateVillagerSprites(scene, g) {
  const size = 32;
  const colorSchemes = [
    { body: 0x8b7355, dark: 0x6b5344, hair: 0x5d4e37 },
    { body: 0xa0826d, dark: 0x806a57, hair: 0x2c3e50 },
    { body: 0x9b8576, dark: 0x7b6556, hair: 0xf5d6ba },
    { body: 0x7d6c5c, dark: 0x5d4c3c, hair: 0x4a3728 },
    { body: 0x6b8e7d, dark: 0x4b6e5d, hair: 0x7f8c8d }
  ];

  colorSchemes.forEach((colors, i) => {
    ['down', 'up', 'left', 'right'].forEach(dir => {
      g.clear();

      // Shadow
      g.fillStyle(0x000000, 0.3);
      g.fillEllipse(8, 15, 10, 4);

      // Peasant tunic body
      g.fillStyle(colors.dark);
      g.fillRect(4, 6, 8, 8);
      g.fillStyle(colors.body);
      g.fillRect(4, 6, 7, 7);

      // Arms
      g.fillStyle(colors.body);
      g.fillRect(2, 7, 2, 4);
      g.fillRect(12, 7, 2, 4);

      // Head
      g.fillStyle(0xf5d6ba);
      g.fillRoundedRect(5, 1, 6, 6, 1);

      // Hair
      g.fillStyle(colors.hair);
      g.fillRect(5, 1, 6, 2);

      // Simple boots
      g.fillStyle(0x4a3728);
      g.fillRect(5, 13, 2, 3);
      g.fillRect(9, 13, 2, 3);

      // Eyes when facing down
      if (dir === 'down') {
        g.fillStyle(0x2c3e50);
        g.fillRect(6, 4, 1, 1);
        g.fillRect(9, 4, 1, 1);
      }

      g.generateTexture(`villager_${i}_${dir}`, size, size);
    });
  });
}

function generateGuardSprites(scene, g) {
  const size = 32;
  const directions = ['down', 'up', 'left', 'right'];

  const armorColor = 0x4a5568;
  const armorDark = 0x2d3748;
  const skinColor = 0xf5d6ba;
  const crestColor = 0xc9302c;

  directions.forEach((dir, i) => {
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Chainmail/armor body
    g.fillStyle(armorDark);
    g.fillRect(4, 6, 8, 8);
    g.fillStyle(armorColor);
    g.fillRect(4, 6, 7, 7);

    // Chest crest/emblem
    g.fillStyle(crestColor);
    g.fillRect(6, 8, 4, 3);

    // Armored arms
    g.fillStyle(armorColor);
    g.fillRect(2, 7, 2, 5);
    g.fillRect(12, 7, 2, 5);

    // Head
    g.fillStyle(skinColor);
    g.fillRoundedRect(5, 2, 6, 5, 1);

    // Helmet
    g.fillStyle(armorDark);
    g.fillRect(4, 1, 8, 3);
    g.fillStyle(armorColor);
    g.fillRect(4, 3, 8, 1);
    // Helmet crest
    g.fillStyle(crestColor);
    g.fillRect(7, 0, 2, 3);

    // Greaves
    g.fillStyle(armorDark);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    // Belt
    g.fillStyle(0x8b4513);
    g.fillRect(4, 12, 8, 1);

    // Eyes
    if (dir === 'down') {
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 4, 1, 1);
      g.fillRect(9, 4, 1, 1);
    }

    g.generateTexture(`guard_${dir}`, size, size);
  });

  // Alert/chasing guard (red glow)
  directions.forEach((dir, i) => {
    g.clear();

    const alertColor = 0x8b0000;
    const alertDark = 0x5c0000;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Armor body - red tint for alert
    g.fillStyle(alertDark);
    g.fillRect(4, 6, 8, 8);
    g.fillStyle(alertColor);
    g.fillRect(4, 6, 7, 7);

    // Chest emblem
    g.fillStyle(0xffd700);
    g.fillRect(6, 8, 4, 3);

    // Arms
    g.fillStyle(alertColor);
    g.fillRect(2, 7, 2, 5);
    g.fillRect(12, 7, 2, 5);

    // Head
    g.fillStyle(skinColor);
    g.fillRoundedRect(5, 2, 6, 5, 1);

    // Helmet
    g.fillStyle(alertDark);
    g.fillRect(4, 1, 8, 3);
    g.fillStyle(alertColor);
    g.fillRect(4, 3, 8, 1);
    g.fillStyle(0xffd700);
    g.fillRect(7, 0, 2, 3);

    // Greaves
    g.fillStyle(alertDark);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    // Belt
    g.fillStyle(0x8b4513);
    g.fillRect(4, 12, 8, 1);

    if (dir === 'down') {
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 4, 1, 1);
      g.fillRect(9, 4, 1, 1);
    }

    g.generateTexture(`guard_alert_${dir}`, size, size);
  });
}

function generateAlchemistSprites(scene, g) {
  const size = 32;
  const robeColor = 0x4a235a;
  const robeDark = 0x311b3b;
  const shadowFace = 0x1a1a2e;

  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Robe body
    g.fillStyle(robeDark);
    g.fillRect(3, 5, 10, 9);
    g.fillStyle(robeColor);
    g.fillRect(3, 5, 9, 8);

    // Hood
    g.fillStyle(robeDark);
    g.fillRoundedRect(4, 1, 8, 6, 2);
    g.fillStyle(robeColor);
    g.fillRoundedRect(4, 1, 7, 5, 2);

    // Face in shadow
    g.fillStyle(shadowFace);
    g.fillRect(5, 2, 6, 4);

    // Eyes glowing with alchemical energy
    if (dir === 'down') {
      g.fillStyle(0x00ff88);
      g.fillRect(6, 3, 1, 1);
      g.fillRect(9, 3, 1, 1);
    }

    // Potion belt/sash
    g.fillStyle(0x8b4513);
    g.fillRect(5, 9, 6, 1);
    // Potion vial
    g.fillStyle(0x00ff88);
    g.fillRect(6, 10, 2, 2);
    g.fillStyle(0xff4500);
    g.fillRect(9, 10, 2, 2);

    // Robe hem
    g.fillStyle(robeDark);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    g.generateTexture(`alchemist_${dir}`, size, size);
  });
}

  function generateMerchantSprites(scene, g) {
    const size = 32;
    g.clear();

    // Simple vendor: apron, satchel and warm colors
    const robeColor = 0xc68642;
    const robeDark = 0x8b5a36;
    const skin = 0xf5d6ba;
    const accent = 0x6b3f1f;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Body
    g.fillStyle(robeDark);
    g.fillRect(3, 6, 10, 9);
    g.fillStyle(robeColor);
    g.fillRect(3, 6, 9, 8);

    // Apron
    g.fillStyle(0xd9c9a6);
    g.fillRect(5, 9, 6, 6);

    // Satchel on side
    g.fillStyle(accent);
    g.fillRect(11, 10, 3, 4);

    // Head
    g.fillStyle(skin);
    g.fillRoundedRect(5, 1, 6, 6, 1);

    // Simple eyes
    g.fillStyle(0x2c3e50);
    g.fillRect(6, 4, 1, 1);
    g.fillRect(9, 4, 1, 1);

    // Small food token on apron (visual cue)
    g.fillStyle(0xffcc66);
    g.fillRect(7, 11, 2, 2);

    g.generateTexture('merchant_down', size, size);
  }

function generatePatronSprites(scene, g) {
  const size = 32;
  const leatherColor = 0x8b4513;
  const leatherDark = 0x654321;

  // Waiting patron (adventurer seeking wares)
  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Leather armor body
    g.fillStyle(leatherDark);
    g.fillRect(4, 6, 8, 8);
    g.fillStyle(leatherColor);
    g.fillRect(4, 6, 7, 7);

    // Arms
    g.fillStyle(leatherColor);
    g.fillRect(2, 7, 2, 4);
    g.fillRect(12, 7, 2, 4);

    // Head
    g.fillStyle(0xf5d6ba);
    g.fillRoundedRect(5, 1, 6, 6, 1);
    g.fillStyle(0x5d4e37);
    g.fillRect(5, 1, 6, 2);

    // Boots
    g.fillStyle(0x4a3728);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    // Thought bubble with potion symbol - seeking wares
    g.fillStyle(0xf5f0e1);
    g.fillCircle(13, 2, 3);
    g.fillStyle(0x00ff88);
    g.fillRect(12, 1, 2, 3);

    if (dir === 'down') {
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 4, 1, 1);
      g.fillRect(9, 4, 1, 1);
    }

    g.generateTexture(`patron_${dir}`, size, size);
  });

  // Served patron (satisfied)
  ['down', 'up', 'left', 'right'].forEach(dir => {
    g.clear();

    const satisfiedColor = 0x228b22;
    const satisfiedDark = 0x166b16;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(8, 15, 10, 4);

    // Body with satisfied glow
    g.fillStyle(satisfiedDark);
    g.fillRect(4, 6, 8, 8);
    g.fillStyle(satisfiedColor);
    g.fillRect(4, 6, 7, 7);

    // Arms
    g.fillStyle(satisfiedColor);
    g.fillRect(2, 7, 2, 4);
    g.fillRect(12, 7, 2, 4);

    // Head
    g.fillStyle(0xf5d6ba);
    g.fillRoundedRect(5, 1, 6, 6, 1);
    g.fillStyle(0x5d4e37);
    g.fillRect(5, 1, 6, 2);

    // Boots
    g.fillStyle(0x4a3728);
    g.fillRect(5, 13, 2, 3);
    g.fillRect(9, 13, 2, 3);

    // Checkmark indicator
    g.fillStyle(0xf5f0e1);
    g.fillCircle(13, 2, 3);
    g.fillStyle(0x228b22);
    g.fillRect(11, 2, 2, 1);
    g.fillRect(13, 1, 1, 2);
    g.fillRect(14, 0, 1, 1);

    if (dir === 'down') {
      // Happy eyes
      g.fillStyle(0x2c3e50);
      g.fillRect(6, 4, 2, 1);
      g.fillRect(9, 4, 2, 1);
    }

    g.generateTexture(`patron_served_${dir}`, size, size);
  });
}

function generateExitSign(scene, g) {
  const w = 24, h = 18;
  g.clear();
  // Post pole shadow
  g.fillStyle(0x2b2b2b, 0.6);
  g.fillRect(10, 6, 2, 10);

  // Sign background
  g.fillStyle(0x8b4513);
  g.fillRoundedRect(2, 0, w, h, 3);
  // Inner plaque
  g.fillStyle(0xfff2dd);
  g.fillRoundedRect(4, 2, w-8, h-6, 2);

  // Arrow mark
  g.fillStyle(0x6b3f1f);
  g.fillRect(8, 6, 6, 2);
  g.fillTriangle(14, 5, 14, 9, 17, 7);

  g.generateTexture('exit_sign', w, h + 6);
}

function generateEnvironmentTiles(scene, g) {
  const size = 32;

  // Medieval cottage buildings with variety
  const cottageStyles = [
    { wall: 0x8b7355, accent: 0xa59378, window: 0xffd700, door: 0x4a3728, roof: 0x654321 },
    { wall: 0x9b8576, accent: 0xb5a596, window: 0xf0e68c, door: 0x5d4037, roof: 0x5c4033 },
    { wall: 0x8d8468, accent: 0xa79f8a, window: 0xffe4b5, door: 0x3e2723, roof: 0x4a3c31 },
    { wall: 0x7d6c5c, accent: 0x9d8c7c, window: 0xffefd5, door: 0x4e342e, roof: 0x5d4e37 }
  ];

  cottageStyles.forEach((style, i) => {
    g.clear();

    // Base wall - stone/wattle and daub
    g.fillStyle(style.wall);
    g.fillRect(0, 0, 16, 16);

    // Roof overhang
    g.fillStyle(style.roof);
    g.fillRect(0, 0, 16, 4);
    g.fillStyle(style.accent);
    g.fillRect(0, 3, 16, 1);

    // Windows (medieval style)
    g.fillStyle(style.window);
    g.fillRect(2, 5, 3, 4);
    g.fillRect(11, 5, 3, 4);
    g.fillRect(2, 10, 3, 3);
    g.fillRect(11, 10, 3, 3);

    // Window cross bars
    g.fillStyle(style.accent);
    g.fillRect(3, 5, 1, 4);
    g.fillRect(12, 5, 1, 4);

    // Shadow on right and bottom
    g.fillStyle(0x000000, 0.2);
    g.fillRect(15, 0, 1, 16);
    g.fillRect(0, 15, 16, 1);

    g.generateTexture(`cottage_${i}`, size, size);
  });

  // Cobblestone path tiles
  g.clear();
  g.fillStyle(0x5c5c5c);
  g.fillRect(0, 0, 16, 16);
  // Stone pattern
  g.fillStyle(0x6b6b6b);
  g.fillRect(1, 1, 6, 6);
  g.fillRect(9, 1, 6, 6);
  g.fillRect(1, 9, 6, 6);
  g.fillRect(9, 9, 6, 6);
  // Mortar lines
  g.fillStyle(0x4a4a4a);
  g.fillRect(7, 0, 2, 16);
  g.fillRect(0, 7, 16, 2);
  g.generateTexture('path', size, size);

  // Cobblestone road variations
  ['cobble_v_left', 'cobble_v_right', 'cobble_h_top', 'cobble_h_bottom'].forEach(type => {
    g.clear();
    g.fillStyle(0x5c5c5c);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x6b6b6b);
    g.fillRect(1, 1, 6, 6);
    g.fillRect(9, 1, 6, 6);
    g.fillRect(1, 9, 6, 6);
    g.fillRect(9, 9, 6, 6);
    g.fillStyle(0x4a4a4a);
    g.fillRect(7, 0, 2, 16);
    g.fillRect(0, 7, 16, 2);
    g.generateTexture(type, size, size);
  });

  // Cobblestone intersections
  ['cobble_x_nw', 'cobble_x_ne', 'cobble_x_sw', 'cobble_x_se'].forEach(type => {
    g.clear();
    g.fillStyle(0x5c5c5c);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(0x6b6b6b);
    g.fillRect(1, 1, 6, 6);
    g.fillRect(9, 1, 6, 6);
    g.fillRect(1, 9, 6, 6);
    g.fillRect(9, 9, 6, 6);
    g.fillStyle(0x4a4a4a);
    g.fillRect(7, 0, 2, 16);
    g.fillRect(0, 7, 16, 2);
    g.generateTexture(type, size, size);
  });

  // Alley with medieval atmosphere
  g.clear();
  g.fillStyle(0x2a2418);
  g.fillRect(0, 0, 16, 16);
  // Wall shadows
  g.fillStyle(0x1a1510);
  g.fillRect(0, 0, 3, 16);
  g.fillRect(13, 0, 3, 16);
  // Ground detail - worn cobbles
  g.fillStyle(0x3d3224);
  g.fillRect(3, 2, 3, 3);
  g.fillRect(10, 8, 3, 3);
  g.fillRect(5, 12, 3, 3);
  // Dim torchlight
  g.fillStyle(0x4a3c2a);
  g.fillRect(6, 0, 4, 16);
  g.generateTexture('alley', size, size);

  // Garden/green space - use loaded bush tile if available, otherwise procedural green
  g.clear();
  if (!scene.textures.exists('garden')) {
    // Fallback procedural garden with proper green coloring
    g.fillStyle(0x5a8f3a); // base green
    g.fillRect(0, 0, 16, 16);
    // Grass variation
    g.fillStyle(0x6ba34a);
    g.fillRect(0, 0, 8, 8);
    g.fillRect(8, 8, 8, 8);
    // Leaf texture detail
    g.fillStyle(0x4a7f2a);
    g.fillRect(2, 3, 3, 3);
    g.fillRect(11, 6, 3, 3);
    g.fillRect(5, 11, 3, 3);
    // Highlight patches
    g.fillStyle(0x7ab35a);
    g.fillRect(7, 2, 2, 2);
    g.fillRect(1, 10, 2, 2);
    g.generateTexture('garden', size, size);
  }

  // Stash spot (hidden cache)
  g.clear();
  g.fillStyle(0x2a2418);
  g.fillRect(0, 0, 16, 16);
  // Barrel/crate
  g.fillStyle(0x8b4513);
  g.fillRect(2, 2, 12, 10);
  g.fillStyle(0xa0522d);
  g.fillRect(2, 2, 11, 9);
  // Lid
  g.fillStyle(0x654321);
  g.fillRect(2, 2, 12, 2);
  // Rune mark
  g.fillStyle(0x00ff88);
  g.fillRect(5, 5, 6, 1);
  g.fillRect(7, 3, 2, 5);
  g.generateTexture('stash', size, size);

  // Guildhall - sanctuary building
  g.clear();
  // Base
  g.fillStyle(0x4a5568);
  g.fillRect(0, 0, 16, 16);
  // Roof
  g.fillStyle(0x2d3748);
  g.fillRect(0, 0, 16, 3);
  // Door (ornate, welcoming)
  g.fillStyle(0xcd853f);
  g.fillRect(5, 8, 6, 8);
  // Door frame
  g.fillStyle(0x8b4513);
  g.fillRect(5, 8, 6, 1);
  g.fillRect(5, 8, 1, 8);
  g.fillRect(10, 8, 1, 8);
  // Windows with warm light
  g.fillStyle(0xffd700);
  g.fillRect(2, 4, 3, 3);
  g.fillRect(11, 4, 3, 3);
  // Guild symbol (shield)
  g.fillStyle(0xffd700);
  g.fillRect(7, 10, 2, 3);
  g.fillRect(6, 11, 4, 1);
  g.generateTexture('guildhall', size, size);
  
  // ===== NEW POI TYPES =====
  
  // Tavern - Social hub with warm lighting
  g.clear();
  // Base timber frame
  g.fillStyle(0x5d4037);
  g.fillRect(0, 0, 16, 16);
  // Lighter plaster panels
  g.fillStyle(0xd7ccc8);
  g.fillRect(2, 4, 5, 8);
  g.fillRect(9, 4, 5, 8);
  // Roof (thatched look)
  g.fillStyle(0x8d6e63);
  g.fillRect(0, 0, 16, 4);
  g.fillStyle(0x6d4c41);
  g.fillRect(0, 3, 16, 1);
  // Windows with warm tavern glow
  g.fillStyle(0xffb300);
  g.fillRect(3, 5, 3, 3);
  g.fillRect(10, 5, 3, 3);
  // Door (welcoming)
  g.fillStyle(0x4e342e);
  g.fillRect(6, 8, 4, 8);
  // Ale mug sign
  g.fillStyle(0xffb300);
  g.fillCircle(8, 6, 2);
  g.generateTexture('tavern', size, size);
  
  // Temple - Sacred sanctuary with spire
  g.clear();
  // Stone walls
  g.fillStyle(0x78909c);
  g.fillRect(0, 0, 16, 16);
  // Lighter stone detail
  g.fillStyle(0x90a4ae);
  g.fillRect(1, 3, 14, 10);
  // Steeple/spire top
  g.fillStyle(0x546e7a);
  g.fillRect(5, 0, 6, 4);
  g.fillRect(6, 0, 4, 2);
  g.fillRect(7, 0, 2, 1);
  // Cross/holy symbol
  g.fillStyle(0xffd700);
  g.fillRect(7, 1, 2, 3);
  g.fillRect(6, 2, 4, 1);
  // Arched doorway
  g.fillStyle(0x37474f);
  g.fillRect(5, 9, 6, 7);
  g.fillStyle(0x455a64);
  g.fillRect(6, 9, 4, 6);
  // Stained glass windows
  g.fillStyle(0x64b5f6);
  g.fillRect(2, 5, 2, 3);
  g.fillRect(12, 5, 2, 3);
  g.fillStyle(0xef5350);
  g.fillRect(2, 5, 2, 1);
  g.fillRect(12, 5, 2, 1);
  g.generateTexture('temple', size, size);
  
  // Market Square - Cobblestone plaza with stall hints
  g.clear();
  // Base cobblestone
  g.fillStyle(0x757575);
  g.fillRect(0, 0, 16, 16);
  // Stone pattern variation
  g.fillStyle(0x8d8d8d);
  g.fillRect(0, 0, 5, 5);
  g.fillRect(6, 6, 4, 4);
  g.fillRect(11, 11, 5, 5);
  g.fillRect(0, 11, 5, 5);
  g.fillRect(11, 0, 5, 5);
  // Stall markings / wear patterns
  g.fillStyle(0x616161);
  g.fillRect(2, 2, 3, 1);
  g.fillRect(11, 7, 3, 1);
  g.fillRect(5, 12, 3, 1);
  // Center decoration hint
  g.fillStyle(0x9e9e9e);
  g.fillRect(6, 6, 4, 4);
  g.generateTexture('market_square', size, size);
  
  // Well - Town water source landmark
  g.clear();
  // Ground base
  g.fillStyle(0x5c5c5c);
  g.fillRect(0, 0, 16, 16);
  // Stone well ring
  g.fillStyle(0x616161);
  g.fillCircle(8, 8, 6);
  g.fillStyle(0x424242);
  g.fillCircle(8, 8, 4);
  // Water inside (dark)
  g.fillStyle(0x1565c0);
  g.fillCircle(8, 8, 3);
  // Rope/beam structure
  g.fillStyle(0x5d4037);
  g.fillRect(3, 2, 2, 6);
  g.fillRect(11, 2, 2, 6);
  g.fillRect(3, 2, 10, 2);
  // Bucket hint
  g.fillStyle(0x8d6e63);
  g.fillRect(7, 3, 2, 2);
  g.generateTexture('well', size, size);
  
  // Fountain - Decorative town center landmark
  g.clear();
  // Base pool
  g.fillStyle(0x5c5c5c);
  g.fillRect(0, 0, 16, 16);
  // Outer ring
  g.fillStyle(0x78909c);
  g.fillCircle(8, 8, 7);
  // Water pool
  g.fillStyle(0x42a5f5);
  g.fillCircle(8, 8, 5);
  // Center statue/spout
  g.fillStyle(0x90a4ae);
  g.fillCircle(8, 8, 2);
  g.fillStyle(0xb0bec5);
  g.fillRect(7, 5, 2, 4);
  // Water spray effect
  g.fillStyle(0xbbdefb);
  g.fillRect(6, 4, 1, 2);
  g.fillRect(9, 4, 1, 2);
  g.fillRect(8, 3, 1, 2);
  g.generateTexture('fountain', size, size);
  
  // ===== VARIED BUILDING SIZES (1-3 story) =====
  
  // Small cottage (1 story) - variations
  for (let v = 0; v < 4; v++) {
    const styles = [
      { wall: 0x8b7355, roof: 0x654321 },
      { wall: 0x9b8576, roof: 0x5c4033 },
      { wall: 0xa08070, roof: 0x6b5344 },
      { wall: 0x7d6c5c, roof: 0x5d4e37 }
    ];
    const style = styles[v];
    
    g.clear();
    g.fillStyle(style.wall);
    g.fillRect(0, 4, 16, 12);
    // Pitched roof
    g.fillStyle(style.roof);
    g.fillRect(0, 0, 16, 5);
    g.fillStyle(0x000000, 0.1);
    g.fillRect(0, 4, 16, 1);
    // Single window
    g.fillStyle(0xffd54f);
    g.fillRect(3, 7, 3, 3);
    // Door
    g.fillStyle(0x4e342e);
    g.fillRect(10, 8, 4, 8);
    g.generateTexture(`cottage_small_${v}`, size, size);
  }
  
  // Medium building (2 story) - variations
  for (let v = 0; v < 4; v++) {
    const styles = [
      { wall: 0x6d5c4d, roof: 0x4a3728, accent: 0x5d4037 },
      { wall: 0x7d6c5c, roof: 0x5c4033, accent: 0x6d5c4d },
      { wall: 0x5d4e46, roof: 0x4e342e, accent: 0x6d5c4d },
      { wall: 0x8d7c6c, roof: 0x5d4e37, accent: 0x7d6c5c }
    ];
    const style = styles[v];
    
    g.clear();
    // Taller building
    g.fillStyle(style.wall);
    g.fillRect(0, 2, 16, 14);
    // Roof
    g.fillStyle(style.roof);
    g.fillRect(0, 0, 16, 4);
    // Second floor line
    g.fillStyle(style.accent);
    g.fillRect(0, 7, 16, 1);
    // Upper windows
    g.fillStyle(0xffd54f);
    g.fillRect(2, 3, 2, 2);
    g.fillRect(7, 3, 2, 2);
    g.fillRect(12, 3, 2, 2);
    // Lower windows
    g.fillRect(2, 9, 2, 2);
    g.fillRect(12, 9, 2, 2);
    // Door
    g.fillStyle(0x4e342e);
    g.fillRect(6, 10, 4, 6);
    g.generateTexture(`cottage_medium_${v}`, size, size);
  }
  
  // Tall building (3 story) - variations
  for (let v = 0; v < 4; v++) {
    const styles = [
      { wall: 0x5d4e46, roof: 0x3e2723, accent: 0x4e3e36 },
      { wall: 0x4e4038, roof: 0x3e2f28, accent: 0x5e4e46 },
      { wall: 0x6d5c4d, roof: 0x4a3728, accent: 0x5d4c3d },
      { wall: 0x5d5048, roof: 0x3e332e, accent: 0x4d4038 }
    ];
    const style = styles[v];
    
    g.clear();
    // Tall building
    g.fillStyle(style.wall);
    g.fillRect(0, 0, 16, 16);
    // Roof peak
    g.fillStyle(style.roof);
    g.fillRect(0, 0, 16, 2);
    g.fillRect(2, 0, 12, 1);
    // Floor lines
    g.fillStyle(style.accent);
    g.fillRect(0, 5, 16, 1);
    g.fillRect(0, 10, 16, 1);
    // Top floor windows
    g.fillStyle(0xffe082);
    g.fillRect(2, 2, 2, 2);
    g.fillRect(7, 2, 2, 2);
    g.fillRect(12, 2, 2, 2);
    // Middle floor windows
    g.fillStyle(0xffd54f);
    g.fillRect(2, 7, 2, 2);
    g.fillRect(12, 7, 2, 2);
    // Ground floor
    g.fillRect(2, 12, 2, 2);
    g.fillRect(12, 12, 2, 2);
    // Door
    g.fillStyle(0x4e342e);
    g.fillRect(6, 11, 4, 5);
    g.generateTexture(`cottage_tall_${v}`, size, size);
  }
}

function generateUIElements(scene, g) {
  // Gold coin icon
  g.clear();
  g.fillStyle(0xffd700);
  g.fillCircle(8, 8, 7);
  g.fillStyle(0xdaa520);
  g.fillCircle(8, 8, 5);
  g.fillStyle(0xffd700);
  g.fillCircle(8, 8, 4);
  // Crown/coin symbol
  g.fillStyle(0xb8860b);
  g.fillRect(6, 5, 4, 1);
  g.fillRect(5, 6, 6, 4);
  g.fillRect(6, 10, 4, 1);
  g.generateTexture('icon_gold', 16, 16);

  // Potion bag icon
  g.clear();
  g.fillStyle(0x8b4513);
  g.fillRoundedRect(2, 4, 12, 10, 2);
  g.fillStyle(0xa0522d);
  g.fillRoundedRect(2, 4, 11, 9, 2);
  // Drawstring
  g.fillStyle(0x654321);
  g.fillRect(5, 2, 6, 3);
  g.fillStyle(0x8b4513);
  g.fillRect(6, 3, 4, 2);
  g.generateTexture('icon_bag', 16, 16);

  // Interaction prompt
  g.clear();
  // Parchment bubble
  g.fillStyle(0xf5f0e1);
  g.fillRoundedRect(0, 0, 24, 14, 3);
  g.fillStyle(0xd4c8a8);
  g.fillRoundedRect(1, 1, 22, 12, 2);
  g.fillStyle(0xf5f0e1);
  g.fillRoundedRect(2, 2, 20, 10, 2);
  // "E" key
  g.fillStyle(0x4a3728);
  g.fillRect(8, 4, 2, 6);
  g.fillRect(10, 4, 4, 2);
  g.fillRect(10, 6, 3, 2);
  g.fillRect(10, 8, 4, 2);
  g.generateTexture('prompt_interact', 24, 14);

  // Higher-resolution interaction prompt (HD)
  g.clear();
  // Parchment bubble (scaled 2x)
  g.fillStyle(0xf5f0e1);
  g.fillRoundedRect(0, 0, 48, 28, 6);
  g.fillStyle(0xd4c8a8);
  g.fillRoundedRect(2, 2, 44, 24, 4);
  g.fillStyle(0xf5f0e1);
  g.fillRoundedRect(4, 4, 40, 20, 4);
  // "E" key - scaled coordinates
  g.fillStyle(0x4a3728);
  g.fillRect(16, 8, 4, 12);
  g.fillRect(20, 8, 8, 4);
  g.fillRect(20, 12, 6, 4);
  g.fillRect(20, 16, 8, 4);
  g.generateTexture('prompt_interact_hd', 48, 28);

  // Alchemist portrait (64x64) for dialogue scene
  g.clear();
  const pSize = 64;

  // Dark cellar background
  g.fillStyle(0x1a1510);
  g.fillRect(0, 0, pSize, pSize);
  // Darker edges for depth
  g.fillStyle(0x0d0a08);
  g.fillRect(0, 0, 8, pSize);
  g.fillRect(56, 0, 8, pSize);

  // Robe body
  g.fillStyle(0x311b3b);
  g.fillRect(12, 32, 40, 32);
  g.fillStyle(0x4a235a);
  g.fillRect(12, 32, 36, 28);

  // Hood
  g.fillStyle(0x311b3b);
  g.fillRoundedRect(14, 8, 36, 28, 8);
  g.fillStyle(0x4a235a);
  g.fillRoundedRect(14, 8, 32, 24, 6);

  // Face in shadow
  g.fillStyle(0x0d0a08);
  g.fillRect(18, 14, 28, 18);

  // Glowing alchemical eyes
  g.fillStyle(0x00ff88);
  g.fillRect(22, 22, 5, 5);
  g.fillRect(37, 22, 5, 5);
  // Eye pupils
  g.fillStyle(0x004d26);
  g.fillRect(24, 24, 2, 2);
  g.fillRect(39, 24, 2, 2);

  // Potion belt
  g.fillStyle(0x8b4513);
  g.fillRect(22, 44, 20, 4);
  // Potions
  g.fillStyle(0x00ff88);
  g.fillRect(24, 48, 6, 8);
  g.fillStyle(0xff4500);
  g.fillRect(34, 48, 6, 8);

  g.generateTexture('alchemist_portrait', pSize, pSize);
  // Consumable vendor portrait (friendly innkeeper / merchant)
  g.clear();
  const cpSize = 64;
  // Warm tavern background
  g.fillStyle(0x2b241a);
  g.fillRect(0, 0, cpSize, cpSize);
  // Soft vignette edges
  g.fillStyle(0x1a130f);
  g.fillRect(0, 0, 6, cpSize);
  g.fillRect(cpSize - 6, 0, 6, cpSize);

  // Tunic/body
  g.fillStyle(0x8b5a2b);
  g.fillRect(12, 34, 40, 28);
  g.fillStyle(0xa66e3a);
  g.fillRect(14, 36, 36, 24);

  // Head / hair
  g.fillStyle(0xf1d7b5);
  g.fillRect(18, 12, 28, 22);
  g.fillStyle(0x5a3c2a);
  g.fillRect(16, 8, 32, 10);

  // Eyes (friendly)
  g.fillStyle(0x2b6f44);
  g.fillRect(24, 22, 4, 4);
  g.fillRect(36, 22, 4, 4);
  g.fillStyle(0x000000);
  g.fillRect(25, 23, 1, 1);
  g.fillRect(37, 23, 1, 1);

  // Smiling mouth
  g.fillStyle(0x772222);
  g.fillRect(30, 30, 4, 1);

  // Scarf or apron detail
  g.fillStyle(0xd4af7f);
  g.fillRect(22, 40, 20, 4);

  g.generateTexture('consumable_portrait', cpSize, cpSize);
}

/**
 * Generate item icons for inventory system
 */
function generateItemIcons(scene, g) {
  const size = 24; // Icons are 24x24

  // Health Potion (red)
  g.clear();
  g.fillStyle(0x1a0506);
  g.fillRoundedRect(6, 8, 12, 14, 3);
  g.fillStyle(0xe74c3c);
  g.fillRoundedRect(7, 9, 10, 12, 2);
  g.fillStyle(0xff6b6b);
  g.fillRect(8, 10, 4, 6);
  // Cork
  g.fillStyle(0x8b4513);
  g.fillRect(8, 4, 8, 5);
  g.fillStyle(0xa0522d);
  g.fillRect(9, 5, 6, 3);
  g.generateTexture('item_potion_red', size, size);

  // Stamina Potion (green)
  g.clear();
  g.fillStyle(0x0a1a06);
  g.fillRoundedRect(6, 8, 12, 14, 3);
  g.fillStyle(0x27ae60);
  g.fillRoundedRect(7, 9, 10, 12, 2);
  g.fillStyle(0x2ecc71);
  g.fillRect(8, 10, 4, 6);
  g.fillStyle(0x8b4513);
  g.fillRect(8, 4, 8, 5);
  g.fillStyle(0xa0522d);
  g.fillRect(9, 5, 6, 3);
  g.generateTexture('item_potion_green', size, size);

  // Bread
  g.clear();
  g.fillStyle(0x8b4513);
  g.fillRoundedRect(3, 10, 18, 10, 4);
  g.fillStyle(0xcd853f);
  g.fillRoundedRect(4, 11, 16, 8, 3);
  g.fillStyle(0xdeb887);
  g.fillRect(6, 12, 3, 4);
  g.fillRect(11, 12, 4, 4);
  // Score marks
  g.fillStyle(0x8b4513);
  g.fillRect(8, 13, 1, 3);
  g.fillRect(13, 13, 1, 3);
  g.generateTexture('item_bread', size, size);

  // Cheese
  g.clear();
  g.fillStyle(0xd4a017);
  g.fillTriangle(4, 20, 12, 4, 20, 20);
  g.fillStyle(0xf4c430);
  g.fillTriangle(5, 19, 12, 6, 18, 19);
  // Holes
  g.fillStyle(0xc49c14);
  g.fillCircle(10, 14, 2);
  g.fillCircle(14, 16, 1);
  g.generateTexture('item_cheese', size, size);

  // Water Flask
  g.clear();
  g.fillStyle(0x5d4e37);
  g.fillRoundedRect(6, 6, 12, 16, 4);
  g.fillStyle(0x6b8e7d);
  g.fillRoundedRect(7, 7, 10, 14, 3);
  g.fillStyle(0x87ceeb);
  g.fillRect(9, 10, 6, 8);
  // Cap
  g.fillStyle(0x8b4513);
  g.fillRect(9, 4, 6, 4);
  g.generateTexture('item_flask', size, size);

  // Ale mug
  g.clear();
  g.fillStyle(0x5d4e37);
  g.fillRoundedRect(5, 8, 12, 14, 2);
  g.fillStyle(0x8b7355);
  g.fillRoundedRect(6, 9, 10, 12, 2);
  // Handle
  g.fillStyle(0x5d4e37);
  g.fillRect(16, 10, 4, 8);
  g.fillStyle(0x8b7355);
  g.fillRect(17, 12, 2, 4);
  // Foam
  g.fillStyle(0xfffacd);
  g.fillRect(7, 9, 8, 3);
  g.generateTexture('item_ale', size, size);

  // Cooked Meat
  g.clear();
  g.fillStyle(0x8b4513);
  g.fillEllipse(12, 14, 10, 6);
  g.fillStyle(0xcd853f);
  g.fillEllipse(12, 13, 8, 5);
  g.fillStyle(0xdaa520);
  g.fillRect(9, 11, 6, 3);
  // Bone
  g.fillStyle(0xf5f5dc);
  g.fillRect(3, 12, 5, 3);
  g.fillRect(18, 12, 4, 3);
  g.generateTexture('item_meat', size, size);

  // Dreamleaf (purple herb)
  g.clear();
  g.fillStyle(0x228b22);
  g.fillRect(11, 14, 2, 8);
  g.fillStyle(0x9932cc);
  g.fillEllipse(8, 10, 6, 8);
  g.fillEllipse(16, 10, 6, 8);
  g.fillStyle(0xba55d3);
  g.fillEllipse(12, 6, 8, 10);
  g.generateTexture('item_herb_purple', size, size);

  // Moonpetal (blue flower)
  g.clear();
  g.fillStyle(0x228b22);
  g.fillRect(11, 14, 2, 8);
  g.fillStyle(0x4169e1);
  g.fillCircle(8, 10, 4);
  g.fillCircle(16, 10, 4);
  g.fillCircle(12, 6, 5);
  g.fillStyle(0x87ceeb);
  g.fillCircle(12, 9, 3);
  g.generateTexture('item_flower_blue', size, size);

  // Shadow Essence (black vial)
  g.clear();
  g.fillStyle(0x1a1a2e);
  g.fillRoundedRect(7, 8, 10, 14, 3);
  g.fillStyle(0x16213e);
  g.fillRoundedRect(8, 9, 8, 12, 2);
  // Swirling darkness
  g.fillStyle(0x0f0f1e);
  g.fillCircle(12, 14, 3);
  g.fillStyle(0x4a0080);
  g.fillRect(10, 12, 2, 2);
  g.fillRect(13, 15, 2, 2);
  g.fillStyle(0x2d2d44);
  g.fillRect(9, 4, 6, 5);
  g.generateTexture('item_vial_black', size, size);

  // King's Gold (gold powder)
  g.clear();
  g.fillStyle(0x5d4037);
  g.fillRoundedRect(4, 10, 16, 12, 3);
  g.fillStyle(0x8d6e63);
  g.fillRoundedRect(5, 11, 14, 10, 2);
  g.fillStyle(0xffd700);
  g.fillRect(7, 12, 10, 6);
  g.fillStyle(0xffeb3b);
  g.fillRect(8, 13, 4, 3);
  // Sparkles
  g.fillStyle(0xffffff);
  g.fillRect(9, 14, 1, 1);
  g.fillRect(14, 13, 1, 1);
  g.generateTexture('item_powder_gold', size, size);

  // Iron Ore
  g.clear();
  g.fillStyle(0x4a4a4a);
  g.fillRoundedRect(4, 8, 16, 14, 4);
  g.fillStyle(0x6b6b6b);
  g.fillRect(6, 10, 12, 10);
  g.fillStyle(0x8b8b8b);
  g.fillRect(8, 12, 4, 4);
  g.fillRect(13, 14, 3, 3);
  g.fillStyle(0x3d3d3d);
  g.fillRect(7, 11, 2, 2);
  g.generateTexture('item_ore_iron', size, size);

  // Leather
  g.clear();
  g.fillStyle(0x8b4513);
  g.fillRoundedRect(3, 6, 18, 14, 3);
  g.fillStyle(0xa0522d);
  g.fillRect(5, 8, 14, 10);
  g.fillStyle(0xcd853f);
  g.fillRect(7, 10, 4, 4);
  g.fillRect(13, 12, 3, 3);
  // Stitching
  g.fillStyle(0x5d3a1a);
  g.fillRect(4, 12, 1, 6);
  g.fillRect(19, 10, 1, 6);
  g.generateTexture('item_leather', size, size);

  // Cloth
  g.clear();
  g.fillStyle(0xb0c4de);
  g.fillRoundedRect(3, 8, 18, 12, 2);
  g.fillStyle(0xdcdcdc);
  g.fillRect(5, 10, 14, 8);
  // Fold lines
  g.fillStyle(0x9fb3c9);
  g.fillRect(8, 10, 1, 8);
  g.fillRect(15, 10, 1, 8);
  g.generateTexture('item_cloth', size, size);

  // Guild Token
  g.clear();
  g.fillStyle(0xffd700);
  g.fillCircle(12, 12, 9);
  g.fillStyle(0xdaa520);
  g.fillCircle(12, 12, 7);
  g.fillStyle(0xffd700);
  g.fillCircle(12, 12, 5);
  // Emblem
  g.fillStyle(0x8b4513);
  g.fillRect(10, 9, 4, 6);
  g.fillRect(9, 11, 6, 2);
  g.generateTexture('item_token', size, size);

  // Key
  g.clear();
  g.fillStyle(0x8b4513);
  g.fillCircle(8, 8, 5);
  g.fillStyle(0xa0522d);
  g.fillCircle(8, 8, 3);
  g.fillStyle(0x8b4513);
  g.fillRect(10, 6, 10, 4);
  g.fillRect(16, 10, 3, 4);
  g.fillRect(18, 10, 2, 6);
  g.generateTexture('item_key', size, size);
}
