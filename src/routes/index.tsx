import {createFileRoute} from '@tanstack/react-router'
import {GlitchesTable} from '#/components/GlitchesTable.tsx'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <GlitchesTable />
    </div>
  )
}
