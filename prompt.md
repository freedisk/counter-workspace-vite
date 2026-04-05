# Refactoring mono-fichier → Vite multi-fichiers

## Contexte
`counter.html` est une app mono-fichier de ~1800 lignes. Lis CLAUDE.md pour comprendre l'architecture. L'app fonctionne parfaitement — l'objectif est de la restructurer en projet Vite multi-fichiers SANS casser aucune fonctionnalité.

## Étape 1 — Initialiser le projet Vite

Crée un projet Vite vanilla (PAS React) dans le dossier courant :
```
npm create vite@latest . -- --template vanilla
npm install
```

## Étape 2 — Découper en modules

Suis cette structure exacte :

```
src/
├── main.js           # Point d'entrée : init, loadWorkspace, createCard factory, onboarding
├── style.css         # TOUT le CSS extrait de counter.html (aucune modification)
├── theme.js          # setTheme(), toggleMode(), variables CSS, restoration
├── drag.js           # Système global de drag (currentDragCard, listeners document)
├── toolbar.js        # toggleDropdown(), closeDropdowns(), organizeGrid/Row/Stack/Grouped
├── persistence.js    # saveState(), scheduleSave(), saveWorkspace(), loadWorkspace(), undo()
├── utils.js          # fmtTime(), bindHold(), updateContainerHeight(), ACCENT_COLORS
├── cards/
│   ├── shared.js     # positionCard(), bindDrag(), bindRemove(), card HTML fragments
│   ├── counter.js    # buildCounter() — export default
│   ├── stopwatch.js  # buildStopwatch() — export default
│   ├── countdown.js  # buildCountdown() — export default
│   ├── pomodoro.js   # buildPomodoro() — export default
│   └── dice.js       # buildDice() — export default
```

## Règles

- Chaque fichier exporte ses fonctions avec `export` / `export default`
- `main.js` importe tout et orchestre
- Le CSS reste dans un seul fichier `style.css`, importé par `main.js` via `import './style.css'`
- L'index.html de Vite doit contenir seulement le `<div id="container">` et la toolbar HTML
- La toolbar HTML peut rester dans index.html (c'est du markup statique)
- NE PAS changer le comportement, le design, ou les fonctionnalités
- La persistence localStorage doit rester compatible (un workspace sauvegardé avec l'ancien format doit charger)
- Chaque card builder doit importer ses dépendances propres (fmtTime, bindHold, etc.)

## Étape 3 — Vérifier

Après le refactoring :
1. `npm run dev` — le serveur local doit se lancer
2. Vérifier que les 5 types de cartes fonctionnent
3. Vérifier que le drag, l'undo, la persistence, les thèmes fonctionnent
4. Vérifier que les workspaces sauvegardés dans l'ancien format chargent encore

## Étape 4 — Mettre à jour CLAUDE.md

Documente la nouvelle structure, les imports entre modules, et la commande pour lancer le dev server.

## Contrainte absolue
Fais le refactoring progressivement : d'abord extrais le CSS, puis les utilitaires, puis les cards une par une. Vérifie à chaque étape que rien ne casse. Ne fais PAS tout d'un coup.