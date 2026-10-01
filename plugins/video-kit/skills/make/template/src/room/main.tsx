// The edit room's page (scripts/room.mjs serves it). Plays the studio's videos live with Remotion's
// Player and lets the person change words, scene lengths and voice lines on the spot, leave notes
// for Claude, and export. Not part of any video: nothing in src/videos imports it.
import { Player, Thumbnail, type PlayerRef } from '@remotion/player'
import {
  Check, ChevronLeft, ChevronRight, CircleAlert, Clapperboard, Clock, Copy, Download, Eye, EyeOff, FolderOpen, GripVertical,
  Info, Keyboard, LayoutList, LoaderCircle, Maximize, MessageSquare, Mic, Minus, Pause, Pencil, Play, Plus, Power, Repeat,
  RotateCcw, Search, Send, SkipBack, SkipForward, Sparkles, Trash2, Type, Undo2, Volume2, VolumeX, X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { VideoDefinition } from '../kit'
import { VIDEOS } from '../videos'
import { Studio, type Session } from './studio'
import './room.css'

// ---------------------------------------------------------------------------------------------
// Talking to the room's server

type Folder = { folder: string, ids: string[], content: boolean, voice: boolean }
type Project = { folders: Folder[], tweaks: Record<string, unknown>, wanted: string | null, buildError: string | null }
type Version = { id: string, at: number, label: string, who: 'you' | 'claude', kind: 'change' | 'restore' }
type Versions = { versions: Version[], cursor: string | null, keepDays: number, keep: number }
type Arrange = { order?: number[] | null, hidden?: number[], enter?: Record<string, string>, name?: string }

/** A video's name as people see it: renamed in the edit room, or its own, plus its shape and language when it has several. */
function titleOf(video: VideoDefinition, tweaks?: Record<string, unknown>) {
  const { baseId, title } = video.timeline
  const renamed = (tweaks?.[baseId] as { name?: unknown } | undefined)?.name
  const suffix = video.id.length > baseId.length ? video.id.slice(baseId.length + 1).split('-').join(', ') : ''
  return `${typeof renamed === 'string' && renamed ? renamed : title}${suffix ? ` (${suffix})` : ''}`
}

/** A video's scene lengths from src/tweaks.json (an older file holds only those; a newer one, more). */
function lengthsOf(entry: unknown): Record<string, number> {
  if (!entry || typeof entry !== 'object') {
    return {}
  }
  return 'lengths' in entry ? (entry as { lengths: Record<string, number> }).lengths : entry as Record<string, number>
}

const TRANSITION_NAMES: [string, string][] = [
  ['', 'As designed'], ['fade', 'Fade'], ['fade-through', 'Fade through'], ['zoom-in', 'Zoom in'], ['zoom-out', 'Zoom out'],
  ['slide', 'Slide'], ['wipe', 'Wipe'], ['cut', 'Cut']
]

function timeAgo(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60000)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`
}
type Word = { path: string, text: string, start: number, end: number }
type VoiceLine = { id: string, text: string, say?: string }
type VoiceScript = { voice: string, speed?: number, lines: VoiceLine[] }
type Note = { id: number, video: string, scene: number | null, sceneName: string | null, frame: number | null, time: string | null, text: string, status: 'new' | 'working' | 'done' | 'question', reply: string | null, at: string }
type ExportMode = 'quick' | '4k' | 'full'
type ExportState = { running: boolean, id?: string, mode?: ExportMode, code?: number | null, progress?: string, files?: string[], tail?: string, started?: number, destination?: string | null, copyError?: string | null }
type Places = Record<'video' | 'downloads' | 'desktop', { path: string, exists: boolean }>
type Destination = { kind: 'video' | 'downloads' | 'desktop' | 'custom', path: string }

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? { cache: 'no-store' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Edit-Room': '1' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error ?? `Something went wrong (${response.status})`)
  }
  return data as T
}

/**
 * The server's events (the video changed, notes, the session…), over one connection for the whole
 * page: Safari allows six per site, and a few editor tabs each holding several would leave a new
 * page waiting with nothing on screen.
 */
let sharedEvents: EventSource | null = null
type ServerEvents = { on: (event: string, handler: (event: MessageEvent) => void) => void, onState: (open: () => void, lost: () => void) => void, close: () => void }
export function serverEvents(): ServerEvents {
  sharedEvents ??= new EventSource('/api/events')
  const source = sharedEvents
  const added: [string, (event: MessageEvent) => void][] = []
  return {
    on(event, handler) {
      source.addEventListener(event, handler as EventListener)
      added.push([event, handler])
    },
    onState(open, lost) {
      source.addEventListener('open', open)
      source.addEventListener('error', lost)
      added.push(['open', open as never], ['error', lost as never])
    },
    close() {
      for (const [event, handler] of added) {
        source.removeEventListener(event, handler as EventListener)
      }
    }
  }
}

// What the page was showing, kept across the reloads that bring in each change.
const KEPT = 'edit-room-state'
type Tab = 'scenes' | 'words' | 'voice' | 'notes' | 'export' | 'versions'
type Kept = { id?: string, frame?: number, tab?: Tab, playing?: boolean, toast?: string, reloading?: boolean }
function kept(): Kept {
  try {
    return JSON.parse(sessionStorage.getItem(KEPT) ?? '{}')
  } catch {
    return {}
  }
}
function keep(state: Kept) {
  try {
    sessionStorage.setItem(KEPT, JSON.stringify({ ...kept(), ...state }))
  } catch {}
}

function remembered(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function remember(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {}
}

const typing = () => {
  const active = document.activeElement
  return Boolean(active && ['TEXTAREA', 'INPUT', 'SELECT'].includes(active.tagName))
}

// ---------------------------------------------------------------------------------------------
// Time and scenes

function clock(frame: number, fps: number): string {
  const seconds = frame / fps
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, '0')}`
}

function seconds(frames: number, fps: number): string {
  return `${(frames / fps).toFixed(1)} s`
}

/** How long a scene may be made by hand at the very least: half a second (each scene has its own floor too). */
const SHORTEST = 30

/** Why a scene can't get shorter, in plain words. */
function floorReason(scene: { name: string, voice: unknown, floor: number }, fps: number): string {
  return `The shortest “${scene.name}” can be is ${seconds(scene.floor, fps)}, so ${scene.voice ? 'the narrator can finish and ' : ''}its words stay readable.`
}

type Scene = { name: string, start: number, frames: number, enter: number, voice: { line: string, text?: string, from: number, to: number } | null, number: number | null, floor: number }

function scenesOf(video: VideoDefinition): Scene[] {
  const { starts, frames, enters, voice = [], names = [], floors = [], numbers = [], cover } = video.timeline
  return starts.map((start, index) => ({
    name: names[index] ?? (cover && index === 0 ? 'Cover' : `Scene ${cover ? index : index + 1}`),
    start,
    frames: frames[index],
    enter: enters[index],
    voice: voice[index] ?? null,
    // The shortest it may be made, so its words stay readable and its narration fits.
    floor: Math.max(SHORTEST, floors[index] ?? 0),
    // The scene's own number, as written in code (from 1; the cover has none). Lengths, order and
    // transitions are kept by it, so they follow the scene wherever it's moved.
    number: numbers.length ? numbers[index] ?? null : cover ? (index === 0 ? null : index) : index + 1
  }))
}

function sceneAt(scenes: Scene[], frame: number): number {
  let index = 0
  scenes.forEach((scene, i) => {
    if (frame >= scene.start) {
      index = i
    }
  })
  return index
}

// ---------------------------------------------------------------------------------------------
// Toasts: a short confirmation in the corner, instead of text under every field.

type Toast = { id: number, tone: 'good' | 'error' | 'plain', text: string }
export let pushToast: (tone: Toast['tone'], text: string) => void = () => {}
// The last message shown, so a reload a moment later (the preview updating) shows it again
// instead of a plain "Preview updated".
let lastToast: { text: string, at: number } | null = null

function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    let next = 1
    pushToast = (tone, text) => {
      if (tone !== 'error') {
        lastToast = { text, at: Date.now() }
      }
      const id = next++
      setToasts(current => [...current.slice(-2), { id, tone, text }])
      setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), tone === 'error' ? 6000 : 2600)
    }
    const waiting = kept().toast
    if (waiting) {
      keep({ toast: undefined })
      pushToast('good', waiting)
    }
  }, [])
  return (
    <div className="toasts">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.tone === 'good' ? <Check size={15} /> : toast.tone === 'error' ? <CircleAlert size={15} /> : <Info size={15} />}
          <span>{toast.text}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// A question in the page (instead of the browser's own pop-up): ask('…', { yes: 'Delete' }) → true/false.

type Ask = { title: string, text?: string, yes: string, no: string, danger: boolean, input?: string, done: (answer: boolean, value?: string) => void }
let showAsk: (ask: Ask) => void = () => {}

function ask(title: string, { text, yes = 'OK', no = 'Cancel', danger = false }: { text?: string, yes?: string, no?: string, danger?: boolean } = {}): Promise<boolean> {
  return new Promise(done => showAsk({ title, text, yes, no, danger, done }))
}

/** A question answered in words: the text, or null when cancelled. */
function askText(title: string, { value = '', text, yes = 'Save' }: { value?: string, text?: string, yes?: string } = {}): Promise<string | null> {
  return new Promise(done => showAsk({ title, text, yes, no: 'Cancel', danger: false, input: value, done: (answer, typed) => done(answer ? (typed ?? '') : null) }))
}

