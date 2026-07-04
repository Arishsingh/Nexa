import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeRepoStructure } from '@/lib/ai/analyzer'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

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
