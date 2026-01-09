# Knightwalker - Chess Line Visualization App

## Overview

Knightwalker is a next-generation chess line visualization application featuring a graph-based UX for exploring chess lines played by grandmasters. The focus is on exceptional UI/UX capability with performant data serving.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI Components | shadcn/ui |
| Styling | Tailwind CSS |
| Chess Engine | Stockfish (WASM) |
| Database | Supabase (PostgreSQL) |
| Client Cache | IndexedDB (via Dexie.js) |
| Chess Logic | chess.js |
| Board Rendering | react-chessboard |
| Graph Visualization | D3.js or React Flow |

---

## Design Philosophy

### Core Principles

1. **Calm Computing** - No visual anxiety. Soft colors, gentle transitions, nothing screams for attention.

2. **Content is King** - The chess positions and data are the star. UI chrome fades into the background.

3. **Progressive Revelation** - Show only what's needed. Details appear on demand, not all at once.

4. **Spatial Memory** - Consistent placement. Users build muscle memory for where things are.

5. **Quiet Confidence** - Premium feel through restraint, not flashiness.

---

## Design System

### Color Palette (Light Theme)

Inspired by natural materials - paper, stone, sky. Easy on the eyes for long study sessions.

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKGROUNDS                                                     │
├─────────────────────────────────────────────────────────────────┤
│  Canvas:          #FAFBFC   (barely-there warmth)               │
│  Surface:         #FFFFFF   (cards, panels)                     │
│  Surface Hover:   #F6F8FA   (subtle lift)                       │
│  Surface Active:  #F0F4F8   (pressed state)                     │
│  Elevated:        #FFFFFF   (modals, dropdowns) + shadow        │
├─────────────────────────────────────────────────────────────────┤
│  BORDERS & DIVIDERS                                              │
├─────────────────────────────────────────────────────────────────┤
│  Border Subtle:   #E8ECF0   (barely visible)                    │
│  Border Default:  #D0D7DE   (standard)                          │
│  Border Strong:   #B0B8C1   (emphasis)                          │
├─────────────────────────────────────────────────────────────────┤
│  TEXT                                                            │
├─────────────────────────────────────────────────────────────────┤
│  Primary:         #1F2328   (near-black, not pure black)        │
│  Secondary:       #656D76   (muted, for labels)                 │
│  Tertiary:        #8B949E   (hints, placeholders)               │
│  Disabled:        #B0B8C1                                       │
├─────────────────────────────────────────────────────────────────┤
│  ACCENT (Soft Blue)                                              │
├─────────────────────────────────────────────────────────────────┤
│  Accent Light:    #EBF4FF   (backgrounds)                       │
│  Accent:          #4A90D9   (primary actions)                   │
│  Accent Hover:    #3A7BC8   (hover state)                       │
│  Accent Pressed:  #2E6BB5   (active state)                      │
├─────────────────────────────────────────────────────────────────┤
│  SEMANTIC (Chess-specific)                                       │
├─────────────────────────────────────────────────────────────────┤
│  White Wins:      #2DA44E   (soft green, not neon)              │
│  Draw:            #8B949E   (neutral gray)                      │
│  Black Wins:      #CF222E   (muted red)                         │
│  Best Move:       #A475F0   (soft purple, engine suggestion)    │
│  Transposition:   #D4A72C   (warm amber, merge indicator)       │
└─────────────────────────────────────────────────────────────────┘
```

### Typography

```
┌─────────────────────────────────────────────────────────────────┐
│  FONT STACK                                                      │
├─────────────────────────────────────────────────────────────────┤
│  Primary:    "Inter", system-ui, sans-serif                     │
│  Mono:       "JetBrains Mono", "SF Mono", monospace             │
├─────────────────────────────────────────────────────────────────┤
│  SCALE (based on 16px root)                                      │
├─────────────────────────────────────────────────────────────────┤
│  xs:    12px / 1.5   (badges, captions)                         │
│  sm:    14px / 1.5   (secondary text, labels)                   │
│  base:  16px / 1.6   (body text)                                │
│  lg:    18px / 1.5   (subheadings)                              │
│  xl:    24px / 1.3   (headings)                                 │
│  2xl:   32px / 1.2   (page titles)                              │
├─────────────────────────────────────────────────────────────────┤
│  WEIGHTS                                                         │
├─────────────────────────────────────────────────────────────────┤
│  Regular:   400  (body)                                         │
│  Medium:    500  (emphasis, labels)                             │
│  Semibold:  600  (headings, important)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Spacing & Layout

```
Base unit: 4px

xs:   4px    (tight padding, icon gaps)
sm:   8px    (compact elements)
md:   16px   (standard padding)
lg:   24px   (section spacing)
xl:   32px   (major sections)
2xl:  48px   (page margins)

Border radius:
  sm:   4px   (buttons, inputs)
  md:   8px   (cards)
  lg:   12px  (panels, modals)
  full: 9999px (pills, avatars)
```

### Shadows (Subtle, Layered)

```css
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:  0 2px 8px rgba(0, 0, 0, 0.06);
--shadow-lg:  0 4px 16px rgba(0, 0, 0, 0.08);
--shadow-xl:  0 8px 32px rgba(0, 0, 0, 0.10);

/* Elevated panels get a subtle border + shadow */
--shadow-elevated: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06);
```

---

## Visual UX Details

### Animations & Transitions

**Principle**: Animations should feel **natural and purposeful**, never decorative.

```css
/* Timing functions */
--ease-out:     cubic-bezier(0.16, 1, 0.3, 1);      /* Smooth deceleration */
--ease-in-out:  cubic-bezier(0.65, 0, 0.35, 1);    /* Balanced */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* Subtle bounce */

/* Durations */
--duration-fast:   100ms   (hover states)
--duration-normal: 200ms   (most transitions)
--duration-slow:   300ms   (layout shifts, modals)

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0ms !important; }
}
```

**Specific Animations**:

