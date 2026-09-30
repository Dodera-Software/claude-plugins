// Claude's side of the edit room's notes (notes.json, written by the page). render.sh doesn't call
// this; Claude runs it while the room is open.
//
//   node scripts/notes.mjs watch             one line per new note (JSON), as it arrives; marks it
//                                            "working" and tells the page Claude is listening
//   node scripts/notes.mjs done <id> "…"     the note is dealt with: one line on what changed
//   node scripts/notes.mjs ask <id> "…"      a question back instead (the page shows it)
//   node scripts/notes.mjs list              every note and its state
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const [command, id, ...words] = process.argv.slice(2)

if (command === 'watch') {
  // The heartbeat the page reads; out/ may be cleared meanwhile (a render cleans it), so it's made again.
  const beat = () => {
    try {
      mkdirSync(dirname(LISTENING), { recursive: true })
      writeFileSync(LISTENING, JSON.stringify({ at: Date.now() }))
    } catch {}
  }
  const check = () => {
    beat()
    const notes = read()
    const fresh = notes.filter(note => note.status === 'new')
    if (!fresh.length) {
      return
    }
    for (const note of fresh) {
      note.status = 'working'
      note.updated = new Date().toISOString()
      console.log(JSON.stringify({ id: note.id, video: note.video, scene: note.scene, sceneName: note.sceneName, frame: note.frame, time: note.time, text: note.text }))
    }
    write(notes)
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
