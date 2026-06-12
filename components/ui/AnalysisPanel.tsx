'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { NodeClickPayload, AnalysisResult, RepoOverview, RepoGraph, ChatMessage } from '@/types'

// ── Shared bits ───────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--panel)] rounded-2xl border border-[var(--nx-border)] p-5 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] font-semibold text-[var(--text)] mb-3.5">{children}</p>
}

function Skel({ widths = [90, 75, 60] }: { widths?: number[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {widths.map((w, i) => (
        <div key={i} className="h-3 rounded animate-pulse bg-[var(--chip2)]" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

function FileGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#8b949e" strokeWidth="1.3" className="shrink-0">
      <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" />
      <path d="M9 1.5V5.5h4" />
    </svg>
  )
}

// ── Health gauge ──────────────────────────────────────────────────────────

function HealthGauge({ score }: { score: number }) {
  const r = 32, circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
      <svg viewBox="0 0 88 88" style={{ width: 88, height: 88, transform: 'rotate(-90deg)' }}>
        <circle cx="44" cy="44" r={r} fill="none" style={{ stroke: 'var(--chip2)' }} strokeWidth="6" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-bold leading-none text-[var(--text)]">{score}</span>
        <span className="text-[11px] text-[var(--faint)] mt-0.5">/100</span>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────

function OverviewTab({ graph, owner, repo, refreshKey = 0 }: { graph: RepoGraph; owner: string; repo: string; refreshKey?: number }) {
  const [data, setData] = useState<RepoOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const topFolders = Array.from(new Set(graph.nodes.map(n => n.folderGroup))).filter(Boolean).slice(0, 15)
    const samplePaths = graph.nodes.map(n => n.path).slice(0, 50)
    fetch('/api/analyze/overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, description: graph.description, totalFiles: graph.totalFiles, totalFolders: graph.totalFolders, topFolders, samplePaths }),
    })
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [graph, owner, repo, refreshKey])

  const topDeps = useMemo(() => {
    const inbound = new Map<string, number>()
    for (const e of graph.edges) inbound.set(e.target, (inbound.get(e.target) || 0) + 1)
    return graph.nodes
      .map(n => ({ node: n, count: inbound.get(n.id) || 0 }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [graph])

  return (
    <div className="flex flex-col gap-4">

      {/* Architecture Summary */}
      <Card>
        <CardTitle>Architecture Summary</CardTitle>
        {loading ? <Skel widths={[92, 80, 88, 76, 70]} /> : (
          <div className="flex flex-col gap-2">
            {(data?.summary ?? 'No summary available.').split('. ').filter(Boolean).map((s, i) => (
              <p key={i} className="text-[13px] text-[var(--nx-muted)] leading-relaxed">
                {s}{s.endsWith('.') ? '' : '.'}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* Top Dependencies */}
      <Card>
        <CardTitle>Top Dependencies</CardTitle>
        {topDeps.length === 0
          ? <p className="text-[12px] text-[var(--faint)]">No dependency data.</p>
          : (
            <div className="flex flex-col">
              {topDeps.map(({ node, count }) => (
                <div key={node.id} className="flex items-center gap-2.5 py-2 group cursor-pointer">
                  <FileGlyph />
                  <span className="flex-1 text-[13px] text-[var(--nx-muted)] truncate group-hover:text-[var(--text)] transition-colors">
                    {node.path}
                  </span>
                  <span className="shrink-0 min-w-[26px] h-[22px] px-1.5 rounded-md bg-[var(--chip)] border border-[var(--nx-border)] flex items-center justify-center text-[12px] font-semibold text-[var(--text)] tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )
        }
      </Card>

      {/* Repository Health */}
      <Card>
        <CardTitle>Repository Health</CardTitle>
        {loading ? (
          <div className="flex items-center gap-5">
            <div className="w-[88px] h-[88px] rounded-full bg-[var(--chip2)] animate-pulse shrink-0" />
            <div className="flex-1"><Skel widths={[85, 75, 80, 70, 65]} /></div>
          </div>
        ) : data?.healthScore != null ? (
          <div className="flex items-center gap-5">
            <HealthGauge score={data.healthScore} />
            <div className="flex-1 flex flex-col gap-2.5">
              {(data.healthMetrics ?? []).map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-[var(--nx-muted)]">{m.label}</span>
                    <span className="text-[12px] font-semibold text-[var(--text)] tabular-nums">{m.score}</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-[var(--chip2)]">
                    <div className="h-full rounded-full bg-[#16a34a] transition-all duration-700"
                      style={{ width: `${m.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-[12px] text-[var(--faint)]">No health data.</p>}
      </Card>

      {/* Risks */}
      <Card>
        <CardTitle>Risks</CardTitle>
        {loading ? <Skel widths={[88, 78, 72]} /> :
          (data?.risks?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-3">
              {data!.risks.map((risk, i) => {
                const sColor = risk.severity === 'High' ? '#dc2626' : risk.severity === 'Medium' ? '#d97706' : '#16a34a'
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sColor }} />
                    <span className="flex-1 text-[13px] text-[var(--nx-muted)] leading-snug">{risk.text}</span>
                    <span className="text-[12px] font-medium shrink-0" style={{ color: sColor }}>
                      {risk.severity}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-[12px] text-[var(--faint)]">No risks detected.</p>
        }
      </Card>

      {/* Recommendations */}
      {!loading && (data?.recommendations?.length ?? 0) > 0 && (
        <Card>
          <CardTitle>Recommendations</CardTitle>
          <div className="flex flex-col gap-2.5">
            {data!.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--nx-muted)] leading-snug">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--text)] shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Node detail ───────────────────────────────────────────────────────────

function NodeDetail({ selected, owner, repo, onClose }: {
  selected: NodeClickPayload; owner: string; repo: string; onClose: () => void
}) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setResult(null); setLoading(true)
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, path: selected.nodePath, name: selected.nodeName, type: selected.nodeType }),
    })
      .then(r => r.json())
      .then(d => { if (!d.error) setResult(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selected, owner, repo])

  return (
    <div className="flex flex-col gap-4">
      {/* Node header card */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--chip)] border border-[var(--nx-border)] flex items-center justify-center shrink-0">
            <FileGlyph />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold truncate text-[var(--text)]">{selected.nodeName}</p>
            <p className="text-[12px] text-[var(--faint)] truncate mt-0.5">{selected.nodePath}</p>
          </div>
          <button onClick={onClose}
            className="text-[var(--faint)] hover:text-[var(--text)] transition-colors text-[13px] mt-0.5">✕</button>
        </div>
      </Card>

      {loading ? (
        <>
          {['What it does', 'Role in codebase', 'Dependencies'].map(l => (
            <Card key={l}><CardTitle>{l}</CardTitle><Skel /></Card>
          ))}
        </>
      ) : result && (
        <>
          {[
            ['What it does', result.summary],
            ['Role in codebase', result.role],
            ['Key dependencies', result.dependencies],
            ['Impact if removed', result.impact],
          ].map(([label, content]) => (
            <Card key={label}>
              <CardTitle>{label}</CardTitle>
              <p className="text-[13px] text-[var(--nx-muted)] leading-relaxed">{content}</p>
            </Card>
          ))}

          {result.recommendations?.length > 0 && (
            <Card>
              <CardTitle>Recommendations</CardTitle>
              <div className="flex flex-col gap-2.5">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--nx-muted)] leading-snug">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--text)] shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── AI Chat ───────────────────────────────────────────────────────────────

function AIChatTab({ owner, repo, graph }: { owner: string; repo: string; graph: RepoGraph }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner, repo, messages: next,
          samplePaths: graph.nodes.map(n => n.path).slice(0, 60),
        }),
      })
      const d = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: d.error ? `Error: ${d.error}` : d.reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--panel)] rounded-2xl border border-[var(--nx-border)] overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-11 h-11 rounded-xl bg-[var(--chip)] border border-[var(--nx-border)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text)' }}>
                <path d="M8 1l1.5 4L14 6.5l-4.5 1.5L8 12.5 6.5 8 2 6.5 6.5 5 8 1z" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-[var(--text)]">Ask about {repo}</p>
            <p className="text-[12px] text-[var(--faint)] leading-relaxed max-w-[220px]">
              Architecture, file purposes, dependencies, refactoring ideas — anything about this repository.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}
            className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'self-end bg-[var(--btn)] text-[var(--btn-fg)] rounded-br-md'
                : 'self-start bg-[var(--chip)] text-[var(--text)] rounded-bl-md'
            }`}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="self-start px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[var(--chip)]">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--faint)] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--nx-border)] p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about this repository…"
          className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--chip)] border border-[var(--nx-border)] outline-none text-[13px] text-[var(--text)] placeholder-[var(--faint)] focus:border-[var(--nx-border2)]"
        />
        <button onClick={send} disabled={busy || !input.trim()}
          className="w-9 h-9 rounded-xl bg-[var(--btn)] text-[var(--btn-fg)] flex items-center justify-center disabled:opacity-40 hover:bg-[var(--btn-hover)] transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────

export default function AnalysisPanel({ selected, owner, repo, graph, onClose, analyzeKey = 0 }: {
  selected: NodeClickPayload | null
  owner: string; repo: string
  graph: RepoGraph
  onClose: () => void
  analyzeKey?: number
}) {
  const [tab, setTab] = useState<'overview' | 'chat'>('overview')
  const [localKey, setLocalKey] = useState(0)
  const [analyzedAt, setAnalyzedAt] = useState<Date>(new Date())

  useEffect(() => {
    setAnalyzedAt(new Date())
    if (analyzeKey > 0) setTab('overview')
  }, [analyzeKey, localKey])

  return (
    <div className="flex flex-col h-full pr-5 pl-1 py-4 gap-4">

      {/* Segmented tabs */}
      <div className="shrink-0 flex items-center gap-1 p-1 rounded-xl bg-[var(--panel)] border border-[var(--nx-border)] self-start">
        {([['overview', 'Overview'], ['chat', 'AI Chat']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-[13px] transition-colors ${
              tab === key
                ? 'bg-[var(--panel)] border border-[var(--nx-border2)] shadow-sm font-semibold text-[var(--text)]'
                : 'text-[var(--faint)] hover:text-[var(--nx-muted)]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable card stack */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        {tab === 'overview'
          ? selected
            ? <NodeDetail selected={selected} owner={owner} repo={repo} onClose={onClose} />
            : <OverviewTab graph={graph} owner={owner} repo={repo} refreshKey={analyzeKey + localKey} />
          : <AIChatTab owner={owner} repo={repo} graph={graph} />
        }
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-2">
        <span className="text-[11px] text-[var(--fainter)]">
          Last analyzed: {analyzedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button onClick={() => setLocalKey(k => k + 1)} title="Re-run analysis"
          className="text-[var(--fainter)] hover:text-[var(--nx-muted)] transition-colors">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M13.5 8a5.5 5.5 0 11-1.6-3.9M13.5 1.5v3h-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
