import { BellOff, CircleCheck, UserCheck } from 'lucide-react'
import type { ChatPileUpProps, EndCardProps, PromiseListProps, TitleCardProps } from '../../kit'

/** Every word of the example teaser. Acme Tasks is made up; so are these people. */

const MIA = { initials: 'MK', name: 'Mia Kovač', tint: '#DBEAFE', ink: '#1D4ED8' }
const OMAR = { initials: 'OS', name: 'Omar Said', tint: '#FCE7F3', ink: '#BE185D' }
const LENA = { initials: 'LB', name: 'Lena Brandt', tint: '#FEF3C7', ink: '#B45309' }
const TOM = { initials: 'TR', name: 'Tom Reyes', tint: '#DCFCE7', ink: '#15803D' }

export const HOOK: ChatPileUpProps = {
  messages: [
    { person: MIA, text: 'Who\'s doing the invoice export?' },
    { person: OMAR, text: 'I thought Dan had it.' },
    { person: LENA, text: 'Dan left in March.' },
    { person: TOM, text: 'So… nobody?' }
  ],
  punchline: ['Sound', 'familiar?']
}

export const INTRO: TitleCardProps = {
  eyebrow: 'MEET ACME TASKS',
  title: 'Every task has an owner.',
  aside: 'Even the boring ones.',
  accent: ['owner']
}

export const PROMISES: PromiseListProps = {
  items: [
    { icon: UserCheck, text: 'One owner per task, always.' },
    { icon: BellOff, text: 'Reminders, not nagging.' },
    { icon: CircleCheck, text: 'Done means done.' }
  ]
}

export const END: EndCardProps = { tagline: 'Tasks that actually get done.', taglineAccent: ['done'] }
