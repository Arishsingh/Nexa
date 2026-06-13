'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { RepoGraph, GraphNode, NodeClickPayload } from '@/types'
import { getFolderColor } from '@/lib/utils/colors'

export type GraphTheme = 'light' | 'dark'
export type LayoutMode = 'force' | 'tree' | 'layers' | 'timeline'
export type LabelMode = 'auto' | 'all' | 'none'

export interface GraphApi {
  fit: () => void
  focus: (id: string) => void
}

export interface FnOverlay {
  name: string
  definedIn: string[]
  calledIn: string[]
}

interface CNode {
  id: string
  label: string
  nodeType: 'file' | 'folder'
  folderGroup: string
  color: string
  radius: number
  colRadius: number
  isRoot: boolean
  isHub: boolean
  isFn?: boolean
  rel?: string[]
  original: GraphNode
  x: number; y: number
  vx: number; vy: number
  tx: number; ty: number
}

interface CEdge {
  src: string
  tgt: string
  kind: 'structural' | 'dependency' | 'call-def' | 'call'
  strength: number
}

function prepData(graph: RepoGraph, maxNodes = 250) {
  const sorted = [
    ...graph.nodes.filter(n => n.type === 'folder'),
    ...graph.nodes.filter(n => n.type === 'file'),
  ].slice(0, maxNodes)

  const allowed = new Set(sorted.map(n => n.id))

  const groups = new Map<string, GraphNode[]>()
  for (const n of sorted) {
    if (!groups.has(n.folderGroup)) groups.set(n.folderGroup, [])
    groups.get(n.folderGroup)!.push(n)
  }

  const gKeys = Array.from(groups.keys())
  const gCenters = new Map<string, [number, number]>()
  gKeys.forEach((k, i) => {
    const a = (i / gKeys.length) * Math.PI * 2 - Math.PI / 2
    const r = Math.max(500, gKeys.length * 200)
    gCenters.set(k, [r * Math.cos(a), r * Math.sin(a)])
  })

  const nodes: CNode[] = []
  for (const [grp, gNodes] of groups) {
    const [cx, cy] = gCenters.get(grp)!
    gNodes.forEach((n: GraphNode, i: number) => {
      const isFolder = n.type === 'folder'
      const isRoot = n.depth === 0 && isFolder
      const radius = isRoot ? 26 : isFolder ? 19 : 16
      const colRadius = radius + 48
      const spreadR = isFolder ? 40 + Math.random() * 30 : 160 + Math.random() * 120
      const angle = (i / Math.max(gNodes.length, 1)) * Math.PI * 2
      const x = cx + spreadR * Math.cos(angle) + (Math.random() - 0.5) * 8
      const y = cy + spreadR * Math.sin(angle) + (Math.random() - 0.5) * 8
      nodes.push({
        id: n.id,
        label: n.name,
        nodeType: n.type,
        folderGroup: n.folderGroup,
        color: getFolderColor(n.folderGroup),
        radius, colRadius, isRoot, isHub: false,
        original: n,
        x, y, vx: 0, vy: 0, tx: x, ty: y,
      })
    })
  }

  const edges: CEdge[] = graph.edges
    .filter(e => allowed.has(e.source) && allowed.has(e.target))
    .map(e => ({ src: e.source, tgt: e.target, kind: e.type, strength: e.strength }))

  const degree = new Map<string, number>()
  for (const e of edges) {
    degree.set(e.src, (degree.get(e.src) || 0) + 1)
    degree.set(e.tgt, (degree.get(e.tgt) || 0) + 1)
  }
  let hub: CNode | null = null, best = 0
  for (const n of nodes) {
    const d = degree.get(n.id) || 0
    if (d > best) { best = d; hub = n }
  }
  if (hub) {
    hub.isHub = true
    hub.radius = 30
    hub.colRadius = hub.radius + 26
    hub.x = 0; hub.y = 0
  }

  return { nodes, edges }
}

const folderFirst = (a: CNode, b: CNode) =>
  a.nodeType !== b.nodeType
    ? (a.nodeType === 'folder' ? -1 : 1)
    : a.label.localeCompare(b.label)

