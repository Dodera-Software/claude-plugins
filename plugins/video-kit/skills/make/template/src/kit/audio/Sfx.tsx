import { createContext, useContext } from 'react'
import { Audio, Sequence, staticFile } from 'remotion'
import { FPS } from '../motion'
import { CUES, type Cue } from './cues'

/** Whether this video plays its sound effects (`defineVideo({ sound })`). */
export const SoundContext = createContext(true)

/**
 * A sound effect whose loudest moment lands `at` frames into the current scene. Keep it quiet:
 * it seasons, never leads. Silent when the video was defined with `sound: false`.
 */
export function Sfx({ cue, at, volume = 0.35 }: { cue: Cue, at: number, volume?: number }) {
  const sound = useContext(SoundContext)
  if (!sound) {
    return null
  }
  const { file, peak } = CUES[cue]
  return (
    <Sequence from={Math.round(at - peak * FPS)} durationInFrames={120} layout="none">
      <Audio src={staticFile(file)} volume={volume} />
    </Sequence>
  )
}
