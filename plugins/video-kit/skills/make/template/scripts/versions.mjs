// Versions of a video, for Undo and going back: before every change (in the editor, or Claude
// working on a note) the video's own files are saved. The editor (room.mjs) and notes.mjs use this;
// Claude can too, before changing a video by hand.
//
//   node scripts/versions.mjs save <VideoId|folder> "<what is about to change>" [you|claude]
//   node scripts/versions.mjs list <VideoId|folder>
//   node scripts/versions.mjs restore <VideoId|folder> <version id>
//   node scripts/versions.mjs undo <VideoId|folder>
//   node scripts/versions.mjs clean                      delete everything past its keeping time
//
// What a version holds: everything in src/videos/<folder>/, the video's own entries in
// src/tweaks.json, and its narrator recordings in public/voice/<folder>/. Not the kit or anything
// shared by every video.
//
// Nothing stays forever: a video keeps its last 30 versions, none older than 7 days, and old ones
// are deleted every time a version is saved and whenever the editor opens. Files are stored once by
// their content (identical files across versions take no extra room), in video/.versions/, which
// git ignores; deleting the video folder deletes them too.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STORE = join(HERE, '.versions')
const TWEAKS = join(HERE, 'src', 'tweaks.json')
const KEEP = 30
const DAYS = 7