function computeStaticLayout(mode: LayoutMode, allNodes: CNode[]) {
  const nodes = allNodes.filter(n => !n.isFn)
  const byPath = new Map(nodes.map(n => [n.original.path, n]))
  const childrenOf = new Map<string, CNode[]>()
  const roots: CNode[] = []
  for (const n of nodes) {
    const p = n.original.path
    const idx = p.lastIndexOf('/')
    const parent = idx === -1 ? null : p.slice(0, idx)
    if (parent !== null && byPath.has(parent)) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, [])
      childrenOf.get(parent)!.push(n)
    } else {
      roots.push(n)
    }
  }
  const depthOf = (n: CNode) => n.original.path.split('/').length - 1

  if (mode === 'tree') {
    let cursor = 0
    const SPX = 90, SPY = 180
    const place = (n: CNode, depth: number): number => {
      const kids = (childrenOf.get(n.original.path) ?? []).sort(folderFirst)
      if (kids.length === 0) {
        n.tx = cursor * SPX
        cursor++
      } else {
        const xs = kids.map(k => place(k, depth + 1))
        n.tx = (Math.min(...xs) + Math.max(...xs)) / 2
      }
      n.ty = depth * SPY
      return n.tx
    }
    roots.sort(folderFirst).forEach(r => { place(r, 0); cursor += 1.5 })
  } else if (mode === 'layers') {
    const byDepth = new Map<number, CNode[]>()
    for (const n of nodes) {
      const d = depthOf(n)
      if (!byDepth.has(d)) byDepth.set(d, [])
      byDepth.get(d)!.push(n)
    }
    for (const [d, list] of byDepth) {
      list.sort((a, b) =>
        a.folderGroup === b.folderGroup
          ? a.label.localeCompare(b.label)
          : a.folderGroup.localeCompare(b.folderGroup))
      if (d === 0 && list.length === 1) { list[0].tx = 0; list[0].ty = 0; continue }
      const rr = 180 + d * 240
      list.forEach((n, i) => {
        const a = (i / list.length) * Math.PI * 2 - Math.PI / 2
        n.tx = rr * Math.cos(a)
        n.ty = rr * Math.sin(a)
      })
    }
  } else if (mode === 'timeline') {
    const groups = new Map<string, CNode[]>()
    for (const n of nodes) {
      const g = n.folderGroup || '(root)'
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(n)
    }
    const keys = Array.from(groups.keys()).sort()
    const COLW = 380, ROWH = 70
    keys.forEach((k, c) => {
      const list = groups.get(k)!
      list.sort((a, b) =>
        a.nodeType !== b.nodeType ? (a.nodeType === 'folder' ? -1 : 1)
        : (b.original.size || 0) - (a.original.size || 0))
      list.forEach((n, i) => {
        n.tx = c * COLW
        n.ty = i * ROWH
      })
    })
  }

  if (mode !== 'force' && nodes.length) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.tx); maxX = Math.max(maxX, n.tx)
      minY = Math.min(minY, n.ty); maxY = Math.max(maxY, n.ty)
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    for (const n of nodes) { n.tx -= cx; n.ty -= cy }
  }
}

