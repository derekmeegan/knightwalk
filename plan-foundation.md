# Foundation Agent Plan

## Project Context

You are setting up the foundation for **Knightwalker**, a next-generation chess opening visualization app. The app has two modes:
- **Explore Mode**: Graph-based visualization of opening lines with transpositions
- **Analyze Mode**: Chess board with Stockfish engine analysis

After you complete the foundation, **4 other agents will work in parallel** on different parts of the codebase. Your job is to create a solid foundation they can all build upon.

**IMPORTANT**: You are working in an **existing Next.js 16 project** with Tailwind v4 already configured. Do NOT run `create-next-app`. The project already exists.

**Main plan reference**: `/Users/d/Desktop/me/knightwalk/plan.md`

---

## Your Role

You are the **Foundation Agent**. You set up:
- Install additional dependencies (chess, graph, state management)
- shadcn/ui components initialization
- Design system (colors, typography, spacing)
- Folder structure using feature-based organization
- Zustand store skeleton
- Shared components (header, mode toggle)
- Route structure

---

## Directory Structure Convention

This project uses **feature-based colocation** with underscore prefixes for non-routable directories.

```
/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Home (redirects to /explore)
│
├── /explore/                     # Explore feature
│   ├── page.tsx                 # Main explore page
│   ├── /_components/            # Explore-specific components (NOT routable)
│   ├── /_hooks/                 # Explore-specific hooks (NOT routable)
│   └── /_lib/                   # Explore-specific types/utils (NOT routable)
│
├── /analyze/                     # Analyze feature
│   ├── page.tsx                 # Main analyze page
│   ├── /_components/            # Analyze-specific components (NOT routable)
│   ├── /_hooks/                 # Analyze-specific hooks (NOT routable)
│   └── /_lib/                   # Analyze-specific types/utils (NOT routable)
│
├── /components/                  # ONLY truly shared components (used by 2+ features)
│   ├── /ui/                     # shadcn primitives
│   ├── header.tsx               # App header
│   ├── mode-toggle.tsx          # Explore/Analyze toggle
│   └── win-rate-bar.tsx         # Shared visualization
│
├── /lib/                         # Global utilities
│   ├── cn.ts                    # Class name utility
│   ├── /chess/                  # Chess logic (Agent 2)
│   ├── /db/                     # Database (Agent 1)
│   └── /constants/              # Global constants
│
├── /hooks/                       # ONLY global hooks (used by 2+ features)
│
└── /stores/                      # Zustand stores
    └── app-store.ts
```

**Key Rules**:
- Underscore prefix (`_`) makes directories non-routable
- Feature-specific code stays in feature directories
- Only truly shared code goes in `/components/`, `/hooks/`, `/lib/`

---

## Boundaries

### You ARE responsible for:
- Installing dependencies
- shadcn/ui setup
- Design tokens in CSS
- Creating folder structure
- Shared components (header, mode-toggle, win-rate-bar)
- Zustand store skeleton
- Route shells for /explore and /analyze

### You are NOT responsible for:
- Chess logic (Agent 2)
- Database setup (Agent 1)
- Graph visualization (Agent 3)
- Board/analysis UI (Agent 4)

### If you need to:
- Add dependencies not listed → **ASK HUMAN FIRST**
- Change folder structure significantly → **ASK HUMAN FIRST**
- Implement any chess/game logic → **STOP, that's Agent 2's job**

---

## Detailed Tasks

### 1. Check Current State

First, verify what exists:

```bash
ls -la
cat package.json
ls app/
```

### 2. Install All Dependencies

Install everything upfront so other agents don't have conflicts:

```bash
# Chess libraries
npm install chess.js react-chessboard

# Graph visualization
npm install reactflow dagre
npm install -D @types/dagre

# Database & caching
npm install @supabase/supabase-js dexie dexie-react-hooks

# State management
npm install zustand

# UI utilities
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Virtual scrolling
npm install @tanstack/react-virtual
```

### 3. Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Choose:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add core components:

```bash
npx shadcn@latest add button card input slider dropdown-menu tooltip scroll-area separator badge skeleton
```

### 4. Set Up Design Tokens

