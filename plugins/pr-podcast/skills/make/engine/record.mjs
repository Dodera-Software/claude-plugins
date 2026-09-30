#!/usr/bin/env node
// Every recording goes through this. It installs the voice engine once into a cache outside the
// project (~/.cache/pr-podcast, keyed by package.json so an update reinstalls it), keeps the voice
// model there too, and runs studio.mjs from that folder.
//
//   node record.mjs --setup                          install and download the voices, print "ready"
//   node record.mjs <episode.json> <out.mp3> [--first N]
//
// Only Node is needed: no Python, no ffmpeg, no Docker. Same on macOS, Windows and Linux.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 11)) fail(`Node.js 20 or newer is needed (this is ${process.versions.node}).`);

const here = path.dirname(fileURLToPath(import.meta.url));
const home = process.env.PR_PODCAST_HOME || path.join(os.homedir(), ".cache", "pr-podcast");
const manifest = fs.readFileSync(path.join(here, "package.json"), "utf8").replace(/\r\n/g, "\n");
const dir = path.join(home, `engine-${createHash("sha256").update(manifest).digest("hex").slice(0, 10)}`);
const ready = path.join(dir, ".ready");

if (!fs.existsSync(ready)) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const file of ["package.json", "package-lock.json"]) {
    fs.copyFileSync(path.join(here, file), path.join(dir, file));
  }
  console.error("Installing the voice engine (only the first time, about a minute)…");
  const npm = spawnSync("npm", ["ci", "--no-audit", "--no-fund", "--loglevel=error"], {
    cwd: dir,
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (npm.status !== 0) fail("Installing the voice engine failed (see above). Is there an internet connection?");
  fs.writeFileSync(ready, new Date().toISOString());
  // Older engines are ours and unused now; nothing on the way out may fail.
  for (const old of fs.readdirSync(home)) {
    if (old.startsWith("engine-") && path.join(home, old) !== dir) {
      try {
        fs.rmSync(path.join(home, old), { recursive: true, force: true });
      } catch {}
    }
  }
}

fs.copyFileSync(path.join(here, "studio.mjs"), path.join(dir, "studio.mjs"));
const run = spawnSync(process.execPath, [path.join(dir, "studio.mjs"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, PR_PODCAST_MODELS: path.join(home, "models") },
});
process.exit(run.status ?? 1);
