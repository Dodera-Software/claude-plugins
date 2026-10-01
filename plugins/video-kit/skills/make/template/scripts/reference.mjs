// Watching a video someone likes, so Claude can see its style instead of guessing from a page's
// words. A link to a page (a gallery entry, a portfolio, a launch page), a link to the video file
// itself, or a file on the computer: frames spread evenly over it come out as pictures, which
// Claude looks at. Runs on the computer with Node (Remotion's own ffmpeg), no Docker.
//
//   node scripts/reference.mjs <link or file> [--frames 16]   → frames in a temporary folder, printed as JSON
//   node scripts/reference.mjs list <page link>               the videos a page (a gallery) links to, as JSON
//   node scripts/reference.mjs clean                          delete every studied reference
//
// Nothing stays on the computer: a downloaded video is deleted as soon as its frames are out, the
// frames live in the system's temporary folder, and anything older than a day goes on every run.
// YouTube, Vimeo, X, TikTok and Instagram don't hand out their video files: for those, only the
// page's preview picture comes out, and the person is asked for a screen recording or screenshots.
import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STORE = join(os.tmpdir(), 'video-kit-references')
const CLI = join(HERE, 'node_modules', '@remotion', 'cli', 'remotion-cli.js')
const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
const MAX_BYTES = 300 * 1024 * 1024
const VIDEO = /\.(mp4|webm|mov|m4v)(\?|#|$)/i
const CLOSED = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|x\.com|twitter\.com|tiktok\.com|instagram\.com|facebook\.com|linkedin\.com)$/i

function fail(message) {
  console.error(message)
  process.exit(1)
}

function tool(name, args) {
  if (!existsSync(CLI)) {
    fail('Run npm install in the video folder first.')
  }
  return spawnSync(process.execPath, [CLI, name, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
}

/** Old studies go, so nothing piles up in the temporary folder. */
function tidy() {
  if (!existsSync(STORE)) {
    return
  }
  for (const name of readdirSync(STORE)) {
    const path = join(STORE, name)
    if (Date.now() - statSync(path).mtimeMs > 24 * 3600 * 1000) {
      rmSync(path, { recursive: true, force: true })
    }
  }
}

async function get(url) {
  const response = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(60_000) })
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`)
  }
  return response
}

function decode(text) {
  return text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function absolute(link, base) {
  try {
    return new URL(decode(link), base).href
  } catch {
    return null
  }
}

function meta(html, names) {
  for (const name of names) {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)`, 'i'))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'))
    if (match) {
      return decode(match[1])
    }
  }
  return null
}

