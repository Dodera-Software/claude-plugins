// Reads a product's look and words from its public website, for videos made without its code.
// Runs inside the render image (render.sh site <url> <folder> [page …]). dembrandt does the reading
// (colours, type, radii, shadows, logo, the page's own copy by role); the screenshots are taken in a
// fresh page afterwards, since dembrandt scrolls and hovers while it reads, with cookie notices
// hidden by Ghostery's blocker and the EasyList Cookie list.
//
// Usage: node scripts/site.mjs <url> <output dir> [page path …]
// Writes to the output dir:
//   brand.json    dembrandt's result for the home page: colors, typography, logo, voice (headline,
//                 value props, calls to action), borderRadius, shadows
//   logo.svg      the logo, when the site has one as SVG (else logo.png / .jpg / .webp)
//   <page>.png    a screenshot of each page at 1440×900, 2× ("home" for the address itself)
//   <page>.txt    all the text the page shows, in reading order: the complete wording, where the
//                 voice roles above are a best guess and can miss a headline that animates in
//   pages.json    the copy of every extra page, by role
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright'
import { extractBranding } from 'dembrandt/extractors'
import { chromium } from 'playwright-core'
import { findChrome } from './chrome.mjs'

const [address, outDir, ...pages] = process.argv.slice(2)
const COOKIE_NOTICES = 'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt'
const quiet = { start: () => quiet, stop: () => quiet, succeed: () => quiet, fail: () => quiet, warn: () => quiet, info: () => quiet }

function pageName(path) {
  return path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home'
}

async function saveLogo(logo) {
  if (logo?.markup?.startsWith('<svg')) {
    writeFileSync(join(outDir, 'logo.svg'), logo.markup)
    return 'logo.svg'
  }
  if (!logo?.url || logo.url.startsWith('data:')) {
    return null
  }
  const response = await fetch(new URL(logo.url, address))
  if (!response.ok) {
    return null
  }
  const type = response.headers.get('content-type') ?? ''
  const extension = type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  writeFileSync(join(outDir, `logo.${extension}`), Buffer.from(await response.arrayBuffer()))
  return `logo.${extension}`
}

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'] })
try {
  const read = url => extractBranding(url, quiet, browser, { voice: true, reveal: true, verbose: false, navigationTimeout: 60000 })
  const blocker = await PlaywrightBlocker.fromLists(fetch, [COOKIE_NOTICES]).catch(() => null)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })

  async function shoot(url, name) {
    const page = await context.newPage()
    await blocker?.enableBlockingInPage(page)
    await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    // Quiet network, then time for entrance animations to finish.
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1500)
    await page.screenshot({ path: join(outDir, `${name}.png`) })
    writeFileSync(join(outDir, `${name}.txt`), await page.evaluate(() => document.body.innerText))
    await page.close()
    console.log(`  ${join(outDir, `${name}.png`)}, ${name}.txt`)
  }

  const home = await read(address)
  writeFileSync(join(outDir, 'brand.json'), JSON.stringify(home, null, 2))
  console.log(`  ${join(outDir, 'brand.json')}`)
  const logo = await saveLogo(home.logo).catch(() => null)
  console.log(logo ? `  ${join(outDir, logo)}` : '  (no logo found on the page; use the favicon or ask for one)')
  await shoot(address, 'home')

  const copy = {}
  for (const path of pages) {
    const name = pageName(path)
    const url = new URL(path, address).href
    const result = await read(url)
    copy[name] = { url: result.url, voice: result.voice ?? null }
    await shoot(url, name)
  }
  if (pages.length) {
    writeFileSync(join(outDir, 'pages.json'), JSON.stringify(copy, null, 2))
  }
} finally {
  await browser.close()
}
