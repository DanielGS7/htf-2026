/**
 * @file Toast system. <ToastProvider> mounts the stack and feeds it from `toast` live events;
 * `useToast()` returns push({ tone, message }) for local toasts.
 * @exports ToastProvider, useToast
 * @usedBy src/components/layout/AppProviders.tsx
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from 'lucide-react'
import { useLiveEvents } from '#/lib/useLiveEvents.ts'

type Tone = 'info' | 'warning' | 'danger' | 'success'
type ToastItem = { id: number; tone: Tone; message: string }
type Push = (t: { tone?: Tone; message: string }) => void

const Ctx = createContext<Push>(() => {})
export const useToast = () => useContext(Ctx)

const ICON = { info: Info, warning: AlertTriangle, danger: OctagonAlert, success: CheckCircle2 }
const COLOR: Record<Tone, string> = {
  info: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const push = useCallback<Push>(
    ({ tone = 'info', message }) => {
      const id = nextId++
      setItems((l) => [...l.slice(-4), { id, tone, message }])
      setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )

  useLiveEvents((e) => {
    if (e.type === 'toast') push({ tone: e.tone, message: e.message })
  })

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4"
      >
        {items.map((t) => {
          const Icon = ICON[t.tone]
          return (
            <div key={t.id} className="glass float-in pointer-events-auto flex items-start gap-3 rounded-xl p-3">
              <Icon className={`mt-0.5 size-5 shrink-0 ${COLOR[t.tone]}`} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button type="button" aria-label="Dismiss" title="Dismiss" onClick={() => dismiss(t.id)} className="text-muted hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
