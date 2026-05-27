import './styles.css'
import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import {
  clearAppState,
  createCaptureJob,
  fetchAppState,
  fetchEvents,
  type AppStateResponse,
  type JobEvent,
  type JobStatus,
  type ResponseHistoryItem,
} from './api'
import { formatStatus, setDomStatus, trimForG2 } from './render'

const MAIN_ID = 1
const MAIN_NAME = 'main'

type AppView = 'main' | 'history' | 'capture'

let lastEventSeq = 0
let activeJobId: string | undefined
let appView: AppView = 'main'
let busy = false
let historyItems: ResponseHistoryItem[] = []
let historyIndex = 0
const ignoredJobIds = new Set<string>()
type EvenBridge = Awaited<ReturnType<typeof waitForEvenAppBridge>>
let bridge: EvenBridge | undefined

async function show(text: string): Promise<void> {
  const content = trimForG2(text)
  setDomStatus(content)
  if (bridge) {
    const update = new TextContainerUpgrade({
      containerID: MAIN_ID,
      containerName: MAIN_NAME,
      contentOffset: 0,
      contentLength: content.length,
      content,
    })
    await bridge.textContainerUpgrade(update)
  }
}

function mainText(): string {
  const historyLine =
    historyItems.length > 0 ? `History: ${historyItems.length} saved. Scroll up/down to browse.` : 'History: none yet.'

  return formatStatus(
    'External Vision',
    `Single tap G2/R1 or press XIAO button to capture.\n${historyLine}\nNo phone camera is used.`,
  )
}

function applyHistoryFromState(state: AppStateResponse): void {
  const selectedJobId = historyItems[historyIndex]?.jobId
  historyItems = state.history || []

  if (historyItems.length === 0) {
    historyIndex = 0
    return
  }

  const nextIndex = selectedJobId ? historyItems.findIndex((item) => item.jobId === selectedJobId) : -1
  historyIndex = nextIndex >= 0 ? nextIndex : Math.min(historyIndex, historyItems.length - 1)
}

async function refreshAppStateHistory(): Promise<AppStateResponse | undefined> {
  try {
    const state = await fetchAppState()
    applyHistoryFromState(state)
    lastEventSeq = Math.max(lastEventSeq, state.latestSeq)
    return state
  } catch {
    return undefined
  }
}

async function showMainScreen(options: { clearRemote?: boolean } = {}): Promise<void> {
  if (activeJobId) ignoredJobIds.add(activeJobId)
  if (options.clearRemote) {
    const state = await clearAppState().catch(() => undefined)
    if (state) {
      applyHistoryFromState(state)
      lastEventSeq = Math.max(lastEventSeq, state.latestSeq)
    }
  }
  activeJobId = undefined
  appView = 'main'
  await show(mainText())
}

async function showCaptureStatus(title: string, body = ''): Promise<void> {
  appView = 'capture'
  await show(formatStatus(title, body))
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function responseBody(item: ResponseHistoryItem): string {
  return item.result || item.error || 'No result text.'
}

function historyText(): string {
  const item = historyItems[historyIndex]
  if (!item) return mainText()

  const position = `${historyIndex + 1}/${historyItems.length}`
  const title = `${formatHistoryTime(item.createdAt)} ${item.title}`
  return formatStatus(
    'Response History',
    `${position}\n==============================\n${title}\n==============================\nSingle tap: open\nDouble tap: main`,
  )
}

async function showHistoryScreen(index = historyIndex): Promise<void> {
  if (historyItems.length === 0) {
    await showMainScreen()
    return
  }

  historyIndex = Math.min(Math.max(index, 0), historyItems.length - 1)
  appView = 'history'
  activeJobId = undefined
  await show(historyText())
}

async function browseHistory(direction: number): Promise<void> {
  if (historyItems.length === 0) {
    await showMainScreen()
    return
  }

  if (appView !== 'history') {
    await showHistoryScreen(0)
    return
  }

  await showHistoryScreen(historyIndex + direction)
}

async function openSelectedHistory(): Promise<void> {
  const item = historyItems[historyIndex]
  if (!item) {
    await showMainScreen()
    return
  }

  activeJobId = item.jobId
  const title = item.error ? 'Vision error' : 'Vision result'
  await showCaptureStatus(title, responseBody(item))
}

function waitingBodyForStatus(status?: JobStatus, jobId?: string): string {
  const idLine = jobId ? `Job: ${jobId.slice(0, 8)}\n` : ''
  if (status === 'assigned') return `${idLine}Capturing image...`
  if (status === 'uploaded') return `${idLine}Image uploaded. Sending to vision endpoint...`
  if (status === 'analyzing') return `${idLine}AI is analyzing the image...`
  return `${idLine}Waiting for XIAO ESP32S3 Sense...`
}

async function restoreAppState(): Promise<void> {
  const state = await refreshAppStateHistory()
  if (!state) {
    await showMainScreen()
    return
  }

  if (state.status === 1 && state.activeJobId) {
    activeJobId = state.activeJobId
    await showCaptureStatus('Waiting for response', waitingBodyForStatus(state.jobStatus, state.activeJobId))
    return
  }

  if (state.status === 2 && state.activeJobId) {
    activeJobId = state.activeJobId
    const title = state.error ? 'Vision error' : state.source === 'xiao_button' ? 'XIAO button capture' : 'Vision result'
    await showCaptureStatus(title, state.result || state.error || 'No result text.')
    return
  }

  await showMainScreen()
}

async function initG2Page(): Promise<EvenBridge> {
  const nextBridge = await waitForEvenAppBridge()
  bridge = nextBridge
  const bootText = mainText()

  setDomStatus(bootText)
  await nextBridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 0,
          borderColor: 5,
          paddingLength: 6,
          containerID: MAIN_ID,
          containerName: MAIN_NAME,
          content: bootText,
          isEventCapture: 1,
        }),
      ],
    }),
  )
  return nextBridge
}

