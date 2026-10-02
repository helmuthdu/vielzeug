/**
 * The music library's pure half: track/video types, the curated suggestions, timeline
 * parsing, and YouTube URL extraction. No Vue, no settings, no player: SettingsView and
 * the audio composable share these functions as plain tested logic.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MusicTrack {
  start: number;
  title: string;
}

export interface MusicVideo {
  /** Where to start on first play (seconds): the curated entry's preferred opening. */
  defaultStart?: number;
  id: string;
  title: string;
  tracks: readonly MusicTrack[];
}

// ── Curated library ────────────────────────────────────────────────────────────

export const MUSIC_LIBRARY: readonly MusicVideo[] = [
  {
    id: 'RwJscjiB0Sc',
    title: 'The Day We Choose to Die',
    tracks: [
      { start: 0, title: 'The Day We Choose To Die' },
      { start: 174, title: 'Mother' },
      { start: 331, title: 'Hidden Lies' },
      { start: 483, title: 'Firefly' },
      { start: 682, title: 'Diaspora' },
      { start: 876, title: 'Under' },
      { start: 1033, title: 'Civilian' },
      { start: 1176, title: 'Collapse' },
      { start: 1333, title: 'Drift' },
      { start: 1460, title: 'Avarin' },
      { start: 1587, title: 'Gravity' },
    ],
  },
  {
    id: 'ZpWrLuiryEQ',
    title: 'Crimson Sovereign',
    tracks: [
      { start: 0, title: 'My Only Sword' },
      { start: 211, title: 'Evenly Matched' },
      { start: 343, title: 'Impetus' },
      { start: 534, title: 'Kosmochlor' },
      { start: 663, title: 'Final Breath' },
      { start: 822, title: 'Crimzon Nova' },
      { start: 955, title: 'Obelisk' },
      { start: 1164, title: 'Demise of the Land' },
      { start: 1334, title: 'Blue Eyes Alternative' },
      { start: 1489, title: 'Tearlaments' },
      { start: 1664, title: 'My Last Arm' },
      { start: 1859, title: 'Leviathan' },
      { start: 2054, title: 'Fates Collide' },
      { start: 2206, title: 'Arise' },
      { start: 2365, title: 'Face Them All' },
      { start: 2535, title: 'Domain of the True Monarchs' },
      { start: 2691, title: 'Road to Victory' },
      { start: 2854, title: 'Divine Duel' },
      { start: 3028, title: 'Champion Reborn' },
      { start: 3232, title: 'Forever Burning' },
      { start: 3453, title: 'Dogmatika' },
      { start: 3593, title: 'Mirror Jade' },
      { start: 3746, title: 'Determination' },
      { start: 3914, title: 'Swords of Revealing Light' },
      { start: 4052, title: 'Sacred Soldier' },
      { start: 4208, title: 'Ashes of Redemption' },
      { start: 4375, title: 'Dramaturge' },
      { start: 4504, title: 'Trump Card' },
      { start: 4668, title: 'Infiniti' },
      { start: 4821, title: 'Prisma' },
      { start: 5014, title: "Destiny's Path" },
      { start: 5161, title: 'Branded in White' },
      { start: 5303, title: 'Darkness Approaches' },
      { start: 5451, title: 'Rise With The Flames' },
      { start: 5630, title: 'Fury Unleashed' },
      { start: 5820, title: 'Jade' },
      { start: 5963, title: 'Gravity' },
      { start: 6089, title: 'Fiery Dragon' },
      { start: 6286, title: 'Polymerization' },
      { start: 6446, title: 'Lightfall' },
      { start: 6653, title: 'We Are The Dawn' },
      { start: 6839, title: 'Beyond The Veil' },
      { start: 6966, title: 'Violet Eternity' },
      { start: 7148, title: 'My Ashes, Your Flame' },
    ],
  },
  {
    id: 'vMD3VhkNCJw',
    title: 'The Price of Power',
    tracks: [
      { start: 0, title: 'The Eternal Throne' },
      { start: 396, title: 'Foxfire' },
      { start: 563, title: 'Last Of Their Kind (feat. Nino Chikviladze)' },
      { start: 789, title: 'We Are The Dawn' },
      { start: 981, title: 'Song Of The Moon' },
      { start: 1229, title: 'My Ashes, Your Flame' },
      { start: 1384, title: 'Protean, Pt. 5: Why Even Try' },
      { start: 1674, title: 'Oblivion' },
      { start: 1832, title: 'Fractured Hollows' },
      { start: 2019, title: 'Polaris' },
      { start: 2308, title: 'Lightfall' },
      { start: 2517, title: 'Uprising' },
      { start: 2723, title: 'League Of Shadow, Pt. 11: Ascendence' },
      { start: 2976, title: 'Another World' },
      { start: 3095, title: 'Stronger Than Fate' },
      { start: 3262, title: 'Angel Of The Flame' },
      { start: 3685, title: 'Vanguard' },
      { start: 3915, title: 'We Are Immortals' },
      { start: 4147, title: 'Afterlight' },
      { start: 4280, title: 'Earth Eternal' },
      { start: 4467, title: 'Distant Peaks' },
      { start: 4646, title: 'Protean, Pt. 2: Crossroads' },
      { start: 4781, title: 'Lyra Ascending' },
      { start: 4988, title: 'Future Sight' },
      { start: 5199, title: 'Nebula' },
      { start: 5336, title: 'Guardian' },
      { start: 5512, title: 'Proxima' },
      { start: 5665, title: 'Chosen One' },
      { start: 5813, title: 'Odisyr, Pt. 2: Deimos' },
      { start: 5891, title: 'Protean, Pt. 3: For What Is To Come' },
      { start: 6075, title: 'Hidden Machinations' },
      { start: 6252, title: 'Twist Ending' },
      { start: 6374, title: 'Hope In The Shadows' },
      { start: 6573, title: 'Beyond The Veil' },
      { start: 6699, title: 'My Condolences, Monster' },
      { start: 6910, title: 'League Of Shadow, Pt. 3: Judgemental Day' },
      { start: 7020, title: 'Moonlight Sonata (Dark Orchestral Version)' },
    ],
  },
  {
    id: '_8YDVT5UbnI',
    title: 'Hymn of the Exiled',
    tracks: [
      { start: 0, title: 'Sovereign' },
      { start: 156, title: 'Protect Us From Evil' },
      { start: 356, title: 'Act Of Will' },
      { start: 535, title: 'Worthy' },
      { start: 709, title: 'Hymn Of the Exiled' },
      { start: 883, title: 'Chasm' },
      { start: 1067, title: 'In Search Of Sunrise' },
      { start: 1253, title: 'Everlast' },
      { start: 1448, title: 'Worth Fighting For' },
      { start: 1647, title: 'Cygnus' },
      { start: 1778, title: 'Breaking Point' },
      { start: 1969, title: 'Antimatter' },
      { start: 2133, title: 'Sovereign' },
      { start: 2289, title: 'Protect Us From Evil' },
      { start: 2490, title: 'Act Of Will' },
      { start: 2669, title: 'Worthy' },
      { start: 2843, title: 'Hymn Of the Exiled' },
      { start: 3016, title: 'Chasm' },
      { start: 3201, title: 'In Search Of Sunrise' },
      { start: 3387, title: 'Everlast' },
      { start: 3582, title: 'Worth Fighting For' },
      { start: 3780, title: 'Cygnus' },
      { start: 3912, title: 'Breaking Point' },
      { start: 4102, title: 'Antimatter' },
    ],
  },
  {
    id: '1422G7oBzJY',
    title: 'Rebel of Heaven',
    tracks: [
      { start: 0, title: 'Mount Meru' },
      { start: 178, title: 'Ruyi Jingu Bang' },
      { start: 355, title: 'No More God' },
      { start: 568, title: 'Suppressed by Buddha' },
      { start: 716, title: 'For Extermination' },
      { start: 995, title: 'At Heaven’s Gate' },
      { start: 1171, title: 'Fiery Eyes and Golden Pupils' },
      { start: 1355, title: 'Ultimate Discipline' },
      { start: 1597, title: 'Becoming the Great Sage' },
      { start: 1767, title: 'Ascension in the West' },
      { start: 1906, title: 'Hero of All Heroes' },
      { start: 2056, title: 'Whirlwind of Fate' },
      { start: 2236, title: 'Stealing Peaches and Golden Elixir' },
      { start: 2393, title: 'Resurgence' },
      { start: 2549, title: 'Destined for This Life' },
      { start: 2725, title: 'Purple Lotus' },
      { start: 2887, title: 'You Die, I Live' },
      { start: 3072, title: 'Not Today, Never' },
      { start: 3219, title: '64 Palms of Bagua' },
      { start: 3414, title: 'Born to Own' },
      { start: 3655, title: 'Ready? I Think Not' },
    ],
  },
];

// ── Timeline parsing ────────────────────────────────────────────────────────────

/** Parses "m:ss Title" or "h:mm:ss Title" lines into track boundaries. */
export function parseTimeline(text: string): MusicTrack[] {
  const tracks: MusicTrack[] = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})\s+(.+)$/);
    if (m) {
      const hours = m[1] ? Number(m[1]) : 0;
      const start = hours * 3600 + Number(m[2]) * 60 + Number(m[3]);
      tracks.push({ start, title: m[4].trim() });
    }
  }
  return tracks;
}

/** Pulls the 11-character video id out of any YouTube URL form (or a bare id). */
export function extractVideoId(url: string): string | null {
  const m = url.trim().match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}

/** Pulls the playlist id out of a YouTube or YouTube Music playlist URL. */
export function extractPlaylistId(url: string): string | null {
  const m = url.trim().match(/[?&]list=([\w-]+)/);
  return m ? m[1] : null;
}
