/**
 * @file Route /oracle: scrying terminal to chat with the Oracle of Achrona (AI grounded in live glitch
 * data). PageHeader with the AI status tag; the witch lurks beside the chat on wide screens.
 * @usedBy router
 */
import { createFileRoute } from '@tanstack/react-router'
import { AiBadge } from '#/components/ai/AiBadge.tsx'
import { OracleChat } from '#/components/ai/OracleChat.tsx'
import { PageHeader } from '#/components/ui/PageHeader.tsx'

export const Route = createFileRoute('/oracle')({ component: OraclePage })

function OraclePage() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <PageHeader label="Scrying terminal" title="The Oracle" subtitle="Ask about glitches, districts and what to fix first." actions={<AiBadge />} />
      <OracleChat />
      <img
        src="/htf/character-3.avif"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-60 bottom-0 hidden h-64 w-auto 2xl:block"
      />
    </div>
  )
}
