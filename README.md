                                                      # Nexa
**AI codebase intelligence inside your browser**

A full-stack platform that connects to any GitHub repository — builds an interactive dependency graph, explains files and folders with AI, and lets you ask anything about the codebase. Without leaving your tab.

---

## About The Project

Nexa is built for developers who spend their first week on any new codebase just figuring out where things live.

It connects to your GitHub, fetches the entire file tree in a single API call, renders it as a live force-directed graph on a `<canvas>`, and surfaces AI-powered answers the moment you click anything — before you've had to open a single file.

**What it does automatically:**

- Sign in with GitHub → dashboard shows your repos, collaborations, and org repos in one view
- Click any repository → full dependency graph rendered from the actual file tree
- Click any node → AI explains what it does, what depends on it, and how it fits the architecture
- Ask anything in the chat → full repo context, specific file path references, no generic answers

---

## Project Preview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Nexa                                          👤  Sign out          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐   ┌──────────────────────────┐  ┌─────────────┐  │
│  │  File Tree   │   │     Dependency Graph      │  │  AI Panel   │  │
│  │              │   │                           │  │             │  │
│  │ ▸ app/       │   │    ●  auth/        ●  ui  │  │ Selected:   │  │
│  │   ▸ api/     │   │      ╲           ╱        │  │ api/repos   │  │
│  │   ▸ (routes) │   │       ◉ frontend ◉        │  │             │  │
│  │ ▸ components │   │      ╱           ╲        │  │ Fetches all │  │
│  │ ▸ lib/       │   │    ●  data        ●  pay  │  │ repos via   │  │
│  │ ▸ hooks/     │   │                           │  │ GitHub API  │  │
│  │              │   │  [zoom +]  [fit]  [zoom -] │  │ with 3      │  │
│  └──────────────┘   └──────────────────────────┘  │ affiliations│  │
│                                                    └─────────────┘  │
│  ──────────────────────────────────────────────────────────────     │
│  Ask anything about this repository...                    [Send]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| ◉ Dependency Graph | Force-directed canvas graph of every folder and file — color-coded by language |
| ✦ AI File Explain | Click any node — Claude explains what it does, what it imports, and what breaks if you touch it |
| ◫ Repo Chat | Ask anything about the codebase with full file tree context — answers reference real paths |
| ⇄ GitHub OAuth | Sign in once, access every repo you own, collaborate on, or belong to via org membership |
| ↗ Collaboration View | Dashboard splits your repos from collaborations — owner avatar shown on every shared card |
| ⌗ Language Colors | TypeScript blue, Python green, Go cyan — matches GitHub's own dot colors |
| ◈ Single-Request Tree | Entire repo structure fetched in one API call regardless of depth via GitHub's recursive tree endpoint |
| ⚡ Canvas Renderer | Thousands of nodes at 60fps — no SVG, no D3, no DOM nodes per file |

---

## Tech Stack

```
Framework        →  Next.js 14        (App Router, Server + Client Components)
Auth             →  Supabase Auth     (GitHub OAuth, provider_token = GitHub key)
GitHub API       →  Octokit REST      (repos, trees, file content)
AI Provider      →  Anthropic Claude  (claude-sonnet-4-6, streaming)
Graph Renderer   →  Canvas API        (custom force simulation, no D3)
Styling          →  Tailwind CSS      (pure black theme)
Language         →  TypeScript
Deployment       →  Vercel
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│                                                              │
│  app/page.tsx           →  Landing + auth redirect          │
│  app/signin/page.tsx    →  GitHub OAuth trigger             │
│  app/dashboard/page.tsx →  Repo picker (3 affiliation groups)│
│  app/explore/[owner]/   →  Graph + AI panel + chat          │
│  [repo]/page.tsx                                             │
│                                                              │
│        CanvasGraph.tsx   →  force simulation + hit testing   │
│        FileTree.tsx      →  folder/file sidebar              │
│        AnalysisPanel.tsx →  AI explanation + streaming chat  │
└──────────────────┬───────────────────────────────────────────┘
                   │  fetch (REST)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  Next.js API Routes                          │
│                                                              │
│  /api/repos              →  listForAuthenticatedUser         │
│  /api/repos/[o]/[r]/tree →  getTree (recursive: '1')        │
│  /api/analyze            →  Claude overview + streaming      │
│  /api/analyze/overview   →  repo health summary             │
│  /api/chat               →  chat with full tree context     │
│                                                              │
│  All routes read session.provider_token for GitHub access   │
└──────────────────┬───────────────────────────────────────────┘
                   │  provider_token
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              Supabase Auth + GitHub API                      │
│                                                              │
│  supabase.auth.signInWithOAuth({ provider: 'github' })      │
│  session.provider_token  →  passed to Octokit               │
│  octokit.repos.listForAuthenticatedUser(affiliation: all)   │
│  octokit.git.getTree({ recursive: '1' })                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with GitHub OAuth enabled
- An [Anthropic](https://console.anthropic.com) API key
- A GitHub OAuth App

### Installation

```bash
# Clone the repo
git clone https://github.com/Arishsingh/nexa
cd nexa

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=sk-ant-...
```

### Supabase Setup

1. Go to **Authentication → Providers → GitHub** in your Supabase dashboard
2. Enable the GitHub provider
3. Create a GitHub OAuth App at `github.com/settings/developers`
4. Set **Authorization callback URL** to `https://<your-project>.supabase.co/auth/v1/callback`
5. Paste the Client ID and Secret into Supabase

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with GitHub, and pick a repo.

