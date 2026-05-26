import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { DEFAULT_PROMPT } from './config.js'

const SETTINGS_PATH = new URL('../data/test-page-settings.json', import.meta.url)

type StoredSettings = {
  prompt?: string
}

let savedPrompt = DEFAULT_PROMPT

function cleanPrompt(prompt: unknown): string {
  if (typeof prompt !== 'string') return ''
  return prompt.replace(/\r/g, '').trim()
}

export async function loadTestPrompt(): Promise<void> {
  try {
    const data = JSON.parse(await readFile(SETTINGS_PATH, 'utf8')) as StoredSettings
    const prompt = cleanPrompt(data.prompt)
    if (prompt) savedPrompt = prompt
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Could not read test page settings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export function getTestPromptSettings(): { defaultPrompt: string; savedPrompt: string } {
  return {
    defaultPrompt: DEFAULT_PROMPT,
    savedPrompt,
  }
}

export async function saveTestPrompt(promptInput: unknown): Promise<string> {
  const prompt = cleanPrompt(promptInput)
  if (!prompt) throw new Error('prompt is required')
  if (prompt.length > 4000) throw new Error('prompt is too long')

  await mkdir(dirname(SETTINGS_PATH.pathname), { recursive: true })
  await writeFile(SETTINGS_PATH, `${JSON.stringify({ prompt }, null, 2)}\n`, 'utf8')
  savedPrompt = prompt
  return savedPrompt
}