/** Every video file a page mentions, in the order it mentions them. */
function videosIn(html, base) {
  const found = []
  const add = link => {
    const url = link && absolute(link, base)
    if (url && !found.includes(url)) {
      found.push(url)
    }
  }
  add(meta(html, ['og:video:secure_url', 'og:video:url', 'og:video', 'twitter:player:stream']))
  for (const [, link] of html.matchAll(/<(?:video|source)[^>]+src=["']([^"']+)["']/gi)) {
    add(link)
  }
  for (const [link] of html.matchAll(/https?:\/\/[^"'\s<>()\\]+?\.(?:mp4|webm|mov|m4v)(?:\?[^"'\s<>()\\]*)?/gi)) {
    add(link)
  }
  return found.filter(url => VIDEO.test(new URL(url).pathname))
}

function textOf(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n'))
    .split('\n').map(line => line.trim()).filter(line => line.length > 1)
}

async function download(url, to) {
  const response = await get(url)
  const size = Number(response.headers.get('content-length') ?? 0)
  if (size > MAX_BYTES) {
    throw new Error(`The video is ${Math.round(size / 1e6)} MB; over ${MAX_BYTES / 1e6} MB is too big to study.`)
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(to))
}

function durationOf(file) {
  const probe = tool('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file])
  const seconds = Number.parseFloat(probe.stdout)
  if (!Number.isFinite(seconds)) {
    throw new Error(`Couldn't read the video (${probe.stderr.trim().split('\n').at(-1) ?? 'no details'}).`)
  }
  return seconds
}

function framesOf(file, dir, count) {
  const duration = durationOf(file)
  const frames = []
  for (let index = 0; index < count; index++) {
    const at = Math.round(((index + 0.5) * duration / count) * 10) / 10
    const out = join(dir, `frame-${String(index + 1).padStart(2, '0')}-${at.toFixed(1)}s.png`)
    tool('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'scale=640:-2', out])
    if (existsSync(out)) {
      frames.push({ file: out, at })
    }
  }
  return { duration: Math.round(duration * 10) / 10, frames }
}

const args = process.argv.slice(2)
const command = args[0]
tidy()

if (!command) {
  fail('Usage: node scripts/reference.mjs <link or file> [--frames 16] | list <page link> | clean')
} else if (command === 'clean') {
  rmSync(STORE, { recursive: true, force: true })
  console.log('Studied references deleted.')
} else if (command === 'list') {
  const page = args[1] ?? fail('Which page? node scripts/reference.mjs list <page link>')
  const html = await (await get(page)).text()
  const base = new URL(page)
  const under = base.pathname.replace(/\/$/, '')
  // A gallery links each video to its own page under its address: those links, with their card's words.
  const cards = new Map()
  for (const [, href, inner] of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const link = absolute(href, page)
    if (!link) {
      continue
    }
    const url = new URL(link)
    if (url.origin !== base.origin || !url.pathname.startsWith(`${under}/`) || url.pathname === base.pathname) {
      continue
    }
    const words = textOf(inner).join(' ').replace(/\s+/g, ' ').trim()
    if (!cards.has(link) || words.length > cards.get(link).length) {
      cards.set(link, words)
    }
  }
  const entries = cards.size
    ? [...cards].map(([link, words]) => ({ page: link, words: words.slice(0, 280) }))
    : videosIn(html, page).map(video => ({ video }))
  console.log(JSON.stringify(entries.slice(0, 60), null, 2))
} else {
  const source = command
  const count = Math.min(40, Math.max(4, Number(args[args.indexOf('--frames') + 1]) || 16))
  const name = `${Date.now().toString(36)}-${basename(source.split('?')[0], extname(source.split('?')[0])).replace(/[^a-z0-9-]+/gi, '-').slice(0, 40) || 'video'}`
  const dir = join(STORE, name)
  mkdirSync(dir, { recursive: true })
  const result = { source, folder: dir, title: null, description: null, video: null, duration: null, frames: [], preview: null, otherVideos: [], note: null }
  let file = null
  let downloaded = false
  try {
    if (existsSync(source)) {
      file = resolve(source)
    } else if (/^https?:\/\//i.test(source)) {
      const url = new URL(source)
      let video = VIDEO.test(url.pathname) ? source : null
      if (!video) {
        const html = await (await get(source)).text()
        result.title = meta(html, ['og:title', 'twitter:title']) ?? html.match(/<title>([^<]*)/i)?.[1]?.trim() ?? null
        result.description = meta(html, ['og:description', 'description', 'twitter:description'])
        const all = videosIn(html, source)
        // The page's own video: the one its address names, else the first it mentions.
        const slug = url.pathname.split('/').filter(Boolean).at(-1) ?? ''
        video = all.find(link => slug && link.includes(slug)) ?? all[0] ?? null
        result.otherVideos = all.filter(link => link !== video).slice(0, 12)
        const image = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image'])
        if (image && absolute(image, source)) {
          try {
            const to = join(dir, `preview${extname(new URL(absolute(image, source)).pathname) || '.jpg'}`)
            await download(absolute(image, source), to)
            result.preview = to
          } catch {}
        }
        if (!video) {
          result.note = CLOSED.test(url.hostname)
            ? `${url.hostname} doesn't let the video be downloaded. Only its preview picture is here; ask the person for a short screen recording or a few screenshots of the parts they like.`
            : 'No video file on this page. Only its preview picture is here, if it has one; ask the person for a screen recording or screenshots.'
        }
      }
      if (video) {
        result.video = video
        file = join(dir, `video${extname(new URL(video).pathname) || '.mp4'}`)
        await download(video, file)
        downloaded = true
      }
    } else {
      fail(`Not a link or a file: ${source}`)
    }
    if (file) {
      Object.assign(result, framesOf(file, dir, count))
    }
  } catch (error) {
    result.note = `Couldn't study it: ${error.message}`
  } finally {
    if (downloaded && file) {
      rmSync(file, { force: true })
    }
  }
  writeFileSync(join(dir, 'study.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
