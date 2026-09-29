/**
 * Named sound effects (Kenney "Interface Sounds", CC0, see public/audio/LICENSES.md).
 * Scenes ask for a cue by what happens on screen, never by file. `peak` is where the sound is
 * loudest (scripts/sfx-peaks.py), so it can be placed to hit exactly on its moment.
 */
export const CUES = {
  /** A message or card appears. */
  pop: { file: 'audio/sfx/pluck_001.ogg', peak: 0.002 },
  popAlt: { file: 'audio/sfx/pluck_002.ogg', peak: 0 },
  /** The punchline lands. */
  punch: { file: 'audio/sfx/bong_001.ogg', peak: 0.001 },
  /** Things fly together. */
  whoosh: { file: 'audio/sfx/maximize_006.ogg', peak: 0.064 },
  /** The logo arrives. */
  chime: { file: 'audio/sfx/confirmation_001.ogg', peak: 0.001 },
  /** A task completes, a checkbox ticks. */
  success: { file: 'audio/sfx/confirmation_002.ogg', peak: 0 },
  /** A row lands in a list. */
  tick: { file: 'audio/sfx/tick_001.ogg', peak: 0 },
  tickAlt: { file: 'audio/sfx/tick_002.ogg', peak: 0 },
  /** A mouse click, a key press. */
  click: { file: 'audio/sfx/click_001.ogg', peak: 0.001 },
  key: { file: 'audio/sfx/click_003.ogg', peak: 0 },
  /** Send, submit. */
  send: { file: 'audio/sfx/select_002.ogg', peak: 0.002 },
  toggle: { file: 'audio/sfx/switch_002.ogg', peak: 0.001 },
  drop: { file: 'audio/sfx/drop_002.ogg', peak: 0 },
  sparkle: { file: 'audio/sfx/glass_002.ogg', peak: 0 }
} as const

export type Cue = keyof typeof CUES
