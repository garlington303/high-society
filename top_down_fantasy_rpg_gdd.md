# High Society — Top-Down Fantasy RPG (Refined & Expanded GDD)

This expanded document adds player-facing moment-to-moment design, concrete mechanics for the "one repeatable tension" action, fully fleshed phases, implementation subtasks, agent instructions, and ready prompts.

## 0. Quick Context
- Single persistent hub town: Haven (the player returns here between runs). All systems treat this as the only town for now.
- Registry keys: `gold`, `xp`, `level`, `stats`, `mainTownId`, `currentTownId`, `townRelations`, `townInfamy`, `townBounties`, inventory, progression.

## 1. Vision & Elevator Pitch
- A tense, repeatable top-down action loop where short runs out of town produce immediate choices and consequences that meaningfully change the town on return (prices, NPC attitudes, law enforcement). The systems should reward decisive action and make tradeoffs between short-term gain vs long-term standing.

## 2. Player Experience & Core Moment-to-Moment Loop

Goal: create a 5–30s moment-to-moment loop that answers "what do I DO?" and gives consistent, visceral feedback.

- The missing piece (what to build first): a single, repeatable job/run loop that produces tension, risk and choice every few seconds. Implement this before adding more systems or polish.

Intended micro-loop (every 5–30s):
- Input: Player chooses an immediate action (move, attack, interact, sneak, pickpocket, bribe).
- Resistance: Enemies, time pressure, detection, contested objectives, random events.
- Feedback: Instant visual/audio feedback, small numerical changes (HP, loot), and a clear narrative outcome (success/failure/caught).

Macro loop (player session):
1. In town: accept a Job (e.g., Smuggle job / Heist / Escort / Fetch), pick loadout.
2. Leave town: enter overworld/run area with explicit objectives and a short timer/route.
3. Run encounters: fights, social choices, skill checks, stealth windows.
4. Resolve objective: steal item, deliver goods, free captive, or gather resource.
5. Return to town: trade, spend, receive consequences (Fame/Infamy) from performance.

Concrete example job (the recommended first tension mechanic): "Shadow Run — Smuggle a contraband cache into/out of a guarded location"
- Objective: Get X crates from point A to point B OR steal an item from a guarded stall and deliver to NPC.
- Constraints: limited inventory slots, a short timer (e.g., 90s), and periodic guard sweeps (detection windows every 12–18s).
- Player choices each encounter: fight, evade, bribe, talk (skill check), or throw distraction.
- Immediate feedback: detection levels, flashing UI gauge, guard alert noises, reduced movement while carrying, loot weight.
- Consequences: success → gold + potential Fame; caught → Infamy increase, bounty added to `townBounties`.

Why this works: it creates tension (time + detection), meaningful choices (bribe vs fight vs flee), frequent feedback (every combat/interaction), and strong consequences tied to persistent town systems.

## 3. Expanded Key Systems (with focused implementation items)

A. Job / Run System (priority)
- Job descriptor: ID, objectives (fetch/steal/deliver), starter NPC, rewards (gold/xp/fame tradeoffs), timer, difficulty rating, risk level.
- Implementation tasks:
  1. Create `Job` data structure and `JobSystem` API: `listJobs()`, `acceptJob(jobId)`, `completeJob(result)`.
  2. Design and implement a simple Shadow Run job generator (spawn 3-5 pickup points, 1-3 patrolling guards, 1 priority target).
  3. UI: job acceptance panel, active job HUD (timer, objectives, detection meter).
  4. Integrate `EventSystem` to inject environmental tests (skill checks) during runs.

B. Detection & Stealth
- Detection meter per player: increases when in guard sight/cone, when running, or after certain actions.
- Mechanics: stealth modifier from `dex` and `lck`, light/dark tiles (tile property), noise from attacks.
- Implementation tasks:
  1. Add `detection` value to player state and draw a HUD meter.
  2. Modify `Guard.checkForPlayer()` to influence player detection; expose detection events (e.g., `detectionIncreased`).
  3. Skill checks: allow options such as `bribe` (CHA check), `charm` (CHA), `pickpocket` (DEX/LCK), `breakIn` (STR/DEX).

C. Skill Checks & Choice Feedback
- `StatSystem.check(stat, DC)` returns { success, roll, mod, total, critical } and a short text result used by `EventUI`.
- Implementation tasks:
  1. Ensure every player choice in events/job outcomes uses `StatSystem.check()` and shows roll details in the modal.
  2. Add success/failure branches that update `townRelations`/`townInfamy` accordingly.

D. Reward & Consequence Mapping
- Immediate: gold, items, HP loss, temporary items.
- Persistent: Fame (+) for heroic/clever actions, Infamy (+) for illegal/violent actions.
- Implementation tasks:
  1. Define reward tables for job tiers.
  2. Map job results to `fameSystem.addTownFame()` or `infamySystem.addTownInfamy()`.

E. Guard Behavior & Bounties
- Make bounty guards distinct: higher detection, chase speed, and on-capture clear `townBounties` with a penalty.
- Implementation tasks:
  1. Add `bounty` param to `Guard` constructor; increase stats if true.
  2. Update `GameScene` to spawn specific bounty guards (with tags) and to show a bounty icon on the map.

F. UI: Active Job HUD + Detection + Town Standing
- Show active job timer, objectives checklist, detection meter, and a small map legend for guards.
- `TownRelationshipBar` should show `Bounty: X` and be visible only in the town.

## 4. Phases — Deep Expansion with Subtasks and Acceptance Criteria

