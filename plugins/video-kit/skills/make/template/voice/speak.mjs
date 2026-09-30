// Records a video's voiceover: one file per line, each at the same loudness, and a manifest with
// every line's length, so the video can be timed to the voice. Runs from the engine folder
// scripts/voice.mjs installs, never directly.
//
//   speak.mjs <voice.json> <out dir> <public path>   → <out dir>/<id>.wav …, <out dir>/voice.json
//   speak.mjs --sample "<text>" <out dir> <voice> …  → <out dir>/<voice>.wav, to choose a voice by ear
//   speak.mjs --setup                                download the voices once, print "ready"
//
// The script (src/videos/<slug>/voice.json):
//   {
//     "voice": "af_heart",                          one of the voices below
//     "speed": 1,                                   optional, 0.8 to 1.3
//     "lines": [{ "id": "hook", "text": "Spoken words only." },
//               { "id": "logo", "text": "Meet steelit.", "say": "Meet steel it." }, …]
//   }
// A line's "say" is how to pronounce it when the written words would be read wrong (a product name);
// its own "voice" or "speed" override the script's.
//
// onnxruntime aborts when a process is ended with process.exit() while the model is loaded, so
// everything that can fail is checked before loading it, and after that the script runs to its end.
import fs from 'node:fs'
import path from 'node:path'
import { env } from '@huggingface/transformers'
import { KokoroTTS, TextSplitterStream } from 'kokoro-js'

const RATE = 24000
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
const VOICES = Object.keys(new KokoroTTS().voices)
const SENTENCE_GAP = 0.22
const TARGET_RMS = 0.1 // about -20 dBFS, the same for every line
const PEAK = 0.97

