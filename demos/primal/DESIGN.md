# Primal: The Hunter's Journal: Design

## Direction: The Hunter's Companion

The app is a table-side companion to the physical game, not a digital replacement for it.

It manages persistent campaign information, progression, crafting, resources, quests, setup, and reference material while leaving the physical game responsible for cards, miniatures, combat, and dice.

The interface should feel connected to the world of Primal without becoming a themed dashboard or an imitation of the rulebook.

## Mode

Operate first.

Players should be able to understand the current state and complete the next task with minimal navigation.

Atmosphere should reinforce the game experience, but never compete with information, controls, or readability.

## Design principles

### 1. Show the current situation

The interface should make the current campaign state immediately understandable:

- Where are we in the campaign?
- What phase are we in?
- What needs to happen next?
- What decisions are still unresolved?
- What has already been completed?

The current task should have the strongest visual hierarchy.

### 2. Keep the physical game and companion connected

The app should clearly support actions that happen at the table:

- Prepare the next hunt
- Check scenario setup
- Manage hunters
- Craft equipment
- Prepare potions
- Record campaign progress
- Look up rules and card information

Do not recreate physical gameplay unnecessarily.

### 3. Prefer game objects over generic UI

When information represents something from the game, make it feel like that object: hunters, weapons, armor, helms, items, potions, monsters, quests, resources.

Use cards, tokens, badges, icons, and compact records where they improve recognition and scanning. Avoid turning everything into generic dashboard cards.

### 4. Dense when useful, spacious when important

The interface should support quick scanning at the table.

Use compact layouts for inventories, resources, card lists, campaign records, filters, and setup checklists. Use more visual space for major decisions, the current phase, story content, important rewards, hunter identity, and scenario setup.

Density should follow the task rather than a fixed visual style.

## Hierarchy

The primary hierarchy is:

1. Campaign / session context
2. Current phase or task
3. Primary action
4. Relevant game state
5. Supporting information
6. Secondary actions and reference material

The UI should answer "what do I need to do now?" before "what else can I inspect?"

## Foundations

### Visual language

The companion translates Reggie Games’ official art-first language into a dense table-side tool rather than copying its storefront composition.

- White primary canvases with warm near-black text
- Neutral charcoal dark surfaces instead of green-tinted panels
- Inter as the operational typeface
- Primal display typography reserved for logos, chapter markers, monsters, and atmospheric moments
- Muted sand-gold primary actions with dark text
- Sentence-case controls with medium weight and restrained tracking
- Nearly square controls and cards with minimal shadows
- Color supplied primarily by game artwork and semantic game state
- Cinematic dark bands reserved for hunts and major narrative moments
- Strong distinction between interactive and informational content

The official marketing site’s large whitespace and hidden navigation do not transfer directly: campaign bookkeeping retains compact layouts, direct destinations, and comfortable touch targets.

### Color

Color should primarily communicate meaning, never decorate. All authored colors use OKLCH and live in one theme source; components consume the Refine semantic tokens, taking a game alias only where the game needs its own name. Primal overrides Refine’s primary and contrast scales for its warm official palette while retaining Refine’s derived surfaces, text roles, borders, shadows, focus states, and semantic colors.

Use accents consistently for current state, primary actions, elements, success and completion, warnings, and destructive actions.

### Navigation

Navigation should reflect how players think about the game rather than how the application is implemented.

Seven areas, in game terms: Campaigns, Expeditions, Builds, Forge, the Chronicle, Reference, and Settings — the Chronicle follows the Forge because it reviews what the table produced.

Campaign context should remain visible while working within the campaign. Expedition mode should feel independent from campaign state. The home menu stays minimal: a handful of labeled actions, no dashboard summaries.

### Interaction

Actions should be close to the information they affect.

Prefer inline actions, contextual controls, clear primary actions, progressive disclosure for secondary information, persistent filters when browsing game content, and checklists for multi-step setup. Avoid requiring players to move between multiple screens for a single table task.

Completed actions should become visually quieter while unresolved actions remain prominent.

On phones the phase dock reads as one tool row, the iOS toolbar grammar: the flanking zones (the back as its arrow circle, and the commit action: the primary's verb glyph as a circle, or the hunt's skull/trophy outcome circles) stretch equally so the tools sit dead-center on the row's true middle; the hunt clock keeps its own centered state row above, and every tool surface: the actions menu, the hunt's board pair, the preparation pairs: wears the row's pill shape. While the phase scrolls the pinned bar floats as a pill above the viewport's foot, inset from the edges with its own border like the iOS tab bar; when the content ends and the bar settles into the flow, it returns to the full-width bar. Crowded action clusters (preparation's three actions, the deck and build editors' five) collapse into the actions menu: a labeled pill at the row's center that opens the phase's actions upward over the dock as a grid of equal-sized action cards, every action on screen at once, one pick runs one action, the desktop's two editor clusters separated by a rule, disabled actions carried as disabled. The row never grows past the dock: the menu is an overlay, not a row member. From the tablet width up every dock keeps its labeled grammar unchanged.

