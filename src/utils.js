import { saveState } from './persistence.js';

export const ACCENT_COLORS = ['#fff','#ff6ec7','#00e5ff','#ffd600','#76ff03','#ff5252','#b388ff','#64ffda','#ff9100'];

export function fmtTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

export function bindHold(el, onStep) {
  let timer = null, delay;
  function start() {
    saveState(); delay = 400; onStep();
    (function tick() {
      timer = setTimeout(() => { onStep(); delay = Math.max(30, delay * 0.85); tick(); }, delay);
    })();
  }
  function stop() { clearTimeout(timer); timer = null; }
  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', e => { e.preventDefault(); start(); });
  el.addEventListener('mouseup', stop);
  el.addEventListener('mouseleave', stop);
  el.addEventListener('touchend', stop);
  el.addEventListener('touchcancel', stop);
}

export function updateContainerHeight() {
  const container = document.getElementById('container');
  let maxBottom = 0;
  container.querySelectorAll('.card').forEach(c => {
    const bottom = c.offsetTop + c.offsetHeight;
    if (bottom > maxBottom) maxBottom = bottom;
  });
  container.style.minHeight = maxBottom ? (maxBottom + 40) + 'px' : '';
}