| Element | Animation | Feel |
|---------|-----------|------|
| Node expand | Scale 0.95 → 1.0 + fade | Gentle pop |
| Panel slide | translateX with ease-out | Smooth glide |
| Hover states | 100ms color/shadow | Instant feedback |
| Focus ring | 2px offset, soft blue | Clear but not harsh |
| Loading | Pulse opacity 0.5 → 1.0 | Breathing rhythm |
| Graph zoom | Scale with ease-out | Fluid, not jerky |

### Graph Node Design (Refined)

```
┌─────────────────────────────────────────┐
│                                         │
│   e4                          ⑂ 2      │  ← Move + transposition badge
│                                         │
│   King's Pawn Opening                   │  ← Opening name (muted text)
│                                         │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← Thin divider
│                                         │
│   1.2M games                            │  ← Stats in secondary text
│                                         │
│   ██████████░░░░░░░░░░  52% · 30% · 18% │  ← Win bar (green·gray·red)
│                                         │
└─────────────────────────────────────────┘

States:
  Default:   White bg, subtle border, shadow-sm
  Hover:     Shadow-md, border darkens slightly
  Selected:  Accent border (2px), shadow-lg, subtle glow
  Dimmed:    40% opacity (focus mode)
  Expanded:  Slight scale (1.02x) while animating children
```

### Win Rate Bar Design

```
Horizontal bar, rounded ends, no gaps between segments:

┌──────────────────────────────────────────────────┐
│ ████████████████░░░░░░░░░░░░░░██████████████████ │
│     Green          Gray            Red           │
│     (White)       (Draw)         (Black)         │
└──────────────────────────────────────────────────┘

Height: 6px (subtle) or 8px (prominent)
Border-radius: full (pill shape)
Percentages shown on hover or always below bar

On hover: tooltip with exact numbers
  "White: 52.3% (651,234) · Draw: 30.1% · Black: 17.6%"
```

### Board Aesthetics

```
Board style: Clean, modern, slightly desaturated

Light squares:  #F0D9B5 → #E8D5B5 (warmer, less yellow)
Dark squares:   #B58863 → #A67B5B (softer brown)

Piece set: "Neo" or "Alpha" (clean vectors, not 3D)

Highlights:
  Last move:      Soft yellow overlay (#F7EC59, 30% opacity)
  Legal moves:    Subtle dots (not circles) at center
  Selected:       Slight glow under piece
  Check:          Red radial gradient behind king (subtle)
  Best move:      Purple arrow (engine), 60% opacity

Coordinates:
  Inside board, bottom-right of squares
  Color matches square (dark on light, light on dark)
  Font: 10px, medium weight, 60% opacity
```

### Information Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  LEVEL 1: Always Visible                                        │
│  • Current position on board                                    │
│  • Selected node in graph                                       │
│  • Mode toggle (Explore/Analyze)                                │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 2: Visible on Selection                                  │
│  • Position info panel                                          │
│  • Win rate statistics                                          │
│  • Opening name                                                 │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 3: Visible on Hover                                      │
│  • Exact game counts                                            │
│  • Transposition paths                                          │
│  • Edge frequency                                               │
├─────────────────────────────────────────────────────────────────┤
│  LEVEL 4: Visible on Demand (click/expand)                      │
│  • Full game list                                               │
│  • Engine analysis                                              │
│  • Deep statistics                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Navigation

### Global Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `Tab` | Switch Explore ↔ Analyze | Global |
| `?` | Show keyboard shortcuts | Global |
| `/` | Focus search bar | Global |
| `Esc` | Close panel / Deselect / Exit search | Global |

### Explore Mode

| Key | Action |
|-----|--------|
| `↑` `↓` `←` `→` | Navigate between sibling nodes |
| `Enter` | Select focused node → show info |
| `Space` | Expand/collapse children of selected |
| `Shift + →` | Follow main line (most played) |
| `Shift + ←` | Go to parent |
| `Home` | Jump to root (starting position) |
| `[` `]` | Decrease / increase visibility depth |
| `F` | Toggle focus mode (dim non-ancestors) |
| `A` | Analyze selected position (switch mode) |
| `C` | Copy FEN of selected position |
| `+` `-` | Zoom in / out |
| `0` | Reset zoom to fit |

### Analyze Mode

| Key | Action |
|-----|--------|
| `←` `→` | Previous / next move |
| `Shift + ←` | Go to start |
| `Shift + →` | Go to end |
| `↑` `↓` | Previous / next game (in list) |
| `Space` | Pause / resume engine |
| `E` | Toggle engine panel |
| `G` | Toggle games list |
| `F` | Flip board |
| `L` | Toggle legal move hints |

### Visual Feedback for Keys

```
On keypress, show brief toast at bottom:

┌──────────────────────────────┐
│  ← Previous move             │  (fades after 800ms)
└──────────────────────────────┘
```

---

## Microinteractions

### Node Selection
```
1. Click node
2. Node scales 1.0 → 1.02 (50ms)
3. Border transitions to accent color (100ms)
4. Shadow grows (100ms)
5. Siblings + non-ancestors dim (200ms, staggered)
6. Info panel slides in from right (200ms, ease-out)
```

### Expanding Children
```
1. Double-click or press Space
2. Selected node pulses briefly (subtle)
3. Children fade in (150ms) + scale from 0.9 → 1.0
4. Edges draw from parent to children (200ms, ease-out)
5. Layout shifts smoothly to accommodate (300ms)
```

### Hover States
```
All hovers: 100ms transition
Buttons: Background lightens, subtle shadow
Nodes: Border darkens, shadow-md
Edges: Line thickens, label appears
```

### Loading States
```
Initial load: Skeleton nodes (pulsing rectangles)
Data fetch: Spinner inside "Load more" button, not full-screen
Background: Subtle progress bar at top of screen (like YouTube)
```

---

## Empty & Edge States

### Empty Graph (No Data)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        ♔                                        │
│                                                                 │
│              No opening data available                          │
│                                                                 │
│        This position hasn't been played enough                  │
│        in master games to have statistics.                      │
│                                                                 │
│               [ Analyze with Engine ]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### No Games Found
```
No games match your filters.
Try adjusting the Elo range or date.

[ Clear Filters ]
```

