/**
 * @file Chat UI for the Oracle of Achrona: message list, suggested questions, typing indicator,
 * Markdown answers. Conversation history is sent with each question.
 * @exports OracleChat
 * @usedBy src/routes/oracle.tsx
 */
import { useEffect, useRef, useState } from 'react'
import { Eye, Send } from 'lucide-react'
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
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages, busy])

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
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_0_40px_-12px_var(--glow)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-accent-from to-accent-to text-on-accent shadow-[0_0_30px_var(--glow)]">
              <Eye className="size-7" />
            </div>
            <p className="max-w-sm text-sm text-muted">Ask, guardian. The Oracle reads the ley lines and the echoes of Achrona.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-line bg-subtle px-3 py-1.5 text-xs text-fg transition hover:bg-subtle-hover"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-sm text-on-accent'
                  : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-panel px-3.5 py-2.5'
              }
            >
              {m.role === 'user' ? m.content : <Markdown compact>{m.content}</Markdown>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" aria-label="The Oracle is thinking">
            <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 150}ms` }} />
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
          className="min-w-0 flex-1 rounded-xl border border-line bg-app px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="grid size-10 place-items-center rounded-xl bg-accent text-on-accent transition hover:opacity-90 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