### Responsive behavior

The primary environment is the gaming table.

Design for desktop, laptop, tablet, and smaller touch screens. Touch targets should remain comfortable, and information should remain readable at a glance. Avoid layouts that require precise mouse interaction or excessive scrolling during setup. On smaller screens, prioritize the current task over secondary navigation and metadata.

### Accessibility

Accessibility is part of the visual system rather than a separate concern.

Support persisted light, dark, and system theme preferences, keyboard navigation, visible focus, semantic structure, screen readers, sufficient contrast, non-color indicators, and comfortable touch targets. The interface should remain understandable without relying on visual theming alone.

## Shared surfaces

Every mode: campaign, expedition, Winds series, ascent: is assembled from one set of shared surfaces, stated once here; the mode sections cover only what makes each mode distinct. Hunters should feel like persistent game characters rather than database records: identity, progression, equipment, abilities, resources, and relevant history.

### Party workspace

The roster and the player board are one shared pair used by every party console: campaign, expedition, Winds series, and ascent, so all modes read and behave identically. Only the card pools and the edit and consume permissions differ.

The roster shows full portrait cards in place: artwork, weapon-class overline, hunter name. The workspace sits in the page’s block flow, because the docking roster could never leave a grid track. Once the player scrolls past it, the roster pins below the app navbar and collapses into a single rail of weapon glyph and hunter name: artwork and status fold away, selection and deck-invalid stay legible through the card treatment, the rail scrolls horizontally rather than wrapping, and arrow keys step it as one row. The collapse is one short settle on the shared motion token, still under reduced motion; the rail releases when the party section leaves the screen.

The identity line on the roster card is one shared component: the weapon-class glyph, the class overline, the hunter’s name: worn unchanged by every surface that names a hunter: the party load rows, the new-build picker, the forge bench. The dock’s rail fold is the component’s own compact mode, and a context gilds the glyph through the component’s variable instead of restyling it. The party load’s equipped mark is a badge pinned over the identity’s bottom corner: the unread-marker pattern, so a row never wraps for its verdict; a build that cannot fully load keeps its warning chip.

The console always renders open: the hunt-phase console sits under the hunt reference, above the result actions, with the same hunt-live subtitle and heading alignment as the page’s other sections, so the docking roster stays reachable mid-fight without an expansion step.

The player board reads as the physical player board: a double-height weapon in the first column; helm, armor, and the single item across the top row; three potion slots across the bottom row. Equipment selects from the cards the mode allows: owned cards in a campaign, every class-eligible card from the selected boxes in an expedition, and each potion slot holds one unique potion from the mode’s pool. Potions are consumed from the board: during the hunt in a campaign, until a result is recorded in an expedition: with an undo toast. A hunt-target strip lists every worn piece and marks those whose element the current monster is weak to as effective. Notes close the workspace as a full-width section.

On phones the phase is framed by two slim bars: the roster’s glyph rail docked under the navbar, the action bar holding the viewport’s foot: leaving the fight the screen between them.

### Phase dock

One action bar per phase, the navbar’s grammar mirrored at the viewport’s foot: full width, flush, one hairline on top, the same canvas wash and blur. It carries actions only: the phase’s back action in the bar’s left corner, its controls and primary on the right, never free text; state lives in the surfaces above. It sits in the page’s block flow: a sticky bar could never leave a grid track, while the music player and narration chip rise above it when present.

In hunt phases the bar is the fight’s instrument panel. The hunt clock claims the bar’s center place: dead-center from the desktop width up, where the flanking zones balance around it at equal shares; the bar’s leading zone through the tablet tiers; a centered row of its own on the phone: a place that leaves no gap when unclaimed. The two fight boards ride as one joined icon pair before the outcome pair, pinned while the party console scrolls; a finished hunt keeps the boards pair alone, its clock gone with the outcome already recorded. The campaign’s hunt dock carries no step back: the stepper above owns the return to preparation.

The outcome pair is one shared name across every mode: Record defeat and Record victory: whether it sits in a campaign chapter, an expedition, a Winds fight, or an ascent’s chapter end.

On phones the bar’s actions lay out as filled rows rather than a ragged centered wrap: every action grows to its row’s edges, the trailing action: the primary everywhere: takes a full row of its own, the outcome pair splits its row, and the flush bar pads clear of the home indicator.

The quest boards are the one exception: they commit straight from the selected card and carry no bar.

### Fight boards

The hunter board is the personal, phone-first fight surface, reached from the hunt hero or the expedition header and mirrored to guest phones through the session. It reads as a game app, not a form: the damage tally sits in a cinematic dark band; Burning, Dazed, and Threatened are stacked selectable tiles with token art or icons; Stamina, Defense, Disrupt, and Strain are two-up counters whose one-line hint states when the token matters, with an info affordance opening the full rule in a bottom drawer. Knocked out is a player-declared chip in the identity row that stamps the band and recedes the rest of the board without locking it. Every edit is undoable once through a local toast that never relays to guests; Clear board sits alone in the footer behind a confirmation.

