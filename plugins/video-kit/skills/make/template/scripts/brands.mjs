// Brands remembered on this computer, so the next video for the same company starts on-brand:
// its brand folder (colours, fonts, logo), the image and font files it uses from public/, and what
// was chosen for it (the look, the narrator's voice and pace, notes on its tone). Claude runs this
// from the plugin, with or without a video folder yet.
//
//   node brands.mjs list                                   saved brands, as JSON
//   node brands.mjs save <video folder> <brand slug> '<json: name, domain, look, voice, speed, tone>'
//   node brands.mjs use <brand slug> <video folder>        copies the brand into that video folder, prints its JSON
//   node brands.mjs forget <brand slug>
//
// Kept in ~/.video-kit/brands/<slug>/, only on this computer, until "forget". Nothing is uploaded.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'

const HOME = process.env.VIDEO_KIT_BRANDS || join(os.homedir(), '.video-kit', 'brands')

function fail(message) {
  console.error(message)
  process.exit(1)
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

function slugOk(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? '')) {
    fail(`Not a brand name: "${slug}" (lowercase letters, digits and hyphens, like the folder in src/brands/).`)
  }
  return slug
}

/** Files under public/ the brand's code points to: its logo, images and fonts. */
function assetsOf(studio, files) {
  const found = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const [, path] of text.matchAll(/['"`]([^'"`\s]+\.(?:svg|png|jpe?g|webp|gif|woff2?|ttf|otf))['"`]/gi)) {
      const clean = path.replace(/^\/+/, '').replace(/^public\//, '')
      if (existsSync(join(studio, 'public', clean))) {
        found.add(clean)
      }
    }
  }
  return [...found]
}

const [command, ...args] = process.argv.slice(2)

if (command === 'list') {
  const brands = existsSync(HOME)
    ? readdirSync(HOME).flatMap(slug => {
      try {
        return [{ slug, ...JSON.parse(readFileSync(join(HOME, slug, 'brand.json'), 'utf8')) }]
      } catch {
        return []
      }
    })
    : []
  console.log(JSON.stringify(brands, null, 2))
} else if (command === 'save') {
  const [studioArg, slugArg, details = '{}'] = args
  const studio = resolve(studioArg ?? '')
  const slug = slugOk(slugArg)
  const brandDir = join(studio, 'src', 'brands', slug)
  if (!existsSync(brandDir)) {
    fail(`No brand at ${brandDir}`)
  }
  let info
  try {
    info = JSON.parse(details)
  } catch {
    fail('The details must be JSON: {"name": …, "domain": …, "look": …, "voice": …, "speed": …, "tone": …}')
  }
  const target = join(HOME, slug)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  const files = walk(brandDir)
  cpSync(brandDir, join(target, 'files', 'src', 'brands', slug), { recursive: true })
  const assets = assetsOf(studio, files)
  for (const asset of assets) {
    const to = join(target, 'files', 'public', ...asset.split('/'))
    mkdirSync(dirname(to), { recursive: true })
    cpSync(join(studio, 'public', asset), to)
  }
  writeFileSync(join(target, 'brand.json'), `${JSON.stringify({ ...info, assets, savedAt: new Date().toISOString() }, null, 2)}\n`)
  console.log(`Saved the ${info.name ?? slug} brand (${files.length + assets.length} files) in ${target}`)
} else if (command === 'use') {
  const [slugArg, studioArg] = args
  const slug = slugOk(slugArg)
  const source = join(HOME, slug)
  if (!existsSync(join(source, 'brand.json'))) {
    fail(`No saved brand "${slug}". Saved: ${existsSync(HOME) ? readdirSync(HOME).join(', ') || 'none' : 'none'}`)
  }
  const studio = resolve(studioArg ?? '')
  if (!existsSync(join(studio, 'src'))) {
    fail(`No video folder at ${studio} (it needs src/).`)
  }
  const files = walk(join(source, 'files'))
  for (const file of files) {
    const to = join(studio, relative(join(source, 'files'), file))
    mkdirSync(dirname(to), { recursive: true })
    cpSync(file, to)
  }
  console.log(readFileSync(join(source, 'brand.json'), 'utf8').trim())
  console.error(`Copied the brand into ${studio} (${files.length} files): src/brands/${slug}/${files.some(file => file.includes(`${sep}public${sep}`)) ? ' and its files in public/' : ''}`)
} else if (command === 'forget') {
  const slug = slugOk(args[0])
  rmSync(join(HOME, slug), { recursive: true, force: true })
  console.log(`Forgot the ${slug} brand.`)
} else {
  fail('Usage: node brands.mjs list | save <video folder> <slug> <json> | use <slug> <video folder> | forget <slug>')
}