async function runEvenHubCapture(): Promise<void> {
  if (busy) return

  busy = true
  try {
    if (activeJobId) ignoredJobIds.add(activeJobId)
    if (activeJobId || appView === 'capture') {
      const state = await clearAppState().catch(() => undefined)
      if (state) applyHistoryFromState(state)
    }
    activeJobId = undefined
    await showCaptureStatus('Waiting for response', 'Creating external camera request...')
    const response = await createCaptureJob()
    activeJobId = response.id
    await showCaptureStatus('Waiting for response', `Job: ${response.id.slice(0, 8)}\nWaiting for XIAO ESP32S3 Sense...`)
  } catch (error) {
    await showCaptureStatus('Capture request failed', error instanceof Error ? error.message : String(error))
  } finally {
    busy = false
  }
}

async function handleEvent(event: JobEvent): Promise<void> {
  if (ignoredJobIds.has(event.jobId)) return

  if (event.source === 'xiao_button' && event.jobId !== activeJobId) {
    if (activeJobId) ignoredJobIds.add(activeJobId)
    activeJobId = event.jobId
  }

  const isRelevant = event.jobId === activeJobId
  if (!isRelevant) return

  if (event.status === 'queued') {
    await showCaptureStatus('Waiting for response', 'Waiting for external camera.')
  } else if (event.status === 'assigned') {
    await showCaptureStatus('Waiting for response', 'Capturing image...')
  } else if (event.status === 'uploaded') {
    await showCaptureStatus('Waiting for response', 'Image uploaded. Sending to vision endpoint...')
  } else if (event.status === 'analyzing') {
    await showCaptureStatus('Waiting for response', 'AI is analyzing the image...')
  } else if (event.status === 'done') {
    const prefix = event.source === 'xiao_button' ? 'XIAO button capture' : 'Vision result'
    await showCaptureStatus(prefix, event.result || 'No result text.')
    await refreshAppStateHistory()
  } else if (event.status === 'error') {
    await showCaptureStatus('Vision error', event.error || 'Unknown error')
    await refreshAppStateHistory()
  }
}

async function pollEvents(): Promise<void> {
  try {
    const response = await fetchEvents(lastEventSeq)
    for (const event of response.events) {
      lastEventSeq = Math.max(lastEventSeq, event.seq)
      await handleEvent(event)
    }
    lastEventSeq = Math.max(lastEventSeq, response.latestSeq)
  } catch (error) {
    setDomStatus(`Event polling failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const g2Bridge = await initG2Page()
await restoreAppState()

g2Bridge.onEvenHubEvent((event) => {
  const rawType = event.textEvent?.eventType ?? event.sysEvent?.eventType ?? event.jsonData?.eventType
  const type = OsEventTypeList.fromJson(rawType) ?? rawType
  const isPress = type === OsEventTypeList.CLICK_EVENT || type === undefined
  const isDoublePress = type === OsEventTypeList.DOUBLE_CLICK_EVENT
  const isScrollUp = type === OsEventTypeList.SCROLL_TOP_EVENT
  const isScrollDown = type === OsEventTypeList.SCROLL_BOTTOM_EVENT

  if (isPress && appView === 'history') {
    void openSelectedHistory()
  } else if (isPress) {
    void runEvenHubCapture()
  } else if (isScrollUp && (appView === 'main' || appView === 'history')) {
    void browseHistory(1)
  } else if (isScrollDown && (appView === 'main' || appView === 'history')) {
    void browseHistory(-1)
  } else if (isDoublePress && (appView === 'capture' || appView === 'history')) {
    void showMainScreen({ clearRemote: true })
  }
})

window.setInterval(() => {
  void pollEvents()
}, 1500)

void pollEvents()
