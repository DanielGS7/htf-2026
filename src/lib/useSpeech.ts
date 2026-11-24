/**
 * @file Hook wrapping the Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * Streams interim results to `onText` as base + transcript. `supported` is false on the
 * server and in browsers without the API (callers hide the mic button then).
 * @exports useSpeech
 * @usedBy src/components/field/EchoComposer.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react'

type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type RecCtor = new () => Rec

export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Rec | null>(null)
  const cb = useRef(onText)
  cb.current = onText

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition))
    return () => rec.current?.stop()
  }, [])

  /** `base` is the text already in the box; speech is appended after it. */
  const start = useCallback((base: string) => {
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    setError(null)
    const r = new Ctor()
    r.lang = navigator.language || 'en-US'
    r.continuous = true
    r.interimResults = true
    const prefix = base && !/\s$/.test(base) ? `${base} ` : base
    r.onresult = (e) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript
      cb.current((prefix + t).trimStart())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Microphone permission was denied.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError('Voice input failed. You can type instead.')
    }
    r.onend = () => {
      setListening(false)
      rec.current = null
    }
    rec.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [])

  const stop = useCallback(() => rec.current?.stop(), [])
  return { supported, listening, error, start, stop }
}