The board scales with the table: phones pick one hunter at a time and the route carries the selection; tablets open that single board into one row: damage band, conditions column, tokens grid; the shared table screen shows the whole party at once, one column per hunter, each capped at the phone board width and centered, so small parties never stretch and full parties never wrap below the fold: in narrow columns the card compacts itself, with a smaller tally and one condition and one token per row. Locked boards: outside the hunt phase, or after an expedition result: show read-only counters and a warning naming the reason.

The monster board is the table’s shared fight surface for the monster, a sibling of the hunter board reached from the same places and cross-linked from it. It is a digital state layer beside the physical monster board, not a rules engine: round, monster-specific tracks such as Hardening, and the escalation reshuffle stay on the table. Current stance is mirrored only through explicit selection; an actual physical wound must be confirmed after the digital damage threshold is reached.

The damage tally on the current stance card is the hero counter in the dark band with quick five-step increments and a monster silhouette watermark. Beneath it, on the dark surface: Toughness takes the stance card’s per-player value, shows the wound it prices, and offers a Wound confirmation once damage covers it; confirmation removes one wound threshold and records the physical wound. The current-stance selector records which printed card the group moved to; it does not infer wounds or health. Damage bonus counts the stacked +1/+2 tokens and carries a selectable doubling chip whose hint reads back the combined effect; the game’s own glyphs mask into the current color so they follow state in either theme. Struggle is a first-class track: a segmented track scaled to the party’s Unleash threshold sits over two side-by-side tiles, Struggle and Acceleration, each carrying its rule in the tile corner; Struggle starts at one per player and is judged against the party at setup. At the threshold a solid alert offers Unleashed, dropping struggle back to one per hunter as the rules require.

The monster holds at most one of each status token, so tokens are a uniform grid of stacked selectable tiles. A terrain column lists the battlefield’s terrain once per type with its sectors in game terms, timing, and effect; beside it a rules lookup searches the glossary so the table never leaves the board to check a rule. Every token, counter, and terrain carries an info affordance opening the same rule drawer. Undo, Clear board, and the locked treatment are identical to the hunter board. The board stacks on narrow screens, the damage band sits beside struggle and tokens from the mid tier, and the shared screen spreads three columns: monster, terrain, rules lookup: with the lookup filling the monster column’s height instead of stretching the page.

### Journal band

The game’s narrative is a game object, not fine print. A journal band carries it: cover art fading into the panel, the account’s source and opening line on the band header, expand to read the full entry at a journal’s measure: base-size type, a narrow column, a drop cap, and a short closing reflection set in display type. Each band sits under its section’s own title, and the band header carries a quiet listen cue: headphones while the band sleeps, the gold bars while it reads.

Every long-form narrative wears the same band: a campaign chapter’s story, a Winds series’ journal on each preparation, an ascent’s chapter band and summit epilogue, and the printed trial card in the expedition summary. Series cards at creation carry each entry’s opening line as its hook.

The bands read aloud: the expanded entry opens with a labeled read-aloud control, its stop beside it and its pace apart: the app speaks with one voice, and narration takes the room (the music pauses for it, and music takes the voice back). The sentence being spoken is gilded in the reading body, and the reading glides the spoken sentence into view only once it has left it. A reading remembers its sentence: a stopped or closed band picks up where it left off; only a finished one reads from the beginning. While any band reads, a compact chip holds the media slot above the phase dock when present, otherwise at the viewport’s foot, with the entry’s source, the gold bars that hold still while paused, and a stop that never scrolls out of reach; playback stops when the band collapses, and closing tallies keep their own plain hint copy, never the journal treatment.

### Page headers and shelves

Workspace navigation carries no decorative borders. The app navbar keeps direct desktop destinations and a keyboard-accessible overflow menu on smaller screens.

One masthead system on desktop: every illustrated header occupies the same fixed band with its content anchored to the band’s bottom edge, so navigating never shifts the page’s vertical rhythm, while a text-only header is a smaller quiet title band that just clears its copy. The compact treatment matters only on phones, where the header sizes to its content again and illustrated headers keep their art floors.

Page-header destination actions use one treatment: primary, small, flat, near-square; a single destination uses one button, related actions form a joined group. Campaign, Party, and Overview are persistent peer destinations sharing one tabs control across all three headers. The session control is a compact chip: primary with a share icon when offline, success with a live dot while connected, and static for guests beside the explicit Leave action.

Selection shelves share one record treatment: explicit Open actions, visible lifecycle status, consistent party metadata, and contextual management menus. The campaigns shelf’s one creation action is a single New game button to the mode chooser: every run starts through the same door.

### Decks and builds

A build is the whole player board: equipment, the three potion slots, and the action deck: saved per hunter and shared by every campaign and expedition.

A compact deck row summarizes the hunter’s action deck against the equipped weapon: one selected/required cell per card type, a Ready or Not legal chip, and the name of the saved build when the current board matches one: with a Share action and the builder link.

