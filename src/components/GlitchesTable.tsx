import { EllipsisVertical } from 'lucide-react'
import { Card } from '#/components/ui/Card.tsx'
import { IconButton } from '#/components/ui/IconButton.tsx'
import type { Glitch } from '#/lib/glitch.ts'

// Placeholder rows — replace with real data once the API is wired up.
const glitches: Glitch[] = [
  { glitchId: 'GL-0142', status: 'LEAKED', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z' },
  { glitchId: 'GL-0141', status: 'ASSESSING', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z' },
  { glitchId: 'GL-0139', status: 'CONTAINING', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z' },
  { glitchId: 'GL-0137', status: 'FIXED', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z' },
]

const columns = ['ID', 'Status', 'Description', 'Timestamp', 'Action']

const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function GlitchesTable() {
  return (
    <Card className="p-8">
      <h2 className="mb-8 text-2xl text-fg">All Glitches</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-lg text-muted">
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={`bg-subtle px-5 py-5 font-normal ${
                    i === 0 ? 'rounded-l-2xl' : ''
                  } ${i === columns.length - 1 ? 'rounded-r-2xl text-center' : ''}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-lg text-fg">
            {glitches.map((glitch) => (
              <tr key={glitch.glitchId}>
                <td className="px-5 py-5 whitespace-nowrap">{glitch.glitchId}</td>
                <td className="px-5 py-5">{glitch.status}</td>
                <td className="px-5 py-5">{glitch.description}</td>
                <td className="px-5 py-5 whitespace-nowrap">
                  {/* Server and browser time zones can differ; the browser's wins. */}
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {timestampFormat.format(new Date(glitch.timestamp))}
                  </time>
                </td>
                <td className="px-5 py-5 text-center">
                  <IconButton aria-label={`${glitch.glitchId} actions`}>
                    <EllipsisVertical className="size-5" />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
