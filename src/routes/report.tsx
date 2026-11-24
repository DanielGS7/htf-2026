/**
 * @file Route /report — Report an echo. PLACEHOLDER: owned and replaced by WP-E (see PRD.md).
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/report')({
  component: () => <h1 className="text-3xl font-semibold text-fg">Report an echo</h1>,
})
