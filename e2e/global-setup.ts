/**
 * @file Playwright global setup: re-seed the database so every run starts from the demo state.
 */
import { execSync } from 'node:child_process'

export default function globalSetup() {
  execSync('npm run db:seed', { stdio: 'inherit' })
}
