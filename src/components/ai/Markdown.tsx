/**
 * @file Small themed Markdown renderer (react-markdown) used by the runbook and Oracle chat.
 * @exports Markdown
 * @usedBy src/components/ai/RunbookPanel.tsx, src/components/ai/OracleChat.tsx
 */
import ReactMarkdown from 'react-markdown'

export function Markdown({ children, compact = false }: { children: string; compact?: boolean }) {
  return (
    <div className={`text-sm leading-relaxed text-fg ${compact ? 'space-y-1.5' : 'space-y-2.5'}`}>
      <ReactMarkdown
        components={{
          h1: (p) => <h3 className="text-base font-semibold text-fg" {...p} />,
          h2: (p) => <h3 className="mt-3 border-b border-line pb-1 text-xs font-semibold uppercase tracking-wide text-accent first:mt-0" {...p} />,
          h3: (p) => <h4 className="mt-2 text-sm font-semibold text-fg" {...p} />,
          p: (p) => <p {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5 marker:text-accent" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5 marker:text-accent" {...p} />,
          strong: (p) => <strong className="font-semibold text-fg" {...p} />,
          code: (p) => <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.85em]" {...p} />,
          a: (p) => <a className="text-accent underline" target="_blank" rel="noreferrer" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-accent/50 pl-3 text-muted" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
