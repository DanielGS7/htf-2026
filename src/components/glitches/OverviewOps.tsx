/**
 * @file Overview header widgets: magic gauge + compact map. Inline placeholders until WP-C's
 * MagicGauge / AchronaMap exist (swap the TODO blocks for the real imports, see PRD §8).
 * @exports OverviewOps
 * @usedBy src/routes/index.tsx
 */
import type { Glitch } from '#/lib/glitch.ts'

export function OverviewOps({ glitches, onSelect }: { glitches: Glitch[]; onSelect: (id: string) => void }) {
  void onSelect
  const open = glitches.filter((g) => g.status !== 'FIXED').length
  return (
    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
      {/* TODO(WP-C): <MagicGauge /> from #/components/mission/MagicGauge.tsx */}
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Magic gauge</div>
      {/* TODO(WP-C): <AchronaMap glitches={glitches} compact onSelect={onSelect} /> from #/components/map/AchronaMap.tsx */}
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
        Achrona map: {open} open glitches
      </div>
    </div>
  )
}
