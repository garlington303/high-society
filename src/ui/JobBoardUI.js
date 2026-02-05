// src/ui/JobBoardUI.js
import Phaser from 'phaser';

/**
 * Full-screen bounty board modal — follows the EventUI design language.
 * Shows 3 job cards; player clicks ACCEPT to take one.
 */
export class JobBoardUI extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.scene = scene;
    this.scene.add.existing(this);
    this.setDepth(200);
    this.setVisible(false);
    this.setAlpha(0);

    this.config = {
      width: 580,
      height: 520,
      padding: 28,
      colors: {
        bgOuter: 0x0d0d0d,
        bgInner: 0x1a1a1a,
        bgPanel: 0x252525,
        border: 0x3d3d3d,
        borderHighlight: 0x5a5a5a,
        gold: 0xffd700,
        textPrimary: 0xeeeeee,
        textSecondary: 0xaaaaaa,
        buttonNormal: 0x2a2a2a,
        buttonHover: 0x3a3a3a,
        buttonBorder: 0x4a4a4a,
        riskLow: 0x66dd66,
        riskMedium: 0xddaa44,
        riskHigh: 0xdd6666,
        divider: 0x3a3a3a
      }
    };

    this.jobCards = [];
    this.onJobAccepted = null;
    this.createUI();
  }

  createUI() {
    const { width, height, colors } = this.config;

    // Dimmed backdrop
    this.backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0x000000, 0.7);
    this.add(this.backdrop);

    // Outer glow
    this.outerGlow = this.scene.add.rectangle(0, 0, width + 8, height + 8, colors.gold, 0.15);
    this.add(this.outerGlow);

    // Main panel
    this.bgOuter = this.scene.add.rectangle(0, 0, width, height, colors.bgOuter)
      .setStrokeStyle(3, colors.border);
    this.add(this.bgOuter);

    // Inner panel
    this.bgInner = this.scene.add.rectangle(0, 0, width - 16, height - 16, colors.bgInner)
      .setStrokeStyle(1, colors.borderHighlight);
    this.add(this.bgInner);

    // Header
    const headerY = -height / 2 + 45;

    this.headerBar = this.scene.add.rectangle(0, headerY - 18, width - 40, 4, colors.gold, 0.6);
    this.add(this.headerBar);

    this.titleText = this.scene.add.text(0, headerY + 12, 'BOUNTY BOARD', {
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'bold',
      color: '#ffd700'
    }).setOrigin(0.5);
    this.add(this.titleText);

    this.subtitleText = this.scene.add.text(0, headerY + 38, 'Select a job from the board', {
      fontSize: '12px',
      fontFamily: 'Verdana',
      color: '#888888',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    this.add(this.subtitleText);

    // Divider
    this.topDivider = this.scene.add.rectangle(0, headerY + 55, width - 60, 1, colors.divider);
    this.add(this.topDivider);

    // Card container
    this.cardContainer = this.scene.add.container(0, headerY + 75);
    this.add(this.cardContainer);

    // Close button
    this.closeBtn = this._createCloseButton(0, height / 2 - 40);
    this.add(this.closeBtn);

    // Active job warning text (hidden by default)
    this.warningText = this.scene.add.text(0, height / 2 - 75, '', {
      fontSize: '13px',
      fontFamily: 'Verdana',
      color: '#dd6666',
      fontStyle: 'italic'
    }).setOrigin(0.5).setVisible(false);
    this.add(this.warningText);

    // Keyboard: ESC to close
    this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escKey.on('down', () => {
      if (this.visible) this.hide();
    });

    // Number keys 1-3 for quick accept
    for (let i = 1; i <= 3; i++) {
      const key = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[`${i === 1 ? 'ONE' : i === 2 ? 'TWO' : 'THREE'}`]);
      key.on('down', () => {
        if (this.visible && this.jobCards[i - 1] && this.jobCards[i - 1].acceptCallback) {
          this.jobCards[i - 1].acceptCallback();
        }
      });
    }
  }

  /**
   * Show the board with the given jobs array.
   * @param {Array} jobs  — from jobSystem.getAvailableJobs()
   * @param {Function} onAccept  — called with jobId when player accepts
   */
  show(jobs, onAccept) {
    this.onJobAccepted = onAccept;
    this.setVisible(true);
    this.setScale(0.9);
    this.setAlpha(0);

    // Animate in
    this.scene.tweens.add({
      targets: this,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });

    // Glow pulse
    this.scene.tweens.add({
      targets: this.outerGlow,
      alpha: { from: 0.15, to: 0.25 },
      duration: 1500,
      yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Check for active job
    const hasActive = jobs.some(j => j.isActive);
    if (hasActive) {
      const active = jobs.find(j => j.isActive);
      this.warningText.setText(`Active job: ${active.title} — complete or abandon it first.`);
      this.warningText.setVisible(true);
    } else {
      this.warningText.setVisible(false);
    }

    // Build cards
    this.cardContainer.removeAll(true);
    this.jobCards = [];

    let yOffset = 0;
    jobs.forEach((job, index) => {
      const card = this._createJobCard(0, yOffset, job, index, hasActive);
      card.setAlpha(0);
      card.x = -20;
      this.cardContainer.add(card);
      this.jobCards.push(card);

      this.scene.tweens.add({
        targets: card,
        alpha: 1, x: 0,
        duration: 200,
        delay: 100 + index * 80,
        ease: 'Quad.easeOut'
      });

      yOffset += 115;
    });
  }

  hide() {
    this.scene.tweens.killTweensOf(this.outerGlow);
    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 0.9, scaleY: 0.9,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.setVisible(false);
        this.scene.events.emit('jobBoardClosed');
      }
    });
  }

  // ------------------------------------------------------------------
  // Card builder
  // ------------------------------------------------------------------

  _createJobCard(x, y, job, index, disableAccept) {
    const { width, colors } = this.config;
    const cardW = width - 60;
    const cardH = 100;

    const container = this.scene.add.container(x, y);

    // Card background
    const bg = this.scene.add.rectangle(0, 0, cardW, cardH, colors.bgPanel)
      .setStrokeStyle(1, colors.buttonBorder);
    container.add(bg);

    // Risk dot
    const riskColors = { low: colors.riskLow, medium: colors.riskMedium, high: colors.riskHigh };
    const dotColor = riskColors[job.riskLevel] || colors.textSecondary;
    const dot = this.scene.add.circle(-cardW / 2 + 22, -20, 8, dotColor);
    container.add(dot);

    // Risk label
    const riskLabel = this.scene.add.text(-cardW / 2 + 22, -2, job.riskLevel.toUpperCase(), {
      fontSize: '9px', fontFamily: 'Verdana', fontStyle: 'bold',
      color: '#' + dotColor.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    container.add(riskLabel);

    // Number badge
    const numBg = this.scene.add.circle(-cardW / 2 + 22, 22, 11, 0x333333);
    container.add(numBg);
    const numText = this.scene.add.text(-cardW / 2 + 22, 22, `${index + 1}`, {
      fontSize: '13px', fontFamily: 'Verdana', fontStyle: 'bold', color: '#ffd700'
    }).setOrigin(0.5);
    container.add(numText);

    // Title
    const titleX = -cardW / 2 + 50;
    const title = this.scene.add.text(titleX, -28, job.title, {
      fontSize: '16px', fontFamily: 'Georgia, serif', fontStyle: 'bold', color: '#eeeeee'
    }).setOrigin(0, 0.5);
    container.add(title);

    // Description
    const desc = this.scene.add.text(titleX, -6, job.description, {
      fontSize: '12px', fontFamily: 'Verdana', fontStyle: 'italic', color: '#aaaaaa',
      wordWrap: { width: cardW - 170 }
    }).setOrigin(0, 0);
    container.add(desc);

    // Reward hints + bias
    const rewardParts = [];
    if (job.rewards.gold) rewardParts.push(`~${job.rewards.gold}g`);
    if (job.biasLabel) rewardParts.push(job.biasLabel);
    const rewardStr = rewardParts.join('  ');

    const rewardText = this.scene.add.text(titleX, 30, rewardStr, {
      fontSize: '11px', fontFamily: 'Verdana', color: '#ffd700'
    }).setOrigin(0, 0.5);
    container.add(rewardText);

    // Accept button (right side)
    const btnW = 80;
    const btnH = 32;
    const btnX = cardW / 2 - 55;
    const btnBg = this.scene.add.rectangle(btnX, 0, btnW, btnH, colors.buttonNormal)
      .setStrokeStyle(1, colors.buttonBorder);
    container.add(btnBg);

    const isActive = job.isActive;
    const btnLabel = this.scene.add.text(btnX, 0, isActive ? 'ACTIVE' : 'ACCEPT', {
      fontSize: '13px', fontFamily: 'Verdana', fontStyle: 'bold',
      color: isActive ? '#66dd66' : '#dddddd'
    }).setOrigin(0.5);
    container.add(btnLabel);

    const canAccept = !disableAccept && !isActive;

    const doAccept = () => {
      if (!canAccept) return;
      if (this.onJobAccepted) {
        this.onJobAccepted(job.id);
      }
      this.hide();
    };

    container.acceptCallback = canAccept ? doAccept : null;

    if (canAccept) {
      btnBg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          btnBg.setFillStyle(colors.buttonHover);
          btnBg.setStrokeStyle(2, colors.gold, 0.6);
          btnLabel.setColor('#ffd700');
        })
        .on('pointerout', () => {
          btnBg.setFillStyle(colors.buttonNormal);
          btnBg.setStrokeStyle(1, colors.buttonBorder);
          btnLabel.setColor('#dddddd');
        })
        .on('pointerup', doAccept);
    }

    return container;
  }

  _createCloseButton(x, y) {
    const { colors } = this.config;
    const btnW = 160;
    const btnH = 38;
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, btnW, btnH, 0x2a2a2a)
      .setStrokeStyle(1, colors.buttonBorder);
    container.add(bg);

    const label = this.scene.add.text(0, 0, 'Close', {
      fontSize: '16px', fontFamily: 'Verdana', color: '#aaaaaa'
    }).setOrigin(0.5);
    container.add(label);

    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => { bg.setFillStyle(0x3a3a3a); label.setColor('#ffffff'); })
      .on('pointerout', () => { bg.setFillStyle(0x2a2a2a); label.setColor('#aaaaaa'); })
      .on('pointerup', () => this.hide());

    return container;
  }
}
