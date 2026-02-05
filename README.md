# High Society

Top-down fantasy / crime-adjacent simulator focused on exploration, extraction, and contained bullet-hell combat.

This repository contains a playable prototype built with Phaser and Three, served with Vite.

## Core Design

- Core loop: Prepare in town → Plan route/objectives → Explore overworld/dungeon → Enter high-risk combat zones → Gain temporary power → Decide when to extract → Return home → Convert progress into permanence

See the full living Game Design Document at [top_down_fantasy_rpg_gdd.md](top_down_fantasy_rpg_gdd.md).

## Quickstart

Prerequisites:
- Node.js (16+ recommended)
- npm (or yarn)

Install dependencies:

```bash
npm install
```

Run development server (Vite):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview built site locally:

```bash
npm run preview
```

## NPM Scripts

Provided by `package.json`:
- `dev` — start Vite dev server
- `build` — run Vite build
- `preview` — preview built output

## Stack & Dependencies

- Phaser (game engine)
- Three (3D support / special views)
- Vite (dev server / bundler)

See `package.json` for exact versions.

## Project Structure (high-level)

- `index.html` — entry HTML
- `src/` — main source code
  - `main.js` — bootstraps scenes and game
  - `scenes/` — Phaser scenes (`GameScene`, `OverworldScene`, `UIScene`, etc.)
  - `entities/` — game entity classes (Player, NPCs, enemies, Projectiles)
  - `systems/` — gameplay systems (Alchemy, Drug, Heat, Infamy)
  - `world/` — procedural generation (`CityGenerator`, `TownGenerator`)
  - `utils/` — helpers (Pathfinding, SpriteGenerator)
- `assets/` — art assets and source Aseprite files

## Design Notes for Developers

- The authoritative design doc is `top_down_fantasy_rpg_gdd.md`. Follow its laws: progress requires returning home, combat power is temporary, dash is positioning, stamina governs dominance, extraction creates tension.
- Dash is positional, not invulnerability. Stamina is shared and affects actions.
- Temporary upgrades are lost on failed extraction — design accordingly.

## Running & Development Tips

- Use the Vite dev server for fast hot reloads.
- Keep asset exports (Aseprite) at consistent tile sizes; see `assets/Tileset` for examples.
- When adding new scenes, register them in `src/main.js`.

## Contributing

- Fork, branch, and open pull requests.
- Keep changes minimal and focused; follow existing code style.
- If adding features that affect game balance or tension, update `top_down_fantasy_rpg_gdd.md` and summarize the change in the PR description.

## Next Steps (suggested)

- Add a small automated test harness for core systems (stamina, dash recharge).
- Add a short development checklist for art exports and level LDtk source.

---

If you'd like, I can:
- add a short CONTRIBUTING.md
- scaffold simple dev test scripts
- add run instructions for Windows-specific workflows
