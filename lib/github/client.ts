import { Octokit } from '@octokit/rest'
import type { GithubRepo, GithubTreeItem } from '@/types'

export function createOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

export async function getUserRepos(accessToken: string): Promise<GithubRepo[]> {
  const octokit = createOctokit(accessToken)
  const { data: me } = await octokit.users.getAuthenticated()

  // Fetch everything the user can access: owned, collaborations, org repos
  const all: Awaited<ReturnType<typeof octokit.repos.listForAuthenticatedUser>>['data'] = []
  for (let page = 1; page <= 5; page++) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      page,
      affiliation: 'owner,collaborator,organization_member',
    })
    all.push(...data)
    if (data.length < 100) break
  }

  return all.map(r => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    language: r.language ?? null,
    stargazers_count: r.stargazers_count ?? 0,
    forks_count: r.forks_count ?? 0,
    updated_at: r.updated_at ?? '',
    private: r.private,
    size: r.size ?? 0,
    default_branch: r.default_branch ?? 'main',
    fork: r.fork,
    owner_login: r.owner?.login ?? '',
    owner_avatar: r.owner?.avatar_url ?? '',
    affiliation:
      r.owner?.login === me.login ? 'owner' as const
      : r.owner?.type === 'Organization' ? 'organization' as const
      : 'collaborator' as const,
  }))
}

export async function getRepoTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GithubTreeItem[]> {
  const octokit = createOctokit(accessToken)
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1',
  })
  return data.tree as GithubTreeItem[]
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const octokit = createOctokit(accessToken)
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if (Array.isArray(data) || data.type !== 'file') return null
    // GitHub returns base64-encoded content
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

export async function getRepoMeta(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ description: string; defaultBranch: string }> {
  const octokit = createOctokit(accessToken)
  const { data } = await octokit.repos.get({ owner, repo })
  return {
    description: data.description ?? '',
    defaultBranch: data.default_branch,
  }
}
