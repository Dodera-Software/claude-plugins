import { linearTiming, TransitionSeries } from '@remotion/transitions'
import type { ComponentType } from 'react'
import { AbsoluteFill } from 'remotion'
import { SoundContext } from './audio/Sfx'
import { BrandProvider, type Brand } from './brand'
import { FORMATS } from './layout'
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
}

interface VideoSpec {
  id: string
  brand: Brand
  format?: keyof typeof FORMATS
  scenes: Scene[]
  /** Sound effects on (default) or a silent video. Scenes keep their cues either way. */
  sound?: boolean
  /**
   * The composed opening frame that apps use as the video's preview: logo, name and `title`,
   * shown on its own for `frames` (default 45, ¾ s) before the first scene bursts out of it. Only
   * turn it off (`false`) when the first scene is already fully composed at its frame 0.
   */
  cover?: (CoverProps & { frames?: number }) | false
}

export interface VideoDefinition {
  id: string
  component: ComponentType
  durationInFrames: number
  fps: number
  width: number
  height: number
  /** Where each scene starts and how long its entrance overlaps the previous one: for checking frames. */
  timeline: { starts: number[], frames: number[], enters: number[], cover: boolean }
}

/** One video: its brand, and its scenes in order with how each one grows out of the last. */
export function defineVideo({ id, brand, format = 'landscape', scenes: ownScenes, sound = true, cover = {} }: VideoSpec): VideoDefinition {
  const { width, height } = FORMATS[format]
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

  function Video() {
    return (
      <BrandProvider brand={brand}>
        <SoundContext.Provider value={sound}>
          <AbsoluteFill style={{ background: brand.colors.canvas, fontFamily: brand.fontFamily }}>
            <TransitionSeries>
              {scenes.flatMap(({ component: SceneComponent, frames, enter }, index) => {
                const transition = enter ?? crossfade()
                return [
                  index > 0 && <TransitionSeries.Transition key={`enter-${index}`} presentation={transition.presentation} timing={linearTiming({ durationInFrames: transition.frames })} />,
                  <TransitionSeries.Sequence key={`scene-${index}`} durationInFrames={frames}>
                    <SceneComponent />
                  </TransitionSeries.Sequence>
                ]
              }).filter(Boolean)}
            </TransitionSeries>
          </AbsoluteFill>
        </SoundContext.Provider>
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
    timeline: { starts, frames: scenes.map(scene => scene.frames), enters, cover: cover !== false }
  }
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
