import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRepoTree, getRepoMeta } from '@/lib/github/client'
import { buildGraph } from '@/lib/parser/tree-builder'

export async function GET(
  _req: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, repo } = params

  try {
    const meta = await getRepoMeta(accessToken, owner, repo)
    const tree = await getRepoTree(accessToken, owner, repo, meta.defaultBranch)
    const graph = buildGraph(tree, owner, repo, meta.description, meta.defaultBranch)
    return NextResponse.json(graph)
  } catch (err) {
    console.error('Failed to build graph:', err)
    return NextResponse.json({ error: 'Failed to load repository graph' }, { status: 500 })
  }
}
