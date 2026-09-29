import { acme } from '../../brands/acme'
import {
  ChatPileUp, chatPileUpFrames, defineVideo, EndCard, endCardFrames, flood, grow, PromiseList,
  promiseListFrames, push, TitleCard, titleCardFrames
} from '../../kit'
import { END, HOOK, INTRO, PROMISES } from './content'

/** The example: a made-up product's teaser built only from kit scenes. Delete it once you have your own. */
export const acmeTeaser = defineVideo({
  id: 'AcmeTeaser',
  brand: acme,
  // The first frame, and so the preview Slack, LinkedIn and X show.
  cover: { title: 'Every task has an owner.' },
  scenes: [
    { component: () => <ChatPileUp {...HOOK} />, frames: chatPileUpFrames(HOOK) },
    // The accent bursts out of "familiar?".
    { component: () => <TitleCard {...INTRO} />, frames: titleCardFrames(INTRO), enter: flood({ x: 1290, y: 590 }) },
    { component: () => <PromiseList {...PROMISES} />, frames: promiseListFrames(PROMISES), enter: push('from-right') },
    // The first promise's icon opens into the end card.
    { component: () => <EndCard {...END} />, frames: endCardFrames(END), enter: grow({ x: 240, y: 380, width: 84, height: 84, radius: 22, color: acme.colors.accent }) }
  ]
})