The builder is one workspace for every mode; only its card pool differs. It reads equipment → hunt target → deck composition → cards: equipment is shown read-only with a way back to the player board (the board is the single place equipment changes), the weapon’s printed composition is the requirement, and the composition panel shows required, selected, advantages used, and a Ready/Not legal verdict. Every two effective pieces grant one deck advantage: add or remove one card of any type: the game’s own term; the app never says "element advantage". Cards are toggle tiles with a corner inspect affordance that browses the whole pool: paging through the grid in order with the same add/remove action as the tile, or the lock chip for a locked card, so a player can review and adjust without closing the dialog; where the deck is read-only the dialog shows only Close. Locked cards stay visible with the branch step that adds them. Deck edits are drafted until Save, which stays disabled while the draft is invalid or unchanged; a weapon change on the board refits the stored deck, keeping chosen cards where they still fit, and Auto-fit completes an invalid draft from the pool in catalog order.

The builder’s actions ride in the phase dock: the back link alone in the bar’s left corner, the build library (load, save, share) and the deck draft (Auto-fit, Reset) as attached labeled clusters before the labeled Save deck primary. The dock’s state line carries the save-first warning while the build is dirty or matches a saved one; the lock reason stays with the alert above the flow and is never repeated.

The Builds page is the one place builds are created and managed: the hunter roster selects a hunter, each build is a record with weapon, composition, legality, last update, Open, and a management menu: rename, duplicate, share, and the danger-red delete behind its confirmation; the header offers New build and Import code. The editor stacks the shared player board: every class-eligible piece and every potion, no hunt target, no deck row: over the shared deck editor, so a weapon change refits the deck immediately. The side panel opens on the build's live strength profile: a radar overlaying the build being edited in gold against its hunter's starter outline, draft-aware so unsaved deck toggles and equipment swaps move the shape before Save, with a per-axis ledger under it naming each score and its delta from starter.

Strength profiles are derived, never authored: every card and equipment piece contributes per-axis signal points read from its printed data (subtype, stamina, damage, vitality) and the glossary effects its text names — a mastery's unfocused face scoring only the effects after its charging trigger — and a build's raw signal is the sum of its deck, mastery, and worn pieces. The roster's starter builds anchor the shared 1–5 scale — the weakest starter on an axis reads 1.5, the strongest 3.5 — so upgraded builds keep headroom to 5 and stripped ones can fall to 1.

Boards never edit builds; they load them. The Load action opens a picker listing the hunter’s builds, marks the one matching the board as equipped, and disables any build whose equipment, potions, or cards the board cannot supply: crafted pieces, prepared potions, and unlocked cards in a campaign; the selected boxes in an expedition: saying how many pieces are missing. Loading a build replaces equipment, potion slots, and deck together; the current hunt’s consumed potions are untouched. Sharing produces a compact code and link carrying card and potion ids only: never campaign data: rendered as a QR; the import view previews the build and saves it to the library.

### Party selection

Equal-size portrait selection cards: the full party side by side on desktop, with smaller parties sitting centered at the same card size instead of stretching across empty seats; on phones the full cards flow two-up and dock as a rail of weapon glyphs. New Game mode cards are full-bleed illustrated choices with copy and actions over a bottom readability gradient: their one authored motion, the art zoom, runs on the shared motion token with a focus-visible twin, so reduced-motion and keyboard users get the same stillness or shift. Campaign and expedition selection-page banners use full-width artwork behind a text-side gradient.

The creation flows’ party selector is a filmstrip: every hunter’s artwork fits the expanded frame while collapsed rails keep a tighter crop and show the weapon icon. Browsing: tapping a rail, swiping, arrows: never selects; the active hero carries the add/remove action with the keyboard committing the browsed hunter, and members’ rails wear the selected treatment with their join-order badge. Browsing controls stay visible at every width with generous touch targets, and each slide is named by hunter for keyboard and screen-reader use. The New Game page is the mode cards alone: the hunters are met where they are chosen.

The party tray below the strip is the always-visible selection: portrait chips with join order, weapon, and removal beside the live count and the party’s printed rules. Only the add action disables when the party is full: never browsing. Choosing a game type opens the shared setup dialog before the party takes the page: the record’s name and mode settings, with the game library collapsed behind its selected count as family-grouped switch rows, prefilled and one step from continuing; a header action reopens it seeded from the flow’s own state. On phones the page itself is the carousel: one hunter per screen in the document, each page carrying its own action at its foot, the party tray pinning itself below the navbar as the pages scroll beneath it: no nested scroll container to position or fight. Mid-run party editing keeps the compact card grid, mirroring the party console.

The stable active-hunter panel shows player identity, hero text, and resources without moving or clipping its content as the selection changes.

### The chronicle

The hunt record is a game object, not a report. The Chronicle reads as the group's field journal over the hunts every saved game has recorded: the same facts a dashboard would show, in the journal's own language.

