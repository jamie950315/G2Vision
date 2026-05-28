import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'

export type EvenHubInputAction = 'press' | 'doublePress' | 'scrollUp' | 'scrollDown' | 'other'

function readJsonEventType(event: EvenHubEvent): unknown {
  const jsonData = event.jsonData
  return jsonData?.eventType ?? jsonData?.Event_Type ?? jsonData?.event_type
}

export function readEvenHubEventType(event: EvenHubEvent): unknown {
  return event.textEvent?.eventType ?? event.sysEvent?.eventType ?? event.listEvent?.eventType ?? readJsonEventType(event)
}

export function normalizeEvenHubEventType(rawType: unknown): unknown {
  return OsEventTypeList.fromJson(rawType) ?? rawType
}

export function classifyEvenHubEvent(event: EvenHubEvent): EvenHubInputAction {
  const type = normalizeEvenHubEventType(readEvenHubEventType(event))

  if (type === OsEventTypeList.CLICK_EVENT || type === undefined) return 'press'
  if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) return 'doublePress'
  if (type === OsEventTypeList.SCROLL_TOP_EVENT) return 'scrollUp'
  if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) return 'scrollDown'
  return 'other'
}

export function eventDebugInfo(event: EvenHubEvent): Record<string, unknown> {
  return {
    rawType: readEvenHubEventType(event),
    type: normalizeEvenHubEventType(readEvenHubEventType(event)),
    textEventType: event.textEvent?.eventType,
    sysEventType: event.sysEvent?.eventType,
    listEventType: event.listEvent?.eventType,
    jsonDataType: readJsonEventType(event),
  }
}
