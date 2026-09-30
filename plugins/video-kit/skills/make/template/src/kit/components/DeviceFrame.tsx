import type { ReactNode } from 'react'

interface FrameProps {
  /** The device's outer width, in pixels. */
  width: number
  /** The screen's proportions (the captured viewport): 1440×900 for a laptop, 390×844 for a phone. */
  screen: { width: number, height: number }
  /** What the screen shows, filling it: a `Recording`, an image, the rebuilt UI. */
  children: ReactNode
}

/**
 * A laptop around the screen: a thin dark bezel with a camera, and an aluminium base with the
 * notch to open it. No maker's marks: it reads as "a laptop", not as a product we'd be showing.
 */
export function Laptop({ width, screen, children }: FrameProps) {
  const bezel = Math.round(width * 0.018)
  const inner = width - 2 * bezel
  const innerHeight = Math.round((inner * screen.height) / screen.width)
  const lid = innerHeight + bezel * 2 + Math.round(bezel * 0.6)
  const base = Math.round(width * 0.028)
  return (
    <div style={{ width: width * 1.12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width, height: lid, borderRadius: `${bezel * 1.6}px ${bezel * 1.6}px ${bezel * 0.5}px ${bezel * 0.5}px`, background: '#0c0d10',
        boxShadow: '0 0 0 1.5px #3a3d44, 0 40px 90px rgba(0,0,0,0.45)', padding: bezel, paddingBottom: bezel + Math.round(bezel * 0.6), position: 'relative'
      }}
      >
        <div style={{ position: 'absolute', top: bezel * 0.35, left: '50%', width: bezel * 0.3, height: bezel * 0.3, marginLeft: -bezel * 0.15, borderRadius: '50%', background: '#1f2228' }} />
        <div style={{ width: inner, height: innerHeight, overflow: 'hidden', borderRadius: bezel * 0.25, background: '#fff' }}>{children}</div>
      </div>
      <div style={{
        width: width * 1.12, height: base, borderRadius: `0 0 ${base * 1.6}px ${base * 1.6}px`,
        background: 'linear-gradient(#d8dbe0, #a9aeb6 70%, #8b9098)', boxShadow: '0 30px 60px rgba(0,0,0,0.35)', position: 'relative'
      }}
      >
        <div style={{ position: 'absolute', top: 0, left: '50%', width: width * 0.14, marginLeft: -width * 0.07, height: base * 0.38, borderRadius: `0 0 ${base * 0.4}px ${base * 0.4}px`, background: '#9ea3ab' }} />
      </div>
    </div>
  )
}

/** A phone around the screen: rounded dark frame, the island at the top. No maker's marks. */
export function Phone({ width, screen, children }: FrameProps) {
  const bezel = Math.round(width * 0.04)
  const inner = width - 2 * bezel
  const innerHeight = Math.round((inner * screen.height) / screen.width)
  return (
    <div style={{
      width, padding: bezel, borderRadius: width * 0.16, background: '#0c0d10',
      boxShadow: '0 0 0 2px #3a3d44, 0 40px 90px rgba(0,0,0,0.45)', position: 'relative'
    }}
    >
      <div style={{ width: inner, height: innerHeight, overflow: 'hidden', borderRadius: width * 0.12, background: '#fff', position: 'relative' }}>
        {children}
        <div style={{ position: 'absolute', top: inner * 0.03, left: '50%', width: inner * 0.3, marginLeft: -inner * 0.15, height: inner * 0.085, borderRadius: inner * 0.05, background: '#000' }} />
      </div>
    </div>
  )
}