The page opens on the record: the provenance band, a stacked bar of every mode the table has played, always unfiltered, each mode keeping its own stable color while the chosen mode's segment stays at full strength and the rest dim — so the record keeps its whole story even while the divider filters. Activating a segment selects its mode; the pressed segment returns to all. The band's legend names each played mode; then its measures (victories, defeats, win rate, timed coverage) follow as plain `ore-stats`, and a closing line names the most recent hunt: creature, outcome, date, opening the game it was recorded in. Its six highlights (the most-faced creature, the best record, the toughest rival, the quickest prey, total play time from timer-recorded hunts, and the longest hunt — each hiding when the data cannot name one, each duration reading as a named span like "13m 30s", every creature-naming value opening its reference entry) sit alongside the record at wide container sizes and stack beneath it when space is limited. Each highlight remains an unboxed `ore-stats` with a small semantic icon; the surrounding journal sections remain unboxed. The chapter divider carries each mode's hunt count, so the record's provenance shows before filtering; its pressed segment wears the gold tint and rule the page's pickers use. Five folio sections follow under thin rules, numbered in the heading face and kept in reading order: the record, creatures encountered, the pace of the hunt, recent hunts, and the hunters. Every record links back to its source: each expanded hunt opens the campaign, expedition, ascent or Winds series it was recorded in, each collapsed hunt row already names that game beside its date, each dossier opens its hunter's builds, and each catalog creature's name opens its reference entry. Below the wide layout the page is several screens of scroll, so a row of section chips jumps straight to a folio.

The record and its highlights form the first unframed responsive grid. Creatures and pace share a second grid when the container is wide enough; the hunter dossiers follow at full width. The grids collapse to one column on narrow screens. Expanded pace records pick one timed hunt from compact record rows — time, date, outcome, wrapping as pills — then show the same complete party, equipment, card and fight-timeline detail as Recent hunts. Without a timer, the timeline orders events by sequence rather than implying elapsed time. The groupings organize the journal without turning its sections into dashboard cards.

Every ranking is one representation: a ranked row whose proportional bar reinforces the count beside the name, never a chart paired with a duplicated text ranking. No ranking dead-ends: the first eight rows rank, and everything past them expands as a compact multi-column index — name and value as ledger entries — so a hundred-item armory reads as an index, never a wall of bar rows. While the armory is expanded it stacks to a single full-width column so its index can spread. Aggregate ranking rows never imply more than the data records: wording stays "appearing in recorded loadouts" and "in recorded decks"; the comparison's "most-used" means the highest recorded loadout count. The pace section closes with a timer note when it has timed hunts at all, reports medians with each sample count beside its time, hour-spans beyond an hour, and keeps single-sample creatures out of the ranking — they close the list unranked, marked as too sparse to place — and the win/loss standings under every creature's name are always pluralized truthfully.

The creatures section carries the record's depth: the most-faced creatures as ranked rows wearing their trophy scans, each carrying its win/loss standing under the name — no chart, since win/lose rates over twenty-plus creatures read better as text per row than as any plotted shape. The company folio begins with a horizontal, scrollable roster of hunter identity cards and hunt-count chips. One selection grammar drives it: one pressed hunter opens a full-width inspector — the active identity and count, two side-by-side groups for equipment appearing in recorded loadouts and the most-configured action cards, and the way into their builds; a second pressed hunter replaces the dossier with the comparison. The equipment group omits each hunter's basic weapon, Base Armor, and Base Helm; if only those pieces were recorded, it says so. Weapons sit in the left equipment group as taller tiles, other equipment stays square on the right, and action cards use four portrait-ratio catalog scans per row with names, categories where available, and inclusion counts; the long card list expands on demand. The inspector stays borderless internally, using headings and spacing to distinguish its groups. No row is ever disabled: a third pick makes room by dropping the oldest selection, and a chapter change prunes the selection to the hunters it still holds. The selection speaks as it changes: a live status under the roster legend names the inspected hunter or the compared pair, so a shift is heard, not silently swapped. Each comparison side pairs the hunter's artwork and identity with the most-used weapon, helm, armor, and item from the raw recorded loadouts — printed base gear included, because a slot that only ever wore its base piece is worn gear, not an empty slot — in the hunter board's weapon-left loadout frame, without potions and with each recorded total over its card art. The sides frame a central radar that scores each side's most-used gear together with the deck from their latest hunt on the six shared profile axes (power, defense, mobility, speed, control, support), as comparative profile shapes. The mode selector is the journal's chapter divider: an attached pressed-button group whose buttons carry the counts, a select on phones, and a polite announcement of the applied filter. A second divider filters by party size, because fight length and every pace number swing with the table's size: the same pressed grammar with each size's hunt count, absent when the record holds only one size. Each divider's counts are taken inside the other lens — the mode buttons count the party's hunts, the party buttons the chapter's — so every control answers before it is itself applied; the party divider keeps every size the record holds, zero counts included, so its pressed control never vanishes; and the announcement names both applied filters. The armory answers the aggregate question alone — what the company runs most — as two bar-less ledger lists with honest per-list expansion; the by-hero question lives in the dossiers and comparison.

