// Eigen nummers, als noten. Elke maat = 16 zestienden.
// Drums: x = slag, X = harde slag, o = zachte slag, . = niets.
// Bas: R = grondtoon, O = octaaf hoger, 5 = kwint, 3 = terts, - = aanhouden, . = rust.
// Arp: cijfer = noot uit het akkoord (0 = laagste), . = rust.
// Melodie: notennaam (C5, F#5, Bb4), - = aanhouden, . = rust.
// Akkoord: [basnoot, ...akkoordnoten] als MIDI-nummers.
// Lagen per niveau: 1 = kick/hihat/pad, 2 = + bas/snare, 3 = + arp/percussie, 4 = + melodie, 5 = alles (drop).

export const SONGS = [
  {
    id: 'house',
    name: "Henry's House",
    style: 'House',
    emoji: '🏠',
    w: 0,
    bpm: 124,
    kit: 'normal',
    pump: true,
    pad: true,
    chords: [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]],
    drums: {
      kick: 'x...x...x...x...',
      clap: '....x.......x...',
      hat: '..x...x...x...x.',
      open: '..x...x...x...x.',
      hat16: 'x.xxx.xxx.xxx.xx',
    },
    bass: { type: 'saw', pattern: '. . R . . . O . . . R . . R O .' },
    stab: '. . . x . . x . . . . x . . x .',
    arp: { type: 'pluck', pattern: '0 1 2 1 0 1 2 3 0 1 2 1 0 1 2 3' },
    lead: {
      type: 'saw',
      bars: [
        'E5 . E5 . D5 . C5 . D5 - E5 - . . . .',
        'C5 . C5 . A4 . C5 . D5 - - - . . . .',
        'E5 . E5 . G5 . E5 . D5 - C5 - . . . .',
        'D5 . B4 . G4 . B4 . D5 - - - - - . .',
      ],
    },
  },
  {
    id: 'stomp',
    name: 'Stofzuig Stomp',
    style: 'Hiphop',
    emoji: '🧹',
    w: 0,
    bpm: 92,
    swing: 0.18,
    kit: '808',
    pad: true,
    chords: [[38, 50, 53, 57], [34, 50, 53, 58], [41, 53, 57, 60], [36, 52, 55, 60]],
    drums: {
      kick: 'x.....x...x..x..',
      snare: '....X.......X...',
      hat: 'x.x.x.x.x.x.x.x.',
      perc: '...x.....x....x.',
      hat16: '........xxxxxxxx',
    },
    bass: { type: 'sub808', pattern: 'R - - - - - R - - - R - - 5 - -' },
    arp: { type: 'pluck', pattern: '0 . . 2 . . 1 . 0 . . 2 . . 1 .' },
    lead: {
      type: 'whistle',
      bars: [
        'D5 . . F5 . . A5 . G5 . F5 . D5 . . .',
        'F5 . . D5 . . F5 . G5 - - - . . . .',
        'A5 . . G5 . . F5 . G5 . A5 . C6 - . .',
        'G5 - - - E5 - - - . . . . . . . .',
      ],
    },
    scratch: true,
  },
  {
    id: 'techno',
    name: 'Turbo Techno',
    style: 'Techno',
    emoji: '⚡',
    w: 0,
    bpm: 136,
    kit: 'normal',
    pump: true,
    chords: [[40, 52, 55, 59], [40, 52, 55, 59], [36, 52, 55, 60], [38, 50, 54, 57]],
    drums: {
      kick: 'X...x...X...x...',
      clap: '....x.......x...',
      hat: '..x...x...x...x.',
      open: '..x...x...x...x.',
      hat16: 'xxxxxxxxxxxxxxxx',
    },
    bass: { type: 'acid', pattern: '. R O R . R O R . R O R . R O R' },
    arp: { type: 'acid', pattern: '0 0 1 0 2 0 1 3 0 0 1 0 2 0 3 1' },
    lead: {
      type: 'square',
      bars: [
        'E5 . . E5 . . G5 . . E5 . . D5 . B4 .',
        'E5 . . E5 . . G5 . . A5 . . G5 . E5 .',
        'C5 . . C5 . . E5 . . C5 . . D5 . E5 .',
        'D5 . . D5 . . F#5 . . A5 . . F#5 . D5 .',
      ],
    },
  },
  {
    id: 'tropisch',
    name: 'Tropisch Feest',
    style: 'Zomer',
    emoji: '🌴',
    w: 1000,
    bpm: 100,
    kit: 'normal',
    pump: true,
    pad: true,
    chords: [[36, 52, 55, 60], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]],
    drums: {
      kick: 'x...x...x...x...',
      snare: '...x..x....x..x.',
      hat: 'x.x.x.x.x.x.x.x.',
      perc: 'xxxxxxxxxxxxxxxx',
      hat16: '..x...x...x...x.',
    },
    bass: { type: 'sub', pattern: 'R . . R . . R . R . . R . . O .' },
    arp: { type: 'marimba', pattern: '0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .' },
    lead: {
      type: 'whistle',
      bars: [
        'E5 . G5 . A5 . G5 . E5 . D5 . C5 . . .',
        'D5 . . . B4 . D5 . G5 . . . . . . .',
        'C5 . E5 . A5 . G5 . A5 . C6 . A5 . . .',
        'G5 . F5 . E5 . D5 . C5 - - - . . . .',
      ],
    },
  },
  {
    id: 'chip',
    name: '8-bit Henry',
    style: 'Retro game',
    emoji: '👾',
    w: 4000,
    bpm: 150,
    kit: 'chip',
    chords: [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]],
    drums: {
      kick: 'x.......x.......',
      snare: '....x.......x...',
      hat: 'x.x.x.x.x.x.x.x.',
      hat16: 'xxxxxxxxxxxxxxxx',
    },
    bass: { type: 'tri', pattern: 'R . O . R . O . R . O . R . O .' },
    arp: { type: 'pulse', pattern: '0 1 2 3 0 1 2 3 0 1 2 3 0 1 2 3' },
    lead: {
      type: 'pulse',
      bars: [
        'C5 . E5 . G5 . C6 . G5 . E5 . G5 . . .',
        'A4 . C5 . E5 . A5 . E5 . C5 . E5 . . .',
        'F4 . A4 . C5 . F5 . C5 . A4 . C5 . F5 .',
        'G5 . . G5 . . A5 . B5 . C6 - - - . .',
      ],
    },
  },
];