function Dialog() {
  const [current, setCurrent] = useState<Ask | null>(null)
  const yes = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState('')
  useEffect(() => {
    showAsk = setCurrent
  }, [])
  useEffect(() => {
    setTyped(current?.input ?? '')
    if (current?.input !== undefined) {
      field.current?.focus()
      field.current?.select()
    } else {
      yes.current?.focus()
    }
  }, [current])
  if (!current) {
    return null
  }
  const answer = (value: boolean) => {
    setCurrent(null)
    current.done(value, typed.trim())
  }
  return (
    <div className="modal-backdrop" onMouseDown={() => answer(false)} onKeyDown={event => event.key === 'Escape' && answer(false)}>
      <div className="modal dialog" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        <strong className="dialog-title">{current.title}</strong>
        {current.text && <p className="dialog-text">{current.text}</p>}
        {current.input !== undefined && (
          <input ref={field} className="dialog-input" value={typed} maxLength={80} onChange={event => setTyped(event.target.value)} onKeyDown={event => event.key === 'Enter' && answer(true)} />
        )}
        <div className="dialog-buttons">
          <button className="secondary" onClick={() => answer(false)}>{current.no}</button>
          <button ref={yes} className={current.danger ? 'primary is-danger' : 'primary'} onClick={() => answer(true)}>{current.yes}</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Small pieces

export function Banner({ children, tone = 'plain', onClose, icon }: { children: ReactNode, tone?: 'plain' | 'warn' | 'error' | 'good', onClose?: () => void, icon?: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`}>
      <span className="banner-icon">{icon ?? (tone === 'error' || tone === 'warn' ? <CircleAlert size={16} /> : tone === 'good' ? <Check size={16} /> : <Info size={16} />)}</span>
      <div className="banner-text">{children}</div>
      {onClose && <button className="icon-button" onClick={onClose} aria-label="Hide"><X size={15} /></button>}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode, title: string, children: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}

/** A text box that saves when you leave it (or ⌘/Ctrl+Enter); Esc puts it back. */
function Field({ value, onSave, placeholder, label }: { value: string, onSave: (text: string) => Promise<void>, placeholder?: string, label?: string }) {
  const [text, setText] = useState(value)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    setText(value)
  }, [value])
  // Grow with the text, so every line shows: measured again once the fonts have loaded and when the
  // panel changes width (a box measured too early, before layout or fonts, would cut its text off).
  useEffect(() => {
    const element = box.current
    if (!element) {
      return
    }
    const fit = () => {
      element.style.height = 'auto'
      element.style.height = `${Math.max(element.scrollHeight + 2, 38)}px`
    }
    fit()
    const frame = requestAnimationFrame(fit)
    document.fonts?.ready.then(fit).catch(() => {})
    const observer = new ResizeObserver(fit)
    observer.observe(element.parentElement ?? element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [text])
  const save = async () => {
    if (text === value) {
      return
    }
    setState('saving')
    try {
      await onSave(text)
      setState('saved')
      pushToast('good', 'Saved · the preview updates in a moment')
      setTimeout(() => setState(current => (current === 'saved' ? 'idle' : current)), 2500)
    } catch (caught) {
      setState('error')
      pushToast('error', (caught as Error).message)
    }
  }
  const dirty = text !== value
  return (
    <label className={`field ${dirty ? 'is-dirty' : ''}`}>
      {label && (
        <span className="field-label">
          {label}
          <span className="field-state">
            {state === 'saving' && <LoaderCircle size={13} className="spin" />}
            {state === 'saved' && <Check size={13} />}
            {state === 'error' && <CircleAlert size={13} />}
            {state === 'idle' && dirty && <span className="dot" title="Not saved yet" />}
          </span>
        </span>
      )}
      <textarea
        ref={box}
        value={text}
        rows={1}
        placeholder={placeholder}
        onChange={event => {
          setText(event.target.value)
          setState('idle')
        }}
        onBlur={save}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            ;(event.target as HTMLTextAreaElement).blur()
          }
          if (event.key === 'Escape') {
            setText(value)
            setTimeout(() => (event.target as HTMLTextAreaElement).blur())
          }
        }}
      />
    </label>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T, options: [T, ReactNode][], onChange: (value: T) => void }) {
  return (
    <div className="segmented">
      {options.map(([option, label]) => (
        <button key={String(option)} className={option === value ? 'is-on' : ''} onClick={() => onChange(option)}>{label}</button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The timeline under the video: a ruler, the scenes, the narrator, and the playhead.

function Timeline({ video, scenes, frame, tweaks, onSeek, onTweak }: {
  video: VideoDefinition
  scenes: Scene[]
  frame: number
  tweaks: Record<string, number>
  onSeek: (frame: number) => void
  onTweak: (scene: number, extra: number) => Promise<void>
}) {
  const bar = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  // A scene's end being dragged: which scene, and by how many frames so far (snapped to 0.1 s).
  const [dragging, setDragging] = useState<{ index: number, delta: number } | null>(null)
  const grab = (event: React.MouseEvent, index: number) => {
    event.preventDefault()
    event.stopPropagation()
    const scene = scenes[index]
    const box = bar.current!.getBoundingClientRect()
    const from = event.clientX
    const snap = video.fps / 10
    let delta = 0
    document.body.classList.add('is-scrubbing')
    setDragging({ index, delta: 0 })
    const move = (next: MouseEvent) => {
      next.preventDefault()
      const frames = ((next.clientX - from) / box.width) * video.durationInFrames
      delta = Math.max(scene.floor - scene.frames, Math.round(frames / snap) * snap)
      setDragging({ index, delta })
    }
    const up = () => {
      document.body.classList.remove('is-scrubbing')
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setDragging(null)
      if (delta !== 0 && scene.number !== null) {
        const extra = tweaks[String(scene.number)] ?? 0
        onTweak(scene.number, extra + delta)
          .then(() => pushToast('good', scene.frames + delta <= scene.floor ? floorReason(scene, video.fps) : `${scene.name}: ${seconds(scene.frames + delta, video.fps)} · the preview updates in a moment`))
          .catch(caught => pushToast('error', caught.message))
      }
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
  const total = video.durationInFrames
  const length = total / video.fps
  const at = (clientX: number) => {
    const box = bar.current!.getBoundingClientRect()
    return Math.round(Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * (total - 1))
  }
  // Zoom: 1 fits the whole video; closer, the timeline scrolls sideways and follows the playhead.
  const scroller = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [visible, setVisible] = useState(800)
  useEffect(() => {
    const element = scroller.current
    if (!element) {
      return
    }
    const observer = new ResizeObserver(() => setVisible(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  // The most it zooms: about 120 pixels a second, so even a short scene is easy to grab.
  const most = Math.max(1, Math.ceil((length * 120) / Math.max(1, visible)))
  const zoomTo = (next: number) => {
    const clamped = Math.min(most, Math.max(1, next))
    setZoom(clamped)
    // Keep the playhead in view at the new zoom.
    requestAnimationFrame(() => {
      const element = scroller.current
      if (element) {
        element.scrollLeft = (frame / total) * element.scrollWidth - element.clientWidth / 2
      }
    })
  }
  useEffect(() => {
    const element = scroller.current
    if (!element || zoom === 1) {
      return
    }
    const x = (frame / total) * element.scrollWidth
    if (x < element.scrollLeft + 40 || x > element.scrollLeft + element.clientWidth - 40) {
      element.scrollLeft = x - element.clientWidth / 3
    }
  }, [frame, zoom, total])
  // Ticks spaced by what fits: a small one at least 10 px apart, a labelled one at least 60 px.
  const perSecond = (visible * zoom) / Math.max(length, 0.1)
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  const minor = steps.find(step => step * perSecond >= 10) ?? 300
  const major = steps.find(step => step >= minor && step % minor === 0 && step * perSecond >= 60) ?? 300
  const ticks = Array.from({ length: Math.floor(length / minor) + 1 }, (_, index) => Math.round(index * minor * 100) / 100)
  const label = (second: number) => (length >= 60 ? `${Math.floor(second / 60)}:${String(Math.round(second % 60)).padStart(2, '0')}` : `${second}s`)
  const current = sceneAt(scenes, frame)
  const hasVoice = scenes.some(scene => scene.voice)
  // Rows: the ruler, the scenes, and the narrator when there is one.
  const rows = { gridTemplateRows: hasVoice ? '22px 38px 24px' : '22px 38px' }
  return (
    <div className="timeline">
      <div className="timeline-labels" style={rows}>
        <span className="zoom">
          <button onClick={() => zoomTo(zoom / 1.6)} disabled={zoom <= 1} title="Zoom out (⌘/Ctrl + scroll)"><Minus size={12} /></button>
          <button onClick={() => zoomTo(1)} disabled={zoom === 1} title="See the whole video">Fit</button>
          <button onClick={() => zoomTo(zoom * 1.6)} disabled={zoom >= most} title="Zoom in (⌘/Ctrl + scroll)"><Plus size={12} /></button>
        </span>
        <span><Clapperboard size={13} /> Scenes</span>
        {hasVoice && <span><Mic size={13} /> Narrator</span>}
      </div>
      <div
        className="timeline-scroll"
        ref={scroller}
        onWheel={event => {
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault()
            zoomTo(zoom * (event.deltaY < 0 ? 1.25 : 0.8))
          }
        }}
      >
      <div
        className="timeline-body"
        style={{ ...rows, width: `${zoom * 100}%` }}
        ref={bar}
        onMouseMove={event => setHover(at(event.clientX))}
        onMouseLeave={() => setHover(null)}
        onMouseDown={event => {
          // No text selection while scrubbing, even when the mouse wanders over the page.
          event.preventDefault()
          window.getSelection()?.removeAllRanges()
          document.body.classList.add('is-scrubbing')
          onSeek(at(event.clientX))
          const move = (next: MouseEvent) => {
            next.preventDefault()
            onSeek(at(next.clientX))
          }
          const up = () => {
            document.body.classList.remove('is-scrubbing')
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
          }
          window.addEventListener('mousemove', move)
          window.addEventListener('mouseup', up)
        }}
      >
        <div className="ruler">
          {ticks.map(second => (
            <span key={second} className={Math.abs(second / major - Math.round(second / major)) < 1e-6 ? 'tick is-major' : 'tick'} style={{ left: `${((second * video.fps) / total) * 100}%` }}>
              {Math.abs(second / major - Math.round(second / major)) < 1e-6 && <em>{label(second)}</em>}
            </span>
          ))}
        </div>
        <div className="track track-scenes">
          {scenes.map((scene, index) => {
            // Each block runs to where the next scene starts; the overlap is the transition.
            const end = scenes[index + 1]?.start ?? total
            const delta = dragging?.index === index ? dragging.delta : 0
            return (
              <div
                key={index}
                className={`clip ${index === current ? 'is-current' : ''} ${dragging?.index === index ? 'is-dragging' : ''}`}
                title={`${scene.name} · ${seconds(scene.frames, video.fps)}`}
                style={{ left: `${(scene.start / total) * 100}%`, width: `${((end + delta - scene.start) / total) * 100}%` }}
              >
                <span>{scene.name}</span>
                {scene.number !== null && (
                  <i
                    className="clip-handle"
                    title={`Drag to make “${scene.name}” longer or shorter`}
                    onMouseDown={event => grab(event, index)}
                  />
                )}
              </div>
            )
          })}
        </div>
        {hasVoice && (
          <div className="track track-voice">
            {scenes.map((scene, index) => scene.voice && (
              <div key={index} className="voice-clip" style={{ left: `${(scene.voice.from / total) * 100}%`, width: `${((scene.voice.to - scene.voice.from) / total) * 100}%` }}>
                <span>{scene.voice.text || scene.voice.line}</span>
              </div>
            ))}
          </div>
        )}
        <div className="playhead" style={{ left: `${(frame / total) * 100}%` }}><i /></div>
        {dragging && (() => {
          const scene = scenes[dragging.index]
          const end = (scenes[dragging.index + 1]?.start ?? total) + dragging.delta
          return (
            <div className="drag-line" style={{ left: `${(end / total) * 100}%` }}>
              <span>
                {scene.name}: {seconds(scene.frames, video.fps)} → <strong>{seconds(scene.frames + dragging.delta, video.fps)}</strong>
                {scene.frames + dragging.delta <= scene.floor && <em> · shortest so it stays readable</em>}
              </span>
            </div>
          )
        })()}
        {hover !== null && !dragging && (
          <div className="hover-line" style={{ left: `${(hover / total) * 100}%` }}>
            <span>{clock(hover, video.fps)} · {scenes[sceneAt(scenes, hover)].name}</span>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The strip of scenes along the bottom: a picture of each at its fullest moment, its number, name
// and length. Click one to go there.

/** Pictures cost a drawing of the video each; a long video gets plain cards instead. */
const MOST_PICTURES = 14

/** Moving, duplicating, hiding and bringing back scenes, as changes to the video's arrangement. */
function arrangeTools(scenes: Scene[], catalog: VideoDefinition['timeline']['catalog'], onArrange: (change: Arrange, label: string) => void) {
  const order = scenes.map(scene => scene.number).filter((number): number is number => number !== null)
  const hidden = catalog.filter(entry => entry.hidden).map(entry => entry.number)
  const offset = scenes.length - order.length
  const nameOf = (number: number) => catalog.find(entry => entry.number === number)?.name ?? `Scene ${number}`
  return {
    order,
    hidden,
    changed: catalog.length > 0 && (hidden.length > 0 || order.join() !== catalog.map(entry => entry.number).filter(number => !hidden.includes(number)).join()),
    move(from: number, to: number) {
      const next = [...order]
      const [moved] = next.splice(from - offset, 1)
      next.splice(Math.max(0, to - offset), 0, moved)
      onArrange({ order: next }, `Moved “${nameOf(moved)}”`)
    },
    duplicate(index: number) {
      const next = [...order]
      next.splice(index - offset + 1, 0, next[index - offset])
      onArrange({ order: next }, `Duplicated “${nameOf(next[index - offset])}”`)
    },
    hide(index: number) {
      const number = order[index - offset]
      // A copy is taken out of the order; the scene itself is hidden (and can be brought back).
      if (order.filter(other => other === number).length > 1) {
        const next = [...order]
        next.splice(index - offset, 1)
        onArrange({ order: next }, `Deleted a copy of “${nameOf(number)}”`)
      } else if (order.length > 1) {
        onArrange({ hidden: [...hidden, number] }, `Hid “${nameOf(number)}”`)
      } else {
        pushToast('plain', 'A video needs at least one scene.')
      }
    },
    show(number: number) {
      // Back where it was: after the last shown scene that came before it in code.
      const next = order.filter(other => other !== number)
      const after = next.reduce((spot, other, position) => (other < number ? position + 1 : spot), 0)
      next.splice(after, 0, number)
      onArrange({ hidden: hidden.filter(other => other !== number), order: next }, `Brought back “${nameOf(number)}”`)
    },
    reset() {
      onArrange({ order: null, hidden: [] }, 'Back to the original order')
    }
  }
}

function Filmstrip({ video, scenes, current, onPick, onArrange }: { video: VideoDefinition, scenes: Scene[], current: number, onPick: (index: number) => void, onArrange: (change: Arrange, label: string) => void }) {
  const strip = useRef<HTMLDivElement>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  useEffect(() => {
    strip.current?.querySelector('.film.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [current])
  const catalog = video.timeline.catalog ?? []
  const tools = arrangeTools(scenes, catalog, onArrange)
  const pictures = scenes.length <= MOST_PICTURES
  const height = 74
  const width = Math.round((height * video.width) / video.height)
  return (
    <div className="filmstrip" ref={strip}>
      {scenes.map((scene, index) => {
        const movable = scene.number !== null
        return (
          <div
            key={`${scene.number}-${index}`}
            className={`film ${index === current ? 'is-current' : ''} ${dragged === index ? 'is-dragged' : ''} ${over === index && dragged !== null && dragged !== index ? (dragged < index ? 'drop-after' : 'drop-before') : ''}`}
            draggable={movable}
            onDragStart={event => {
              setDragged(index)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', String(index))
            }}
            onDragOver={event => {
              if (dragged !== null && movable) {
                event.preventDefault()
                setOver(index)
              }
            }}
            onDragLeave={() => setOver(current => (current === index ? null : current))}
            onDrop={event => {
              event.preventDefault()
              if (dragged !== null && dragged !== index && movable) {
                tools.move(dragged, index)
              }
              setDragged(null)
              setOver(null)
            }}
            onDragEnd={() => {
              setDragged(null)
              setOver(null)
            }}
          >
            <button className="film-main" onClick={() => onPick(index)} title={movable ? `${scene.name} · ${seconds(scene.frames, video.fps)} · drag to move it` : `${scene.name} · ${seconds(scene.frames, video.fps)}`}>
              <span className="film-picture" style={{ width, height }}>
                {pictures && (
                  <Thumbnail
                    component={video.component}
                    compositionWidth={video.width}
                    compositionHeight={video.height}
                    durationInFrames={video.durationInFrames}
                    fps={video.fps}
                    frameToDisplay={Math.min(scene.start + scene.frames - 1, scene.start + scene.enter + Math.round((scene.frames - scene.enter) * 0.55))}
                    style={{ width, height }}
                  />
                )}
                {!pictures && <span className="film-name">{scene.name}</span>}
                <span className="film-number">{scene.number ?? '·'}</span>
                {movable && <span className="film-grip"><GripVertical size={13} /></span>}
              </span>
              <span className="film-label"><strong>{scene.name}</strong> {seconds(scene.frames, video.fps)}</span>
            </button>
            {movable && (
              <span className="film-tools">
                <button title="Duplicate this scene" onClick={() => tools.duplicate(index)}><Copy size={13} /></button>
                {tools.order.filter(number => number === scene.number).length > 1
                  ? <button title="Delete this copy" className="danger" onClick={() => tools.hide(index)}><Trash2 size={13} /></button>
                  : <button title="Hide this scene (you can bring it back)" onClick={() => tools.hide(index)}><EyeOff size={13} /></button>}
              </span>
            )}
          </div>
        )
      })}
      {catalog.filter(entry => entry.hidden).map(entry => (
        <div key={`hidden-${entry.number}`} className="film is-hidden">
          <button className="film-main" onClick={() => tools.show(entry.number)} title="Hidden: click to bring it back">
            <span className="film-picture film-placeholder" style={{ width, height }}>
              <EyeOff size={16} />
              <span className="film-number">{entry.number}</span>
            </span>
            <span className="film-label"><strong>{entry.name}</strong> hidden</span>
          </button>
          <span className="film-tools is-shown"><button title="Bring it back" onClick={() => tools.show(entry.number)}><Eye size={13} /></button></span>
        </div>
      ))}
      {tools.changed && (
        <div className="film-reset">
          <button className="pill-button" onClick={() => tools.reset()} title="Every scene back, in the order it was made"><RotateCcw size={13} /> Original order</button>
        </div>
      )}
    </div>
  )
}

/** The video's saved versions: go back to any of them. Each step back is itself undoable. */
function VersionsPanel({ video, onUndo }: { video: VideoDefinition, onUndo: () => void }) {
  const [data, setData] = useState<Versions | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    api<Versions>(`/api/versions?video=${video.id}`).then(setData).catch(caught => setError(caught.message))
  }, [video])
  const back = async (version: Version) => {
    if (!await ask('Go back to this version?', { text: `The video goes back to how it was before: ${version.label}. You can undo this too.`, yes: 'Go back' })) {
      return
    }
    try {
      await api('/api/versions/restore', { video: video.id, id: version.id })
      pushToast('good', `Went back to before: ${version.label}`)
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    }
  }
  return (
    <div className="tab">
      <p className="lead">Every change you or Claude make saves how the video was just before it. Go back to any of them; going back is saved too, so it can be undone.</p>
      <button className="secondary wide-secondary" onClick={onUndo}><Undo2 size={15} /> Undo the last change</button>
      {error && <Banner tone="error">{error}</Banner>}
      {data && data.versions.length === 0 && (
        <Empty icon={<Clock size={22} />} title="No versions yet">A version is saved before each change, from the first one you make.</Empty>
      )}
      <ol className="versions">
        {data?.versions.map(version => (
          <li key={version.id} className={`version ${version.kind === 'restore' ? 'is-restore' : ''} ${data.cursor === version.id ? 'is-cursor' : ''}`}>
            <span className={`version-who who-${version.who}`}>{version.who === 'claude' ? <Sparkles size={12} /> : <span>You</span>}</span>
            <span className="version-body">
              <span className="version-label">{version.kind === 'restore' ? version.label : `Before: ${version.label}`}</span>
              <span className="version-time">{timeAgo(version.at)} · {new Date(version.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            <button className="pill-button" onClick={() => back(version)}>Go back</button>
          </li>
        ))}
      </ol>
      {data && <p className="footnote">Kept for {data.keepDays} days, the last {data.keep} changes; older ones are deleted automatically. Changes to things every video shares (the video tools themselves) aren't part of a version.</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Tabs

/** A scene's length in seconds, typed directly: Enter or leaving the box sets it, Esc puts it back. */
function LengthInput({ frames, fps, changed, floor, reason, onSet }: { frames: number, fps: number, changed: boolean, floor: number, reason: string, onSet: (frames: number) => void }) {
  const shown = (frames / fps).toFixed(1)
  const [text, setText] = useState(shown)
  useEffect(() => {
    setText(shown)
  }, [shown])
  const commit = () => {
    const value = Number(text.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setText(shown)
      pushToast('error', 'Type a length in seconds, like 4.5')
      return
    }
    const wanted = Math.round(value * fps)
    const target = Math.max(floor, wanted)
    if (wanted < floor) {
      pushToast('plain', reason)
      setText((target / fps).toFixed(1))
    }
    if (target !== frames) {
      onSet(target)
    }
  }
  return (
    <label className={`length ${changed ? 'is-changed' : ''}`} title="Type a length in seconds">
      <input
        value={text}
        inputMode="decimal"
        onChange={event => setText(event.target.value)}
        onFocus={event => event.target.select()}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            ;(event.target as HTMLInputElement).blur()
          }
          if (event.key === 'Escape') {
            setText(shown)
            setTimeout(() => (event.target as HTMLInputElement).blur())
          }
        }}
      />
      <span>s</span>
    </label>
  )
}

function ScenesTab({ video, scenes, frame, tweaks, onSeek, onTweak, onNote, onArrange }: {
  video: VideoDefinition
  scenes: Scene[]
  frame: number
  tweaks: Record<string, number>
  onSeek: (frame: number) => void
  onTweak: (scene: number, extra: number) => Promise<void>
  onNote: (scene: number) => void
  onArrange: (change: Arrange, label: string) => void
}) {
  const catalog = video.timeline.catalog ?? []
  const tools = arrangeTools(scenes, catalog, onArrange)
  const chosen = Object.fromEntries(catalog.filter(entry => entry.transition).map(entry => [String(entry.number), entry.transition as string]))
  const current = sceneAt(scenes, frame)
  const half = Math.round(video.fps / 2)
  const tweak = (scene: number, extra: number) => onTweak(scene, extra).catch(caught => pushToast('error', caught.message))
  return (
    <div className="tab">
      <p className="lead">Click a scene to jump to it. Change how long it holds with − and +, by typing a length, or by dragging the end of its block on the timeline; the preview updates by itself.</p>
      <ol className="scene-list">
        {scenes.map((scene, index) => {
          const extra = scene.number ? tweaks[String(scene.number)] ?? 0 : 0
          return (
            <li key={index} className={`scene-card ${index === current ? 'is-current' : ''}`}>
              <button className="scene-main" onClick={() => onSeek(scene.start)}>
                <span className="scene-number">{scene.number ?? '·'}</span>
                <span className="scene-body">
                  <span className="scene-name">{scene.name}</span>
                  <span className="scene-meta">Starts at {clock(scene.start, video.fps)}</span>
                  {scene.number !== null && (
                    <span className="scene-transition" onClick={event => event.stopPropagation()}>
                      Comes in with
                      <select
                        value={chosen[String(scene.number)] ?? ''}
                        onChange={event => {
                          const enter = { ...chosen }
                          if (event.target.value) {
                            enter[String(scene.number)] = event.target.value
                          } else {
                            delete enter[String(scene.number)]
                          }
                          onArrange({ enter }, `Transition into “${scene.name}”`)
                        }}
                      >
                        {TRANSITION_NAMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </span>
                  )}
                  {scene.voice && <span className="scene-voice"><Mic size={12} /> “{scene.voice.text || scene.voice.line}”</span>}
                </span>
              </button>
              <div className="scene-side">
                {scene.number !== null
                  ? (
                      <div className="stepper" title="How long this scene holds">
                        <button
                          onClick={() => {
                            if (scene.frames <= scene.floor) {
                              pushToast('plain', floorReason(scene, video.fps))
                              return
                            }
                            tweak(scene.number!, extra - Math.min(half, scene.frames - scene.floor))
                          }}
                          aria-label="Half a second shorter"
                          className={scene.frames <= scene.floor ? 'is-floor' : ''}
                          title={scene.frames <= scene.floor ? `As short as it can be (${seconds(scene.floor, video.fps)})` : 'Half a second shorter'}
                        >
                          <Minus size={13} />
                        </button>
                        <LengthInput
                          frames={scene.frames}
                          fps={video.fps}
                          changed={extra !== 0}
                          floor={scene.floor}
                          reason={floorReason(scene, video.fps)}
                          onSet={target => tweak(scene.number!, extra + (target - scene.frames))}
                        />
                        <button onClick={() => tweak(scene.number!, extra + half)} aria-label="Half a second longer"><Plus size={13} /></button>
                      </div>
                    )
                  : <span className="scene-fixed">{seconds(scene.frames, video.fps)}</span>}
                <div className="scene-tools">
                  {extra !== 0 && (
                    <button className="icon-button" title={`Back to its own length (${extra > 0 ? '+' : '−'}${seconds(Math.abs(extra), video.fps)} by you)`} onClick={() => tweak(scene.number!, 0)}>
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {scene.number !== null && <button className="icon-button" title="Duplicate this scene" onClick={() => tools.duplicate(index)}><Copy size={14} /></button>}
                  {scene.number !== null && (tools.order.filter(number => number === scene.number).length > 1
                    ? <button className="icon-button danger" title="Delete this copy" onClick={() => tools.hide(index)}><Trash2 size={14} /></button>
                    : <button className="icon-button" title="Hide this scene (bring it back from the strip below)" onClick={() => tools.hide(index)}><EyeOff size={14} /></button>)}
                  <button className="icon-button" title="Leave a note on this scene" onClick={() => onNote(index)}><MessageSquare size={14} /></button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="footnote">Lengths apply to every language and shape of this video. Each scene has a shortest length, about three quarters of its own and never less than its narration needs, so its words stay readable: the editor stops there and tells you.</p>
    </div>
  )
}

function WordsTab({ folder, language }: { folder: Folder | undefined, language: string | null }) {
  const [words, setWords] = useState<Word[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  useEffect(() => {
    if (folder?.content) {
      api<{ words: Word[] }>(`/api/words?folder=${folder.folder}`).then(data => setWords(data.words)).catch(caught => setError(caught.message))
    }
  }, [folder])
  if (!folder?.content) {
    return (
      <div className="tab">
        <Empty icon={<Type size={22} />} title="These words can't be edited here">
          This video keeps its words inside its scenes rather than in one words file. Leave a note for Claude instead: “Change ‘…’ to ‘…’ in the third scene”.
        </Empty>
      </div>
    )
  }
  if (!words) {
    return <div className="tab"><p className="lead">{error || 'Reading the words…'}</p></div>
  }
  // A video in several languages keeps each language's words apart: show this one's.
  const languages = new Set(words.map(word => word.path.split('.')[1]).filter(part => /^[a-z]{2}(-[A-Z]{2})?$/.test(part ?? '')))
  const skip = languages.size ? 2 : 1
  const shown = words.filter(word => !language || languages.size === 0 || word.path.split('.')[1] === language)
    .filter(word => !filter || word.text.toLowerCase().includes(filter.toLowerCase()))
  const human = (part: string) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').toLowerCase())
  // Grouped by their first part (usually a scene: "hook", "promises", "end").
  const groups = new Map<string, Word[]>()
  for (const word of shown) {
    const parts = word.path.split('.').slice(skip)
    const group = parts.length > 1 ? parts[0] : 'general'
    groups.set(group, [...(groups.get(group) ?? []), word])
  }
  return (
    <div className="tab">
      <p className="lead">Every word on screen. Change one and click outside it to save (⌘/Ctrl+Enter works too; Esc undoes).</p>
      <div className="search">
        <Search size={15} />
        <input placeholder="Find a word…" value={filter} onChange={event => setFilter(event.target.value)} />
        {filter && <button className="icon-button" onClick={() => setFilter('')} aria-label="Clear"><X size={14} /></button>}
      </div>
      {error && <Banner tone="error" onClose={() => setError('')}>{error}</Banner>}
      {[...groups].map(([group, items]) => (
        <section key={group} className="word-group">
          <h3>{human(group)}</h3>
          {items.map(word => {
            const parts = word.path.split('.').slice(skip)
            return (
              <Field
                key={`${word.path}-${word.start}`}
                label={(parts.length > 1 ? parts.slice(1) : parts).map(human).join(' › ')}
                value={word.text}
                onSave={async text => {
                  const data = await api<{ words: Word[] }>('/api/words', { folder: folder.folder, start: word.start, end: word.end, old: word.text, text })
                  setWords(data.words)
                }}
              />
            )
          })}
        </section>
      ))}
      {shown.length === 0 && <p className="footnote">No words match “{filter}”.</p>}
      <p className="footnote">Text stays on screen as long as it takes to read, so longer text makes its scene a little longer. Keep headings short: they're big.</p>
    </div>
  )
}

const VOICES: [string, string][] = [
  ['af_heart', 'Heart · warm, clear · American'],
  ['af_bella', 'Bella · bright · American'],
  ['af_nicole', 'Nicole · soft, close · American'],
  ['am_michael', 'Michael · calm, friendly · American'],
  ['am_fenrir', 'Fenrir · deep · American'],
  ['am_puck', 'Puck · lively · American'],
  ['bf_emma', 'Emma · poised · British'],
  ['bm_george', 'George · measured · British']
]

function VoiceTab({ folder, recording }: { folder: Folder | undefined, recording: boolean }) {
  const [script, setScript] = useState<VoiceScript | null>(null)
  const [draft, setDraft] = useState<VoiceScript | null>(null)
  const [recorded, setRecorded] = useState<Record<string, { src: string, duration: number }>>({})
  const [spelling, setSpelling] = useState<Record<string, boolean>>({})
  const [playingLine, setPlayingLine] = useState<string | null>(null)
  const load = useCallback(() => {
    if (!folder?.voice) {
      return
    }
    api<{ script: VoiceScript }>(`/api/voice?folder=${folder.folder}`).then(data => {
      setScript(data.script)
      setDraft(data.script)
    }).catch(caught => pushToast('error', caught.message))
    fetch(`/voice/${folder.folder}/voice.json`, { cache: 'no-store' }).then(response => (response.ok ? response.json() : { lines: {} })).then(data => setRecorded(data.lines ?? {})).catch(() => {})
  }, [folder])
  useEffect(load, [load])
  useEffect(() => {
    if (!recording) {
      load()
    }
  }, [recording, load])
  if (!folder?.voice) {
    return (
      <div className="tab">
        <Empty icon={<Mic size={22} />} title="No narrator in this video">
          To add a voice that tells the story, leave a note for Claude or ask for <code>/video-kit:voiceover</code>.
        </Empty>
      </div>
    )
  }
  if (!script || !draft) {
    return <div className="tab"><p className="lead">Reading the voice lines…</p></div>
  }
  const changed = JSON.stringify(script) !== JSON.stringify(draft)
  const setLine = (id: string, change: Partial<VoiceLine>) => setDraft({ ...draft, lines: draft.lines.map(line => (line.id === id ? { ...line, ...change } : line)) })
  const listen = (id: string) => {
    const audio = new Audio(`/${recorded[id].src}?t=${Date.now()}`)
    setPlayingLine(id)
    audio.onended = () => setPlayingLine(null)
    audio.play().catch(() => setPlayingLine(null))
  }
  return (
    <div className="tab tab-with-footer">
      <p className="lead">What the narrator says, line by line. Change the words, the voice or its pace, then record again: a few seconds a line, on this computer.</p>
      {recording && <Banner tone="warn" icon={<LoaderCircle size={16} className="spin" />}>Recording the voice… The preview updates when it's done.</Banner>}
      <div className="card voice-settings">
        <label className="field">
          <span className="field-label">Voice</span>
          <select value={draft.voice} onChange={event => setDraft({ ...draft, voice: event.target.value })}>
            {!VOICES.some(([id]) => id === draft.voice) && <option value={draft.voice}>{draft.voice}</option>}
            {VOICES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Pace <em>{(draft.speed ?? 1).toFixed(2)}×</em></span>
          <input type="range" min={0.9} max={1.1} step={0.05} value={draft.speed ?? 1} onChange={event => setDraft({ ...draft, speed: Number(event.target.value) })} />
          <span className="range-ends"><span>Slower</span><span>Faster</span></span>
        </label>
      </div>
      {draft.lines.map((line, index) => (
        <div key={line.id} className="card voice-line">
          <div className="voice-line-head">
            <span className="voice-index">{index + 1}</span>
            <span className="field-label">{line.id}</span>
            <div className="spacer" />
            {recorded[line.id] && (
              <button className="pill-button" onClick={() => listen(line.id)} disabled={playingLine === line.id}>
                {playingLine === line.id ? <Volume2 size={13} /> : <Play size={13} />} {recorded[line.id].duration.toFixed(1)} s
              </button>
            )}
          </div>
          <textarea rows={2} value={line.text} onChange={event => setLine(line.id, { text: event.target.value })} />
          {spelling[line.id] || line.say
            ? <input className="say" placeholder="How to say it, spelled as it sounds: “steel it”" value={line.say ?? ''} onChange={event => setLine(line.id, { say: event.target.value })} />
            : <button className="link-button" onClick={() => setSpelling({ ...spelling, [line.id]: true })}>A word sounds wrong? Spell how to say it</button>}
        </div>
      ))}
      <p className="footnote">The voices speak English only. A longer line makes its scene longer: the video is timed to the voice.</p>
      <div className={`sticky-footer ${changed || recording ? 'is-shown' : ''}`}>
        <span>{recording ? 'Recording…' : 'You have changes to record'}</span>
        <div className="spacer" />
        {changed && !recording && <button className="ghost-button" onClick={() => setDraft(script)}>Undo</button>}
        <button
          className="primary"
          disabled={!changed || recording}
          onClick={async () => {
            try {
              await api('/api/voice', { folder: folder.folder, script: draft })
              pushToast('plain', 'Recording the voice…')
            } catch (caught) {
              pushToast('error', (caught as Error).message)
            }
          }}
        >
          {recording ? <LoaderCircle size={15} className="spin" /> : <Mic size={15} />} Record again
        </button>
      </div>
    </div>
  )
}

// Short labels for notes people often write; a click adds the whole sentence.
const QUICK = [
  ['Too fast to read', 'This part is too fast to read.'],
  ['Punchier', 'Make this punchier.'],
  ['Hold longer', 'Hold this a little longer.'],
  ['Different screen', 'Show a different screen here.'],
  ['New words…', 'Change the words here to: ']
]

function Answer({ onSend }: { onSend: (answer: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) {
    return <p className="footnote">Answer sent.</p>
  }
  const send = () => text.trim() && onSend(text.trim()).then(() => setSent(true)).catch(caught => pushToast('error', caught.message))
  return (
    <div className="answer">
      <input placeholder="Your answer…" value={text} onChange={event => setText(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} />
      <button className="primary small" disabled={!text.trim()} onClick={send}><Send size={13} /></button>
    </div>
  )
}

const STATUS: Record<Note['status'], [string, ReactNode]> = {
  new: ['Waiting for Claude', <span key="new" className="dot" />],
  working: ['Claude is on it', <LoaderCircle key="working" size={12} className="spin" />],
  done: ['Done', <Check key="done" size={12} />],
  question: ['Claude asks', <MessageSquare key="question" size={12} />]
}

function NotesTab({ video, scenes, frame, notes, listening, preset, onSeek, onPresetUsed, onNotes }: {
  video: VideoDefinition
  scenes: Scene[]
  frame: number
  notes: Note[]
  listening: boolean
  preset: number | null
  onSeek: (frame: number) => void
  onPresetUsed: () => void
  onNotes: (notes: Note[]) => void
}) {
  const [text, setText] = useState('')
  const [scope, setScope] = useState<'moment' | 'scene' | 'video'>('moment')
  // A scene picked from the Scenes tab, kept until another scope is chosen.
  const [chosen, setChosen] = useState<number | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (preset !== null) {
      setScope('scene')
      setChosen(preset)
      box.current?.focus()
      onPresetUsed()
    }
  }, [preset, onPresetUsed])
  const index = scope === 'scene' && chosen !== null ? chosen : sceneAt(scenes, frame)
  const scene = scenes[index]
  const send = async () => {
    if (!text.trim()) {
      return
    }
    try {
      const where = scope === 'video'
        ? {}
        : { scene: scene.number, sceneName: scene.name, frame: scope === 'moment' ? frame : scene.start, time: clock(scope === 'moment' ? frame : scene.start, video.fps) }
      const data = await api<{ notes: Note[] }>('/api/notes', { video: video.id, text, ...where })
      onNotes(data.notes)
      setText('')
      pushToast('good', listening ? 'Sent to Claude' : 'Saved for Claude')
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    }
  }
  const mine = notes.filter(note => note.video === video.id || !note.video)
  const thread = useRef<HTMLDivElement>(null)
  // The conversation reads top to bottom, newest at the bottom, like a chat.
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: 'smooth' })
  }, [mine.length, mine.at(-1)?.status])
  return (
    <div className="tab tab-chat">
      <div className={`listening ${listening ? 'is-on' : ''}`}>
        <span className="pulse" />
        {listening
          ? <span><strong>Claude is listening.</strong> Notes are picked up within seconds; the preview updates when the change is made.</span>
          : <span><strong>Claude isn't listening right now.</strong> Your notes are saved: back in Claude Code, say “apply my notes”.</span>}
      </div>
      <div className="thread" ref={thread}>
        {mine.length === 0 && (
          <Empty icon={<MessageSquare size={22} />} title="No notes yet">
            Pause on the moment you want changed and describe it below. Claude makes the change and the preview updates.
          </Empty>
        )}
        {mine.map(note => (
          <div key={note.id} className={`note note-${note.status}`}>
            <div className="note-head">
              <span className="status-pill">{STATUS[note.status][1]} {STATUS[note.status][0]}</span>
              {note.frame !== null
                ? <button className="link-button" onClick={() => onSeek(note.frame!)}>{note.time}{note.sceneName ? ` · ${note.sceneName}` : ''}</button>
                : <span className="footnote">Whole video</span>}
              <div className="spacer" />
              {note.status === 'new' && (
                <button className="icon-button" title="Remove this note" onClick={() => api<{ notes: Note[] }>('/api/notes/remove', { id: note.id }).then(data => onNotes(data.notes))}><X size={14} /></button>
              )}
            </div>
            <p className="note-text">{note.text}</p>
            {note.reply && (
              <div className="reply">
                <span className="reply-from"><Sparkles size={12} /> Claude</span>
                <p>{note.reply}</p>
              </div>
            )}
            {note.status === 'question' && (
              <Answer
                onSend={async answer => {
                  const data = await api<{ notes: Note[] }>('/api/notes', {
                    video: note.video,
                    scene: note.scene,
                    sceneName: note.sceneName,
                    frame: note.frame,
                    time: note.time,
                    text: `About note ${note.id} (“${note.text}”), Claude asked: “${note.reply}” My answer: ${answer}`
                  })
                  onNotes(data.notes)
                }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="composer">
        <Segmented
          value={scope}
          onChange={value => {
            setScope(value)
            setChosen(null)
          }}
          options={[
            ['moment', `At ${clock(frame, video.fps)}`],
            ['scene', scene.name],
            ['video', 'Whole video']
          ]}
        />
        <div className="chips quick-chips">
          {QUICK.map(([label, quick]) => <button key={label} className="chip" onClick={() => setText(current => (current ? `${current} ${quick}` : quick))}>{label}</button>)}
        </div>
        <div className="composer-box">
          <textarea
            ref={box}
            rows={3}
            value={text}
            placeholder="What should change? e.g. “Hold the headline a second longer, then bring the card in from the right.”"
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                send()
              }
            }}
          />
          <div className="composer-foot">
            <span className="footnote">⌘/Ctrl+Enter to send</span>
            <button className="primary" disabled={!text.trim()} onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SAVED_TO = 'edit-room-export-to'

/** Where the finished files go: the video's folder, Downloads, the Desktop, or a folder they pick. */
function SaveTo({ value, onChange, disabled }: { value: Destination, onChange: (value: Destination) => void, disabled: boolean }) {
  const [places, setPlaces] = useState<Places | null>(null)
  const [picking, setPicking] = useState(false)
  useEffect(() => {
    api<Places>('/api/places').then(setPlaces).catch(() => {})
  }, [])
  const home = (path: string) => path.replace(/^\/(Users|home)\/[^/]+/, '~').replace(/^[A-Z]:\\Users\\[^\\]+/, '~')
  const choose = async () => {
    setPicking(true)
    try {
      const { path } = await api<{ path: string | null }>('/api/pick-folder', {})
      if (path) {
        onChange({ kind: 'custom', path })
      }
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    } finally {
      setPicking(false)
    }
  }
  const pick = (kind: Destination['kind']) => {
    if (kind === 'custom') {
      choose()
    } else if (places) {
      onChange({ kind, path: places[kind].path })
    }
  }
  return (
    <div className="save-to">
      <span className="field-label">Save to</span>
      <div className="places">
        {([['video', 'Video folder'], ['downloads', 'Downloads'], ['desktop', 'Desktop'], ['custom', picking ? 'Choosing…' : 'Choose…']] as [Destination['kind'], string][])
          .filter(([kind]) => kind === 'video' || kind === 'custom' || places?.[kind as 'downloads']?.exists !== false)
          .map(([kind, label]) => (
            <button key={kind} className={`place ${value.kind === kind ? 'is-on' : ''}`} disabled={disabled || picking} onClick={() => pick(kind)}>
              {kind === 'custom' ? <FolderOpen size={14} /> : null}{label}
            </button>
          ))}
      </div>
      {picking && (
        <p className="footnote picking">
          A folder window has opened. If you don't see it, it may be behind this browser window: look in the taskbar or the Dock.
        </p>
      )}
      <input
        className="path"
        value={value.kind === 'video' ? home(places?.video.path ?? 'video/out') : value.path}
        disabled={disabled || value.kind === 'video'}
        onChange={event => onChange({ kind: 'custom', path: event.target.value })}
        spellCheck={false}
        title="The folder the finished files are copied to. You can type a path here."
      />
    </div>
  )
}

function ExportTab({ video, state, onStart, onState }: { video: VideoDefinition, state: ExportState, onStart: (mode: ExportMode, to: string | null) => Promise<void>, onState: (state: ExportState) => void }) {
  const [mode, setMode] = useState<ExportMode>('quick')
  const [to, setTo] = useState<Destination>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_TO) ?? '') as Destination
    } catch {
      return { kind: 'video', path: '' }
    }
  })
  const choose = (next: Destination) => {
    setTo(next)
    try {
      localStorage.setItem(SAVED_TO, JSON.stringify(next))
    } catch {}
  }
  const percent = Number(/^(\d+)%/.exec(state.progress ?? '')?.[1] ?? 0)
  const finished = !state.running && state.code === 0 && state.id
  const bin = navigator.platform.startsWith('Win') ? 'Recycle Bin' : 'Trash'
  const remove = async (files: string[]) => {
    const names = files.map(file => file.split(/[\\/]/).pop()).join(', ')
    if (!await ask(files.length > 1 ? `Delete all ${files.length} files of this export?` : `Delete ${names}?`, { text: `They go to the ${bin}, so you can still get them back from there.`, yes: 'Delete', danger: true })) {
      return
    }
    try {
      onState(await api<ExportState>('/api/trash', { files }))
      pushToast('good', `Moved to the ${bin}: you can still get ${files.length > 1 ? 'them' : 'it'} back from there`)
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    }
  }
  const failed = !state.running && typeof state.code === 'number' && state.code !== 0
  const detail = (state.progress ?? '').replace(/^\d+%\s*·\s*/, '')
  return (
    <div className="tab">
      <p className="lead">Make the finished video files from what you see now: the same render Claude uses, with a check for glitches at the end.</p>
      <div className="options">
        {([
          ['quick', 'Quick · 1080p', 'The fastest, about a quarter of the time. For LinkedIn, Slack, email, or a draft to share.'],
          ['4k', '4K', 'Only the 4K file, the sharpest: for your website, YouTube and big screens. 3D-heavy videos take a while.'],
          ['full', 'Full', 'Both, 4K and 1080p, plus a poster and a thumbnail: everything for publishing.']
        ] as [ExportMode, string, string][]).map(([value, title, text]) => (
          <button key={value} className={`option ${mode === value ? 'is-on' : ''}`} disabled={state.running} onClick={() => setMode(value)}>
            <span className="radio" />
            <span>
              <strong>{title}</strong>
              <em>{text}</em>
            </span>
          </button>
        ))}
      </div>
      <SaveTo value={to} onChange={choose} disabled={state.running} />
      <button className="primary wide" disabled={state.running || (to.kind !== 'video' && !to.path.trim())} onClick={() => onStart(mode, to.kind === 'video' ? null : to.path.trim()).catch(caught => pushToast('error', caught.message))}>
        {state.running ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />} {state.running ? 'Exporting…' : `Export ${video.id}`}
      </button>
      {state.running && (
        <div className="card progress">
          <div className="progress-top">
            <strong>{percent}%</strong>
            <span>{state.id} · {{ quick: 'quick, 1080p', '4k': '4K', full: 'full' }[state.mode ?? 'full']}</span>
          </div>
          <div className="progress-bar"><div style={{ width: `${Math.max(2, percent)}%` }} /></div>
          <p className="footnote">{detail || 'Starting…'}</p>
          <p className="footnote">Keep watching and editing meanwhile; the export uses the video as it was when you pressed the button.</p>
        </div>
      )}
      {finished && (
        <div className="card result">
          <div className="result-head">
            <Check size={16} /> Your video is ready
            <div className="spacer" />
            {(state.files ?? []).length > 1 && <button className="link-button danger" onClick={() => remove(state.files ?? [])}>Delete all</button>}
          </div>
          {state.destination && !state.copyError && <p className="footnote result-where">Saved to {state.destination}</p>}
          {state.copyError && <Banner tone="warn">{state.copyError}</Banner>}
          {(state.files ?? []).map(file => (
            <div key={file} className="file">
              <span>{file.split(/[\\/]/).pop()}</span>
              <div className="spacer" />
              {/\.mp4$/.test(file) && <button className="pill-button" onClick={() => api('/api/open', { file, play: true })}><Play size={13} /> Play</button>}
              <button className="pill-button" onClick={() => api('/api/open', { file })}><FolderOpen size={13} /> Show</button>
              <button className="icon-button danger" title={`Delete (moves it to the ${bin})`} onClick={() => remove([file])}><Trash2 size={14} /></button>
            </div>
          ))}
          {(state.files ?? []).length === 0 && <p className="footnote">All the files of this export were moved to the {bin}.</p>}
        </div>
      )}
      {failed && (
        <Banner tone="error">
          <strong>The export stopped.</strong> Leave a note for Claude (“the export failed”) and it will look into it.
          {state.tail && <pre>{state.tail}</pre>}
        </Banner>
      )}
      <p className="footnote">Rendering uses Docker Desktop, started for you if it isn't running (and left open). The files are made in the video's <code>out</code> folder, then copied where you chose; nothing already there is overwritten.</p>
    </div>
  )
}

function Shortcuts({ onClose }: { onClose: () => void }) {
  const keys: [string, string][] = [
    ['Space', 'Play or pause'],
    ['← / →', 'One frame back or on'],
    ['Shift + ← / →', 'One second back or on'],
    ['[ / ]', 'Previous or next scene'],
    ['M', 'Sound off or on'],
    ['F', 'Full screen'],
    ['⌘/Ctrl + Z', 'Undo the last change'],
    ['⌘/Ctrl + Enter', 'Save a text box, send a note'],
    ['Esc', 'Undo the text box you’re in']
  ]
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-head"><Keyboard size={16} /> Keyboard shortcuts<div className="spacer" /><button className="icon-button" onClick={onClose}><X size={15} /></button></div>
        {keys.map(([key, what]) => <div key={key} className="shortcut"><kbd>{key}</kbd><span>{what}</span></div>)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The room

function Room() {
  const [project, setProject] = useState<Project | null>(null)
  const start = kept()
  const initial = (location.hash.slice(1) || start.id) ?? ''
  const [id, setId] = useState(() => (VIDEOS.some(video => video.id === initial) ? initial : VIDEOS[0]?.id ?? ''))
  // Opening the editor starts on the Claude tab; only a reload to show a change keeps the tab you were on.
  const [tab, setTab] = useState<Tab>(start.reloading && start.tab ? start.tab : 'notes')
  useEffect(() => {
    keep({ reloading: false })
  }, [])
  const [frame, setFrame] = useState(start.frame ?? 0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [loop, setLoop] = useState(false)
  const [status, setStatus] = useState<{ tone: 'idle' | 'busy' | 'error' | 'closed' | 'lost', text: string }>({ tone: 'idle', text: 'Up to date' })
  const [waitingReload, setWaitingReload] = useState(false)
  const [notePreset, setNotePreset] = useState<number | null>(null)
  const [intro, setIntro] = useState(!remembered('edit-room-intro'))
  const [shortcuts, setShortcuts] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [listening, setListening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [exporting, setExporting] = useState<ExportState>({ running: false })
  const player = useRef<PlayerRef>(null)
  // "This scene" plays and loops just the scene being worked on; "Whole video" plays it all.
  const [range, setRange] = useState<'scene' | 'video'>('video')
  const [focus, setFocus] = useState(0)
  const video = VIDEOS.find(entry => entry.id === id) ?? VIDEOS[0]
  const scenes = useMemo(() => (video ? scenesOf(video) : []), [video])
  const baseId = video?.timeline.baseId ?? id
  const folder = project?.folders.find(entry => entry.ids.includes(baseId))
  const language = /-([a-z]{2})$/.exec(id)?.[1] ?? null

  useEffect(() => {
    api<Project>('/api/project').then(setProject).catch(() => {})
  }, [])

  // Notes and export are followed from here, so the tabs can show their state at a glance.
  const loadNotes = useCallback(() => {
    api<{ notes: Note[], listening: boolean }>('/api/notes').then(data => {
      setNotes(data.notes)
      setListening(data.listening)
    }).catch(() => {})
  }, [])
  const loadExport = useCallback(() => {
    api<ExportState>('/api/export').then(setExporting).catch(() => {})
  }, [])
  useEffect(() => {
    loadNotes()
    loadExport()
    const timer = setInterval(() => {
      loadNotes()
      loadExport()
    }, 2500)
    return () => clearInterval(timer)
  }, [loadNotes, loadExport])

  // Keep what's on screen across reloads.
  useEffect(() => {
    keep({ id, tab })
    history.replaceState(null, '', `#${id}`)
  }, [id, tab])

  const reload = useCallback(() => {
    const recent = lastToast && Date.now() - lastToast.at < 4000 ? lastToast.text : 'Preview updated'
    keep({ id, tab, frame: player.current?.getCurrentFrame() ?? frame, playing: player.current?.isPlaying() ?? false, toast: recent, reloading: true })
    location.reload()
  }, [id, tab, frame])

  // The server tells the page when the video changed (the page reloads to show it), broke, or closed.
  useEffect(() => {
    const events = serverEvents()
    events.on('hello', event => {
      const data = JSON.parse((event as MessageEvent).data)
      if (data.error) {
        setStatus({ tone: 'error', text: data.error })
      }
    })
    events.on('rebuilt', () => {
      if (typing()) {
        setWaitingReload(true)
        setStatus({ tone: 'busy', text: 'Updates when you leave the text box' })
      } else {
        setStatus({ tone: 'busy', text: 'Updating the preview…' })
        reload()
      }
    })
    events.on('broken', event => {
      setStatus({ tone: 'error', text: JSON.parse((event as MessageEvent).data).error })
    })
    events.on('notes', loadNotes)
    events.on('export', loadExport)
    events.on('voice', event => {
      const data = JSON.parse((event as MessageEvent).data)
      setRecording(data.recording)
      if (data.error) {
        pushToast('error', `The voice couldn't be recorded: ${data.error}`)
      }
    })
    events.on('closed', () => setStatus({ tone: 'closed', text: 'Closed' }))
    events.onState(() => setStatus(current => (current.tone === 'lost' ? { tone: 'idle', text: 'Up to date' } : current)), () => setStatus(current => (current.tone === 'closed' ? current : { tone: 'lost', text: 'Not connected' })))
    return () => events.close()
  }, [reload, loadNotes, loadExport])

  useEffect(() => {
    if (!waitingReload) {
      return
    }
    const blur = () => setTimeout(() => !typing() && reload(), 300)
    window.addEventListener('focusout', blur)
    return () => window.removeEventListener('focusout', blur)
  }, [waitingReload, reload])

  // The player: follow its frame, and come back where the page was before a reload.
  useEffect(() => {
    const current = player.current
    if (!current) {
      return
    }
    const onFrame = (event: { detail: { frame: number } }) => setFrame(event.detail.frame)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    current.addEventListener('frameupdate', onFrame)
    current.addEventListener('play', onPlay)
    current.addEventListener('pause', onPause)
    const back = kept()
    if (back.id === id && back.frame) {
      current.seekTo(Math.min(back.frame, video.durationInFrames - 1))
    }
    return () => {
      current.removeEventListener('frameupdate', onFrame)
      current.removeEventListener('play', onPlay)
      current.removeEventListener('pause', onPause)
    }
  }, [id, video])

  const seek = useCallback((to: number) => {
    const clamped = Math.max(0, Math.min(video.durationInFrames - 1, to))
    // The scene it lands in becomes the one being worked on; in "This scene" the player's range
    // moves there first, then the seek happens inside it.
    setFocus(sceneAt(scenes, clamped))
    setFrame(clamped)
    requestAnimationFrame(() => player.current?.seekTo(clamped))
  }, [video, scenes])

  const current = range === 'scene' ? Math.min(focus, scenes.length - 1) : sceneAt(scenes, frame)
  // A scene's own length, its exit into the next one included (the same length the panel shows).
  const sceneEnd = (index: number) => Math.min(video.durationInFrames - 1, scenes[index].start + scenes[index].frames - 1)
  const previousScene = () => seek(frame > scenes[current].start + 10 || !scenes[current - 1] ? scenes[current].start : scenes[current - 1].start)
  const nextScene = () => scenes[current + 1] && seek(scenes[current + 1].start)

  // Keys, when not typing.
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!typing() && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (typing() || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        player.current?.toggle()
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const step = event.shiftKey ? video.fps : 1
        seek(frame + (event.key === 'ArrowLeft' ? -step : step))
      } else if (event.key === '[') {
        previousScene()
      } else if (event.key === ']') {
        nextScene()
      } else if (event.key.toLowerCase() === 'm') {
        setMuted(value => !value)
      } else if (event.key.toLowerCase() === 'f') {
        player.current?.requestFullscreen()
      } else if (event.key === '?') {
        setShortcuts(true)
      } else if (event.key === 'Escape') {
        setShortcuts(false)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  useEffect(() => {
    if (muted) {
      player.current?.mute()
    } else {
      player.current?.unmute()
    }
  }, [muted])

  // Start playing again if it was playing before the reload.
  useEffect(() => {
    const back = kept()
    if (back.playing) {
      keep({ playing: false })
      setTimeout(() => player.current?.play(), 400)
    }
  }, [])

  if (!video) {
    return <Empty icon={<Clapperboard size={24} />} title="No videos yet">There are no videos in this studio yet. Ask Claude to make one first.</Empty>
  }

  const tweaks = lengthsOf(project?.tweaks[baseId])
  const nameOfNumber = (number: number) => video.timeline.catalog?.find(entry => entry.number === number)?.name ?? `Scene ${number}`
  const tweakScene = async (scene: number, extra: number) => {
    const data = await api<{ tweaks: Project['tweaks'] }>('/api/tweak', { id: baseId, scene, extra, label: `Length of “${nameOfNumber(scene)}”` })
    setProject(currentProject => (currentProject ? { ...currentProject, tweaks: data.tweaks } : currentProject))
  }
  const undo = () => {
    api<{ undone: string }>('/api/versions/undo', { video: video.id })
      .then(data => pushToast('good', `Undid: ${data.undone}`))
      .catch(caught => pushToast('plain', caught.message))
  }
  const rename = async () => {
    const current = (project?.tweaks[baseId] as { name?: string } | undefined)?.name || video.timeline.title
    const name = await askText('Rename this video', { value: current, text: 'The name you see here. The video itself doesn’t change.' })
    if (name !== null && name !== current) {
      arrangeScenes({ name }, `Name: ${name || 'its own'}`)
    }
  }
  const arrangeScenes = (change: Arrange, label: string) => {
    api<{ tweaks: Project['tweaks'] }>('/api/arrange', { id: baseId, ...change, label })
      .then(data => {
        setProject(currentProject => (currentProject ? { ...currentProject, tweaks: data.tweaks } : currentProject))
        pushToast('good', `${label} · the preview updates in a moment`)
      })
      .catch(caught => pushToast('error', caught.message))
  }
  const open = notes.filter(note => (note.video === video.id || !note.video) && ['new', 'working', 'question'].includes(note.status)).length
  const exportPercent = Number(/^(\d+)%/.exec(exporting.progress ?? '')?.[1] ?? 0)
  const TABS: [Tab, ReactNode, string, ReactNode?][] = [
    ['notes', <Sparkles key="n" size={15} />, 'Claude', open ? <span className="count">{open}</span> : undefined],
    ['scenes', <LayoutList key="s" size={15} />, 'Scenes'],
    ['words', <Type key="w" size={15} />, 'Words'],
    ['voice', <Mic key="v" size={15} />, 'Voice', recording ? <LoaderCircle size={12} className="spin" /> : undefined]
  ]
  return (
    <div className="room">
      <header className="top">
        <div className="brand"><span className="brand-mark"><Clapperboard size={14} /></span>Video Kit</div>
        <div className="video-pick">
          <select value={id} onChange={event => setId(event.target.value)} title="Which video">
            {VIDEOS.map(entry => <option key={entry.id} value={entry.id}>{titleOf(entry, project?.tweaks)}</option>)}
          </select>
          <button className="icon-button" title="Rename this video" onClick={rename}><Pencil size={14} /></button>
          <span>{video.width}×{video.height} · {seconds(video.durationInFrames, video.fps)}</span>
        </div>
        <span className={`status status-${status.tone}`} title={status.text}>
          {status.tone === 'busy' ? <LoaderCircle size={13} className="spin" /> : <span className="status-dot" />}
          {status.tone === 'error' ? 'Preview can’t update' : status.text}
        </span>
        <div className="spacer" />
        <button className="secondary" title="Undo the last change (⌘/Ctrl+Z)" onClick={undo}><Undo2 size={15} /> Undo</button>
        <button className={`secondary ${tab === 'versions' ? 'is-on' : ''}`} title="Every saved version of this video" onClick={() => setTab(tab === 'versions' ? 'notes' : 'versions')}><Clock size={15} /> Versions</button>
        <button className="icon-button" title="Keyboard shortcuts (?)" onClick={() => setShortcuts(true)}><Keyboard size={17} /></button>
        <button className={`dark ${tab === 'export' ? 'is-on' : ''}`} onClick={() => setTab(tab === 'export' ? 'notes' : 'export')} title="Make the finished video files">
          {exporting.running ? <LoaderCircle size={15} className="spin" /> : <Download size={15} />}
          {exporting.running ? `Exporting ${exportPercent}%` : 'Export'}
        </button>
        <button
          className="icon-button"
          title="Close the editor"
          onClick={async () => {
            if (await ask('Close the editor?', { text: 'Everything is saved already. Ask Claude to open it again any time.', yes: 'Close' })) {
              await api('/api/close', {}).catch(() => {})
              setStatus({ tone: 'closed', text: 'Closed' })
            }
          }}
        >
          <Power size={17} />
        </button>
      </header>

      <div className="banners">
        {intro && (
          <Banner onClose={() => {
            setIntro(false)
            remember('edit-room-intro')
          }}
          >
            <strong>A live preview, on your computer only.</strong> It draws the video as it plays, so 3D scenes can stutter here; the exported video is always smooth. Everything you change is saved straight into the video.
          </Banner>
        )}
        {status.tone === 'error' && (
          <Banner tone="error">
            <strong>The preview can’t update right now</strong>, so it shows the last version that worked. If Claude is making a change, this clears in a moment; otherwise leave a note.
            <pre>{status.text}</pre>
          </Banner>
        )}
        {status.tone === 'closed' && <Banner tone="warn">The editor is closed. Your changes are saved; you can close this tab. To open it again, ask Claude for the editor.</Banner>}
        {status.tone === 'lost' && <Banner tone="warn">Lost the connection to the editor. If it was closed, ask Claude to open it again; your changes are saved.</Banner>}
      </div>

      <main className="main">
        <section className="stage">
          <div className="crumb">
            {scenes[current]?.number !== null && scenes[current]?.number !== undefined
              ? <strong>Scene {scenes[current].number} of {scenes.filter(scene => scene.number !== null).length}</strong>
              : <strong>Cover</strong>}
            {scenes[current]?.number !== null && <span> · {scenes[current]?.name}</span>}
            <span> · {seconds(scenes[current]?.frames ?? 0, video.fps)}</span>
          </div>
          <div className="screen-wrap">
            <div className="screen" style={{ ['--ratio' as string]: video.width / video.height }}>
              <Player
                key={id}
                ref={player}
                component={video.component}
                durationInFrames={video.durationInFrames}
                fps={video.fps}
                compositionWidth={video.width}
                compositionHeight={video.height}
                style={{ width: '100%', height: '100%' }}
                playbackRate={rate}
                loop={loop || range === 'scene'}
                inFrame={range === 'scene' ? scenes[current]?.start ?? null : null}
                outFrame={range === 'scene' ? sceneEnd(current) : null}
                clickToPlay
                doubleClickToFullscreen
                spaceKeyToPlayOrPause={false}
                acknowledgeRemotionLicense
              />
            </div>
          </div>
          <div className="controls">
            <div className="controls-left">
              <Segmented
                value={range}
                onChange={value => {
                  setRange(value)
                  setFocus(sceneAt(scenes, frame))
                }}
                options={[['scene', <span key="s" title="Play only the scene you're on, over and over">Loop scene</span>], ['video', <span key="v" title="Play the whole video, start to end">Whole video</span>]]}
              />
              {range === 'scene'
                ? <span className="time"><strong>{((frame - (scenes[current]?.start ?? 0)) / video.fps).toFixed(2)}</strong> / {((scenes[current] ? sceneEnd(current) + 1 - scenes[current].start : 0) / video.fps).toFixed(2)}s</span>
                : <span className="time"><strong>{clock(frame, video.fps)}</strong> / {clock(video.durationInFrames, video.fps)}</span>}
            </div>
            <div className="controls-center">
              <button className="icon-button" onClick={previousScene} title="Previous scene ([)"><SkipBack size={17} /></button>
              <button className="icon-button" onClick={() => seek(frame - 1)} title="One frame back (←)"><ChevronLeft size={19} /></button>
              <button className="play" onClick={() => player.current?.toggle()} title="Play or pause (Space)">{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
              <button className="icon-button" onClick={() => seek(frame + 1)} title="One frame on (→)"><ChevronRight size={19} /></button>
              <button className="icon-button" onClick={nextScene} title="Next scene (])"><SkipForward size={17} /></button>
            </div>
            <div className="controls-right">
              <Segmented value={rate} onChange={setRate} options={[[0.5, '0.5×'], [1, '1×'], [1.5, '1.5×']]} />
              <button className={`icon-button ${loop ? 'is-on' : ''}`} onClick={() => setLoop(value => !value)} title="Loop"><Repeat size={16} /></button>
              <button className="icon-button" onClick={() => setMuted(value => !value)} title="Sound off or on (M)">{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
              <button className="icon-button" onClick={() => player.current?.requestFullscreen()} title="Full screen (F)"><Maximize size={16} /></button>
            </div>
          </div>
          <Timeline video={video} scenes={scenes} frame={frame} tweaks={tweaks} onSeek={seek} onTweak={tweakScene} />
        </section>
        <Filmstrip video={video} scenes={scenes} current={current} onArrange={arrangeScenes} onPick={index => seek(scenes[index].start)} />

        <aside className="panel">
          {tab === 'export' || tab === 'versions'
            ? (
                <div className="panel-head">
                  {tab === 'export' ? <Download size={15} /> : <Clock size={15} />} <strong>{tab === 'export' ? 'Export' : 'Versions'}</strong>
                  <div className="spacer" />
                  <button className="icon-button" title="Back to editing" onClick={() => setTab('notes')}><X size={15} /></button>
                </div>
              )
            : (
                <nav className="tabs">
                  {TABS.map(([name, icon, label, badge]) => (
                    <button key={name} className={tab === name ? 'is-on' : ''} onClick={() => setTab(name)}>
                      {icon}<span>{label}</span>{badge}
                    </button>
                  ))}
                </nav>
              )}
          {tab === 'scenes' && (
            <ScenesTab
              video={video}
              scenes={scenes}
              frame={frame}
              tweaks={tweaks}
              onSeek={seek}
              onTweak={tweakScene}
              onNote={index => {
                setNotePreset(index)
                setTab('notes')
              }}
              onArrange={arrangeScenes}
            />
          )}
          {tab === 'words' && <WordsTab folder={folder} language={language} />}
          {tab === 'voice' && <VoiceTab folder={folder} recording={recording} />}
          {tab === 'notes' && (
            <NotesTab
              video={video}
              scenes={scenes}
              frame={frame}
              notes={notes}
              listening={listening}
              preset={notePreset}
              onSeek={seek}
              onPresetUsed={() => setNotePreset(null)}
              onNotes={setNotes}
            />
          )}
          {tab === 'versions' && <VersionsPanel video={video} onUndo={undo} />}
          {tab === 'export' && (
            <ExportTab
              video={video}
              state={exporting}
              onState={setExporting}
              onStart={async (mode, to) => {
                setExporting(await api<ExportState>('/api/export', { id: video.id, mode, to }))
                pushToast('plain', 'Export started')
              }}
            />
          )}
        </aside>
      </main>
      {shortcuts && <Shortcuts onClose={() => setShortcuts(false)} />}

    </div>
  )
}

/**
 * The page: the guided flow while a video is being made (a session that hasn't reached the editor
 * yet), the editor otherwise. When Claude hands over to the editor, the page reloads into it, so
 * the newly built video is there.
 */
function App() {
  const [state, setState] = useState<{ session: Session | null, listening: boolean } | null>(null)
  const stage = useRef<string | null>(null)
  useEffect(() => {
    const load = () => api<{ session: Session | null, listening: boolean }>('/api/session').then(next => {
      const was = stage.current
      stage.current = next.session?.stage ?? null
      if (was && was !== 'editor' && next.session?.stage === 'editor') {
        if (next.session.videoId) {
          keep({ id: next.session.videoId, tab: 'notes', frame: 0 })
          history.replaceState(null, '', `#${next.session.videoId}`)
        }
        location.reload()
        return
      }
      setState(next)
    }).catch(() => setState(current => current ?? { session: null, listening: false }))
    load()
    const events = serverEvents()
    events.on('session', load)
    const timer = setInterval(load, 3000)
    return () => {
      events.close()
      clearInterval(timer)
    }
  }, [])
  if (!state) {
    return null
  }
  const studio = state.session && state.session.stage !== 'editor'
  return (
    <>
      {studio ? <Studio session={state.session!} listening={state.listening} /> : <Room />}
      <Toasts />
      <Dialog />
    </>
  )
}

createRoot(document.getElementById('room')!).render(<App />)