Phase A — Core Job & Run Loop (Target: playable single-job run)
- Subtasks:
  1. Add `Job` data model and `JobSystem` with a simple generator for Shadow Run jobs.
  2. Implement Active Job HUD (timer, objective list, basic accept/decline UI).
  3. Implement pickups (crate objects) that the player can pick up and carry (carry weight affects speed).
  4. Modify `OverworldScene`/run area to host job runs and guard patrols.
- Acceptance Criteria:
  - Player can accept a job, leave town, complete or fail it, and receive immediate reward/penalty.
  - Job HUD displays timer/objectives and updates in real time.

Phase B — Detection, Skill Checks, and Event Feedback
- Subtasks:
  1. Add player `detection` meter and HUD rendering.
  2. Make guards and environment raise/lower detection; implement detection thresholds (search, investigate, chase).
  3. Hook `EventUI` to show stat-check roll results (text + roll numbers).
- Acceptance Criteria:
  - Player sees detection grow/shrink and can respond with stealth/bribe/attack.
  - Skill checks display roll and outcome and drive job success/failure.

Phase C — Consequences & Town Reaction
- Subtasks:
  1. Map job outcomes to Fame/Infamy changes via `FameSystem.addTownFame()` and `InfamySystem.addTownInfamy()`.
  2. On high infamy, spawn bounty guards and increment `townBounties` (already partially implemented).
  3. Add `bountyResolved` reward/penalty flows and UI messages.
- Acceptance Criteria:
  - Town standing updates are visible in `TownRelationshipBar` after returns.
  - Bounty increases on infamy events; bounty guards behave as tougher variants.

Phase D — Merchant & Economy Reactions
- Subtasks:
  1. Make merchant inventories/price lists react to town fame (discounts for high fame, surcharges for low fame).
  2. Add merchant dialog variants that show trust/hostility based on `townRelations`.
  3. Add a simple sell/buy flow that gives XP or progression bonuses for legal trades.
- Acceptance Criteria:
  - Prices change when fame changes; merchant dialog reflects stance.

Phase E — Debug UI, Tuning, and Save/Load UX
- Subtasks:
  1. Add a debug panel (UIScene toggle) showing `fame`, `infamy`, `townBounties`, detection, and tunables (encounter distance, job timer).
  2. Add manual Save/Load buttons and a small autosave indicator.
  3. Create in-game tests: spawn a job and run it with a debug key to verify flows.
- Acceptance Criteria:
  - Developers can tune and see values live; Save/Load works and restores key state.

Phase F — Polishing, Content & Expansion
- Subtasks:
  1. Author 20 unique job templates and 40 event variations.
  2. Create guard/bounty variants, unique merchant types, and more UI polish.
  3. Balance economy and infamy/fame curves via playtests.

## 5. Implementation Priorities & Minimal MVE (Minimum Viable Experience)
- To make the game feel like a game quickly, implement these first (in order):
  1. `JobSystem` with Shadow Run generator + job HUD.
  2. Carry/pickup mechanic + carry weight affecting speed.
  3. Guard patrols + detection meter + detection feedback.
  4. Job resolution: success = gold + optional fame, failure = infamy + bounty.

This yields an immediate playable loop: accept job → run → react → return → consequences.

## 6. Agent Instructions & Ready Prompts (Concrete)

High-level agent rules (for each coding change):
- Always add/adjust TODO list entries via `manage_todo_list` when starting a multi-step task.
- Precede file edits with one-line preamble describing what will change.
- After edits, run quick repository searches and update event names in `GDD` if new signals are added.

Personality & code style reminders for the agent:
- Be concise, surgical, and add only minimal surface changes.
- Prefer to add new systems under `src/systems` and expose them through the `registry`.

Ready prompts (copy/paste)
- Build JobSystem and Job HUD:
  - "Create `src/systems/JobSystem.js` that provides job generation for 'Shadow Run' jobs (ID, objectives, timer, reward). Add methods `listJobs()`, `acceptJob(jobId)`, `getActiveJob()`. Create a minimal `JobUI` under `src/ui/JobUI.js` showing accept/decline and an in-run HUD with timer and objectives."

- Add detection meter and guard interaction:
  - "Add `detection` to player state (registry) and render a detection meter in `UIScene`. Make `Guard.checkForPlayer()` modify player `detection`. Add `detectionThresholds` for investigate/chase and fire events `playerDetected` and `playerAlerted`."

- Implement carry/pickup mechanic:
  - "Add pickup objects (crates) with `carryWeight` and make player `pickup()` add to a transient `carrying` list; reduce movement speed proportional to total carry weight."

## 7. Acceptance Criteria & Metrics
- Functional metrics to track during playtests:
  - Job cycle time (median time to accept→complete).
  - Detection events per job run.
  - % of jobs completed vs failed vs aborted.
  - Average town fame/infamy drift per hour of play.

Success metrics for early iteration (MVE):
- Players should be able to complete a full job cycle within 3 minutes and feel meaningful tension from detection and timer.
- The Town should visibly react to a player's repeated behavior (prices, guard density, bounty pool).

## 8. Testing Checklist
- Unit-like checks (manual): verify `JobSystem` generates at least 3 job tiers; ensure `SaveSystem` persists `townRelations`, `townInfamy`, `townBounties`.
- Playtest checklist: accept job, check HUD, interact with guard (bribe vs fight), return to town, verify town reaction.

---
If you'd like, I will now implement the Phase A MVE: create `JobSystem`, `JobUI`, pickup/carry mechanics, and basic guard detection hooks. I will start by adding a `manage_todo_list` for these subtasks and then implement them one-by-one. Reply with "Implement Phase A" to begin, or choose a different priority.
