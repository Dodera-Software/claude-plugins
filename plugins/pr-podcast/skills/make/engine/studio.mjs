// Records an episode: two (or more) hosts reading a script, with a longer pause between chapters,
// evened-out loudness and natural pauses, into one MP3. Runs from the engine folder record.mjs
// installs, never directly. Prints one line of JSON on stdout at the end: file, duration, chapters.
//
// The script (episode.json):
//   {
//     "title": "Billing moves to the new payments client",
//     "hosts": [{ "id": "maya", "name": "Maya", "voice": "af_heart" },
//               { "id": "leo",  "name": "Leo",  "voice": "am_michael" }],
//     "speed": 1,                                   optional, 0.8 to 1.3
//     "lines": [{ "chapter": "The short version" },
//               { "host": "maya", "text": "Spoken words only." },
//               { "pause": 0.6 },                   a beat, in seconds (comic timing)
//               { "host": "leo", "text": "Wait, what?!", "speed": 1.12 }, …]
//   }
// A line's own "speed" (0.8 to 1.3) overrides the episode's: faster for excitement, slower for
// the point that has to land.
//
// onnxruntime aborts when a process is ended with process.exit() while the model is loaded, so
// everything that can fail is checked before loading it, and after that the script runs to its end.
import fs from "node:fs";
import path from "node:path";
import { env } from "@huggingface/transformers";
import { Mp3Encoder } from "@breezystack/lamejs";
import { KokoroTTS, TextSplitterStream } from "kokoro-js";

const RATE = 24000;
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICES = Object.keys(new KokoroTTS().voices);
const GAP = { sentence: 0.2, turn: 0.42, chapter: 1.1 };
const TARGET_RMS = 0.1; // about -20 dBFS, the same for every voice
const PEAK = 0.97;

if (process.env.PR_PODCAST_MODELS) env.cacheDir = process.env.PR_PODCAST_MODELS;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const loadVoices = async () => {
  try {
    return await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "cpu" });
  } catch (error) {
    // Nothing is loaded yet, so exiting is safe here.
    fail(`Loading the voices failed: ${error.message}\nThe first run downloads them (about 90 MB); is there an internet connection?`);
  }
};

// Kokoro reads at most ~500 sounds at once: split into sentences, and long sentences at commas.
const sentences = (text) => {
  const splitter = new TextSplitterStream();
  splitter.push(text.replace(/\s+/g, " ").trim());
  const out = [];
  for (const sentence of splitter) {
    if (sentence.length <= 300) {
      out.push(sentence);
      continue;
    }
    let part = "";
    for (const piece of sentence.split(/(?<=[,;:—])\s+/)) {
      if (part && part.length + piece.length > 300) {
        out.push(part);
        part = piece;
      } else part = part ? `${part} ${piece}` : piece;
    }
    if (part) out.push(part);
  }
  return out;
};

// Kokoro's own silence around a sentence varies; cut it so the pauses below set the pace.
const trim = (audio) => {
  const threshold = 0.008;
  const pad = Math.round(0.03 * RATE);
  let start = 0;
  let end = audio.length - 1;
  while (start < end && Math.abs(audio[start]) < threshold) start++;
  while (end > start && Math.abs(audio[end]) < threshold) end--;
  return audio.subarray(Math.max(0, start - pad), Math.min(audio.length, end + pad));
};

const silence = (seconds) => new Float32Array(Math.round(seconds * RATE));

// The gain that brings a turn to the target loudness without clipping its loudest moment.
const gainFor = (parts) => {
  let sum = 0;
  let count = 0;
  let peak = 0;
  for (const part of parts) {
    for (const x of part) {
      const a = Math.abs(x);
      if (a > peak) peak = a;
      if (a > 0.01) {
        sum += x * x;
        count++;
      }
    }
  }
  const rms = count ? Math.sqrt(sum / count) : 0;
  return rms && peak ? Math.min(TARGET_RMS / rms, PEAK / peak) : 1;
};

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// MP3, mono, 64 kbps: about half a megabyte a minute, fine for Slack and phones.
const mp3 = (track) => {
  const encoder = new Mp3Encoder(1, RATE, 64);
  const chunks = [];
  const block = new Int16Array(1152);
  for (const part of track) {
    for (let i = 0; i < part.length; i += 1152) {
      const n = Math.min(1152, part.length - i);
      for (let j = 0; j < n; j++) block[j] = Math.max(-1, Math.min(1, part[i + j])) * 32767;
      const data = encoder.encodeBuffer(block.subarray(0, n));
      if (data.length) chunks.push(Buffer.from(data));
    }
  }
  chunks.push(Buffer.from(encoder.flush()));
  return Buffer.concat(chunks);
};