---

## Usage

| Action | What happens |
|---|---|
| Click **Sign in** on the landing page | GitHub OAuth flow via Supabase |
| Dashboard loads | All your repos, collaborations, and org repos fetched and grouped |
| Click any repo card | Full recursive file tree fetched — graph renders |
| Click a node on the graph | AI panel explains the file or folder |
| Type in the chat input | Ask anything — Claude has the full file tree as context |
| Click **Sign out** | Session cleared, back to landing page |

---

## Project Structure

```
nexa/
├── app/
│   ├── page.tsx                     # Landing page (5 scroll sections)
│   ├── signin/page.tsx              # GitHub OAuth sign-in
│   ├── dashboard/page.tsx           # Repository picker
│   ├── explore/[owner]/[repo]/
│   │   └── page.tsx                 # Graph explorer
│   ├── auth/callback/route.ts       # OAuth code exchange
│   └── api/
│       ├── repos/route.ts           # List repos (all affiliations)
│       ├── repos/[owner]/[repo]/
│       │   ├── tree/route.ts        # Recursive file tree
│       │   └── symbols/route.ts    # Symbol extraction
│       ├── analyze/route.ts         # Claude streaming analysis
│       ├── analyze/overview/        # Repo health overview
│       └── chat/route.ts            # Chat with repo context
├── components/
│   ├── graph/
│   │   └── CanvasGraph.tsx          # Force-directed canvas renderer
│   └── ui/
│       ├── FileTree.tsx             # Folder/file sidebar
│       └── AnalysisPanel.tsx        # AI explain + chat panel
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   └── server.ts                # Server Supabase client (cookies)
│   ├── github/
│   │   └── client.ts                # Octokit wrapper + repo helpers
│   └── utils/
│       └── colors.ts                # Language + folder color palette
├── types/
│   └── index.ts                     # GithubRepo, GithubTreeItem, etc.
├── middleware.ts                    # Session refresh on every request
└── blog.md                          # Dev.to post
```

---

## How the Graph Renderer Works

No SVG. No D3. Raw `<canvas>` with a custom force simulation:

```ts
// Every frame: clear → run physics → paint
function tick() {
  applyForces(nodes, edges)      // spring + repulsion
  nodes.forEach(n => {
    n.vx *= 0.85                 // damping — without this nodes oscillate forever
    n.vy *= 0.85
    n.x += n.vx
    n.y += n.vy
  })
  drawFrame(ctx, nodes, edges)
  requestAnimationFrame(tick)
}
```

Hit testing on click (canvas has no event system):

```ts
function getNodeAtPoint(x: number, y: number): Node | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const dx = x - n.x, dy = y - n.y
    if (dx * dx + dy * dy <= n.r * n.r) return n
  }
  return null
}
```

Handles 1,000-node repos without a frame drop.

---

## Contributing

PRs are welcome. For major changes, open an issue first.

```bash
npm run dev      # development server with HMR
npm run build    # production build
npm run lint     # type-check + lint
```

Read the full build writeup on dev.to: [How I Built Nexa](https://dev.to/arishsingh99)

---

## About

Nexa turns any GitHub repository into a visual map you can actually navigate. The understanding that used to take a week of onboarding now takes the first hour.

**Contributors**

[@Arishsingh](https://github.com/Arishsingh) — Arish Singh

---

![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Anthropic](https://img.shields.io/badge/Claude-D97757?style=flat-square&logoColor=white)

---

© 2026 Nexa · Built by Arish Singh
