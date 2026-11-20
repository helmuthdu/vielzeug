# Refine design reference

> Moved from `packages/refine/AGENTS.md`: the design principles and named improvement lenses for authoring or reviewing Refine component styles and behaviour. Component code rules stay in `packages/refine/AGENTS.md`.

## Core Design Principles

Follow these when authoring or reviewing component styles and behaviour:

### Layout and Spacing

- **4-point grid**: all spacing and dimensions use multiples of 4 via `var(--size-*)`.
- **Whitespace**: sections breathe at 32 px / `var(--section-spacing)`; use proximity and containers to group related elements.
- **Responsiveness**: `ore-grid` is container-responsive — `cols-*` breakpoints react to the grid's own width (not the viewport), so a narrow grid in a sidebar collapses to its mobile layout on a wide screen. Pick column counts per breakpoint (`cols="1" cols-md="2" cols-lg="4"`); a common content rhythm is 1-col mobile → 2-col tablet → 3–4-col desktop, scaling up to 12 for dense dashboards. Fixed counts resolve through the `--grid-1`–`--grid-12` tokens.

### Typography

- Single sans-serif font via `var(--font-sans)`.
- Headers: letter-spacing `var(--tracking-header)` (−5%), line-height `var(--leading-tight)` (115%).
- Component type scale: seven steps (`--text-2xs` 11px → `--text-2xl` 24px); `--text-3xl` is reserved for display values like the circular-progress label. Never render component text below `--text-2xs` (11px floor); avoid sizes above 24 px on high-density pages.
- Hierarchy via size, weight, and color: most important content large/bold/top.

### Color and Depth

- One primary brand color; ramp it light for backgrounds, dark for text.
- Semantic roles: blue = info/primary, red = danger/error, yellow = warning, green = success.
- Dark mode: lighter card colors on darker backgrounds for depth; lower border contrast; dim accent saturation. Avoid heavy shadows.
- Shadows: subtle, low-opacity, high-blur. Popovers need stronger shadows than cards.

### Components

- **Buttons:** four states minimum (default, hover, active, disabled). Ghost buttons for secondary CTAs. Horizontal padding = 2× vertical (2:1 ratio).
- **Icons:** sized to body line height (24 px / `var(--leading-6)`).
- **Inputs:** clear focus and error states (red border + message).
- **Overlays:** linear gradient or progressive blur for text-over-image readability.

### Feedback and Interaction

- Every action gets a response (spinner, success message).
- Micro-interactions confirm actions subtly (e.g., chip slide-up).
- Signifiers (tooltips, active nav highlights) explain functionality without words.

## Design Modes

Named improvement lenses to guide AI-driven design work on components. Each lists its recommended combinations and what refine already covers.

| Mode          | Intent                                              | Recommended with                   | Refine coverage                                                                                         |
| ------------- | --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **harden**    | Error handling, text overflow, edge-case resilience | `normalize`, `clarify`, `adapt`    | N/A                                                                                                     |
| **normalize** | Match design system; ensure consistency             | `extract`, `polish`, `harden`      | Shared tokenized spacing/radius/typography/color mixins; consistent `focus-visible` outlines            |
| **optimize**  | Loading speed, rendering, animations, bundle size   | `distill`, `adapt`, `animate`      | Reduced-motion fallbacks; variant styling via reusable mixins                                           |
| **polish**    | Alignment, spacing, consistency: good → great       | `normalize`, `clarify`, `quieter`  | Refined helper/counter/label text; consistent focus ring and hover affordances                          |
| **bolder**    | Amplify safe designs; more visual impact            | `colorize`, `animate`, `delight`   | Variant spectrum (solid/flat/bordered/outline/ghost/frost); optional rainbow/frost effects              |
| **quieter**   | Tone down visually aggressive designs               | `distill`, `normalize`, `polish`   | Text/ghost variants and tokenized contrast levels                                                       |
| **adapt**     | Cross-device, cross-context consistency             | `harden`, `optimize`, `onboard`    | Small-screen dialog/drawer constraints; coarse-pointer touch targets; `dvh`-based overlay sizing        |
| **clarify**   | UX copy, error messages, labels, microcopy          | `harden`, `polish`, `onboard`      | Input helper/error separation + ARIA wiring; accessible labels for close/clear/loading/password actions |
| **distill**   | Strip unnecessary complexity                        | `normalize`, `optimize`, `quieter` | Shared mixin architecture for size/rounded/color/state; no one-off per-component overrides              |
| **animate**   | Purposeful animations and micro-interactions        | `delight`, `optimize`, `bolder`    | Transition and keyframe usage on key interactions with reduced-motion fallback                          |
| **colorize**  | Add strategic color to monochromatic UI             | `bolder`, `normalize`, `polish`    | Semantic theme colors via `colorThemeMixin`; variant styles use semantic theme roles                    |
| **delight**   | Joy, personality, memorable moments                 | `animate`, `bolder`, `onboard`     | Optional rainbow effect and frost variant                                                               |
| **onboard**   | Onboarding flows, empty states, first-use UX        | `clarify`, `adapt`, `distill`      | Component-level labels, helper text, and error text patterns                                            |
| **extract**   | Consolidate reusable tokens and patterns            | `normalize`, `distill`, `optimize` | Shared token and mixin layer is the default implementation path for new components                      |