if (process.env.VIDEO_KIT_MODELS) {
  env.cacheDir = process.env.VIDEO_KIT_MODELS
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

async function loadVoices() {
  try {
    return await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' })
  } catch (error) {
    // Nothing is loaded yet, so exiting is safe here.
    fail(`Loading the voices failed: ${error.message}\nThe first run downloads them (about 90 MB); is there an internet connection?`)
  }
}

// Kokoro reads at most ~500 sounds at once: split into sentences, and long ones at commas.
function sentences(text) {
  const splitter = new TextSplitterStream()
  splitter.push(text.replace(/\s+/g, ' ').trim())
  const out = []
  for (const sentence of splitter) {
    if (sentence.length <= 300) {
      out.push(sentence)
      continue
    }
    let part = ''
    for (const piece of sentence.split(/(?<=[,;:—])\s+/)) {
      if (part && part.length + piece.length > 300) {
        out.push(part)
        part = piece
      } else {
        part = part ? `${part} ${piece}` : piece
      }
    }
    if (part) {
      out.push(part)
    }
  }
  return out
}

// Kokoro's own silence around a sentence varies; cut it, so the video sets the pauses.
function trim(audio) {
  const threshold = 0.008
  const pad = Math.round(0.03 * RATE)
  let start = 0
  let end = audio.length - 1
  while (start < end && Math.abs(audio[start]) < threshold) start++
  while (end > start && Math.abs(audio[end]) < threshold) end--
  return audio.subarray(Math.max(0, start - pad), Math.min(audio.length, end + pad))
}

// The gain that brings a line to the target loudness without clipping its loudest moment.
function gainFor(samples) {
  let sum = 0
  let count = 0
  let peak = 0
  for (const x of samples) {
    const a = Math.abs(x)
    if (a > peak) peak = a
    if (a > 0.01) {
      sum += x * x
      count++
    }
  }
  const rms = count ? Math.sqrt(sum / count) : 0
  return rms && peak ? Math.min(TARGET_RMS / rms, PEAK / peak) : 1
}

/** 16-bit mono WAV: what the video's audio track reads without converting. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((x, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const clampSpeed = (value, fallback) => Math.min(1.3, Math.max(0.8, Number(value) || fallback))

/** A line as one stretch of audio: its sentences with short breaths between, at even loudness. */
async function speak(model, text, voice, speed) {
  const parts = []
  for (const sentence of sentences(text)) {
    const { audio } = await model.generate(sentence, { voice, speed })
    if (parts.length) {
      parts.push(new Float32Array(Math.round(SENTENCE_GAP * RATE)))
    }
    parts.push(trim(audio))
  }
  const samples = new Float32Array(parts.reduce((n, part) => n + part.length, 0))
  let at = 0
  for (const part of parts) {
    samples.set(part, at)
    at += part.length
  }
  const gain = gainFor(samples)
  for (let i = 0; i < samples.length; i++) samples[i] *= gain
  return samples
}

function readScript(scriptPath) {
  let script
  try {
    script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'))
  } catch (error) {
    fail(`Can't read the voice script ${scriptPath}: ${error.message}`)
  }
  const lines = script.lines ?? []
  const problems = []
  const ids = new Set()
  if (!VOICES.includes(script.voice)) {
    problems.push(`unknown voice "${script.voice}" (voices: ${VOICES.join(', ')})`)
  }
  lines.forEach((line, i) => {
    if (!line.id || ids.has(line.id)) {
      problems.push(`line ${i + 1}: needs its own "id"`)
    }
    ids.add(line.id)
    if (line.voice && !VOICES.includes(line.voice)) {
      problems.push(`line ${line.id}: unknown voice "${line.voice}"`)
    }
    const words = line.say ?? line.text
    if (!words?.trim()) {
      problems.push(`line ${line.id}: no text`)
    } else if (/[`*_#<>{}[\]|\\]/.test(words)) {
      problems.push(`line ${line.id}: has code or markup characters; write it as it should be said`)
    }
  })
  if (!lines.length) {
    problems.push('no lines')
  }
  if (problems.length) {
    fail(`The voice script needs fixing:\n  ${problems.join('\n  ')}`)
  }
  return { voice: script.voice, speed: clampSpeed(script.speed, 1), lines }
}

async function record([scriptPath, outDir, publicPath]) {
  if (!scriptPath || !outDir || !publicPath) {
    fail('Usage: speak.mjs <voice.json> <out dir> <public path>')
  }
  const { voice, speed, lines } = readScript(scriptPath)
  fs.mkdirSync(outDir, { recursive: true })
  const model = await loadVoices()
  const manifest = { voice, lines: {} }
  for (const [i, line] of lines.entries()) {
    process.stderr.write(`\rRecording line ${i + 1} of ${lines.length}…   `)
    const samples = await speak(model, line.say ?? line.text, line.voice ?? voice, line.speed === undefined ? speed : clampSpeed(line.speed, speed))
    fs.writeFileSync(path.join(outDir, `${line.id}.wav`), wav(samples))
    manifest.lines[line.id] = { src: `${publicPath}/${line.id}.wav`, duration: Number((samples.length / RATE).toFixed(3)), text: line.text }
  }
  process.stderr.write('\n')
  fs.writeFileSync(path.join(outDir, 'voice.json'), JSON.stringify(manifest, null, 2) + '\n')
  const total = Object.values(manifest.lines).reduce((s, l) => s + l.duration, 0)
  console.log(JSON.stringify({ lines: lines.length, seconds: Number(total.toFixed(1)), manifest: path.join(outDir, 'voice.json') }))
}

async function sample([text, outDir, ...voices]) {
  if (!text || !outDir || !voices.length) {
    fail('Usage: speak.mjs --sample "<text>" <out dir> <voice> [voice …]')
  }
  const unknown = voices.filter(voice => !VOICES.includes(voice))
  if (unknown.length) {
    fail(`Unknown voice ${unknown.join(', ')} (voices: ${VOICES.join(', ')})`)
  }
  fs.mkdirSync(outDir, { recursive: true })
  const model = await loadVoices()
  for (const voice of voices) {
    fs.writeFileSync(path.join(outDir, `${voice}.wav`), wav(await speak(model, text, voice, 1)))
    console.log(path.join(outDir, `${voice}.wav`))
  }
}

const args = process.argv.slice(2)
if (args[0] === '--setup') {
  await loadVoices()
  console.log('ready')
} else if (args[0] === '--sample') {
  await sample(args.slice(1))
} else {
  await record(args)
}
