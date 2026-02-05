// Consumable items that restore player upkeep stats
export const CONSUMABLES = {
  bread: {
    name: 'Bread',
    price: 8,
    hungerRestore: 25,
    thirstRestore: 0,
    sleepRestore: 0,
    description: 'A simple loaf. Restores hunger.'
  },
  water: {
    name: 'Water',
    price: 4,
    hungerRestore: 0,
    thirstRestore: 30,
    sleepRestore: 0,
    description: 'A cup of water. Quenches thirst.'
  },
  stew: {
    name: 'Hearty Stew',
    price: 18,
    hungerRestore: 45,
    thirstRestore: 10,
    sleepRestore: 0,
    description: 'Warm stew. Fills and soothes.'
  },
  ale: {
    name: 'Ale',
    price: 10,
    hungerRestore: 6,
    thirstRestore: 18,
    sleepRestore: 6,
    description: 'A pint of ale. Restores thirst and slightly relaxes.'
  },
  bed_pass: {
    name: 'Inn Stay',
    price: 50,
    hungerRestore: 0,
    thirstRestore: 0,
    sleepRestore: 60,
    description: 'Pay for a night at the inn to recover rest.'
  }
};
