import type { GraphEdge } from '@/types'
import path from 'path'

const IMPORT_PATTERNS = [
  /(?:import|export)\s+(?:[\w*{},\s]+\s+from\s+)?['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

function resolveImportPath(importPath: string, fromFile: string): string | null {
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return null

  const dir = path.dirname(fromFile)
  let resolved = path.join(dir, importPath).replace(/\\/g, '/')

  if (resolved.startsWith('./')) resolved = resolved.slice(2)
  if (resolved.startsWith('/')) resolved = resolved.slice(1)

  return resolved
}

function findMatchingNode(resolved: string, knownPaths: Set<string>): string | null {
  if (knownPaths.has(resolved)) return resolved

  const exts = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']
  for (const ext of exts) {
    const withExt = `${resolved}.${ext}`
    if (knownPaths.has(withExt)) return withExt
  }

  for (const ext of exts) {
    const index = `${resolved}/index.${ext}`
    if (knownPaths.has(index)) return index
  }

  return null
}

export function parseDependencyEdges(
  filePath: string,
  content: string,
  knownPaths: Set<string>
): GraphEdge[] {
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  for (const pattern of IMPORT_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1]
      const resolved = resolveImportPath(importPath, filePath)
      if (!resolved) continue

      const target = findMatchingNode(resolved, knownPaths)
      if (!target || target === filePath || seen.has(target)) continue

      seen.add(target)
      edges.push({
        id: `${filePath}→${target}`,
        source: filePath,
        target,
        type: 'dependency',
        strength: 2,
      })
    }
  }

  return edges
}
