import './styles.css'
import {
  waitForEvenAppBridge,
  TextContainerProperty,
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import { createCaptureJob, fetchEvents, type JobEvent } from './api'
import { formatStatus, setDomStatus, trimForG2 } from './render'

const MAIN_ID = 1
const MAIN_NAME = 'main'

let lastEventSeq = 0
let activeJobId: string | undefined
let busy = false
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

async function initG2Page(): Promise<EvenBridge> {
  const nextBridge = await waitForEvenAppBridge()
  bridge = nextBridge
  const bootText = formatStatus(
    'External Vision',
    'Press G2/R1: request external camera capture\nPress XIAO button: direct capture\nNo phone camera is used.',
  )

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
  if (activeJobId) {
    await show(formatStatus('Capture already pending', `Job: ${activeJobId.slice(0, 8)}\nWaiting for image upload...`))
    return
  }

  busy = true
  try {
    await show(formatStatus('Creating capture job...', 'Waiting for XIAO ESP32S3 Sense.'))
    const response = await createCaptureJob()
    activeJobId = response.id
    await show(formatStatus('External camera requested', `Job: ${response.id.slice(0, 8)}\nWaiting for image upload...`))
  } catch (error) {
    await show(formatStatus('Capture request failed', error instanceof Error ? error.message : String(error)))
  } finally {
    busy = false
  }
}

async function handleEvent(event: JobEvent): Promise<void> {
  const isRelevant = event.source === 'xiao_button' || event.jobId === activeJobId
  if (!isRelevant) return

  if (event.status === 'queued') {
    await show(formatStatus('Queued', 'Waiting for external camera.'))
  } else if (event.status === 'assigned') {
    await show(formatStatus('External camera active', 'Capturing image...'))
  } else if (event.status === 'uploaded') {
    await show(formatStatus('Image uploaded', 'Sending to vision endpoint...'))
  } else if (event.status === 'analyzing') {
    await show(formatStatus('AI analyzing...', 'Waiting for response.'))
  } else if (event.status === 'done') {
    const prefix = event.source === 'xiao_button' ? 'XIAO button capture' : 'Vision result'
    await show(formatStatus(prefix, event.result || 'No result text.'))
    if (event.jobId === activeJobId) activeJobId = undefined
  } else if (event.status === 'error') {
    await show(formatStatus('Vision error', event.error || 'Unknown error'))
    if (event.jobId === activeJobId) activeJobId = undefined
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

g2Bridge.onEvenHubEvent((event) => {
  const type = event.textEvent?.eventType ?? event.sysEvent?.eventType ?? event.jsonData?.eventType
  const isPress = type === OsEventTypeList.CLICK_EVENT || type === undefined
  const isDoublePress = type === OsEventTypeList.DOUBLE_CLICK_EVENT

  if (isPress) {
    void runEvenHubCapture()
  } else if (isDoublePress) {
    void show(
      formatStatus(
        'Help',
        'G2/R1 press creates a backend job. XIAO polls the job, captures JPEG, uploads it, and the backend sends it to the vision endpoint. The physical XIAO button can also capture directly.',
      ),
    )
  }
})

window.setInterval(() => {
  void pollEvents()
}, 1500)

void pollEvents()
