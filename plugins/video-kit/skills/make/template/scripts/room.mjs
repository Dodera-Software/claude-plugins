// The edit room: the videos playing live in the browser, with their scenes, words and voice lines
// to change on the spot, notes for Claude, and export. Runs on the computer with Node (not in
// Docker), only on this computer (127.0.0.1), and only while it's open. render.sh calls this.
//
//   node scripts/room.mjs [VideoId]     start it, open the browser; stops with Ctrl+C or "Close"
//
// What it writes, and nothing else: src/videos/<folder>/content.ts (words), voice.json (voice
// lines, then records them), src/tweaks.json (scene lengths), notes.json (notes for Claude). The
// page itself is bundled from src/room/ with esbuild and rebuilt whenever a file it uses changes.
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, watch, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { context } from 'esbuild'
import ts from 'typescript'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(HERE, 'node_modules', '.cache', 'video-kit-room')
const NOTES = join(HERE, 'notes.json')
const TWEAKS = join(HERE, 'src', 'tweaks.json')
const LISTENING = join(HERE, 'out', 'room-claude.json')
const PROGRESS = join(HERE, 'out', 'progress.txt')
const EXPORT_LOG = join(HERE, 'out', 'export.log')
const [wanted] = process.argv.slice(2)

mkdirSync(OUT, { recursive: true })
mkdirSync(join(HERE, 'out'), { recursive: true })

// ---------------------------------------------------------------------------------------------
// The page, rebuilt on every change. Clients hear about it on /api/events and reload.

