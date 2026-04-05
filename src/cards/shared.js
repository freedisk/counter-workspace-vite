import { ACCENT_COLORS } from '../utils.js';
import { saveState } from '../persistence.js';

export function positionCard(card, opts, cardId) {
  if (opts.left && opts.top) {
    card.style.left = opts.left;
    card.style.top = opts.top;
    card.classList.add('no-transition');
    requestAnimationFrame(() => card.classList.remove('no-transition'));
  } else {
    const o = (cardId % 5) * 40;
    card.style.left = `calc(50% - 140px + ${o}px)`;
    card.style.top = `calc(50% - 150px + ${o}px)`;
  }
}

export function bindRemove(card) {
  card.querySelector('[data-action="remove"]').addEventListener('click', () => {
    if (document.querySelectorAll('.card').length > 1) {
      saveState();
      if (card._cleanup) card._cleanup();
      card.style.animation = 'fadeIn 0.3s ease reverse';
      setTimeout(() => card.remove(), 280);
    }
  });
}

export function buildCardShell({ card, id, type, accent, opts, nextColorIdx }) {
  const labels = { counter: 'Compteur', stopwatch: 'Chronomètre', countdown: 'Rebours', pomodoro: 'Pomodoro', dice: 'Dé', timer: 'Timer' };
  const placeholders = { counter: 'Nom du compteur…', stopwatch: 'Nom du chrono…', countdown: 'Nom du rebours…', pomodoro: 'Nom du pomodoro…', dice: 'Nom du dé…', timer: 'Nom du timer…' };

  const handleHTML = `<div class="drag-handle" aria-label="Déplacer la carte"><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
  const labelHTML = `<span class="card-type-label">${labels[type]}</span>`;
  const nameHTML = `<div class="card-name" contenteditable="true" data-placeholder="${placeholders[type]}" spellcheck="false">${opts.name || ''}</div>`;
  const cloneDot = `<span class="accent-dot" style="background:${ACCENT_COLORS[nextColorIdx % ACCENT_COLORS.length]}"></span>`;
  const bottomHTML = `
    <div class="buttons">
      <button class="btn-xs" data-action="clone-${type}">${cloneDot} Cloner</button>
      <button class="btn-xs btn-remove" data-action="remove">Supprimer</button>
    </div>`;

  return { handleHTML, labelHTML, nameHTML, bottomHTML };
}
