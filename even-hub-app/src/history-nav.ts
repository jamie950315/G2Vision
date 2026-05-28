export function nextHistoryIndex(params: {
  currentIndex: number
  direction: number
  isInHistory: boolean
  total: number
}): number {
  if (params.total <= 0) return 0

  if (!params.isInHistory) return params.direction < 0 ? params.total - 1 : 0

  return Math.min(Math.max(params.currentIndex + params.direction, 0), params.total - 1)
}
