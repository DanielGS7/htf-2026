/**
 * @file Route /radio — walkie-talkie radio desk (F31). PLACEHOLDER: owned and replaced by G4 (see PRD.md).
 */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/radio')({
  component: () => <h1 className="font-gothic text-5xl">Radio desk</h1>,
})