function tick(nodeMap: Map<string, CNode>, edges: CEdge[], alpha: number) {
  const list = Array.from(nodeMap.values())
  const rep = 3200 * alpha

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j]
      const dx = a.x - b.x, dy = a.y - b.y
      const d2 = dx * dx + dy * dy + 1
      const d = Math.sqrt(d2)
      const minD = a.colRadius + b.colRadius
      if (d > minD * 4) continue
      const f = rep / d2
      a.vx += dx / d * f; a.vy += dy / d * f
      b.vx -= dx / d * f; b.vy -= dy / d * f

      if (d < minD) {
        const push = (minD - d) * 0.5
        a.x += dx / d * push; a.y += dy / d * push
        b.x -= dx / d * push; b.y -= dy / d * push
      }
    }
  }

  const att = 0.05 * alpha
  for (const e of edges) {
    const a = nodeMap.get(e.src), b = nodeMap.get(e.tgt)
    if (!a || !b) continue
    const dx = b.x - a.x, dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01
    const target = e.kind === 'structural'
      ? a.colRadius + b.colRadius + 90
      : e.kind === 'dependency'
      ? a.colRadius + b.colRadius + 60
      : a.colRadius + b.colRadius + 30
    const delta = (d - target) * att * e.strength
    a.vx += dx / d * delta; a.vy += dy / d * delta
    b.vx -= dx / d * delta; b.vy -= dy / d * delta
  }

  const cen = 0.0025 * alpha
  for (const n of list) { n.vx -= n.x * cen; n.vy -= n.y * cen }

  const maxV = 14
  for (const n of list) {
    n.vx *= 0.76; n.vy *= 0.76
    n.vx = Math.max(-maxV, Math.min(maxV, n.vx))
    n.vy = Math.max(-maxV, Math.min(maxV, n.vy))
    n.x += n.vx; n.y += n.vy
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function blend(hex: string, amount: number, base: [number, number, number]): string {
  const [r, g, b] = hexToRgb(hex)
  const pr = Math.round(r + (base[0] - r) * amount)
  const pg = Math.round(g + (base[1] - g) * amount)
  const pb = Math.round(b + (base[2] - b) * amount)
  return `rgb(${pr},${pg},${pb})`
}

interface Palette {
  bg: string
  base: [number, number, number]
  halo: string
  label: string
  labelStrong: string
  hubFill: string
  hubIcon: string
  shadow: string
  dimEdge: string
  dot: string
  dotStrong: string
}

const PALETTES: Record<GraphTheme, Palette> = {
  light: {
    bg: '#f7f8f9',
    base: [255, 255, 255],
    halo: 'rgba(247,248,249,0.9)',
    label: '#57606a',
    labelStrong: '#1a1d21',
    hubFill: '#1a1d21',
    hubIcon: '#ffffff',
    shadow: 'rgba(0,0,0,0.07)',
    dimEdge: 'rgba(0,0,0,0.04)',
    dot: 'rgba(26,29,33,0.07)',
    dotStrong: 'rgba(26,29,33,0.12)',
  },
  dark: {
    bg: '#000000',
    base: [0, 0, 0],
    halo: 'rgba(0,0,0,0.9)',
    label: '#888888',
    labelStrong: '#f0f0f0',
    hubFill: '#ffffff',
    hubIcon: '#000000',
    shadow: 'rgba(0,0,0,0.5)',
    dimEdge: 'rgba(255,255,255,0.04)',
    dot: 'rgba(255,255,255,0.05)',
    dotStrong: 'rgba(255,255,255,0.09)',
  },
}

function drawFolderIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  const w = s, h = s * 0.78, tabW = s * 0.42, tabH = s * 0.16
  const l = x - w / 2, t = y - h / 2 + tabH / 2
  const r = s * 0.1
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(l + r, t - tabH)
  ctx.lineTo(l + tabW, t - tabH)
  ctx.lineTo(l + tabW + tabH, t)
  ctx.lineTo(l + w - r, t)
  ctx.arcTo(l + w, t, l + w, t + r, r)
  ctx.lineTo(l + w, t + h - tabH - r)
  ctx.arcTo(l + w, t + h - tabH, l + w - r, t + h - tabH, r)
  ctx.lineTo(l + r, t + h - tabH)
  ctx.arcTo(l, t + h - tabH, l, t + h - tabH - r, r)
  ctx.lineTo(l, t - tabH + r)
  ctx.arcTo(l, t - tabH, l + r, t - tabH, r)
  ctx.closePath()
  ctx.fill()
}

function drawFileIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, lineWidth: number) {
  const w = s * 0.78, h = s
  const fold = s * 0.3
  const l = x - w / 2, t = y - h / 2
  ctx.beginPath()
  ctx.moveTo(l, t)
  ctx.lineTo(l + w - fold, t)
  ctx.lineTo(l + w, t + fold)
  ctx.lineTo(l + w, t + h)
  ctx.lineTo(l, t + h)
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(l + w - fold, t)
  ctx.lineTo(l + w - fold, t + fold)
  ctx.lineTo(l + w, t + fold)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(l + w * 0.22, t + h * 0.5)
  ctx.lineTo(l + w * 0.78, t + h * 0.5)
  ctx.moveTo(l + w * 0.22, t + h * 0.68)
  ctx.lineTo(l + w * 0.62, t + h * 0.68)
  ctx.stroke()
}

