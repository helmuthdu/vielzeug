# Speed Reading

An optional paced-reading display using rapid serial visual presentation (RSVP): one word at a time, with a stationary highlighted focal letter. Start manually, choose a base pace in words per minute (WPM), and pause or step whenever you need context.

This is an alternative presentation, **not a promise of faster comprehension**. Higher WPM can make text harder to understand. The full-text view remains available for ordinary, selectable reading. Speech playback, text extraction, and saved progress belong to your application.

## Try Your Text

Edit the passage, then choose **Load text** to replace it and reset progress. Editing alone does not interrupt playback. Compare the paced view with **Read full text**; start at a comfortable pace rather than aiming for a higher number.

<ComponentPreview vertical>

```html
<ore-grid cols="1" gap="md" style="width:100%;min-width:0">
  <ore-textarea
    id="reading-passage"
    label="Your passage"
    rows="4"
    helper="Loading replaces the passage and resets progress. Nothing is uploaded.">
  </ore-textarea>
  <ore-button id="load-passage" variant="flat" rounded="full" style="justify-self:start">
    Load text
  </ore-button>
  <p id="load-status" role="status" style="margin:0;font-size:var(--text-sm)"></p>
  <ore-speed-reading
    id="passage-reader"
    lang="en"
    text="Read at your own pace. A steady focal point keeps each word in the same place, while punctuation gives you room to pause. Open the full text whenever you want more context.">
  </ore-speed-reading>
</ore-grid>
<script type="module">
await Promise.all([
  customElements.whenDefined('ore-speed-reading'),
  customElements.whenDefined('ore-textarea'),
]);
const passage = document.querySelector('#reading-passage');
const reader = document.querySelector('#passage-reader');
const status = document.querySelector('#load-status');
passage.value = reader.text;
passage.addEventListener('input', () => {
  passage.error = '';
  status.textContent = '';
});
document.querySelector('#load-passage').addEventListener('click', () => {
  if (!passage.value.trim()) {
    passage.error = 'Enter some text before loading.';
    return;
  }
  reader.text = passage.value;
  reader.restart();
  status.textContent = 'Text loaded. Choose Start reading when you are ready.';
});
</script>
```

</ComponentPreview>

## Import

Import the component subpath; nested controls register with it:

```ts
import '@vielzeug/refine/speed-reading';
import '@vielzeug/refine/styles';
```

## Playback

The reader starts `idle` at word zero. Playback and Restart use icon-only controls with accessible names and hover/focus tooltips. The primary control switches between play and pause icons; its accessible action is **Start reading**, **Pause**, **Resume**, or **Read again** to match its state. A visible status explains pauses and completion. **Restart** returns to word zero without playing. **Previous word** and **Next word** pause first and never wrap around the ends.

After the final word's dwell, `state` becomes `ended`. Playing again starts from the beginning. Empty text disables playback and stepping. Independent instances do not stop each other.

Opening **Read full text** pauses playback, highlights the current word, and brings it into view within the scrollable passage without moving keyboard focus. The passage remains selectable. Use **Start at sentence** to choose another location, then **Resume from here** to start there. Choosing a sentence alone never starts playback. Closing the disclosure does not resume; starting playback closes it.

The reader also pauses when the browser tab is hidden or the component disconnects. Returning to the tab does not resume automatically.

Playback and pace controls share one compact panel. Wide containers place transport and settings side by side; narrow containers stack them, including inside desktop sidebars. Layout follows the reader's available width rather than the device viewport. Controls retain the same keyboard order in both layouts.

The pace field shows **WPM** while keeping the expanded accessible name **Words per minute**. The adjacent information button opens pace guidance and keyboard shortcuts by tap, click, Enter, or Space. Opening help does not pause playback. Escape or a click outside dismisses help. Instructions are not displayed as persistent rows or hidden based on device type.

## Pace

The default is **250 WPM**, adjustable between **100 and 600 WPM**. The numeric control increments by 25; direct property values can use any finite pace within the range.

Punctuation adds dwell to the base `60000 / wpm` milliseconds:

| Boundary | Dwell |
| --- | --- |
| Ordinary word | 1× base |
| Comma, semicolon, colon | 1.5× base |
| Sentence ending or ellipsis | 2× base |
| Blank line / paragraph break | 3× base |

