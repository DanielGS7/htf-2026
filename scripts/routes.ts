/**
 * @file `npm run routes` — regenerate src/routeTree.gen.ts without a full build
 * (needed after adding/removing a file in src/routes/ so typed <Link to> works).
 * Mirrors what the TanStack Start vite plugin generates, including its footer.
 */
import { Generator, getConfig } from '@tanstack/router-generator'

const config = getConfig({
  target: 'react',
  routesDirectory: './src/routes',
  generatedRouteTree: './src/routeTree.gen.ts',
  routeTreeFileFooter: [[
    "import type { getRouter } from './router.tsx'",
    "import type { createStart } from '@tanstack/react-start'",
    "declare module '@tanstack/react-start' {",
    '  interface Register {',
    '    ssr: true',
    '    router: Awaited<ReturnType<typeof getRouter>>',
    '  }',
    '}',
  ].join('\n')],
})
await new Generator({ config, root: process.cwd() }).run()
console.log('src/routeTree.gen.ts regenerated')
