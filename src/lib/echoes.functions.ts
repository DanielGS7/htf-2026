/**
 * @file Server function to report an echo from the desktop dialog (runs the AI echo pipeline).
 * @exports createEcho
 * @usedBy src/components/glitches/ReportEchoDialog.tsx
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { DISTRICTS } from '#/lib/glitch.ts'
import { requireGuardian } from '#/server/auth.ts'
import { ingestEcho, type IngestResult } from '#/server/echo-pipeline.ts'

const districtIds = DISTRICTS.map((d) => d.id) as [string, ...string[]]

export const createEcho = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z
      .object({
        description: z.string().trim().min(3, 'Describe what you saw').max(1000),
        districtId: z.enum(districtIds).nullable(),
        imageUrl: z.string().max(2_000_000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<IngestResult> => {
    const me = await requireGuardian()
    return ingestEcho({
      description: data.description,
      districtId: data.districtId as IngestResult['echo']['districtId'],
      guardianId: me.guardianId,
      imageUrl: data.imageUrl ?? null,
    })
  })
