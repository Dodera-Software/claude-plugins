// The guided flow: making a video from start to finish in the browser, for people who'd rather
// click than type. A brief in a few simple steps, then Claude's progress, the storyboard and the
// stills to review, then the editor. Claude does the work in Claude Code and talks to this page
// through session.json (scripts/session.mjs); the page only shows and asks.
import { loadFont } from '@remotion/google-fonts/Inter'
import { Player } from '@remotion/player'
import {
  ArrowLeft, ArrowRight, Check, Clapperboard, Film, Globe, ImagePlus, Layers, Link2, LoaderCircle, Megaphone,
  MessageSquare, Mic, MonitorPlay, Pause, Play, Rocket, Send, Sparkles, Upload, Users, VolumeX, X
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defineVideo, TitleCard, titleCardFrames, WordSwap, wordSwapFrames, type Brand, type LookName } from '../kit'
import { api, Banner, Empty, pushToast, Segmented } from './main'

// ---------------------------------------------------------------------------------------------
// What the session holds (scripts/session.mjs)

type Step = { label: string, state: 'todo' | 'doing' | 'done' }
type Message = { id: number, from: 'claude' | 'you', text: string, options?: string[] | null, answer?: string | null, at: string }
type BoardScene = { title: string, what?: string, words?: string, narration?: string, seconds?: number }
type Still = { src: string, caption?: string }
export type Session = {
  stage: 'brief' | 'working' | 'ideas' | 'storyboard' | 'stills' | 'editor'
  product: string | null
  suggestions: { audiences?: string[], messages?: string[], mustShow?: string[], actions?: string[] }
  brands: { slug: string, name: string, domain?: string }[]
  brief: Brief | null
  steps: Step[]
  messages: Message[]
  storyboard: { title?: string, scenes: BoardScene[], status: 'waiting' | 'approved' | 'changes', round: number } | null
  stills: { items: Still[], status: 'waiting' | 'approved' | 'changes', round: number } | null
  ideas: { items: Idea[], status: 'waiting' | 'answered', round: number, more?: boolean, picked?: number[] } | null
  videoId: string | null
}
type Idea = { title: string, text?: string, pictures?: string[], link?: string }

type Reference = { url?: string, file?: string, name?: string, likes: string[], note: string }
type Brief = {
  kind: string
  website: string
  audience: string
  message: string
  action: string
  references: Reference[]
  feel: { pace: string, tone: string, style: string }
  look: string
  form: string
  sound: 'silent' | 'narrator'
  voice: string
  formats: string[]
  length: string
  languages: string[]
  mustShow: string
  avoid: string
  brand: string
  inspireMe: boolean
}

const BLANK: Brief = {
  kind: '', website: '', audience: '', message: '', action: '', references: [],
  feel: { pace: '', tone: '', style: '' }, look: 'auto', form: 'auto', sound: 'silent', voice: '',
  formats: ['wide'], length: 'auto', languages: ['English'], mustShow: '', avoid: '', brand: '', inspireMe: true
}

const DRAFT = 'video-studio-draft'

// ---------------------------------------------------------------------------------------------
// Small pieces

function Choice({ on, onClick, icon, title, text, compact }: { on: boolean, onClick: () => void, icon?: ReactNode, title: string, text?: string, compact?: boolean }) {
  return (
    <button className={`choice ${on ? 'is-on' : ''} ${compact ? 'is-compact' : ''}`} onClick={onClick}>
      {icon && <span className="choice-icon">{icon}</span>}
      <span className="choice-body">
        <strong>{title}</strong>
        {text && <em>{text}</em>}
      </span>
      <span className="choice-check">{on && <Check size={13} />}</span>
    </button>
  )
}

function Chips({ options, value, onPick, multiple = false }: { options: string[], value: string | string[], onPick: (value: string) => void, multiple?: boolean }) {
  const chosen = (option: string) => (multiple ? (value as string[]).includes(option) : value === option)
  return (
    <div className="chips">
      {options.map(option => (
        <button key={option} className={`chip ${chosen(option) ? 'is-on' : ''}`} onClick={() => onPick(option)}>{option}</button>
      ))}
    </div>
  )
}

function Question({ title, hint, children }: { title: string, hint?: string, children: ReactNode }) {
  return (
    <div className="question">
      <h3>{title}</h3>
      {hint && <p className="hint-text">{hint}</p>}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The four looks, shown moving: one made-up product in each, so people pick by eye, not by name.

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] })

function DemoLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block', flexShrink: 0 }}>
      <rect width="64" height="64" rx="16" fill="#4f46e5" />
      <path d="M20 42 L32 20 L44 42" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const DEMO_BRAND: Brand = {
  name: 'Your product',
  domain: 'yourproduct.com',
  fontFamily,
  colors: {
    canvas: '#f7f7f8', sheet: '#ffffff', text: '#18181b', toned: '#3f3f46', muted: '#71717a', border: '#e4e4e7',
    accent: '#4f46e5', accentSoft: '#e0e7ff', accentInk: '#312e81', highlight: '#fef08a', subtle: '#eef2ff'
  },
  shadow: { card: '0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)', floating: '0 2px 6px rgba(0,0,0,.08), 0 24px 64px rgba(0,0,0,.14)' },
  Logo: DemoLogo
}

const LOOKS: [LookName, string, string][] = [
  ['editorial', 'Editorial', 'Calm, spacious and premium'],
  ['bold', 'Bold', 'Your colour fills the screen, big type, fast'],
  ['technical', 'Technical', 'Dark, precise, for developer products'],
  ['playful', 'Playful', 'Bright, bouncy and friendly']
]

const swap = { lead: 'We make', words: ['launch films', 'feature demos', 'social clips'], eyebrow: 'Your product' }
const title = { eyebrow: 'Your product', title: 'Every task finds its owner', sub: 'A short preview of this look' }
const LOOK_PREVIEWS = Object.fromEntries(LOOKS.map(([look]) => [look, defineVideo({
  id: `LookPreview-${look}`,
  brand: DEMO_BRAND,
  look,
  cover: false,
  scenes: [
    { component: () => <WordSwap {...swap} />, frames: wordSwapFrames(swap) },
    { component: () => <TitleCard {...title} />, frames: titleCardFrames(title) }
  ]
})]))

function LookCard({ look, name, text, on, onPick }: { look: LookName, name: string, text: string, on: boolean, onPick: () => void }) {
  const video = LOOK_PREVIEWS[look]
  return (
    <button className={`look-card ${on ? 'is-on' : ''}`} onClick={onPick}>
      <span className="look-preview">
        <Player
          component={video.component}
          durationInFrames={video.durationInFrames}
          fps={video.fps}
          compositionWidth={video.width}
          compositionHeight={video.height}
          style={{ width: '100%', aspectRatio: '16 / 9' }}
          autoPlay
          loop
          initiallyMuted
          acknowledgeRemotionLicense
        />
      </span>
      <span className="look-name"><strong>{name}</strong>{on && <Check size={14} />}</span>
      <em>{text}</em>
    </button>
  )
}

// ---------------------------------------------------------------------------------------------
// Narrator voices, heard before choosing

const VOICES: [string, string, string][] = [
  ['af_heart', 'Heart', 'Warm and clear · American'],
  ['am_michael', 'Michael', 'Calm and friendly · American'],
  ['bf_emma', 'Emma', 'Poised · British'],
  ['bm_george', 'George', 'Measured · British'],
  ['af_bella', 'Bella', 'Bright · American'],
  ['am_fenrir', 'Fenrir', 'Deep · American']
]

