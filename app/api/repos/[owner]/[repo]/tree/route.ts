import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRepoTree, getRepoMeta } from '@/lib/github/client'
import { buildGraph } from '@/lib/parser/tree-builder'

export async function GET(
  _req: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, repo } = params

  try {
    const meta = await getRepoMeta(session.accessToken, owner, repo)
    const tree = await getRepoTree(session.accessToken, owner, repo, meta.defaultBranch)
    const graph = buildGraph(tree, owner, repo, meta.description, meta.defaultBranch)
    return NextResponse.json(graph)
  } catch (err) {
    console.error('Failed to build graph:', err)
    return NextResponse.json({ error: 'Failed to load repository graph' }, { status: 500 })
  }
}
