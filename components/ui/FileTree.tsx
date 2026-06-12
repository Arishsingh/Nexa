'use client'

import { useState, useMemo, useEffect } from 'react'
import type { RepoGraph, GraphNode, NodeClickPayload } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TreeNode {
  id: string; name: string; path: string
  type: 'file' | 'folder'; depth: number
  folderGroup: string; children: TreeNode[]
}

export interface ExpandSignal {
  mode: 'expand' | 'collapse'
  v: number
}

function buildTree(nodes: GraphNode[]): TreeNode[] {
  const byPath = new Map<string, TreeNode>()
  for (const n of nodes) {
    byPath.set(n.path, { id: n.id, name: n.name, path: n.path, type: n.type, depth: n.depth, folderGroup: n.folderGroup, children: [] })
  }
  const roots: TreeNode[] = []
  for (const n of nodes) {
    const parentPath = n.path.includes('/') ? n.path.substring(0, n.path.lastIndexOf('/')) : null
    const node = byPath.get(n.path)!
    if (parentPath && byPath.has(parentPath)) byPath.get(parentPath)!.children.push(node)
    else roots.push(node)
  }
  function sort(list: TreeNode[]) {
    list.sort((a, b) => a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name))
    list.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots
}

// Keep only nodes matching the filter (or with matching descendants)
function pruneTree(list: TreeNode[], q: string): TreeNode[] {
  const out: TreeNode[] = []
  for (const n of list) {
    const kids = pruneTree(n.children, q)
    if (n.name.toLowerCase().includes(q) || kids.length > 0) {
      out.push({ ...n, children: kids })
    }
  }
  return out
}

// File extension → colored icon
function FileIconDot({ name, type }: { name: string; type: 'file' | 'folder' }) {
  if (type === 'folder') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0" fill="#f0a742">
        <path d="M1.5 4a1 1 0 011-1H6l1.5 1.5h6a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1V4z" />
      </svg>
    )
  }
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  const extColor: Record<string, string> = {
    tsx: '#2563eb', jsx: '#2563eb', ts: '#1d4ed8', js: '#d97706',
    css: '#9333ea', scss: '#db2777', json: '#65a30d', md: '#78828c',
    py: '#16a34a', go: '#0891b2', rs: '#c2410c', env: '#d97706',
    jpg: '#16a34a', jpeg: '#16a34a', png: '#16a34a', svg: '#d97706',
    ico: '#d97706', pdf: '#dc2626', lock: '#8b949e', sh: '#16a34a',
    mjs: '#d97706', yml: '#db2777', yaml: '#db2777', gitignore: '#8b949e',
  }
  const c = extColor[ext] ?? '#8b949e'
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0" fill="none" stroke={c} strokeWidth="1.3">
      <path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5L9 1.5z" />
      <path d="M9 1.5V5.5h4" />
      <path d="M5.5 9h5M5.5 11.5h3" strokeLinecap="round" />
    </svg>
  )
}

interface RowProps {
  node: TreeNode
  selectedId: string | null
  onSelect: (p: NodeClickPayload) => void
  depth?: number
  expandSignal?: ExpandSignal
  forceOpen?: boolean
  highlightPaths?: Set<string>
}

function TreeRow({ node, selectedId, onSelect, depth = 0, expandSignal, forceOpen = false, highlightPaths }: RowProps) {
  const [open, setOpen] = useState(depth < 2)
  const isSelected = node.id === selectedId
  const isFolder = node.type === 'folder'
  const isHighlighted = highlightPaths?.has(node.path) ?? false

  useEffect(() => {
    if (expandSignal && expandSignal.v > 0) setOpen(expandSignal.mode === 'expand')
  }, [expandSignal])

  // Auto-expand folders that contain function-search matches
  useEffect(() => {
    if (isFolder && isHighlighted) setOpen(true)
  }, [isFolder, isHighlighted])

  const handleClick = () => {
    if (isFolder) setOpen(o => !o)
    onSelect({ nodeId: node.id, nodeName: node.name, nodeType: node.type, nodePath: node.path, folderGroup: node.folderGroup })
  }

  const effectiveOpen = forceOpen || open

  return (
    <>
      <button onClick={handleClick} title={node.path}
        className="w-full flex items-center gap-2 text-left group relative"
        style={{
          paddingLeft: `${20 + depth * 16}px`,
          paddingRight: 10,
          height: 28,
          background: isSelected ? 'var(--hover-strong)'
            : isHighlighted ? 'rgba(137,87,229,0.10)'
            : 'transparent',
        }}
        onMouseEnter={e => { if (!isSelected && !isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
        onMouseLeave={e => { if (!isSelected && !isHighlighted) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Indentation guide lines */}
        {Array.from({ length: depth }).map((_, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${20 + i * 16 + 7}px`,
            top: 0, bottom: 0, width: 1, background: 'var(--chip2)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Chevron for folders */}
        {isFolder ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#8b949e" strokeWidth="1.5"
            className="shrink-0 transition-transform"
            style={{ transform: effectiveOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <path d="M3.5 2l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="w-2.5 shrink-0" />
        )}

        <FileIconDot name={node.name} type={node.type} />

        <span className="truncate text-[13px]"
          style={{
            color: isSelected || isFolder ? 'var(--text)' : 'var(--nx-muted)',
            fontWeight: isFolder ? 500 : 400,
          }}>
          {node.name}
        </span>

        {/* ƒ badge for function-highlighted files */}
        {isHighlighted && (
          <span className="ml-auto shrink-0 text-[10px] font-bold italic" style={{ color: '#8957e5' }}>ƒ</span>
        )}

        {/* Modified dot for root folders */}
        {isFolder && depth === 0 && !isHighlighted && (
          <span className="w-1 h-1 rounded-full ml-0.5 shrink-0" style={{ background: 'var(--fainter)' }} />
        )}
      </button>

      {isFolder && effectiveOpen && node.children.map(child => (
        <TreeRow key={child.id} node={child} selectedId={selectedId} onSelect={onSelect}
          depth={depth + 1} expandSignal={expandSignal} forceOpen={forceOpen} highlightPaths={highlightPaths} />
      ))}
    </>
  )
}

export default function FileTree({ graph, selectedId, onSelect, filter = '', expandSignal, highlightPaths }: {
  graph: RepoGraph
  selectedId: string | null
  onSelect: (p: NodeClickPayload) => void
  filter?: string
  expandSignal?: ExpandSignal
  highlightPaths?: Set<string>
}) {
  const tree = useMemo(() => buildTree(graph.nodes), [graph.nodes])
  const q = filter.trim().toLowerCase()
  const visible = useMemo(() => q ? pruneTree(tree, q) : tree, [tree, q])

  return (
    <ScrollArea className="flex-1">
      <div className="pb-2">
        {visible.map(node => (
          <TreeRow key={node.id} node={node} selectedId={selectedId} onSelect={onSelect}
            expandSignal={expandSignal} forceOpen={!!q} highlightPaths={highlightPaths} />
        ))}
        {visible.length === 0 && (
          <p className="px-5 py-3 text-[12px]" style={{ color: 'var(--faint)' }}>No files match.</p>
        )}
      </div>
    </ScrollArea>
  )
}
