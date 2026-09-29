import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export interface Brand {
  name: string
  domain: string
  fontFamily: string
  colors: {
    /** The background every scene sits on. */
    canvas: string
    /** Cards, windows, sheets. */
    sheet: string
    text: string
    toned: string
    muted: string
    border: string
    /** The one brand colour: labels, accents, buttons. */
    accent: string
    accentSoft: string
    accentInk: string
    /** Highlighter stroke behind quoted text. */
    highlight: string
    /** Quiet tinted fill: chips, citations. */
    subtle: string
  }
  shadow: { card: string, floating: string }
  Logo: ComponentType<{ size: number }>
}

const BrandContext = createContext<Brand | null>(null)

export function BrandProvider({ brand, children }: { brand: Brand, children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  const brand = useContext(BrandContext)
  if (!brand) {
    throw new Error('Kit components render inside a video made with defineVideo().')
  }
  return brand
}
