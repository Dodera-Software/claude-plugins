import { Composition } from 'remotion'
import { VIDEOS } from './videos'

export function Root() {
  return (
    <>
      {VIDEOS.map(({ timeline: _timeline, ...video }) => <Composition key={video.id} {...video} />)}
    </>
  )
}
