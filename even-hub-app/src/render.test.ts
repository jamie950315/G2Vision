import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatStatus, trimForG2 } from './render.js'

const encoder = new TextEncoder()

function bytes(text: string): number {
  return encoder.encode(text).length
}

describe('response rendering', () => {
  it('trims general text to a byte budget', () => {
    const text = trimForG2('你好'.repeat(20), 31)

    assert.ok(bytes(text) <= 31)
  })

  it('keeps long responses as one scrollable text instead of adding page markers', () => {
    const body = Array.from({ length: 80 }, (_, index) => `section-${index + 1}`).join('\n')
    const text = formatStatus('Vision result', body)

    assert.ok(bytes(text) <= 6000)
    assert.match(text, /Vision result/)
    assert.match(text, /section-80/)
    assert.doesNotMatch(text, /\n1\/\d+\n/)
  })

  it('keeps the SDK content within the documented 2000-character limit', () => {
    const text = trimForG2('a'.repeat(2100))

    assert.equal(Array.from(text).length, 2000)
  })
})