Empty states speak in the journal's voice: a record that has not begun says so and offers the ways to begin — the way to saved games only when the device actually holds one — a mode with no hunts points back to all modes with the counts it holds elsewhere (a mode empty at the chosen party size offers each lens' way back), and no timed hunts explains the timer instead of presenting a gap. Empty records carry no mode divider over nothing and no timer note without times. Fight timelines contain only committed in-app tracker changes and player-confirmed physical monster wounds/stances; they never invent events for untracked tabletop actions. Timer-less event order is explicit sequence, not fabricated clock time.

The Chronicles has five folio sections: the record, creatures encountered, hunt pace, recent hunts, and hunters. Expanded hunts show a shared Prism step chart of remaining party health and the net damage dealt to the monster, with milestone markers and event selection linked to the chart. Damage removed by a confirmed wound remains part of monster damage dealt; negative damage changes represent healing. Knockouts contribute zero remaining health until recovery, and depleted equipment reduces recovered health. Unknown equipment health is not invented. Completed records do not retain aggression or a victory damage target, so that missing target is stated explicitly rather than guessed. A continuous event list replaces segment navigation; histories over 48 events use the Scroll virtualizer with measured, wrapping rows and keyboard-accessible selection. Untimed histories use event order instead of invented clock times. Only recorded tracker changes and confirmed physical actions appear. Hunter comparison retains the radar, with equipment panels paired below on phones. Old saved records without required event arrays follow the existing reset behavior.

Expanded Recent hunts use a block-level named inline-size container around a flex layout: the chart and event history sit left of the hero builds when the detail container is at least 56rem wide, and stack in reading order below that width. Pace retains its stacked details. Container queries do not change grid tracks or live on grid containers.

Fight charts distinguish stance changes, confirmed wounds, unleashes, knockouts, and mastery focus with separate marker series and a category legend. Mastery focus marks only a crossing of the recorded mastery card's focus goal, including refocusing after its counter is cleared. Markers sit on the corresponding party-health or monster-damage curve at the recorded time or sequence position. Their tooltips name the event, and selection links to the event history. Wound-ready notices are not shown as confirmed wounds, and recovery is not shown as a new knockout. Expanded Recent hunts use the smaller `--size-2` content inset; Pace spacing is unchanged.

Fight history is attached at the local commit boundary, never inferred from UI gestures or command names. Each history carries a required initial board snapshot and recorded health/mastery facts; replay does not recalculate them from the current catalog. Build changes and monster resets retain their resulting replay facts. Persistence checks actor membership, contiguous sequence numbers, actor-specific tracks, and arithmetic consistency. Sequence is authoritative: incomplete or reset timers use the sequence axis, and unknown health produces no fabricated zero-health marker. Backup format 3 rejects old shapes without migration.

The monster damage counter carries a compact, label-hidden stance selector at its header's trailing edge; its accessible name remains. The wound action stays beneath Toughness and says only "Wound". Fight history explicitly records potion consumption and its reversal without inventing physical potion effects. Unleash precedes its struggle-reset event. Timeline charts use independent labeled value axes: party health and its markers on the left, monster damage, stance changes, and confirmed wounds on the right.

## Modes

### Campaign

Campaign is the primary experience: a clean white task surface that communicates progression as a journey rather than a collection of records. Chapters, quest selection, party preparation, the hunt, and the result are connected stages of the same campaign.

Chapters begin at the quest board with their reward box already applied: resources, quest unlocks, forge and herbalist levels land in the same step that starts the chapter, and the final chapter skips the board to begin directly at preparation. The box’s printed steps ride a collapsed checklist in Preparation instead of a confirm dialog, so nothing gates the flow table-side.

Quest selection uses compact recognition cards beside a persistent briefing. Inspection remains local and reversible; an explicit crimson action atomically activates the quest and begins Preparation. The briefing shows the campaign’s selected Standard or Nightmare stance targets for the current aggression as per-hunter wound equations. Quests expiring in the next chapter carry an exact warning tag; completed and expired quests remain available as quiet history.

Preparation embeds the complete party workspace, with Forge access, progression, resources, loadouts, and notes before the hunt, and the chapter’s story rides the phase as a journal band; the final chapter’s briefing carries its discussion questions beside it. The dock carries the phase’s framing: the back action, the preparation utilities as one attached cluster (Edit decks for the selected hunter, Open Forge, and Load builds, the one-click party load: one row per hunter choosing any of their saved builds, applied through one confirm), and the Enter Hunt primary, so a blocked player sees the unblocking action one glance from the disabled primary. The final battle’s preparation is the chapter’s start, so it carries no back.

