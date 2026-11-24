/**
 * @file Live input level meter for the radio desk: getUserMedia + AnalyserNode, sampled per animation
 * frame. Reports a smoothed level and a peak (0..1), `clipping` (peaks near 1.0 for more than 10% of the
 * last ~2s of frames) and `silentFor` (seconds without signal). Also lists audio input devices.
 * Note: Chrome speech recognition always uses the system default mic, whatever device is metered here.
 * @exports useLevelMeter
 * @usedBy src/routes/radio.tsx
 */
import { useCallback, useEffect, useState } from 'react'

const WINDOW = 120 // frames (~2s at 60fps)
const CLIP_PEAK = 0.97
const SILENCE_LEVEL = 0.01

export type MeterDevice = { deviceId: string; label: string }

export function useLevelMeter(active: boolean, deviceId: string) {
  const [level, setLevel] = useState(0)
  const [peak, setPeak] = useState(0)
  const [clipping, setClipping] = useState(false)
  const [silentFor, setSilentFor] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [devices, setDevices] = useState<MeterDevice[]>([])

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(
        all
          .filter((d) => d.kind === 'audioinput')
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Input ${i + 1}` })),
      )
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!active) return
    let stopped = false
    let raf = 0
    let stream: MediaStream | null = null
    let ctx: AudioContext | null = null
    setError(null)

    async function go() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This page needs a secure context (localhost or https) to read the microphone.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
            // Raw signal: processing would hide clipping and fight the walkie's own level.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
      } catch (e) {
        setError(
          (e as DOMException).name === 'NotAllowedError'
            ? 'Microphone permission was denied. Allow it in the address bar.'
            : 'Could not open that input. Pick another one.',
        )
        return
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      void refreshDevices()
      ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      src.connect(an)
      const buf = new Float32Array(an.fftSize)
      const clips: boolean[] = []
      let clipCount = 0
      let peakHold = 0
      let lastSignal = performance.now()
      let smooth = 0
      let tick = 0
      setRunning(true)

      const loop = () => {
        an.getFloatTimeDomainData(buf)
        let max = 0
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i])
          if (v > max) max = v
          sum += v * v
        }
        const rms = Math.sqrt(sum / buf.length)
        const lv = Math.min(1, rms * 3) // RMS is small for speech; scale for the bar
        smooth = lv > smooth ? lv : smooth * 0.9 + lv * 0.1
        peakHold = max > peakHold ? max : Math.max(0, peakHold - 0.006)
        const c = max >= CLIP_PEAK
        clips.push(c)
        if (c) clipCount++
        if (clips.length > WINDOW && clips.shift()) clipCount--
        const now = performance.now()
        if (max > SILENCE_LEVEL) lastSignal = now
        if (tick++ % 3 === 0) {
          setLevel(smooth)
          setPeak(peakHold)
          setClipping(clips.length >= 30 && clipCount / clips.length > 0.1)
          setSilentFor(Math.floor((now - lastSignal) / 1000))
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }
    void go()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      void ctx?.close()
      setRunning(false)
      setLevel(0)
      setPeak(0)
      setClipping(false)
      setSilentFor(0)
    }
  }, [active, deviceId, refreshDevices])

  useEffect(() => {
    void refreshDevices()
  }, [refreshDevices])

  return { level, peak, clipping, silentFor, error, running, devices, refreshDevices }
}
