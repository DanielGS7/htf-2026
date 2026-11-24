/**
 * @file Route /admin — Command deck. PLACEHOLDER: owned and replaced by WP-C (see PRD.md).
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin')({
  component: () => <h1 className="text-3xl font-semibold text-fg">Command deck</h1>,
})
