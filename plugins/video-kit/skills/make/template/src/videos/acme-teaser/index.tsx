import { acme } from '../../brands/acme'
import {
  ChatPileUp, chatPileUpFrames, EndCard, endCardFrames, defineVideo, grow, inLanguages, PromiseList,
  promiseListFrames, push, TitleCard, titleCardFrames
} from '../../kit'
import { WORDS } from './content'

/**
 * The example: a made-up product's teaser built only from kit scenes, in English and Spanish
 * (AcmeTeaser-en, AcmeTeaser-es). Delete it once you have your own.
 */
export const acmeTeaser = inLanguages(WORDS, words => defineVideo({
  id: 'AcmeTeaser',
  brand: acme,
  // The first frame, and so the preview Slack, LinkedIn and X show.
  cover: { title: words.cover },
  scenes: [
    { component: () => <ChatPileUp {...words.hook} />, frames: chatPileUpFrames(words.hook) },
    { component: () => <TitleCard {...words.intro} />, frames: titleCardFrames(words.intro), enter: push('from-right') },
    { component: () => <PromiseList {...words.promises} />, frames: promiseListFrames(words.promises), enter: push('from-right') },
    // The first promise's icon opens into the end card.
    { component: () => <EndCard {...words.end} />, frames: endCardFrames(words.end), enter: grow({ x: 240, y: 380, width: 84, height: 84, radius: 22, color: acme.colors.accent }) }
  ]
}))
