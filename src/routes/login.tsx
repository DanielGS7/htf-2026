/**
 * @file Route /login — codename + password form; wrong credentials show an inline error.
 * Optional `?next=` path to return to after login. Links to /join (quick-join).
 */
import { useState, type FormEvent } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { KeyRound, LogIn, Sparkles } from 'lucide-react'
import { AuthShell } from '#/components/layout/AuthShell'
import { Button } from '#/components/ui/Button'
import { Input } from '#/components/ui/Input'
import { loginFn } from '#/lib/auth.functions'

export const Route = createFileRoute('/login')({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === 'string' && s.next.startsWith('/') && !s.next.startsWith('//') ? s.next : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { next } = Route.useSearch()
  const router = useRouter()
  const [codename, setCodename] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await loginFn({ data: { codename, password } })
      if (!res.ok) {
        setError(res.error)
        return
      }
      await router.invalidate()
      await router.navigate({ href: next ?? '/' })
    } catch {
      setError('Could not reach the grid. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Guardian login" subtitle="Commanders sign in with codename and password.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Codename" value={codename} onChange={(e) => setCodename(e.target.value)} autoComplete="username" autoFocus required placeholder="e.g. Nova" />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your secret rune" />
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            <KeyRound className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          <LogIn className="size-5" />
          {busy ? 'Opening the gates...' : 'Enter mission control'}
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <Link to="/join" search={next ? { next } : {}} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-subtle font-semibold transition hover:bg-subtle-hover">
        <Sparkles className="size-5 text-accent" />
        Quick join as a defender
      </Link>
    </AuthShell>
  )
}
