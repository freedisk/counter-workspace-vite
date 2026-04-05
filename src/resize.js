import { scheduleSave } from './persistence.js';
import { updateContainerHeight } from './utils.js';

const MIN_W = 220;
const MIN_H = 180;

let currentResizeCard = null, startX, startY, startW, startH;

document.addEventListener('mousemove', onMove);
document.addEventListener('touchmove', onMove, { passive: false });

function onMove(e) {
  if (!currentResizeCard) return;
  e.preventDefault();
  const ev = e.touches ? e.touches[0] : e;
  const w = Math.max(MIN_W, startW + ev.clientX - startX);
  const h = Math.max(MIN_H, startH + ev.clientY - startY);
  currentResizeCard.style.width = w + 'px';
  currentResizeCard.style.height = h + 'px';
}

function endResize() {
  if (!currentResizeCard) return;
  currentResizeCard.classList.remove('resizing');
  currentResizeCard = null;
  scheduleSave();
  updateContainerHeight();
}
document.addEventListener('mouseup', endResize);
document.addEventListener('touchend', endResize);

export function bindResize(card) {
  const handle = card.querySelector('.resize-handle');
  if (!handle) return;
  function start(e) {
    currentResizeCard = card;
    card.classList.add('resizing');
    const ev = e.touches ? e.touches[0] : e;
    startX = ev.clientX;
    startY = ev.clientY;
    startW = card.offsetWidth;
    startH = card.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  }
  handle.addEventListener('mousedown', start);
  handle.addEventListener('touchstart', start);
}
