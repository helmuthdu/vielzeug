# Speech Player

A text-to-speech player control that reads its `text` aloud through the browser's Web Speech API. Renders a labeled play/pause toggle, a stop control beside it that appears while reading, and a gauged speed control: useful wherever long-form copy should be heard, not just read: journal entries, article bodies, instructions.

The text is read sentence by sentence: a whole page can be read without hitting Chromium's single-utterance truncation, and the player stops any other `ore-speech-player` on the page before it starts: only one voice reads at a time. `progress` events name the sentence being read, so a consumer can highlight what the voice is saying, and a bound `resume-at` makes "resume" mean it across stops and page loads.

<ComponentPreview center vertical>

```html
<ore-speech-player text="The valley sleeps under ash. The wind remembers every season."></ore-speech-player>
```

</ComponentPreview>

## How It Reads

The player is a three-state cycle on one toggle: play, pause, resume: plus a stop control that appears while reading and a gauged speed control that is always present:

- **Play**: the toggle carries the visible "Read aloud" label before the first read; once engaged the label folds away and only the icons remain. `speechSynthesis` reads the text aloud, the toggle shows a pause icon, and the stop control appears beside it.
- **Pause / Resume**: the engine pauses mid-sentence; the toggle switches between resume and pause. A pause held longer than ten seconds is resumed defensively: if the engine reports nothing within a second, the current sentence restarts: some Chromium builds resume a long pause into silence.
- **Stop**: sits beside the toggle, with the transport controls; cancels pending speech and returns to idle. Reading also stops on its own when the text ends, when the engine fails (announced distinctly, with an `error` event), or when the element is removed from the DOM.
- **Speed**: the gauge-marked control cycles normal → slow → fast (`1` → `0.85` → `1.15`), showing the current value. A change while reading restarts the current sentence at the new pace so it is heard at once.

The `state` attribute on the host reflects playback: `idle`, `playing`, `paused`, or `unsupported`, so CSS can react:

```css
ore-speech-player[state='playing'] {
  --speech-player-active-color: var(--color-success);
}
```

## Long Text

The reading stream is sentence-addressed: each sentence is one utterance (a sentence alone longer than ~220 characters is split at word boundaries: Chromium cuts off a single utterance after roughly fifteen seconds of speech), and each utterance knows which sentence it carries. One failing sentence settles the player cleanly instead of losing the rest.

```html
<ore-speech-player text="A whole chapter of narrative prose can go here..."></ore-speech-player>
```

## Following the Reading

`progress` events fire as each sentence begins, carrying the sentence index and total: everything a consumer needs to highlight the spoken sentence. Build the display from the exported `speechSentences` so its sentence order and the reader's are the same list by construction:

```ts
import { speechSentences } from '@vielzeug/refine/speech-player';

const sentences = speechSentences(lore); // ["One.", "Two.", ...]
```

```html
<ore-speech-player :text="lore" @progress="onProgress"></ore-speech-player>
<span
  v-for="(sentence, index) in sentences"
  :class="{ spoken: index === current }"
  :key="index"> {{ sentence }} </span>
```

```ts
let current = -1;
function onProgress(event: Event): void {
  current = (event as CustomEvent<{ sentence: number }>).detail.sentence;
}
```

## Resume Position

Bind `resume-at` to the sentence index playback should begin from, and the player restarts there instead of at the beginning: persist the last `progress` sentence per entry and "resume" survives stops, collapses, and page loads. A finished reading is the consumer's cue to clear the position, and a value beyond the end clamps into the last sentence.

```html
<ore-speech-player :resume-at="savedSentence" :text="lore"></ore-speech-player>
```

## Language

Set the standard HTML `lang` attribute to the language **of the text being read** (not the interface language). The player passes it to the engine as a voice hint and prefers an installed voice whose language matches:

```html
<ore-speech-player lang="de" text="Das Tal schläft unter Asche."></ore-speech-player>
```

If no matching voice has loaded yet, the `lang` hint alone steers the engine. Omitting `lang` leaves the voice choice to the browser default.

## Localizing Labels

Every user-facing string: control names, speed names, and live-region announcements: is overridable through the `labels` property. English is the default:

```ts
const player = document.querySelector('ore-speech-player')!;
player.labels = {
  read: 'Vorlesen',
  pause: 'Vorlesen pausieren',
  resume: 'Vorlesen fortsetzen',
  stop: 'Vorlesen beenden',
  speed: 'Lesegeschwindigkeit',
  speedNormal: 'normal',
  speedSlow: 'langsam',
  speedFast: 'schnell',
  // ... plus the announcement strings
};
```

In Vue 3:

```html
<ore-speech-player :labels="speechLabels" :text="lore"></ore-speech-player>
```

## Handling Events

The player emits at the boundaries an observer cares about: `play`, `stop` (stopped before finishing), `end` (finished on its own), `error` (the engine failed mid-read), plus `progress` (a sentence began) and `rate-change` (the speed control moved):

