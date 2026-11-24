/**
 * @file Route /leaderboard — Leaderboard. PLACEHOLDER: owned and replaced by WP-E (see PRD.md).
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/leaderboard')({
  component: () => <h1 className="text-3xl font-semibold text-fg">Leaderboard</h1>,
})
