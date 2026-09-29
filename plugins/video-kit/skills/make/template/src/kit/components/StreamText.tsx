import { useCurrentFrame } from 'remotion'
import { progress } from '../motion'

/** Text arriving word by word, the way an answer streams in. */
export function StreamText({ text, start, perWord = 1.6 }: { text: string, start: number, perWord?: number }) {
  const frame = useCurrentFrame()
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span key={index} style={{ opacity: progress(frame, start + index * perWord, 8) }}>{word} </span>
      ))}
    </>
  )
}

export function streamEnd(text: string, start: number, perWord = 1.6): number {
  return start + text.split(' ').length * perWord
}
