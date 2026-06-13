import type { AnalysisResult, RepoOverview } from '@/types'
import { geminiGenerate, parseGeminiJson, friendlyGeminiError } from '@/lib/ai/gemini'

const nodeCache = new Map<string, AnalysisResult>()
const overviewCache = new Map<string, RepoOverview>()

const NODE_SYSTEM_PROMPT = `You are a senior software architect analyzing codebases.
Respond only with a JSON object with these exact keys: summary, role, dependencies, impact, recommendations.
Keep summary/role/dependencies/impact to 1-3 concise sentences each. Be specific and technical.
recommendations must be an array of exactly 3 short, actionable strings for improving this file/folder.`

const REPO_SYSTEM_PROMPT = `You are a senior software architect reviewing a GitHub repository structure.
Respond only with a JSON object with these exact keys: summary, architecture, techStack, recommendations, healthScore, healthMetrics, risks.
Be specific and technical. recommendations: array of 4-5 actionable strings. healthScore: integer 0-100.
healthMetrics: array of exactly 5 objects {label, score} with labels: Architecture, Performance, Maintainability, Security, Documentation.
risks: array of 3-4 objects {text, severity} where severity is one of: Low, Medium, High.`

export async function analyzeNode(params: {
  path: string
  name: string
  type: 'file' | 'folder'
  content: string | null
  repoName: string
  language?: string
  importedByCount?: number
}): Promise<AnalysisResult> {
  const { path, name, type, content, repoName, language, importedByCount = 0 } = params

  const contentSection = content
    ? `\n\nFile content (truncated to 3000 chars):\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``
    : '\n\n(Content unavailable — analyze based on name and path only.)'

  const prompt = `Analyze this ${type} from the "${repoName}" repository.

Path: ${path}
Name: ${name}
${language ? `Language: ${language}` : ''}
${importedByCount ? `Imported by approximately ${importedByCount} other files.` : ''}
${contentSection}

Return JSON with:
- summary: What this ${type} does in 1-2 sentences.
- role: Its architectural role and importance in the codebase.
- dependencies: Key external libraries or internal modules it relies on.
- impact: What would break or be affected if this ${type} was removed or significantly changed.
- recommendations: Array of exactly 3 short actionable improvement suggestions for this ${type}.`

  const cacheKey = `${repoName}:${path}`
  const cached = nodeCache.get(cacheKey)
  if (cached) return cached

  try {
    const text = await geminiGenerate({
      system: NODE_SYSTEM_PROMPT,
      messages: [{ role: 'user', text: prompt }],
      maxOutputTokens: 600,
      json: true,
    })
    const result = parseGeminiJson<AnalysisResult>(text)
    nodeCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('analyzeNode failed:', err)
    const reason = friendlyGeminiError(err)
    return {
      summary: reason,
      role: '—',
      dependencies: '—',
      impact: '—',
      recommendations: [],
    }
  }
}

export async function analyzeRepoStructure(params: {
  repoName: string
  owner: string
  description: string
  totalFiles: number
  totalFolders: number
  topFolders: string[]
  samplePaths: string[]
}): Promise<RepoOverview> {
  const { repoName, owner, description, totalFiles, totalFolders, topFolders, samplePaths } = params

  const prompt = `Analyze the structure of this GitHub repository.

Repository: ${owner}/${repoName}
${description ? `Description: ${description}` : ''}
Total files: ${totalFiles} | Total folders: ${totalFolders}

Top-level folders: ${topFolders.join(', ')}

Sample file paths:
${samplePaths.slice(0, 40).join('\n')}

Return JSON with:
- summary: What this repository does in 2-3 sentences.
- architecture: How the codebase is structured — patterns, layers, and organisation style in 2-3 sentences.
- techStack: Key technologies, frameworks, and tools detected from the file paths.
- recommendations: Array of 4-5 specific, actionable suggestions to improve the codebase structure or architecture.
- healthScore: Overall repository health as an integer 0-100.
- healthMetrics: Array of exactly 5 objects with labels Architecture, Performance, Maintainability, Security, Documentation and integer scores 0-100.
- risks: Array of 3-4 objects with text (short risk description) and severity (Low, Medium, or High).`

  const cacheKey = `${owner}/${repoName}`
  const cached = overviewCache.get(cacheKey)
  if (cached) return cached

  try {
    const text = await geminiGenerate({
      system: REPO_SYSTEM_PROMPT,
      messages: [{ role: 'user', text: prompt }],
      maxOutputTokens: 900,
      json: true,
    })
    const result = parseGeminiJson<RepoOverview>(text)
    overviewCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('analyzeRepoStructure failed:', err)
    return {
      summary: friendlyGeminiError(err),
      architecture: '—',
      techStack: '—',
      recommendations: [],
      healthScore: 0,
      healthMetrics: [],
      risks: [],
    }
  }
}
