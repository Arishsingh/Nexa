import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { geminiGenerate, friendlyGeminiError } from '@/lib/ai/gemini'
import type { ChatMessage } from '@/types'

const SYSTEM_PROMPT = `You are Nexa, an expert codebase assistant embedded in a repository visualization tool.
You answer questions about the repository the user is exploring: architecture, file purposes, dependencies, refactoring ideas.
Be concise and technical. Use short paragraphs or bullet lists. Plain text only — no markdown headers.`

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo, messages, samplePaths } = body as {
    owner: string; repo: string
    messages: ChatMessage[]
    samplePaths?: string[]
  }

  if (!owner || !repo || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const context = `Repository: ${owner}/${repo}
Sample file paths:
${(samplePaths ?? []).slice(0, 60).join('\n')}`

  try {
    const reply = await geminiGenerate({
      system: `${SYSTEM_PROMPT}\n\n${context}`,
      messages: messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        text: m.content,
      })),
      maxOutputTokens: 500,
    })
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Chat failed:', err)
    return NextResponse.json({ error: friendlyGeminiError(err) }, { status: 500 })
  }
}
