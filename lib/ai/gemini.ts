// Minimal Gemini REST client — no SDK dependency

// Free-tier quotas are per-model, so falling back to a sibling model
// genuinely helps when one is rate-limited or overloaded.
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

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

  let lastErr: GeminiError | null = null

  for (const model of MODEL_CHAIN) {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: {
        maxOutputTokens,
        ...(json ? { responseMimeType: 'application/json' } : {}),
        // 2.5 models spend output tokens on hidden reasoning by default —
        // disable it so small token budgets produce actual text
        ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
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
        // Rate limit / overload / transient — try the next model in the chain
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

// Human-readable reason for the UI when generation fails
export function friendlyGeminiError(err: unknown): string {
  if (err instanceof GeminiError) {
    if (err.status === 429) return 'Gemini free-tier rate limit reached — wait a minute, then hit retry.'
    if (err.status === 503) return 'Gemini is overloaded right now — try again shortly.'
    if (err.status === 0 && err.message.includes('GEMINI_API_KEY')) return 'GEMINI_API_KEY is missing — restart the dev server after setting it.'
  }
  return 'AI analysis failed — try again shortly.'
}

// Gemini sometimes wraps JSON in markdown fences even in JSON mode — strip them
export function parseGeminiJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  return JSON.parse(cleaned) as T
}
