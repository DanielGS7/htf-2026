/**
 * @file Route /join — one-tap quick join (QR target). Creates a passwordless defender with a
 * generated codename, then redirects to /report (or `?next=`).
 */
import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Shield, Sparkles } from 'lucide-react'
import { AuthShell } from '#/components/layout/AuthShell'
import { Button } from '#/components/ui/Button'
import { joinFn } from '#/lib/auth.functions'

export const Route = createFileRoute('/join')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === 'string' && s.next.startsWith('/') && !s.next.startsWith('//') ? s.next : undefined,
  }),
  component: JoinPage,
})

function JoinPage() {
  const { next } = Route.useSearch()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      const res = await joinFn()
      if (!res.ok) {
        setError(res.error)
        return
      }
      await router.invalidate()
      await router.navigate({ href: next ?? '/report' })
    } catch {
      setError('Could not reach the grid. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell character={4} title="Become a guardian" subtitle="Achrona is under attack. Help us defend it.">
      <ul className="mb-6 space-y-3 text-sm text-muted">
        <li className="flex gap-3"><Shield className="size-5 shrink-0 text-accent" /> You get a secret codename. No sign-up, no password.</li>
        <li className="flex gap-3"><Sparkles className="size-5 shrink-0 text-accent" /> Report strange things you see: the Oracle groups them live.</li>
      </ul>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <Button size="lg" className="w-full" onClick={join} disabled={busy}>
        <Shield className="size-5" />
        {busy ? 'Forging your codename...' : 'Join the defense'}
      </Button>
      <p className="mt-5 text-center text-sm text-muted">
        Commander?{' '}
        <Link to="/login" className="font-semibold text-accent hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
