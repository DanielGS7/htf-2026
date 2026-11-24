/**
 * @file QR code that sends the audience to `${origin}/join` (F30). Pass `base` to override the origin
 * (e.g. the venue URL when the projector is on localhost).
 * @exports JoinQr
 * @usedBy src/routes/mission.tsx
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function JoinQr({ base, size = 220 }: { base?: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(`${(base || window.location.origin).replace(/\/$/, '')}/join`)
  }, [base])

  useEffect(() => {
    if (!url) return
    let alive = true
    QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#12102a', light: '#ffffff' } })
      .then((d) => alive && setDataUrl(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [url])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-2.5 shadow-[0_0_40px_-6px_var(--glow)]" style={{ width: size, height: size }}>
        {dataUrl ? <img src={dataUrl} alt={`QR code for ${url}`} className="size-full" /> : <div className="size-full animate-pulse rounded-lg bg-zinc-200" />}
      </div>
      <p className="max-w-full truncate font-mono text-sm text-muted">{url ?? ''}</p>
    </div>
  )
}