const clampSpeed = (value, fallback) => Math.min(1.3, Math.max(0.8, Number(value) || fallback));

const readEpisode = (scriptPath) => {
  let episode;
  try {
    episode = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
  } catch (error) {
    fail(`Can't read the script ${scriptPath}: ${error.message}`);
  }
  const hosts = new Map((episode.hosts ?? []).map((host) => [host.id, host]));
  const lines = episode.lines ?? [];
  const problems = [];
  if (hosts.size === 0) problems.push('no "hosts"');
  for (const host of hosts.values()) {
    if (!VOICES.includes(host.voice)) problems.push(`unknown voice "${host.voice}" for ${host.name} (voices: ${VOICES.join(", ")})`);
  }
  lines.forEach((line, i) => {
    if (line.chapter !== undefined) return;
    if (line.pause !== undefined) {
      if (!(Number(line.pause) > 0 && Number(line.pause) <= 3)) problems.push(`line ${i + 1}: a pause is 0.1 to 3 seconds`);
      return;
    }
    if (!hosts.has(line.host)) problems.push(`line ${i + 1}: unknown host "${line.host}"`);
    if (!line.text?.trim()) problems.push(`line ${i + 1}: no text`);
    else if (/[`*_#<>{}[\]|\\]/.test(line.text)) problems.push(`line ${i + 1}: has code or markup characters; write it as it should be said`);
  });
  if (!lines.some((line) => line.text)) problems.push("no spoken lines");
  if (problems.length) fail(`The script needs fixing:\n  ${problems.join("\n  ")}`);
  return { hosts, lines, speed: clampSpeed(episode.speed, 1) };
};

const record = async ([scriptPath, outPath, ...rest]) => {
  if (!scriptPath || !outPath) fail("Usage: record.mjs <episode.json> <out.mp3> [--first N]");
  const firstAt = rest.indexOf("--first");
  const first = firstAt > -1 ? Number(rest[firstAt + 1]) || Infinity : Infinity;
  const { hosts, lines, speed } = readEpisode(scriptPath);
  const out = path.resolve(outPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const model = await loadVoices();
  const track = [];
  let seconds = 0;
  const add = (audio) => {
    track.push(audio);
    seconds += audio.length / RATE;
  };

  const total = Math.min(lines.filter((line) => line.text).length, first);
  const chapters = [];
  let said = 0;
  let previous = null;

  add(silence(0.3));
  for (const line of lines) {
    if (said >= first) break;
    if (line.chapter !== undefined) {
      if (said > 0) add(silence(GAP.chapter));
      chapters.push({ title: line.chapter, start: Math.round(seconds * 10) / 10 });
      previous = null;
      continue;
    }
    if (line.pause !== undefined) {
      // The beat replaces the usual gap before the next line.
      add(silence(Number(line.pause)));
      previous = null;
      continue;
    }
    said++;
    process.stderr.write(`\rRecording line ${said} of ${total}…   `);
    const voice = hosts.get(line.host).voice;
    const parts = [];
    for (const sentence of sentences(line.text)) {
      const { audio } = await model.generate(sentence, { voice, speed: line.speed === undefined ? speed : clampSpeed(line.speed, speed) });
      if (parts.length) parts.push(silence(GAP.sentence));
      parts.push(trim(audio));
    }
    const gain = gainFor(parts);
    for (const part of parts) for (let i = 0; i < part.length; i++) part[i] *= gain;
    if (previous) add(silence(previous === line.host ? GAP.sentence : GAP.turn));
    parts.forEach(add);
    previous = line.host;
  }
  add(silence(0.6));
  process.stderr.write("\n");

  fs.writeFileSync(out, mp3(track));
  console.log(
    JSON.stringify({
      file: out,
      duration: clock(seconds),
      seconds: Math.round(seconds),
      chapters: chapters.map((chapter) => ({ ...chapter, at: clock(chapter.start) })),
    }),
  );
};

const args = process.argv.slice(2);
if (args[0] === "--setup") {
  await loadVoices();
  console.log("ready");
} else {
  await record(args);
}