### Engine Thinking
```
┌─────────────────────────────────────────────────────────────────┐
│  Stockfish 16  ·  Depth: 12/16  ·  ●●●○○ thinking...            │
│  ═══════════════════════════════════════════════════════════    │
│      +0.34  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░                      │
│                                                                 │
│  1. e4 e5 2.Nf3 Nc6 3.Bb5 ...                          (+0.34)  │
│  2. ···                                                 (···)   │  ← Skeleton
│  3. ···                                                 (···)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Breakpoints
```
sm:   640px   (mobile)
md:   768px   (tablet portrait)
lg:   1024px  (tablet landscape / small laptop)
xl:   1280px  (desktop)
2xl:  1536px  (large desktop)
```

### Layout Adaptations

**Mobile (< 768px)**:
- Explore: Graph only, panel as bottom sheet
- Analyze: Board stacked above move list
- No side-by-side layouts

**Tablet (768px - 1024px)**:
- Explore: Graph + collapsible side panel
- Analyze: Board left, moves right (narrower)

**Desktop (> 1024px)**:
- Full layouts as designed
- Wider info panels
- More visible nodes by default

---

## Application Modes

The app has two distinct modes optimized for different workflows:

### Mode Toggle (Header)
```
┌─────────────────────────────────────────────────────────────┐
│  KNIGHTWALKER    [ EXPLORE ]  [ ANALYZE ]    Search | ⚙️    │
└─────────────────────────────────────────────────────────────┘
```

---

## EXPLORE MODE (Opening Graph Traversal)

The primary mode for navigating opening theory. Features a **full-screen interactive graph** where **positions are nodes** and **moves are edges**. This is a true directed graph (DAG), not a tree.

### Key Concept: Transpositions Connect

When different move orders reach the **same position** (same FEN), the branches **visually merge**. This shows how openings connect.

**Example:**
```
1.d4 Nf6 2.c4 g6 3.Nc3 d5  ──┐
                              ├──▶  GRÜNFELD DEFENSE
