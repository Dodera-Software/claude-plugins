// The guided flow in the browser: a two-way conversation between the page (scripts/room.mjs serves
// it) and Claude, kept in session.json in the video folder. The page writes what the person does
// (the brief, answers, comments, approvals) to its inbox; Claude hears it with `watch` and answers
// with the other commands, which the page shows straight away.
//
//   node scripts/session.mjs watch                  one JSON line per thing the person did, as it
//                                                   happens (also the editor's notes), and tells the
//                                                   page Claude is here; run it with the Monitor tool
//   node scripts/session.mjs start '<json>'         a new session: { product, suggestions, brands }
//   node scripts/session.mjs suggest '<json>'       ideas for the brief, as they come: { audiences,
//                                                   messages, mustShow, product }
//   node scripts/session.mjs steps '["Reading your product", "Storyboard", …]'
//   node scripts/session.mjs step <n> doing|done    a step's state (from 1)
//   node scripts/session.mjs say "…"                a message from Claude
//   node scripts/session.mjs ask "…" '["Option A", "Option B"]'   a question with buttons
//   node scripts/session.mjs storyboard <file.json> the storyboard to review: { title, scenes:
//                                                   [{ title, what, words, narration, seconds }] }
//   node scripts/session.mjs stills <file.json>     stills to review: [{ src (under public/), caption }]
//   node scripts/session.mjs ideas <file.json>      directions to pick from, with pictures: [{ title, text,
//                                                   pictures: [image files, anywhere], link }]; the
//                                                   pictures are copied in, so temporary ones can go
//   node scripts/session.mjs editor <VideoId>       the video is built: the page opens the editor
//   node scripts/session.mjs show                   the whole session, for reading back
//
// Nothing piles up: a session older than 30 days is cleared when the editor opens, with the
// reference files people dropped in (public/session/).
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beat, takeNewNotes } from './notes.mjs'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SESSION = join(HERE, 'session.json')
export const UPLOADS = join(HERE, 'public', 'session')
const KEEP_DAYS = 30

export function empty() {
  return {
    version: 1,
    stage: 'brief',
    startedAt: new Date().toISOString(),
    product: null,
    suggestions: {},
    brands: [],
    brief: null,
    steps: [],
    messages: [],
    storyboard: null,
    stills: null,
    ideas: null,
    videoId: null,
    inbox: []
  }
}

export function read() {
  try {
    return { ...empty(), ...JSON.parse(readFileSync(SESSION, 'utf8')) }
  } catch {
    return null
  }
}

export function write(session) {
  writeFileSync(SESSION, `${JSON.stringify(session, null, 2)}\n`)
}

export function change(update) {
  const session = read() ?? empty()
  update(session)
  session.updatedAt = new Date().toISOString()
  write(session)
  return session
}

/** Something the person did, for Claude to hear: the page calls this through the server. */
export function post(kind, data) {
  return change(session => {
    const id = (session.inbox.at(-1)?.id ?? 0) + 1
    session.inbox.push({ id, kind, data, at: new Date().toISOString(), handled: false })
  })
}

