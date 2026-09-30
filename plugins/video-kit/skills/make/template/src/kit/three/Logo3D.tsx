import { formatHex, interpolate } from 'culori'
import { useEffect, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion'
import {
  Box3, BufferGeometry, DoubleSide, ExtrudeGeometry, Path, Shape, SRGBColorSpace, TextureLoader,
  Vector2, type Texture
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { BrandProvider, useBrand, type Brand } from '../brand'
import { useLook } from '../look'

/**
 * An image as a three.js texture, holding the render until it has loaded. `src` is a path under
 * public/ (like the kit's `shots`) or a full URL.
 */
export function useImageTexture(src: string): Texture | null {
  const url = /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src)
  const [handle] = useState(() => delayRender(`Loading ${url}`))
  const [texture, setTexture] = useState<Texture | null>(null)
  useEffect(() => {
    new TextureLoader().load(url, loaded => {
      loaded.colorSpace = SRGBColorSpace
      loaded.anisotropy = 8
      setTexture(loaded)
      continueRender(handle)
    }, undefined, error => cancelRender(error))
  }, [url, handle])
  return texture
}

interface Part {
  geometry: BufferGeometry
  color: string
  /** Extruded (true) or a flat stroke laid on the part below it. */
  solid: boolean
}

/**
 * A gradient fill's colour for a solid: the middle of its stops, mixed in oklab. Reads the SVG's own
 * <linearGradient>/<radialGradient> by id; anything it can't read falls back to the brand accent.
 */
function gradientColor(markup: string, id: string, fallback: string): string {
  const gradient = new RegExp(`<(?:linear|radial)Gradient[^>]*id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([\\s\\S]*?)</(?:linear|radial)Gradient>`).exec(markup)
  const stops = gradient ? [...gradient[1].matchAll(/stop-color="([^"]+)"/g)].map(match => match[1]) : []
  if (!stops.length) {
    return fallback
  }
  return formatHex(interpolate(stops, 'oklab')(0.5)) ?? fallback
}

function flipped(points: Vector2[]): Vector2[] {
  return points.map(point => new Vector2(point.x, -point.y))
}

/**
 * The brand's SVG logo as solid parts: every filled shape extruded, each one standing a little
 * proud of the one before (so a mark drawn on a tile is raised off it), strokes laid flat on top.
 * Centred and scaled so its widest side is `size`. Null when the logo isn't an SVG.
 */
function logoParts(markup: string, size: number, depth: number, fallback: string): Part[] | null {
  if (!markup.trimStart().startsWith('<svg')) {
    return null
  }
  const { paths } = new SVGLoader().parse(markup)
  const parts: Part[] = []
  let z = 0
  for (const path of paths) {
    const style = (path.userData?.style ?? {}) as Parameters<typeof SVGLoader.pointsToStroke>[1] & { fill?: string, stroke?: string }
    const paint = (value: string | undefined) => {
      if (!value || value === 'none') {
        return null
      }
      const gradient = /^url\(\s*#([^)\s]+)\s*\)/.exec(value)
      if (gradient) {
        return gradientColor(markup, gradient[1], fallback)
      }
      return /^(currentColor|inherit)/.test(value) ? fallback : value
    }
    const fill = paint(style.fill)
    if (fill) {
      const shapes = SVGLoader.createShapes(path).map(shape => {
        const { shape: outline, holes } = shape.extractPoints(24)
        const solid = new Shape(flipped(outline))
        solid.holes = holes.map(hole => new Path(flipped(hole)))
        return solid
      })
      const geometry = new ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 1.2, bevelSegments: 4, curveSegments: 24 })
      geometry.translate(0, 0, z)
      parts.push({ geometry, color: fill, solid: true })
      z += 1
    }
    const stroke = paint(style.stroke)
    if (stroke) {
      for (const subPath of path.subPaths) {
        const geometry = SVGLoader.pointsToStroke(flipped(subPath.getPoints()), style)
        if (geometry) {
          geometry.translate(0, 0, z + 0.3)
          parts.push({ geometry, color: stroke, solid: false })
        }
      }
    }
  }
  if (parts.length === 0) {
    return null
  }
  const bounds = new Box3()
  for (const part of parts) {
    part.geometry.computeBoundingBox()
    bounds.union(part.geometry.boundingBox!)
  }
  const across = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y)
  const scale = size / across
  // Extruded layers are one unit deep in SVG units; `depth` is the whole logo's thickness.
  const layers = Math.max(1, bounds.max.z - bounds.min.z)
  for (const part of parts) {
    part.geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -(bounds.min.y + bounds.max.y) / 2, -(bounds.min.z + bounds.max.z) / 2)
    part.geometry.scale(scale, scale, depth / layers)
    part.geometry.computeVertexNormals()
  }
  return parts
}

