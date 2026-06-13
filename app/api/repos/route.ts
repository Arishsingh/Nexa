import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRepos } from '@/lib/github/client'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const repos = await getUserRepos(accessToken)
    return NextResponse.json(repos)
  } catch (err) {
    console.error('Failed to fetch repos:', err)
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 })
  }
}
