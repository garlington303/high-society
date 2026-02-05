// src/ui/JobUI.js
import Phaser from 'phaser';

/**
 * HUD widget showing the currently active job (top-right corner).
 * Displays job title and current state in the loop.
 */
export class JobUI extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;
    this.scene.add.existing(this);
    this.setDepth(100);
    this.createUI();
    this.setVisible(false);
  }

  createUI() {
    // Background
    this.bg = this.scene.add.rectangle(0, 0, 280, 60, 0x000000, 0.7)
      .setOrigin(1, 0)
      .setStrokeStyle(1, 0x555555);
    this.add(this.bg);

    // Title
    this.titleText = this.scene.add.text(-270, 8, '', {
      fontSize: '14px',
      fontFamily: 'Verdana',
      fontStyle: 'bold',
      color: '#ffcc00'
    });
    this.add(this.titleText);

    // Status line
    this.statusText = this.scene.add.text(-270, 30, '', {
      fontSize: '11px',
      fontFamily: 'Verdana',
      color: '#aaaaaa',
      wordWrap: { width: 260 }
    });
    this.add(this.statusText);
  }

  /**
   * @param {object|null} job  — active job data (null = no job)
   * @param {string} jobState  — 'idle' | 'accepted' | 'traveling' | 'encounter' | 'returning'
   */
  updateJob(job, jobState) {
    if (!job || jobState === 'idle') {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);
    this.titleText.setText(job.title);

    const stateMessages = {
      accepted: 'Head to the town exit to begin.',
      traveling: 'Traveling to destination...',
      encounter: 'Encounter in progress!',
      returning: 'Returning to town...'
    };

    this.statusText.setText(stateMessages[jobState] || jobState);
  }
}
