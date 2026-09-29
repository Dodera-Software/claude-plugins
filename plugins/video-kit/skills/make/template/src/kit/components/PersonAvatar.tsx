import type { Person } from '../types'

export function PersonAvatar({ person, size }: { person: Person, size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, background: person.tint, color: person.ink, flexShrink: 0,
      display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 600
    }}
    >
      {person.initials}
    </div>
  )
}
