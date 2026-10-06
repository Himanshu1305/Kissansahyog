import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// Client-side QR (no third-party QR service). Renders `value` into a canvas.
export default function WhatsAppQR({ value, size = 160, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !value) return
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: '#14532d', light: '#ffffff' } }).catch(() => {})
  }, [value, size])
  if (!value) return null
  return <canvas ref={ref} width={size} height={size} className={className} aria-hidden="true" />
}

// Render a high-resolution QR PNG and trigger a download (for posters).
export async function downloadQrPng(value, filename = 'kissansahyog-whatsapp-qr.png', px = 1024) {
  try {
    const dataUrl = await QRCode.toDataURL(value, { width: px, margin: 2, color: { dark: '#14532d', light: '#ffffff' } })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  } catch { /* ignore */ }
}
