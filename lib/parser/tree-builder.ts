import type { GithubTreeItem, GraphNode, GraphEdge, RepoGraph } from '@/types'

const IGNORE_PATHS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out',
  'coverage', '.turbo', '.vercel', '__pycache__', '.pytest_cache',
  'vendor', 'target', 'bin', 'obj',
])

const IGNORE_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'Cargo.lock', 'go.sum', 'poetry.lock',
])

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust',
  java: 'Java', cs: 'C#', swift: 'Swift', kt: 'Kotlin',
  css: 'CSS', scss: 'CSS', sass: 'CSS',
  html: 'HTML', htm: 'HTML',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  md: 'Markdown', mdx: 'Markdown',
  sh: 'Shell', bash: 'Shell',
}

function getLanguage(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? LANG_MAP[ext] : undefined
}

function shouldIgnore(path: string): boolean {
  const parts = path.split('/')
  return parts.some(p => IGNORE_PATHS.has(p)) || IGNORE_FILES.has(parts[parts.length - 1])
}

function getTopLevelFolder(path: string): string {
  const parts = path.split('/')
  return parts.length > 1 ? parts[0] : '__root__'
}

export function buildGraph(
  items: GithubTreeItem[],
  owner: string,
  repo: string,
  description: string,
  defaultBranch: string
): RepoGraph {
  const filtered = items.filter(item => !shouldIgnore(item.path))

  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()

  for (const item of filtered) {
    const parts = item.path.split('/')
    const name = parts[parts.length - 1]
    const folderGroup = getTopLevelFolder(item.path)

    const node: GraphNode = {
      id: item.path,
      path: item.path,
      name,
      type: item.type === 'tree' ? 'folder' : 'file',
      size: item.size ?? 0,
      folderGroup,
      depth: parts.length - 1,
      language: item.type === 'blob' ? getLanguage(name) : undefined,
    }

    nodes.push(node)
    nodeIds.add(item.path)
  }

  for (const node of nodes) {
    if (node.depth === 0) continue
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    if (nodeIds.has(parentPath)) {
      edges.push({
        id: `${parentPath}→${node.path}`,
        source: parentPath,
        target: node.path,
        type: 'structural',
        strength: 1,
      })
    }
  }

  const files = nodes.filter(n => n.type === 'file')
  const folders = nodes.filter(n => n.type === 'folder')

  return {
    owner,
    repo,
    description,
    nodes,
    edges,
    totalFiles: files.length,
    totalFolders: folders.length,
    defaultBranch,
  }
}
