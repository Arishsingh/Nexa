'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { GithubRepo } from '@/types'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: '#000000',
  panel: '#000000',
  border: '#1e1e1e',
  text: '#ffffff',
  muted: '#888888',
  faint: '#444444',
  cream: '#ffffff',
}

const LANG_COLOR: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#e8b33d',
  Python:     '#4f9e5a',
  Go:         '#00add8',
  Rust:       '#dea584',
  'C#':       '#4f9e5a',
  Java:       '#b07219',
  HTML:       '#e34c26',
  CSS:        '#9333ea',
  Shell:      '#89e051',
}

function NexaMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" stroke={C.text} strokeWidth="2.6">
      <circle cx="17" cy="17" r="13.5" />
      <line x1="3.5" y1="17" x2="30.5" y2="17" />
    </svg>
  )
}

function RepoCard({ repo, onClick }: { repo: GithubRepo; onClick: () => void }) {
  const isCollab = repo.affiliation !== 'owner'

  return (
    <button
      onClick={onClick}
      className="group text-left p-5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ background: C.panel, borderColor: C.border }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#333333'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = C.border
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isCollab && repo.owner_avatar && (
            <img
              src={repo.owner_avatar}
              alt={repo.owner_login}
              className="w-4 h-4 rounded-full shrink-0"
            />
          )}
          <span className="font-medium text-[14px] truncate" style={{ color: C.text }}>
            {isCollab ? `${repo.owner_login}/${repo.name}` : repo.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.affiliation === 'organization' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md border"
              style={{ color: '#7c9ef5', borderColor: '#1e2d5a', background: '#0d1526' }}>
              org
            </span>
          )}
          {repo.private && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md border"
              style={{ color: '#666', borderColor: '#333', background: '#0a0a0a' }}>
              private
            </span>
          )}
        </div>
      </div>

      {repo.description && (
        <p className="text-[12px] mb-3 line-clamp-2 leading-relaxed" style={{ color: C.muted }}>
          {repo.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-[11.5px]" style={{ color: C.faint }}>
        {repo.language && (
          <span className="flex items-center gap-1.5" style={{ color: C.muted }}>
            <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLOR[repo.language] ?? C.faint }} />
            {repo.language}
          </span>
        )}
        <span>★ {repo.stargazers_count}</span>
        <span className="ml-auto">{new Date(repo.updated_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
      </div>
    </button>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-[13px] font-medium tracking-wide uppercase" style={{ color: C.muted }}>
        {title}
      </h2>
      <span className="text-[11px] px-2 py-0.5 rounded-full"
        style={{ background: '#1a1a1a', color: C.faint, border: `1px solid ${C.border}` }}>
        {count}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser]       = useState<{ image?: string | null } | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [repos, setRepos]     = useState<GithubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser({ image: session.user.user_metadata?.avatar_url })
      setAuthReady(true)
    })
  }, [router])

  useEffect(() => {
    if (!authReady) return
    fetch('/api/repos')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setRepos(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [authReady])

  const q = search.toLowerCase()
  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.owner_login ?? '').toLowerCase().includes(q) ||
    (r.description ?? '').toLowerCase().includes(q)
  )

  const myRepos     = filtered.filter(r => r.affiliation === 'owner')
  const collabRepos = filtered.filter(r => r.affiliation !== 'owner')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!authReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: C.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: C.cream, borderTopColor: 'transparent' }} />
          <span className="text-sm" style={{ color: C.muted }}>Loading repositories…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col overflow-auto"
      style={{ background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      <header className="shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mx-auto w-full px-12"
          style={{ height: 80, maxWidth: 1240 }}>
          <div className="flex items-center gap-3">
            <NexaMark size={28} />
            <span className="text-[22px] font-semibold tracking-tight" style={{ color: C.text }}>Nexa</span>
          </div>

          <div className="flex items-center gap-5">
            {user?.image && (
              <img src={user.image} alt=""
                className="w-8 h-8 rounded-full border" style={{ borderColor: C.border }} />
            )}
            <button
              onClick={handleSignOut}
              className="text-[14px] transition-colors"
              style={{ color: C.muted }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.text }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-12 py-12 mx-auto w-full" style={{ maxWidth: 1240 }}>
        <div className="mb-8">
          <h1 className="text-[30px] font-medium tracking-[-0.01em] mb-1.5" style={{ color: C.text }}>
            Choose a repository
          </h1>
          <p className="text-[15px]" style={{ color: C.muted }}>
            Select any repo to explore its architecture, dependencies, and functions.
          </p>
        </div>

        <div className="relative mb-8">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="15" height="15"
            viewBox="0 0 16 16" fill="none" stroke={C.faint} strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search repositories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm pl-10 pr-4 py-2.5 rounded-lg border outline-none text-[14px] transition-colors"
            style={{ background: C.panel, borderColor: C.border, color: C.text }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border }}
          />
        </div>

        {error && (
          <div className="text-[14px] mb-4" style={{ color: '#e0705c' }}>Error: {error}</div>
        )}

        {myRepos.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Your repositories" count={myRepos.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myRepos.map(repo => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onClick={() => router.push(`/explore/${repo.full_name}`)}
                />
              ))}
            </div>
          </section>
        )}

        {collabRepos.length > 0 && (
          <section className="mb-10">
            <SectionHeader title="Collaborations" count={collabRepos.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {collabRepos.map(repo => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onClick={() => router.push(`/explore/${repo.full_name}`)}
                />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && !error && (
          <p className="text-[14px] mt-8" style={{ color: C.faint }}>No repositories found.</p>
        )}
      </main>
    </div>
  )
}
