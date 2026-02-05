// src/data/JobDatabase.js
// Bounty board jobs — each defines a destination, encounter type, and fame/infamy bias.

export const JOB_BOARD_JOBS = [
  {
    id: 'cellar_vermin',
    title: 'Purge the Cellar',
    description: 'The innkeeper reports giant rats infesting the tavern cellar. Clear them out.',
    riskLevel: 'low',
    encounterType: 'combat',
    destination: 'cellar',
    combat: {
      enemyType: 'Melee',
      enemyCount: 4,
      enemyHealthMult: 0.6,
      enemyDamageMult: 0.5,
      arenaWidth: 800,
      arenaHeight: 600,
      boss: null
    },
    rewards: {
      gold: 60,
      xp: 40,
      fame: 5,
      infamy: 0
    },
    flavorText: 'An honest job. The townsfolk will remember your help.',
    biasLabel: '+Fame'
  },
  {
    id: 'shady_delivery',
    title: 'The Unmarked Crate',
    description: 'A hooded figure needs a crate delivered to the docks. No questions asked.',
    riskLevel: 'medium',
    encounterType: 'event',
    destination: 'docks',
    event: {
      title: 'The Unmarked Crate',
      description: 'You arrive at the docks with the crate. A scarred dockworker blocks your path. "I know what\'s in there. Hand it over or I call the watch."',
      choices: [
        {
          text: 'Deliver as promised (CHA check)',
          statCheck: { stat: 'cha', dc: 12 },
          success: {
            resultText: 'You talk your way past. The contact pays handsomely. The dockworker scowls but says nothing.',
            gold: 120, xp: 50, fame: 0, infamy: 8
          },
          failure: {
            resultText: 'The dockworker alerts the watch. You drop the crate and flee, but your reputation takes a hit.',
            gold: 0, xp: 20, fame: 0, infamy: 12
          }
        },
        {
          text: 'Open the crate yourself (DEX check)',
          statCheck: { stat: 'dex', dc: 10 },
          success: {
            resultText: 'Inside: stolen relics. You pocket a few before resealing it. The contact never notices.',
            gold: 80, xp: 30, fame: 0, infamy: 5
          },
          failure: {
            resultText: 'The lock snaps loudly. The contact arrives angry. You get half pay.',
            gold: 40, xp: 15, fame: 0, infamy: 6
          }
        },
        {
          text: 'Report it to the guard captain',
          statCheck: null,
          success: {
            resultText: 'The captain rewards your honesty. The hooded figure vanishes. You have made an enemy, but the town respects you.',
            gold: 40, xp: 60, fame: 10, infamy: -5
          },
          failure: null
        }
      ]
    },
    rewards: { gold: 0, xp: 0, fame: 0, infamy: 0 }, // rewards come from event choices
    flavorText: 'Risky business. The underworld pays well, but at what cost?',
    biasLabel: '+Infamy'
  },
  {
    id: 'ruins_heist',
    title: 'Plunder the Old Keep',
    description: 'Ancient ruins outside town hold treasure. Also bandits. High risk, high reward.',
    riskLevel: 'high',
    encounterType: 'combat',
    destination: 'ruins',
    combat: {
      enemyType: 'mixed',
      enemyCount: 6,
      enemyHealthMult: 1.2,
      enemyDamageMult: 1.0,
      arenaWidth: 1200,
      arenaHeight: 900,
      boss: { type: 'Ranger', healthMult: 3.0, damageMult: 1.5 }
    },
    rewards: {
      gold: 200,
      xp: 100,
      fame: 3,
      infamy: 5
    },
    flavorText: 'Fortune favors the bold. The ruins are dangerous but the payoff is massive.',
    biasLabel: 'Big Rewards'
  },
  {
    id: 'shadow_run_warehouse',
    title: 'Shadow Run: Warehouse',
    description: 'Smuggle a contraband crate out of the guarded warehouse district.',
    riskLevel: 'medium',
    encounterType: 'stealth',
    destination: 'warehouse',
    combat: {
      enemyType: 'Guard',
      enemyCount: 4,
      enemyHealthMult: 1.0,
      enemyDamageMult: 1.0
    },
    rewards: {
      gold: 150,
      xp: 80,
      fame: 0,
      infamy: 10
    },
    flavorText: 'Stay low, move fast. The crate is heavy, but the payout is heavier.',
    biasLabel: 'Stealth'
  }
];

// Legacy export for backwards compat during migration
export const JobDatabase = JOB_BOARD_JOBS;
