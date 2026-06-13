import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeRepoStructure } from '@/lib/ai/analyzer'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { owner, repo, description, totalFiles, totalFolders, topFolders, samplePaths } = body

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = await analyzeRepoStructure({
      repoName: repo, owner,
      description: description ?? '',
      totalFiles: totalFiles ?? 0,
      totalFolders: totalFolders ?? 0,
      topFolders: topFolders ?? [],
      samplePaths: samplePaths ?? [],
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('Repo overview failed:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