1.c4 Nf6 2.Nc3 d5 3.d4 g6  ──┘     (same position)
```

### Explore Layout
```
┌───────────────────────────────────────────────────────────────────────────┐
│  KNIGHTWALKER    [•EXPLORE]  [ ANALYZE ]                    Search | ⚙️   │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     OPENING GRAPH (Full Canvas)                      │ │
│  │                                                                      │ │
│  │                          ┌─────────┐                                 │ │
│  │                          │  START  │                                 │ │
│  │                          └────┬────┘                                 │ │
│  │                 ┌─────────────┼─────────────┐                        │ │
│  │                 ▼             ▼             ▼                        │ │
│  │            ┌─────────┐  ┌─────────┐   ┌─────────┐                    │ │
│  │            │   e4    │  │   d4    │   │   c4    │                    │ │
│  │            │ 1.2M ⚪52%│  │ 980K ⚪51%│   │ 450K ⚪52%│                    │ │
│  │            └────┬────┘  └────┬────┘   └────┬────┘                    │ │
│  │           ┌─────┴─────┐      │             │                         │ │
│  │           ▼           ▼      ▼             │                         │ │
│  │      ┌────────┐  ┌────────┐ ┌────────┐     │                         │ │
│  │      │   e5   │  │   c5   │ │  Nf6   │     │                         │ │
│  │      │Open Game│  │Sicilian│ │Indian  │◀────┘ (transpose)            │ │
│  │      └───┬────┘  └───┬────┘ └───┬────┘                               │ │
│  │          │           │          │                                    │ │
│  │     ┌────┴────┐ ┌────┴────┐    │                                    │ │
│  │     ▼         ▼ ▼         ▼    ▼                                    │ │
│  │ ┌───────┐┌───────┐┌───────┐┌───────┐┌───────────┐                   │ │
│  │ │Ruy    ││Italian││Najdorf││Dragon ││King's     │                   │ │
│  │ │Lopez  ││Game   ││       ││       ││Indian     │◀── Multiple paths │ │
│  │ └───────┘└───────┘└───────┘└───────┘└───────────┘    arrive here    │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────┐  │
│  │   ┌──────────┐   │  │  SICILIAN DEFENSE, NAJDORF VARIATION         │  │
│  │   │ ♜ . ♝ ♛ │   │  │  ECO: B90  |  Games: 1,247,832               │  │
│  │   │ ♟ ♟ . ♟ │   │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │   │ . . ♟ . │   │  │  ⚪ White: 34%  ⬜ Draw: 32%  ⚫ Black: 34%    │  │
│  │   │ . ♟ . . │   │  │  Avg Elo: 2145                                │  │
│  │   │ . . . . │   │  │  ────────────────────────────────────────────  │  │
│  │   │ . . ♙ . │   │  │  PATHS TO THIS POSITION:                      │  │
│  │   │ ♙ ♙ . ♙ │   │  │  • 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6     │  │
│  │   │ ♖ ♘ ♗ ♕ │   │  │    5.Nc3 a6 (main line - 89%)                 │  │
│  │   └──────────┘   │  │  • 1.e4 c5 2.Nf3 a6 3.d4 cxd4 4.Nxd4 Nf6     │  │
│  │   MINI BOARD     │  │    5.Nc3 d6 (O'Kelly move order - 8%)        │  │
│  │   Click: Analyze │  │  • 1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 Nf6    │  │
│  └──────────────────┘  │    5.Nc3 d6 6.Be2 a6 (rare - 3%)             │  │
│                        └──────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

### Graph Node Design
```
┌─────────────────────────┐
│  e4                     │  ← Move that leads here
│  ───────────────────    │
│  "King's Pawn Opening"  │  ← Opening name (if named)
│  1,247,832 games        │  ← Times played
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░  │  ← Win bar: ⚪52% ⬜30% ⚫18%
└─────────────────────────┘
```

### Progressive Disclosure (Core Principle)

**Never render the full graph.** Users control visibility depth.

```
┌────────────────────────────────────────────────────────────────────┐
│  VISIBILITY DEPTH SLIDER                                           │
│                                                                    │
│  Shallow ○───────●───────○───────○───────○ Deep                   │
│            1      2       3       4       5                        │
│          (ply)  (ply)   (ply)   (ply)   (ply)                     │
│                                                                    │
│  Currently showing: 2 ply from selected node                       │
│  Visible nodes: 47 | Hidden: 4,891                                 │
└────────────────────────────────────────────────────────────────────┘
```

**Default State**:
- Start at root (initial position)
- Show 2 ply depth (first moves + responses)
- Everything else hidden

**Expansion Rules**:
| User Action | Result |
|-------------|--------|
| Click node | Select it, show info panel |
| Double-click | Expand +1 ply from that node |
| Slider increase | Expand all visible nodes by N ply |
| Slider decrease | Collapse distant branches |

**Performance Clamping**:
```typescript
const MAX_VISIBLE_NODES = 200;  // Adjustable based on device
const MAX_VISIBLE_EDGES = 400;

function clampVisibility(requestedDepth: number): number {
  const estimatedNodes = estimateNodesAtDepth(requestedDepth);
  if (estimatedNodes > MAX_VISIBLE_NODES) {
    // Reduce depth until under limit
    return findMaxSafeDepth(MAX_VISIBLE_NODES);
  }
  return requestedDepth;
}

// Show warning when clamped
"Depth limited to 3 ply (200 nodes max for performance)"
```

**Focus Mode** (on node selection):
- Highlight: selected node + ancestors + immediate children
- Dim: everything else (30% opacity)
- Optional: hide non-ancestors entirely

```
         ┌───┐
         │ e4│  ← ancestor (highlighted)
         └─┬─┘
           │
         ┌─┴─┐
         │ e5│  ← ancestor (highlighted)
         └─┬─┘
      ┌────┼────┐
      │    │    │
    ┌─┴─┐┌─┴─┐┌─┴─┐
    │Nf3││Nc3││Bc4│  ← siblings (dimmed)
    └─┬─┘└───┘└───┘
      │
    ┌─┴─┐
    │Nc6│  ← SELECTED (bright)
    └─┬─┘
  ┌───┼───┐
  │   │   │
┌─┴─┐┌┴──┐┌┴──┐
│Bb5││Bc4││d4 │  ← children (highlighted)
└───┘└───┘└───┘
```

### Graph Interactions

| Action | Result |
|--------|--------|
| Click node | Select → focus mode activates |
| Double-click | Expand children +1 ply |
| Shift+click | Multi-select (compare lines) |
| Right-click | Context menu: "Analyze", "Copy FEN", "Collapse subtree" |
| Drag canvas | Pan |
| Scroll | Zoom (visual only, doesn't change depth) |
| Hover node | Preview stats tooltip |
| Slider drag | Adjust global visibility depth |

### Transposition Visualization
- Nodes with **multiple incoming edges** show a badge: `⑂ 3 paths`
- Hover badge → highlight all incoming edges
- Transposition edges: curved + dashed + subtle color
- Only show transposition links within visible subgraph

---

## ANALYZE MODE (Engine + Board Focus)

Focused analysis view with Stockfish. Enter from Explore by clicking "Analyze" or selecting a specific game.

### Analyze Layout
```
┌───────────────────────────────────────────────────────────────────────────┐
│  KNIGHTWALKER    [ EXPLORE ]  [•ANALYZE]             ← Back | Search | ⚙️ │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  STOCKFISH 16  |  Depth: 24/32  |  ☁️ Cloud  |  ⏸️ Pause             │ │
│  │  ═══════════════════════════════════════════════════════════════════ │ │
│  │      +0.34  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░                      │ │
│  │                                                                      │ │
│  │  1. e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7           (+0.34)  │ │
│  │  2. d4 exd4 3.Nxd4 Bc5 4.Nb3 Bb6                            (+0.28)  │ │
│  │  3. Nc3 Nf6 4.d3 d6 5.Be3 Be7                               (+0.21)  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │                                │  │  MOVES                          │  │
│  │                                │  │  ════════════════════════════   │  │
│  │                                │  │                                 │  │
│  │                                │  │  1. e4     e5                   │  │
│  │        CHESS BOARD             │  │  2. Nf3    Nc6                  │  │
│  │                                │  │  3. Bb5    a6     ← Ruy Lopez   │  │
│  │        (Large, Interactive)    │  │  4. Ba4    Nf6      Morphy Def  │  │
│  │                                │  │  5. O-O    Be7    ← Closed Var  │  │
│  │                                │  │  6. Re1    b5                   │  │
│  │                                │  │  7. Bb3    d6                   │  │
│  │                                │  │  8. c3     O-O                  │  │
│  │                                │  │                                 │  │
│  └────────────────────────────────┘  │  [◀ ◁ ▷ ▶]  Flip | Reset       │  │
│                                       └────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  GAMES AT THIS POSITION  (247 games)                    Filter ▼    │ │
│  │  ┌───────────────────────────────────────────────────────────────┐  │ │
│  │  │ Carlsen (2847) vs Caruana (2820)  │ Sinquefield 2024 │ 1-0    │  │ │
│  │  │ Firouzja (2804) vs Nakamura (2789) │ Norway 2024     │ ½-½    │  │ │
│  │  │ Ding (2780) vs Nepomniachtchi (2793) │ WC Match 2023 │ 0-1    │  │ │
│  │  └───────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### Analyze Features
- **Opening names inline** in move list (shows when position enters a named opening)
- **Transposition alerts**: "This position also reached via 1.c4 e5 2.Nc3..."
- Click any move → board jumps to that position
- Engine runs continuously, updates in real-time

---

## Core Components

### Shared
- **ChessBoard**: Interactive board (react-chessboard + chess.js)
- **ModeToggle**: Switch between Explore/Analyze
- **SearchBar**: Find openings, players, positions by FEN

### Explore Mode
- **OpeningGraph**: D3.js/React Flow canvas with DAG rendering
- **GraphNode**: Individual position node with stats
- **TranspositionConnector**: Visual link showing merge points
- **PositionInfo**: Panel showing selected position details
- **MiniBoard**: Small board preview of selected position
- **PathsList**: All move orders that reach current position

### Analyze Mode
- **EnginePanel**: Stockfish output, eval bar, PV lines
- **MoveList**: Scrollable move notation with opening annotations
- **GamesList**: Virtual-scrolled list of games at position
- **BoardControls**: Navigation, flip, reset

---

## Data Architecture

### Database Options Analysis

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Supabase + IndexedDB** | Real-time, hosted, SQL power, offline cache | Row limits on free tier, query complexity | **Recommended** |
| **PlanetScale** | Serverless MySQL, branching | No full-text search built-in | Good alternative |
| **SQLite (Turso)** | Edge deployment, fast reads | Limited write scaling | Great for read-heavy |
| **Pre-computed JSON + CDN** | Fastest reads, no DB costs | No dynamic queries, large files | Good for opening book only |

### Recommended Architecture: Supabase + IndexedDB Hybrid

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Lichess DB    │────▶│  ETL Pipeline   │────▶│    Supabase     │
│   (PGN files)   │     │  (Processing)   │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Browser      │◀───▶│    Next.js      │◀───▶│  Supabase API   │
│   IndexedDB     │     │    (App)        │     │  (PostgREST)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Database Schema

```sql
-- Positions table (graph nodes)
-- Each unique FEN is one node - transpositions naturally merge here
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  fen TEXT NOT NULL UNIQUE,
  zobrist_hash BIGINT NOT NULL,      -- 64-bit Zobrist hash for fast lookups
  total_games INT DEFAULT 0,
  white_wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  black_wins INT DEFAULT 0,
  avg_elo INT,
  -- Opening classification
  eco TEXT,                          -- ECO code (B90, C65, etc.)
  opening_name TEXT,                 -- "Sicilian Defense"
  variation_name TEXT                -- "Najdorf Variation"
);

-- Primary lookup: hash first, FEN as collision check
CREATE INDEX idx_positions_zobrist ON positions(zobrist_hash);
CREATE INDEX idx_positions_eco ON positions(eco);
CREATE INDEX idx_positions_opening ON positions(opening_name);

-- Edges table (moves between positions)
-- Multiple edges can point TO the same position (transpositions!)
CREATE TABLE edges (
  id UUID PRIMARY KEY,
  from_position_id UUID REFERENCES positions(id),
  to_position_id UUID REFERENCES positions(id),
  move_san TEXT NOT NULL,            -- e.g., "e4", "Nf3"
  move_uci TEXT NOT NULL,            -- e.g., "e2e4", "g1f3"
  times_played INT DEFAULT 0,
  white_wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  black_wins INT DEFAULT 0,
  UNIQUE(from_position_id, move_san) -- One edge per move from a position
);

CREATE INDEX idx_edges_from ON edges(from_position_id);
CREATE INDEX idx_edges_to ON edges(to_position_id);  -- Important for finding transpositions!

-- NOTE: No position_paths table!
-- Paths are computed on-demand from edges via recursive query or client-side DFS.
-- Storing all paths would explode combinatorially for popular positions.

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY,
  white_player TEXT,
  black_player TEXT,
  white_elo INT,
  black_elo INT,
  result TEXT,                       -- '1-0', '0-1', '1/2-1/2'
  date DATE,
  event TEXT,
  site TEXT,
  eco TEXT,
  opening_name TEXT,
  moves TEXT[],                      -- Array of moves in SAN
  pgn TEXT
);

