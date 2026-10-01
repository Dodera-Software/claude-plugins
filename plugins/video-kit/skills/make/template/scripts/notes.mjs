// Claude's side of the edit room's notes (notes.json, written by the page). render.sh doesn't call
// this; Claude runs it while the room is open.
//
//   node scripts/notes.mjs watch             one line per new note (JSON), as it arrives; saves a
//                                            version of the video (for Undo), marks the note
//                                            "working" and tells the page Claude is listening
//   node scripts/notes.mjs done <id> "…"     the note is dealt with: one line on what changed
//   node scripts/notes.mjs ask <id> "…"      a question back instead (the page shows it)
//   node scripts/notes.mjs list              every note and its state
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { save as saveVersion } from './versions.mjs'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NOTES = join(HERE, 'notes.json')
const LISTENING = join(HERE, 'out', 'room-claude.json')

function read() {
  try {
    return JSON.parse(readFileSync(NOTES, 'utf8'))
  } catch {
    return []
  }
}

function write(notes) {
  writeFileSync(NOTES, `${JSON.stringify(notes, null, 2)}\n`)
}

/** The heartbeat the page reads to know Claude is listening; out/ may be cleared meanwhile, so it's made again. */
export function beat() {
  try {
    mkdirSync(dirname(LISTENING), { recursive: true })
    writeFileSync(LISTENING, JSON.stringify({ at: Date.now() }))
  } catch {}
}

/**
 * The notes not picked up yet: each gets a version of its video saved first (so the editor's Undo
 * can bring it back) and is marked "working". Returns them, for Claude to act on.
 */
export function takeNewNotes() {
  const notes = read()
  const fresh = notes.filter(note => note.status === 'new')
  if (!fresh.length) {
    return []
  }
  for (const note of fresh) {
    try {
      saveVersion(note.video, `Claude: “${note.text.length > 70 ? `${note.text.slice(0, 70)}…` : note.text}”`, 'claude')
    } catch {}
    note.status = 'working'
    note.updated = new Date().toISOString()
  }
  write(notes)
  return fresh.map(note => ({ id: note.id, video: note.video, scene: note.scene, sceneName: note.sceneName, frame: note.frame, time: note.time, text: note.text }))
}

function update(id, change) {
  const notes = read()
  const note = notes.find(entry => entry.id === Number(id))
  if (!note) {
    console.error(`No note ${id}`)
    process.exit(1)
  }
  Object.assign(note, change, { updated: new Date().toISOString() })
  write(notes)
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const [command, id, ...words] = main ? process.argv.slice(2) : []

if (!main) {
  // Imported (session.mjs): nothing to run.
} else if (command === 'watch') {
  const check = () => {
    beat()
    for (const note of takeNewNotes()) {
      console.log(JSON.stringify(note))
    }
  }
  check()
  setInterval(check, 2000)
} else if (command === 'done' || command === 'ask') {
  update(id, { status: command === 'done' ? 'done' : 'question', reply: words.join(' ').trim() || null })
} else if (command === 'list') {
  for (const note of read()) {
    console.log(`#${note.id} [${note.status}] ${note.video}${note.sceneName ? ` · ${note.sceneName}` : ''}${note.time ? ` · ${note.time}` : ''}: ${note.text}${note.reply ? `\n    → ${note.reply}` : ''}`)
  }
  if (!existsSync(NOTES)) {
    console.log('No notes yet.')
  }
} else {
  console.error('Usage: node scripts/notes.mjs watch | done <id> "…" | ask <id> "…" | list')
  process.exit(1)
}
