import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nextHistoryIndex } from './history-nav.js'

describe('history navigation', () => {
  it('enters history from the main screen at the first item when scrolling down', () => {
    assert.equal(nextHistoryIndex({ currentIndex: 0, direction: 1, isInHistory: false, total: 3 }), 0)
  })

  it('enters history from the main screen at the last item when scrolling up', () => {
    assert.equal(nextHistoryIndex({ currentIndex: 0, direction: -1, isInHistory: false, total: 3 }), 2)
  })

  it('moves forward on down and backward on up while browsing history', () => {
    assert.equal(nextHistoryIndex({ currentIndex: 0, direction: 1, isInHistory: true, total: 3 }), 1)
    assert.equal(nextHistoryIndex({ currentIndex: 1, direction: 1, isInHistory: true, total: 3 }), 2)
    assert.equal(nextHistoryIndex({ currentIndex: 2, direction: -1, isInHistory: true, total: 3 }), 1)
    assert.equal(nextHistoryIndex({ currentIndex: 1, direction: -1, isInHistory: true, total: 3 }), 0)
  })

  it('stays inside the available history range', () => {
    assert.equal(nextHistoryIndex({ currentIndex: 2, direction: 1, isInHistory: true, total: 3 }), 2)
    assert.equal(nextHistoryIndex({ currentIndex: 0, direction: -1, isInHistory: true, total: 3 }), 0)
    assert.equal(nextHistoryIndex({ currentIndex: 0, direction: 1, isInHistory: false, total: 0 }), 0)
  })
})
