/**
 * @file Pill showing whether Claude is online ("AI online · model") or the offline heuristics are active.
 * @exports AiBadge
 * @usedBy src/routes/oracle.tsx, other work packages
 */
import { useEffect, useState } from 'react'
import { Sparkles, WifiOff } from 'lucide-react'
import { getAiStatus, type AiStatus } from '#/lib/ai.functions.ts'

export function AiBadge() {
  const [status, setStatus] = useState<AiStatus | null>(null)
  useEffect(() => {
    let alive = true
    getAiStatus().then((s) => alive && setStatus(s)).catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  if (!status) return <span className="inline-block h-6 w-28 animate-pulse rounded-full bg-subtle" />
  return status.enabled ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
      <Sparkles className="size-3.5" /> AI online · {status.model}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-2.5 py-1 text-xs font-medium text-muted">
      <WifiOff className="size-3.5" /> Offline heuristics
    </span>
  )
}
