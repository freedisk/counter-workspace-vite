# Counter Workspace App

## Project Overview

Vite-powered multi-file vanilla JS app — a glassmorphism-style workspace with draggable cards for counting, timing, and decision-making. Refactored from a single `counter.html` into ES modules.

## Dev Server

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

## Architecture

- **Build tool**: Vite (vanilla template, no framework)
- **Entry point**: `index.html` → `src/main.js`
- **Theming**: CSS custom properties (`--text`, `--glass`, `--bg-1`, etc.) with 4 themes (violet, ocean, sunset, forest) and dark/light mode
- **Card factory pattern**: `createCard(type, opts)` in `main.js` dispatches to `buildXxx()` functions
- **6 card types**: counter, stopwatch, countdown, pomodoro, dice, timer
- **Persistence**: auto-save to `localStorage` (key: `workspace`) via debounced `scheduleSave()`
- **Undo**: snapshot-based, 30 levels, Ctrl+Z

## File Structure

```
index.html              # Vite entry — toolbar HTML + <script type="module" src="/src/main.js">
src/
├── main.js             # Entry: imports all modules, createCard factory, onboarding, window bindings
├── style.css           # All CSS (imported by main.js)
├── theme.js            # setTheme(), toggleMode(), restoreTheme(), exports currentTheme/isLight
├── drag.js             # Global drag system (currentDragCard, document listeners), exports bindDrag()
├── toolbar.js          # toggleDropdown(), closeDropdowns(), organizeGrid/Row/Stack/Grouped
├── persistence.js      # saveState(), scheduleSave(), saveWorkspace(), loadWorkspace(), undo()
├── utils.js            # fmtTime(), bindHold(), updateContainerHeight(), ACCENT_COLORS
├── cards/
│   ├── shared.js       # positionCard(), bindRemove(), buildCardShell() (HTML fragments)
│   ├── counter.js      # buildCounter() — export default
│   ├── stopwatch.js    # buildStopwatch() — export default (laps + hotkey)
│   ├── countdown.js    # buildCountdown() — export default
│   ├── pomodoro.js     # buildPomodoro() — export default
│   ├── dice.js         # buildDice() — export default
│   └── timer.js        # buildTimer() — export default (60s + circular progress)
```

## Module Dependencies

```
main.js ──→ style.css, theme.js, drag.js, toolbar.js, persistence.js, utils.js, cards/*
toolbar.js ──→ persistence.js (saveState), utils.js (updateContainerHeight)
drag.js ──→ persistence.js (scheduleSave), utils.js (updateContainerHeight)
persistence.js ──→ utils.js (ACCENT_COLORS, updateContainerHeight), theme.js (currentTheme, isLight, setTheme, toggleMode)
utils.js ──→ persistence.js (saveState) — circular but safe (runtime-only calls)
cards/shared.js ──→ utils.js (ACCENT_COLORS), persistence.js (saveState)
cards/counter.js ──→ utils.js (bindHold), persistence.js (saveState)
cards/stopwatch.js ──→ utils.js (fmtTime), persistence.js (scheduleSave)
cards/countdown.js ──→ utils.js (fmtTime)
cards/pomodoro.js ──→ utils.js (fmtTime)
cards/timer.js ──→ utils.js (fmtTime)
cards/dice.js ──→ (no imports)
```

## Card Types

| Type | Builder | Key Features |
|------|---------|-------------|
| counter | `buildCounter` | +1/-1 with hold-to-accelerate, click to edit value |
| stopwatch | `buildStopwatch` | Start/pause/reset, mm:ss.cs display, laps, keyboard hotkey |
| countdown | `buildCountdown` | Picker h/m/s with arrows + wheel, presets, pause/resume |
| pomodoro | `buildPomodoro` | Configurable work/break/cycles, phase transitions with flash |
| dice | `buildDice` | Numeric (d4-d20) + decision mode (custom faces, presets) |
| timer | `buildTimer` | 60s countdown with SVG circular progress bar, color transitions |

## Shared Features (all cards)

- Drag handle (top-left, 6-dot grid)
- Editable name (`contenteditable`)
- Clone / Remove buttons
- Card type label (top-right)

## Layout System