CREATE INDEX idx_games_players ON games(white_player, black_player);
CREATE INDEX idx_games_eco ON games(eco);
CREATE INDEX idx_games_date ON games(date DESC);
CREATE INDEX idx_games_elo ON games(GREATEST(white_elo, black_elo) DESC);

-- Junction table: which games reach which positions
CREATE TABLE game_positions (
  game_id UUID REFERENCES games(id),
  position_id UUID REFERENCES positions(id),
  move_number INT,                   -- At which move this position was reached
  PRIMARY KEY (game_id, position_id)
);

CREATE INDEX idx_game_positions_position ON game_positions(position_id);
```

### Transposition Queries

**Finding incoming edges** (for graph - shows merge points):
```sql
-- All edges that lead TO a position (transpositions!)
SELECT e.move_san, e.times_played, p.opening_name as from_opening
FROM edges e
JOIN positions p ON e.from_position_id = p.id
WHERE e.to_position_id = $1
ORDER BY e.times_played DESC;
```

**Computing paths on-demand** (recursive CTE):
```sql
-- Top N paths to a position (computed, not stored)
-- Limited depth + frequency cutoff prevents explosion
WITH RECURSIVE paths AS (
  -- Base: start position
  SELECT
    id as position_id,
    ARRAY[]::text[] as path,
    1 as games,
    0 as depth
  FROM positions
  WHERE fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  UNION ALL

  -- Recurse: follow edges
  SELECT
    e.to_position_id,
    paths.path || e.move_san,
    e.times_played,
    paths.depth + 1
  FROM paths
  JOIN edges e ON e.from_position_id = paths.position_id
  WHERE paths.depth < 15                    -- Max depth
    AND e.times_played >= 100               -- Only popular lines
    AND e.to_position_id != $1              -- Haven't reached target yet
)
SELECT path, games
FROM paths
WHERE position_id = $1
ORDER BY games DESC
LIMIT 5;  -- Top 5 paths only
```

**Client-side alternative** (recommended for responsiveness):
```typescript
// BFS from target position backwards, following incoming edges
// More control over cutoffs, can show progressive results
async function findPathsToPosition(targetId: string, limit = 5) {
  const paths: Path[] = [];
  const queue: Array<{ posId: string; path: string[]; freq: number }> = [
    { posId: targetId, path: [], freq: Infinity }
  ];

  while (queue.length > 0 && paths.length < limit) {
    const { posId, path, freq } = queue.shift()!;

    if (posId === START_POSITION_ID) {
      paths.push({ moves: path.reverse(), frequency: freq });
      continue;
    }

    // Get incoming edges (cached in IndexedDB)
    const incomingEdges = await getIncomingEdges(posId);
    for (const edge of incomingEdges.slice(0, 3)) { // Top 3 per node
      queue.push({
        posId: edge.from_position_id,
        path: [...path, edge.move_san],
        freq: Math.min(freq, edge.times_played)
      });
    }
  }
  return paths;
}
```

### Data Pruning Strategy

**Problem**: Lichess has millions of games → billions of unique positions. 99% are noise.

**Solution**: Hard popularity cutoff - only store positions played in ≥ N games.

```
┌────────────────────────────────────────────────────────────────────┐
│  POSITION FREQUENCY DISTRIBUTION (typical opening database)        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Games    │ Positions │ Cumulative │ Notes                        │
│  ─────────┼───────────┼────────────┼─────────────────────────────  │
│  ≥10,000  │    ~500   │    0.01%   │ Main lines only              │
│  ≥1,000   │   ~5,000  │    0.1%    │ Common theory                │
│  ≥100     │  ~50,000  │    1%      │ Well-explored ← RECOMMENDED  │
│  ≥10      │ ~500,000  │   10%      │ Playable lines               │
│  ≥1       │    ALL    │  100%      │ Includes blunders/noise      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Recommended Threshold**: `≥ 100 games`
- Captures ~50K positions (manageable)
- Covers all named openings + variations
- Excludes one-off blunders and obscure lines
- ~99% reduction in data size

