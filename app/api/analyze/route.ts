import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFileContent } from '@/lib/github/client'
import { analyzeNode } from '@/lib/ai/analyzer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo, path, name, type, language, importedByCount } = body

  if (!owner || !repo || !path || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let content: string | null = null
  if (type === 'file') {
    content = await getFileContent(accessToken, owner, repo, path)
  }

  try {
    const result = await analyzeNode({
      path, name, type, content,
      repoName: `${owner}/${repo}`,
      language, importedByCount,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Analysis failed:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