**File: `app/globals.css`**

Add these CSS variables (keep existing Tailwind imports):

```css
@import "tailwindcss";

:root {
  /* Backgrounds */
  --canvas: 210 20% 98%;
  --surface: 0 0% 100%;
  --surface-hover: 210 25% 97%;
  --surface-active: 210 30% 96%;

  /* Borders */
  --border-subtle: 210 20% 92%;
  --border-default: 210 15% 85%;
  --border-strong: 210 10% 75%;

  /* Text */
  --text-primary: 210 30% 15%;
  --text-secondary: 210 10% 40%;
  --text-tertiary: 210 10% 55%;

  /* Accent (Soft Blue) */
  --accent-light: 213 100% 96%;
  --accent: 213 70% 55%;
  --accent-hover: 213 75% 48%;

  /* Chess Semantic Colors */
  --white-wins: 142 50% 45%;
  --draw: 210 10% 55%;
  --black-wins: 0 70% 48%;
  --best-move: 270 60% 65%;
  --transposition: 40 80% 50%;

  /* Board */
  --square-light: 35 45% 85%;
  --square-dark: 25 35% 52%;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.08);

  /* Animation */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 100ms;
  --duration-normal: 200ms;
}

/* Utility classes */
.bg-canvas { background-color: hsl(var(--canvas)); }
.bg-surface { background-color: hsl(var(--surface)); }
.bg-surface-hover { background-color: hsl(var(--surface-hover)); }
.text-primary { color: hsl(var(--text-primary)); }
.text-secondary { color: hsl(var(--text-secondary)); }
.text-tertiary { color: hsl(var(--text-tertiary)); }
.border-subtle { border-color: hsl(var(--border-subtle)); }
.border-default { border-color: hsl(var(--border-default)); }
.bg-accent { background-color: hsl(var(--accent)); }
.text-accent { color: hsl(var(--accent)); }
.bg-square-light { background-color: hsl(var(--square-light)); }
.bg-square-dark { background-color: hsl(var(--square-dark)); }
.text-white-wins { color: hsl(var(--white-wins)); }
.text-black-wins { color: hsl(var(--black-wins)); }
.text-draw { color: hsl(var(--draw)); }
.bg-white-wins { background-color: hsl(var(--white-wins)); }
.bg-black-wins { background-color: hsl(var(--black-wins)); }
.bg-draw { background-color: hsl(var(--draw)); }
```

### 5. Create Folder Structure

```bash
# App routes with feature structure
mkdir -p app/explore/_components app/explore/_hooks app/explore/_lib
mkdir -p app/analyze/_components app/analyze/_hooks app/analyze/_lib

# Shared components
mkdir -p app/components/ui

# Global lib
mkdir -p app/lib/chess app/lib/db app/lib/constants

# Global hooks (only for truly shared hooks)
mkdir -p app/hooks

# Stores
mkdir -p app/stores

# Public assets for Stockfish
mkdir -p public/stockfish
```

### 6. Create Utility: cn()

**File: `app/lib/cn.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 7. Create Zustand Store Skeleton

**File: `app/stores/app-store.ts`**

```typescript
import { create } from "zustand";

interface Position {
  fen: string;
}

interface AppState {
  // Mode
  mode: "explore" | "analyze";
  setMode: (mode: "explore" | "analyze") => void;

  // Current position (shared between modes)
  currentPosition: Position | null;
  setCurrentPosition: (position: Position | null) => void;

  // Explore mode state - Agent 3 will expand
  visibilityDepth: number;
  setVisibilityDepth: (depth: number) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Analyze mode state - Agent 4 will expand
  engineEnabled: boolean;
  setEngineEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: "explore",
  setMode: (mode) => set({ mode }),

  currentPosition: null,
  setCurrentPosition: (currentPosition) => set({ currentPosition }),