```html
<ore-speech-player id="lore-player" text="..."></ore-speech-player>

<script type="module">
  document.getElementById('lore-player').addEventListener('play', () => {
    console.log('Reading started');
  });
</script>
```

In Vue 3:

```html
<ore-speech-player :text="lore" @play="onPlay" @stop="onStop" @end="onEnd"></ore-speech-player>
```

## Imperative Control

The element exposes `play()`, `pause()`, and `stop()` for cases the controls cannot reach: for example stopping playback when a container collapses:

```ts
lorePlayer.value?.stop();
```

`play()` begins from `resume-at` when bound, else from the beginning, and stops any other player already reading.

## Speed Persistence

The `rate` attribute is the playback rate: bind it with the `rate-change` event to remember the listener's choice across sessions and instances; unbound, the control cycles on its own:

```html
<ore-speech-player :rate="preferred" :text="lore" @rate-change="preferred = $event.detail.rate"></ore-speech-player>
```

## Custom Styling

The controls are compact ghost buttons built from tokens. Override the CSS custom properties for placement-specific tuning:

```html
<ore-speech-player
  text="..."
  style="--speech-player-icon-color: var(--text-color-body); --speech-player-gap: var(--size-2);">
</ore-speech-player>
```

Use `::part()` for fine-grained overrides:

```css
ore-speech-player::part(play) {
  border: var(--border) solid var(--color-contrast-300);
}
```

## API Reference

### Attributes

| Attribute    | Type     | Default   | Description                                                         |
| ----------- | -------- | --------- | ------------------------------------------------------------------- |
| `text`      | `string` | `''`      | The text to read aloud (empty text disables the toggle)               |
| `lang`      | `string` | N/A | Standard HTML language tag of the text; hints voice selection       |
| `state`     | `string` | `idle`    | Reflected playback state: `idle` \| `playing` \| `paused` \| `unsupported` |
| `rate`      | `number` | `1`       | Playback rate; the speed control cycles `1` → `0.85` → `1.15`       |
| `resume-at` | `number` | N/A | The sentence index playback begins from                               |

### Properties

| Property | Type                             | Description                               |
| -------- | -------------------------------- | ----------------------------------------- |
| `labels` | `Partial<OreSpeechPlayerLabels>` | Overrides control names, speed names, and announcements |

### Methods

| Method   | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| `play()` | Starts reading: from `resume-at` when bound, else the beginning   |
| `pause()`| Pauses the current reading                                          |
| `stop()` | Stops reading and cancels pending speech                           |

### Events

| Event         | Detail                        | Description                                         |
| ------------- | ---------------------------- | --------------------------------------------------- |
| `play`        | N/A | Reading started: from the control or `play()`       |
| `progress`    | `{ sentence, total }`        | A sentence began: for surfaces that follow the voice |
| `stop`        | N/A | Reading stopped before finishing                    |
| `end`         | N/A | Reading finished on its own                         |
| `error`       | N/A | The engine failed mid-read                          |
| `rate-change` | `{ rate }`                   | The speed control moved to a new step                |

### Exports

| Export          | Description                                                       |
| --------------- | ------------------------------------------------------------------ |
| `speechSentences` | Splits text into the sentence list the reader follows: build highlighting displays from it |
| `SPEECH_RATES`   | The rate steps the speed control cycles through                     |

### CSS Parts

| Part    | Element     | Description                                |
| ------- | ----------- | ------------------------------------------ |
| `player` | `<div>`     | Outer control group                        |
| `play`   | `<button>`  | The play/pause toggle button               |
| `rate`   | `<button>`  | The speed control                           |
| `stop`   | `<button>`  | The stop button (hidden while idle)        |

### CSS Custom Properties

| Property                          | Description                               | Default                       |
| --------------------------------- | ----------------------------------------- | ----------------------------- |
| `--speech-player-gap`             | Gap between the controls                  | `var(--size-1)`               |
| `--speech-player-control-size`    | Each control's hit-area size (the toggle grows with its label) | `var(--size-8)` |
| `--speech-player-icon-color`      | Control icon color at rest                | `var(--text-color-secondary)` |
| `--speech-player-active-color`    | Toggle color while reading                | `var(--color-primary)`        |
| `--speech-player-hover-bg`        | Control background on hover               | `var(--color-contrast-100)`   |

## Accessibility

The toggle's accessible name follows its state: "Read aloud" while idle, "Pause reading" while playing, "Resume reading" while paused, and the same string is the visible label before the first read, so sighted and assistive users get one invitation. The speed control is named with its current step ("Reading speed: slow") and the stop control is named consistently. Icons are `aria-hidden` and supplementary to the button names. A `role="status"` live region inside the shadow DOM announces every transition ("Reading aloud.", "Reading paused.", "Reading stopped.", "Reading finished.", "Reading was interrupted.") so assistive technology does not miss the state change while focus stays on the controls. Controls are 32px hit areas (≥ the 24px minimum) and visible keyboard focus rings come standard. When the Web Speech API is missing the toggle is disabled and its name explains why, instead of silently failing.