/** The video folders and the ids each defines (`id: 'AcmeTeaser'`). */
export function folders() {
  const root = join(HERE, 'src', 'videos')
  if (!existsSync(root)) {
    return []
  }
  return readdirSync(root).filter(name => statSync(join(root, name)).isDirectory()).map(name => {
    const dir = join(root, name)
    const index = ['index.tsx', 'index.ts'].map(file => join(dir, file)).find(file => existsSync(file))
    const source = index ? readFileSync(index, 'utf8') : ''
    return { folder: name, ids: [...source.matchAll(/\bid:\s*['"`]([A-Za-z0-9_-]+)['"`]/g)].map(match => match[1]) }
  })
}

/** A video's folder from its id ("AcmeTeaser-en", with or without its language and shape) or the folder's own name. */
export function folderOf(name) {
  const all = folders()
  const direct = all.find(entry => entry.folder === name)
  if (direct) {
    return direct
  }
  // AcmeTeaser-square-es: the defined id is the longest one the name starts with.
  const matches = all.flatMap(entry => entry.ids.filter(id => name === id || name.startsWith(`${id}-`)).map(id => ({ entry, id })))
  matches.sort((a, b) => b.id.length - a.id.length)
  if (!matches.length) {
    throw new Error(`No video folder for "${name}"`)
  }
  return matches[0].entry
}

function walk(dir) {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function readTweaks() {
  try {
    return JSON.parse(readFileSync(TWEAKS, 'utf8'))
  } catch {
    return {}
  }
}

function storeOf(folder) {
  return join(STORE, folder)
}

function manifests(folder) {
  const dir = join(storeOf(folder), 'versions')
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir).filter(name => name.endsWith('.json')).map(name => {
    try {
      return JSON.parse(readFileSync(join(dir, name), 'utf8'))
    } catch {
      return null
    }
  }).filter(Boolean).sort((a, b) => b.at - a.at)
}

function cursorFile(folder) {
  return join(storeOf(folder), 'cursor.json')
}

/** Deletes versions past their keeping time and the stored files nothing points to any more. */
export function prune(folder) {
  const dir = join(storeOf(folder), 'versions')
  const oldest = Date.now() - DAYS * 24 * 3600 * 1000
  manifests(folder).forEach((version, index) => {
    if (index >= KEEP || version.at < oldest) {
      rmSync(join(dir, `${version.id}.json`), { force: true })
    }
  })
  const used = new Set(manifests(folder).flatMap(version => Object.values(version.files)))
  const blobs = join(storeOf(folder), 'blobs')
  if (existsSync(blobs)) {
    for (const name of readdirSync(blobs)) {
      if (!used.has(name)) {
        rmSync(join(blobs, name), { force: true })
      }
    }
  }
  if (!manifests(folder).length) {
    rmSync(storeOf(folder), { recursive: true, force: true })
  }
}

/** Prunes every video's versions, and drops those of videos that no longer exist. */
export function cleanAll() {
  if (!existsSync(STORE)) {
    return
  }
  const existing = new Set(folders().map(entry => entry.folder))
  for (const folder of readdirSync(STORE)) {
    if (!existing.has(folder)) {
      rmSync(join(STORE, folder), { recursive: true, force: true })
    } else {
      prune(folder)
    }
  }
  if (!readdirSync(STORE).length) {
    rmSync(STORE, { recursive: true, force: true })
  }
}

/** Saves the video's files as they are now. `kind` is "change" (before a change) or "restore" (before going back). */
export function save(name, label, who = 'you', kind = 'change') {
  const { folder, ids } = folderOf(name)
  const store = storeOf(folder)
  mkdirSync(join(store, 'blobs'), { recursive: true })
  mkdirSync(join(store, 'versions'), { recursive: true })
  const files = {}
  const keep = (path, content) => {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 32)
    const blob = join(store, 'blobs', hash)
    if (!existsSync(blob)) {
      writeFileSync(blob, content)
    }
    files[path] = hash
  }
  for (const file of [...walk(join(HERE, 'src', 'videos', folder)), ...walk(join(HERE, 'public', 'voice', folder))]) {
    keep(relative(HERE, file).split(sep).join('/'), readFileSync(file))
  }
  // Only this video's own entries in the shared tweaks file.
  const tweaks = readTweaks()
  const own = Object.fromEntries(ids.filter(id => tweaks[id]).map(id => [id, tweaks[id]]))
  const at = Date.now()
  const id = `${at.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const version = { id, at, label: String(label || 'A change').slice(0, 160), who: who === 'claude' ? 'claude' : 'you', kind, files, tweaks: own, ids }
  writeFileSync(join(store, 'versions', `${id}.json`), JSON.stringify(version))
  if (kind === 'change') {
    rmSync(cursorFile(folder), { force: true })
  }
  prune(folder)
  return version
}

/** The versions of a video, newest first, without their file lists. */
export function list(name) {
  const { folder } = folderOf(name)
  prune(folder)
  let cursor = null
  try {
    cursor = JSON.parse(readFileSync(cursorFile(folder), 'utf8')).id
  } catch {}
  return {
    folder,
    keepDays: DAYS,
    keep: KEEP,
    cursor,
    versions: manifests(folder).map(({ files: _files, ...version }) => version)
  }
}

/** Puts the video's files back as they were in version `id` (first saving how they are now). */
export function restore(name, id, label) {
  const { folder, ids } = folderOf(name)
  const target = manifests(folder).find(version => version.id === id)
  if (!target) {
    throw new Error('That version is no longer kept (versions are kept 7 days, the last 30).')
  }
  save(name, label ?? `Before going back to: ${target.label}`, 'you', 'restore')
  const covered = [join(HERE, 'src', 'videos', folder), join(HERE, 'public', 'voice', folder)]
  // Files that exist now but didn't then go; the version's files come back.
  for (const file of covered.flatMap(walk)) {
    if (!target.files[relative(HERE, file).split(sep).join('/')]) {
      rmSync(file, { force: true })
    }
  }
  for (const [path, hash] of Object.entries(target.files)) {
    const file = join(HERE, ...path.split('/'))
    const content = readFileSync(join(storeOf(folder), 'blobs', hash))
    if (!existsSync(file) || !readFileSync(file).equals(content)) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, content)
    }
  }
  const tweaks = readTweaks()
  for (const videoId of ids) {
    if (target.tweaks?.[videoId]) {
      tweaks[videoId] = target.tweaks[videoId]
    } else {
      delete tweaks[videoId]
    }
  }
  writeFileSync(TWEAKS, `${JSON.stringify(tweaks, null, 2)}\n`)
  return target
}

/** Steps back one change: each Undo goes one version further back, until a new change is made. */
export function undo(name) {
  const { folder } = folderOf(name)
  const all = manifests(folder).filter(version => version.kind === 'change')
  let cursor = null
  try {
    cursor = JSON.parse(readFileSync(cursorFile(folder), 'utf8'))
  } catch {}
  const next = cursor ? all.find(version => version.at < cursor.at) : all[0]
  if (!next) {
    throw new Error('Nothing more to undo.')
  }
  restore(name, next.id, `Before undoing: ${next.label}`)
  writeFileSync(cursorFile(folder), JSON.stringify({ id: next.id, at: next.at }))
  return next
}

// From the command line.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, name, ...rest] = process.argv.slice(2)
  try {
    if (command === 'save') {
      const version = save(name, rest[0], rest[1])
      console.log(`Saved version ${version.id}: ${version.label}`)
    } else if (command === 'list') {
      const { versions } = list(name)
      for (const version of versions) {
        console.log(`${version.id}  ${new Date(version.at).toLocaleString()}  ${version.who}  ${version.label}`)
      }
      if (!versions.length) {
        console.log('No versions yet.')
      }
    } else if (command === 'restore') {
      console.log(`Back to: ${restore(name, rest[0]).label}`)
    } else if (command === 'undo') {
      console.log(`Undid: ${undo(name).label}`)
    } else if (command === 'clean') {
      cleanAll()
      console.log('Old versions cleaned up.')
    } else {
      console.error('Usage: node scripts/versions.mjs save|list|restore|undo <VideoId|folder> … | clean')
      process.exit(1)
    }
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
