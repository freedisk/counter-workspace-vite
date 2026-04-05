import './style.css';
import { ACCENT_COLORS, updateContainerHeight } from './utils.js';
import { setTheme, toggleMode, restoreTheme } from './theme.js';
import './drag.js';
import { toggleDropdown, closeDropdowns, organizeGrid, organizeRow, organizeStack, organizeGrouped } from './toolbar.js';
import { saveState, undo, scheduleSave, loadWorkspace, initPersistence } from './persistence.js';
import { positionCard, bindRemove, buildCardShell } from './cards/shared.js';
import { bindDrag } from './drag.js';

import buildCounter from './cards/counter.js';
import buildStopwatch from './cards/stopwatch.js';
import buildCountdown from './cards/countdown.js';
import buildPomodoro from './cards/pomodoro.js';
import buildDice from './cards/dice.js';
import buildTimer from './cards/timer.js';

// ── State ──
let nextColorIdx = 0;
let cardId = 0;

// ── Wire up persistence with createCard reference ──
initPersistence({
  createCard,
  getNextColorIdx: () => nextColorIdx,
  setNextColorIdx: v => { nextColorIdx = v; },
  getCardId: () => cardId,
  setCardId: v => { cardId = v; },
});

// ── Expose functions to inline onclick handlers in HTML ──
window.toggleDropdown = toggleDropdown;
window.closeDropdowns = closeDropdowns;
window.organizeGrid = organizeGrid;
window.organizeRow = organizeRow;
window.organizeStack = organizeStack;
window.organizeGrouped = organizeGrouped;
window.createCard = createCard;
window.undo = undo;
window.destroyAll = destroyAll;
window.resetWorkspace = resetWorkspace;
window.setTheme = setTheme;
window.toggleMode = toggleMode;

// ── Card factory ──
function createCard(type, opts = {}) {
  if (!opts.skipSave) saveState();

  const accent = ACCENT_COLORS[nextColorIdx % ACCENT_COLORS.length];
  nextColorIdx++;
  const id = cardId++;

  const card = document.createElement('div');
  card.className = 'card';
  card.id = `card-${id}`;
  card.dataset.type = type;
  card.dataset.accent = accent;
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', `${type} — ${opts.name || 'sans nom'}`);

  positionCard(card, opts, id);

  const labels = { counter: 'Compteur', stopwatch: 'Chronomètre', countdown: 'Rebours', pomodoro: 'Pomodoro', dice: 'Dé', timer: 'Timer' };

  const { handleHTML, labelHTML, nameHTML, bottomHTML } = buildCardShell({ card, id, type, accent, opts, nextColorIdx });

  document.getElementById('container').appendChild(card);

  if (type === 'counter') buildCounter(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);
  else if (type === 'stopwatch') buildStopwatch(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);
  else if (type === 'countdown') buildCountdown(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);
  else if (type === 'pomodoro') buildPomodoro(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);
  else if (type === 'dice') buildDice(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);
  else if (type === 'timer') buildTimer(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML);

  bindDrag(card);
  bindRemove(card);
  card.querySelector(`[data-action="clone-${type}"]`).addEventListener('click', () => createCard(type));

  // Prevent drag when editing name
  const nameEl = card.querySelector('.card-name');
  nameEl.addEventListener('mousedown', e => e.stopPropagation());
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
  nameEl.addEventListener('blur', () => {
    card.setAttribute('aria-label', `${labels[type]} — ${nameEl.textContent || 'sans nom'}`);
    scheduleSave();
  });

  updateContainerHeight();
}

// ── Destroy all ──
function destroyAll() {
  const cards = document.querySelectorAll('.card');
  if (!cards.length) return;
  saveState();
  document.querySelectorAll('.zone-label').forEach(l => l.remove());
  cards.forEach(c => { if (c._cleanup) c._cleanup(); c.style.animation = 'fadeIn 0.3s ease reverse'; setTimeout(() => c.remove(), 280); });
  setTimeout(() => { cardId = 0; nextColorIdx = 0; createCard('counter', { skipSave: true }); }, 350);
}

// ── Reset workspace ──
function resetWorkspace() {
  const btn = document.getElementById('btn-reset-ws');
  if (!btn.dataset.confirm) {
    btn.dataset.confirm = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'rgba(255,80,80,0.5)';
    setTimeout(() => { delete btn.dataset.confirm; btn.textContent = 'Réinitialiser'; btn.style.background = ''; }, 2000);
    return;
  }
  localStorage.removeItem('workspace');
  location.reload();
}

// ── Ctrl+Z ──
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

// ── Restore theme & load workspace ──
restoreTheme();

if (!loadWorkspace()) {
  createCard('counter', { skipSave: true });
}

// ── Onboarding tooltip ──
(function onboard() {
  if (localStorage.getItem('onboarded')) return;
  const firstCard = document.querySelector('.card');
  if (!firstCard) return;
  const tip = document.createElement('div');
  tip.className = 'onboard-tip';
  tip.textContent = 'Glisse les cartes pour les réorganiser';
  document.getElementById('container').appendChild(tip);
  function positionTip() {
    tip.style.left = firstCard.offsetLeft + 'px';
    tip.style.top = (firstCard.offsetTop - 44) + 'px';
  }
  positionTip();
  function dismiss() {
    tip.style.opacity = '0';
    tip.style.transition = 'opacity 0.3s';
    setTimeout(() => tip.remove(), 300);
    localStorage.setItem('onboarded', '1');
    document.removeEventListener('mousedown', onDrag);
    document.removeEventListener('touchstart', onDrag);
  }
  function onDrag(e) {
    if (e.target.closest('.drag-handle')) dismiss();
  }
  document.addEventListener('mousedown', onDrag);
  document.addEventListener('touchstart', onDrag);
  setTimeout(dismiss, 4000);
})();