function VoiceCard({ voice, name, text, on, onPick }: { voice: string, name: string, text: string, on: boolean, onPick: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audio = useRef<HTMLAudioElement | null>(null)
  const listen = async (event: React.MouseEvent) => {
    event.stopPropagation()
    if (state === 'playing') {
      audio.current?.pause()
      setState('idle')
      return
    }
    setState('loading')
    try {
      const { src } = await api<{ src: string }>('/api/voice-sample', { voice })
      audio.current = new Audio(`/${src}`)
      audio.current.onended = () => setState('idle')
      await audio.current.play()
      setState('playing')
    } catch (caught) {
      setState('idle')
      pushToast('error', (caught as Error).message)
    }
  }
  return (
    <div className={`voice-card ${on ? 'is-on' : ''}`} onClick={onPick} role="button" tabIndex={0}>
      <button className="voice-play" onClick={listen} title="Listen">
        {state === 'loading' ? <LoaderCircle size={16} className="spin" /> : state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className="voice-text"><strong>{name}</strong><em>{text}</em></span>
      {on && <Check size={15} className="voice-check" />}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The brief, one simple step at a time

const KINDS: [string, ReactNode, string, string][] = [
  ['launch', <Rocket key="r" size={20} />, 'Launch film', '45–75 seconds about the whole product'],
  ['teaser', <Megaphone key="m" size={20} />, 'Feature teaser', '15–30 seconds about one feature'],
  ['demo', <MonitorPlay key="d" size={20} />, 'Feature demo', 'One feature working in the real app'],
  ['social', <Film key="f" size={20} />, 'Social clip', '10–20 seconds, one moment, loops'],
  ['changelog', <Layers key="l" size={20} />, "What's new", 'Your latest changes, for a release'],
  ['website', <Globe key="g" size={20} />, 'From a website', 'Any product, from its public website']
]

const BRIEF_STEPS = ['What', 'Who', 'Inspiration', 'Look', 'Sound', 'Where', 'Details', 'Review']

function BriefWizard({ session, onDone, step, setStep }: { session: Session, onDone: (brief: Brief) => void, step: number, setStep: (step: number) => void }) {
  const [brief, setBrief] = useState<Brief>(() => {
    try {
      return { ...BLANK, ...JSON.parse(localStorage.getItem(DRAFT) ?? '{}') }
    } catch {
      return BLANK
    }
  })
  const [link, setLink] = useState('')
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(brief))
    } catch {}
  }, [brief])
  const set = (change: Partial<Brief>) => setBrief(current => ({ ...current, ...change }))
  const ideas = session.suggestions ?? {}
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value])
  const upload = async (files: FileList | null) => {
    if (!files?.length) {
      return
    }
    setUploading(true)
    try {
      for (const file of [...files]) {
        const response = await fetch(`/api/session/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'X-Edit-Room': '1' }, body: file })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error ?? 'The file could not be added.')
        }
        setBrief(current => ({ ...current, references: [...current.references, { file: data.src, name: file.name, likes: [], note: '' }] }))
      }
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    } finally {
      setUploading(false)
    }
  }
  const canGoOn = step !== 0 || Boolean(brief.kind && (brief.kind !== 'website' || brief.website.trim()))
  const screens = [
    // 1. What
    <div key="what">
      <Question title="What are we making?" hint="Pick the closest; you can describe it in your own words later.">
        <div className="choice-grid">
          {KINDS.map(([value, icon, name, text]) => <Choice key={value} on={brief.kind === value} onClick={() => set({ kind: value })} icon={icon} title={name} text={text} />)}
        </div>
      </Question>
      {brief.kind === 'website' && (
        <Question title="Which website?">
          <input placeholder="yourproduct.com" value={brief.website} onChange={event => set({ website: event.target.value })} />
        </Question>
      )}
    </div>,
    // 2. Who
    <div key="who">
      <Question title="Who is it for?" hint="Who watches it, and where they'll see it.">
        <Chips options={[...(ideas.audiences ?? []), 'Customers', 'Prospects', 'Investors', 'Our team'].filter((option, index, all) => all.indexOf(option) === index)} value={brief.audience} onPick={value => set({ audience: value })} />
        <input placeholder="Or describe them: “CTOs of small fintech startups, on LinkedIn”" value={brief.audience} onChange={event => set({ audience: event.target.value })} />
      </Question>
      <Question title="What's the one thing they should remember?" hint="In one sentence. Claude suggests a few from your product.">
        {ideas.messages?.length ? <Chips options={ideas.messages} value={brief.message} onPick={value => set({ message: value })} /> : <p className="hint-text"><LoaderCircle size={13} className="spin" /> Claude is reading your product for suggestions…</p>}
        <textarea rows={2} placeholder="One sentence, in your own words" value={brief.message} onChange={event => set({ message: event.target.value })} />
      </Question>
      <Question title="What should they do after watching?">
        <Chips options={[...(ideas.actions ?? []), 'Book a call', 'Sign up', 'Try it', 'Just know about it'].filter((option, index, all) => all.indexOf(option) === index)} value={brief.action} onPick={value => set({ action: value })} />
      </Question>
    </div>,
    // 3. Inspiration
    <div key="inspiration">
      <Question title="Any videos you'd like it to feel like?" hint="Paste links or drop video files. Say what you like about each: how it starts, how it ends, the pace. Optional, but it helps the most.">
        <div className="link-add">
          <Link2 size={16} />
          <input
            placeholder="https://www.youtube.com/watch?v=…"
            value={link}
            onChange={event => setLink(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && link.trim()) {
                set({ references: [...brief.references, { url: link.trim(), likes: [], note: '' }] })
                setLink('')
              }
            }}
          />
          <button className="secondary" disabled={!link.trim()} onClick={() => {
            set({ references: [...brief.references, { url: link.trim(), likes: [], note: '' }] })
            setLink('')
          }}
          >
            Add
          </button>
        </div>
        <label
          className={`drop ${uploading ? 'is-busy' : ''}`}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault()
            upload(event.dataTransfer.files)
          }}
        >
          {uploading ? <LoaderCircle size={18} className="spin" /> : <Upload size={18} />}
          <span>{uploading ? 'Adding…' : 'Drop a video or a picture here, or click to choose'}</span>
          <input type="file" accept="video/*,image/*" multiple hidden onChange={event => upload(event.target.files)} />
        </label>
        {brief.references.map((reference, index) => (
          <div key={index} className="reference">
            <div className="reference-head">
              {reference.file ? <ImagePlus size={15} /> : <Link2 size={15} />}
              <span className="reference-name">{reference.name ?? reference.url}</span>
              <button className="icon-button" title="Remove" onClick={() => set({ references: brief.references.filter((_, other) => other !== index) })}><X size={14} /></button>
            </div>
            <Chips
              multiple
              options={['How it starts', 'How it ends', 'The pace', 'The look', 'The transitions', 'The humour']}
              value={reference.likes}
              onPick={value => set({ references: brief.references.map((item, other) => (other === index ? { ...item, likes: toggle(item.likes, value) } : item)) })}
            />
            <input placeholder="What exactly do you like? “The logo builds itself at the end”" value={reference.note} onChange={event => set({ references: brief.references.map((item, other) => (other === index ? { ...item, note: event.target.value } : item)) })} />
          </div>
        ))}
        <Choice
          compact
          on={brief.inspireMe}
          onClick={() => set({ inspireMe: !brief.inspireMe })}
          icon={<Sparkles size={17} />}
          title="Show me ideas too"
          text="Before the storyboard, Claude finds a few videos in different styles for you to pick from"
        />
      </Question>
    </div>,
    // 4. Look
    <div key="look">
      <Question title="How should it feel?">
        <div className="feel">
          <Segmented value={brief.feel.pace} onChange={value => set({ feel: { ...brief.feel, pace: value } })} options={[['calm', 'Calm'], ['energetic', 'Energetic']]} />
          <Segmented value={brief.feel.tone} onChange={value => set({ feel: { ...brief.feel, tone: value } })} options={[['serious', 'Serious'], ['playful', 'Playful']]} />
          <Segmented value={brief.feel.style} onChange={value => set({ feel: { ...brief.feel, style: value } })} options={[['premium', 'Premium'], ['friendly', 'Friendly']]} />
        </div>
      </Question>
      <Question title="Which look?" hint="Each one plays below. Not sure? Let Claude choose from your product.">
        <div className="look-grid">
          {LOOKS.map(([look, name, text]) => <LookCard key={look} look={look} name={name} text={text} on={brief.look === look} onPick={() => set({ look })} />)}
        </div>
        <Choice compact on={brief.look === 'auto'} onClick={() => set({ look: 'auto' })} icon={<Sparkles size={16} />} title="Let Claude choose" text="From your product's own site and feel" />
      </Question>
      <Question title="What kind of video?">
        <div className="choice-grid three">
          <Choice on={brief.form === 'chapters'} onClick={() => set({ form: 'chapters' })} title="Scene by scene" text="Clear chapters, each with its own point" />
          <Choice on={brief.form === 'film'} onClick={() => set({ form: 'film' })} title="Cinematic, with 3D" text="One flowing camera journey through your product" />
          <Choice on={brief.form === 'auto'} onClick={() => set({ form: 'auto' })} title="Let Claude choose" text="What suits the story best" />
        </div>
      </Question>
    </div>,
    // 5. Sound
    <div key="sound">
      <Question title="Silent, or with a narrator?" hint="Most social video plays muted, so the words are always on screen either way.">
        <div className="choice-grid two">
          <Choice on={brief.sound === 'silent'} onClick={() => set({ sound: 'silent' })} icon={<VolumeX size={20} />} title="Silent" text="No sound at all, made to be watched muted" />
          <Choice on={brief.sound === 'narrator'} onClick={() => set({ sound: 'narrator' })} icon={<Mic size={20} />} title="A narrator" text="A voice tells the story (English), recorded on this computer for free" />
        </div>
      </Question>
      {brief.sound === 'narrator' && (
        <Question title="Which voice?" hint="Press play to hear each one. The first time, the voices take a minute to download.">
          <div className="voice-grid">
            {VOICES.map(([voice, name, text]) => <VoiceCard key={voice} voice={voice} name={name} text={text} on={brief.voice === voice} onPick={() => set({ voice })} />)}
          </div>
        </Question>
      )}
    </div>,
    // 6. Where
    <div key="where">
      <Question title="Where will it be shown?" hint="Pick all that apply; each shape is its own video.">
        <div className="choice-grid three">
          <Choice on={brief.formats.includes('wide')} onClick={() => set({ formats: toggle(brief.formats, 'wide') })} title="Wide · 16:9" text="Website, YouTube, presentations" />
          <Choice on={brief.formats.includes('square')} onClick={() => set({ formats: toggle(brief.formats, 'square') })} title="Square · 1:1" text="LinkedIn, X" />
          <Choice on={brief.formats.includes('tall')} onClick={() => set({ formats: toggle(brief.formats, 'tall') })} title="Tall · 9:16" text="Reels, Shorts, TikTok" />
        </div>
      </Question>
      <Question title="How long?">
        <Segmented value={brief.length} onChange={value => set({ length: value })} options={[['15', 'About 15 s'], ['30', 'About 30 s'], ['60', 'About 60 s'], ['90', '90 s or more'], ['auto', 'Let Claude choose']]} />
      </Question>
      <Question title="In which languages?" hint="Narration is English only; captions can be in any language.">
        <Chips multiple options={['English', 'Romanian', 'Spanish', 'German', 'French', 'Italian']} value={brief.languages} onPick={value => set({ languages: toggle(brief.languages, value) })} />
      </Question>
    </div>,
    // 7. Details
    <div key="details">
      <Question title="Anything it must show?" hint="Features, screens, moments. Claude suggests what stands out in your product.">
        {ideas.mustShow?.length ? <Chips options={ideas.mustShow} value="" onPick={value => set({ mustShow: brief.mustShow ? `${brief.mustShow}, ${value}` : value })} /> : null}
        <textarea rows={2} placeholder="“The AI filters, the dashboard, how fast setup is”" value={brief.mustShow} onChange={event => set({ mustShow: event.target.value })} />
      </Question>
      <Question title="Anything to avoid?" hint="A competitor's name, unfinished features, claims, numbers…">
        <textarea rows={2} placeholder="“Don't mention pricing or the team size”" value={brief.avoid} onChange={event => set({ avoid: event.target.value })} />
      </Question>
      {session.brands.length > 0 && (
        <Question title="Use a saved brand?" hint="Colours, logo, fonts, look and voice from an earlier video.">
          <div className="choice-grid two">
            {session.brands.map(saved => (
              <Choice key={saved.slug} on={brief.brand === saved.slug} onClick={() => set({ brand: brief.brand === saved.slug ? '' : saved.slug })} title={saved.name} text={saved.domain ?? 'Saved brand'} />
            ))}
            <Choice on={!brief.brand} onClick={() => set({ brand: '' })} title="Start fresh" text="Read the brand from the product again" />
          </div>
        </Question>
      )}
    </div>,
    // 8. Review
    <div key="review">
      <Question title="Ready to start?" hint="Claude reads your product, writes a storyboard and shows it to you here before making anything.">
        <dl className="review">
          {[
            ['What', KINDS.find(([value]) => value === brief.kind)?.[2] ?? '—', 0],
            ['For', brief.audience || 'Claude decides', 1],
            ['Message', brief.message || 'Claude suggests', 1],
            ['After watching', brief.action || '—', 1],
            ['Inspiration', [brief.references.length ? `${brief.references.length} video${brief.references.length > 1 ? 's' : ''}` : '', brief.inspireMe ? 'show me ideas' : ''].filter(Boolean).join(', ') || 'None', 2],
            ['Look', brief.look === 'auto' ? 'Claude chooses' : brief.look, 3],
            ['Kind', { chapters: 'Scene by scene', film: 'Cinematic, with 3D', auto: 'Claude chooses' }[brief.form] ?? brief.form, 3],
            ['Sound', brief.sound === 'narrator' ? `Narrator${brief.voice ? ` (${VOICES.find(([voice]) => voice === brief.voice)?.[1]})` : ''}` : 'Silent', 4],
            ['Shapes', brief.formats.join(', ') || 'Wide', 5],
            ['Length', brief.length === 'auto' ? 'Claude chooses' : `About ${brief.length} s`, 5],
            ['Languages', brief.languages.join(', '), 5]
          ].map(([label, value, at]) => (
            <div key={label as string} className="review-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
              <button className="link-button" onClick={() => setStep(at as number)}>Change</button>
            </div>
          ))}
        </dl>
      </Question>
    </div>
  ]
  return (
    <div className="wizard">
      <div className="wizard-progress">
        <span>Step {step + 1} of {BRIEF_STEPS.length}</span>
        <div className="wizard-bar"><div style={{ width: `${((step + 1) / BRIEF_STEPS.length) * 100}%` }} /></div>
      </div>
      <div className="wizard-body" key={step}>{screens[step]}</div>
      <div className="wizard-foot">
        <span className="wizard-hint">
          <Sparkles size={14} />
          {step === BRIEF_STEPS.length - 1 ? 'You can change anything later.' : !canGoOn ? 'Pick one to continue.' : 'Not sure about something? Skip it: Claude fills it in.'}
        </span>
        <div className="wizard-actions">
          {step > 0 && <button className="ghost-button" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button>}
          {step < BRIEF_STEPS.length - 1
            ? <button className="primary" disabled={!canGoOn} onClick={() => setStep(step + 1)}>Next <ArrowRight size={15} /></button>
            : <button className="primary" onClick={() => onDone(brief)}><Sparkles size={15} /> Start making it</button>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The conversation with Claude, beside every stage after the brief

function Conversation({ session, listening }: { session: Session, listening: boolean }) {
  const [text, setText] = useState('')
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [session.messages.length])
  const send = async () => {
    if (!text.trim()) {
      return
    }
    try {
      await api('/api/session/say', { text })
      setText('')
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    }
  }
  return (
    <aside className="conversation">
      <div className="conversation-head">
        <Sparkles size={15} /> <strong>Claude</strong>
        <span className={`presence ${listening ? 'is-on' : ''}`}>{listening ? 'with you' : 'away'}</span>
      </div>
      {!listening && <Banner tone="warn">Claude isn't connected right now. Keep Claude Code open: everything you do here waits for it and carries on when it's back.</Banner>}
      <div className="conversation-list" ref={list}>
        {session.messages.length === 0 && <Empty icon={<MessageSquare size={20} />} title="Claude's notes appear here">Questions, progress and anything worth knowing while the video is made.</Empty>}
        {session.messages.map(message => (
          <div key={message.id} className={`bubble from-${message.from}`}>
            <p>{message.text}</p>
            {message.options?.length ? (
              <div className="bubble-options">
                {message.options.map(option => (
                  <button
                    key={option}
                    className={`chip ${message.answer === option ? 'is-on' : ''}`}
                    disabled={Boolean(message.answer)}
                    onClick={() => api('/api/session/answer', { message: message.id, answer: option }).catch(caught => pushToast('error', caught.message))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div className="composer-box conversation-box">
        <textarea rows={2} placeholder="Ask or tell Claude anything…" value={text} onChange={event => setText(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            send()
          }
        }}
        />
        <div className="composer-foot">
          <span className="footnote">⌘/Ctrl+Enter to send</span>
          <button className="primary" disabled={!text.trim()} onClick={send}><Send size={13} /></button>
        </div>
      </div>
    </aside>
  )
}

// ---------------------------------------------------------------------------------------------
// Progress, the storyboard and the stills

function Progress({ session }: { session: Session }) {
  return (
    <div className="progress-view">
      <h2>{session.product ? `Making your video for ${session.product}` : 'Making your video'}</h2>
      <p className="hint-text">Claude works on it now. You can watch here; nothing is made without your yes on the storyboard and the stills.</p>
      <ol className="checklist">
        {(session.steps.length ? session.steps : [{ label: 'Getting started', state: 'doing' as const }]).map((step, index) => (
          <li key={index} className={`check-${step.state}`}>
            <span className="check-mark">{step.state === 'done' ? <Check size={13} /> : step.state === 'doing' ? <LoaderCircle size={13} className="spin" /> : index + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Review<T>({ items, render, onSend, status, approveLabel, kind }: {
  items: T[]
  render: (item: T, index: number) => ReactNode
  onSend: (approve: boolean, comments: Record<string, string>, general: string) => Promise<void>
  status: 'waiting' | 'approved' | 'changes'
  approveLabel: string
  kind: string
}) {
  const [comments, setComments] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [general, setGeneral] = useState('')
  const changed = Object.values(comments).some(text => text.trim()) || general.trim()
  if (status !== 'waiting') {
    return (
      <div className="review-sent">
        <LoaderCircle size={18} className="spin" />
        {status === 'approved' ? `Approved. Claude is moving on…` : `Claude is working on your changes to the ${kind}…`}
      </div>
    )
  }
  return (
    <>
      <div className={`review-items is-${kind}`}>
        {items.map((item, index) => (
          <div key={index} className="review-item">
            {render(item, index)}
            {open[index]
              ? <textarea rows={2} autoFocus placeholder="What should change here?" value={comments[index] ?? ''} onChange={event => setComments({ ...comments, [index]: event.target.value })} />
              : <button className="link-button" onClick={() => setOpen({ ...open, [index]: true })}><MessageSquare size={12} /> Change something here</button>}
          </div>
        ))}
      </div>
      <div className="review-foot">
        <input placeholder={`Anything about the ${kind} as a whole?`} value={general} onChange={event => setGeneral(event.target.value)} />
        {changed
          ? <button className="secondary" onClick={() => onSend(false, comments, general)}><Send size={14} /> Send my changes</button>
          : null}
        <button className="primary" disabled={Boolean(changed)} title={changed ? 'Send your changes first, or clear them' : ''} onClick={() => onSend(true, {}, '')}><Check size={15} /> {approveLabel}</button>
      </div>
    </>
  )
}

function Storyboard({ session }: { session: Session }) {
  const board = session.storyboard!
  const total = board.scenes.reduce((sum, scene) => sum + (scene.seconds ?? 0), 0)
  return (
    <div className="board">
      <h2>{board.title ?? 'The storyboard'}</h2>
      <p className="hint-text">Scene by scene, what the video shows and says{total ? `, about ${Math.round(total)} seconds in all` : ''}. Comment on any scene, or approve it and Claude builds the video.</p>
      <Review
        key={`storyboard-${board.round}`}
        kind="storyboard"
        items={board.scenes}
        status={board.status}
        approveLabel="Looks good, build it"
        onSend={async (approve, comments, general) => {
          await api('/api/session/storyboard', { approve, comments, general })
        }}
        render={(scene, index) => (
          <div className="board-scene">
            <span className="board-number">{index + 1}</span>
            <div>
              <strong>{scene.title}</strong>{scene.seconds ? <span className="board-seconds">{scene.seconds} s</span> : null}
              {scene.what && <p>{scene.what}</p>}
              {scene.words && <p className="board-words">“{scene.words}”</p>}
              {scene.narration && <p className="board-narration"><Mic size={12} /> {scene.narration}</p>}
            </div>
          </div>
        )}
      />
    </div>
  )
}

function Stills({ session }: { session: Session }) {
  const stills = session.stills!
  return (
    <div className="board">
      <h2>Key moments</h2>
      <p className="hint-text">Pictures from the video before it's made in full. Comment on any, or approve them and Claude finishes the video.</p>
      <Review
        key={`stills-${stills.round}`}
        kind="stills"
        items={stills.items}
        status={stills.status}
        approveLabel="Looks good, finish it"
        onSend={async (approve, comments, general) => {
          await api('/api/session/stills', { approve, comments, general })
        }}
        render={still => (
          <figure className="still">
            <img src={`/${still.src}`} alt={still.caption ?? ''} />
            {still.caption && <figcaption>{still.caption}</figcaption>}
          </figure>
        )}
      />
    </div>
  )
}

function Ideas({ session }: { session: Session }) {
  const ideas = session.ideas!
  const [picked, setPicked] = useState<number[]>([])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const send = async (more: boolean) => {
    setSending(true)
    try {
      await api('/api/session/ideas', { picked, note, more })
    } catch (caught) {
      pushToast('error', (caught as Error).message)
      setSending(false)
    }
  }
  if (ideas.status !== 'waiting') {
    const chosen = ideas.picked?.map(index => ideas.items[index]?.title).filter(Boolean) ?? []
    return (
      <div className="board">
        <h2>Pick a direction</h2>
        <p className="hint-text">{chosen.length && !ideas.more ? `You picked: ${chosen.join(', ')}.` : 'Your answer is with Claude.'}</p>
        <div className="review-sent"><LoaderCircle size={18} className="spin" /> {ideas.more ? 'Claude is finding other ideas…' : 'Got it. Claude is writing the storyboard in that direction…'}</div>
      </div>
    )
  }
  return (
    <div className="board">
      <h2>Pick a direction</h2>
      <p className="hint-text">A few different ways your video could look and feel. Pick the ones you like (one or more); Claude takes the style, never the content.</p>
      <div className="ideas">
        {ideas.items.map((idea, index) => {
          const on = picked.includes(index)
          return (
            <button key={index} className={`idea ${on ? 'is-on' : ''}`} onClick={() => setPicked(on ? picked.filter(other => other !== index) : [...picked, index])}>
              {idea.pictures?.length ? (
                <span className={`idea-pictures n${Math.min(idea.pictures.length, 4)}`}>
                  {idea.pictures.map(src => <img key={src} src={`/${src}`} alt="" loading="lazy" />)}
                </span>
              ) : null}
              <span className="idea-body">
                <span className="idea-check">{on ? <Check size={13} strokeWidth={3} /> : null}</span>
                <strong>{idea.title}</strong>
                {idea.text && <em>{idea.text}</em>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="review-foot">
        <input placeholder="Anything to add? “The drawn style of the first, the pace of the second”" value={note} onChange={event => setNote(event.target.value)} />
        <button className="secondary" disabled={sending} onClick={() => send(true)}>Show me others</button>
        <button className="primary" disabled={sending || (!picked.length && !note.trim())} onClick={() => send(false)}><Check size={15} /> {picked.length > 1 ? 'Use these' : 'Use this'}</button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The studio

const BRIEF_NAMES = ["What we're making", "Who it's for", 'Videos you like', 'Look and feel', 'Sound', 'Where it goes', 'Details', 'Review']
const LATER: [Session['stage'], string, string][] = [
  ['working', 'Claude gets to work', 'Reads your product and plans'],
  ['ideas', 'Pick a direction', 'A few styles to choose from'],
  ['storyboard', 'Storyboard', 'The video, scene by scene'],
  ['stills', 'Key moments', 'Pictures before the full video'],
  ['editor', 'Edit and export', 'Watch, tweak and save it']
]
const ORDER: Session['stage'][] = ['brief', 'working', 'ideas', 'storyboard', 'stills', 'editor']

function Marker({ state, children }: { state: 'todo' | 'doing' | 'done', children: ReactNode }) {
  return <span className={`marker marker-${state}`}>{state === 'done' ? <Check size={11} strokeWidth={3} /> : children}</span>
}

export function Studio({ session, listening }: { session: Session, listening: boolean }) {
  const [step, setStep] = useState(0)
  const reached = ORDER.indexOf(session.stage)
  const start = async (brief: Brief) => {
    try {
      await api('/api/session/brief', { brief })
      try {
        localStorage.removeItem(DRAFT)
      } catch {}
    } catch (caught) {
      pushToast('error', (caught as Error).message)
    }
  }
  const body = session.stage === 'brief'
    ? <BriefWizard session={session} onDone={start} step={step} setStep={setStep} />
    : session.stage === 'ideas' && session.ideas
      ? <Ideas key={`ideas-${session.ideas.round}`} session={session} />
      : session.stage === 'storyboard' && session.storyboard
        ? <Storyboard session={session} />
        : session.stage === 'stills' && session.stills
          ? <Stills session={session} />
          : <Progress session={session} />
  const initial = (session.product ?? 'Your product').trim().charAt(0).toUpperCase()
  return (
    <div className="studio">
      <header className="top studio-top">
        <div className="brand"><span className="brand-mark"><Clapperboard size={14} /></span>Video Kit</div>
        <div className="spacer" />
        <span className={`presence-chip ${listening ? 'is-on' : ''}`} title={listening ? 'Claude is connected and working with you' : 'Claude Code is not connected right now'}>
          <i /> {listening ? 'Claude is with you' : 'Claude is away'}
        </span>
      </header>
      <div className={`studio-shell ${session.stage === 'brief' ? 'is-brief' : ''}`}>
        <nav className="studio-nav">
          <div className="nav-product">
            <span className="nav-avatar">{initial}</span>
            <span><strong>{session.product ?? 'Your product'}</strong><em>New video</em></span>
          </div>
          <div className="nav-section">
            <div className={`nav-item is-section ${reached === 0 ? 'is-on' : ''}`}>
              <Marker state={reached > 0 ? 'done' : 'doing'}>1</Marker>
              <span><strong>Your brief</strong><em>A few questions, about 3 minutes</em></span>
            </div>
            {reached === 0 && (
              <ol className="nav-steps">
                {BRIEF_NAMES.map((name, index) => (
                  <li key={name}>
                    <button className={index === step ? 'is-on' : index < step ? 'is-done' : ''} onClick={() => index <= step && setStep(index)} disabled={index > step}>
                      <i />{name}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {LATER.map(([stage, name, text], index) => {
            const at = ORDER.indexOf(stage)
            const state = reached > at ? 'done' : reached === at ? 'doing' : 'todo'
            return (
              <div key={stage} className={`nav-item ${state === 'doing' ? 'is-on' : ''} ${state === 'todo' ? 'is-later' : ''}`}>
                <Marker state={state}>{index + 2}</Marker>
                <span><strong>{name}</strong><em>{text}</em></span>
              </div>
            )
          })}
          <p className="nav-foot">Everything stays on your computer. You can close this page any time; your answers are kept.</p>
        </nav>
        <main className="studio-main">
          <section className="studio-body">{body}</section>
          {session.stage !== 'brief' && <Conversation session={session} listening={listening} />}
        </main>
      </div>
    </div>
  )
}
