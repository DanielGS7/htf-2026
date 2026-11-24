/**
 * @file Route /oracle: chat with the Oracle of Achrona (AI grounded in live glitch data).
 * @usedBy router
 */
import { createFileRoute } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { AiBadge } from '#/components/ai/AiBadge.tsx'
import { OracleChat } from '#/components/ai/OracleChat.tsx'

export const Route = createFileRoute('/oracle')({ component: OraclePage })

function OraclePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-accent-from to-accent-to text-on-accent shadow-[0_0_24px_var(--glow)]">
            <Eye className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-fg">The Oracle of Achrona</h1>
            <p className="text-sm text-muted">Ask about glitches, districts and what to fix first.</p>
          </div>
        </div>
        <AiBadge />
      </header>
      <OracleChat />
    </div>
  )
}
