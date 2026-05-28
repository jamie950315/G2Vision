import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import { classifyEvenHubEvent } from './events.js'

describe('EvenHub event classification', () => {
  it('maps click and missing event type to press', () => {
    assert.equal(classifyEvenHubEvent({ textEvent: { eventType: OsEventTypeList.CLICK_EVENT } } as EvenHubEvent), 'press')
    assert.equal(classifyEvenHubEvent({} as EvenHubEvent), 'press')
  })

  it('maps double click separately from press', () => {
    assert.equal(
      classifyEvenHubEvent({ sysEvent: { eventType: OsEventTypeList.DOUBLE_CLICK_EVENT } } as EvenHubEvent),
      'doublePress',
    )
  })

  it('maps scroll top to forward response scrolling', () => {
    assert.equal(
      classifyEvenHubEvent({ textEvent: { eventType: OsEventTypeList.SCROLL_TOP_EVENT } } as EvenHubEvent),
      'scrollUp',
    )
  })

  it('maps scroll bottom to backward response scrolling', () => {
    assert.equal(
      classifyEvenHubEvent({ jsonData: { eventType: 'SCROLL_BOTTOM_EVENT' } } as EvenHubEvent),
      'scrollDown',
    )
    assert.equal(classifyEvenHubEvent({ jsonData: { Event_Type: 2 } } as EvenHubEvent), 'scrollDown')
  })
})
