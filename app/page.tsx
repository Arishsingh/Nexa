"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Palette
const C = {
  bg: "#0a0a09",
  bg2: "#0d0d0c",
  panel: "#121210",
  border: "#1f1e1b",
  border2: "#2b2a26",
  text: "#f2f1ee",
  muted: "#a3a29e",
  faint: "#6e6d68",
  cream: "#ece4d3",
  creamFg: "#171510",
};

// ── Shared bits ────────────────────────────────────────────────────────────

function NexaMark({
  size = 30,
  color = C.text,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      stroke={color}
      strokeWidth="2.6"
    >
      <circle cx="17" cy="17" r="13.5" />
      <line x1="3.5" y1="17" x2="30.5" y2="17" />
    </svg>
  );
}

function ArrowRight({ color = "currentColor" }: { color?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
    >
      <path
        d="M2.5 8h11M9.5 4l4 4-4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Numbered left rail + section wrapper
function Section({
  num,
  label,
  id,
  children,
  first = false,
  bg = C.bg,
  seam = true,
}: {
  num: string;
  label: string;
  id?: string;
  children: React.ReactNode;
  first?: boolean;
  bg?: string;
  seam?: boolean;
}) {
  return (
    <section
      id={id}
      className="flex"
      style={{
        background: bg,
        borderTop: first || !seam ? "none" : `1px solid ${C.border}`,
        minHeight: "100vh",
        scrollSnapAlign: "start",
      }}
    >
      {/* Content — fills the full viewport height */}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </section>
  );
}

// ── Trusted-by logos (simplified marks) ────────────────────────────────────

// ── Section 02: workspace screenshot mock ──────────────────────────────────

const TREE: { t: string; d: number; c?: string }[] = [
  { t: "public / github.com", d: 0, c: "#a3a29e" },
  { t: "app", d: 0, c: "#e8a05c" },
  { t: "(routes)", d: 1 },
  { t: "page.tsx", d: 2 },
  { t: "layout.tsx", d: 2 },
  { t: "loading.tsx", d: 2 },
  { t: "not-found.tsx", d: 2 },
  { t: "api", d: 1, c: "#e8a05c" },
  { t: "components", d: 0, c: "#e8a05c" },
  { t: "ui", d: 1, c: "#e8a05c" },
  { t: "button.tsx", d: 2 },
  { t: "card.tsx", d: 2 },
  { t: "input.tsx", d: 2 },
  { t: "navbar.tsx", d: 2 },
  { t: "sections", d: 1, c: "#e8a05c" },
  { t: "hero.tsx", d: 2 },
  { t: "features.tsx", d: 2 },
  { t: "pricing.tsx", d: 2 },
  { t: "hooks", d: 0, c: "#e8a05c" },
  { t: "useAuth.ts", d: 1 },
  { t: "useTheme.ts", d: 1 },
  { t: "lib", d: 0, c: "#e8a05c" },
  { t: "api.ts", d: 1 },
  { t: "utils.ts", d: 1 },
  { t: "constants.ts", d: 1 },
  { t: "validation.ts", d: 1 },
];

interface MNode {
  x: number;
  y: number;
  label: string;
  c: string;
  r?: number;
}

const MODULES: Record<string, MNode> = {
  frontend: { x: 320, y: 195, label: "Frontend", c: "#f2f1ee", r: 17 },
  auth: { x: 175, y: 130, label: "Authentication", c: "#4ade80", r: 14 },
  ui: { x: 300, y: 75, label: "UI Components", c: "#a78bfa", r: 14 },
  data: { x: 455, y: 105, label: "Data Layer", c: "#22d3ee", r: 14 },
  pay: { x: 175, y: 280, label: "Payments", c: "#facc15", r: 13 },
  prod: { x: 320, y: 320, label: "Products", c: "#f87171", r: 13 },
  notif: { x: 470, y: 270, label: "Notifications", c: "#2dd4bf", r: 13 },
};

const SATS: { m: keyof typeof MODULES; t: string; a: number; d: number }[] = [
  { m: "auth", t: "useAuth.ts", a: 200, d: 62 },
  { m: "auth", t: "auth.service.ts", a: 155, d: 70 },
  { m: "auth", t: "login.ts", a: 245, d: 58 },
  { m: "auth", t: "middleware.ts", a: 285, d: 64 },
  { m: "ui", t: "button.tsx", a: 130, d: 56 },
  { m: "ui", t: "card.tsx", a: 65, d: 60 },
  { m: "ui", t: "input.tsx", a: 175, d: 62 },
  { m: "ui", t: "navbar.tsx", a: 20, d: 64 },
  { m: "data", t: "api.ts", a: 305, d: 55 },
  { m: "data", t: "db.ts", a: 0, d: 60 },
  { m: "data", t: "queries.ts", a: 35, d: 62 },
  { m: "data", t: "mutations.ts", a: 65, d: 66 },
  { m: "data", t: "types.ts", a: 100, d: 58 },
  { m: "pay", t: "checkout.tsx", a: 230, d: 58 },
  { m: "pay", t: "stripe.ts", a: 185, d: 60 },
  { m: "pay", t: "billing.ts", a: 140, d: 56 },
  { m: "pay", t: "plans.ts", a: 110, d: 62 },
  { m: "prod", t: "product.tsx", a: 215, d: 56 },
  { m: "prod", t: "product-card.tsx", a: 330, d: 64 },
  { m: "prod", t: "useProducts.ts", a: 255, d: 60 },
  { m: "prod", t: "types.ts", a: 290, d: 52 },
  { m: "notif", t: "toast.tsx", a: 55, d: 56 },
  { m: "notif", t: "email.ts", a: 0, d: 60 },
  { m: "notif", t: "push.ts", a: 320, d: 56 },
  { m: "notif", t: "inbox.ts", a: 270, d: 54 },
];

const EDGES: {
  from: keyof typeof MODULES;
  to: keyof typeof MODULES;
  label: string;
}[] = [
  { from: "ui", to: "frontend", label: "uses" },
  { from: "auth", to: "frontend", label: "provides auth" },
  { from: "data", to: "frontend", label: "provides data" },
  { from: "pay", to: "frontend", label: "processes" },
  { from: "prod", to: "frontend", label: "displays" },
  { from: "notif", to: "frontend", label: "triggers" },
];

function GraphMock() {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 620 390"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
    >
      {/* edges */}
      {EDGES.map((e) => {
        const a = MODULES[e.from],
          b = MODULES[e.to];
        const mx = (a.x + b.x) / 2,
          my = (a.y + b.y) / 2;
        return (
          <g key={e.label}>
            <path
              d={`M${a.x} ${a.y} Q ${mx + (b.y - a.y) * 0.18} ${my - (b.x - a.x) * 0.18} ${b.x} ${b.y}`}
              stroke={a.c}
              strokeOpacity="0.45"
              strokeWidth="1.1"
              strokeDasharray="4 3"
            />
            <text
              x={mx + (b.y - a.y) * 0.14}
              y={my - (b.x - a.x) * 0.14 - 4}
              textAnchor="middle"
              fontSize="8.5"
              fill={C.faint}
            >
              {e.label}
            </text>
          </g>
        );
      })}

      {/* satellites */}
      {SATS.map((s, i) => {
        const m = MODULES[s.m];
        const rad = (s.a * Math.PI) / 180;
        const x = m.x + Math.cos(rad) * s.d,
          y = m.y + Math.sin(rad) * s.d * 0.8;
        return (
          <g key={i}>
            <line
              x1={m.x}
              y1={m.y}
              x2={x}
              y2={y}
              stroke={m.c}
              strokeOpacity="0.22"
              strokeWidth="0.8"
            />
            <circle
              cx={x}
              cy={y}
              r="5.5"
              fill={C.panel}
              stroke={m.c}
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <circle cx={x} cy={y} r="1.6" fill={m.c} fillOpacity="0.8" />
            <text x={x + 9} y={y + 3} fontSize="8" fill={C.faint}>
              {s.t}
            </text>
          </g>
        );
      })}

      {/* module nodes */}
      {Object.entries(MODULES).map(([k, m]) => (
        <g key={k}>
          <circle
            cx={m.x}
            cy={m.y}
            r={m.r}
            fill={C.bg}
            stroke={m.c}
            strokeOpacity={k === "frontend" ? 1 : 0.85}
            strokeWidth="1.5"
          />
          <rect
            x={m.x - 5}
            y={m.y - 4.5}
            width="10"
            height="9"
            rx="2"
            fill={k === "frontend" ? C.text : m.c}
          />
          <text
            x={m.x}
            y={m.y + m.r! + 13}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            fill={m.c}
          >
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function WorkspaceShot() {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: C.border2,
        background: C.bg2,
        boxShadow: "0 40px 110px rgba(0,0,0,0.6)",
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 42, borderBottom: `1px solid ${C.border}` }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px]"
          style={{
            background: C.panel,
            color: C.muted,
            border: `1px solid ${C.border}`,
          }}
        >
          <svg
            width="9"
            height="9"
            viewBox="0 0 16 16"
            fill="none"
            stroke={C.faint}
            strokeWidth="2"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          Search nodes, files, symbols...
        </div>
        <div className="flex-1" />
        {["INTERFACE", "ENUM", "CLASS", "TABLE"].map((t) => (
          <span
            key={t}
            className="px-1.5 py-0.5 rounded text-[8px] font-semibold"
            style={{
              background: C.panel,
              color: C.faint,
              border: `1px solid ${C.border}`,
            }}
          >
            {t}
          </span>
        ))}
        <div className="flex items-center gap-2 ml-2 text-[9.5px] font-semibold">
          <span
            style={{
              color: C.text,
              borderBottom: `1.5px solid ${C.cream}`,
              paddingBottom: 2,
            }}
          >
            OVERVIEW
          </span>
          <span style={{ color: C.faint }}>AI INSIGHTS</span>
        </div>
      </div>

      <div className="flex" style={{ height: 400 }}>
        {/* File tree */}
        <div
          className="hidden sm:block shrink-0 py-2.5 px-3 overflow-hidden"
          style={{ width: 148, borderRight: `1px solid ${C.border}` }}
        >
          {TREE.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5"
              style={{ paddingLeft: r.d * 10, height: 14.5 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-[2px] shrink-0"
                style={{
                  background: r.c ?? "transparent",
                  border: r.c ? "none" : `1px solid ${C.border2}`,
                }}
              />
              <span
                className="truncate"
                style={{ fontSize: 9, color: r.c ? C.muted : C.faint }}
              >
                {r.t}
              </span>
            </div>
          ))}
        </div>

        {/* Graph */}
        <div
          className="relative flex-1 min-w-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(242,241,238,0.045) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <GraphMock />
          {/* zoom controls */}
          <div
            className="absolute right-3 bottom-10 flex flex-col rounded-md border overflow-hidden"
            style={{ borderColor: C.border2, background: C.panel }}
          >
            {["+", "○", "−"].map((s) => (
              <span
                key={s}
                className="w-6 h-6 flex items-center justify-center text-[11px]"
                style={{ color: C.muted }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Overview panel */}
        <div
          className="hidden lg:block shrink-0 py-3 px-3.5 overflow-hidden"
          style={{ width: 175, borderLeft: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-3.5 h-3 rounded-[2px]"
              style={{ background: "#e8a05c" }}
            />
            <span className="text-[11px] font-bold" style={{ color: C.text }}>
              Frontend
            </span>
            <span
              className="text-[7.5px] px-1 py-0.5 rounded"
              style={{
                background: C.panel,
                color: C.faint,
                border: `1px solid ${C.border}`,
              }}
            >
              Module
            </span>
          </div>
          <p
            className="text-[8.5px] font-semibold mb-1"
            style={{ color: C.muted }}
          >
            Description
          </p>
          <p
            className="text-[8.5px] leading-[1.5] mb-2.5"
            style={{ color: C.faint }}
          >
            Main frontend application built with Next.js 14 using App Router and
            TypeScript.
          </p>
          <p
            className="text-[8.5px] font-semibold mb-1"
            style={{ color: C.muted }}
          >
            Depends On
          </p>
          {[
            ["UI Components", "#a78bfa"],
            ["Authentication", "#4ade80"],
            ["Data Layer", "#22d3ee"],
            ["Payments", "#facc15"],
            ["... 2 more", C.faint],
          ].map(([t, c]) => (
            <div
              key={t}
              className="flex items-center gap-1.5"
              style={{ height: 13 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: c === C.faint ? "transparent" : (c as string),
                }}
              />
              <span style={{ fontSize: 8.5, color: c as string }}>{t}</span>
            </div>
          ))}
          <p
            className="text-[8.5px] font-semibold mb-1 mt-2"
            style={{ color: C.muted }}
          >
            Used By
          </p>
          {[
            ["Products", "#f87171"],
            ["Notifications", "#2dd4bf"],
            ["... 1 more", C.faint],
          ].map(([t, c]) => (
            <div
              key={t}
              className="flex items-center gap-1.5"
              style={{ height: 13 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: c === C.faint ? "transparent" : (c as string),
                }}
              />
              <span style={{ fontSize: 8.5, color: c as string }}>{t}</span>
            </div>
          ))}
          <p
            className="text-[8.5px] font-semibold mb-1 mt-2"
            style={{ color: C.muted }}
          >
            Metrics
          </p>
          {[
            ["Files", "24"],
            ["Functions", "68"],
            ["Components", "32"],
            ["Lines of Code", "4,832"],
            ["Test Coverage", "72%"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between"
              style={{ height: 13.5 }}
            >
              <span style={{ fontSize: 8.5, color: C.faint }}>{k}</span>
              <span style={{ fontSize: 8.5, color: C.text, fontWeight: 600 }}>
                {v}
              </span>
            </div>
          ))}
          <div
            className="h-[3px] rounded-full mt-0.5"
            style={{ background: C.border }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: "72%", background: "#4ade80" }}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 34, borderTop: `1px solid ${C.border}` }}
      >
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px]"
          style={{
            background: C.panel,
            color: C.muted,
            border: `1px solid ${C.border}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80" }}
          />
          Schema synced
        </span>
        <span
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px]"
          style={{
            background: C.panel,
            color: C.muted,
            border: `1px solid ${C.border}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#4ade80" }}
          />
          8 modules&nbsp;&nbsp;·&nbsp;&nbsp;48 files&nbsp;&nbsp;·&nbsp;&nbsp;126
          relations
        </span>
      </div>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Product", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "story", href: "#get-started" },
  { label: "Blog", href: "#get-started" },
  { label: "Changelog", href: "#get-started" },
];

const FEATURES = [
  {
    title: "Interactive Graph",
    desc: "Visualize your entire codebase and understand how everything connects.",
    icon: (
      <>
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="16" cy="6" r="2.2" />
        <circle cx="6" cy="16" r="2.2" />
        <circle cx="16" cy="16" r="2.2" />
        <path d="M8.2 6h5.6M6 8.2v5.6M16 8.2v5.6M8.2 16h5.6" />
      </>
    ),
  },
  {
    title: "AI Insights",
    desc: "Get intelligent summaries, key insights, and documentation instantly.",
    icon: (
      <>
        <circle cx="7" cy="7" r="1.6" />
        <circle cx="15" cy="5" r="1.6" />
        <circle cx="11" cy="11" r="1.6" />
        <circle cx="6" cy="15" r="1.6" />
        <circle cx="16" cy="15" r="1.6" />
        <path d="M8.3 8L10 10M12.3 10l1.8-3.6M9.8 12.2l-2.6 1.9M12.4 12l2.5 2" />
      </>
    ),
  },
  {
    title: "Smart Search",
    desc: "Find anything in your codebase with natural language search.",
    icon: (
      <>
        <circle cx="9.5" cy="9.5" r="5.5" />
        <path d="M13.8 13.8L18.5 18.5" />
      </>
    ),
  },
  {
    title: "Onboarding Made Easy",
    desc: "Help your team get up to speed in minutes, not weeks.",
    icon: (
      <>
        <circle cx="8" cy="7" r="2.6" />
        <path d="M3.5 16.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
        <circle cx="15.5" cy="8" r="2" />
        <path d="M14 12.5c2.4 0 4.3 1.7 4.5 4" />
      </>
    ),
  },
];

const STEPS = [
  {
    n: "1. Connect",
    title: "Connect",
    time: "~10 sec",
    desc: "Connect your GitHub repository in just a few clicks.",
    icon: (
      <path
        d="M11 1.7C5.8 1.7 1.6 5.9 1.6 11c0 4.1 2.7 7.6 6.4 8.9.5.1.6-.2.6-.5v-1.7c-2.6.6-3.2-1.2-3.2-1.2-.4-1-1-1.3-1-1.3-.9-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .9 1.4 2.2 1 2.8.8.1-.6.3-1 .6-1.3-2.1-.2-4.3-1-4.3-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.2.1-2.5 0 0 .8-.3 2.6 1 .7-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c1.8-1.2 2.6-1 2.6-1 .5 1.3.2 2.2.1 2.5.6.7 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.3.3.6.9.6 1.7v2.6c0 .2.2.5.6.5 3.7-1.2 6.4-4.7 6.4-8.9 0-5.1-4.2-9.3-9.4-9.3z"
        fill={C.cream}
        stroke="none"
      />
    ),
  },
  {
    n: "2. Analyze",
    title: "Analyze",
    time: "~30 sec",
    desc: "We analyze your codebase and build the graph.",
    icon: (
      <>
        <rect x="4" y="4" width="14" height="14" rx="2.5" />
        <circle cx="11" cy="11" r="2.2" />
        <path d="M11 4v3M11 15v3M4 11h3M15 11h3" />
      </>
    ),
  },
  {
    n: "3. Build Graph",
    title: "Build Graph",
    time: "instant",
    desc: "We create a deep map of architecture and relationships.",
    icon: (
      <>
        <circle cx="7" cy="7" r="1.7" />
        <circle cx="15" cy="5" r="1.7" />
        <circle cx="11" cy="11.5" r="1.7" />
        <circle cx="6" cy="15.5" r="1.7" />
        <circle cx="16" cy="15" r="1.7" />
        <path d="M8.4 7.8l1.5 2.2M12.4 10.3l1.8-3.7M9.9 12.8l-2.7 1.8M12.5 12.5l2.4 1.8" />
      </>
    ),
  },
  {
    n: "4. Explore & Ask",
    title: "Explore & Ask",
    time: "∞ questions",
    desc: "Explore, search, and get AI answers about any part of your code.",
    icon: (
      <>
        <circle cx="9.5" cy="9.5" r="5.5" />
        <path d="M13.8 13.8L18.5 18.5" />
      </>
    ),
  },
];

const STATS = [
  {
    label: "Repositories analyzed",
    value: "1,247",
    icon: (
      <path d="M2.5 5.5a1.5 1.5 0 011.5-1.5h4l2 2h7.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H4a1.5 1.5 0 01-1.5-1.5v-11z" />
    ),
  },
  {
    label: "Files mapped",
    value: "2.4M",
    icon: (
      <>
        <path d="M12.5 2.5H6a1.5 1.5 0 00-1.5 1.5v14A1.5 1.5 0 006 19.5h10a1.5 1.5 0 001.5-1.5V7.5l-5-5z" />
        <path d="M12.5 2.5v5h5" />
      </>
    ),
  },
  {
    label: "Dependencies traced",
    value: "18M",
    icon: (
      <>
        <circle cx="6.5" cy="6.5" r="2.2" />
        <circle cx="15.5" cy="6.5" r="2.2" />
        <circle cx="11" cy="15.5" r="2.2" />
        <path d="M8.7 6.5h4.6M7.6 8.5l2.3 4.8M14.4 8.5l-2.3 4.8" />
      </>
    ),
  },
  {
    label: "AI insights generated",
    value: "650K",
    icon: (
      <path d="M11 2.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8 1.8-5zM17.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" />
    ),
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/dashboard");
  }, [session, router]);

  // Fade-up reveal as each slide scrolls into view
  useEffect(() => {
    if (status === "loading") return;
    const els = Array.from(document.querySelectorAll("[data-reveal]"));

    // Anything already on screen shows immediately
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("is-visible");
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }
      },
      // Fire as soon as any part of the slide content enters the viewport
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => {
      if (!el.classList.contains("is-visible")) obs.observe(el);
    });

    // Belt-and-suspenders: periodically reveal anything that reached the
    // viewport without the observer noticing (e.g. fast snap scrolling)
    const failsafe = window.setInterval(() => {
      const pending = els.filter((el) => !el.classList.contains("is-visible"));
      if (pending.length === 0) {
        window.clearInterval(failsafe);
        return;
      }
      const h = window.innerHeight;
      for (const el of pending) {
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.95 && r.bottom > 0) el.classList.add("is-visible");
      }
    }, 600);

    return () => {
      window.clearInterval(failsafe);
      obs.disconnect();
    };
  }, [status]);

  const start = () => signIn("github", { callbackUrl: "/dashboard" });

  if (status === "loading")
    return <main className="min-h-screen" style={{ background: C.bg }} />;

  return (
    <main
      className="h-screen overflow-y-auto overflow-x-hidden select-none"
      style={{
        background: C.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        scrollBehavior: "smooth",
        scrollSnapType: "y proximity",
      }}
    >
      {/* ════ 01 · Home — full-bleed hero ═══════════════════════════════ */}
      <Section num="01" label="Home" id="home" first>
        <div
          className="relative flex-1 flex flex-col overflow-hidden"
          style={{ background: "#060606" }}
        >
          {/* Full-bleed artwork */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/hero.png)",
                backgroundSize: "cover",
                backgroundPosition: "center right",
              }}
            />
            {/* Left darkening for text legibility */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.55) 28%, rgba(5,5,5,0.15) 52%, transparent 72%)",
              }}
            />
            {/* Top fade behind the nav */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,5,5,0.5) 0%, transparent 16%)",
              }}
            />
            {/* Bottom-left emphasis for the copy */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(5,5,5,0.55) 0%, transparent 38%)",
              }}
            />
            {/* Dissolve into the next section — no hard edge between slides */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                height: 220,
                background: `linear-gradient(180deg, transparent 0%, rgba(10,10,9,0.6) 55%, ${C.bg} 100%)`,
              }}
            />
          </div>

          {/* Nav — full width */}
          <header
            className="relative z-10 flex items-center px-9"
            style={{ height: 80 }}
          >
            <div className="flex items-center gap-2.5 shrink-0">
              <NexaMark size={28} />
              <span
                className="text-[20px] font-semibold tracking-tight"
                style={{ color: C.text }}
              >
                Nexa
              </span>
            </div>

            <nav className="flex-1 flex items-center justify-center gap-9">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-[13.5px] transition-colors hover:text-[#f2f1ee]"
                  style={{ color: C.muted }}
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-5 shrink-0">
              <button
                onClick={start}
                className="text-[13.5px] transition-colors hover:text-white"
                style={{ color: "#d9d5cc" }}
              >
                Sign in
              </button>
              <button
                onClick={start}
                className="flex items-center gap-2 px-4 rounded-lg text-[13.5px] font-medium transition-transform hover:scale-[1.02]"
                style={{ height: 40, background: C.text, color: C.creamFg }}
              >
                Analyze Repository
                <ArrowRight color={C.creamFg} />
              </button>
            </div>
          </header>

          {/* Copy — bottom-left */}
          <div
            className="relative z-10 mt-auto px-9"
            style={{ paddingBottom: 52, maxWidth: 620 }}
          >
            <h1
              className="font-medium leading-[1.06] tracking-[-0.02em]"
              style={{ fontSize: "clamp(34px, 3.6vw, 52px)", color: C.text }}
            >
              Understand any
              <br />
              codebase.
            </h1>
            <p
              className="font-medium leading-[1.1] tracking-[-0.02em] mt-1"
              style={{ fontSize: "clamp(26px, 2.8vw, 40px)", color: "#5b5953" }}
            >
              In minutes, not days.
            </p>

            <p
              className="mt-6 text-[14px] leading-[1.75]"
              style={{ color: C.muted, maxWidth: 330 }}
            >
              Visualize architecture, dependencies, and core concepts of any
              repository. Get AI insights, trace relationships, and accelerate
              onboarding.
            </p>

            <div className="flex items-center gap-3 mt-7">
              <button
                onClick={start}
                className="flex items-center gap-2 px-4 rounded-lg text-[13.5px] font-semibold transition-transform hover:scale-[1.02]"
                style={{
                  height: 44,
                  background: C.cream,
                  color: C.creamFg,
                  boxShadow: "0 6px 26px rgba(236,228,211,0.16)",
                }}
              >
                Analyze Repository
                <ArrowRight color={C.creamFg} />
              </button>
              <button
                onClick={start}
                className="flex items-center gap-2.5 px-4 rounded-lg text-[13.5px] font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                style={{
                  height: 44,
                  color: C.text,
                  border: "1px solid rgba(242,241,238,0.25)",
                  background: "rgba(10,10,9,0.35)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill={C.text}>
                  <path d="M3 1.8v10.4L12 7 3 1.8z" />
                </svg>
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ════ 02 · Features ═══════════════════════════════════════════════ */}
      <Section num="02" label="Features" id="features" seam={false}>
        <div
          data-reveal
          className="flex-1 flex flex-col justify-center mx-auto w-full px-12"
          style={{ maxWidth: 1240, paddingTop: 56, paddingBottom: 56 }}
        >
          <p
            className="text-[11.5px] font-semibold tracking-[0.18em] uppercase mb-3"
            style={{ color: C.faint }}
          >
            Powerful features
          </p>
          <h2
            className="font-medium tracking-[-0.015em] leading-[1.2] mb-12"
            style={{
              fontSize: "clamp(24px, 2.4vw, 33px)",
              color: C.text,
              maxWidth: 420,
            }}
          >
            Everything you need to understand and ship faster
          </h2>

          <div className="flex gap-12 flex-wrap lg:flex-nowrap">
            {/* Feature list */}
            <div
              className="flex flex-col gap-9 shrink-0"
              style={{ width: 280 }}
            >
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div
                    className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                    style={{ borderColor: C.border2, background: C.panel }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 22 22"
                      fill="none"
                      stroke={C.text}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {f.icon}
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-[14.5px] font-semibold mb-1.5"
                      style={{ color: C.text }}
                    >
                      {f.title}
                    </p>
                    <p
                      className="text-[12.5px] leading-[1.65]"
                      style={{ color: C.faint }}
                    >
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Screenshot */}
            <div className="flex-1 min-w-0">
              <WorkspaceShot />
            </div>
          </div>
        </div>
      </Section>

      {/* ════ 03 · How it works ═══════════════════════════════════════════ */}
      <Section num="03" label="How it works" id="how">
        <div
          data-reveal
          className="flex-1 flex flex-col justify-center mx-auto w-full px-12"
          style={{ maxWidth: 1240, paddingTop: 56, paddingBottom: 56 }}
        >
          <p
            className="text-[11.5px] font-semibold tracking-[0.18em] uppercase mb-3"
            style={{ color: C.faint }}
          >
            Simple process
          </p>
          <h2
            className="font-medium tracking-[-0.015em] leading-[1.25]"
            style={{
              fontSize: "clamp(24px, 2.4vw, 33px)",
              color: C.text,
              maxWidth: 420,
            }}
          >
            From any repository
            <br />
            to complete understanding
          </h2>

          <div className="flex gap-14 mt-14 flex-wrap xl:flex-nowrap items-start">
            {/* Steps */}
            <div className="flex-1 flex gap-2 flex-wrap sm:flex-nowrap min-w-0">
              {STEPS.map((s, i) => (
                <div
                  key={s.n}
                  className="flex items-start gap-2 flex-1 min-w-[150px] group"
                >
                  <div className="flex flex-col" style={{ maxWidth: 170 }}>
                    {/* Icon circle with number badge */}
                    <div
                      className="relative mb-6"
                      style={{ width: 76, height: 76 }}
                    >
                      <div
                        className="w-full h-full rounded-full border flex items-center justify-center transition-all duration-300 group-hover:scale-[1.04]"
                        style={{
                          borderColor: C.border2,
                          background:
                            "radial-gradient(ellipse 70% 70% at 35% 30%, rgba(236,228,211,0.06), transparent 70%), " +
                            C.panel,
                        }}
                      >
                        <svg
                          width="27"
                          height="27"
                          viewBox="0 0 22 22"
                          fill="none"
                          stroke={C.cream}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {s.icon}
                        </svg>
                      </div>
                      <span
                        className="absolute flex items-center justify-center rounded-full text-[11px] font-bold"
                        style={{
                          width: 22,
                          height: 22,
                          top: -2,
                          right: -2,
                          background: C.cream,
                          color: C.creamFg,
                        }}
                      >
                        {i + 1}
                      </span>
                    </div>

                    <p
                      className="text-[15px] font-semibold mb-2"
                      style={{ color: C.text }}
                    >
                      {s.title}
                    </p>
                    <p
                      className="text-[12.5px] leading-[1.65] mb-3"
                      style={{ color: C.faint }}
                    >
                      {s.desc}
                    </p>
                    <span
                      className="self-start px-2 py-0.5 rounded-md text-[10.5px] font-medium"
                      style={{
                        background: "rgba(236,228,211,0.07)",
                        color: C.muted,
                        border: "1px solid rgba(236,228,211,0.12)",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      {s.time}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="hidden sm:flex items-center shrink-0"
                      style={{ height: 76 }}
                    >
                      <svg
                        width="52"
                        height="10"
                        viewBox="0 0 56 10"
                        fill="none"
                        stroke={C.border2}
                        strokeWidth="1.4"
                      >
                        <path d="M1 5h46" strokeDasharray="3 4" />
                        <path
                          d="M46 1.5L51.5 5 46 8.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Stats card */}
            <div
              className="rounded-2xl border shrink-0 self-start overflow-hidden"
              style={{ borderColor: C.border, background: C.bg2, width: 310 }}
            >
              <div
                className="flex items-center gap-2.5 px-6"
                style={{ height: 46, borderBottom: `1px solid ${C.border}` }}
              >
                <span className="relative flex w-2 h-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: "#4ade80" }}
                  />
                  <span
                    className="relative inline-flex rounded-full w-2 h-2"
                    style={{ background: "#4ade80" }}
                  />
                </span>
                <span
                  className="text-[12px] font-semibold tracking-wide"
                  style={{ color: C.muted }}
                >
                  LIVE ACROSS NEXA
                </span>
              </div>
              <div className="flex flex-col px-6 py-2">
                {STATS.map((st, i) => (
                  <div
                    key={st.label}
                    className="flex items-center gap-4 py-4"
                    style={{
                      borderBottom:
                        i < STATS.length - 1 ? `1px solid ${C.border}` : "none",
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0"
                      style={{ borderColor: C.border2, background: C.panel }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 22 22"
                        fill="none"
                        stroke={C.cream}
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {st.icon}
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-[12px] mb-0.5"
                        style={{ color: C.faint }}
                      >
                        {st.label}
                      </p>
                      <p
                        className="text-[20px] font-semibold leading-none"
                        style={{ color: C.text }}
                      >
                        {st.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Terminal strip — fills the lower band */}
          <div
            className="flex items-center gap-3 mt-14 px-5 rounded-xl border overflow-hidden"
            style={{
              height: 52,
              borderColor: C.border,
              background: C.bg2,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            <span className="text-[12.5px] shrink-0" style={{ color: C.faint }}>
              $
            </span>
            <span className="text-[12.5px] truncate" style={{ color: C.muted }}>
              nexa analyze acme/storefront
            </span>
            <span
              className="text-[12.5px] truncate hidden md:inline"
              style={{ color: C.faint }}
            >
              — 1,032 files mapped · 4,218 relations traced · health 87/100
            </span>
            <span
              className="ml-auto flex items-center gap-1.5 text-[12.5px] shrink-0"
              style={{ color: "#4ade80" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2"
              >
                <path
                  d="M3 8.5l3.5 3.5L13 5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              done in 47s
            </span>
          </div>
        </div>
      </Section>

      {/* ════ 04 · Story ══════════════════════════════════════════════════ */}
      <Section num="04" label="Story" id="story">
        <div
          data-reveal
          className="flex-1 flex items-center mx-auto w-full px-12"
          style={{ maxWidth: 1240, paddingTop: 56, paddingBottom: 56 }}
        >
          <div className="flex items-center gap-16 w-full flex-wrap lg:flex-nowrap">
            {/* Left — the story */}
            <div className="flex-1 min-w-0" style={{ maxWidth: 580 }}>
              <p
                className="text-[11.5px] font-semibold tracking-[0.18em] uppercase mb-3"
                style={{ color: C.cream }}
              >
                Story
              </p>
              <h2
                className="font-medium tracking-[-0.015em] leading-[1.2] mb-9"
                style={{ fontSize: "clamp(24px, 2.4vw, 33px)", color: C.text }}
              >
                Why I built this
              </h2>

              <div
                className="flex flex-col gap-6 pl-6"
                style={{ borderLeft: `2px solid rgba(236,228,211,0.25)` }}
              >
                <p
                  className="text-[15px] leading-[1.8]"
                  style={{ color: C.muted }}
                >
                  Everytime a developer join a company they spends weeks in
                  understanding the internal infrastructure of the company so
                  Every new repository started the same way - clone it, open the
                  folder tree, and spend the first week just figuring out where
                  things live. The architecture was in there somewhere, buried
                  across hundreds of files and one outdated README. Every single
                  time.
                </p>
                <p
                  className="text-[15px] leading-[1.8]"
                  style={{ color: C.muted }}
                >
                  So I built Nexa. Connect a repository and it becomes a living
                  map — folders, files, and functions you can actually see.
                  Search any function and watch it light up everywhere it&apos;s
                  used. Click anything and the AI tells you what it does, what
                  depends on it, and what breaks if you touch it.
                </p>
                <p
                  className="text-[15px] leading-[1.8]"
                  style={{ color: C.muted }}
                >
                  The understanding that used to take weeks of onboarding now
                  takes the first hour.
                </p>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4 mt-8 pl-6">
                <a
                  href="#get-started"
                  className="inline-flex items-center gap-2 text-[14px] font-medium underline underline-offset-4 transition-colors"
                  style={{ color: C.cream }}
                >
                  wanna know how i made it ?? →
                </a>
                <p className="text-[13.5px] italic" style={{ color: C.faint }}>
                  — Arish, creator of Nexa
                </p>
              </div>
            </div>

            {/* Right — the build, as a git log */}
            <div
              className="relative flex-1 min-w-0 hidden lg:block"
              style={{ maxWidth: 460 }}
            >
              {/* warm glow behind the card */}
              <div
                className="absolute pointer-events-none"
                aria-hidden
                style={{
                  inset: -80,
                  background:
                    "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(236,228,211,0.07) 0%, transparent 70%)",
                }}
              />
              <div
                className="relative rounded-xl border overflow-hidden"
                style={{
                  borderColor: C.border2,
                  background: C.bg2,
                  boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
                }}
              >
                {/* terminal bar */}
                <div
                  className="flex items-center gap-2 px-4"
                  style={{ height: 38, borderBottom: `1px solid ${C.border}` }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "#3a382f" }}
                    />
                  ))}
                  <span
                    className="mx-auto text-[11px]"
                    style={{
                      color: C.faint,
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    ~/nexa
                  </span>
                </div>

                {/* git log */}
                <div
                  className="px-5 py-5 flex flex-col gap-3.5"
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  <p className="text-[12px]" style={{ color: C.faint }}>
                    $ git log --oneline
                  </p>
                  {[
                    [
                      "e7a21f0",
                      "init: cloned a repo I couldn't read. again.",
                      "#6e6d68",
                    ],
                    [
                      "b3d94c2",
                      "feat: canvas graph — folders become a map",
                      "#e8a05c",
                    ],
                    [
                      "a19f7e4",
                      "feat: function search lights up call sites",
                      "#a78bfa",
                    ],
                    [
                      "c52d8b1",
                      "feat: gemini explains any file on click",
                      "#4ade80",
                    ],
                    [
                      "f8e3a90",
                      "feat: repo health score + risk radar",
                      "#22d3ee",
                    ],
                    [
                      "d04b6c7",
                      "ship: nexa v1 — weeks of onboarding → 1 hour",
                      "#ece4d3",
                    ],
                  ].map(([hash, msg, color]) => (
                    <div key={hash} className="flex items-start gap-3">
                      <span
                        className="text-[12px] shrink-0"
                        style={{ color: "#8a7d5c" }}
                      >
                        {hash}
                      </span>
                      <span
                        className="text-[12px] leading-[1.6]"
                        style={{ color: color as string }}
                      >
                        {msg}
                      </span>
                    </div>
                  ))}
                  <p className="text-[12px] mt-1" style={{ color: C.faint }}>
                    ${" "}
                    <span className="animate-pulse" style={{ color: C.cream }}>
                      ▍
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ════ 05 · Get started ════════════════════════════════════════════ */}
      <Section num="05" label="Get started" id="get-started" bg={C.bg2}>
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Full-slide backdrop — the hero scene returns, heavily dimmed */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/hero.png)",
                backgroundSize: "cover",
                backgroundPosition: "center 62%",
              }}
            />
            {/* Dark wash, opening up slightly toward the footer */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(6,6,6,0.97) 0%, rgba(6,6,6,0.93) 45%, rgba(6,6,6,0.8) 75%, rgba(6,6,6,0.66) 100%)",
              }}
            />
            {/* Warm glow behind the CTA */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "30%",
                width: 760,
                height: 520,
                transform: "translate(-50%, -50%)",
                background:
                  "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(236,228,211,0.10) 0%, rgba(236,228,211,0.04) 45%, transparent 70%)",
              }}
            />
            {/* Faint dot grid, like the workspace canvas */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(242,241,238,0.05) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
                maskImage:
                  "radial-gradient(ellipse 55% 55% at 50% 38%, black 30%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 55% 55% at 50% 38%, black 30%, transparent 75%)",
              }}
            />
          </div>

          {/* CTA */}
          <div
            data-reveal
            className="relative flex-1 flex flex-col items-center justify-center mx-auto w-full px-12 text-center"
            style={{ maxWidth: 1240, paddingTop: 60, paddingBottom: 40 }}
          >
            <NexaMark size={38} color={C.cream} />
            <p
              className="text-[11.5px] font-semibold tracking-[0.22em] uppercase mt-7"
              style={{ color: C.faint }}
            >
              Get started
            </p>
            <h2
              className="font-medium tracking-[-0.02em] leading-[1.12] mx-auto mt-4"
              style={{
                fontSize: "clamp(32px, 3.8vw, 52px)",
                color: C.text,
                maxWidth: 620,
              }}
            >
              Ready to understand
              <br />
              your codebase?
            </h2>
            <p
              className="mt-5 text-[15px] leading-relaxed"
              style={{ color: C.muted, maxWidth: 400 }}
            >
              Join thousands of developers who ship faster with Nexa.
            </p>

            <div className="flex items-center gap-3.5 mt-9">
              <button
                onClick={start}
                className="inline-flex items-center gap-2.5 px-6 rounded-lg text-[14.5px] font-semibold transition-transform hover:scale-[1.03]"
                style={{
                  height: 50,
                  background: C.cream,
                  color: C.creamFg,
                  boxShadow: "0 8px 36px rgba(236,228,211,0.22)",
                }}
              >
                Analyze Repository
                <ArrowRight color={C.creamFg} />
              </button>
              <button
                onClick={start}
                className="inline-flex items-center gap-2.5 px-6 rounded-lg text-[14.5px] font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                style={{
                  height: 50,
                  color: C.text,
                  border: "1px solid rgba(242,241,238,0.22)",
                  background: "rgba(10,10,9,0.4)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill={C.text}>
                  <path d="M3 1.8v10.4L12 7 3 1.8z" />
                </svg>
                Watch Demo
              </button>
            </div>

            <div
              className="flex items-center gap-5 mt-8 flex-wrap justify-center"
              style={{ color: C.faint }}
            >
              {[
                "Read-only access",
                "No data stored",
                "Free for public repos",
              ].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[12.5px]">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke={C.cream}
                    strokeWidth="1.8"
                  >
                    <path
                      d="M3 8.5l3.5 3.5L13 5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Footer — sits on the same backdrop */}
          <div
            className="relative mx-auto w-full px-12"
            style={{
              maxWidth: 1240,
              paddingTop: 44,
              paddingBottom: 48,
              borderTop: "1px solid rgba(242,241,238,0.10)",
            }}
          >
            <div className="flex flex-col lg:flex-row gap-12 justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <NexaMark size={24} />
                  <span
                    className="text-[17px] font-semibold tracking-tight"
                    style={{ color: C.text }}
                  >
                    Nexa
                  </span>
                </div>
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: C.faint, maxWidth: 210 }}
                >
                  Codebase intelligence platform for modern teams.
                </p>
              </div>

              <div className="flex gap-20 flex-wrap">
                {[
                  { h: "Product", links: ["Features", "Pricing", "Changelog"] },
                  { h: "Resources", links: ["Docs", "Blog", "API"] },
                  { h: "Company", links: ["About", "Careers", "Contact"] },
                ].map((col) => (
                  <div key={col.h}>
                    <p
                      className="text-[12.5px] font-semibold mb-3.5"
                      style={{ color: C.text }}
                    >
                      {col.h}
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {col.links.map((l) => (
                        <a
                          key={l}
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          className="text-[12.5px] transition-colors hover:text-[#f2f1ee]"
                          style={{ color: C.faint }}
                        >
                          {l}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-start lg:items-end gap-4">
                <div>
                  <p
                    className="text-[12.5px] lg:text-right"
                    style={{ color: C.faint }}
                  >
                    © 2026 Nexa
                  </p>
                  <p
                    className="text-[12.5px] lg:text-right"
                    style={{ color: C.faint }}
                  >
                    All rights reserved.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* GitHub */}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: C.border2, background: C.panel }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={C.muted}
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </a>
                  {/* X */}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: C.border2, background: C.panel }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill={C.muted}
                    >
                      <path d="M9.5 6.8L15.2 0h-1.4L8.9 5.9 4.9 0H0l6 8.7L0 16h1.4l5.2-6.2L10.9 16H16L9.5 6.8zM7.3 8.9l-.6-.9L1.9 1h2.1l3.9 5.5.6.9 5 7.2h-2.1L7.3 8.9z" />
                    </svg>
                  </a>
                  {/* Discord */}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center"
                    style={{ borderColor: C.border2, background: C.panel }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 20 16"
                      fill={C.muted}
                    >
                      <path d="M16.9 1.3A16.4 16.4 0 0012.8 0l-.5 1a15.2 15.2 0 00-4.6 0L7.2 0a16.4 16.4 0 00-4.1 1.3C.5 5.2-.2 9 .1 12.7A16.6 16.6 0 005.2 16l1-1.7a10.7 10.7 0 01-1.7-.8l.4-.3a11.7 11.7 0 0010.2 0l.4.3c-.5.3-1.1.6-1.7.8l1 1.7a16.6 16.6 0 005.1-3.3c.4-4.3-.7-8-2.9-11.4zM6.7 10.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </main>
  );
}