Hunt acts as the table-side scenario reference: compact quest identity, an interactive battlefield linked bidirectionally to timing-first quick rules, visible scenario rules, and an explicit result section. The hunt’s dock is the fight console: on phones the clock floats above the bar as its own HUD chip, its face dimming whenever the fight’s time is not running, and the main pill carries the step back, the two boards as separate circles, and the fight’s two ends — the goal in the gold commit grammar, the fall in the crimson of consequential actions, confirmed either way before the hunt is recorded — packed tight and centered; from the tablet width up the clock rides the bar dead-center and the boards and verdicts share the row. Aggression deck composition lives in campaign status rather than being repeated in the hunt identity. The Awakening reuses this structure, mapping its compass directions to the board’s flanks and treating the ballista-bearing board edges as an additional position; ballista activation timing, targeting, line of sight, and loaded states appear in quick reference.

Result opens with the shared result banner on the illustrated outcome hero: an overline names the run's outcome, the heading states it, one muted stats row carries the fight's key figures, and the trophies close the banner — every monster the run defeated as a small circular portrait row on a victory, the hunted beast's single trophy washed grey for a defeat, a plain cross when the beast left no trophy behind — with a final score rendered as its own labeled block beside the figure. The long-form story never lives in the banner: the journal bands below it tell it. Victory deterministically selects one grayscale victory composition, while defeat layers all three sepia defeated-party compositions opposite a grayscale monster trophy. Dark mode reverses the artwork luminance and lowers its opacity so line art remains visible without becoming brighter than the outcome copy.

Hunter’s Trial keeps the three-space Defeat track separate from Total Defeats, transfers and resets it only on victory, and ends the campaign on the third consecutive defeat. The trial’s score is the standard series worksheet recorded for each won quest hunt: the eleven sheets sum to the campaign’s score, and the final battle records none — its victory is the plain Awakened confirmation. A quest victory’s confirmation is that sheet, the same score dialog every mode composes: the counters capped at the table’s own facts, the stance row pre-marked while the campaign plays the Nightmare variant — a live toggle on the quest board, its own flag and never a creation stamp — the recorded answers clamped at the same caps whatever carried them, and the live total previewing the projected campaign sum, the standing sheets plus this fight’s own, against the Nightmare ladder before the result is final. The result screen closes with the running sum against that ladder as a ranking comparison after the story it settles. Conclusion and rewards remain on quiet surfaces below; only optional visions use disclosure.

The active campaign wears the shared illustrated header with authored campaign history artwork, retaining its aggression, party, and quest controls beside the persistent Party and Overview destinations. The dedicated Party route keeps the same information available outside preparation: profile data and notes remain editable, while loadouts and card-pool upgrades lock outside Preparation and equipped potions can be consumed during the hunt.

Campaign Overview pairs Mission Intelligence with Trophies, Campaign Record with Base of Operations, and Campaign Configuration with read-first Shared Memory. Hunter’s Trial remains part of Campaign Record rather than becoming a sixth widget.

Card-pool progression is the campaign’s alone, with no visible point balance. Five compact branch rows, each a two-step track: the first step adds two action cards, the second adds two more and one mastery card. Filled dots are unlocked, outlined dots mark the next step, and a badge marks branches the campaign currently allows. A branch sheet previews the real card scans for both steps with the mastery card as a regular tile, and locked levels say why they are locked. The upgrade action names the cards before anything changes; the confirmation toast repeats which cards to add to the physical pool and offers Undo. Card tiles open the zoom dialog with the scan, type, stamina, and card text: both mastery sides.

### Expeditions

Expeditions are standalone sessions using the campaign’s visual and interaction language without adopting campaign phases.

The experience prioritizes finding a scenario, understanding its requirements, preparing the physical game, following the setup checklist, and tracking temporary session progress. Creation separates Party, Target, and Hunt decisions behind the shared setup dialog; Target uses a scrollable monster index with reversible inspection and explicit commitment, the Nightmare variant riding the step as a live switch — box-gated like the campaign's, its stance damage re-reflecting the inspection, and a trial card that prints no Nightmare rows switching it off — and Hunt compares scenarios through compact battlefield previews. The final step is Preparation in the campaign's own grammar, adjusted for the mode: entering it commits the expedition, so the party workspace — decks, loadouts, the one-click build load — edits the saved record beside the card's story and the setup checklist; revisited steps update the committed record instead of duplicating it, and the primary action enters the hunt.

The expedition is the full-hunter sandbox: every class-eligible equipment card, every potion, and every action card of each hunter from the selected boxes, with no Forge and no fake progression. The party section reuses the shared party workspace unchanged. Equipment, potions, and deck lock once a result is recorded. Monster health is omitted until verified per-aggression values are modeled. The detail page presents status, physical setup, Hunt Reference, party builds, and confirmed result actions as distinct sections; a run’s management: replay and delete: lives on the Expeditions list, not inside the hunt.

Starting or completing an expedition must not modify campaign progression.

### Winds challenges

