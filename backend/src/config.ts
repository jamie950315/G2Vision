import 'dotenv/config'

function readEnv(name: string, fallback = ''): string {
  const value = process.env[name]
  if (value === undefined || value === null || value === '') return fallback
  return value
}

function readInt(name: string, fallback: number): number {
  const raw = readEnv(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const DEFAULT_PROMPT =
  'Use Traditional Chinese (Taiwan). Analyze the photo from the external camera. Describe the important visual facts, read any visible text, mention likely risks when relevant, and give one concrete next action. Keep the answer under 300 Chinese characters.'

export const config = {
  port: readInt('PORT', 8787),
  publicBaseUrl: readEnv('PUBLIC_BASE_URL', 'http://localhost:8787'),
  corsOrigin: readEnv('CORS_ORIGIN', '*'),
  cameraDeviceId: readEnv('CAMERA_DEVICE_ID', 'xiao-g2-001'),
  cameraToken: readEnv('CAMERA_TOKEN', ''),
  openaiBaseUrl: readEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1').replace(/\/$/, ''),
  openaiApiKey: readEnv('OPENAI_API_KEY', ''),
  openaiModel: readEnv('OPENAI_MODEL', 'gpt-4.1-mini'),
  openaiRequestTimeoutMs: readInt('OPENAI_REQUEST_TIMEOUT_MS', 45_000),
  openaiImageDetail: readEnv('OPENAI_IMAGE_DETAIL', ''),
  jobTtlMs: readInt('JOB_TTL_MS', 10 * 60 * 1000),
  eventBufferSize: readInt('EVENT_BUFFER_SIZE', 200),
}
