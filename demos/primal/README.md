# Primal: The Hunter's Journal

A digital campaign binder, expedition setup assistant and rules reference for the *Primal: The Awakening* board game. It sits beside the physical table and removes bookkeeping; the cards, miniatures, combat board and monster behaviour stay physical.

The view layer is **Vue 3**. Everything else: routing, state, events, validation, the chapter state machine, logging, search, shortcuts and the UI kit: comes from the `@vielzeug/*` ecosystem.

## Running it

```bash
pnpm install
pnpm dev
pnpm dev:local       # resolve @vielzeug/* directly to sibling package source
pnpm build
pnpm build:local
pnpm test
pnpm extract:quests       # regenerate src/content/data/quests.json (incl. reward-card, forge-unlock and
                           # progression-effect fields) from docs/campaign_book.md and the rulebook
pnpm extract:hero-scans   # regenerate the id-keyed hero-scans manifest from public/cards/hero_*
pnpm check:cards          # routine structural gate: every card joins a scan, no orphans (fast, no OCR)
pnpm audit:cards          # full review report with OCR: the onboarding verification when new heroes,
                           # equipment or expansions are added; review its flags by hand (needs a Mac)
```

## Design direction

The Hunter’s Companion is an operate-first, table-side interface that translates Reggie Games’ art-first visual language into an operational product rather than a storefront. Warm white and neutral charcoal themes, sand-gold actions, restrained Primal display typography, game-object recognition, and semantic color support fast decisions and readable setup. The home menu stays minimal; campaign phases share a clean navigation pattern; Hunters uses a card-based player board; crafting keeps dense, bounded recipe browsing.

## Current scope (Phase 1)

- Game-like main menu with New Game / Load Game / Campaigns / Expeditions / Crafting / Manual / Settings.
- Campaign creation: name, expansions, variants and a 2–4 hunter party; Chapters 1–10 confirm story rewards before Quest Board → Preparation → Hunt → Result. Chapter 11 skips the Quest Board and ends with preparation, The Awakening battle and the campaign’s achievement-dependent ending.
- Quest progression: Clockwork validates locked → available → active → completed/expired transitions. The Quest Board separates reversible inspection from an atomic quest commitment, pairs compact quest cards with a responsive briefing, keeps completed and expired history visible, shows the selected campaign variant’s current-aggression per-hunter stance targets in the briefing, and applies authored chapter, reward, expiration, and achievement rules automatically.
- Campaign bookkeeping: keyboard-accessible portrait roster, campaign-granted card-pool upgrades (five branches, two steps each, previewed with real card scans), resources, a physical player-board loadout, created potion inventory and three-slot hunt loadout, notes, statistics, protected hunt results and immediate undo. Hunter’s Trial separates the current Defeat track from Total Defeats, awards first-try, confirmed no-KO, and 3+X Nightmare Valor when explicitly combined with the Nightmare variant, enforces campaign termination, and calculates the final Hunter Score and revised Nightmare rank.
- Expedition workflow: boxes → party → target → aggression level → hunt → review; target selection pairs a compact monster index with persistent details, scenario selection previews the physical battlefield, and saved one-shot records open into Campaign-aligned status, setup, Hunt Reference, party, confirmed results, and management sections.
- Campaign hunts derive aggression from chapter progression: level 1 in Chapters 1–3, level 2 in Chapters 4–7, and level 3 from Chapter 8 onward.
- Campaign-aware Forge and Herbalist workbench with compact recipe shelves, full-card detail, loadout comparison, explicit rule-valid crafting payments and conversions, mandatory same-family lower-card upgrades with no element cost, optional equipment-card material conversions, same-category hunter resource trades, craft-only or equip outcomes, persistent potion inventory, and undoable transactions; a searchable codex remains available outside active crafting.
- Campaigns, expeditions, ascents, Winds series, hunter builds and settings persist in the per-account IndexedDB vault (`primal:<account>`), every record validated by the persisted schemas on read and write; backups export the whole account as a versioned JSON file and revalidate it on import.

## Architecture

- `src/content/`: static game content (hunters, monsters, quests, chapters, resources, keywords) with stable ids and `expansionId` on every entry. Data files live one collection per file (`data/forge/{weapons,armor,helm,items,potions}.json`, `data/heroes/<hunter>.json` + the id-keyed `scans.json` manifest) and parse through `@vielzeug/spell` schemas at module load; `ForgeEquipment` is a discriminated union (`WeaponEquipment | WornEquipment | CarriedItem`), so each kind carries only its own stats. Quests and keywords are extracted from `docs/campaign_book.md`; hero card scans join through the id-keyed `data/heroes/scans.json` manifest; reward cards carry their printed card number in their collection file and are granted by quests (`rewardCards`) and chapter stories (`rewardCardUnlocks`), then handed to one hunter, or every hunter for finale-set copies: through the campaign's assignment queue.
- `src/domain/`: pure rules: party validation, campaign/quest operations, chapter machine, expedition setup, typed errors. Fully unit tested; no DOM.
- `src/app/`: application layer: router, store, event bus, logger, search indexes, keymap, Vue bridge.
- `src/ui/`: Vue views and components. They render state and run store commands; they contain no game rules.

Fight tracking runs once at the local subject commit boundary, including host-forwarded commands and build saves. Commands provide typed intent only for semantic actions such as wounds, resets, knockouts, and unleashes; ordinary changes are derived from the committed state diff. Each history record retains its initial boards and numeric health/mastery facts, so replay does not depend on the current content catalog. Build changes and monster resets retain the facts needed to replay them accurately. Persistence validates actors, continuous sequences, actor-specific tracks, and delta/wound consistency. Sequence order is authoritative when timers are incomplete or reset.

Changing the roster starts a new tracking log; reordering the same party preserves it. Existing completed histories are retained.

Backup format **3** requires these snapshots. Older backups and saved record shapes are rejected; there is no migration or compatibility path. Regenerate the reference save with `pnpm reference:save` and import it through Settings. Import replaces the account's saved data.

## Package map

| Package | Where used | Why |
| --- | --- | --- |
| `clockwork` | `domain/chapter-machine`, `domain/quest-machine` | Enforce legal chapter phases and quest lifecycle transitions |
| `herald` | `app/events` | Domain notifications to toasts and the activity log |
| `keymap` | `app/keymap` | `g h`/`g c`/`g e`/`g f`/`g m`/`g n` navigation chords |
| `refine` | every view | Cards, grids, steppers, chips, carousel, inputs, dialogs, toasts |
| `ripple` | `app/store` | Reactive campaign, expedition and settings state bridged into Vue |
| `rune` | `app/logger` | Namespaced logging and the in-app activity feed |
| `scout` | `app/search` | Fuzzy keyword and monster search in the manual |
| `spell` | `domain/campaign` | Campaign configuration schema validation |
| `wayfinder` | `app/router` | Typed routes, params and view transitions |

## Attribution and legal notice

_Primal: The Hunter’s Journal_ is an unofficial, fan-made companion. _Primal: The Awakening_, its artwork, and all related materials are © and ™ [Reggie s.r.l.](https://reggiegames.com/). The project is not affiliated with, endorsed, or sponsored by the publisher; it is non-commercial and claims no rights over their content. Rights-holder concerns will be addressed promptly: open an issue in this repository.
