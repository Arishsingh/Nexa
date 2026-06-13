# How I Built Nexa

[#ai](https://dev.to/t/ai) [#github](https://dev.to/t/github) [#webdev](https://dev.to/t/webdev) [#showdev](https://dev.to/t/showdev)

**An AI platform that turns any GitHub repository into an interactive visual map so you can understand a codebase in an hour, not a week.**

Every developer has been there. You clone a new repo, open the folder tree, and stare at 400 files with no idea where anything lives. The README is three years out of date. The architecture is documented somewhere in a Notion page nobody can find. You spend the first week just figuring out what calls what.

I got tired of that. So I built Nexa — a full-stack platform that connects to any GitHub repository, builds an interactive dependency graph from the actual code, and lets you ask an AI questions about what you're looking at. You go from a repo URL to a complete mental model in the first hour.

---

## What I Built

Nexa is a full-stack codebase intelligence platform. Here's the core loop:

1. **Sign in with GitHub** → Supabase OAuth, your `provider_token` becomes the GitHub API key
2. **Pick any repository** → from your own repos, collaborations, or organization repos all in one dashboard
3. **Explore the graph** → an interactive canvas renders every folder and file as a force-directed node graph
4. **Select any node** → the AI panel explains what it does, what depends on it, and how it fits the architecture
5. **Ask questions** → a chat interface with full repo context answers anything about the codebase

**Tech stack:**
- Next.js 14 (App Router)
- Supabase Auth with GitHub OAuth (`@supabase/ssr`)
- GitHub REST API via Octokit
- Anthropic Claude (`claude-sonnet-4-6`) for code analysis and chat
- Canvas API (`<canvas>`) for the force-directed graph renderer
- Tailwind CSS

---

## What It Actually Does

- Fetches the full recursive file tree of any repo via GitHub's Git Trees API in a single request
- Builds a force-directed graph where folders are hub nodes and files are satellites orbiting them
- Colors nodes by programming language, matching the language dot colors developers already recognize from GitHub
- Renders everything on a `<canvas>` element — no SVG, no D3, no React re-renders on every frame
- Streams AI analysis of any selected file or folder directly from the Anthropic API
- Maintains a full chat session with repo context so you can ask follow-up questions
- Shows your own repos, collaborator repos, and organization repos in separate sections so you can always find what you're looking for

---

## Key Features

- **Language-aware coloring** — TypeScript is blue, Python is green, Go is cyan, matching GitHub's own color conventions so the graph is immediately readable
- **Single-request tree fetch** — GitHub's recursive tree endpoint returns the entire repo structure in one API call regardless of depth, no recursive pagination
- **Canvas renderer, not DOM** — the graph renders thousands of nodes at 60fps because nothing touches the DOM after the initial mount
- **`provider_token` auth** — Supabase stores the GitHub OAuth token directly in the session, so every API route just reads `session.provider_token` with no extra token storage
- **Affiliation grouping** — the dashboard separates your repos from collaboration repos so you know whose code you're looking at
- **Repo overview on load** — the overview panel surfaces language breakdown, file count, and dependency stats before you open a single file

---

## How I Built It

### The Graph Renderer: Why Canvas, Not SVG

The obvious approach is D3 force simulation with SVG. Every tutorial does it that way. The problem: a mid-size repository has 800–1,200 files. SVG at that scale creates 800–1,200 DOM nodes. Every tick of the physics simulation forces a layout recalculation. On anything less than a high-end machine it becomes a slideshow.

The fix is a `<canvas>` renderer. The physics simulation (custom spring force + repulsion) runs in a `requestAnimationFrame` loop, and every frame clears the canvas and redraws everything imperatively:

```ts
function drawFrame(ctx: CanvasRenderingContext2D, nodes: Node[], edges: Edge[]) {
  ctx.clearRect(0, 0, width, height)

  // Draw edges first (behind nodes)
  for (const edge of edges) {
    ctx.beginPath()
    ctx.moveTo(edge.source.x, edge.source.y)
    ctx.lineTo(edge.target.x, edge.target.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.stroke()
  }

  // Draw nodes
  for (const node of nodes) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.fill()
  }
}
```

No virtual DOM. No reconciliation. No layout recalculation. The canvas just paints pixels as fast as the GPU can move them.

Hit testing (knowing which node you clicked) requires manual math since the canvas has no event system:

```ts
function getNodeAtPoint(x: number, y: number, nodes: Node[]): Node | null {
  // Check in reverse order so top-rendered nodes get priority
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const dx = x - n.x, dy = y - n.y
    if (dx * dx + dy * dy <= n.r * n.r) return n
  }
  return null
}
```

Worth the extra code. The graph handles 1,000-node repos without a frame drop.

---

### GitHub Auth: `provider_token` Is the Whole Solution

The first version of Nexa used NextAuth with a GitHub provider and a custom `session.accessToken` field. Replacing that with Supabase cut out about 200 lines of auth boilerplate.

The key insight: when a user signs in via Supabase GitHub OAuth, the GitHub access token lives directly on the session:

```ts
const { data: { session } } = await supabase.auth.getSession()
const accessToken = session?.provider_token  // this is the GitHub token
```

Every API route reads this one field. No separate token storage, no database column, no JWT augmentation. The token scope is set once at sign-in time:

```ts
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    scopes: 'read:user repo',
    redirectTo: `${origin}/auth/callback`,
  },
})
```

`repo` scope covers private repos. `read:user` covers the user profile. That's everything Nexa needs.

The OAuth callback is three lines:

```ts
// app/auth/callback/route.ts
const { searchParams } = new URL(request.url)
const code = searchParams.get('code')
await supabase.auth.exchangeCodeForSession(code!)
return NextResponse.redirect(new URL('/dashboard', request.url))
```

---

### Fetching Repos: One API Call for Everything

GitHub's authenticated repo endpoint supports an `affiliation` parameter that most tutorials ignore:

```ts
const { data } = await octokit.repos.listForAuthenticatedUser({
  sort: 'updated',
  per_page: 100,
  page,
  affiliation: 'owner,collaborator,organization_member',
})
```

One parameter, three categories. The response includes every repo the user owns, every repo they're a collaborator on, and every repo in every organization they belong to. The dashboard then splits them client-side:

```ts
const myRepos     = repos.filter(r => r.affiliation === 'owner')
const collabRepos = repos.filter(r => r.affiliation !== 'owner')
```

Collaboration cards show `owner/repo-name` with the owner's avatar so you immediately know whose codebase you're jumping into.

---

### The File Tree: One Request, Any Depth

The naive approach — walking the tree recursively, one API call per folder — falls apart on large repos. A repo with 10 levels of nesting makes dozens of sequential requests.

GitHub's Git Trees API has a `recursive: '1'` parameter that solves this completely:

```ts
const { data } = await octokit.git.getTree({
  owner,
  repo,
  tree_sha: branch,
  recursive: '1',  // returns the entire tree flat
})
```

One request. Every file. No matter how deep the nesting. The response is a flat array of every path in the repo, which the graph renderer then groups into folders client-side by splitting on `/`.

The only edge case: GitHub truncates responses for repos over ~100,000 files and sets `data.truncated = true`. For those repos Nexa shows the truncation warning in the UI rather than silently showing an incomplete graph.

---

### AI Analysis: Streaming Claude Over the Repo Tree

The analysis panel streams responses from Claude with the repo's file tree as context. The system prompt is assembled server-side from the actual tree data:

```ts
const systemPrompt = `You are analyzing the GitHub repository ${owner}/${repo}.

File structure:
${treeItems.map(f => f.path).join('\n')}

Language breakdown:
${languageSummary}

Answer questions about architecture, dependencies, and code organization.
Be specific — reference actual file paths from the tree above.`
```

Giving Claude the real file tree (not a summary, the actual paths) means its answers reference `app/api/auth/callback/route.ts` instead of "the auth callback file." Specificity is the difference between useful and generic.

The response streams over the Vercel AI SDK's `StreamingTextResponse`, so the panel starts showing text within a few hundred milliseconds of the request.

---

## Lessons Learned

**The hardest bugs are coordinate system bugs.** The canvas renderer uses three coordinate systems simultaneously: screen coordinates (pixels from top-left of the viewport), canvas coordinates (pixels from top-left of the canvas element), and graph coordinates (the physics simulation's arbitrary space). Getting a click on a node to correctly identify which node was clicked required tracking pan offset, zoom scale, and device pixel ratio through every transformation. I got it wrong three times before writing out all three transforms explicitly on paper.

**Supabase's `provider_token` disappears after session refresh.** The GitHub token is available on first login but Supabase does not persist it across session refreshes. After an hour, `session.provider_token` comes back `null`. The fix is to store the token in the user's Supabase metadata or a database row on first login and read it from there on subsequent requests. This is a known issue and not documented clearly.

**GitHub OAuth's "Homepage URL" and "Authorization callback URL" are different fields.** The OAuth app settings in GitHub have two URL fields. The Authorization callback URL must be the Supabase OAuth callback (`https://<project>.supabase.co/auth/v1/callback`), not your app's URL. Putting the app URL in the wrong field produces a cryptic `redirect_uri_mismatch` error that has nothing to do with the error message.

**`overflow: hidden` on `body` will silently break page scrolling.** A starter template had `overflow: hidden` on the body for the landing page's scroll-snap behavior. The dashboard inherited it and became unscrollable with no console error, no warning, no indication of why. The fix was one CSS line. Finding it took longer than it should have because the symptom (content cuts off) looks identical to a layout height bug.

**Force-directed graphs need damping or they never settle.** The physics simulation adds spring forces and repulsion on every frame. Without a velocity damping coefficient, nodes oscillate forever — the graph never reaches a stable layout. Adding `node.vx *= 0.85` and `node.vy *= 0.85` per frame brings the simulation to rest in about 3 seconds. Too much damping and the graph snaps into place awkwardly. Too little and it bounces. 0.82–0.88 is the range that looks natural.

---

## What's Next

Nexa is live and the core explore loop works end-to-end. What I'm building next:

- **Symbol-level graph** — go deeper than files, show function calls and import relationships as edges
- **Diff view** — compare two branches or commits as graph changes, see what moved and what broke
- **Team onboarding packs** — generate a curated "start here" guide from the graph for new contributors
- **PR impact preview** — before merging, see which nodes in the graph your PR touches and what depends on them

The core insight hasn't changed: reading code in a file tree is like reading a city by looking at individual addresses. The graph is the map. Once you have the map, everything else is navigation.

Built with Next.js 14, Supabase, GitHub API, Anthropic Claude, and the browser's native Canvas API.

— Arish Singh
