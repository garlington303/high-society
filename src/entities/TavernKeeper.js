import Phaser from 'phaser';
import { ConsumableMerchant } from './ConsumableMerchant.js';

/**
 * The Tavern Keeper NPC. On first visit shows tutorial dialogue,
 * on subsequent visits opens the consumable shop (food/drink).
 */
export class TavernKeeper {
  constructor(scene, x, y) {
    this.scene = scene;

    // Use the merchant sprite (stationary behind bar)
    this.sprite = scene.physics.add.sprite(x, y, 'merchant_down');
    this.sprite.setDepth(6);
    this.sprite.setData('entity', this);
    this.sprite.body.setImmovable(true);

    // Label above head
    this.nameLabel = scene.add.text(x, y - 20, 'Tavern Keeper', {
      fontSize: '8px', fontFamily: 'Verdana', fontStyle: 'bold', color: '#FFD700'
    }).setOrigin(0.5).setDepth(10);

    // Internal ConsumableMerchant for shop functionality
    this.merchant = new ConsumableMerchant(scene, x, y, 99);
    // Hide the merchant sprite (keeper IS the merchant visually)
    try { this.merchant.sprite.setVisible(false); this.merchant.sprite.body.enable = false; } catch (e) {}
    try { if (this.merchant.marker) this.merchant.marker.setVisible(false); } catch (e) {}
  }

  /**
   * Called when the player interacts with the tavern keeper.
   * Shows tutorial on first visit, otherwise opens shop.
   */
  interact(tavernScene) {
    const tutorialSeen = this.scene.registry.get('tavernTutorialSeen');

    if (!tutorialSeen) {
      this.showTutorial(tavernScene);
    } else {
      this.openShop(tavernScene);
    }
  }

  showTutorial(tavernScene) {
    const lines = [
      "Welcome to Haven, traveler. This is the Rusty Flagon.",
      "Check the BOUNTY BOARD in the market square for work.",
      "Buy food and drink from me to keep your strength up.",
      "Be careful out there — gain too much infamy and the guards will come for you."
    ];

    this._showDialogue(tavernScene, lines, 0, () => {
      this.scene.registry.set('tavernTutorialSeen', true);
    });
  }

  _showDialogue(tavernScene, lines, index, onComplete) {
    if (index >= lines.length) {
      if (onComplete) onComplete();
      return;
    }

    // Create dialogue box
    if (this._dialogBg) { try { this._dialogBg.destroy(); } catch (e) {} }
    if (this._dialogText) { try { this._dialogText.destroy(); } catch (e) {} }
    if (this._dialogHint) { try { this._dialogHint.destroy(); } catch (e) {} }

    const cx = 400;
    const cy = 480;

    this._dialogBg = tavernScene.add.rectangle(cx, cy, 500, 60, 0x000000, 0.85)
      .setStrokeStyle(1, 0xFFD700).setDepth(200);
    this._dialogText = tavernScene.add.text(cx, cy - 6, lines[index], {
      fontSize: '11px', fontFamily: 'Verdana', color: '#ffffff',
      wordWrap: { width: 470 }, align: 'center'
    }).setOrigin(0.5).setDepth(201);
    this._dialogHint = tavernScene.add.text(cx, cy + 20, '[E] Continue', {
      fontSize: '9px', fontFamily: 'Verdana', color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(201);

    // Wait for next E press to advance
    const handler = () => {
      if (Phaser.Input.Keyboard.JustDown(tavernScene.keys.E)) {
        tavernScene.input.keyboard.off('keydown', handler);
        try { this._dialogBg.destroy(); } catch (e) {}
        try { this._dialogText.destroy(); } catch (e) {}
        try { this._dialogHint.destroy(); } catch (e) {}
        this._showDialogue(tavernScene, lines, index + 1, onComplete);
      }
    };

    // Use a short delay to prevent the current E press from immediately advancing
    tavernScene.time.delayedCall(200, () => {
      tavernScene.input.keyboard.on('keydown', handler);
    });
  }

  openShop(tavernScene) {
    // Get greeting based on fame/infamy
    const fame = this.scene.registry.get('fame') || 0;
    const infamy = this.scene.registry.get('infamy') || 0;

    let greeting = "What'll it be?";
    if (fame > 40) greeting = "Good to see you, friend! What'll you have?";
    else if (infamy > 40) greeting = "Y-you again... What do you want?";

    // Launch MerchantDialogueScene with the internal ConsumableMerchant
    // We need to pause TavernScene and launch the merchant dialogue
    tavernScene.scene.launch('MerchantDialogueScene', {
      alchemist: this.merchant,
      greeting,
      parentScene: 'TavernScene'
    });
    tavernScene.scene.bringToTop('MerchantDialogueScene');
    tavernScene.scene.pause();
  }
}
