import { color } from './tokens'

/** A check mark on a rounded tile. */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="64" height="64" rx="16" fill={color.teal} />
      <path d="M19 33.5l8.5 8.5L45 23" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
