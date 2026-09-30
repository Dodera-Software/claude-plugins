import { linearTiming, TransitionSeries } from '@remotion/transitions'
import type { ComponentType } from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { SfxLevel, SoundContext } from './audio/Sfx'
import { BrandProvider, type Brand } from './brand'
import { Backdrop } from './components/Backdrop'
import { FORMATS } from './layout'
import { LookProvider, lookColors, type LookName } from './look'
import { FPS } from './motion'
import { Cover, type CoverProps } from './scenes/Cover'
import { crossfade, flood, type SceneTransition } from './transitions'

export { FORMATS }

export interface Scene {
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
  brand: Brand
  format?: keyof typeof FORMATS
  scenes: Scene[]
  /**
   * The video's feel over the same brand: editorial (default), bold, technical or playful. It sets
   * colours, type, motion and what sits behind the scenes (src/kit/look.tsx).
   */
  look?: LookName
  /** Silent (default), or sound effects when the person asked for them. Scenes keep their cues either way. */
  sound?: boolean
  /**
   * The composed opening frame that apps use as the video's preview: logo, name and `title`,
   * shown on its own for `frames` (default 45, ¾ s) before the first scene bursts out of it. Only
   * turn it off (`false`) when the first scene is already fully composed at its frame 0.
   */
  cover?: (CoverProps & { frames?: number }) | false
  /**
   * The narration (`render.sh voice <folder>`, then import its voice.json): scenes say which line
   * they carry with `voice`. Sound effects play softer under it.
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
  timeline: { starts: number[], frames: number[], enters: number[], cover: boolean, voice: ({ line: string, from: number, to: number } | null)[] }
}

/** One video: its brand, and its scenes in order with how each one grows out of the last. */
export function defineVideo({ id, brand: base, format = 'landscape', look = 'editorial', scenes: givenScenes, sound = false, cover = {}, voiceover }: VideoSpec): VideoDefinition {
  const { width, height } = FORMATS[format]
  const brand = lookColors(base, look)
  // A scene's last line must end before the next scene starts coming in over it.
  const ownScenes = givenScenes.map((scene, index) => withVoice(scene, index, voiceover, givenScenes[index + 1]?.enter?.frames ?? (givenScenes[index + 1] ? 20 : 0)))
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
    return lines.length ? { line: lines.map(l => l.line).join(', '), from: starts[index] + lines[0].at, to: starts[index] + lines.at(-1)!.at + lines.at(-1)!.frames } : null
  })
  const voiceLines = scenes.map(scene => ((scene as VoicedScene).voiceLines ?? []).map(voice => (
    <Sequence key={`voice-${voice.line}`} from={voice.at} layout="none"><Audio src={staticFile(voice.src)} /></Sequence>
  )))

  function Video() {
    return (
      <BrandProvider brand={brand}>
        <LookProvider look={look}>
          <SfxLevel.Provider value={voiceover ? 0.4 : 1}>
          <SoundContext.Provider value={sound}>
            <AbsoluteFill style={{ background: brand.colors.canvas, fontFamily: brand.fontFamily }}>
              <TransitionSeries>
                {scenes.flatMap(({ component: SceneComponent, frames, enter }, index) => {
                  const transition = enter ?? crossfade()
                  return [
                    index > 0 && <TransitionSeries.Transition key={`enter-${index}`} presentation={transition.presentation} timing={linearTiming({ durationInFrames: transition.frames })} />,
                    <TransitionSeries.Sequence key={`scene-${index}`} durationInFrames={frames}>
                      <Backdrop />
                      <SceneComponent />
                      {voiceLines[index]}
                    </TransitionSeries.Sequence>
                  ]
                }).filter(Boolean)}
              </TransitionSeries>
            </AbsoluteFill>
          </SoundContext.Provider>
          </SfxLevel.Provider>
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
    timeline: { starts, frames: scenes.map(scene => scene.frames), enters, cover: cover !== false, voice: voiceTimes }
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
  let next = (scene.enter?.frames ?? (index === 0 ? 36 : 20)) + 6
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
