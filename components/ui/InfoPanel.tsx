'use client'

import { useState, useEffect } from 'react'
import type { NodeClickPayload, AnalysisResult } from '@/types'
import { getFolderColor } from '@/lib/utils/colors'

interface InfoPanelProps {
  selected: NodeClickPayload | null
  owner: string
  repo: string
  onClose: () => void
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest text-[#4a4a6a] uppercase mb-1.5">
        {label}
      </p>
      <p className="text-[#b0b0cc] text-[13px] leading-relaxed">{content}</p>
    </div>
  )
}

export default function InfoPanel({ selected, owner, repo, onClose }: InfoPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    setResult(null)
    setError(null)
    setLoading(true)

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        repo,
        path: selected.nodePath,
        name: selected.nodeName,
        type: selected.nodeType,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setResult(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selected, owner, repo])

  if (!selected) return null

  const color = getFolderColor(selected.folderGroup)

  return (
    <div
      className="slide-in absolute top-4 right-4 bottom-4 w-80 flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'rgba(13,13,23,0.92)',
        border: '1px solid #1e1e30',
        backdropFilter: 'blur(16px)',
        boxShadow: `0 0 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-4 border-b border-[#1e1e30]">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <div className="min-w-0">
            <p className="font-semibold text-[#e2e2f0] text-sm truncate">{selected.nodeName}</p>
            <p className="text-[#4a4a6a] text-[11px] truncate mt-0.5">{selected.nodePath}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#4a4a6a] hover:text-[#e2e2f0] hover:bg-[#1e1e30] transition-colors ml-2"
        >
          ✕
        </button>
      </div>

      {/* Badge */}
      <div className="px-5 pt-3">
        <span
          className="inline-block text-[10px] font-medium px-2 py-0.5 rounded tracking-wide"
          style={{
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
          }}
        >
          {selected.nodeType === 'folder' ? '◉ Folder' : '● File'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex flex-col gap-3 mt-2">
            {[80, 60, 90, 70].map((w, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="h-2 w-16 rounded bg-[#1e1e30] animate-pulse" />
                <div
                  className="h-3 rounded bg-[#1e1e30] animate-pulse"
                  style={{ width: `${w}%` }}
                />
                <div
                  className="h-3 rounded bg-[#1e1e30] animate-pulse"
                  style={{ width: `${w - 15}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs mt-2">Failed to analyze: {error}</p>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-5">
            <Section label="What it does" content={result.summary} />
            <div
              className="border-t border-[#1e1e30]"
              style={{ borderColor: `${color}22` }}
            />
            <Section label="Role in codebase" content={result.role} />
            <div
              className="border-t border-[#1e1e30]"
              style={{ borderColor: `${color}22` }}
            />
            <Section label="Key dependencies" content={result.dependencies} />
            <div
              className="border-t border-[#1e1e30]"
              style={{ borderColor: `${color}22` }}
            />
            <Section label="Impact if removed" content={result.impact} />
          </div>
        )}
      </div>
    </div>
  )
}
