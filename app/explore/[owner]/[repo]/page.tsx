'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import loadDynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import type { RepoGraph, NodeClickPayload, SymbolInfo } from '@/types'
import FileTree, { type ExpandSignal } from '@/components/ui/FileTree'
import AnalysisPanel from '@/components/ui/AnalysisPanel'
import type { GraphApi, LayoutMode, LabelMode } from '@/components/graph/CanvasGraph'

const CanvasGraph = loadDynamic(() => import('@/components/graph/CanvasGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-[var(--bg)]">
      <div className="w-5 h-5 rounded-full border-2 border-[var(--text)] border-t-transparent animate-spin" />
    </div>
  ),
})

function GithubMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text)' }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.4">
      <circle cx="4" cy="3.5" r="1.8" />
      <circle cx="4" cy="12.5" r="1.8" />
      <circle cx="12" cy="3.5" r="1.8" />
      <path d="M4 5.3v5.4M12 5.3c0 3-3.5 3.2-6 3.7" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.5 4L14 6.5l-4.5 1.5L8 12.5 6.5 8 2 6.5 6.5 5 8 1z" />
      <path d="M13 10l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" opacity="0.7" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11L3.05 3.05" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3">
      <path d="M13.5 9.5A6 6 0 116.5 2.5a4.8 4.8 0 007 7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FnGlyph({ size = 12 }: { size?: number }) {
  return (
    <span className="shrink-0 font-bold italic" style={{ color: '#8957e5', fontSize: size }}>ƒ</span>
  )
}

function FileGlyphSmall() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3" className="shrink-0">
      <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" />
      <path d="M9 1.5V5.5h4" />
    </svg>
  )
}

const VIEW_TABS: { label: string; mode: LayoutMode }[] = [
  { label: 'Graph', mode: 'force' },
  { label: 'Tree', mode: 'tree' },
  { label: 'Layers', mode: 'layers' },
  { label: 'Timeline', mode: 'timeline' },
]

