import { BellOff, CircleCheck, UserCheck } from 'lucide-react'
import type { ChatPileUpProps, EndCardProps, PromiseListProps, TitleCardProps } from '../../kit'

/** Every word of the example teaser, per language. Acme Tasks is made up; so are these people. */

const MIA = { initials: 'MK', name: 'Mia Kovač', tint: '#DBEAFE', ink: '#1D4ED8' }
const OMAR = { initials: 'OS', name: 'Omar Said', tint: '#FCE7F3', ink: '#BE185D' }
const LENA = { initials: 'LB', name: 'Lena Brandt', tint: '#FEF3C7', ink: '#B45309' }
const TOM = { initials: 'TR', name: 'Tom Reyes', tint: '#DCFCE7', ink: '#15803D' }

export interface Words {
  cover: string
  hook: ChatPileUpProps
  intro: TitleCardProps
  promises: PromiseListProps
  end: EndCardProps
}

export const WORDS: Record<'en' | 'es', Words> = {
  en: {
    cover: 'Every task has an owner.',
    hook: {
      messages: [
        { person: MIA, text: 'Who\'s doing the invoice export?' },
        { person: OMAR, text: 'I thought Dan had it.' },
        { person: LENA, text: 'Dan left in March.' },
        { person: TOM, text: 'So… nobody?' }
      ],
      punchline: ['Sound', 'familiar?']
    },
    intro: { eyebrow: 'MEET ACME TASKS', title: 'Every task has an owner.', aside: 'Even the boring ones.', accent: ['owner'] },
    promises: {
      items: [
        { icon: UserCheck, text: 'One owner per task, always.' },
        { icon: BellOff, text: 'Reminders, not nagging.' },
        { icon: CircleCheck, text: 'Done means done.' }
      ]
    },
    end: { tagline: 'Tasks that actually get done.', taglineAccent: ['done'] }
  },
  es: {
    cover: 'Cada tarea tiene un responsable.',
    hook: {
      messages: [
        { person: MIA, text: '¿Quién hace la exportación de facturas?' },
        { person: OMAR, text: 'Pensaba que la tenía Dan.' },
        { person: LENA, text: 'Dan se fue en marzo.' },
        { person: TOM, text: 'Entonces… ¿nadie?' }
      ],
      punchline: ['¿Te', 'suena?']
    },
    intro: { eyebrow: 'ESTO ES ACME TASKS', title: 'Cada tarea tiene un responsable.', aside: 'Incluso las aburridas.', accent: ['responsable'] },
    promises: {
      items: [
        { icon: UserCheck, text: 'Un responsable por tarea, siempre.' },
        { icon: BellOff, text: 'Recordatorios, no insistencia.' },
        { icon: CircleCheck, text: 'Hecho significa hecho.' }
      ]
    },
    end: { tagline: 'Tareas que de verdad se terminan.', taglineAccent: ['terminan'] }
  }
}
