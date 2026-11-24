/**
 * @file Opt-in toggle for critical-glitch alerts (F28). Preference lives in localStorage. While on
 * (and mounted), a critical `glitch.created` event vibrates the phone and shows a browser Notification
 * (when permission is granted) plus an in-app toast.
 * @exports NotifyToggle
 * @usedBy src/routes/report.tsx
 */
import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useToast } from '#/components/ui/Toast.tsx'
import { GLITCH_TYPE_META } from '#/lib/glitch.ts'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

const KEY = 'gg.notify'

export function NotifyToggle() {
  const [on, setOn] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  useLiveEvents((e) => {
    if (!on || e.type !== 'glitch.created' || e.glitch.severity !== 'critical') return
    const title = `Critical glitch ${e.glitch.glitchId}`
    const body = `${GLITCH_TYPE_META[e.glitch.type].label}: ${e.glitch.description}`
    try {
      navigator.vibrate?.([200, 100, 200, 100, 400])
    } catch {
      /* ignore */
    }
    toast({ tone: 'danger', message: `${title}. ${body}` })
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, tag: e.glitch.glitchId })
      }
    } catch {
      /* Android Chrome only allows notifications via a service worker; the toast + vibration still fire */
    }
  })

  async function toggle() {
    const next = !on
    setNote(null)
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const p = await Notification.requestPermission()
        if (p !== 'granted') setNote('Browser notifications are blocked. You will still get in-app alerts and vibration.')
      } catch {
        /* ignore */
      }
    } else if (next && typeof Notification === 'undefined') {
      setNote('This browser has no system notifications. You will get in-app alerts and vibration.')
    } else if (next && Notification.permission === 'denied') {
      setNote('Notifications are blocked in browser settings. You will still get in-app alerts.')
    }
    setOn(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title="Get alerted when a critical glitch opens"
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${on ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-subtle text-muted hover:text-fg'}`}
      >
        {on ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        {on ? 'Critical alerts on' : 'Alert me on critical glitches'}
      </button>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  )
}
