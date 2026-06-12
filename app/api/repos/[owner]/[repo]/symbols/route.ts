import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createOctokit, getRepoTree, getRepoMeta } from '@/lib/github/client'
import type { SymbolInfo } from '@/types'

const SOURCE_EXT = /\.(tsx?|jsx?|mjs|cjs|py)$/
const SKIP_PATH = /(^|\/)(node_modules|dist|build|\.next|vendor|coverage|__pycache__)(\/|$)/
const MAX_FILES = 120
const MAX_SIZE = 100_000

const KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof',
  'new', 'await', 'async', 'else', 'do', 'import', 'export', 'require',
  'super', 'this', 'constructor', 'console', 'log', 'warn', 'error',
  'Promise', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math',
  'JSON', 'Set', 'Map', 'Date', 'RegExp', 'Error', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'fetch', 'then', 'finally',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'push', 'pop', 'shift', 'map', 'filter', 'forEach', 'reduce', 'find',
  'some', 'every', 'sort', 'slice', 'splice', 'join', 'split', 'includes',
  'indexOf', 'keys', 'values', 'entries', 'has', 'get', 'set', 'add',
  'delete', 'from', 'of', 'concat', 'replace', 'match', 'test', 'exec',
  'toString', 'toLowerCase', 'toUpperCase', 'trim', 'charAt', 'startsWith',
  'endsWith', 'print', 'len', 'range', 'str', 'int', 'float', 'list',
  'dict', 'tuple', 'type', 'isinstance', 'def', 'self',
])

const DEF_PATTERNS = [
  /(?:^|\s)(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)\s*[(<]/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]{0,120})?=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=>{]{0,120})?=>/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/g,
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/g,
  /^\s*def\s+([A-Za-z_]\w*)\s*\(/gm,
]

const CALL_PATTERN = /([A-Za-z_$][\w$]{2,})\s*\(/g

function extractSymbols(path: string, content: string, defined: Map<string, Set<string>>, called: Map<string, Set<string>>) {
  const defsHere = new Set<string>()
  for (const re of DEF_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const name = m[1]
      if (!name || KEYWORDS.has(name)) continue
      defsHere.add(name)
      if (!defined.has(name)) defined.set(name, new Set())
      defined.get(name)!.add(path)
    }
  }
  CALL_PATTERN.lastIndex = 0
  let m: RegExpExecArray | null
  let count = 0
  while ((m = CALL_PATTERN.exec(content)) !== null && count < 600) {
    const name = m[1]
    if (KEYWORDS.has(name)) continue
    count++
    if (!called.has(name)) called.set(name, new Set())
    called.get(name)!.add(path)
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { owner, repo } = params

  try {
    const octokit = createOctokit(session.accessToken)
    const meta = await getRepoMeta(session.accessToken, owner, repo)
    const tree = await getRepoTree(session.accessToken, owner, repo, meta.defaultBranch)

    const files = tree
      .filter(t =>
        t.type === 'blob' &&
        SOURCE_EXT.test(t.path) &&
        !SKIP_PATH.test(t.path) &&
        (t.size ?? 0) > 0 && (t.size ?? 0) < MAX_SIZE)
      .slice(0, MAX_FILES)

    const defined = new Map<string, Set<string>>()
    const called = new Map<string, Set<string>>()

    // Fetch blobs in batches to stay polite with the API
    const BATCH = 10
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH)
      await Promise.all(batch.map(async f => {
        try {
          const { data } = await octokit.git.getBlob({ owner, repo, file_sha: f.sha })
          const content = Buffer.from(data.content, 'base64').toString('utf-8')
          extractSymbols(f.path, content, defined, called)
        } catch { /* skip unreadable blobs */ }
      }))
    }

    // Only surface names that are actually defined somewhere in the repo
    const symbols: SymbolInfo[] = Array.from(defined.entries())
      .map(([name, defs]) => ({
        name,
        definedIn: Array.from(defs),
        calledIn: Array.from(called.get(name) ?? []),
      }))
      .sort((a, b) => (b.calledIn.length - a.calledIn.length) || a.name.localeCompare(b.name))
      .slice(0, 800)

    return NextResponse.json({ symbols, indexedFiles: files.length })
  } catch (err) {
    console.error('Symbol indexing failed:', err)
    return NextResponse.json({ error: 'Failed to index symbols' }, { status: 500 })
  }
}