Only the largest applicable dwell is used. WPM describes the **base pace**, not the passage's effective average. Sentence segmentation avoids treating every dot in decimals or URLs as a boundary; common English abbreviations and initials also avoid sentence pauses. Language-dependent segmentation is not a complete abbreviation dictionary.

Changing WPM while playing restarts the current word's dwell at the new pace. Delayed timers never skip words or trigger a catch-up burst.

Set a starting pace declaratively:

```html
<ore-speed-reading
  lang="en"
  wpm="150"
  text="Start slowly, and increase the pace only when it remains comfortable. Pause to reread a sentence in the full-text view.">
</ore-speed-reading>
```

## Text and Language

`text` is plain text, never HTML. Whitespace separates Latin-script words; compounds, apostrophes, numbers, URLs, and surrounding punctuation stay together. `Intl.Segmenter` handles word boundaries in unspaced scripts and preserves grapheme clusters such as combining accents and joined emoji.

For Latin-script tokens, the focal letter follows the length of the word, counting letter/number graphemes and excluding punctuation:

| Word length | Focal letter |
| --- | --- |
| 1 | First |
| 2–5 | Second |
| 6–9 | Third |
| 10–13 | Fourth |
| 14+ | Fifth |

For example, `read` highlights `e`, `hello` highlights `e`, and `reading` highlights `a`. The focal letter's center stays on the display's fixed axis. This is a predictable display heuristic, not a claim of an optimal recognition point.

Other scripts use complete, centered tokens rather than splitting shaping-dependent letters. Use `lang` for segmentation and `dir` for the surrounding interface; the full text uses automatic text direction. Complex-script focal highlighting is not supported in this version. A browser with `Intl.Segmenter` is required.

The reader chooses one stable font size for the passage and available width, measuring up to 32 ordinary-length tokens (up to 20 Unicode code points). It recalculates after text, container width, or font changes—not on every word. It never shrinks below `--speed-reading-min-font-size`.

If an exceptional token cannot fit, playback pauses and full text opens at the highlighted token. Read it there, then choose **Continue after this word** to move forward while remaining paused. For the final token, **Finish reading** completes the passage. Skipping is always explicit; no timer silently skips text. You can also select a different sentence or resize the reader.

Replacing the text resets the position and pauses to `idle`. Reapplying identical text leaves playback alone. Changing `lang` retokenizes and resets.

## Following Progress

The `progress` event carries token position and offsets into the original text. `start` and `end` are UTF-16 string offsets; `end` is exclusive. It fires when the initial text is loaded, replaced, or the displayed token changes.

Listen before assigning text if you need the initial event:

```ts
import type { OreSpeedReadingEvents, SpeedReadingElement } from '@vielzeug/refine/speed-reading';
import '@vielzeug/refine/speed-reading';

const reader = document.querySelector<SpeedReadingElement>('ore-speed-reading')!;

reader.addEventListener('progress', (event) => {
  const { index, total, start, end } = (event as CustomEvent<OreSpeedReadingEvents['progress']>).detail;
  console.log(index, total, reader.text?.slice(start, end));
});

reader.text = 'One passage. Read it at your own pace.';
reader.seek(2);
```

Your app can persist `word-index` and `wpm-change` values. Restore the position after assigning the corresponding source text. Do not reuse a token index with a different passage or locale.

## Localization

Override control names and status messages with `labels`; default labels are English:

```ts
import type { SpeedReadingElement } from '@vielzeug/refine/speed-reading';

const reader = document.querySelector<SpeedReadingElement>('ore-speed-reading')!;

reader.labels = {
  play: 'Lesen',
  resume: 'Fortsetzen',
  readAgain: 'Erneut lesen',
  pause: 'Pause',
  restart: 'Neustart',
  previous: 'Vorheriges Wort',
  next: 'Nächstes Wort',
  fullText: 'Vollständigen Text lesen',
  wpm: 'Wörter pro Minute',
  wpmShort: 'WpM',
  wpmHelp: 'Wörter pro Minute legt das Grundtempo zwischen 100 und 600 fest. Beginnen Sie in einem angenehmen Tempo.',
  help: 'Hilfe zu Lesetempo und Tastatur',
  words: 'Wörter',
  started: 'Lesen gestartet.',
  paused: 'Lesen pausiert.',
  finished: 'Lesen beendet.',
  empty: 'Text zum Lesen hinzufügen.',
  overflow: 'Dieses Wort benötigt mehr Platz. Lesen Sie es im vollständigen Text.',
  continue: 'Nach diesem Wort fortfahren',
  finish: 'Lesen abschließen',
  resumeHere: 'Ab hier fortsetzen',
  sentence: 'Ab Satz beginnen',
  guidance: 'Ein Wort nach dem anderen. Beginnen Sie in einem angenehmen Tempo.',
  hidden: 'Pausiert, weil der Tab ausgeblendet wurde.',
  shortcutsHeading: 'Tastenkürzel',
  shortcuts: 'Bei fokussiertem Lesefeld: Leertaste startet oder pausiert; Pfeiltasten links/rechts wechseln ein Wort.',
  paceHelp: 'WPM bestimmt das Grundtempo. Satzzeichen verlängern die Pausen.',
  invalidWpm: 'Geben Sie eine Zahl zwischen 100 und 600 ein.',
  viewport: 'Lesefeld. Leertaste zum Starten oder Pausieren; Pfeiltasten für einzelne Wörter.',
};
```