const clients = new Set()
function broadcast(event, data = {}) {
  for (const client of clients) {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
}

let buildError = null
const bundle = await context({
  entryPoints: [join(HERE, 'src', 'room', 'main.tsx')],
  bundle: true,
  format: 'esm',
  outdir: OUT,
  sourcemap: 'linked',
  jsx: 'automatic',
  loader: { '.png': 'file', '.jpg': 'file', '.svg': 'file', '.woff2': 'file', '.ttf': 'file' },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'silent',
  plugins: [{
    name: 'reload',
    setup(build) {
      build.onEnd(result => {
        if (result.errors.length) {
          buildError = result.errors.map(error => `${error.location ? `${error.location.file}:${error.location.line}: ` : ''}${error.text}`).join('\n')
          broadcast('broken', { error: buildError })
        } else {
          const was = buildError
          buildError = null
          broadcast('rebuilt', { fixed: Boolean(was) })
        }
      })
    }
  }]
})
await bundle.watch()

// ---------------------------------------------------------------------------------------------
// The project: which folder each video comes from, and what can be changed there.

function folders() {
  const root = join(HERE, 'src', 'videos')
  return readdirSync(root).filter(name => statSync(join(root, name)).isDirectory()).map(name => {
    const dir = join(root, name)
    const index = ['index.tsx', 'index.ts'].map(file => join(dir, file)).find(file => existsSync(file))
    const source = index ? readFileSync(index, 'utf8') : ''
    // The ids it defines: `id: 'AcmeTeaser'`, the base the language and shape suffixes are added to.
    const ids = [...source.matchAll(/\bid:\s*['"`]([A-Za-z0-9_-]+)['"`]/g)].map(match => match[1])
    return {
      folder: name,
      ids,
      content: existsSync(join(dir, 'content.ts')),
      voice: existsSync(join(dir, 'voice.json'))
    }
  })
}

function folderPath(folder, file) {
  if (!/^[A-Za-z0-9_-]+$/.test(folder) || !folders().some(entry => entry.folder === folder)) {
    throw new Error('No such video folder')
  }
  return join(HERE, 'src', 'videos', folder, file)
}

// ---------------------------------------------------------------------------------------------
// Words: every string in content.ts that's shown on screen, with where it is in the file.

const NOT_WORDS = new Set(['src', 'image', 'icon', 'id', 'color', 'colour', 'url', 'href', 'kind', 'tone', 'glyph', 'logo', 'file', 'shot', 'direction', 'look', 'format', 'fit', 'side', 'align', 'variant', 'emoji', 'at'])

function words(folder) {
  const file = folderPath(folder, 'content.ts')
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const found = []
  const visit = (node, path) => {
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(source).replace(/^['"]|['"]$/g, '')
      visit(node.initializer, [...path, name])
      return
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach((element, index) => visit(element, [...path, index]))
      return
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      visit(node.initializer, [node.name.getText(source)])
      return
    }
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node)) {
      return
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const key = path.findLast(part => typeof part === 'string')
      const value = node.text
      // Paths, colours, ids and other values that aren't words on screen.
      const looksLikeValue = !/\s/.test(value) && (/[/#.]/.test(value) || /^[a-z]+([A-Z][a-z]+)+$/.test(value) || value.length > 40)
      if (!NOT_WORDS.has(key) && !looksLikeValue && value.trim()) {
        found.push({ path: path.join('.'), text: value, start: node.getStart(source), end: node.getEnd() })
      }
      return
    }
    ts.forEachChild(node, child => visit(child, path))
  }
  visit(source, [])
  return found
}

function saveWord(folder, { start, end, old, text }) {
  const file = folderPath(folder, 'content.ts')
  const source = readFileSync(file, 'utf8')
  const literal = source.slice(start, end)
  const quote = literal[0]
  const current = words(folder).find(word => word.start === start && word.end === end)?.text
  if (current !== old) {
    throw new Error('The file changed in the meantime (Claude may be editing it). Your change wasn\'t saved: try again.')
  }
  const escaped = quote === '`'
    ? `\`${text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``
    : quote === "'"
      ? `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
      : JSON.stringify(text)
  writeFileSync(file, source.slice(0, start) + escaped + source.slice(end))
}

// ---------------------------------------------------------------------------------------------
// Voice lines: voice.json, recorded again after a change.

let recording = null
function recordVoice(folder) {
  return new Promise(done => {
    recording = { folder, started: Date.now(), error: null }
    broadcast('voice', { recording: true })
    const child = spawn(process.execPath, [join(HERE, 'scripts', 'voice.mjs'), folder], { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    child.stdout.on('data', chunk => { log += chunk })
    child.stderr.on('data', chunk => { log += chunk })
    child.on('close', code => {
      const error = code === 0 ? null : log.trim().split('\n').slice(-4).join('\n')
      recording = null
      broadcast('voice', { recording: false, error })
      done(error)
    })
  })
}

// ---------------------------------------------------------------------------------------------
// Notes for Claude: notes.json, which Claude watches (scripts/notes.mjs) while the room is open.

function readNotes() {
  try {
    return JSON.parse(readFileSync(NOTES, 'utf8'))
  } catch {
    return []
  }
}

function claudeListening() {
  try {
    const { at } = JSON.parse(readFileSync(LISTENING, 'utf8'))
    return Date.now() - at < 45_000
  } catch {
    return false
  }
}

let notesWatch = null
function watchNotes() {
  if (notesWatch || !existsSync(NOTES)) {
    return
  }
  notesWatch = watch(NOTES, () => broadcast('notes'))
}
watchNotes()

// ---------------------------------------------------------------------------------------------
// Export: the kit's own render (Docker), with its progress. The render always writes to out/; when
// the person chose another folder, the finished files are copied there, never over a file already
// there ("name (2).mp4").

/** Where exports can go without asking: the video's own out/ folder, Downloads, the Desktop. */
function places() {
  const home = os.homedir()
  return {
    video: join(HERE, 'out'),
    downloads: join(home, 'Downloads'),
    desktop: join(home, 'Desktop')
  }
}

/** The system's own folder picker (Finder, Explorer, or zenity/kdialog on Linux). Null if cancelled. */
function pickFolder() {
  const prompt = 'Where should the video be saved?'
  const [command, args] = process.platform === 'darwin'
    ? ['osascript', ['-e', `POSIX path of (choose folder with prompt "${prompt}")`]]
    : process.platform === 'win32'
      ? ['powershell', ['-NoProfile', '-STA', '-Command', `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '${prompt}'; $d.ShowNewFolderButton = $true; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }`]]
      : ['zenity', ['--file-selection', '--directory', `--title=${prompt}`]]
  return new Promise((done, fail) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', chunk => { out += chunk })
    child.on('error', () => fail(new Error('This computer has no folder picker the edit room can open. Type the folder\'s path instead.')))
    child.on('close', () => {
      const path = out.trim().replace(/\/$/, '')
      done(path || null)
    })
  })
}

/** A name in `dir` that isn't taken: "video.mp4", else "video (2).mp4", "video (3).mp4"… */
function freeName(dir, name) {
  const extension = extname(name)
  const stem = name.slice(0, -extension.length)
  let candidate = name
  for (let n = 2; existsSync(join(dir, candidate)); n++) {
    candidate = `${stem} (${n})${extension}`
  }
  return join(dir, candidate)
}

function outputs(id, since) {
  const slug = id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  return [`${slug}-4k.mp4`, `${slug}-1080p.mp4`, `${slug}-poster.png`, `${slug}-thumbnail.jpg`]
    .map(name => join(HERE, 'out', name))
    .filter(file => existsSync(file) && statSync(file).mtimeMs > since)
}

let exporting = null
function startExport(id, quick, to) {
  if (exporting?.running) {
    throw new Error('An export is already running.')
  }
  const destination = to ? resolve(String(to)) : null
  if (destination && (!existsSync(destination) || !statSync(destination).isDirectory())) {
    throw new Error(`There's no folder at ${destination}. Choose another one.`)
  }
  mkdirSync(join(HERE, 'out'), { recursive: true })
  writeFileSync(PROGRESS, '0% · getting ready: starting Docker and preparing the video (about a minute; after an update to the video tools, the first time takes several minutes)')
  writeFileSync(EXPORT_LOG, '')
  const child = spawn(process.execPath, [join(HERE, 'scripts', 'render.mjs'), id, ...(quick ? ['quick'] : [])], { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] })
  exporting = { id, quick, running: true, code: null, started: Date.now(), destination, copied: [], copyError: null }
  let log = ''
  const keep = chunk => {
    log = (log + chunk).slice(-20000)
    writeFileSync(EXPORT_LOG, log)
  }
  child.stdout.on('data', keep)
  child.stderr.on('data', keep)
  child.on('close', code => {
    const done = { ...exporting, running: false, code, finished: Date.now() }
    if (code === 0 && destination && destination !== join(HERE, 'out')) {
      try {
        done.copied = outputs(id, exporting.started).map(file => {
          const target = freeName(destination, file.split(sep).pop())
          copyFileSync(file, target)
          return target
        })
      } catch (error) {
        done.copyError = `The video was made, but couldn't be copied to ${destination}: ${error.message}. It's in the video's out folder.`
      }
    }
    exporting = done
    broadcast('export')
  })
}

function exportState() {
  if (!exporting) {
    return { running: false }
  }
  // The files where they ended up (the chosen folder, or out/), less any moved to the Trash since.
  const files = (exporting.copied?.length ? exporting.copied : outputs(exporting.id, exporting.started)).filter(file => existsSync(file))
  let progress = ''
  try {
    progress = readFileSync(PROGRESS, 'utf8').trim()
  } catch {}
  let tail = ''
  if (exporting.code) {
    try {
      tail = readFileSync(EXPORT_LOG, 'utf8').trim().split('\n').filter(line => !/^Rendered \d|^Encoded \d|Bundling/.test(line)).slice(-6).join('\n')
    } catch {}
  }
  return { ...exporting, progress, files, tail }
}

/** A file the last export made (in the chosen folder or out/), or an error: nothing else is touched. */
function madeFile(file) {
  const path = resolve(String(file))
  const made = exporting ? [...(exporting.copied ?? []), ...outputs(exporting.id, exporting.started)] : []
  if (!made.includes(path) || !existsSync(path)) {
    throw new Error('No such file')
  }
  return path
}

/**
 * Moves a file the export made to the Trash (the Recycle Bin on Windows), so a deleted version can
 * still be brought back. Never deletes outright.
 */
function trash(file) {
  const path = madeFile(file)
  if (process.platform === 'darwin') {
    const bin = join(os.homedir(), '.Trash')
    const target = freeName(bin, path.split(sep).pop())
    try {
      renameSync(path, target)
    } catch (error) {
      // Another disk: copy into the Trash, then remove the original.
      if (error.code !== 'EXDEV') {
        throw error
      }
      copyFileSync(path, target)
      unlinkSync(path)
    }
    return
  }
  const [command, args] = process.platform === 'win32'
    ? ['powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${path.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`]]
    : ['gio', ['trash', path]]
  const result = spawnSync(command, args, { stdio: 'ignore' })
  if (result.status !== 0 || existsSync(path)) {
    throw new Error("Couldn't move it to the Trash. Delete it from its folder instead.")
  }
}

/** Shows a finished file in its folder, or opens it (plays a video) with `play`. Only files an export made. */
function openFile(file, play) {
  const path = madeFile(file)
  if (process.platform === 'darwin') {
    spawn('open', play ? [path] : ['-R', path], { stdio: 'ignore', detached: true }).unref()
  } else if (process.platform === 'win32') {
    spawn(play ? 'cmd' : 'explorer', play ? ['/c', 'start', '""', `"${path}"`] : [`/select,${path}`], { stdio: 'ignore', detached: true, windowsVerbatimArguments: play }).unref()
  } else {
    spawn('xdg-open', [play ? path : dirname(path)], { stdio: 'ignore', detached: true }).unref()
  }
}

// ---------------------------------------------------------------------------------------------
// The server

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf'
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Edit room</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%236d8dff%22/%3E%3Cpath d=%22M12 9l12 7-12 7z%22 fill=%22%230b1230%22/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/room/main.css">
</head>
<body><div id="room"></div><script type="module" src="/room/main.js"></script></body>
</html>`

function sendFile(res, path) {
  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
  const { size } = statSync(path)
  const range = res.req.headers.range
  // Videos and audio seek with ranges.
  if (range) {
    const [from, to] = range.replace('bytes=', '').split('-').map(value => (value ? Number(value) : undefined))
    const start = from ?? 0
    const end = Math.min(to ?? size - 1, size - 1)
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-cache' })
    import('node:fs').then(({ createReadStream }) => createReadStream(path, { start, end }).pipe(res))
    return
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' })
  import('node:fs').then(({ createReadStream }) => createReadStream(path).pipe(res))
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}

async function body(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > 1_000_000) {
      throw new Error('Too large')
    }
  }
  return text ? JSON.parse(text) : {}
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = decodeURIComponent(url.pathname)
  try {
    if (path.startsWith('/api/')) {
      // Only this page may change things: a page on another site can't send this header here.
      if (req.method !== 'GET' && req.headers['x-edit-room'] !== '1') {
        return json(res, 403, { error: 'Not allowed' })
      }
      if (path === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
        res.write(`event: hello\ndata: ${JSON.stringify({ error: buildError })}\n\n`)
        clients.add(res)
        req.on('close', () => clients.delete(res))
        return
      }
      if (path === '/api/project') {
        let tweaks = {}
        try {
          tweaks = JSON.parse(readFileSync(TWEAKS, 'utf8'))
        } catch {}
        return json(res, 200, { folders: folders(), tweaks, wanted: wanted ?? null, buildError })
      }
      if (path === '/api/words' && req.method === 'GET') {
        return json(res, 200, { words: words(url.searchParams.get('folder') ?? '') })
      }
      if (path === '/api/words' && req.method === 'POST') {
        const { folder, ...change } = await body(req)
        saveWord(folder, change)
        return json(res, 200, { words: words(folder) })
      }
      if (path === '/api/voice' && req.method === 'GET') {
        const folder = url.searchParams.get('folder') ?? ''
        const script = JSON.parse(readFileSync(folderPath(folder, 'voice.json'), 'utf8'))
        return json(res, 200, { script, recording: Boolean(recording) })
      }
      if (path === '/api/voice' && req.method === 'POST') {
        const { folder, script } = await body(req)
        if (recording) {
          return json(res, 409, { error: 'The voice is being recorded already; wait a moment.' })
        }
        const file = folderPath(folder, 'voice.json')
        const current = JSON.parse(readFileSync(file, 'utf8'))
        // Only the words, the spoken spelling, the voice and its speed change here.
        const lines = current.lines.map(line => {
          const changed = script.lines.find(other => other.id === line.id)
          const next = { ...line, text: String(changed?.text ?? line.text).trim() }
          const say = String(changed?.say ?? '').trim()
          if (say && say !== next.text) {
            next.say = say
          } else {
            delete next.say
          }
          return next
        })
        const speed = Math.min(1.15, Math.max(0.85, Number(script.speed) || 1))
        writeFileSync(file, `${JSON.stringify({ ...current, voice: String(script.voice || current.voice), speed, lines }, null, 2)}\n`)
        json(res, 202, { recording: true })
        recordVoice(folder)
        return
      }
      if (path === '/api/tweak' && req.method === 'POST') {
        const { id, scene, extra } = await body(req)
        if (!/^[A-Za-z0-9_-]+$/.test(id) || !Number.isInteger(scene) || scene < 1 || !Number.isFinite(extra)) {
          return json(res, 400, { error: 'Bad change' })
        }
        let tweaks = {}
        try {
          tweaks = JSON.parse(readFileSync(TWEAKS, 'utf8'))
        } catch {}
        const own = { ...(tweaks[id] ?? {}) }
        const frames = Math.max(-600, Math.min(1800, Math.round(extra)))
        if (frames === 0) {
          delete own[String(scene)]
        } else {
          own[String(scene)] = frames
        }
        if (Object.keys(own).length) {
          tweaks[id] = own
        } else {
          delete tweaks[id]
        }
        writeFileSync(TWEAKS, `${JSON.stringify(tweaks, null, 2)}\n`)
        return json(res, 200, { tweaks })
      }
      if (path === '/api/notes' && req.method === 'GET') {
        return json(res, 200, { notes: readNotes(), listening: claudeListening() })
      }
      if (path === '/api/notes' && req.method === 'POST') {
        const note = await body(req)
        const text = String(note.text ?? '').trim()
        if (!text) {
          return json(res, 400, { error: 'Write the note first.' })
        }
        const notes = readNotes()
        notes.push({
          id: (notes.at(-1)?.id ?? 0) + 1,
          video: String(note.video ?? ''),
          scene: note.scene ?? null,
          sceneName: note.sceneName ?? null,
          frame: Number.isFinite(note.frame) ? note.frame : null,
          time: note.time ?? null,
          text,
          status: 'new',
          reply: null,
          at: new Date().toISOString()
        })
        writeFileSync(NOTES, `${JSON.stringify(notes, null, 2)}\n`)
        watchNotes()
        broadcast('notes')
        return json(res, 200, { notes, listening: claudeListening() })
      }
      if (path === '/api/notes/remove' && req.method === 'POST') {
        const { id } = await body(req)
        const notes = readNotes().filter(note => !(note.id === id && note.status === 'new'))
        writeFileSync(NOTES, `${JSON.stringify(notes, null, 2)}\n`)
        broadcast('notes')
        return json(res, 200, { notes })
      }
      if (path === '/api/export' && req.method === 'GET') {
        return json(res, 200, exportState())
      }
      if (path === '/api/export' && req.method === 'POST') {
        const { id, quick, to } = await body(req)
        if (!/^[A-Za-z0-9_-]+$/.test(id)) {
          return json(res, 400, { error: 'No such video' })
        }
        startExport(id, Boolean(quick), to || null)
        return json(res, 202, exportState())
      }
      if (path === '/api/places') {
        const all = places()
        return json(res, 200, Object.fromEntries(Object.entries(all).map(([name, dir]) => [name, { path: dir, exists: name === 'video' || existsSync(dir) }])))
      }
      if (path === '/api/pick-folder' && req.method === 'POST') {
        return json(res, 200, { path: await pickFolder() })
      }
      if (path === '/api/trash' && req.method === 'POST') {
        const { files } = await body(req)
        for (const file of [files].flat()) {
          trash(file)
        }
        broadcast('export')
        return json(res, 200, exportState())
      }
      if (path === '/api/open' && req.method === 'POST') {
        const { file, play } = await body(req)
        openFile(String(file), Boolean(play))
        return json(res, 200, {})
      }
      if (path === '/api/close' && req.method === 'POST') {
        json(res, 200, {})
        setTimeout(() => shutdown(), 200)
        return
      }
      return json(res, 404, { error: 'Not found' })
    }
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(PAGE)
    }
    // The page's bundle, then the studio's public/ files at the root, as staticFile() expects.
    const [base, rest] = path.startsWith('/room/') ? [OUT, path.slice('/room/'.length)] : [join(HERE, 'public'), path.slice(1)]
    const file = join(base, normalize(rest))
    if (file.startsWith(base + sep) && existsSync(file) && statSync(file).isFile()) {
      return sendFile(res, file)
    }
    res.writeHead(404)
    res.end('Not found')
  } catch (error) {
    json(res, 400, { error: error.message })
  }
})

function listen(port) {
  return new Promise((done, fail) => {
    server.once('error', error => (error.code === 'EADDRINUSE' ? done(listen(port + 1)) : fail(error)))
    server.listen(port, '127.0.0.1', () => done(port))
  })
}

const port = await listen(Number(process.env.VIDEO_ROOM_PORT) || 3210)
const address = `http://localhost:${port}/${wanted ? `#${wanted}` : ''}`
console.log(`Edit room: ${address}`)
console.log('Only this computer can open it. It stays open until you close it (Ctrl+C here, or "Close" in the page).')
if (!process.env.VIDEO_ROOM_NO_OPEN) {
  if (process.platform === 'darwin') {
    spawn('open', [address], { stdio: 'ignore', detached: true }).unref()
  } else if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '""', address], { stdio: 'ignore', detached: true, windowsVerbatimArguments: true }).unref()
  } else {
    spawn('xdg-open', [address], { stdio: 'ignore', detached: true }).unref()
  }
}

function shutdown() {
  broadcast('closed')
  for (const client of clients) {
    client.end()
  }
  notesWatch?.close()
  bundle.dispose().finally(() => {
    server.close()
    console.log('Edit room closed.')
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
