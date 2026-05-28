import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildResponsePages, clampPageIndex, trimForG2 } from './render.js'

const encoder = new TextEncoder()

function bytes(text: string): number {
  return encoder.encode(text).length
}

describe('response paging', () => {
  it('keeps short responses on a single page', () => {
    assert.deepEqual(buildResponsePages('Vision result', 'Short answer.', 160), ['Vision result\nShort answer.'])
  })

  it('splits long responses into byte-safe pages', () => {
    const body = Array.from({ length: 40 }, (_, index) => `section-${index + 1}`).join(' ')
    const pages = buildResponsePages('Vision result', body, 140)

    assert.ok(pages.length > 1)
    assert.ok(pages.every((page) => bytes(page) <= 140))
    assert.ok(pages[0].includes('1/'))
    assert.ok(pages.at(-1)?.includes(`/${pages.length}`))
    assert.ok(pages.at(-1)?.includes('section-40'))
  })

  it('handles multibyte Chinese text without exceeding the display budget', () => {
    const body = '這是一段需要分頁的回覆。'.repeat(30)
    const pages = buildResponsePages('Vision result', body, 150)

    assert.ok(pages.length > 1)
    assert.ok(pages.every((page) => bytes(page) <= 150))
  })

  it('trims general text to a byte budget', () => {
    const text = trimForG2('你好'.repeat(20), 31)

    assert.ok(bytes(text) <= 31)
  })
})

describe('page index clamping', () => {
  it('prevents response scrolling past either end', () => {
    assert.equal(clampPageIndex(-1, 3), 0)
    assert.equal(clampPageIndex(1, 3), 1)
    assert.equal(clampPageIndex(9, 3), 2)
    assert.equal(clampPageIndex(9, 0), 0)
  })
})