export default function ExplorePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [userMeta, setUserMeta] = useState<{ image?: string; name?: string } | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const owner = params.owner as string
  const repo  = params.repo  as string

  const [graph,    setGraph]    = useState<RepoGraph | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [selected, setSelected] = useState<NodeClickPayload | null>(null)
  const [theme, setTheme]       = useState<'light' | 'dark'>('dark')

  const [viewMode, setViewMode]   = useState<LayoutMode>('force')
  const [autoFit, setAutoFit]     = useState(true)
  const [labelMode, setLabelMode] = useState<LabelMode>('auto')
  const [showDeps, setShowDeps]   = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [branchOpen, setBranchOpen]     = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [treeFilterOpen, setTreeFilterOpen] = useState(false)
  const [treeFilter, setTreeFilter]         = useState('')
  const [expandSignal, setExpandSignal]     = useState<ExpandSignal>({ mode: 'expand', v: 0 })
  const [outlineOpen, setOutlineOpen]       = useState(false)

  const [searchQ, setSearchQ]           = useState('')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [symbols, setSymbols]           = useState<SymbolInfo[]>([])
  const [symbolsLoading, setSymbolsLoading] = useState(false)
  const [fnHighlight, setFnHighlight]   = useState<{ symbol: SymbolInfo; ids: string[]; paths: Set<string>; fileCount: number } | null>(null)

  const [analyzeKey, setAnalyzeKey] = useState(0)

  const apiRef = useRef<GraphApi | null>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('nexa-theme')
    if (saved === 'dark' || saved === 'light') setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark')
    document.documentElement.classList.add(`theme-${theme}`)
    localStorage.setItem('nexa-theme', theme)
  }, [theme])

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/'); return }
    if (status === 'authenticated') {
      setUserMeta({
        image: session?.user?.image ?? undefined,
        name: session?.username ?? session?.user?.name ?? undefined,
      })
      setAuthReady(true)
    }
  }, [status, session, router])

  const loadGraph = useCallback(() => {
    if (!owner || !repo) return
    setLoading(true)
    setError(null)
    fetch(`/api/repos/${owner}/${repo}/tree`)
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setGraph(data) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [owner, repo])

  useEffect(() => {
    if (!authReady) return
    loadGraph()
  }, [authReady, loadGraph])

  useEffect(() => {
    if (!graph) return
    setSymbolsLoading(true)
    fetch(`/api/repos/${owner}/${repo}/symbols`)
      .then(r => r.json())
      .then(d => { if (!d.error) setSymbols(d.symbols ?? []) })
      .catch(() => {})
      .finally(() => setSymbolsLoading(false))
  }, [graph, owner, repo])

  const handleNodeClick = useCallback((p: NodeClickPayload | null) => {
    setSelected(p)
  }, [])

  const pathToId = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of graph?.nodes ?? []) m.set(n.path, n.id)
    return m
  }, [graph])

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    if (!q || !graph) return { files: [], fns: [] }
    const files = graph.nodes
      .filter(n => n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))
      .slice(0, 6)
    const fns = symbols
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 6)
    return { files, fns }
  }, [searchQ, graph, symbols])

  const applyFnHighlight = useCallback((s: SymbolInfo) => {
    const files = new Set([...s.definedIn, ...s.calledIn])
    const paths = new Set<string>()
    for (const p of files) {
      paths.add(p)
      const parts = p.split('/')
      for (let i = 1; i < parts.length; i++) {
        paths.add(parts.slice(0, i).join('/'))
      }
    }
    const ids: string[] = []
    for (const p of paths) {
      const id = pathToId.get(p)
      if (id) ids.push(id)
    }
    setFnHighlight({ symbol: s, ids, paths, fileCount: files.size })
    setSearchOpen(false)
    setSearchQ('')
  }, [pathToId])

  const pickFile = useCallback((id: string) => {
    apiRef.current?.focus(id)
    setSearchOpen(false)
    setSearchQ('')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        setSearchOpen(true)
      } else if (e.key === 'Escape') {
        setSearchOpen(false)
        setSettingsOpen(false)
        setBranchOpen(false)
        setFnHighlight(null)
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) centerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  useEffect(() => {
    if (!autoFit) return
    const onResize = () => apiRef.current?.fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [autoFit])

  const outlineFns = useMemo(() => {
    if (!selected || selected.nodeType !== 'file') return []
    return symbols.filter(s => s.definedIn.includes(selected.nodePath)).slice(0, 25)
  }, [selected, symbols])

  if (!authReady || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[var(--bg)]">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--text)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--faint)]">Loading {owner}/{repo}…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[var(--bg)]">
        <p className="text-red-500 text-sm">Failed to load: {error}</p>
        <button onClick={loadGraph} className="text-sm text-[var(--text)] px-4 py-2 rounded-lg bg-[var(--chip)] border border-[var(--nx-border)]">Retry</button>
        <button onClick={() => router.back()} className="text-sm text-[var(--nx-muted)] underline">Go back</button>
      </div>
    )
  }

  const hasDropdown = searchOpen && searchQ.trim().length > 0

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[var(--bg)]">

      <header className="flex items-center gap-4 px-5 shrink-0 bg-[var(--panel)] border-b border-[var(--nx-border)]"
        style={{ height: 64 }}>

        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--chip)] transition-colors"
            title="Back to dashboard"
            style={{ color: 'var(--text)' }}>
            <svg width="26" height="26" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="2.6">
              <circle cx="17" cy="17" r="13.5" />
              <line x1="3.5" y1="17" x2="30.5" y2="17" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5 text-[15px]">
            <button onClick={() => router.push('/dashboard')}
              className="text-[var(--text)] font-medium hover:underline">{owner}</button>
            <span className="text-[var(--faint)]">/</span>
            <span className="font-bold text-[var(--text)]">{repo}</span>
          </div>
        </div>

        <div className="relative shrink-0">
          <button onClick={() => setBranchOpen(o => !o)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--chip)] transition-colors">
            <BranchIcon />
            <span className="text-[13px] text-[var(--text)]">{graph?.defaultBranch ?? 'main'}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#8b949e" strokeWidth="1.5">
              <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {branchOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setBranchOpen(false)} />
              <div className="absolute top-full left-0 mt-1.5 z-30 w-52 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-lg py-1.5">
                <p className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--faint)]">BRANCHES</p>
                <button className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] text-[var(--text)] hover:bg-[var(--chip)] transition-colors"
                  onClick={() => setBranchOpen(false)}>
                  <span className="flex items-center gap-2"><BranchIcon />{graph?.defaultBranch ?? 'main'}</span>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="2">
                    <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <p className="px-3.5 py-1.5 text-[11px] text-[var(--fainter)]">Default branch</p>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-[420px]">
            <div className="flex items-center gap-2.5 w-full px-3.5 rounded-xl bg-[var(--chip)] border border-[var(--nx-border)]"
              style={{ height: 38 }}>
              <SearchIcon />
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (searchResults.fns.length > 0) applyFnHighlight(searchResults.fns[0])
                    else if (searchResults.files.length > 0) pickFile(searchResults.files[0].id)
                  }
                }}
                placeholder="Search files, functions, symbols..."
                className="flex-1 bg-transparent outline-none text-[13px] text-[var(--text)] placeholder-[var(--faint)]"
              />
              <kbd className="text-[11px] text-[var(--faint)] bg-[var(--panel)] border border-[var(--nx-border2)] rounded px-1.5 py-0.5">⌘ K</kbd>
            </div>

            {hasDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-lg py-1.5 max-h-[420px] overflow-y-auto">

                  {searchResults.fns.length > 0 && (
                    <>
                      <p className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--faint)]">FUNCTIONS</p>
                      {searchResults.fns.map(s => {
                        const fileList = Array.from(new Set([...s.definedIn, ...s.calledIn]))
                        return (
                          <button key={s.name} onClick={() => applyFnHighlight(s)}
                            className="w-full flex flex-col gap-0.5 px-3.5 py-2 hover:bg-[var(--chip)] transition-colors text-left">
                            <span className="flex items-center gap-2.5 w-full">
                              <FnGlyph />
                              <span className="text-[13px] text-[var(--text)] font-medium">{s.name}</span>
                              <span className="ml-auto text-[11px] text-[var(--faint)]">
                                {fileList.length} file{fileList.length === 1 ? '' : 's'}
                              </span>
                            </span>
                            <span className="pl-[22px] text-[11px] text-[var(--faint)] truncate w-full">
                              {fileList.slice(0, 2).join('  ·  ')}
                              {fileList.length > 2 ? `  ·  +${fileList.length - 2} more` : ''}
                            </span>
                          </button>
                        )
                      })}
                    </>
                  )}

                  {searchResults.files.length > 0 && (
                    <>
                      <p className="px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--faint)]">FILES</p>
                      {searchResults.files.map(f => (
                        <button key={f.id} onClick={() => pickFile(f.id)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--chip)] transition-colors text-left">
                          <FileGlyphSmall />
                          <span className="text-[13px] text-[var(--text)] truncate">{f.path}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {searchResults.fns.length === 0 && searchResults.files.length === 0 && (
                    <p className="px-3.5 py-3 text-[12px] text-[var(--faint)]">
                      {symbolsLoading ? 'Indexing functions… file search is ready.' : 'No matches found.'}
                    </p>
                  )}

                  {symbolsLoading && (searchResults.fns.length > 0 || searchResults.files.length > 0) && (
                    <p className="px-3.5 pt-2 pb-1 text-[11px] text-[var(--fainter)] border-t border-[var(--nx-border)] mt-1">
                      Still indexing functions…
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setAnalyzeKey(k => k + 1)}
            className="flex items-center gap-2 px-4 rounded-xl bg-[var(--btn)] text-[var(--btn-fg)] text-[13px] font-semibold hover:bg-[var(--btn-hover)] transition-colors"
            style={{ height: 38 }}>
            <SparkleIcon />
            Analyze Repository
          </button>
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title="Toggle theme"
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--chip)] transition-colors">
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="w-9 h-9 rounded-full bg-[var(--chip)] border border-[var(--nx-border2)] flex items-center justify-center text-[13px] font-semibold text-[var(--nx-muted)] overflow-hidden">
            {userMeta?.image
              ? <img src={userMeta.image} alt="" className="w-full h-full object-cover" />
              : owner[0]?.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        <aside className="flex flex-col shrink-0 overflow-hidden bg-[var(--panel)] border-r border-[var(--nx-border)]"
          style={{ width: 264 }}>

          <div className="flex items-center justify-between pl-5 pr-3 pt-4 pb-2 shrink-0">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--faint)]">EXPLORER</span>
            <div className="flex items-center gap-0.5">
              <button title="Refresh tree" onClick={loadGraph}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--chip)] transition-colors">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3">
                  <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 1.5v3h-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button title="Expand all" onClick={() => setExpandSignal(s => ({ mode: 'expand', v: s.v + 1 }))}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--chip)] transition-colors">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3">
                  <path d="M4 6l4 4 4-4M4 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-2.5)" />
                </svg>
              </button>
              <button title="Collapse all" onClick={() => setExpandSignal(s => ({ mode: 'collapse', v: s.v + 1 }))}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--chip)] transition-colors">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3">
                  <path d="M4 10l4-4 4 4M4 15l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-2.5)" />
                </svg>
              </button>
              <button title="Filter files" onClick={() => { setTreeFilterOpen(o => !o); setTreeFilter('') }}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${treeFilterOpen ? 'bg-[var(--chip)]' : 'hover:bg-[var(--chip)]'}`}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={treeFilterOpen ? '#8957e5' : '#8b949e'} strokeWidth="1.3">
                  <path d="M2 4h12M4.5 8h7M7 12h2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {treeFilterOpen && (
            <div className="px-4 pb-2 shrink-0">
              <input
                autoFocus
                value={treeFilter}
                onChange={e => setTreeFilter(e.target.value)}
                placeholder="Filter files…"
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--chip)] border border-[var(--nx-border)] outline-none text-[12px] text-[var(--text)] placeholder-[var(--faint)]"
              />
            </div>
          )}

          <div className="flex items-center gap-2 px-5 py-1.5 shrink-0">
            <GithubMark size={15} />
            <span className="text-[13px] font-semibold text-[var(--text)]">{owner}/{repo}</span>
          </div>

          {graph && (
            <FileTree
              graph={graph}
              selectedId={selected?.nodeId ?? null}
              onSelect={p => { setSelected(p); apiRef.current?.focus(p.nodeId) }}
              filter={treeFilter}
              expandSignal={expandSignal}
              highlightPaths={fnHighlight?.paths}
            />
          )}

          <div className="shrink-0 border-t border-[var(--nx-border)] mx-4" style={{ maxHeight: outlineOpen ? 220 : undefined, display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setOutlineOpen(o => !o)}
              className="w-full flex items-center justify-between py-3.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--faint)] hover:text-[var(--nx-muted)] transition-colors shrink-0">
              <span>OUTLINE{outlineFns.length > 0 ? ` (${outlineFns.length})` : ''}</span>
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
                style={{ transform: outlineOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                <path d="M3.5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {outlineOpen && (
              <div className="overflow-y-auto pb-3">
                {!selected || selected.nodeType !== 'file' ? (
                  <p className="text-[12px] text-[var(--fainter)] pb-2">Select a file to see its functions.</p>
                ) : outlineFns.length === 0 ? (
                  <p className="text-[12px] text-[var(--fainter)] pb-2">
                    {symbolsLoading ? 'Indexing…' : 'No functions found in this file.'}
                  </p>
                ) : outlineFns.map(s => (
                  <button key={s.name} onClick={() => applyFnHighlight(s)}
                    className="w-full flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-[var(--chip)] transition-colors text-left">
                    <FnGlyph size={11} />
                    <span className="text-[12px] text-[var(--nx-muted)] truncate">{s.name}</span>
                    <span className="ml-auto text-[10px] text-[var(--fainter)]">{s.calledIn.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main ref={centerRef} className="flex flex-col flex-1 overflow-hidden relative bg-[var(--bg)]">

          <div className="absolute top-4 left-5 right-5 z-10 flex items-start justify-between pointer-events-none">
            <div className="flex items-start gap-2 pointer-events-auto">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm">
                {VIEW_TABS.map(t => (
                  <button key={t.mode} onClick={() => setViewMode(t.mode)}
                    className={`px-4 py-1.5 rounded-lg text-[13px] transition-colors ${
                      viewMode === t.mode
                        ? 'bg-[var(--panel)] border border-[var(--nx-border2)] shadow-sm font-semibold text-[var(--text)]'
                        : 'text-[var(--faint)] hover:text-[var(--nx-muted)]'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {fnHighlight && (
                <div className="flex flex-col rounded-xl border shadow-sm overflow-hidden"
                  style={{ background: 'var(--panel)', borderColor: 'rgba(137,87,229,0.45)', width: 300 }}>
                  <div className="flex items-center gap-2 px-3 py-2"
                    style={{ background: 'rgba(137,87,229,0.10)' }}>
                    <FnGlyph />
                    <span className="text-[13px] font-semibold text-[var(--text)]">{fnHighlight.symbol.name}</span>
                    <span className="text-[11px] text-[var(--faint)]">
                      in {fnHighlight.fileCount} file{fnHighlight.fileCount === 1 ? '' : 's'}
                    </span>
                    <button onClick={() => setFnHighlight(null)}
                      className="ml-auto text-[var(--faint)] hover:text-[var(--text)] transition-colors text-[12px]">✕</button>
                  </div>
                  <div className="overflow-y-auto py-1" style={{ maxHeight: 240 }}>
                    {fnHighlight.symbol.definedIn.map(p => (
                      <button key={`d-${p}`}
                        onClick={() => { const id = pathToId.get(p); if (id) apiRef.current?.focus(id) }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--chip)] transition-colors text-left">
                        <FileGlyphSmall />
                        <span className="flex-1 text-[12px] text-[var(--text)] truncate">{p}</span>
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>defines</span>
                      </button>
                    ))}
                    {fnHighlight.symbol.calledIn
                      .filter(p => !fnHighlight.symbol.definedIn.includes(p))
                      .map(p => (
                        <button key={`c-${p}`}
                          onClick={() => { const id = pathToId.get(p); if (id) apiRef.current?.focus(id) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--chip)] transition-colors text-left">
                          <FileGlyphSmall />
                          <span className="flex-1 text-[12px] text-[var(--nx-muted)] truncate">{p}</span>
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(137,87,229,0.12)', color: '#8957e5' }}>calls</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <button onClick={() => { setAutoFit(f => !f); apiRef.current?.fit() }}
                title={autoFit ? 'Auto-fit on (click view to fit now)' : 'Auto-fit off'}
                className="flex items-center gap-2 px-3.5 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm text-[13px] text-[var(--nx-muted)] hover:bg-[var(--hover)] transition-colors"
                style={{ height: 36 }}>
                <span className="w-7 h-4 rounded-full relative transition-colors"
                  style={{ background: autoFit ? '#16a34a' : 'var(--chip2)' }}>
                  <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all"
                    style={{ left: autoFit ? 14 : 2 }} />
                </span>
                Fit
              </button>

              <div className="relative">
                <button onClick={() => setSettingsOpen(o => !o)} title="Graph settings"
                  className={`w-9 h-9 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm flex items-center justify-center transition-colors ${settingsOpen ? 'bg-[var(--chip)]' : 'hover:bg-[var(--hover)]'}`}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.3">
                    <path d="M2 5h8M12 5h2M2 11h2M6 11h8" strokeLinecap="round" />
                    <circle cx="11" cy="5" r="1.6" /><circle cx="5" cy="11" r="1.6" />
                  </svg>
                </button>
                {settingsOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setSettingsOpen(false)} />
                    <div className="absolute top-full right-0 mt-1.5 z-30 w-60 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-lg p-3.5 flex flex-col gap-3">
                      <p className="text-[11px] font-semibold tracking-wide text-[var(--faint)]">GRAPH SETTINGS</p>

                      <div>
                        <p className="text-[12px] font-medium text-[var(--text)] mb-1.5">Labels</p>
                        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--chip)]">
                          {(['auto', 'all', 'none'] as LabelMode[]).map(m => (
                            <button key={m} onClick={() => setLabelMode(m)}
                              className={`flex-1 py-1 rounded-md text-[12px] capitalize transition-colors ${
                                labelMode === m
                                  ? 'bg-[var(--panel)] shadow-sm font-medium text-[var(--text)]'
                                  : 'text-[var(--faint)]'
                              }`}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button onClick={() => setShowDeps(d => !d)}
                        className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[var(--text)]">Dependency edges</span>
                        <span className="w-7 h-4 rounded-full relative transition-colors"
                          style={{ background: showDeps ? '#16a34a' : 'var(--chip2)' }}>
                          <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all"
                            style={{ left: showDeps ? 14 : 2 }} />
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                className="w-9 h-9 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm flex items-center justify-center hover:bg-[var(--hover)] transition-colors">
                {isFullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.4">
                    <path d="M6.5 2v4.5H2M9.5 14V9.5H14M2 2l4.5 4.5M14 14L9.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.4">
                    <path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2L9 7M2 14l5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            {graph && (
              <CanvasGraph
                graph={graph}
                onNodeClick={handleNodeClick}
                apiRef={apiRef}
                theme={theme}
                mode={viewMode}
                labelMode={labelMode}
                showDeps={showDeps}
                highlightIds={fnHighlight?.ids ?? []}
                fnOverlay={fnHighlight ? {
                  name: fnHighlight.symbol.name,
                  definedIn: fnHighlight.symbol.definedIn,
                  calledIn: fnHighlight.symbol.calledIn,
                } : null}
              />
            )}

            {viewMode === 'timeline' && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-lg bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm pointer-events-none">
                <span className="text-[11px] text-[var(--faint)]">Grouped by folder · sorted by file size</span>
              </div>
            )}

            <div className="absolute bottom-6 left-5 px-4 py-3.5 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm pointer-events-none"
              style={{ width: 165 }}>
              <p className="text-[12px] font-semibold text-[var(--text)] mb-3">Legend</p>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.3"><path d="M1.5 4.5a1 1 0 011-1H6l1.5 1.5h6a1 1 0 011 1v6a1 1 0 01-1 1h-11a1 1 0 01-1-1v-7.5z" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">Folder</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#57606a" strokeWidth="1.3"><path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" /><path d="M9 1.5V5.5h4" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">File</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 8"><line x1="1" y1="4" x2="15" y2="4" stroke="#57606a" strokeWidth="1.5" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">Structure</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 8"><line x1="1" y1="4" x2="15" y2="4" stroke="#57606a" strokeWidth="1.5" strokeDasharray="4 2.5" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">Dependency</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FnGlyph size={11} />
                  <span className="text-[12px] text-[var(--nx-muted)]">Function node</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 8"><line x1="1" y1="4" x2="11" y2="4" stroke="#16a34a" strokeWidth="1.5" /><path d="M10 1.5L14 4l-4 2.5z" fill="#16a34a" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">Defines</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 8"><line x1="1" y1="4" x2="11" y2="4" stroke="#8957e5" strokeWidth="1.5" strokeDasharray="3 2" /><path d="M10 1.5L14 4l-4 2.5z" fill="#8957e5" /></svg>
                  <span className="text-[12px] text-[var(--nx-muted)]">Calls</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] shadow-sm pointer-events-none whitespace-nowrap">
              <span className="text-[12px] text-[var(--faint)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#16a34a] mr-1.5 align-middle" />
                {graph ? `${graph.totalFolders} folders · ${graph.totalFiles} files · ${graph.edges.length} relations` : ''}
                &nbsp;&nbsp;—&nbsp;&nbsp;Drag to pan · Scroll to zoom · Click a node to focus
              </span>
            </div>
          </div>
        </main>

        <aside className="flex flex-col shrink-0 overflow-hidden" style={{ width: 320 }}>
          {graph && (
            <AnalysisPanel
              selected={selected}
              owner={owner}
              repo={repo}
              graph={graph}
              onClose={() => setSelected(null)}
              analyzeKey={analyzeKey}
            />
          )}
        </aside>

      </div>
    </div>
  )
}
