// The Chrome Headless Shell Remotion installs in the render image, shared by capture.mjs and site.mjs.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function find(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      const found = find(path)
      if (found) {
        return found
      }
    } else if (entry === 'headless_shell' || entry === 'chrome-headless-shell') {
      return path
    }
  }
  return null
}

export function findChrome() {
  const path = find('node_modules/.remotion')
  if (!path) {
    throw new Error('No Chrome found in node_modules/.remotion; rebuild the render image.')
  }
  return path
}
