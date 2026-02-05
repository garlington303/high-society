/**
 * Item Database
 * 
 * Central repository of all item definitions.
 * Items are immutable templates - inventory stores references by ID.
 */

export const ITEM_CATEGORIES = {
  CONSUMABLE: 'consumable',
  WARE: 'ware',
  MATERIAL: 'material',
  KEY: 'key',
  MISC: 'misc'
};

/**
 * Item definitions indexed by ID
 */
export const ITEMS = {
  // ═══════════════════════════════════════════════
  // CONSUMABLES - Food, Drinks, Potions
  // ═══════════════════════════════════════════════
  
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A ruby-red elixir that restores 50 HP.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_potion_red',
    stackable: true,
    maxStack: 20,
    value: 25,
    consumable: true,
    effect: { type: 'heal', amount: 50 }
  },
  
  stamina_potion: {
    id: 'stamina_potion',
    name: 'Stamina Potion',
    description: 'A fizzing green tonic that restores stamina.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_potion_green',
    stackable: true,
    maxStack: 20,
    value: 20,
    consumable: true,
    effect: { type: 'stamina', amount: 50 }
  },
  
  bread: {
    id: 'bread',
    name: 'Bread',
    description: 'A crusty loaf. Restores hunger.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_bread',
    stackable: true,
    maxStack: 10,
    value: 5,
    consumable: true,
    effect: { type: 'hunger', amount: 25 }
  },
  
  cheese: {
    id: 'cheese',
    name: 'Cheese Wheel',
    description: 'Aged cheddar. Restores hunger significantly.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_cheese',
    stackable: true,
    maxStack: 10,
    value: 15,
    consumable: true,
    effect: { type: 'hunger', amount: 40 }
  },
  
  water_flask: {
    id: 'water_flask',
    name: 'Water Flask',
    description: 'Fresh water. Quenches thirst.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_flask',
    stackable: true,
    maxStack: 5,
    value: 3,
    consumable: true,
    effect: { type: 'thirst', amount: 30 }
  },
  
  ale: {
    id: 'ale',
    name: 'Ale',
    description: 'A pint of tavern ale. Quenches thirst, slight buzz.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'item_ale',
    stackable: true,
    maxStack: 10,
    value: 8,
    consumable: true,
    effect: { type: 'thirst', amount: 20 }
  },
  
  cooked_meat: {
    id: 'cooked_meat',
    name: 'Cooked Meat',
    description: 'A hearty portion of roasted meat.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    icon: 'resource_meat',
    stackable: true,
    maxStack: 10,
    value: 20,
    consumable: true,
    effect: { type: 'hunger', amount: 50 }
  },

  // ═══════════════════════════════════════════════
  // WARES - Tradeable goods, contraband
  // ═══════════════════════════════════════════════
  
  dreamleaf: {
    id: 'dreamleaf',
    name: 'Dreamleaf',
    description: 'A rare herb with... recreational uses. Highly regulated.',
    category: ITEM_CATEGORIES.WARE,
    icon: 'item_herb_purple',
    stackable: true,
    maxStack: 50,
    value: 35,
    consumable: false,
    infamyRisk: 5
  },
  
  moonpetal: {
    id: 'moonpetal',
    name: 'Moonpetal',
    description: 'Glowing petals harvested under moonlight. Valuable to alchemists.',
    category: ITEM_CATEGORIES.WARE,
    icon: 'item_flower_blue',
    stackable: true,
    maxStack: 50,
    value: 50,
    consumable: false,
    infamyRisk: 8
  },
  
  shadow_essence: {
    id: 'shadow_essence',
    name: 'Shadow Essence',
    description: 'A vial of distilled darkness. Extremely illegal.',
    category: ITEM_CATEGORIES.WARE,
    icon: 'item_vial_black',
    stackable: true,
    maxStack: 20,
    value: 100,
    consumable: false,
    infamyRisk: 15
  },
  
  kings_gold: {
    id: 'kings_gold',
    name: "King's Gold",
    description: 'A potent stimulant. Banned in all provinces.',
    category: ITEM_CATEGORIES.WARE,
    icon: 'item_powder_gold',
    stackable: true,
    maxStack: 30,
    value: 80,
    consumable: false,
    infamyRisk: 12
  },

  // ═══════════════════════════════════════════════
  // MATERIALS - Crafting components
  // ═══════════════════════════════════════════════
  
  wood: {
    id: 'wood',
    name: 'Wood',
    description: 'Sturdy timber for construction.',
    category: ITEM_CATEGORIES.MATERIAL,
    icon: 'resource_wood',
    stackable: true,
    maxStack: 99,
    value: 5,
    consumable: false
  },

  stone: {
    id: 'stone',
    name: 'Stone',
    description: 'Cut stone for building.',
    category: ITEM_CATEGORIES.MATERIAL,
    // Using gold resource sprite as placeholder or if appropriate, but user provided specific wood/meat/gold/tools.
    // I don't have a specific stone sprite from the user list, but I have 'resource_gold' which is a gold stone.
    // I'll stick to procedural item_stone if no specific stone sprite was provided, 
    // OR I can use one of the tool sprites if it looks like a pickaxe?
    // Wait, the user said "gold and tools and meat". Not stone.
    // But I added 'stone' item earlier. I'll leave icon as 'item_stone' (procedural) or use 'resource_gold' tint?
    // Let's use 'item_stone' (procedural) for now as I don't have a better one.
    icon: 'item_stone', 
    stackable: true,
    maxStack: 99,
    value: 5,
    consumable: false
  },

  tools: {
    id: 'tools',
    name: 'Tools',
    description: 'Basic tools for crafting and repair.',
    category: ITEM_CATEGORIES.MATERIAL,
    icon: 'resource_tool',
    stackable: true,
    maxStack: 20,
    value: 15,
    consumable: false
  },

  iron_ore: {
    id: 'iron_ore',
    name: 'Iron Ore',
    description: 'Raw iron ore. Can be smelted.',
    category: ITEM_CATEGORIES.MATERIAL,
    icon: 'item_ore_iron',
    stackable: true,
    maxStack: 99,
    value: 10,
    consumable: false
  },
  
  leather: {
    id: 'leather',
    name: 'Leather',
    description: 'Tanned animal hide. Used for crafting.',
    category: ITEM_CATEGORIES.MATERIAL,
    icon: 'item_leather',
    stackable: true,
    maxStack: 99,
    value: 8,
    consumable: false
  },
  
  cloth: {
    id: 'cloth',
    name: 'Cloth',
    description: 'A bolt of woven fabric.',
    category: ITEM_CATEGORIES.MATERIAL,
    icon: 'item_cloth',
    stackable: true,
    maxStack: 99,
    value: 5,
    consumable: false
  },

  // ═══════════════════════════════════════════════
  // KEY ITEMS - Quest items, keys
  // ═══════════════════════════════════════════════
  
  guild_token: {
    id: 'guild_token',
    name: 'Guild Token',
    description: 'Proof of membership in the Merchants Guild.',
    category: ITEM_CATEGORIES.KEY,
    icon: 'item_token',
    stackable: false,
    maxStack: 1,
    value: 0,
    consumable: false
  },
  
  cellar_key: {
    id: 'cellar_key',
    name: 'Cellar Key',
    description: 'An old iron key. Opens a cellar door.',
    category: ITEM_CATEGORIES.KEY,
    icon: 'item_key',
    stackable: false,
    maxStack: 1,
    value: 0,
    consumable: false
  }
};

/**
 * Get item definition by ID
 * @param {string} itemId 
 * @returns {Object|null}
 */
export function getItem(itemId) {
  return ITEMS[itemId] || null;
}

/**
 * Get all items in a category
 * @param {string} category 
 * @returns {Object[]}
 */
export function getItemsByCategory(category) {
  return Object.values(ITEMS).filter(item => item.category === category);
}

/**
 * Check if item exists
 * @param {string} itemId 
 * @returns {boolean}
 */
export function itemExists(itemId) {
  return itemId in ITEMS;
}

/**
 * Get item display color based on category
 */
export function getItemRarityColor(item) {
  if (!item) return 0xaaaaaa;
  
  switch (item.category) {
    case ITEM_CATEGORIES.KEY:
      return 0xffd700; // Gold for key items
    case ITEM_CATEGORIES.WARE:
      return 0xff6b6b; // Red for contraband
    case ITEM_CATEGORIES.CONSUMABLE:
      return 0x4ecdc4; // Cyan for consumables
    case ITEM_CATEGORIES.MATERIAL:
      return 0x95a5a6; // Gray for materials
    default:
      return 0xffffff;
  }
}