function draw(
  ctx: CanvasRenderingContext2D,
  nodes: CNode[],
  nodeMap: Map<string, CNode>,
  edges: CEdge[],
  w: number, h: number,
  tx: number, ty: number, scale: number,
  hovered: string | null,
  selected: string | null,
  neighbors: Set<string>,
  highlight: Set<string>,
  labelMode: LabelMode,
  showDeps: boolean,
  pal: Palette,
) {
  const dpr = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, w * dpr, h * dpr)

  ctx.fillStyle = pal.bg
  ctx.fillRect(0, 0, w * dpr, h * dpr)

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.translate(tx + w / 2, ty + h / 2)
  ctx.scale(scale, scale)

  const vx0 = (-tx - w / 2) / scale, vy0 = (-ty - h / 2) / scale
  const vx1 = vx0 + w / scale, vy1 = vy0 + h / scale

  let spacing = 36
  while ((vx1 - vx0) / spacing > 90) spacing *= 2
  const dotR = Math.min(1.4 / scale, spacing * 0.05)
  const startX = Math.floor(vx0 / spacing) * spacing
  const startY = Math.floor(vy0 / spacing) * spacing

  ctx.beginPath()
  for (let gx = startX; gx <= vx1 + spacing; gx += spacing) {
    for (let gy = startY; gy <= vy1 + spacing; gy += spacing) {
      const major = (Math.round(gx / spacing) % 4 === 0) && (Math.round(gy / spacing) % 4 === 0)
      if (major) continue
      ctx.moveTo(gx + dotR, gy)
      ctx.arc(gx, gy, dotR, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = pal.dot
  ctx.fill()

  ctx.beginPath()
  for (let gx = startX; gx <= vx1 + spacing; gx += spacing) {
    for (let gy = startY; gy <= vy1 + spacing; gy += spacing) {
      const major = (Math.round(gx / spacing) % 4 === 0) && (Math.round(gy / spacing) % 4 === 0)
      if (!major) continue
      ctx.moveTo(gx + dotR * 1.6, gy)
      ctx.arc(gx, gy, dotR * 1.6, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = pal.dotStrong
  ctx.fill()

  const activeId = selected ?? hovered
  const hasActive = !!activeId
  const hasHighlight = highlight.size > 0

  for (const e of edges) {
    if (!showDeps && e.kind === 'dependency') continue
    const a = nodeMap.get(e.src), b = nodeMap.get(e.tgt)
    if (!a || !b) continue

    const isCall = e.kind === 'call' || e.kind === 'call-def'
    const hi = activeId === e.src || activeId === e.tgt
    const hlEdge = hasHighlight && highlight.has(e.src) && highlight.has(e.tgt)
    const dim = !isCall && ((hasActive && !hi) || (hasHighlight && !hlEdge && !hi))

    const dx = b.x - a.x, dy = b.y - a.y
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01
    const sx = a.x + (dx / d) * a.radius
    const sy = a.y + (dy / d) * a.radius
    const ex = b.x - (dx / d) * b.radius
    const ey = b.y - (dy / d) * b.radius

    const colorNode = b.isRoot ? a : b
    const [r, g, b2] = hexToRgb(colorNode.color)

    ctx.beginPath()
    ctx.moveTo(sx, sy)
    const mx = (sx + ex) / 2 + (ey - sy) * 0.22
    const my = (sy + ey) / 2 - (ex - sx) * 0.22
    ctx.quadraticCurveTo(mx, my, ex, ey)

    if (isCall) {
      const cc = e.kind === 'call-def' ? '22,163,74' : '137,87,229'
      ctx.strokeStyle = `rgba(${cc},0.65)`
      ctx.lineWidth = 1.8 / scale
      ctx.setLineDash(e.kind === 'call' ? [5 / scale, 4 / scale] : [])
      ctx.stroke()
      ctx.setLineDash([])

      const adx = ex - mx, ady = ey - my
      const ad = Math.sqrt(adx * adx + ady * ady) + 0.01
      const ux = adx / ad, uy = ady / ad
      const as = 7 / scale
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - ux * as - uy * as * 0.5, ey - uy * as + ux * as * 0.5)
      ctx.lineTo(ex - ux * as + uy * as * 0.5, ey - uy * as - ux * as * 0.5)
      ctx.closePath()
      ctx.fillStyle = `rgba(${cc},0.8)`
      ctx.fill()
      continue
    }

    if (dim) {
      ctx.strokeStyle = pal.dimEdge
      ctx.lineWidth = 1 / scale
      ctx.setLineDash([])
    } else if (hi || hlEdge) {
      ctx.strokeStyle = `rgba(${r},${g},${b2},0.75)`
      ctx.lineWidth = 2 / scale
      ctx.setLineDash([])
    } else {
      ctx.strokeStyle = `rgba(${r},${g},${b2},0.35)`
      ctx.lineWidth = 1.4 / scale
      if (e.kind === 'dependency') ctx.setLineDash([5 / scale, 4 / scale])
      else ctx.setLineDash([])
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  for (const n of nodes) {
    const isSel = n.id === selected
    const isNbr = neighbors.has(n.id)
    const isHov = n.id === hovered && !isSel
    const isHl = highlight.has(n.id)
    const isDim = !n.isFn && (
      (hasActive && n.id !== activeId && !isNbr) ||
      (hasHighlight && !isHl && n.id !== activeId))
    const isFolder = n.nodeType === 'folder'

    const [r, g, b2] = hexToRgb(n.color)

    if (n.isFn) {
      ctx.save()
      ctx.shadowColor = 'rgba(137,87,229,0.45)'
      ctx.shadowBlur = 14 / scale
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
      ctx.fillStyle = blend('#8957e5', 0.84, pal.base)
      ctx.fill()
      ctx.restore()

      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
      ctx.strokeStyle = '#8957e5'
      ctx.lineWidth = 1.8 / scale
      ctx.stroke()

      const fs = n.radius * 1.1
      ctx.font = `italic 700 ${fs}px Georgia, 'Times New Roman', serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#8957e5'
      ctx.fillText('ƒ', n.x, n.y + fs * 0.05)
      continue
    }

    ctx.globalAlpha = isDim ? 0.25 : 1

    if (!isDim) {
      ctx.save()
      ctx.shadowColor = pal.shadow
      ctx.shadowBlur = 8 / scale
      ctx.shadowOffsetY = 2 / scale
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgb(${pal.base[0]},${pal.base[1]},${pal.base[2]})`
      ctx.fill()
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
    if (n.isHub) {
      ctx.fillStyle = pal.hubFill
    } else if (isFolder) {
      ctx.fillStyle = blend(n.color, 0.86, pal.base)
    } else {
      ctx.fillStyle = blend(n.color, 0.93, pal.base)
    }
    ctx.fill()

    if (!n.isHub) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
      if (isSel || isHl) {
        ctx.strokeStyle = n.color
        ctx.lineWidth = 2 / scale
      } else if (isHov || isNbr) {
        ctx.strokeStyle = `rgba(${r},${g},${b2},0.8)`
        ctx.lineWidth = 1.5 / scale
      } else {
        ctx.strokeStyle = blend(n.color, 0.5, pal.base)
        ctx.lineWidth = 1.2 / scale
      }
      ctx.stroke()
    }

    if (isSel || isHl) {
      ctx.beginPath()
      ctx.arc(n.x, n.y, n.radius + 5 / scale, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b2},${isHl ? 0.4 : 0.25})`
      ctx.lineWidth = 3 / scale
      ctx.stroke()
    }

    const iconS = n.radius * 0.85
    if (n.isHub) {
      drawFileIcon(ctx, n.x, n.y, iconS * 0.9, pal.hubIcon, 1.6 / scale)
    } else if (isFolder) {
      drawFolderIcon(ctx, n.x, n.y, iconS, n.color)
    } else {
      drawFileIcon(ctx, n.x, n.y, iconS, n.color, 1.2 / scale)
    }

    ctx.globalAlpha = 1
  }

  if (labelMode !== 'none' || selected || hovered || hasHighlight) {
    const fontSize = Math.max(9, Math.min(13, 12 / scale))
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = []

    const priority = (n: CNode) =>
      n.isFn ? 6
      : n.isHub ? 5
      : n.id === selected || n.id === hovered ? 4
      : highlight.has(n.id) ? 3
      : neighbors.has(n.id) ? 2
      : n.nodeType === 'folder' ? 1
      : 0
    const labelOrder = [...nodes].sort((a, b) => priority(b) - priority(a))

    for (const n of labelOrder) {
      const isSel = n.id === selected
      const isHov = n.id === hovered
      const isNbr = neighbors.has(n.id)
      const isHl = highlight.has(n.id)
      const isDim = !n.isFn && (
        (hasActive && n.id !== activeId && !isNbr) ||
        (hasHighlight && !isHl && n.id !== activeId))

      if (labelMode === 'none' && !(isSel || isHov || isHl || n.isHub || n.isFn)) continue
      if (isDim && !isSel) continue

      ctx.font = `${n.isHub || n.isFn ? 600 : 400} ${fontSize}px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`

      const full = n.isHub ? n.original.path : n.label
      let label = full
      const maxW = 170
      while (label.length > 3 && ctx.measureText(label).width > maxW) label = label.slice(0, -1)
      if (label !== full) label += '…'

      const tw = ctx.measureText(label).width
      const th = fontSize * 1.3
      const pad = 4 / scale

      let lx: number, ly: number, align: CanvasTextAlign, baseline: CanvasTextBaseline
      let rect: { x0: number; y0: number; x1: number; y1: number }
      if (n.isHub || n.isFn) {
        lx = n.x; ly = n.y + n.radius + 9 / scale
        align = 'center'; baseline = 'top'
        rect = { x0: lx - tw / 2 - pad, y0: ly - pad, x1: lx + tw / 2 + pad, y1: ly + th + pad }
      } else {
        lx = n.x + n.radius + 7 / scale; ly = n.y
        align = 'left'; baseline = 'middle'
        rect = { x0: lx - pad, y0: ly - th / 2 - pad, x1: lx + tw + pad, y1: ly + th / 2 + pad }
      }

      if (labelMode === 'auto') {
        const overlaps = placed.some(p =>
          rect.x0 < p.x1 && rect.x1 > p.x0 && rect.y0 < p.y1 && rect.y1 > p.y0)
        const mustShow = n.isHub || n.isFn || isSel || isHov || isHl
        if (overlaps && !mustShow) continue
      }
      placed.push(rect)

      ctx.textAlign = align
      ctx.textBaseline = baseline

      ctx.strokeStyle = pal.halo
      ctx.lineWidth = 3 / scale
      ctx.lineJoin = 'round'
      ctx.strokeText(label, lx, ly)

      ctx.fillStyle = n.isFn ? '#8957e5'
        : (n.isHub || isSel || isHl) ? pal.labelStrong : pal.label
      ctx.fillText(label, lx, ly)
    }
  }

  ctx.restore()
}

export default function CanvasGraph({
  graph, onNodeClick, apiRef, theme = 'light',
  mode = 'force', labelMode = 'auto', showDeps = true,
  highlightIds = [], fnOverlay = null,
}: {
  graph: RepoGraph
  onNodeClick: (p: NodeClickPayload | null) => void
  apiRef?: React.MutableRefObject<GraphApi | null>
  theme?: GraphTheme
  mode?: LayoutMode
  labelMode?: LabelMode
  showDeps?: boolean
  highlightIds?: string[]
  fnOverlay?: FnOverlay | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const themeRef = useRef<GraphTheme>(theme)
  themeRef.current = theme
  const modeRef = useRef<LayoutMode>(mode)
  const labelModeRef = useRef<LabelMode>(labelMode)
  labelModeRef.current = labelMode
  const showDepsRef = useRef(showDeps)
  showDepsRef.current = showDeps
  const highlightRef = useRef<Set<string>>(new Set())
  highlightRef.current = new Set(highlightIds)

  const simRef = useRef<{
    nodeMap: Map<string, CNode>
    nodes: CNode[]
    edges: CEdge[]
    alpha: number
  } | null>(null)

  const stateRef = useRef({
    tx: 0, ty: 0, scale: 1,
    ttx: 0, tty: 0, tscale: 1,
    hovered: null as string | null,
    selected: null as string | null,
    neighbors: new Set<string>(),
    dragging: false,
    dragX: 0, dragY: 0,
    baseTx: 0, baseTy: 0,
  })

  const animRef = useRef(0)

  const getNeighbors = useCallback((id: string | null): Set<string> => {
    if (!id || !simRef.current) return new Set()
    const s = new Set<string>()
    for (const e of simRef.current.edges) {
      if (e.src === id) s.add(e.tgt)
      if (e.tgt === id) s.add(e.src)
    }
    return s
  }, [])

  const toWorld = useCallback((cx: number, cy: number): [number, number] => {
    const c = canvasRef.current!
    const st = stateRef.current
    return [
      (cx - st.tx - c.clientWidth / 2) / st.scale,
      (cy - st.ty - c.clientHeight / 2) / st.scale,
    ]
  }, [])

  const hitTest = useCallback((wx: number, wy: number): CNode | null => {
    if (!simRef.current) return null
    for (const n of simRef.current.nodes) {
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
    }
    return null
  }, [])

  const fitGraph = useCallback((useTargets = false, instant = false) => {
    const sim = simRef.current
    const canvas = canvasRef.current
    if (!sim || !canvas || !sim.nodes.length) return
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of sim.nodes) {
      const px = useTargets ? n.tx : n.x
      const py = useTargets ? n.ty : n.y
      minX = Math.min(minX, px - n.radius)
      maxX = Math.max(maxX, px + n.radius)
      minY = Math.min(minY, py - n.radius)
      maxY = Math.max(maxY, py + n.radius)
    }
    const pad = 90
    const cw = canvas.clientWidth, ch = canvas.clientHeight
    const ns = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY), 1.6)
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    const st = stateRef.current
    st.tscale = ns; st.ttx = -cx * ns; st.tty = -cy * ns
    if (instant) { st.scale = ns; st.tx = st.ttx; st.ty = st.tty }
  }, [])

  const focusNode = useCallback((id: string) => {
    const sim = simRef.current
    if (!sim) return
    const n = sim.nodeMap.get(id)
    if (!n) return
    const st = stateRef.current
    st.selected = id
    st.neighbors = getNeighbors(id)
    st.tscale = Math.max(st.tscale, 1)
    st.ttx = -n.x * st.tscale
    st.tty = -n.y * st.tscale
    onNodeClick({
      nodeId: n.id, nodeName: n.label, nodeType: n.nodeType,
      nodePath: n.original.path, folderGroup: n.folderGroup,
    })
  }, [getNeighbors, onNodeClick])

  useEffect(() => {
    if (apiRef) apiRef.current = { fit: () => fitGraph(false), focus: focusNode }
  }, [apiRef, fitGraph, focusNode])

  useEffect(() => {
    const { nodes, edges } = prepData(graph)
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const sim = { nodeMap, nodes, edges, alpha: 1 }
    for (let i = 0; i < 200; i++) {
      tick(sim.nodeMap, sim.edges, sim.alpha)
      sim.alpha = Math.max(sim.alpha - sim.alpha * 0.016, 0)
    }
    sim.nodes = Array.from(sim.nodeMap.values())
    simRef.current = sim
    const st = stateRef.current
    st.selected = null; st.hovered = null; st.neighbors = new Set()
    if (modeRef.current !== 'force') {
      computeStaticLayout(modeRef.current, sim.nodes)
      for (const n of sim.nodes) { n.x = n.tx; n.y = n.ty }
    }
    fitGraph(false, true)
  }, [graph, fitGraph])

  useEffect(() => {
    const sim = simRef.current
    if (!sim) return

    sim.nodes = sim.nodes.filter(n => !n.isFn)
    sim.edges = sim.edges.filter(e => !e.src.startsWith('fn:') && !e.tgt.startsWith('fn:'))
    sim.nodeMap = new Map(sim.nodes.map(n => [n.id, n]))

    if (fnOverlay) {
      const byPath = new Map(sim.nodes.map(n => [n.original.path, n]))
      const defined = fnOverlay.definedIn.map(p => byPath.get(p)).filter((n): n is CNode => !!n)
      const called = fnOverlay.calledIn
        .filter(p => !fnOverlay.definedIn.includes(p))
        .map(p => byPath.get(p)).filter((n): n is CNode => !!n)
      const related = [...defined, ...called]

      if (related.length > 0) {
        const cx = related.reduce((s, n) => s + n.x, 0) / related.length
        const cy = related.reduce((s, n) => s + n.y, 0) / related.length
        const fnId = `fn:${fnOverlay.name}`
        const fnNode: CNode = {
          id: fnId,
          label: `ƒ ${fnOverlay.name}`,
          nodeType: 'file',
          folderGroup: '',
          color: '#8957e5',
          radius: 17,
          colRadius: 17 + 40,
          isRoot: false, isHub: false, isFn: true,
          rel: related.map(n => n.id),
          original: { id: fnId, path: fnId, name: fnOverlay.name, type: 'file', size: 0, folderGroup: '', depth: 0 },
          x: cx + 4, y: cy + 4, vx: 0, vy: 0, tx: cx, ty: cy,
        }
        sim.nodes.push(fnNode)
        sim.nodeMap.set(fnId, fnNode)
        for (const n of defined) sim.edges.push({ src: n.id, tgt: fnId, kind: 'call-def', strength: 1 })
        for (const n of called) sim.edges.push({ src: fnId, tgt: n.id, kind: 'call', strength: 1 })
        sim.alpha = Math.max(sim.alpha, 0.3)
      }
    }
  }, [fnOverlay, graph])

  useEffect(() => {
    modeRef.current = mode
    const sim = simRef.current
    if (!sim) return
    if (mode === 'force') {
      sim.alpha = 0.5
    } else {
      computeStaticLayout(mode, sim.nodes)
      fitGraph(true)
    }
  }, [mode, fitGraph])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const loop = () => {
      animRef.current = requestAnimationFrame(loop)
      const sim = simRef.current
      if (!sim) return
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr
      }

      if (modeRef.current === 'force') {
        if (sim.alpha > 0.001) {
          for (let i = 0; i < 2; i++) {
            tick(sim.nodeMap, sim.edges, sim.alpha)
            sim.alpha = Math.max(sim.alpha - sim.alpha * 0.016, 0)
          }
          sim.nodes = Array.from(sim.nodeMap.values())
        }
      } else {
        for (const n of sim.nodes) {
          if (n.isFn && n.rel?.length) {
            let cx = 0, cy = 0, c = 0
            for (const id of n.rel) {
              const rn = sim.nodeMap.get(id)
              if (rn) { cx += rn.x; cy += rn.y; c++ }
            }
            if (c > 0) { n.tx = cx / c; n.ty = cy / c }
          }
          n.x += (n.tx - n.x) * 0.12
          n.y += (n.ty - n.y) * 0.12
          n.vx = 0; n.vy = 0
        }
      }

      const st = stateRef.current
      const k = 0.18
      st.scale += (st.tscale - st.scale) * k
      st.tx += (st.ttx - st.tx) * k
      st.ty += (st.tty - st.ty) * k
      if (Math.abs(st.tscale - st.scale) < st.tscale * 0.001) st.scale = st.tscale
      if (Math.abs(st.ttx - st.tx) < 0.1) st.tx = st.ttx
      if (Math.abs(st.tty - st.ty) < 0.1) st.ty = st.tty

      draw(ctx, sim.nodes, sim.nodeMap, sim.edges,
        w, h, st.tx, st.ty, st.scale,
        st.hovered, st.selected, st.neighbors,
        highlightRef.current,
        labelModeRef.current, showDepsRef.current,
        PALETTES[themeRef.current])
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top
    const st = stateRef.current
    if (st.dragging) {
      st.tx = st.baseTx + cx - st.dragX
      st.ty = st.baseTy + cy - st.dragY
      st.ttx = st.tx
      st.tty = st.ty
      return
    }
    const [wx, wy] = toWorld(cx, cy)
    const hit = hitTest(wx, wy)
    st.hovered = hit?.id ?? null
    if (!st.selected) st.neighbors = getNeighbors(st.hovered)
    canvasRef.current!.style.cursor = hit ? 'pointer' : 'grab'
  }, [hitTest, toWorld, getNeighbors])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const st = stateRef.current
    st.dragX = e.clientX - rect.left; st.dragY = e.clientY - rect.top
    st.baseTx = st.tx; st.baseTy = st.ty; st.dragging = true
  }, [])

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const st = stateRef.current
    const moved = Math.hypot(
      e.clientX - (rect.left + st.dragX),
      e.clientY - (rect.top + st.dragY)
    ) < 5
    st.dragging = false
    if (moved) {
      const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top)
      const hit = hitTest(wx, wy)
      if (hit?.isFn) {
        st.selected = hit.id
        st.neighbors = getNeighbors(hit.id)
      } else if (hit) {
        const newSel = st.selected === hit.id ? null : hit.id
        st.selected = newSel
        st.neighbors = getNeighbors(newSel)
        onNodeClick(newSel
          ? { nodeId: hit.id, nodeName: hit.label, nodeType: hit.nodeType, nodePath: hit.original.path, folderGroup: hit.folderGroup }
          : null)
      } else {
        st.selected = null
        st.neighbors = getNeighbors(st.hovered)
        onNodeClick(null)
      }
    }
  }, [hitTest, toWorld, getNeighbors, onNodeClick])

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const st = stateRef.current
    const rect = canvasRef.current!.getBoundingClientRect()
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top
    const c = canvasRef.current!

    const factor = Math.exp(-e.deltaY * 0.0022)
    const ns = Math.max(0.05, Math.min(5, st.tscale * factor))

    const wx = (cx - st.ttx - c.clientWidth / 2) / st.tscale
    const wy = (cy - st.tty - c.clientHeight / 2) / st.tscale
    st.ttx = cx - wx * ns - c.clientWidth / 2
    st.tty = cy - wy * ns - c.clientHeight / 2
    st.tscale = ns
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onMouseMove={onMouseMove}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { stateRef.current.hovered = null; stateRef.current.dragging = false }}
      onWheel={onWheel}
    />
  )
}