  visibilityDepth: 2,
  setVisibilityDepth: (visibilityDepth) => set({ visibilityDepth }),
  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),

  engineEnabled: true,
  setEngineEnabled: (engineEnabled) => set({ engineEnabled }),
}));
```

### 8. Create Header Component

**File: `app/components/header.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/cn";
import { Search } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const currentMode = pathname.startsWith("/analyze") ? "analyze" : "explore";

  return (
    <header className="sticky top-0 z-50 border-b border-subtle bg-surface/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">
            KNIGHTWALKER
          </span>
        </Link>

        <div className="flex items-center gap-1 rounded-lg bg-surface-hover p-1">
          <ModeButton href="/explore" active={currentMode === "explore"}>
            Explore
          </ModeButton>
          <ModeButton href="/analyze" active={currentMode === "analyze"}>
            Analyze
          </ModeButton>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-surface-hover hover:text-primary transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function ModeButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
        active
          ? "bg-surface text-primary shadow-sm"
          : "text-secondary hover:text-primary"
      )}
    >
      {children}
    </Link>
  );
}
```

### 9. Create Win Rate Bar Component

**File: `app/components/win-rate-bar.tsx`**

```typescript
interface WinRateBarProps {
  whiteWins: number;
  draws: number;
  blackWins: number;
  showLabels?: boolean;
}

export function WinRateBar({ whiteWins, draws, blackWins, showLabels = false }: WinRateBarProps) {
  const total = whiteWins + draws + blackWins;
  if (total === 0) return null;

  const whitePercent = (whiteWins / total) * 100;
  const drawPercent = (draws / total) * 100;
  const blackPercent = (blackWins / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div className="bg-white-wins transition-all" style={{ width: `${whitePercent}%` }} />
        <div className="bg-draw transition-all" style={{ width: `${drawPercent}%` }} />
        <div className="bg-black-wins transition-all" style={{ width: `${blackPercent}%` }} />
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-secondary">
          <span>{whitePercent.toFixed(0)}%</span>
          <span>{drawPercent.toFixed(0)}%</span>
          <span>{blackPercent.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
```

### 10. Update Root Layout

**File: `app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/app/components/header";

export const metadata: Metadata = {
  title: "Knightwalker - Chess Opening Explorer",
  description: "Next-generation chess line visualization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-canvas">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
```

### 11. Create Route Pages

**File: `app/page.tsx`**

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/explore");
}
```

**File: `app/explore/page.tsx`**

```typescript
export default function ExplorePage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary mb-2">
          Explore Mode
        </h1>
        <p className="text-secondary">
          Graph visualization - Agent 3 will build this
        </p>
      </div>
    </div>
  );
}
```

**File: `app/analyze/page.tsx`**

```typescript
export default function AnalyzePage() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary mb-2">
          Analyze Mode
        </h1>
        <p className="text-secondary">
          Board and engine - Agent 4 will build this
        </p>
      </div>
    </div>
  );
}
```

### 12. Create .gitkeep Placeholders

```bash
touch app/lib/chess/.gitkeep
touch app/lib/db/.gitkeep
touch app/hooks/.gitkeep
touch app/explore/_components/.gitkeep
touch app/explore/_hooks/.gitkeep
touch app/explore/_lib/.gitkeep
touch app/analyze/_components/.gitkeep
touch app/analyze/_hooks/.gitkeep
touch app/analyze/_lib/.gitkeep
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] `npm run dev` works without errors
- [ ] Can navigate between `/explore` and `/analyze`
- [ ] Header shows with mode toggle working
- [ ] All dependencies installed (`npm ls` shows no missing)
- [ ] Folder structure matches spec above
- [ ] shadcn components installed (check `app/components/ui/`)

---

## What Other Agents Need to Know

When complete, other agents can start:

1. **Agent 1 (Data)**: Work in `app/lib/db/`
2. **Agent 2 (Chess)**: Work in `app/lib/chess/`
3. **Agent 3 (Explore)**: Work in `app/explore/_components/`, `app/explore/_hooks/`, `app/explore/_lib/`
4. **Agent 4 (Analyze)**: Work in `app/analyze/_components/`, `app/analyze/_hooks/`, `app/analyze/_lib/`

All agents share:
- `app/stores/app-store.ts` - coordinate additions
- `app/components/` - truly shared components only
- `app/lib/` - global utilities


Once done, confirm all checklist items pass.