A Winds series is a five-expedition score chase behind the shared stepper: one screen per phase: quest board, preparation, hunt, result. The preparation step drafts the party’s starting gear from the printed sheet, each expedition rolls a die for its biome, and each hunt closes on its result, where the bounty is taken and the aggression raises or heals; closing a session returns the series to the board for the next expedition. The draft gate speaks: a hunter is ready only once their deck is legal and their drafted weapon, armor and helm are all worn — the roster's not-ready mark never clears behind a half-drafted sheet, and the dock's center line names the hunters and the slots still missing before the Finish preparation primary.

The quest board is forward-only once the die is rolled: re-entering it would re-roll the target, so from the hunt only preparation is revisitable.

The series’ journal is a game object: the shared journal band carries each entry on every preparation, the series cards at creation carry each entry’s opening line as its hook, and the run’s closing tally keeps its own plain hint copy, never the journal treatment.

The run shares live like every other mode: a joining guest lands on the run’s detail route and acts through it: the boards, drafts, and wound tracker work unchanged, while the forward-only roll and the Finish preparation primary stay the host’s call.

### Ascents

An ascent is Mount Havoc’s sudden-death climb: three chapters, one random encounter each, levelled gear: one defeat ends the run. The detail header carries the climb’s standing in the same stats grammar every subject header wears: chapter progress, trophies taken, and wounds carried.

There is no story step: the chapter’s narrative is the journal band on the preparation screen, and the climb so far: a trophy chip per defeated monster, wounds carried: rides between the band and the party. The preparation dock carries the climb’s framing: Edit decks and Load builds beside the Draw encounter primary. Ascents have no forge; the drafts own the gear, which follows the chapter. The summit epilogue reads as the same band on the result screen.

### Forge & Herbalist

Crafting should feel like interacting with the game’s Forge and Herbalist systems: available recipes, required resources, the resulting equipment or potion, current inventory, and clear confirmation of the transaction. The interface should make deterministic actions fast and obvious.

Equipment crafting assigns an explicit payment to every required element and material, including legal element, material-pair, and equipment-card conversions; discarded cards and loadout consequences are confirmed before the transaction. When a hunter owns a lower-level card from the same equipment family, the action becomes an Upgrade: that specific card is returned to the box, the element requirement is waived, and only the printed materials remain payable. Resource trades exchange one element for one element, or one material for one material, atomically between hunters.

Forge and Herbalist share the selection banners’ full-width illustrated geometry, with compact station tabs. The selected recipe’s action rides in the phase dock as the labeled primary beside the back link to the campaign. Codex browsing carries no bar, like the quest boards; the recipe card keeps its selection visible while the shelf scrolls.

## Live sessions

A shared table session puts one subject: a campaign, expedition, ascent, or Winds series: on every device at the table, backendless over the same network. One session per tab: starting to host ends the session the tab holds, and joining another table ends it too.

The host owns the canonical record and broadcasts it; guests mirror it in place of their local copy and forward every command to the host, where it runs through the same rules as the host’s own actions: nothing a guest does bypasses the rules, and the next snapshot carries the result back. Incoming snapshots are validated at the boundary; anything malformed is dropped and logged, never mounted. Mirrors never persist: exports and sync read only the device’s own records, and deleting a mirror is a leave, not a delete. Host-only flow actions: the Winds die roll, finishing an expedition’s or run’s preparation, party edits: disable for guests with the Leave action in their place; everything else is open to the table.

Pairing is manual and two-step: the host shows a single-use invitation, the guest answers with a code of their own, and the host accepts it. The invitation always travels as the app’s join link: the QR, the share sheet, and copy/paste all carry it, so a phone camera opens the app straight onto the join flow instead of showing raw code text, and the guest’s own scanner or paste field accepts the link or the plain code alike.

The Multiplayer card on the main menu opens the session hub, whose host tab lists active games of all four kinds. Each active game's management section has a Host session action that opens the same dialog directly for that game; while hosting it shows Session details instead. The hosted panel carries the invitation, answer acceptance, connected players, and End session; guests see the joined game's status with Open subject and Leave. Join links open the dialog straight onto the join flow. Subject headers carry identity and stats only, while each view gates host-only actions for guests. The hunter and monster boards carry no session surface by design; their mirrored state is the session presence there.

## Settings

Settings groups the game library, appearance and motion, keyboard navigation, backups, and local activity into distinct operational sections.

Optional expansions use compact horizontal cards that keep box artwork, content description, selection, and purchase actions together, grouped by what they add: new monsters and quests, new hunters and weapon classes, biome boards. An owned box lifts its surface a step and renders its art at full color; un-owned art sits slightly hushed. The switch label states its own state, and the copy states that existing games keep the boxes they were created with.

Background Music seeds the custom-video form from what is in play and marks the chosen custom video like an active suggestion.

Backup stats enumerate every record type in the file: campaigns, expeditions, ascents, Winds series, builds, and the import dialog names the same full replacement scope; refused files (wrong type, over size) are reported instead of silently dropped, and import failures localize through the domain error codes.

Shortcut chords render as platform-aware keycaps with a spoken-word twin for screen readers, and Settings itself is reachable by chord.

On phones, where the page stacks into several screens, a row of section chips jumps straight to a panel.