## API

### Attributes and Properties

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | `string` | `''` | Plain text |
| `wpm` | `number` | `250` | Base WPM, normalized to 100–600 |
| `word-index` | `number` | `0` | Zero-based token index, rounded down and clamped |
| `labels` | `Partial<OreSpeedReadingLabels>` | English | JavaScript-only labels |
| `state` | `SpeedReadingState` | `idle` | Read-only reflected `idle`, `playing`, `paused`, or `ended` |

An external position change pauses playback. Reflected position updates do not emit duplicate progress events. Finite WPM values outside the range are clamped; invalid/nonfinite property values use 250 with a development warning. An empty or invalid speed-field commit instead displays a field error and preserves the existing pace. Invalid initial positions use zero with a warning; invalid `seek()` arguments leave the position unchanged and warn. Invalid `lang` falls back to `en` with a development warning.

### Methods

| Method | Description |
| --- | --- |
| `play()` | Start/resume, or replay from zero after ending |
| `pause()` | Cancel the timer and preserve the word |
| `restart()` | Reset to zero and remain idle |
| `seek(index)` | Pause and move to a clamped token index |

### Events

| Event | Detail | Description |
| --- | --- | --- |
| `play` | — | Playback entered `playing` |
| `pause` | — | A playing reader paused |
| `end` | — | Final word completed its dwell, or the user explicitly finished an oversized final token |
| `progress` | `{ index, total, start, end }` | A token is displayed |
| `wpm-change` | `{ wpm }` | User committed a speed change |

### Exported Types

`OreSpeedReadingProps`, `OreSpeedReadingEvents`, `OreSpeedReadingLabels`, `SpeedReadingState`, and `SpeedReadingElement` are exported from the root and component subpath. `SPEED_READING_TAG` is the registration constant. Tokenization and scheduling helpers are private.

### CSS Custom Properties

| Property | Default | Description |
| --- | --- | --- |
| `--speed-reading-font-size` | `var(--text-2xl)` | Word display type size |
| `--speed-reading-min-font-size` | `var(--text-base)` | Minimum passage-fitted type size |
| `--speed-reading-height` | `var(--size-32)` | Minimum viewport height |
| `--speed-reading-gap` | `var(--size-4)` | Gap between sections |
| `--speed-reading-focal-color` | `var(--color-primary)` | Highlight color |

### CSS Parts

| Part | Description |
| --- | --- |
| `viewport` | Focusable display |
| `word` | Visual word |
| `focal` | Stationary focal grapheme |
| `controls` | Playback button row |
| `status` | Visible playback feedback and word count |
| `full-text` | Selectable full text |

## Accessibility

The fast visual stream is hidden from assistive technology, not announced word by word. The full-text disclosure provides ordinary reading; a polite status region announces playback transitions and overflow. The focal letter is underlined as well as colored.

Playback never moves focus word by word. **Resume from here** returns focus to the primary playback control when the disclosure closes; overflow continuation returns it to the viewport so a disappearing recovery button never strands focus. On the reader viewport, **Space** toggles playback and **Left/Right Arrow** steps backward/forward. The information panel explains this focus requirement. Keyboard handling is local: text-input editing, native button activation, and modified shortcuts retain their behavior. The full-text panel is keyboard-scrollable, and the sentence selector and resume action are keyboard accessible.

There is no autoplay or word transition animation. Reduced motion does not make RSVP a universal accessible substitute for text; keep the full-text alternative and user controls available.
