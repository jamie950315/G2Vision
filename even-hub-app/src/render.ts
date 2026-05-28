import { normalizeMathForDisplay } from './math-text'

const statusEl = typeof document === 'undefined' ? null : document.getElementById('status')
const encoder = new TextEncoder()

const G2_TEXT_MAX_BYTES = 6000
const G2_TEXT_MAX_CHARS = 2000

export function setDomStatus(text: string): void {
  if (!statusEl) return

  statusEl.textContent = text
  if (typeof window === 'undefined') return

  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0)
  })
}

function byteLength(text: string): number {
  return encoder.encode(text).length
}

function normalizeForG2(text: string): string {
  return normalizeMathForDisplay(text).replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

function takeUtf8Prefix(text: string, maxBytes: number, maxChars = G2_TEXT_MAX_CHARS): string {
  let bytes = 0
  let end = 0
  let chars = 0

  for (const char of text) {
    const charBytes = byteLength(char)
    if (chars >= maxChars) break
    if (bytes + charBytes > maxBytes) break
    bytes += charBytes
    end += char.length
    chars += 1
  }

  return text.slice(0, end)
}

export function trimForG2(text: string, maxBytes = G2_TEXT_MAX_BYTES): string {
  return takeUtf8Prefix(normalizeForG2(text), maxBytes)
}

export function formatStatus(title: string, body = ''): string {
  const text = body ? `${title}\n${body}` : title
  return trimForG2(text)
}
