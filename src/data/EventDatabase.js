// src/data/EventDatabase.js
// Helper functions for event effects
const addGold = (scene, amount) => {
    const current = scene.registry.get('gold') || 0;
    scene.registry.set('gold', current + amount);
};

const removeGold = (scene, amount) => {
    const current = scene.registry.get('gold') || 0;
    scene.registry.set('gold', Math.max(0, current - amount));
};

const addXp = (scene, amount) => {
    const current = scene.registry.get('xp') || 0;
    scene.registry.set('xp', current + amount);
    try { scene.events.emit('xpGained', { amount }); } catch (e) {}
};

const addInfamy = (scene, amount) => {
    if (scene.infamySystem && scene.infamySystem.add) {
        scene.infamySystem.add(amount, 'event');
    }
};

const damagePlayer = (scene, amount) => {
    if (scene.player && scene.player.takeDamage) {
        scene.player.takeDamage(amount);
    }
};

const addFame = (scene, amount) => {
    if (scene.fameSystem && scene.fameSystem.add) {
        scene.fameSystem.add(amount, 'event');
    }
};

/**
 * Perform a stat check using the StatSystem
 * @param {object} scene - The game scene
 * @param {string} stat - Stat to check (str, dex, int, cha, con, lck)
 * @param {number} difficulty - DC to beat (8=easy, 12=medium, 15=hard, 18=very hard)
 * @returns {{success: boolean, roll: number, total: number, criticalSuccess: boolean, criticalFailure: boolean}}
 */
const statCheck = (scene, stat, difficulty = 12) => {
    if (scene.statSystem && scene.statSystem.check) {
        return scene.statSystem.check(stat, difficulty);
    }
    // Fallback if no stat system
    const roll = Math.floor(Math.random() * 20) + 1;
    return { success: roll >= difficulty, roll, total: roll, criticalSuccess: roll === 20, criticalFailure: roll === 1 };
};

