# High Society

A gritty top-down 2D crime simulator emphasizing tension, emergent systems, and street-level decision-making.

## Vision

We are building a pure top-down (90°), old-school GTA / Chinatown Wars–inspired crime simulator focused on **logistics, heat, and survival** — not combat mastery.

The player is a low-level criminal operator navigating a hostile city where every action increases visibility. Combat is fast, directional, and intentionally unrewarding; prolonged fights mean the player has already failed strategically.

### Core Design Pillars

- **Heat as Currency**: Every action has a cost in visibility. The city remembers.
- **Indirect Progression**: Safer routes, better information, intermediaries — not raw power.
- **Risk/Reward Tension**: Push for more profit or extract early?
- **Readable Aesthetics**: 4-directional sprites, no rotation, minimal animation states.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| SHIFT | Sprint (generates heat over time) |
| E | Interact with dealers/customers/safehouses |
| 1-4 | Buy items in dealer menu |
| ESC | Close menus |

## Game Systems

### Heat System

Heat is your visibility to law enforcement. It accumulates through actions and decays slowly.

| Level | Heat | Effect |
|-------|------|--------|
| Safe | 0-20 | Police ignore you |
| Suspicious | 21-40 | Police may investigate |
| Wanted | 41-60 | Police actively looking |
| Hot | 61-80 | Police chase on sight |
| Hunted | 81-100 | Maximum response |

### Drug Economy

| Product | Buy | Sell | Risk |
|---------|-----|------|------|
| Weed | ~$20 | ~$35 | Low |
| Pills | ~$50 | ~$90 | Medium |
| Coke | ~$150 | ~$280 | High |
| Meth | ~$200 | ~$400 | Very High |

### Key Locations

- **Dealers** (purple): Buy product at wholesale prices
- **Customers** (yellow, exclamation mark): Sell for profit
- **Safe Houses** (cyan): Reduce heat significantly

## Project Structure

```
src/
├── main.js              # Game entry point
├── scenes/
│   ├── BootScene.js     # Asset loading
│   ├── GameScene.js     # Main gameplay
│   └── UIScene.js       # HUD and menus
├── entities/
│   ├── Player.js        # Player controller
│   ├── Police.js        # Police AI
│   ├── Civilian.js      # Civilian NPCs
│   ├── Dealer.js        # Drug dealers
│   └── Customer.js      # Buyers
├── systems/
│   ├── HeatSystem.js    # Wanted level management
│   └── DrugSystem.js    # Economy and transactions
├── world/
│   └── CityGenerator.js # Procedural city layout
└── utils/
    └── SpriteGenerator.js # Placeholder graphics
```

## Tech Stack

- **Phaser 3** - 2D game framework
- **Vite** - Build tool and dev server
- **Vanilla JavaScript** - No framework overhead

## Next Steps

- [ ] Add more police AI behaviors (patrols, investigation)
- [ ] Implement vehicle mechanics
- [ ] Add time-based events and missions
- [ ] Create district system with different risk/reward profiles
- [ ] Add save/load system
- [ ] Sound effects and ambient audio
- [ ] Replace placeholder sprites with AI-generated assets
