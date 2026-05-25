const statusEl = document.getElementById('status')

export function setDomStatus(text: string): void {
  if (statusEl) statusEl.textContent = text
}

export function trimForG2(text: string): string {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1800)
}

export function formatStatus(title: string, body = ''): string {
  const text = body ? `${title}\n${body}` : title
  return trimForG2(text)
}