export const EventDatabase = [
    {
        id: 'mysterious_beggar',
        title: 'The Mysterious Beggar',
        description: 'A ragged beggar sits by the road. "Spare some change for a fortune?" he wheezes.',
        choices: [
            {
                text: 'Give 10 Gold',
                effect: (scene) => {
                    removeGold(scene, 10);
                    addXp(scene, 20);
                    return 'The beggar blesses you. You feel enlightened. (-10 Gold, +20 XP)';
                }
            },
            {
                text: 'Ignore him',
                effect: (scene) => {
                    return 'You walk past. The beggar mutters something under his breath.';
                }
            },
            {
                text: 'Rob him',
                effect: (scene) => {
                    addInfamy(scene, 5);
                    return 'You check his pockets but find nothing. Passersby look at you with disgust. (+5 Infamy)';
                }
            }
        ]
    },
    {
        id: 'lost_pouch',
        title: 'Lost Pouch',
        description: 'You find a heavy leather pouch on the ground.',
        choices: [
            {
                text: 'Keep it',
                effect: (scene) => {
                    addGold(scene, 50);
                    addInfamy(scene, 2);
                    return 'You pocket the gold. Finders keepers! (+50 Gold, +2 Infamy)';
                }
            },
            {
                text: 'Leave it',
                effect: (scene) => {
                    addXp(scene, 5);
                    return 'You leave the pouch for its owner. A clear conscience is its own reward. (+5 XP)';
                }
            }
        ]
    },
    {
        id: 'merchant_wagon',
        title: 'Stalled Merchant',
        description: 'A merchant\'s wagon has a broken wheel. "Help me fix this!" he shouts.',
        choices: [
            {
                text: 'Help (STR check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'str', 12);
                    if (result.criticalSuccess) {
                        addGold(scene, 50);
                        addFame(scene, 5);
                        return `CRITICAL SUCCESS! (Rolled ${result.roll}+${result.total - result.roll}=${result.total} vs DC 12) You hoist the wagon with ease! The merchant is amazed and pays generously. (+50 Gold, +5 Fame)`;
                    } else if (result.success) {
                        addGold(scene, 30);
                        addFame(scene, 2);
                        return `Success! (Rolled ${result.roll}+${result.total - result.roll}=${result.total} vs DC 12) You lift the wagon and fix the wheel. (+30 Gold, +2 Fame)`;
                    } else if (result.criticalFailure) {
                        damagePlayer(scene, 15);
                        return `CRITICAL FAILURE! (Rolled ${result.roll}) The wagon crashes down on you! (-15 HP)`;
                    } else {
                        damagePlayer(scene, 10);
                        return `Failed. (Rolled ${result.roll}+${result.total - result.roll}=${result.total} vs DC 12) You strain your back but can't lift it. (-10 HP)`;
                    }
                }
            },
            {
                text: 'Negotiate payment (CHA check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'cha', 10);
                    if (result.success) {
                        addGold(scene, 25);
                        return `Success! (Rolled ${result.total} vs DC 10) He agrees to pay upfront. You help and collect your fee. (+25 Gold)`;
                    } else {
                        addInfamy(scene, 3);
                        return `Failed. (Rolled ${result.total} vs DC 10) He scoffs at your demands. Nearby merchants eye you suspiciously. (+3 Infamy)`;
                    }
                }
            },
            {
                text: 'Walk away',
                effect: (scene) => {
                    return 'Not your problem. You continue on your way.';
                }
            }
        ]
    },
    {
        id: 'tavern_brawl',
        title: 'Tavern Trouble',
        description: 'A drunk patron swings at you as you pass the tavern! "You lookin\' at me?!"',
        choices: [
            {
                text: 'Dodge (DEX check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'dex', 11);
                    if (result.criticalSuccess) {
                        addXp(scene, 15);
                        return `CRITICAL! (Rolled ${result.roll}) You sidestep gracefully and he faceplants into a barrel. The crowd cheers! (+15 XP)`;
                    } else if (result.success) {
                        return `Success! (Rolled ${result.total} vs DC 11) You duck under his swing. He stumbles past, embarrassed.`;
                    } else {
                        damagePlayer(scene, 8);
                        return `Failed! (Rolled ${result.total} vs DC 11) His fist connects with your jaw. (-8 HP)`;
                    }
                }
            },
            {
                text: 'Fight back (STR check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'str', 10);
                    if (result.success) {
                        addXp(scene, 10);
                        addInfamy(scene, 2);
                        return `Success! (Rolled ${result.total} vs DC 10) You knock him out cold. The guards take note. (+10 XP, +2 Infamy)`;
                    } else {
                        damagePlayer(scene, 12);
                        addInfamy(scene, 1);
                        return `Failed! (Rolled ${result.total} vs DC 10) He's tougher than he looks! You take a beating. (-12 HP, +1 Infamy)`;
                    }
                }
            },
            {
                text: 'Talk him down (CHA check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'cha', 13);
                    if (result.success) {
                        addXp(scene, 20);
                        addFame(scene, 3);
                        return `Success! (Rolled ${result.total} vs DC 13) "Easy friend, let me buy you a drink." He calms down and you share stories. (+20 XP, +3 Fame)`;
                    } else {
                        damagePlayer(scene, 5);
                        return `Failed! (Rolled ${result.total} vs DC 13) "Don't patronize me!" He shoves you into a table. (-5 HP)`;
                    }
                }
            }
        ]
    },
    {
        id: 'locked_chest',
        title: 'Abandoned Chest',
        description: 'You spot a dusty chest behind some barrels in an alley. It\'s locked tight.',
        choices: [
            {
                text: 'Pick the lock (DEX check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'dex', 14);
                    if (result.criticalSuccess) {
                        addGold(scene, 80);
                        addXp(scene, 15);
                        return `CRITICAL! (Rolled ${result.roll}) The lock practically opens itself! Inside: a small fortune! (+80 Gold, +15 XP)`;
                    } else if (result.success) {
                        addGold(scene, 40);
                        addInfamy(scene, 1);
                        return `Success! (Rolled ${result.total} vs DC 14) Click! The chest opens revealing coins. (+40 Gold, +1 Infamy)`;
                    } else {
                        addInfamy(scene, 3);
                        return `Failed! (Rolled ${result.total} vs DC 14) You fumble loudly. A guard glances your way... (+3 Infamy)`;
                    }
                }
            },
            {
                text: 'Force it open (STR check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'str', 15);
                    if (result.success) {
                        addGold(scene, 35);
                        addInfamy(scene, 4);
                        return `Success! (Rolled ${result.total} vs DC 15) CRACK! The chest splinters open. Not subtle, but effective. (+35 Gold, +4 Infamy)`;
                    } else {
                        damagePlayer(scene, 5);
                        addInfamy(scene, 2);
                        return `Failed! (Rolled ${result.total} vs DC 15) You hurt your hand and make a racket. (-5 HP, +2 Infamy)`;
                    }
                }
            },
            {
                text: 'Leave it alone',
                effect: (scene) => {
                    return 'Best not to meddle with others\' property. You walk away.';
                }
            }
        ]
    },
    {
        id: 'fortune_teller',
        title: 'The Fortune Teller',
        description: 'A mysterious woman beckons from a shadowy tent. "Come, let me read your fate..."',
        choices: [
            {
                text: 'Pay 20 gold for a reading',
                effect: (scene) => {
                    const gold = scene.registry.get('gold') || 0;
                    if (gold < 20) {
                        return 'You don\'t have enough gold. She waves you away dismissively.';
                    }
                    removeGold(scene, 20);
                    const luck = statCheck(scene, 'lck', 10);
                    if (luck.success) {
                        addXp(scene, 30);
                        return `She gazes into her crystal... "Fortune smiles upon you!" You feel enlightened. (-20 Gold, +30 XP)`;
                    } else {
                        addInfamy(scene, 2);
                        return `She frowns... "Dark clouds gather around you." You leave feeling unsettled. (-20 Gold, +2 Infamy)`;
                    }
                }
            },
            {
                text: 'See through her tricks (INT check)',
                effect: (scene) => {
                    const result = statCheck(scene, 'int', 13);
                    if (result.success) {
                        addXp(scene, 25);
                        return `Success! (Rolled ${result.total} vs DC 13) You notice the hidden mirrors and sleight of hand. "Charlatan!" She flees. (+25 XP)`;
                    } else {
                        return `Failed! (Rolled ${result.total} vs DC 13) Her mystique seems genuine... perhaps there is real magic here?`;
                    }
                }
            },
            {
                text: 'Politely decline',
                effect: (scene) => {
                    return '"Another time perhaps." She nods knowingly as you leave.';
                }
            }
        ]
    }
];