- `organizeGrid()` — square grid
- `organizeRow()` — horizontal line
- `organizeStack()` — cascading stack
- `organizeGrouped()` — columns by type with zone labels

## Key Functions

- `saveState()` — push undo snapshot + trigger `scheduleSave()` (persistence.js)
- `scheduleSave()` — debounce 300ms then `saveWorkspace()` (persistence.js)
- `saveWorkspace()` / `loadWorkspace()` — localStorage persistence (persistence.js)
- `bindDrag(card)` — sets `currentDragCard` for global drag handler (drag.js)
- `bindHold(el, onStep)` — hold-to-repeat with acceleration (utils.js)
- `fmtTime(ms)` — format milliseconds to mm:ss.cs or h:mm:ss (utils.js)
- `updateContainerHeight()` — recalculates `#container` min-height (utils.js)
- `toggleDropdown(id)` / `closeDropdowns()` — toolbar dropdown menus (toolbar.js)
- `card._cleanup()` — per-card timer cleanup (stopwatch, countdown, pomodoro, timer) + event listener removal

## Conventions

- All colors use CSS variables for theme compatibility
- New card types must: add CSS in `style.css`, add `buildXxx()` in `src/cards/`, register in `createCard` if/else in `main.js` + labels/placeholders, add to "Ajouter" dropdown in `index.html`, update `organizeGrouped` types array in `toolbar.js`
- Undo snapshots must include any card-specific config (e.g., `pomodoroConfig`, `diceMode`, `hotkey`)
- Persistence must serialize/deserialize card-specific fields
- Cards with timers must set `card._cleanup` to stop intervals/rafs; `bindRemove`, `undo`, `destroyAll` call it
- Drag uses a global system: one `mousemove`/`mouseup` on `document`, `currentDragCard` identifies active card
- After any card repositioning (layout, drag, create), call `updateContainerHeight()`
- Cards must have `role="region"` + `aria-label`; interactive elements need `:focus-visible` and `aria-label`
- Toolbar HTML uses `onclick` handlers that call `window.*` — these are exposed in `main.js`
- localStorage format is backward-compatible with the original single-file version

## Stopwatch Features

### Laps
- Button "Tour" appears between Play and RAZ, enabled only while running
- Each lap records total elapsed time; display shows `#N`, delta (since last lap), and cumulative total
- Laps listed newest-first in a scrollable container (max 160px)
- Laps are transient (not persisted) — reset on RAZ or page reload

### Keyboard Hotkey
- Each stopwatch card can have one keyboard shortcut to toggle start/pause
- Badge "Raccourci :" shows current key or "Aucun"; click to enter assignment mode ("Appuie…")
- Supports modifier combos (Ctrl+K, Shift+S, etc.) via `keyLabel()` helper
- `✕` button clears the shortcut
- Hotkey stored in `card.dataset.hotkey`, serialized in persistence (`hotkey` field in save/undo snapshots)
- Hotkey ignored when focus is on input/textarea/contenteditable elements
- `card._cleanup()` removes the global `keydown` listener to prevent leaks

## Timer Card

- Fixed 60-second countdown with SVG circular progress bar (`stroke-dashoffset` animation)
- Ring color transitions: accent → `--warn` (under 25%) → `--negative` (under 10%)
- Flash animation (`pomo-flash`) on completion
- Play/Pause/RAZ controls, same UX as other timer cards
- Reuses `fmtTime()` short format (`m:ss`)

## Accessibility

- `:focus-visible` outline on all interactive elements
- `role="application"` on `#container`, `role="region"` + `aria-label` on each card
- Counter display: `role="button"` + `tabindex="0"` + responds to Enter
- Drag handle: `aria-label="Déplacer la carte"`
- +1/-1 buttons: `aria-label="Incrémenter"` / `"Décrémenter"`

## Toolbar

- Two dropdown menus: "Disposition ▾" (layouts) and "Ajouter ▾" (card types)
- Dropdowns close on outside click
- Responsive: fits on 375px screens

## Onboarding

- First launch (no `workspace` in localStorage): tooltip "Glisse les cartes pour les réorganiser" above first card for 4s
- Dismissed on first drag or after timeout; stores `onboarded` flag in localStorage

## Language

UI is in French (labels, buttons, placeholders).
