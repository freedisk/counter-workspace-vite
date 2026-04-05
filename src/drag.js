import { scheduleSave } from './persistence.js';
import { updateContainerHeight } from './utils.js';

let currentDragCard = null, dragSX, dragSY, dragOX, dragOY;

document.addEventListener('mousemove', e => {
  if (!currentDragCard) return;
  currentDragCard.style.left = (dragOX + e.clientX - dragSX) + 'px';
  currentDragCard.style.top = (dragOY + e.clientY - dragSY) + 'px';
});
document.addEventListener('touchmove', e => {
  if (!currentDragCard) return;
  const t = e.touches[0];
  currentDragCard.style.left = (dragOX + t.clientX - dragSX) + 'px';
  currentDragCard.style.top = (dragOY + t.clientY - dragSY) + 'px';
});

function endDrag() {
  if (!currentDragCard) return;
  currentDragCard.classList.remove('dragging');
  currentDragCard = null;
  scheduleSave();
  updateContainerHeight();
}
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

export function bindDrag(card) {
  const handle = card.querySelector('.drag-handle');
  function start(e) {
    currentDragCard = card; card.classList.add('dragging');
    const ev = e.touches ? e.touches[0] : e;
    dragSX = ev.clientX; dragSY = ev.clientY; dragOX = card.offsetLeft; dragOY = card.offsetTop;
    e.preventDefault();
  }
  handle.addEventListener('mousedown', start);
  handle.addEventListener('touchstart', start);
}
