// src/ui/EventUI.js
import Phaser from 'phaser';

export class EventUI extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, scene.scale.width / 2, scene.scale.height / 2);
        this.scene = scene;
        this.scene.add.existing(this);
        this.setDepth(200);
        this.setVisible(false);
        this.setAlpha(0);

        // Design constants
        this.config = {
            width: 580,
            height: 480,
            padding: 28,
            cornerRadius: 12,
            colors: {
                bgOuter: 0x0d0d0d,
                bgInner: 0x1a1a1a,
                bgPanel: 0x252525,
                border: 0x3d3d3d,
                borderHighlight: 0x5a5a5a,
                gold: 0xffd700,
                titleGlow: 0xffaa00,
                textPrimary: 0xeeeeee,
                textSecondary: 0xaaaaaa,
                buttonNormal: 0x2a2a2a,
                buttonHover: 0x3a3a3a,
                buttonActive: 0x1a1a1a,
                buttonBorder: 0x4a4a4a,
                resultSuccess: 0x66dd66,
                resultWarning: 0xddaa44,
                resultDanger: 0xdd6666,
                divider: 0x3a3a3a
            }
        };

        this.buttons = [];
        this.createUI();
    }

    createUI() {
        const { width, height, padding, colors } = this.config;

        // Dimmed backdrop (full screen overlay)
        this.backdrop = this.scene.add.rectangle(0, 0, this.scene.scale.width * 2, this.scene.scale.height * 2, 0x000000, 0.7);
        this.add(this.backdrop);

        // Outer frame with subtle glow effect
        this.outerGlow = this.scene.add.rectangle(0, 0, width + 8, height + 8, colors.gold, 0.15);
        this.add(this.outerGlow);

        // Main panel background
        this.bgOuter = this.scene.add.rectangle(0, 0, width, height, colors.bgOuter)
            .setStrokeStyle(3, colors.border);
        this.add(this.bgOuter);

        // Inner panel
        this.bgInner = this.scene.add.rectangle(0, 0, width - 16, height - 16, colors.bgInner)
            .setStrokeStyle(1, colors.borderHighlight);
        this.add(this.bgInner);

        // === HEADER SECTION ===
        const headerY = -height / 2 + 50;
        
        // Decorative header bar
        this.headerBar = this.scene.add.rectangle(0, headerY - 20, width - 40, 4, colors.gold, 0.6);
        this.add(this.headerBar);

        // Event icon placeholder (decorative diamond)
        this.eventIcon = this.createEventIcon(0, headerY + 5);
        this.add(this.eventIcon);

        // Title with shadow
        this.titleShadow = this.scene.add.text(2, headerY + 42, 'Event Title', {
            fontSize: '26px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(0.5).setAlpha(0.5);
        this.add(this.titleShadow);

        this.titleText = this.scene.add.text(0, headerY + 40, 'Event Title', {
            fontSize: '26px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.add(this.titleText);

        // Decorative divider under title
        this.titleDivider = this.createDivider(0, headerY + 70, width - 80);
        this.add(this.titleDivider);

        // === DESCRIPTION SECTION ===
        const descY = headerY + 100;

        // Description panel background
        this.descPanel = this.scene.add.rectangle(0, descY + 30, width - 60, 100, colors.bgPanel, 0.6)
            .setStrokeStyle(1, colors.divider);
        this.add(this.descPanel);

        // Description text with quote styling
        this.descText = this.scene.add.text(0, descY + 30, 'Event Description...', {
            fontSize: '15px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6,
            wordWrap: { width: width - 100 }
        }).setOrigin(0.5);
        this.add(this.descText);

        // === CHOICES SECTION ===
        this.choicesLabel = this.scene.add.text(0, descY + 95, '— What will you do? —', {
            fontSize: '12px',
            fontFamily: 'Verdana',
            color: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        this.add(this.choicesLabel);

        // Container for choice buttons
        this.buttonContainer = this.scene.add.container(0, descY + 140);
        this.add(this.buttonContainer);

        // === RESULT SECTION ===
        // Result panel (hidden initially)
        this.resultPanel = this.scene.add.container(0, descY + 80);
        this.resultPanel.setVisible(false);
        this.add(this.resultPanel);

        const resultBg = this.scene.add.rectangle(0, 0, width - 60, 120, colors.bgPanel, 0.8)
            .setStrokeStyle(2, colors.gold, 0.5);
        this.resultPanel.add(resultBg);

        this.resultIcon = this.scene.add.text(0, -30, '✦', {
            fontSize: '28px',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.resultPanel.add(this.resultIcon);

        this.resultText = this.scene.add.text(0, 20, '', {
            fontSize: '15px',
            fontFamily: 'Georgia, serif',
            color: '#66dd66',
            align: 'center',
            lineSpacing: 4,
            wordWrap: { width: width - 100 }
        }).setOrigin(0.5);
        this.resultPanel.add(this.resultText);

        // === FOOTER / CONTINUE BUTTON ===
        this.continueBtn = this.createContinueButton(0, height / 2 - 50);
        this.continueBtn.setVisible(false);
        this.add(this.continueBtn);

        // Footer divider
        this.footerDivider = this.createDivider(0, height / 2 - 85, width - 80);
        this.footerDivider.setAlpha(0);
        this.add(this.footerDivider);
    }

    createEventIcon(x, y) {
        const container = this.scene.add.container(x, y);

        // Outer diamond
        const outerSize = 24;
        const outer = this.scene.add.graphics();
        outer.fillStyle(0xffd700, 0.3);
        outer.fillPoints([
            { x: 0, y: -outerSize },
            { x: outerSize, y: 0 },
            { x: 0, y: outerSize },
            { x: -outerSize, y: 0 }
        ], true);
        container.add(outer);

        // Inner diamond
        const innerSize = 14;
        const inner = this.scene.add.graphics();
        inner.fillStyle(0xffd700, 0.8);
        inner.fillPoints([
            { x: 0, y: -innerSize },
            { x: innerSize, y: 0 },
            { x: 0, y: innerSize },
            { x: -innerSize, y: 0 }
        ], true);
        container.add(inner);

        // Center dot
        const center = this.scene.add.circle(0, 0, 4, 0xffffff, 1);
        container.add(center);

        return container;
    }

    createDivider(x, y, width) {
        const container = this.scene.add.container(x, y);

        // Center line
        const line = this.scene.add.rectangle(0, 0, width, 1, 0x4a4a4a);
        container.add(line);

        // Left ornament
        const leftOrn = this.scene.add.text(-width / 2 - 10, 0, '◆', {
            fontSize: '10px',
            color: '#666666'
        }).setOrigin(0.5);
        container.add(leftOrn);

        // Right ornament
        const rightOrn = this.scene.add.text(width / 2 + 10, 0, '◆', {
            fontSize: '10px',
            color: '#666666'
        }).setOrigin(0.5);
        container.add(rightOrn);

        return container;
    }

    createChoiceButton(x, y, text, index, callback) {
        const { width, colors } = this.config;
        const btnWidth = width - 80;
        const btnHeight = 48;

        const container = this.scene.add.container(x, y);

        // Button background
        const bg = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, colors.buttonNormal)
            .setStrokeStyle(1, colors.buttonBorder);
        container.add(bg);

        // Left accent bar
        const accent = this.scene.add.rectangle(-btnWidth / 2 + 3, 0, 4, btnHeight - 8, colors.gold, 0.7);
        container.add(accent);

        // Choice number
        const numBg = this.scene.add.circle(-btnWidth / 2 + 28, 0, 14, 0x333333);
        container.add(numBg);

        const numText = this.scene.add.text(-btnWidth / 2 + 28, 0, `${index + 1}`, {
            fontSize: '14px',
            fontFamily: 'Verdana',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        container.add(numText);

        // Choice text
        const label = this.scene.add.text(10, 0, text, {
            fontSize: '15px',
            fontFamily: 'Verdana',
            color: '#dddddd'
        }).setOrigin(0, 0.5);
        container.add(label);

        // Arrow indicator
        const arrow = this.scene.add.text(btnWidth / 2 - 20, 0, '›', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#666666'
        }).setOrigin(0.5);
        container.add(arrow);

        // Interactive behavior
        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                bg.setFillStyle(colors.buttonHover);
                bg.setStrokeStyle(2, colors.gold, 0.6);
                accent.setFillStyle(colors.gold);
                label.setColor('#ffffff');
                arrow.setColor('#ffd700');
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 100,
                    ease: 'Quad.easeOut'
                });
            })
            .on('pointerout', () => {
                bg.setFillStyle(colors.buttonNormal);
                bg.setStrokeStyle(1, colors.buttonBorder);
                accent.setFillStyle(colors.gold, 0.7);
                label.setColor('#dddddd');
                arrow.setColor('#666666');
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100,
                    ease: 'Quad.easeOut'
                });
            })
            .on('pointerdown', () => {
                bg.setFillStyle(colors.buttonActive);
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 0.98,
                    scaleY: 0.98,
                    duration: 50
                });
            })
            .on('pointerup', () => {
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 50,
                    onComplete: callback
                });
            });

        return container;
    }

    createContinueButton(x, y) {
        const { colors } = this.config;
        const btnWidth = 200;
        const btnHeight = 44;

        const container = this.scene.add.container(x, y);

        // Button glow
        const glow = this.scene.add.rectangle(0, 0, btnWidth + 8, btnHeight + 8, colors.gold, 0.2);
        container.add(glow);

        // Button background
        const bg = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0x2a2a2a)
            .setStrokeStyle(2, colors.gold, 0.8);
        container.add(bg);

        // Button text
        const label = this.scene.add.text(0, 0, 'Continue', {
            fontSize: '18px',
            fontFamily: 'Verdana',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        container.add(label);

        // Interactive
        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                bg.setFillStyle(0x3a3a3a);
                glow.setAlpha(0.4);
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            })
            .on('pointerout', () => {
                bg.setFillStyle(0x2a2a2a);
                glow.setAlpha(0.2);
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            })
            .on('pointerdown', () => {
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 50
                });
            })
            .on('pointerup', () => {
                this.hide();
            });

        return container;
    }

    showEvent(eventData, onChoiceSelected) {
        this.setVisible(true);
        this.setScale(0.9);
        this.setAlpha(0);

        // Animate in
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 250,
            ease: 'Back.easeOut'
        });

        // Subtle glow pulse animation
        this.scene.tweens.add({
            targets: this.outerGlow,
            alpha: { from: 0.15, to: 0.25 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Update content
        this.titleText.setText(eventData.title);
        this.titleShadow.setText(eventData.title);
        this.descText.setText(eventData.description);

        // Reset state
        this.resultPanel.setVisible(false);
        this.continueBtn.setVisible(false);
        this.footerDivider.setAlpha(0);
        this.choicesLabel.setVisible(true);
        this.buttonContainer.setVisible(true);

        // Clear previous buttons
        this.buttonContainer.removeAll(true);
        this.buttons = [];

        // Generate choice buttons with staggered animation
        let yOffset = 0;
        eventData.choices.forEach((choice, index) => {
            const btn = this.createChoiceButton(0, yOffset, choice.text, index, () => {
                const result = onChoiceSelected(choice);
                this.showResult(result);
            });
            btn.setAlpha(0);
            btn.x = -30;
            this.buttonContainer.add(btn);
            this.buttons.push(btn);

            // Stagger animation
            this.scene.tweens.add({
                targets: btn,
                alpha: 1,
                x: 0,
                duration: 200,
                delay: 150 + (index * 80),
                ease: 'Quad.easeOut'
            });

            yOffset += 58;
        });
    }

    showResult(text) {
        // Determine result type for coloring
        let resultColor = '#66dd66';
        let resultIcon = '✦';
        
        if (text.includes('Infamy') || text.includes('HP') || text.includes('damage')) {
            resultColor = '#dd6666';
            resultIcon = '⚠';
        } else if (text.includes('Gold') && !text.includes('+')) {
            resultColor = '#ddaa44';
            resultIcon = '◈';
        } else if (text.includes('+')) {
            resultColor = '#66dd66';
            resultIcon = '★';
        }

        this.resultText.setColor(resultColor);
        this.resultIcon.setText(resultIcon);

        // Animate out choices
        this.scene.tweens.add({
            targets: [this.buttonContainer, this.choicesLabel],
            alpha: 0,
            y: '-=20',
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.buttonContainer.setVisible(false);
                this.choicesLabel.setVisible(false);

                // Show result
                this.resultText.setText(text);
                this.resultPanel.setAlpha(0);
                this.resultPanel.setVisible(true);
                this.resultPanel.y += 20;

                this.scene.tweens.add({
                    targets: this.resultPanel,
                    alpha: 1,
                    y: '-=20',
                    duration: 300,
                    ease: 'Back.easeOut'
                });

                // Show continue button
                this.continueBtn.setAlpha(0);
                this.continueBtn.setVisible(true);
                this.footerDivider.setAlpha(0);

                this.scene.tweens.add({
                    targets: [this.continueBtn, this.footerDivider],
                    alpha: 1,
                    duration: 300,
                    delay: 200,
                    ease: 'Quad.easeOut'
                });
            }
        });
    }

    hide() {
        // Stop glow animation
        this.scene.tweens.killTweensOf(this.outerGlow);

        // Animate out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 200,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.setVisible(false);
                this.scene.events.emit('eventCompleted');
            }
        });
    }
}