**Implementation**:
```sql
-- ETL filter: only insert positions with sufficient games
INSERT INTO positions (...)
SELECT ...
FROM raw_positions
WHERE total_games >= 100;

-- Edges only between kept positions
INSERT INTO edges (...)
SELECT ...
FROM raw_edges e
WHERE EXISTS (SELECT 1 FROM positions p WHERE p.id = e.from_position_id)
  AND EXISTS (SELECT 1 FROM positions p WHERE p.id = e.to_position_id);
```

**Configurable Tiers** (future feature):
| Tier | Threshold | Use Case |
|------|-----------|----------|
| Lite | ≥1,000 | Fast load, main lines only |
| Standard | ≥100 | Default, good coverage |
| Deep | ≥10 | For serious study |

### Performance Optimizations

1. **Pre-aggregate statistics at ETL time**
   - Calculate win rates during import
   - No runtime aggregation needed
   - Single row lookup per position

2. **IndexedDB Caching (Dexie.js)**
   - Cache visited positions client-side
   - Prefetch children of current node
   - Offline access to explored lines

3. **Lazy Loading Graph**
   - Only load N levels deep initially
   - Expand on demand (double-click)
   - Virtualize off-screen nodes

4. **Pagination & Virtual Scrolling**
   - Games list: cursor-based pagination
   - TanStack Virtual for rendering
   - Never load full game list

---

## Bottleneck Mitigations

### 1. Graph Layout Stability (Anti-Jitter)

**Problem**: Changing visibility depth causes nodes to jump wildly, disorienting users.

**Solution**: Stable layout engine + animated transitions.

```typescript
// Use dagre for hierarchical DAG layout
import dagre from 'dagre';

const g = new dagre.graphlib.Graph();
g.setGraph({
  rankdir: 'TB',      // Top to bottom
  nodesep: 80,        // Horizontal spacing
  ranksep: 100,       // Vertical spacing
  marginx: 20,
  marginy: 20,
});

// Key: Preserve existing node positions when expanding
function updateLayout(existingNodes, newNodes) {
  // 1. Lock existing nodes to their current positions
  existingNodes.forEach(node => {
    g.setNode(node.id, { ...node, fixed: true });
  });

  // 2. Only compute positions for new nodes
  newNodes.forEach(node => {
    g.setNode(node.id, { width: 200, height: 120 });
  });

  dagre.layout(g);

  // 3. Animate transitions with Framer Motion
  return nodes.map(node => ({
    ...node,
    position: {
      x: g.node(node.id).x,
      y: g.node(node.id).y,
    },
    // React Flow will animate this
    transition: { duration: 300, ease: 'easeOut' }
  }));
}
```

**Rules**:
- Existing nodes stay in place (or shift minimally)
- New nodes animate in from parent position
- Collapsing: children fade out, then parent settles
- Never recompute full layout unless user resets

### 2. Focus Analysis (Engine Battery Optimization)

**Problem**: Stockfish WASM drains battery even when user is exploring the graph.

**Solution**: Engine only runs on actively analyzed positions, with smart throttling.

```typescript
type EngineState = 'idle' | 'active' | 'throttled' | 'paused';

const enginePolicy = {
  // Only run engine when:
  // 1. User is in Analyze mode, OR
  // 2. User has explicitly clicked "Analyze" on a node in Explore mode

  onModeChange(mode: 'explore' | 'analyze') {
    if (mode === 'explore') {
      engine.throttle(1000);  // 1 eval per second max
    } else {
      engine.resume();
    }
  },

  onNodeSelect(node: GraphNode) {
    // In Explore mode: only run engine if user explicitly requests
    // Don't auto-analyze every selected node
  },

  onGraphPan() {
    // User is exploring, not analyzing
    engine.pause();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => engine.resume(), 2000);
  },

  onTabHidden() {
    engine.stop();
  },

  onTabVisible() {
    // Don't auto-resume - wait for user interaction
    engine.setState('idle');
  }
};

// Visual indicator
function EngineStatus({ state }: { state: EngineState }) {
  return (
    <div className="flex items-center gap-2 text-sm text-secondary">
      {state === 'active' && <Spinner />}
      {state === 'throttled' && <span>⚡ Power saving</span>}
      {state === 'paused' && <span>⏸ Paused</span>}
      {state === 'idle' && <span>Ready</span>}
    </div>
  );
}
```

### 3. Zobrist Hashing (Fast Position Lookup)

