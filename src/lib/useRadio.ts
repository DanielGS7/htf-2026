/**
 * @file Radio desk engine (F31). Continuous Web Speech recognition that auto-restarts while "on air",
 * with backoff on errors. A transmission ends when the final text ends with "over" / "over and out"
 * (if `autoOver`), after `silenceSec` seconds without new speech, or on manual `sendNow()`. Each
 * transmission with 3+ words becomes an echo via createEchoField({ source: 'radio' }); the district is
 * guessed from the text. Optionally replies over the air with speechSynthesis.
 * @exports useRadio, RADIO_LANGS, RadioStatus, RadioEntry
 * @usedBy src/routes/radio.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createEchoField } from '#/lib/field.functions.ts'
import type { Outcome } from '#/components/field/OutcomeCard.tsx'
import { MIN_WORDS, detectDistrict, stripOver, wordCount } from '#/components/radio/parse.ts'

export const RADIO_LANGS = [
  { id: 'en-US', label: 'English (US)' },
  { id: 'nl-BE', label: 'Nederlands (BE)' },
  { id: 'nl-NL', label: 'Nederlands (NL)' },
] as const

export type RadioStatus = 'off' | 'starting' | 'listening' | 'restarting' | 'error' | 'unsupported'
export type RadioEntry = {
  id: number
  at: number
  text: string
  districtId: string | null
  trigger: 'over' | 'silence' | 'manual'
  outcome: Outcome | 'sending'
}

type Alt = { transcript: string }
type Res = { isFinal: boolean; 0: Alt; length: number }
type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<Res> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecCtor = new () => Rec

function ctor(): RecCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export type RadioOptions = {
  lang: string
  silenceSec: number
  autoOver: boolean
  reply: boolean
  codename: string
}

function replyText(codename: string, o: Outcome): string {
  if (o.kind !== 'result') return `Sorry ${codename}, that did not go through. Over.`
  const { outcome, glitch } = o.data
  const id = glitch?.glitchId.replace('-', ' ') ?? ''
  if (outcome === 'new-glitch') return `Copy, ${codename}. New glitch opened, ${id}. Over.`
  if (outcome === 'grouped') return `Copy, ${codename}. Grouped with ${id}. Over.`
  if (outcome === 'resolved') return `Copy, ${codename}. ${id} marked fixed. Over.`
  if (outcome === 'reopened') return `Copy, ${codename}. ${id} reopened. Over.`
  return `Negative, ${codename}. Could not verify that report. Over.`
}

export function useRadio(opts: RadioOptions) {
  const [onAir, setOnAir] = useState(false)
  const [status, setStatus] = useState<RadioStatus>('off')
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [finalText, setFinalText] = useState('')
  const [interim, setInterim] = useState('')
  const [log, setLog] = useState<RadioEntry[]>([])
  const [squelched, setSquelched] = useState(0)
  const [supported, setSupported] = useState(true)

  const o = useRef(opts)
  o.current = opts
  const rec = useRef<Rec | null>(null)
  const wantOn = useRef(false)
  const failures = useRef(0)
  const restartTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** Finals of the transmission in progress that were committed by earlier sessions. */
  const carry = useRef('')
  /** Results of the current session already consumed by a sent/discarded transmission. */
  const consumed = useRef(0)
  const sessionLen = useRef(0)
  const live = useRef({ final: '', interim: '' })
  const nextId = useRef(1)
  const send = useRef<(trigger: RadioEntry['trigger']) => void>(() => {})

  useEffect(() => {
    if (!ctor()) {
      setSupported(false)
      setStatus('unsupported')
    }
  }, [])

  const setLive = (f: string, i: string) => {
    live.current = { final: f, interim: i }
    setFinalText(f)
    setInterim(i)
  }

  const clearTx = useCallback(() => {
    clearTimeout(silenceTimer.current)
    carry.current = ''
    consumed.current = sessionLen.current
    setLive('', '')
  }, [])

  send.current = (trigger) => {
    clearTimeout(silenceTimer.current)
    const raw = `${live.current.final} ${live.current.interim}`.trim()
    const { text } = stripOver(raw)
    clearTx()
    if (wordCount(text) < MIN_WORDS) {
      if (raw) setSquelched((n) => n + 1)
      return
    }
    const id = nextId.current++
    const districtId = detectDistrict(text)
    const entry: RadioEntry = { id, at: Date.now(), text, districtId, trigger, outcome: 'sending' }
    setLog((l) => [entry, ...l].slice(0, 30))
    const finish = (outcome: Outcome) => {
      setLog((l) => l.map((e) => (e.id === id ? { ...e, outcome } : e)))
      if (o.current.reply && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(replyText(o.current.codename, outcome))
        u.lang = o.current.lang
        window.speechSynthesis.speak(u)
      }
    }
    createEchoField({ data: { description: text, districtId, imageUrl: null, source: 'radio' } })
      .then((data) => finish({ kind: 'result', data }))
      .catch((e: unknown) => finish({ kind: 'error', message: e instanceof Error ? e.message : 'Send failed' }))
  }

  const armSilence = () => {
    clearTimeout(silenceTimer.current)
    silenceTimer.current = setTimeout(() => send.current('silence'), Math.max(1, o.current.silenceSec) * 1000)
  }

  const startSession = useCallback(() => {
    const C = ctor()
    if (!C || !wantOn.current) return
    const r = new C()
    r.lang = o.current.lang
    r.continuous = true
    r.interimResults = true
    consumed.current = 0
    sessionLen.current = 0
    r.onresult = (e) => {
      failures.current = 0
      sessionLen.current = e.results.length
      let f = ''
      let i = ''
      for (let k = consumed.current; k < e.results.length; k++) {
        if (e.results[k].isFinal) f += `${e.results[k][0].transcript} `
        else i += e.results[k][0].transcript
      }
      const fin = `${carry.current} ${f}`.trim()
      setStatus('listening')
      setStatusNote(null)
      setLive(fin, i.trim())
      if (!fin && !i.trim()) return
      if (o.current.autoOver && fin && stripOver(fin).ended && !i.trim()) {
        send.current('over')
        return
      }
      armSilence()
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantOn.current = false
        setOnAir(false)
        setStatus('error')
        setStatusNote('Speech recognition was blocked. Allow the microphone in the address bar, then go on air again.')
        return
      }
      failures.current++
      setStatus('error')
      setStatusNote(
        e.error === 'network'
          ? 'Speech service unreachable (needs internet). Retrying.'
          : e.error === 'audio-capture'
            ? 'No microphone found. Check the cable and the default input. Retrying.'
            : `Recognition error: ${e.error}. Retrying.`,
      )
    }
    r.onend = () => {
      // Keep what was heard so far: the next session continues the same transmission.
      carry.current = live.current.final
      rec.current = null
      if (!wantOn.current) {
        setStatus('off')
        return
      }
      const delay = failures.current ? Math.min(15000, 1000 * 2 ** (failures.current - 1)) : 250
      setStatus((s) => (s === 'error' ? s : 'restarting'))
      restartTimer.current = setTimeout(startSession, delay)
    }
    rec.current = r
    try {
      r.start()
      setStatus((s) => (s === 'error' || s === 'listening' ? s : 'starting'))
    } catch {
      failures.current++
      restartTimer.current = setTimeout(startSession, 1000)
    }
  }, [])

  const goOnAir = useCallback(() => {
    if (!ctor()) return
    wantOn.current = true
    failures.current = 0
    setOnAir(true)
    setStatus('starting')
    setStatusNote(null)
    startSession()
  }, [startSession])

  const goOffAir = useCallback(() => {
    wantOn.current = false
    clearTimeout(restartTimer.current)
    clearTimeout(silenceTimer.current)
    rec.current?.abort()
    rec.current = null
    carry.current = ''
    setLive('', '')
    setOnAir(false)
    setStatus('off')
    setStatusNote(null)
  }, [])

  useEffect(
    () => () => {
      wantOn.current = false
      clearTimeout(restartTimer.current)
      clearTimeout(silenceTimer.current)
      rec.current?.abort()
      window.speechSynthesis?.cancel()
    },
    [],
  )

  // Language change: restart the session so the new language applies.
  useEffect(() => {
    if (wantOn.current) rec.current?.stop()
  }, [opts.lang])

  return {
    supported,
    onAir,
    status,
    statusNote,
    finalText,
    interim,
    log,
    squelched,
    goOnAir,
    goOffAir,
    sendNow: () => send.current('manual'),
    discard: clearTx,
    clearLog: () => setLog([]),
  }
}
