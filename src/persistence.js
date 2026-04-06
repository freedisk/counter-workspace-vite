import { ACCENT_COLORS, updateContainerHeight } from './utils.js';
import { currentTheme, isLight, setTheme, toggleMode } from './theme.js';

// These will be set by main.js to avoid circular dependencies
let _createCard = null;
let _nextColorIdx = 0;
let _setNextColorIdx = null;
let _cardId = 0;
let _setCardId = null;

export function initPersistence({ createCard, getNextColorIdx, setNextColorIdx, getCardId, setCardId }) {
  _createCard = createCard;
  _setNextColorIdx = setNextColorIdx;
  _setCardId = setCardId;
}

export function getNextColorIdx() { return _nextColorIdx; }
export function setNextColorIdx(v) { _nextColorIdx = v; }
export function getCardId() { return _cardId; }
export function setCardId(v) { _cardId = v; }

const undoStack = [];

export function getUndoBtn() {
  return document.getElementById('btn-undo');
}

export function saveState() {
  const cards = document.querySelectorAll('.card');
  const snap = [];
  cards.forEach(c => {
    const nameEl = c.querySelector('.card-name');
    const entry = {
      type: c.dataset.type,
      accent: c.dataset.accent,
      count: c.dataset.count,
      name: nameEl ? nameEl.textContent : '',
      left: c.style.left,
      top: c.style.top,
      width: c.style.width || '',
      height: c.style.height || ''
    };
    if (c.dataset.pomodoroConfig) entry.pomodoroConfig = JSON.parse(c.dataset.pomodoroConfig);
    if (c.dataset.diceMode) {
      entry.diceMode = c.dataset.diceMode;
      entry.diceFaces = parseInt(c.dataset.diceFaces) || 6;
      entry.diceLabels = c.dataset.diceLabels ? JSON.parse(c.dataset.diceLabels) : [];
    }
    if (c.dataset.hotkey) entry.hotkey = c.dataset.hotkey;
    if (c.dataset.workoutConfig) entry.workoutConfig = JSON.parse(c.dataset.workoutConfig);
    if (c.dataset.workoutSets) entry.workoutSets = JSON.parse(c.dataset.workoutSets);
    snap.push(entry);
  });
  undoStack.push(snap);
  if (undoStack.length > 30) undoStack.shift();
  getUndoBtn().disabled = false;
  scheduleSave();
}

export function undo() {
  if (!undoStack.length) return;
  const snap = undoStack.pop();
  getUndoBtn().disabled = !undoStack.length;
  document.querySelectorAll('.card').forEach(c => { if (c._cleanup) c._cleanup(); c.remove(); });
  clearZoneLabels();
  _setCardId(0);
  _setNextColorIdx(0);
  snap.forEach(s => {
    _setNextColorIdx(Math.max(0, ACCENT_COLORS.indexOf(s.accent)));
    const opts = { startVal: parseInt(s.count) || 0, left: s.left, top: s.top, name: s.name, skipSave: true };
    if (s.width) opts.width = s.width;
    if (s.height) opts.height = s.height;
    if (s.pomodoroConfig) opts.pomodoroConfig = s.pomodoroConfig;
    if (s.diceMode) { opts.diceMode = s.diceMode; opts.diceFaces = s.diceFaces; opts.diceLabels = s.diceLabels; }
    if (s.hotkey) opts.hotkey = s.hotkey;
    if (s.workoutConfig) opts.workoutConfig = s.workoutConfig;
    if (s.workoutSets) opts.workoutSets = s.workoutSets;
    _createCard(s.type, opts);
  });
  updateContainerHeight();
}

let saveTimer = null;

export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveWorkspace, 300);
}

export function saveWorkspace() {
  const cards = document.querySelectorAll('.card');
  const data = { theme: currentTheme, lightMode: isLight, cards: [] };
  cards.forEach(c => {
    const nameEl = c.querySelector('.card-name');
    const entry = {
      type: c.dataset.type,
      name: nameEl ? nameEl.textContent : '',
      accent: c.dataset.accent,
      count: c.dataset.count,
      left: c.style.left,
      top: c.style.top,
      width: c.style.width || '',
      height: c.style.height || ''
    };
    if (c.dataset.type === 'pomodoro' && c.dataset.pomodoroConfig) {
      entry.pomodoroConfig = JSON.parse(c.dataset.pomodoroConfig);
    }
    if (c.dataset.type === 'dice') {
      entry.diceMode = c.dataset.diceMode || 'numeric';
      entry.diceFaces = parseInt(c.dataset.diceFaces) || 6;
      entry.diceLabels = c.dataset.diceLabels ? JSON.parse(c.dataset.diceLabels) : ['Oui', 'Non'];
    }
    if (c.dataset.hotkey) entry.hotkey = c.dataset.hotkey;
    if (c.dataset.type === 'workout') {
      if (c.dataset.workoutConfig) entry.workoutConfig = JSON.parse(c.dataset.workoutConfig);
      if (c.dataset.workoutSets) entry.workoutSets = JSON.parse(c.dataset.workoutSets);
    }
    data.cards.push(entry);
  });
  localStorage.setItem('workspace', JSON.stringify(data));
}

export function loadWorkspace() {
  const raw = localStorage.getItem('workspace');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data.cards || !data.cards.length) return false;
    if (data.theme) setTheme(data.theme);
    if (data.lightMode && !isLight) toggleMode();
    data.cards.forEach(s => {
      _setNextColorIdx(Math.max(0, ACCENT_COLORS.indexOf(s.accent)));
      const opts = {
        startVal: parseInt(s.count) || 0,
        left: s.left,
        top: s.top,
        name: s.name,
        skipSave: true
      };
      if (s.width) opts.width = s.width;
      if (s.height) opts.height = s.height;
      if (s.pomodoroConfig) opts.pomodoroConfig = s.pomodoroConfig;
      if (s.diceMode) { opts.diceMode = s.diceMode; opts.diceFaces = s.diceFaces; opts.diceLabels = s.diceLabels; }
      if (s.hotkey) opts.hotkey = s.hotkey;
      if (s.workoutConfig) opts.workoutConfig = s.workoutConfig;
      if (s.workoutSets) opts.workoutSets = s.workoutSets;
      _createCard(s.type, opts);
    });
    return true;
  } catch (e) { return false; }
}

function clearZoneLabels() {
  document.querySelectorAll('.zone-label').forEach(l => l.remove());
}