function Backing({ size, depth, round }: { size: number, depth: number, round: number }) {
  const geometry = useMemo(() => {
    const half = size / 2
    const radius = size * 0.24 * round
    const tile = new Shape()
    tile.moveTo(-half + radius, -half)
    tile.lineTo(half - radius, -half)
    tile.quadraticCurveTo(half, -half, half, -half + radius)
    tile.lineTo(half, half - radius)
    tile.quadraticCurveTo(half, half, half - radius, half)
    tile.lineTo(-half + radius, half)
    tile.quadraticCurveTo(-half, half, -half, half - radius)
    tile.lineTo(-half, -half + radius)
    tile.quadraticCurveTo(-half, -half, -half + radius, -half)
    const extruded = new ExtrudeGeometry(tile, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: size * 0.02, bevelSegments: 4, curveSegments: 16 })
    extruded.translate(0, 0, -depth * 1.4)
    return extruded
  }, [size, depth, round])
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#ffffff" roughness={0.4} clearcoat={0.5} />
    </mesh>
  )
}

function ImageLogo({ src, size }: { src: string, size: number }) {
  const texture = useImageTexture(src)
  const image = texture?.image as { width: number, height: number } | undefined
  const aspect = image ? image.width / image.height : 1
  const [w, h] = aspect >= 1 ? [size, size / aspect] : [size * aspect, size]
  return texture
    ? (
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} transparent side={DoubleSide} />
        </mesh>
      )
    : null
}

export interface Logo3DProps {
  /** Its widest side, in scene units (default 2). */
  size?: number
  /** Its thickness (default 0.24). */
  depth?: number
}

/**
 * The brand's logo as a solid object, from its own SVG, in its own colours. Where the look's canvas
 * would swallow it (bold, or technical without a `LogoOnDark`) it stands on a white tile, as
 * `BrandMark` does. A logo that isn't an SVG shows as a flat image. Goes inside `Stage3D`; move
 * and turn it with a `<group>` around it.
 */
export function Logo3D({ size = 2, depth = 0.24 }: Logo3DProps) {
  const brand = useBrand()
  const { name, round } = useLook()
  const onDark = name === 'technical' && brand.LogoOnDark
  const tile = name === 'bold' || (name === 'technical' && !brand.LogoOnDark)
  const Mark = onDark ? brand.LogoOnDark! : brand.Logo
  const inner = tile ? size * 0.68 : size
  const markup = useMemo(() => renderToStaticMarkup(<BrandProvider brand={brand as Brand}><Mark size={256} /></BrandProvider>), [brand, Mark])
  const parts = useMemo(() => logoParts(markup, inner, depth, brand.colors.accent), [markup, inner, depth, brand.colors.accent])
  const image = parts ? null : markup.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
  return (
    <group>
      {tile && <Backing size={size} depth={depth * 0.8} round={round} />}
      {parts?.map((part, index) => (
        <mesh key={index} geometry={part.geometry}>
          {part.solid
            ? <meshPhysicalMaterial color={part.color} roughness={0.5} clearcoat={0.15} clearcoatRoughness={0.3} />
            : <meshPhysicalMaterial color={part.color} roughness={0.5} clearcoat={0.15} side={DoubleSide} polygonOffset polygonOffsetFactor={-2} />}
        </mesh>
      ))}
      {image && <ImageLogo src={image} size={inner} />}
    </group>
  )
}