/** Clears a session past its keeping time, and the files dropped into it. */
export function cleanOld() {
  try {
    if (existsSync(SESSION) && Date.now() - statSync(SESSION).mtimeMs > KEEP_DAYS * 24 * 3600 * 1000) {
      rmSync(SESSION, { force: true })
      rmSync(UPLOADS, { recursive: true, force: true })
    }
  } catch {}
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function json(text, what) {
  try {
    return JSON.parse(text)
  } catch {
    return fail(`${what} must be JSON.`)
  }
}

const main = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const [command, ...args] = main ? process.argv.slice(2) : []

if (!main) {
  // Imported by the server.
} else if (command === 'watch') {
  const check = () => {
    beat()
    const session = read()
    if (session) {
      const fresh = session.inbox.filter(item => !item.handled)
      if (fresh.length) {
        change(current => {
          for (const item of current.inbox) {
            if (fresh.some(other => other.id === item.id)) {
              item.handled = true
            }
          }
        })
        for (const item of fresh) {
          console.log(JSON.stringify({ kind: item.kind, ...item.data }))
        }
      }
    }
    for (const note of takeNewNotes()) {
      console.log(JSON.stringify({ kind: 'note', ...note }))
    }
  }
  check()
  setInterval(check, 1500)
} else if (command === 'start') {
  const details = json(args[0] ?? '{}', 'The details')
  mkdirSync(HERE, { recursive: true })
  write({ ...empty(), ...details })
  console.log('Session started.')
} else if (command === 'suggest') {
  const ideas = json(args[0] ?? '{}', 'The suggestions')
  change(session => {
    const { product, brands, ...rest } = ideas
    if (product) {
      session.product = product
    }
    if (brands) {
      session.brands = brands
    }
    session.suggestions = { ...session.suggestions, ...rest }
  })
} else if (command === 'steps') {
  const labels = json(args[0] ?? '[]', 'The steps')
  change(session => {
    session.steps = labels.map(label => ({ label, state: 'todo' }))
    session.stage = session.stage === 'brief' ? 'working' : session.stage
  })
} else if (command === 'step') {
  const index = Number(args[0]) - 1
  change(session => {
    if (!session.steps[index]) {
      fail(`No step ${args[0]}`)
    }
    session.steps[index].state = args[1] === 'done' ? 'done' : 'doing'
    // Steps before a step being worked on are done.
    session.steps.forEach((step, other) => {
      if (other < index && step.state !== 'done') {
        step.state = 'done'
      }
    })
  })
} else if (command === 'say' || command === 'ask') {
  const text = args[0]?.trim()
  if (!text) {
    fail('Nothing to say.')
  }
  const options = command === 'ask' ? json(args[1] ?? '[]', 'The options') : null
  change(session => {
    const id = (session.messages.at(-1)?.id ?? 0) + 1
    session.messages.push({ id, from: 'claude', text, options, answer: null, at: new Date().toISOString() })
  })
} else if (command === 'storyboard') {
  const board = json(readFileSync(resolve(args[0] ?? ''), 'utf8'), 'The storyboard file')
  change(session => {
    session.storyboard = { ...board, status: 'waiting', round: (session.storyboard?.round ?? 0) + 1 }
    session.stage = 'storyboard'
  })
} else if (command === 'stills') {
  const items = json(readFileSync(resolve(args[0] ?? ''), 'utf8'), 'The stills file')
  change(session => {
    session.stills = { items, status: 'waiting', round: (session.stills?.round ?? 0) + 1 }
    session.stage = 'stills'
  })
} else if (command === 'ideas') {
  const items = json(readFileSync(resolve(args[0] ?? ''), 'utf8'), 'The ideas file')
  const round = (read()?.ideas?.round ?? 0) + 1
  const dir = join(UPLOADS, 'ideas')
  // Only this round's pictures stay.
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const shown = items.map((item, index) => ({
    ...item,
    pictures: (item.pictures ?? []).slice(0, 4).flatMap((picture, at) => {
      const from = resolve(HERE, 'public', picture)
      const source = existsSync(picture) ? resolve(picture) : existsSync(from) ? from : null
      if (!source) {
        return []
      }
      const name = `r${round}-${index + 1}-${at + 1}${extname(source) || '.png'}`
      copyFileSync(source, join(dir, name))
      return [`session/ideas/${name}`]
    })
  }))
  change(session => {
    session.ideas = { items: shown, status: 'waiting', round }
    session.stage = 'ideas'
  })
  console.log(`Showing ${shown.length} ideas.`)
} else if (command === 'editor') {
  change(session => {
    session.videoId = args[0] ?? null
    session.stage = 'editor'
    session.steps.forEach(step => {
      step.state = 'done'
    })
  })
} else if (command === 'show') {
  const session = read()
  console.log(session ? JSON.stringify({ ...session, inbox: undefined }, null, 2) : 'No session.')
} else {
  fail('Usage: node scripts/session.mjs watch | start | suggest | steps | step | say | ask | storyboard | stills | ideas | editor | show')
}
