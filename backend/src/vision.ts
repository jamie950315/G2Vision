import { config } from './config.js'
import type { Job } from './types.js'

function compactText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 1800)
}

function extractMessageContent(data: unknown): string {
  const anyData = data as any
  const content = anyData?.choices?.[0]?.message?.content

  if (typeof content === 'string') return content

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        if (typeof part?.content === 'string') return part.content
        return ''
      })
      .join('\n')
  }

  if (typeof anyData?.output_text === 'string') return anyData.output_text
  return ''
}

export async function analyzeImageWithOpenAICompatibleEndpoint(job: Job, jpeg: Buffer): Promise<string> {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.openaiRequestTimeoutMs)

  const imageUrl: Record<string, string> = {
    url: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
  }

  if (config.openaiImageDetail) {
    imageUrl.detail = config.openaiImageDetail
  }

  try {
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openaiModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: job.prompt },
              { type: 'image_url', image_url: imageUrl },
            ],
          },
        ],
        max_tokens: 450,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`vision endpoint failed: ${response.status} ${body}`)
    }

    const data = await response.json()
    const content = extractMessageContent(data)
    return compactText(content || 'No text result returned by the vision endpoint.')
  } finally {
    clearTimeout(timeout)
  }
}
