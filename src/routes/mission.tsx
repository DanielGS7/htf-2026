/**
 * @file Route /mission — Mission control. PLACEHOLDER: owned and replaced by WP-C (see PRD.md).
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mission')({
  component: () => <h1 className="text-3xl font-semibold text-fg">Mission control</h1>,
})
