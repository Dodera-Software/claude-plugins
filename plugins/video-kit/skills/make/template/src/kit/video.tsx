import { linearTiming, TransitionSeries } from '@remotion/transitions'
import type { ComponentType } from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { BrandProvider, type Brand } from './brand'
import { Backdrop } from './components/Backdrop'
import { FORMATS } from './layout'
import { LookProvider, lookColors, type LookName } from './look'
import { easeInOut, FPS } from './motion'
import { Cover, type CoverProps } from './scenes/Cover'
import { crossfade, cut, dip, flood, push, wipe, zoom, type SceneTransition } from './transitions'
import tweaks from '../tweaks.json'

export { FORMATS }

export interface Scene {
  /** What the storyboard calls it ("The problem", "Logo reveal"): the edit room lists scenes by it. */
  name?: string
  component: ComponentType
  /** Frames at 60 fps. Every line must get readingFrames() of full visibility inside it. */
  frames: number
  /** How this scene grows out of the previous one. Defaults to a short crossfade. */
  enter?: SceneTransition
  /**
   * The voiceover line this scene carries (an id in the video's `voiceover`), or `{ line, at }` to
   * start it `at` frames into the scene, or several of those for a long scene (a fly-through with a
   * line per stop). By default a line starts as the scene has arrived, and each next one after the
   * one before and a breath. The scene lasts at least until its last line has been said, plus a
   * breath.
   */
  voice?: VoiceCue | VoiceCue[]
}

/** A recorded voiceover: public/voice/<folder>/voice.json, from `render.sh voice <folder>`. */
export interface VoiceTrack {
  voice: string
  lines: Record<string, { src: string, duration: number, text: string }>
}

/** A line, or a line starting `at` frames into its scene. */
export type VoiceCue = string | { line: string, at?: number }

/** A breath after a line before the scene may move on, in frames. */
const AFTER_LINE = 24

interface VideoSpec {
  id: string
  /** Its name for people, in the edit room ("What's new in March"). Without it, made from the id. */
  name?: string
  brand: Brand
  format?: keyof typeof FORMATS
  scenes: Scene[]
  /**
   * The video's feel over the same brand: editorial (default), bold, technical or playful. It sets
   * colours, type, motion and what sits behind the scenes (src/kit/look.tsx).
   */
  look?: LookName
  /**
   * The composed opening frame that apps use as the video's preview: logo, name and `title`,
   * shown on its own for `frames` (default 45, ¾ s) before the first scene bursts out of it. Only
   * turn it off (`false`) when the first scene is already fully composed at its frame 0.
   */
  cover?: (CoverProps & { frames?: number }) | false
  /**
   * The narration (`render.sh voice <folder>`, then import its voice.json): scenes say which line
   * they carry with `voice`. Without it the video is silent.
   */
  voiceover?: VoiceTrack
}

export interface VideoDefinition {
  id: string
  component: ComponentType
  durationInFrames: number
  fps: number
  width: number
  height: number
  /** Where each scene starts and how long its entrance overlaps the previous one: for checking frames. */
  timeline: {
    starts: number[]
    frames: number[]
    enters: number[]
    cover: boolean
    voice: ({ line: string, text: string, from: number, to: number } | null)[]
    /** Each scene's name, for the edit room ("Cover", then the scenes' own or "Scene 2"). */
    names: string[]
    /** The shortest each scene can be made in the edit room, in frames (the cover can't be changed). */
    floors: number[]
    /** Each shown scene's number as written in code (from 1; null for the cover). */
    numbers: (number | null)[]
    /** Every scene of the video, shown or hidden, with the transition chosen for it in the edit room. */
    catalog: { number: number, name: string, hidden: boolean, transition: TransitionName | null }[]
    /** The id it was defined with, before languages and shapes were added: the key for tweaks. */
    baseId: string
    /** Its name for people: `name`, else made from the id ("LaunchFilm" → "Launch film"). */
    title: string
  }
}

/**
 * Lengths changed in the edit room, by video id (as defined, before language and shape suffixes)
 * and scene number (from 1, the cover not counted): frames added (or taken away). src/tweaks.json.
 */
/** The transitions the edit room offers by name, none of which depends on what's in the previous scene. */
export const NAMED_TRANSITIONS = {
  fade: () => crossfade(),
  'fade-through': () => dip(),
  'zoom-in': () => zoom('in'),
  'zoom-out': () => zoom('out'),
  slide: () => push('from-right'),
  wipe: () => wipe('from-left'),
  cut: () => cut()
}
export type TransitionName = keyof typeof NAMED_TRANSITIONS

/**
 * What the edit room changed for a video: scene lengths (frames added or taken away, by scene
 * number from 1), the order of the scenes (numbers, a number twice for a duplicate), the scenes
 * hidden, and a transition chosen by name for a scene. An older file holds only the lengths.
 */
