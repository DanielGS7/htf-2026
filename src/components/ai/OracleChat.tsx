/**
 * @file Chat UI for the Oracle of Achrona: message list, suggested questions, typing indicator,
 * Markdown answers. Conversation history is sent with each question.
 * @exports OracleChat
 * @usedBy src/routes/oracle.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { askOracleFn } from '#/lib/ai.functions.ts'
import { Markdown } from './Markdown.tsx'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTED = [
  "What's the most critical glitch right now?",
  'Which district is in most danger?',
  'What should we fix first?',
  'How healthy is the magic level?',
]

export function OracleChat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Braces matter: newer Chrome returns a Promise from scrollIntoView, which React would call as cleanup.
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    const history = messages.slice(-10)
    setMessages((m) => [...m, { role: 'user', content: question }])
    setInput('')
    setBusy(true)
    try {
      const { answer } = await askOracleFn({ data: { question, history } })
      setMessages((m) => [...m, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `The mists are too thick: ${(e as Error).message || 'the Oracle could not answer.'}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass hud flex h-[min(70vh,640px)] flex-col rounded-lg">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <img src="/htf/oracle-orb.png" alt="" aria-hidden className="size-6" />
        <span className="label">Scrying terminal</span>
        <span className="label ml-auto text-success">connected</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <img src="/htf/oracle-orb.png" alt="" aria-hidden className="drift size-24" />
            <p className="max-w-sm text-sm text-fg">Ask, guardian. The Oracle reads the ley lines and the echoes of Achrona.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="min-h-9 rounded-sm border border-line bg-subtle px-2.5 py-1.5 text-left text-sm font-medium text-fg transition hover:border-accent/60 hover:bg-subtle-hover"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-md border border-accent/50 bg-accent/15 px-3.5 py-2 text-sm text-fg break-words">
                <p className="label mb-0.5 text-accent-ink">You</p>
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <img src="/htf/oracle-orb.png" alt="" aria-hidden className="mt-1 size-8 shrink-0" />
              <div className="min-w-0 max-w-[92%] rounded-md border border-line bg-panel px-3.5 py-2.5">
                <p className="label mb-1 text-magic-soft">Oracle</p>
                <Markdown compact>{m.content}</Markdown>
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-start gap-2" aria-label="The Oracle is thinking">
            <img src="/htf/oracle-orb.png" alt="" aria-hidden className="size-8 shrink-0 animate-pulse" />
            <div className="flex gap-1 rounded-md border border-line bg-panel px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce bg-magic-soft" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={600}
          placeholder="Ask the Oracle..."
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-app px-3 text-base text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-[linear-gradient(180deg,var(--accent-from),var(--accent)_70%,var(--accent-to))] text-on-accent shadow-[inset_0_-3px_0_rgb(0_0_0/0.28)] transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
