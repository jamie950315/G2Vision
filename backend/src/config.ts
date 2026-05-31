import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const envFile = dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') }).parsed || {}

function readEnv(name: string, fallback = '', options: { preferEnvFile?: boolean } = {}): string {
  const value =
    options.preferEnvFile && process.env.NODE_ENV !== 'test' && envFile[name] !== undefined
      ? envFile[name]
      : process.env[name]
  if (value === undefined || value === null || value === '') return fallback
  return value
}

function readInt(name: string, fallback: number, options: { preferEnvFile?: boolean } = {}): number {
  const raw = readEnv(name, '', options)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])

function readReasoningEffort(name: string, fallback = '', options: { preferEnvFile?: boolean } = {}): string {
  const value = readEnv(name, fallback, options)
  if (!value) return ''
  if (!REASONING_EFFORTS.has(value)) {
    throw new Error(`${name} must be one of: ${Array.from(REASONING_EFFORTS).join(', ')}`)
  }
  return value
}

export const DEFAULT_PROMPT =
  'Use Traditional Chinese (Taiwan). Analyze the photo from the external camera. Describe the important visual facts, read any visible text, mention likely risks when relevant, and give one concrete next action.'

export const config = {
  port: readInt('PORT', 8787),
  publicBaseUrl: readEnv('PUBLIC_BASE_URL', 'http://localhost:8787'),
  corsOrigin: readEnv('CORS_ORIGIN', '*'),
  responseHistoryDir: readEnv(
    'RESPONSE_HISTORY_DIR',
    resolve(dirname(fileURLToPath(import.meta.url)), '../data/response-history'),
  ),
  cameraDeviceId: readEnv('CAMERA_DEVICE_ID', 'xiao-g2-001'),
  cameraToken: readEnv('CAMERA_TOKEN', ''),
  openaiBaseUrl: readEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1', { preferEnvFile: true }).replace(/\/$/, ''),
  openaiApiKey: readEnv('OPENAI_API_KEY', '', { preferEnvFile: true }),
  openaiModel: readEnv('OPENAI_MODEL', 'gpt-5.5', { preferEnvFile: true }),
  openaiReasoningEffort: readReasoningEffort('OPENAI_REASONING_EFFORT', 'medium', { preferEnvFile: true }),
  openaiMaxCompletionTokens: readInt('OPENAI_MAX_COMPLETION_TOKENS', 8192, { preferEnvFile: true }),
  openaiRequestTimeoutMs: readInt('OPENAI_REQUEST_TIMEOUT_MS', 45_000, { preferEnvFile: true }),
  openaiImageDetail: readEnv('OPENAI_IMAGE_DETAIL', '', { preferEnvFile: true }),
  jobTtlMs: readInt('JOB_TTL_MS', 10 * 60 * 1000),
  eventBufferSize: readInt('EVENT_BUFFER_SIZE', 200),
}
