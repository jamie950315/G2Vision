const statusEl = typeof document === 'undefined' ? null : document.getElementById('status')
const encoder = new TextEncoder()

const G2_TEXT_MAX_BYTES = 950
const MIN_PAGE_BODY_BYTES = 120

export function setDomStatus(text: string): void {
  if (statusEl) statusEl.textContent = text
}

function byteLength(text: string): number {
  return encoder.encode(text).length
}

function normalizeForG2(text: string): string {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

function takeUtf8Prefix(text: string, maxBytes: number): string {
  let bytes = 0
  let end = 0

  for (const char of text) {
    const charBytes = byteLength(char)
    if (bytes + charBytes > maxBytes) break
    bytes += charBytes
    end += char.length
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

function nextCodePoint(text: string, index: number): { char: string; nextIndex: number } {
  const codePoint = text.codePointAt(index)
  if (codePoint === undefined) return { char: '', nextIndex: index }
  const char = String.fromCodePoint(codePoint)
  return { char, nextIndex: index + char.length }
}

function skipLeadingWhitespace(text: string, index: number): number {
  let cursor = index

  while (cursor < text.length) {
    const { char, nextIndex } = nextCodePoint(text, cursor)
    if (!/\s/.test(char)) break
    cursor = nextIndex
  }

  return cursor
}

function takePage(text: string, start: number, maxBytes: number): { chunk: string; nextIndex: number } {
  let cursor = start
  let bytes = 0
  let lastBreak = -1

  while (cursor < text.length) {
    const { char, nextIndex } = nextCodePoint(text, cursor)
    const charBytes = byteLength(char)
    if (bytes + charBytes > maxBytes) break
    if (/\s/.test(char)) lastBreak = nextIndex
    bytes += charBytes
    cursor = nextIndex
  }

  if (cursor === start) {
    const { nextIndex } = nextCodePoint(text, start)
    cursor = nextIndex
  } else if (cursor < text.length && lastBreak > start && cursor - lastBreak < 80) {
    cursor = lastBreak
  }

  const nextIndex = skipLeadingWhitespace(text, cursor)
  return { chunk: text.slice(start, cursor).trim(), nextIndex }
}

function chunkByUtf8(text: string, maxBytes: number): string[] {
  if (!text) return ['']

  const chunks: string[] = []
  let cursor = 0

  while (cursor < text.length) {
    const page = takePage(text, cursor, maxBytes)
    chunks.push(page.chunk)
    cursor = page.nextIndex
  }

  return chunks
}

export function buildResponsePages(title: string, body: string, maxBytes = G2_TEXT_MAX_BYTES): string[] {
  const normalizedTitle = normalizeForG2(title) || 'Vision result'
  const normalizedBody = normalizeForG2(body) || 'No result text.'
  const fullText = `${normalizedTitle}\n${normalizedBody}`

  if (byteLength(fullText) <= maxBytes) return [fullText]

  const headerBytes = byteLength(`${normalizedTitle}\n999/999\n`)
  const bodyBytes = Math.max(MIN_PAGE_BODY_BYTES, maxBytes - headerBytes)
  const bodyPages = chunkByUtf8(normalizedBody, bodyBytes)

  return bodyPages.map((page, index) => trimForG2(`${normalizedTitle}\n${index + 1}/${bodyPages.length}\n${page}`, maxBytes))
}

export function clampPageIndex(index: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  return Math.min(Math.max(index, 0), pageCount - 1)
}
