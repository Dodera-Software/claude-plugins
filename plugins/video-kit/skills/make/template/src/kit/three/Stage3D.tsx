import { useThree } from '@react-three/fiber'
import { ThreeCanvas } from '@remotion/three'
import { useLayoutEffect, useMemo, type ReactNode } from 'react'
import { useVideoConfig } from 'remotion'
import { PerspectiveCamera, PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { useLook } from '../look'
import type { CameraView } from './camera'

/** Points the three.js camera where the scene says, every frame, before it's drawn. */
function Rig({ camera }: { camera: CameraView }) {
  const three = useThree(state => state.camera) as PerspectiveCamera
  useLayoutEffect(() => {
    three.position.set(...camera.position)
    three.fov = camera.fov ?? 35
    three.lookAt(new Vector3(...camera.target))
    three.updateProjectionMatrix()
  }, [three, camera])
  return null
}

/** Soft studio reflections, so surfaces read as solid without an image to load. */
function Studio({ intensity }: { intensity: number }) {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const environment = useMemo(() => {
    const generator = new PMREMGenerator(gl)
    const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture
    generator.dispose()
    return texture
  }, [gl])
  useLayoutEffect(() => {
    scene.environment = environment
    scene.environmentIntensity = intensity
    return () => {
      scene.environment = null
    }
  }, [scene, environment, intensity])
  return null
}

export interface Stage3DProps {
  camera: CameraView
  children: ReactNode
}

/**
 * Real 3D objects (three.js through React Three Fiber) over the video's canvas, which shows
 * through: the logo as a solid (`Logo3D`), shapes, anything built from meshes. Lit like a quiet
 * studio; the technical look gets a darker, harder light. Animate from `useCurrentFrame()`, never
 * `useFrame` or a clock, so every frame renders the same each time.
 *
 * Units are free; `Logo3D` is 2 units across by default, and a camera 6 units away frames it well.
 */
export function Stage3D({ camera, children }: Stage3DProps) {
  const { width, height } = useVideoConfig()
  const { name } = useLook()
  const dark = name === 'technical'
  return (
    <ThreeCanvas
      width={width}
      height={height}
      // Brand colours as given: no film tone curve bending them.
      flat
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      camera={{ fov: camera.fov ?? 35, near: 0.1, far: 200, position: camera.position }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Rig camera={camera} />
      <Studio intensity={dark ? 0.25 : 0.3} />
      <ambientLight intensity={dark ? 0.25 : 0.5} />
      <directionalLight position={[3, 5, 6]} intensity={dark ? 2.2 : 1.6} />
      <directionalLight position={[-5, -2, 3]} intensity={dark ? 0.2 : 0.5} />
      {children}
    </ThreeCanvas>
  )
}
