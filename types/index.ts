export interface GithubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  private: boolean
  size: number
  default_branch: string
  fork?: boolean
  owner_login?: string
  owner_avatar?: string
  affiliation?: 'owner' | 'collaborator' | 'organization'
}

export interface GithubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

export interface FileNode {
  id: string
  path: string
  name: string
  type: 'file' | 'folder'
  size: number
  children: FileNode[]
  depth: number
  language?: string
  folderGroup?: string  // top-level folder this node belongs to
}

export interface RepoGraph {
  owner: string
  repo: string
  description: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  totalFiles: number
  totalFolders: number
  defaultBranch: string
}

// Flat graph representation for force layout
export interface GraphNode {
  id: string
  path: string
  name: string
  type: 'file' | 'folder'
  size: number
  folderGroup: string  // top-level folder for color grouping
  depth: number
  language?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'structural' | 'dependency'
  strength: number
}

// Force simulation internal types
export interface SimNode extends GraphNode {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

export interface AnalysisResult {
  summary: string
  role: string
  dependencies: string
  impact: string
  recommendations: string[]
}

export interface HealthMetric {
  label: string
  score: number
}

export interface Risk {
  text: string
  severity: 'Low' | 'Medium' | 'High'
}

export interface RepoOverview {
  summary: string
  architecture: string
  techStack: string
  recommendations: string[]
  healthScore: number
  healthMetrics: HealthMetric[]
  risks: Risk[]
}

export interface NodeClickPayload {
  nodeId: string
  nodeName: string
  nodeType: 'file' | 'folder'
  nodePath: string
  folderGroup: string
}

export interface SymbolInfo {
  name: string
  definedIn: string[]   // file paths where this function is defined
  calledIn: string[]    // file paths where this function is called
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
  }
}
