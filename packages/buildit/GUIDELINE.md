# guidelines

Checklist of guidelines for improving design quality, intensity, adaptation, enhancement, and systematization.

## Core Design Principles

The following principles guide the visual and interactive design of all components in the library:

### 1. Layout and Spacing

- **The 4-Point Grid System:** Use a 4-point grid system where spacing and dimensions are multiples of four (`var(--size-*)`). This ensures consistency and allows elements to be easily split in half.
- **Whitespace:** Prioritize "letting things breathe" over rigid grids. Use consistent spacing between sections (32px / `var(--section-spacing)`) to create a clean layout.
- **Responsiveness:** Use a 12-column grid for desktop, 8 columns for tablet, and 4 columns for mobile to ensure structured content scales correctly.
- **Grouping:** Use proximity and containers to signify relationships between elements.

### 2. Typography

- **Font Selection:** Stick to one high-quality sans-serif font (`var(--font-sans)`) for the entire design to maintain simplicity and professional appeal.
- **Header Styling:** Tighten header letter spacing by -2.5% (`var(--tracking-header)`) and reduce line height to 115% (`var(--leading-tight)`).
- **Size Constraints:**
  - Limit the design to a maximum of **six font sizes** (`--text-xs` to `--text-2xl`).
  - Avoid text sizes larger than **24 pixels** (`--text-2xl`) for high-density pages.
- **Hierarchy:** Use size, weight, and color to differentiate importance. Most important information should be large, bold, and placed at the top.

### 3. Color and Depth

- **Color Palette:** Start with one primary brand color. Create a color ramp by lightening it for backgrounds and darkening it for text.
- **Semantic Colors:** Use color purposefully:
  - **Blue (Info):** Trust or primary actions.
  - **Red (Error):** Danger, urgency, or error states.
  - **Yellow (Warning):** Warnings.
  - **Green (Success):** Success or "new" status chips.
- **Dark Mode:**
  - Avoid heavy shadows; use lighter card colors against darker backgrounds to create depth.
  - Lower the contrast of borders and dim the saturation of bright accent colors.
- **Shadows:** Shadows should be subtle with low opacity and high blur. Popovers require stronger shadows than standard cards.

### 4. Components

- **Buttons:**
  - **States:** Every button must have at least four states: default, hovered, active (pressed), and disabled.
  - **Secondary CTAs:** Use "ghost buttons" (text/icon without a background until hover) for secondary actions.
  - **Padding:** Double the vertical padding for the horizontal padding (2:1 ratio).
- **Icons:** Size icons to match the **line height** of body text (24px / `var(--leading-6)`) to ensure visual alignment.
- **Inputs:** Must include clear focus states and error states with red borders and messages.
- **Overlays:** Use a linear gradient or progressive blur for text-over-image scenarios to ensure readability.

### 5. Feedback and Interaction

- **Response to Interaction:** Every user action should trigger a response (loading spinners, success messages).
- **Micro-interactions:** Use subtle animations to confirm actions (e.g., chips sliding up).
- **Signifiers:** Use UI elements (tooltips, active navigation highlights) to explain functionality without words.

## Design Guidelines

### harden

Improve interface resilience through better error handling, text overflow handling, and edge case management. Makes interfaces robust and production-ready.

Recommended combinations: `normalize`, `clarify`, `adapt`

### normalize

Normalize design to match your design system and ensure consistency

Recommended combinations: `extract`, `polish`, `harden`

BuildIt coverage:

- Shared tokenized spacing, radius, typography, and color theme mixins
- Consistent focus-visible outlines for interactive controls

### optimize

Improve interface performance across loading speed, rendering, animations, images, and bundle size. Makes experiences faster and smoother.

Recommended combinations: `distill`, `adapt`, `animate`

BuildIt coverage:

- Reduced-motion fallbacks remove non-essential transitions and keyframe motion
- Variant-level styling done through reusable mixins to avoid duplicated CSS blocks

### polish

Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.

Recommended combinations: `normalize`, `clarify`, `quieter`

BuildIt coverage:

- Refined helper/counter/label text handling for edge-length content
- Improved focus ring consistency and hover/focus affordances

### bolder

Amplify safe or boring designs to make them more visually interesting and stimulating. Increases impact while maintaining usability.

Recommended combinations: `colorize`, `animate`, `delight`

BuildIt coverage:

- Existing variant spectrum (solid/flat/bordered/outline/ghost/frost)
- Optional rainbow/frost effects for high-energy visual modes

### quieter

Tone down overly bold or visually aggressive designs. Reduces intensity while maintaining design quality and impact.

Recommended combinations: `distill`, `normalize`, `polish`

BuildIt coverage:

- Text/ghost variants and tokenized contrast levels support low-intensity UIs

### adapt

Adapt designs to work across different screen sizes, devices, contexts, or platforms. Ensures consistent experience across varied environments.

Recommended combinations: `harden`, `optimize`, `onboard`

BuildIt coverage:

- Small-screen layout constraints for dialog and drawer panels
- Coarse-pointer touch target adjustments for controls
- `dvh`-based overlay sizing to avoid viewport clipping

### clarify

Improve unclear UX copy, error messages, microcopy, labels, and instructions. Makes interfaces easier to understand and use.

Recommended combinations: `harden`, `polish`, `onboard`

BuildIt coverage:

- Input helper/error separation and ARIA wiring for validation messaging
- Accessible control labels for close, clear, loading, and password visibility actions

### distill

Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean.

Recommended combinations: `normalize`, `optimize`, `quieter`

BuildIt coverage:

- Shared mixin architecture for size/rounded/color/state behavior
- Avoided one-off per-component overrides where reusable tokens exist

### animate

Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usability and delight.

Recommended combinations: `delight`, `optimize`, `bolder`

BuildIt coverage:

- Transition and keyframe usage on key interactions with reduced-motion fallback support

### colorize

Add strategic color to features that are too monochromatic or lack visual interest. Makes interfaces more engaging and expressive.

Recommended combinations: `bolder`, `normalize`, `polish`

BuildIt coverage:

- Semantic theme colors mapped through `colorThemeMixin`
- Variant styles use semantic theme roles (base/content/focus/backdrop)

### delight

Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates functional to delightful.

Recommended combinations: `animate`, `bolder`, `onboard`

BuildIt coverage:

- Optional rainbow effect and frost variant for expressive interactions

### onboard

Design or improve onboarding flows, empty states, and first-time user experiences. Helps users get started successfully and understand value quickly.

Recommended combinations: `clarify`, `adapt`, `distill`

BuildIt coverage:

- Component-level labels, helper text, and error text patterns support guided first use

### extract

Extract and consolidate reusable components, design tokens, and patterns into your design system. Identifies opportunities for systematic reuse and enriches your component library.

Recommended combinations: `normalize`, `distill`, `optimize`

BuildIt coverage:

- Shared token and mixin layer is the default implementation path for new components