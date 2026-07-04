const MODEL_CHAIN = ['gemma-4-26b-a4b-it']
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const RPM = 15
const RPD = 1500
const MINUTE = 60 * 1000
const DAY = 24 * 60 * 60 * 1000

const requestLog: number[] = []

function checkRateLimit() {
  const now = Date.now()
  while (requestLog.length && now - requestLog[0] > DAY) requestLog.shift()

  const inLastDay = requestLog.length
  const inLastMinute = requestLog.filter(t => now - t < MINUTE).length

  if (inLastDay >= RPD) {
    throw new GeminiError(429, `Daily limit reached (${RPD} requests/day). Try again tomorrow.`)
  }
  if (inLastMinute >= RPM) {
    throw new GeminiError(429, `Rate limit reached (${RPM} requests/min). Wait a minute, then retry.`)
  }

  requestLog.push(now)
}

export interface GeminiMessage {
  role: 'user' | 'model'
  text: string
}

export class GeminiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function geminiGenerate(params: {
  system: string
  messages: GeminiMessage[]
  maxOutputTokens?: number
  json?: boolean
}): Promise<string> {
  const { system, messages, maxOutputTokens = 1024, json = false } = params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new GeminiError(0, 'GEMINI_API_KEY is not set')

  checkRateLimit()

  let lastErr: GeminiError | null = null

  for (const model of MODEL_CHAIN) {
    // Gemma models reject systemInstruction and responseMimeType, so the
    // system prompt is merged into the first user turn instead.
    const isGemma = model.startsWith('gemma')
    const sys = isGemma && json
      ? `${system}\n\nRespond with valid JSON only — no markdown fences.`
      : system

    const contents = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
    if (isGemma) {
      if (contents.length && contents[0].role === 'user') {
        contents[0] = { role: 'user', parts: [{ text: `${sys}\n\n${contents[0].parts[0].text}` }] }
      } else {
        contents.unshift({ role: 'user', parts: [{ text: sys }] })
      }
    }

    const body: Record<string, unknown> = {
      ...(isGemma ? {} : { systemInstruction: { parts: [{ text: system }] } }),
      contents,
      generationConfig: {
        maxOutputTokens,
        ...(json && !isGemma ? { responseMimeType: 'application/json' } : {}),
        ...(/^gemini-(2\.5|3)/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }

    try {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        lastErr = new GeminiError(res.status, errBody.slice(0, 300))
        if ([429, 500, 503].includes(res.status)) continue
        throw lastErr
      }

      const data = await res.json()
      const text: string | undefined = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('')
      if (!text) {
        lastErr = new GeminiError(204, `Empty response from ${model}`)
        continue
      }
      return text
    } catch (e) {
      if (e instanceof GeminiError) {
        if (![429, 500, 503, 204].includes(e.status)) throw e
        lastErr = e
        continue
      }
      lastErr = new GeminiError(0, e instanceof Error ? e.message : 'Network error')
    }
  }

  throw lastErr ?? new GeminiError(0, 'All Gemini models failed')
}

export function friendlyGeminiError(err: unknown): string {
  if (err instanceof GeminiError) {
    if (err.status === 429 && /limit reached/.test(err.message)) return err.message
    if (err.status === 429) return 'Gemini free-tier rate limit reached — wait a minute, then hit retry.'
    if (err.status === 503) return 'Gemini is overloaded right now — try again shortly.'
    if (err.status === 0 && err.message.includes('GEMINI_API_KEY')) return 'GEMINI_API_KEY is missing — restart the dev server after setting it.'
  }
  return 'AI analysis failed — try again shortly.'
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned) as T
}