**Problem**: FEN strings are 60-80 characters. String comparison is slow for joins.

**Solution**: Use Zobrist hashing - standard in chess engines. Produces a 64-bit integer.

```typescript
// Zobrist hash: XOR of random numbers for each piece-square combination
// Precomputed table of random 64-bit values
const zobristTable: bigint[][] = initZobristTable();

function computeZobristHash(fen: string): bigint {
  const board = parseFEN(fen);
  let hash = 0n;

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (piece !== null) {
      hash ^= zobristTable[piece][sq];
    }
  }

  // Include castling rights, en passant, side to move
  if (board.whiteToMove) hash ^= zobristTable.sideToMove;
  if (board.whiteCastleK) hash ^= zobristTable.castling[0];
  // ... etc

  return hash;
}
```

**Updated Schema**:
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  fen TEXT NOT NULL,
  zobrist_hash BIGINT NOT NULL,  -- 64-bit Zobrist hash
  -- ... other fields
);

-- Fast lookup by hash (collision-safe with FEN check)
CREATE UNIQUE INDEX idx_positions_zobrist ON positions(zobrist_hash);

-- Query pattern:
SELECT * FROM positions
WHERE zobrist_hash = $1    -- Fast integer comparison
  AND fen = $2;            -- Collision check (rare)
```

**Benefits**:
- Integer comparison vs string comparison: ~10x faster
- Index size: 8 bytes vs 60-80 bytes per row
- Collision probability: ~1 in 10^18 (negligible, but we check FEN anyway)

---

## Lichess Data Processing

### Data Source
- Lichess Elite Database: https://database.lichess.org/
- Focus on games with Elo > 2200 for quality
- Monthly updates available

### ETL Pipeline

```
1. Download PGN files (compressed)
2. Stream parse with pgn-parser
3. For each game:
   a. Extract metadata (players, result, date, eco)
   b. Replay moves, capture FEN at each position
   c. Update position statistics
   d. Store game record
4. Batch insert to Supabase (1000 records/batch)
5. Run VACUUM ANALYZE after import
```

### Estimated Data Size

**Before Pruning** (all positions):
- ~5-10 million games (2200+ Elo)
- ~50 million unique positions
- ~200 million edges
- PostgreSQL: ~20-50 GB

**After Pruning** (≥100 games threshold):
- ~50,000 positions (99.9% reduction)
- ~150,000 edges
- Paths: computed on-demand (not stored)
- PostgreSQL: **~50-100 MB**
- Easily fits in Supabase free tier

**Game Storage** (separate concern):
- Keep all games for "Games at this position" feature
- But only index positions that meet threshold
- Games table: ~2-5 GB (can paginate/lazy load)

---

## Stockfish Integration

### WASM Setup
```typescript
// Use stockfish.js WASM build
import { Stockfish } from 'stockfish.wasm';

const engine = await Stockfish();
engine.postMessage('uci');
engine.postMessage('setoption name Threads value 2');  // Conservative default
engine.postMessage('setoption name Hash value 64');    // 64MB, not 128
engine.postMessage(`position fen ${fen}`);
engine.postMessage('go depth 16');  // Default depth 16, not 20+
```

### Performance Constraints

**Problem**: Stockfish at depth 20+ will:
- Freeze weaker devices
- Drain laptop batteries
- Block main thread (even in worker)

**Mitigations**:

| Setting | Default | Max | Notes |
|---------|---------|-----|-------|
| Depth | 16 | 22 | Slider capped |
| Threads | 2 | 4 | Detect cores, use N-2 |
| Hash | 64MB | 128MB | More doesn't help much in browser |
| MultiPV | 3 | 5 | Top N lines shown |

```typescript
// Throttle UI updates - don't re-render every PV tick
const THROTTLE_MS = 100;
let lastUpdate = 0;

engine.onmessage = (event) => {
  const now = Date.now();
  if (now - lastUpdate < THROTTLE_MS) return;
  lastUpdate = now;

  // Parse and update UI
  updateEvaluation(parseInfo(event.data));
};