export interface Arrangement {
  lengths: Record<string, number>
  order?: number[]
  hidden?: number[]
  enter?: Record<string, TransitionName>
  /** The video's name, changed in the edit room. */
  name?: string
}

export function arrangementOf(id: string): Arrangement {
  const own = (tweaks as Record<string, unknown>)[id]
  if (!own || typeof own !== 'object') {
    return { lengths: {} }
  }
  return 'lengths' in own || 'order' in own || 'hidden' in own || 'enter' in own || 'name' in own
    ? { lengths: {}, ...(own as Partial<Arrangement>) } as Arrangement
    : { lengths: own as Record<string, number> }
}

/** A scene made longer or shorter in the edit room: never shorter than its voice line needs, nor by more than a quarter. */
function tweaked(scene: Scene, number: number, arrangement: Arrangement): Scene {
  const extra = arrangement.lengths[String(number)] ?? 0
  if (!extra) {
    return scene
  }
  return { ...scene, frames: Math.max(Math.round(scene.frames * 0.75), scene.frames + extra) }
}

/** "LaunchFilm" or "launch-film" → "Launch film". */
function titleFromId(id: string) {
  const words = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim().toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** One video: its brand, and its scenes in order with how each one grows out of the last. */
export function defineVideo({ id, name, brand: base, format = 'landscape', look = 'editorial', scenes: givenScenes, cover = {}, voiceover }: VideoSpec): VideoDefinition {
  const { width, height } = FORMATS[format]
  const brand = lookColors(base, look)
  // The scenes in the order the edit room set (numbers from 1; a number twice is a duplicate), the
  // hidden ones left out. A scene added in code later still shows, at the end. A `grow` only works
  // after the scene it grows out of: moved elsewhere, it becomes a fade-through.
  const arrangement = arrangementOf(id)
  const all = givenScenes.map((_, index) => index + 1)
  const hidden = new Set(arrangement.hidden ?? [])
  let order = (arrangement.order ?? all).filter(number => number >= 1 && number <= givenScenes.length)
  order = [...order, ...all.filter(number => !order.includes(number))].filter(number => !hidden.has(number))
  if (!order.length) {
    order = [1]
  }
  const arranged = order.map((number, position) => {
    const scene = givenScenes[number - 1]
    const chosen = arrangement.enter?.[String(number)]
    const movedAway = (position === 0 ? 0 : order[position - 1]) !== number - 1
    const enter = chosen && NAMED_TRANSITIONS[chosen] ? NAMED_TRANSITIONS[chosen]() : scene.enter?.kind === 'grow' && movedAway ? dip() : scene.enter
    return { ...scene, enter }
  })
  // A scene's last line must end before the next scene starts coming in over it.
  const nextEntrance = (index: number) => arranged[index + 1]?.enter?.frames ?? (arranged[index + 1] ? crossfade().frames : 0)
  const ownScenes = arranged.map((scene, index) => withVoice(tweaked(scene, order[index], arrangement), index, voiceover, nextEntrance(index)))
  // The shortest each scene can be made in the edit room: a quarter off its own length at most, and
  // never less than its voice line needs. The same rules as tweaked() and withVoice().
  const ownFloors = arranged.map((scene, index) => withVoice({ ...scene, frames: Math.round(scene.frames * 0.75) }, index, voiceover, nextEntrance(index)).frames)
  const opening = cover === false ? undefined : (ownScenes[0].enter ?? flood({ x: width / 2, y: height / 2 }))
  const scenes: Scene[] = cover === false || !opening
    ? ownScenes
    : [
        // The first scene's entrance overlaps the cover, so the cover lasts its hold plus that.
        { component: () => <Cover title={cover.title} />, frames: (cover.frames ?? 45) + opening.frames },
        { ...ownScenes[0], enter: opening },
        ...ownScenes.slice(1)
      ]
  const enters = scenes.map((scene, index) => (index === 0 ? 0 : (scene.enter ?? crossfade()).frames))
  const starts = [0]
  for (let i = 1; i < scenes.length; i++) {
    starts.push(starts[i - 1] + scenes[i - 1].frames - enters[i])
  }

  // Each scene's line plays from its start frame inside the scene.
  const voiceTimes = scenes.map((scene, index) => {
    const lines = (scene as VoicedScene).voiceLines ?? []
    return lines.length ? { line: lines.map(l => l.line).join(', '), text: lines.map(l => voiceover?.lines[l.line]?.text ?? '').join(' '), from: starts[index] + lines[0].at, to: starts[index] + lines.at(-1)!.at + lines.at(-1)!.frames } : null
  })
  const voiceLines = scenes.map(scene => ((scene as VoicedScene).voiceLines ?? []).map(voice => (
    <Sequence key={`voice-${voice.line}`} from={voice.at} layout="none"><Audio src={staticFile(voice.src)} /></Sequence>
  )))

  function Video() {
    return (
      <BrandProvider brand={brand}>
        <LookProvider look={look}>
            <AbsoluteFill style={{ background: brand.colors.canvas, fontFamily: brand.fontFamily }}>
              <TransitionSeries>
                {scenes.flatMap(({ component: SceneComponent, frames, enter }, index) => {
                  const transition = enter ?? crossfade()
                  return [
                    index > 0 && <TransitionSeries.Transition key={`enter-${index}`} presentation={transition.presentation} timing={linearTiming({ durationInFrames: transition.frames, easing: transition.eased ? easeInOut : undefined })} />,
                    <TransitionSeries.Sequence key={`scene-${index}`} durationInFrames={frames}>
                      <Backdrop />
                      <SceneComponent />
                      {voiceLines[index]}
                    </TransitionSeries.Sequence>
                  ]
                }).filter(Boolean)}
              </TransitionSeries>
            </AbsoluteFill>
        </LookProvider>
      </BrandProvider>
    )
  }

  return {
    id,
    component: Video,
    durationInFrames: starts.at(-1)! + scenes.at(-1)!.frames,
    fps: FPS,
    width,
    height,
    timeline: {
      starts,
      frames: scenes.map(scene => scene.frames),
      enters,
      cover: cover !== false,
      voice: voiceTimes,
      names: scenes.map((scene, index) => (cover !== false && index === 0 ? 'Cover' : scene.name ?? `Scene ${(scenes.length > order.length ? order[index - 1] : order[index]) ?? index}`)),
      floors: scenes.length > ownFloors.length ? [scenes[0].frames, ...ownFloors] : ownFloors,
      // Each scene's own number (from 1, as written in code; null for the cover), and every scene
      // of the video with its name, for the edit room to rearrange.
      numbers: scenes.length > order.length ? [null, ...order] : order,
      catalog: givenScenes.map((scene, index) => ({ number: index + 1, name: scene.name ?? `Scene ${index + 1}`, hidden: hidden.has(index + 1), transition: arrangement.enter?.[String(index + 1)] ?? null })),
      baseId: id,
      title: arrangement.name ?? name ?? titleFromId(id)
    }
  }
}

type VoicedScene = Scene & { voiceLines?: { line: string, src: string, at: number, frames: number }[] }

/**
 * A scene with its voiceover lines placed: the first once the scene has arrived, each next one a
 * breath after the one before (or at its own `at`), and the scene made long enough for the last
 * to be said, a breath, and the next scene's entrance, which overlaps this scene's end.
 */
function withVoice(scene: Scene, index: number, voiceover: VoiceTrack | undefined, nextEntrance: number): VoicedScene {
  if (!scene.voice) {
    return scene
  }
  const cues = (Array.isArray(scene.voice) ? scene.voice : [scene.voice]).map(cue => (typeof cue === 'string' ? { line: cue, at: undefined } : cue))
  // Once the scene has arrived: after its entrance (the first scene enters out of the cover).
  let next = (scene.enter?.frames ?? (index === 0 ? 36 : crossfade().frames)) + 6
  const voiceLines = cues.map(({ line, at }) => {
    const recorded = voiceover?.lines[line]
    if (!recorded) {
      throw new Error(`Scene ${index + 1} carries the voice line "${line}", but ${voiceover ? 'the voiceover has no such line' : 'the video has no voiceover'}. Record it with render.sh voice <folder>.`)
    }
    const start = at ?? next
    const frames = Math.ceil(recorded.duration * FPS)
    next = start + frames + AFTER_LINE
    return { line, src: recorded.src, at: start, frames }
  })
  const last = voiceLines.at(-1)!
  return { ...scene, frames: Math.max(scene.frames, last.at + last.frames + AFTER_LINE + nextEntrance), voiceLines }
}

/**
 * The same video in several languages. `make` builds the video from one language's words; each
 * one gets the id `<id>-<language>` (AcmeTeaser-es), and every scene's length follows that
 * language's own text, since kit scenes time themselves from their words. `make` may return
 * `inFormats(…)` for every shape in every language (AcmeTeaser-square-es).
 */
export function inLanguages<Words>(words: Record<string, Words>, make: (words: Words, language: string) => VideoDefinition | VideoDefinition[]): VideoDefinition[] {
  return Object.entries(words).flatMap(([language, own]) =>
    [make(own, language)].flat().map(video => ({ ...video, id: `${video.id}-${language}` })))
}

/**
 * The same video in several shapes, from one storyboard: `make` builds the video for one format;
 * each gets the id `<id>-<format>` (AcmeTeaser-square). Kit scenes lay themselves out for each shape.
 */
export function inFormats(formats: (keyof typeof FORMATS)[], make: (format: keyof typeof FORMATS) => VideoDefinition | VideoDefinition[]): VideoDefinition[] {
  return formats.flatMap(format =>
    [make(format)].flat().map(video => (formats.length === 1 ? video : { ...video, id: `${video.id}-${format}` })))
}
