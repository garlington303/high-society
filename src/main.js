import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { MerchantDialogueScene } from './scenes/MerchantDialogueScene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { EncounterScene } from './scenes/EncounterScene.js';
import { TavernScene } from './scenes/TavernScene.js';
import { BlacksmithScene } from './scenes/BlacksmithScene.js';
import { BlackMarketScene } from './scenes/BlackMarketScene.js';
import { TownCustomizationScene } from './scenes/TownCustomizationScene.js';
import { ContributionDialogueScene } from './scenes/ContributionDialogueScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1510', // Dark medieval theme
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [
    BootScene, 
    GameScene, 
    UIScene, 
    MerchantDialogueScene, 
    OverworldScene, 
    EncounterScene, 
    TavernScene,
    BlacksmithScene,
    BlackMarketScene,
    TownCustomizationScene,
    ContributionDialogueScene
  ]
};

const game = new Phaser.Game(config);
