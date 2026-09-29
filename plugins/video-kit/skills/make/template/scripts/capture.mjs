// Captures real screens from the product running on this machine, for videos that show the actual
// app instead of a rebuilt one. Runs inside the render image (render.sh capture <video>), driving
// the Chrome Remotion already installed there; the app is reached at host.docker.internal.
//
// Usage: node scripts/capture.mjs <plan.json> <output dir>
//
// The plan (src/videos/<slug>/capture.json):
// {
//   "baseUrl": "http://host.docker.internal:3000",
//   "viewport": { "width": 1440, "height": 900 },
//   "login": [ { "goto": "/login" }, { "fill": "input[type=email]", "value": "$VIDEO_LOGIN_EMAIL" }, … ],
//   "steps": [ { "goto": "/board" }, { "waitFor": "::-p-text(To do)" }, { "shot": "board" },
//              { "click": "button.new-card" }, { "type": "textarea", "value": "Invoice export" },
//              { "wait": 400 }, { "shot": "board-new-card" } ]
// }
// Steps: goto, click, fill (replace a field's value), type (key by key), press (a key), hover,
// scroll (pixels down), wait (ms), waitFor (a selector; ::-p-text(…) matches visible text), shot (id).
// A value starting with $ is read from the environment, so passwords never live in a file.
import { readdirSync, readFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const [planPath, outDir] = process.argv.slice(2)
const plan = JSON.parse(readFileSync(planPath, 'utf8'))
const TIMEOUT = 20000

function findChrome(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      const found = findChrome(path)
      if (found) {
        return found
      }
    } else if (entry === 'headless_shell' || entry === 'chrome-headless-shell') {
      return path
    }
  }
  return null
}

function value(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('$')) {
    return raw
  }
  const name = raw.slice(1)
  if (!process.env[name]) {
    throw new Error(`The plan reads $${name}, but it isn't set. Pass it to render.sh: ${name}=… ./render.sh capture …`)
  }
  return process.env[name]
}

async function run(page, step) {
  const url = step.goto && new URL(step.goto, plan.baseUrl).href
  if (url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT })
  } else if (step.click) {
    await page.locator(step.click).setTimeout(TIMEOUT).click()
  } else if (step.fill) {
    await page.locator(step.fill).setTimeout(TIMEOUT).fill(value(step.value))
  } else if (step.type) {
    await page.locator(step.type).setTimeout(TIMEOUT).click()
    await page.keyboard.type(value(step.value), { delay: 30 })
  } else if (step.press) {
    await page.keyboard.press(step.press)
  } else if (step.hover) {
    await page.locator(step.hover).setTimeout(TIMEOUT).hover()
  } else if (step.scroll) {
    await page.evaluate(y => window.scrollBy(0, y), step.scroll)
  } else if (step.wait) {
    await new Promise(resolve => setTimeout(resolve, step.wait))
  } else if (step.waitFor) {
    await page.waitForSelector(step.waitFor, { timeout: TIMEOUT })
  } else if (step.shot) {
    // Let fonts, images and any settling animation finish before the shutter.
    await page.evaluate(() => document.fonts.ready)
    await new Promise(resolve => setTimeout(resolve, 300))
    const file = join(outDir, `${step.shot}.png`)
    await page.screenshot({ path: file })
    console.log(`  ${file}`)
  } else {
    throw new Error(`Unknown step: ${JSON.stringify(step)}`)
  }
}

const executablePath = findChrome('node_modules/.remotion')
if (!executablePath) {
  throw new Error('No Chrome found in node_modules/.remotion; rebuild the render image.')
}
mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath,
  headless: 'shell',
  acceptInsecureCerts: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: plan.viewport?.width ?? 1440, height: plan.viewport?.height ?? 900, deviceScaleFactor: 2 }
})
try {
  const page = await browser.newPage()
  for (const step of [...(plan.login ?? []), ...plan.steps]) {
    try {
      await run(page, step)
    } catch (error) {
      await page.screenshot({ path: join(outDir, '_failed.png') }).catch(() => {})
      throw new Error(`Step ${JSON.stringify(step)} failed: ${error.message}. The page at that moment: ${join(outDir, '_failed.png')}`)
    }
  }
} finally {
  await browser.close()
}
