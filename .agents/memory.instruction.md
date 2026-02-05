---
applyTo: '**'
---

# Coding Preferences
- Use ES6 modules for all JavaScript files.
- Prefer `export class` syntax for Phaser scenes and systems.
- Use `const` and `let` appropriately; avoid `var`.
- Files should be organized by type: `src/scenes`, `src/entities`, `src/systems`, `src/ui`, `src/data`.

# Project Architecture
- **Framework**: Phaser 3
- **Scene Structure**:
    - `BootScene`: Asset loading.
    - `OverworldScene`: World map (if applicable).
    - `GameScene`: Main gameplay loop, world generation, entity management.
    - `UIScene`: HUD overlay, inventory, event dialogs.
- **Systems Pattern**:
    - Logic extracted to `src/systems/` (Infamy, Alchemy, Progression, Job, Event).
    - Systems instantiated in `GameScene` and attached to `this`.
    - Communication via `this.events` (Scene events) and `this.registry.events` (Global events).
- **Data Pattern**:
    - Static data in `src/data/` (ItemDatabase, JobDatabase, EventDatabase).
- **UI Pattern**:
    - UI components in `src/ui/` extending `Phaser.GameObjects.Container`.
    - `UIScene` manages instances of UI components.

# Solutions Repository
- **Event Listeners**: Game events (e.g. `enemyKilled`) are emitted by entities/scenes and listened to by Systems.
- **Debug Inputs**: Debug keys (J, U) added to `GameScene` to trigger system methods manually.
- **Subagents**: Cannot write files directly. Main agent must perform `create_file`.