// Echte nummers (MP3) van Pixabay Music: vrij te gebruiken in een spel.
// gain = volume gelijktrekken, start = seconden stille intro overslaan.
export const FILE_SONGS = [
  { id: 'energiek', name: 'Energy House', artist: 'Paul Yudin', style: 'Vrolijke house', emoji: '🤩', file: 'MP3/paulyudin-house-energetic-upbeat-456608.mp3', bpm: 115, gain: 0.83, start: 14 },
  { id: 'acid', name: 'Acid House', artist: 'Aurec', style: 'Acid house', emoji: '🧪', file: 'MP3/aurec-acid-house-590194.mp3', bpm: 128, gain: 1.05, start: 0 },
  { id: 'electro', name: 'Electro House', artist: 'Aurec', style: 'Electro', emoji: '⚡', file: 'MP3/aurec-electro-house-583400.mp3', bpm: 130, gain: 1.16, start: 6 },
  { id: 'deep', name: 'Deep House', artist: 'Nastelbom', style: 'Deep house', emoji: '🌊', file: 'MP3/nastelbom-deep-house-351574.mp3', bpm: 120, gain: 0.71, start: 6 },
  { id: 'fashion', name: 'Fashion House', artist: 'SoundSurfer', style: 'Catwalk house', emoji: '😎', file: 'MP3/soundsurfer-fashion-house-468930.mp3', bpm: 120, gain: 0.8, start: 0 },
].map((s) => ({ ...s, w: 0 }));

SONGS.unshift(...FILE_SONGS);

export const song = (id) => SONGS.find((s) => s.id === id) || SONGS[0];