// Pause when tab not visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    engine.postMessage('stop');
  } else {
    // Resume analysis on current position
    engine.postMessage(`position fen ${currentFen}`);
    engine.postMessage(`go depth ${currentDepth}`);
  }
});
```

### Engine Panel Features
- Evaluation bar (clamped to ±10 for display)
- Best move arrow on board
- Top 3 PV lines (expandable to 5)
- Depth slider: 10–22 (default 16)
- Pause/Resume button
- "Analyzing..." indicator with current depth
- Battery warning on mobile (future)

---

## Component Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing → redirects to /explore
│   ├── explore/
│   │   └── page.tsx             # Explore mode (graph view)
│   ├── analyze/
│   │   └── page.tsx             # Analyze mode (engine view)
│   ├── layout.tsx               # Root layout with mode toggle
│   └── globals.css              # Tailwind + custom theme
│
├── components/
│   ├── ui/                      # shadcn components
│   │
│   ├── shared/
│   │   ├── Header.tsx           # Logo + mode toggle + search
│   │   ├── ModeToggle.tsx       # Explore/Analyze switcher
│   │   ├── SearchBar.tsx        # Opening/player/FEN search
│   │   └── WinRateBar.tsx       # W/D/B percentage visualization
│   │
│   ├── board/
│   │   ├── ChessBoard.tsx       # Main interactive board
│   │   ├── MiniBoard.tsx        # Small preview board (for Explore)
│   │   ├── BoardControls.tsx    # Flip, coordinates, reset
│   │   └── MoveInput.tsx        # Manual move entry
│   │
│   ├── explore/                 # EXPLORE MODE components
│   │   ├── OpeningGraph.tsx     # Main D3/React Flow canvas
│   │   ├── GraphNode.tsx        # Position node with stats
│   │   ├── GraphEdge.tsx        # Move edge with frequency
│   │   ├── TranspositionLink.tsx # Visual merge indicator
│   │   ├── GraphControls.tsx    # Zoom, pan, reset view
│   │   ├── GraphMinimap.tsx     # Overview for large graphs
│   │   ├── PositionPanel.tsx    # Selected position info
│   │   └── PathsList.tsx        # All paths to current position
│   │
│   ├── analyze/                 # ANALYZE MODE components
│   │   ├── EnginePanel.tsx      # Stockfish analysis display
│   │   ├── EvalBar.tsx          # Visual evaluation bar
│   │   ├── PVLines.tsx          # Principal variation lines
│   │   ├── DepthControl.tsx     # Engine depth slider
│   │   ├── MoveList.tsx         # Scrollable notation with annotations
│   │   └── MoveListItem.tsx     # Single move with opening label
│   │
│   └── games/
│       ├── GamesList.tsx        # Virtual-scrolled game list
│       ├── GameCard.tsx         # Individual game row
│       └── GameFilters.tsx      # Filter controls
│
├── lib/
│   ├── chess/
│   │   ├── engine.ts            # Stockfish WASM wrapper
│   │   ├── game.ts              # chess.js wrapper
│   │   └── openings.ts          # ECO/opening name lookup
│   ├── db/
│   │   ├── supabase.ts          # Supabase client config
│   │   ├── indexeddb.ts         # Dexie.js setup for caching
│   │   ├── positions.ts         # Position queries
│   │   ├── edges.ts             # Graph edge queries
│   │   ├── games.ts             # Game queries
│   │   └── transpositions.ts    # Path/transposition queries
│   └── utils/
│       ├── fen.ts               # FEN parsing/hashing
│       └── graph.ts             # Graph layout utilities
│
├── hooks/
│   ├── useEngine.ts             # Stockfish state + controls
│   ├── usePosition.ts           # Current board position
│   ├── useGraph.ts              # Graph data + navigation
│   ├── useTranspositions.ts     # Paths to current position
│   └── useGames.ts              # Games at current position
│
├── stores/
│   └── app-store.ts             # Zustand: mode, position, selection
│
└── types/
    ├── chess.ts                 # Chess types (Position, Move, Game)
    └── graph.ts                 # Graph types (Node, Edge, Path)
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize Next.js 14 with TypeScript
- [ ] Configure Tailwind + shadcn/ui
- [ ] Set up custom light theme (off-gray + soft blue)
- [ ] Create Header with mode toggle (Explore/Analyze)
- [ ] Set up routing: `/explore` and `/analyze`
- [ ] Implement shared ChessBoard component
- [ ] Add chess.js for move validation

### Phase 2: Explore Mode - Graph Core
- [ ] Set up React Flow or D3.js for graph rendering
- [ ] Create GraphNode component with opening name + stats
- [ ] Create GraphEdge component with move label + frequency
- [ ] Implement zoom/pan controls
- [ ] Add minimap for navigation
- [ ] Build PositionPanel (mini board + info)
- [ ] Wire up node selection → panel update

### Phase 3: Database + Transpositions
- [ ] Set up Supabase project
- [ ] Create schema (positions, edges, paths, games)
- [ ] Build ETL pipeline for Lichess data
- [ ] Process subset: extract positions + edges + paths
- [ ] Import opening names from ECO database
- [ ] Index for transposition queries
- [ ] Set up IndexedDB caching with Dexie

### Phase 4: Explore Mode - Transpositions
- [ ] Query and display multiple paths to position
- [ ] Visualize transposition connections (merge points)
- [ ] Add TranspositionLink component (curved connectors)
- [ ] Show "this position reached via..." in panel
- [ ] Color-code different paths
- [ ] Handle graph layout with merged nodes

### Phase 5: Analyze Mode
- [ ] Integrate Stockfish WASM
- [ ] Build EnginePanel with eval bar
- [ ] Display principal variations (PV lines)
- [ ] Create MoveList with inline opening annotations
- [ ] Add depth controls + pause/resume
- [ ] Implement board navigation (forward/back)
- [ ] Show "transposition alert" when applicable

### Phase 6: Games Integration
- [ ] Create GamesList with virtual scrolling
- [ ] Query games that reach current position
- [ ] Implement filters (player, elo, date, result)
- [ ] Click game → load into Analyze mode
- [ ] Add game replay controls

### Phase 7: Polish & Performance
- [ ] Optimize graph rendering (virtualize distant nodes)
- [ ] Progressive loading for deep positions
- [ ] Keyboard shortcuts (arrows, space, etc.)
- [ ] Search bar: openings, players, FEN input
- [ ] Mobile responsive layout
- [ ] Performance profiling + fixes

---

## Key Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",

    "chess.js": "^1.0.0",
    "react-chessboard": "^4.0.0",
    "stockfish.wasm": "latest",

    "reactflow": "^11.0.0",
    "dagre": "^0.8.5",
    "@tanstack/react-virtual": "^3.0.0",

    "@supabase/supabase-js": "^2.0.0",
    "dexie": "^3.2.0",
    "dexie-react-hooks": "^1.1.0",

    "zustand": "^4.5.0",

    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "latest"
  }
}
```

### Why React Flow over D3
- Built-in pan/zoom, minimap, node selection
- React-native component model (easier state management)
- Handles DAG layouts with transpositions
- Better performance for interactive graphs
- D3 better for custom visualizations, but React Flow fits this use case

---

## Alternative Data Solutions

If Supabase limits become an issue:

### Option A: Turso (SQLite at the Edge)
- Embedded replicas for ultra-fast reads
- Lower cost for read-heavy workloads
- Good for opening book specifically

### Option B: Pre-computed Static Data
- Generate JSON files for top 10k positions
- Host on CDN (Vercel Edge, Cloudflare R2)
- Instant loading, zero database costs
- Limited to pre-computed positions only

### Option C: Hybrid Approach
- Static JSON for common openings (moves 1-8)
- Supabase for deep positions and game search
- Best of both worlds

---

## Success Metrics

- Board interaction: < 16ms response
- Position lookup: < 100ms
- Tree rendering: 60fps with 500+ nodes
- Initial page load: < 2s (LCP)
- Engine depth 20: < 5s on modern hardware
