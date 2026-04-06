import { saveState } from './persistence.js';
import { updateContainerHeight } from './utils.js';

export function toggleDropdown(id) {
  const menu = document.getElementById(id).querySelector('.toolbar-dropdown-menu');
  const isOpen = menu.classList.contains('open');
  closeDropdowns();
  if (!isOpen) menu.classList.add('open');
}

export function closeDropdowns() {
  document.querySelectorAll('.toolbar-dropdown-menu').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.toolbar-dropdown')) closeDropdowns();
});

function clearZoneLabels() {
  document.querySelectorAll('.zone-label').forEach(l => l.remove());
}

function addZoneLabel(text, x, y) {
  const lbl = document.createElement('div');
  lbl.className = 'zone-label';
  lbl.textContent = text;
  lbl.style.left = x + 'px';
  lbl.style.top = y + 'px';
  document.getElementById('container').appendChild(lbl);
}

export function organizeGrid() {
  saveState(); clearZoneLabels();
  const cards = document.querySelectorAll('.card');
  const cols = Math.ceil(Math.sqrt(cards.length));
  const gapX = 340, gapY = 420;
  const totalW = cols * gapX;
  const startX = (window.innerWidth - totalW) / 2;
  cards.forEach((c, i) => {
    c.style.left = (startX + (i % cols) * gapX) + 'px';
    c.style.top = (80 + Math.floor(i / cols) * gapY) + 'px';
  });
  setTimeout(updateContainerHeight, 450);
}

export function organizeRow() {
  saveState(); clearZoneLabels();
  const cards = document.querySelectorAll('.card');
  const gap = 320, totalW = cards.length * gap;
  const sx = Math.max(20, (window.innerWidth - totalW) / 2);
  const y = (window.innerHeight - 300) / 2;
  cards.forEach((c, i) => { c.style.left = (sx + i * gap) + 'px'; c.style.top = y + 'px'; });
  setTimeout(updateContainerHeight, 450);
}

export function organizeStack() {
  saveState(); clearZoneLabels();
  const cards = document.querySelectorAll('.card');
  const cx = (window.innerWidth - 300) / 2;
  cards.forEach((c, i) => { c.style.left = (cx + i * 20) + 'px'; c.style.top = (80 + i * 25) + 'px'; });
  setTimeout(updateContainerHeight, 450);
}

export function organizeGrouped() {
  saveState(); clearZoneLabels();

  const types = ['counter', 'stopwatch', 'countdown', 'pomodoro', 'dice', 'timer', 'workout'];
  const typeLabels = { counter: 'Compteurs', stopwatch: 'Chronomètres', countdown: 'Comptes à rebours', pomodoro: 'Pomodoros', dice: 'Dés', timer: 'Timers', workout: 'Workouts' };
  const groups = {};
  types.forEach(t => groups[t] = []);
  document.querySelectorAll('.card').forEach(c => {
    const t = c.dataset.type;
    if (groups[t]) groups[t].push(c);
  });

  const activeTypes = types.filter(t => groups[t].length > 0);
  if (!activeTypes.length) return;

  const margin = 30;
  const toolbarH = 65;
  const zoneWidth = Math.floor((window.innerWidth - margin * (activeTypes.length + 1)) / activeTypes.length);
  const cardW = 300;
  const gapY = 420;

  activeTypes.forEach((type, zoneIdx) => {
    const zoneX = margin + zoneIdx * (zoneWidth + margin);
    const cards = groups[type];
    const cols = Math.max(1, Math.floor(zoneWidth / (cardW + 20)));
    const cardStartX = zoneX + (zoneWidth - Math.min(cards.length, cols) * (cardW + 20)) / 2;

    addZoneLabel(typeLabels[type], zoneX + zoneWidth / 2 - 60, toolbarH + 10);

    cards.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      c.style.left = (cardStartX + col * (cardW + 20)) + 'px';
      c.style.top = (toolbarH + 40 + row * gapY) + 'px';
    });
  });
  setTimeout(updateContainerHeight, 450);
}
