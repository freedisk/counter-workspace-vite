import { fmtTime } from '../utils.js';

const TOTAL_MS = 60 * 1000;
const CIRCUMFERENCE = 2 * Math.PI * 54;

export default function buildTimer(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  card.dataset.count = '0';
  let remaining = TOTAL_MS, startTime = 0, running = false, raf;
  card._cleanup = () => { running = false; cancelAnimationFrame(raf); };

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="timer-ring-wrap">
      <svg class="timer-ring" viewBox="0 0 120 120">
        <circle class="timer-ring-bg" cx="60" cy="60" r="54" />
        <circle class="timer-ring-progress" id="ring-${id}" cx="60" cy="60" r="54"
          stroke="${accent}"
          stroke-dasharray="${CIRCUMFERENCE}"
          stroke-dashoffset="0" />
      </svg>
      <div class="timer-ring-time" id="disp-${id}" style="color:${accent}">1:00</div>
    </div>
    <div class="buttons">
      <button class="btn-play" data-action="toggle">▶</button>
      <button class="btn-sm" data-action="reset">RAZ</button>
    </div>
    ${bottomHTML}`;

  const el = document.getElementById(`disp-${id}`);
  const ring = document.getElementById(`ring-${id}`);
  const toggleBtn = card.querySelector('[data-action="toggle"]');

  function updateRing(ms) {
    const pct = Math.max(0, ms / TOTAL_MS);
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
    const cs = getComputedStyle(document.body);
    const color = pct > 0.25 ? accent : pct > 0.1 ? cs.getPropertyValue('--warn').trim() : cs.getPropertyValue('--negative').trim();
    ring.style.stroke = color;
    el.style.color = color;
  }

  function fmtShort(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  function render() {
    const now = running ? remaining - (Date.now() - startTime) : remaining;
    if (now <= 0) {
      remaining = 0; running = false; cancelAnimationFrame(raf);
      el.textContent = '0:00';
      updateRing(0);
      toggleBtn.textContent = '▶';
      card.dataset.count = '0';
      card.classList.add('pomo-flash');
      setTimeout(() => card.classList.remove('pomo-flash'), 1000);
      return;
    }
    el.textContent = fmtShort(now);
    card.dataset.count = String(Math.ceil(now / 1000));
    updateRing(now);
    if (running) raf = requestAnimationFrame(render);
  }

  // Initial display
  updateRing(TOTAL_MS);

  let paused = false;

  toggleBtn.addEventListener('click', () => {
    if (running) {
      running = false; paused = true;
      remaining -= (Date.now() - startTime);
      cancelAnimationFrame(raf);
      toggleBtn.textContent = '▶';
      el.textContent = fmtShort(remaining);
    } else if (paused && remaining > 0) {
      running = true; startTime = Date.now();
      toggleBtn.textContent = '⏸';
      render();
    } else {
      remaining = TOTAL_MS; paused = false;
      running = true; startTime = Date.now();
      toggleBtn.textContent = '⏸';
      render();
    }
  });

  card.querySelector('[data-action="reset"]').addEventListener('click', () => {
    running = false; paused = false; cancelAnimationFrame(raf);
    remaining = TOTAL_MS;
    toggleBtn.textContent = '▶';
    el.textContent = fmtShort(TOTAL_MS);
    updateRing(TOTAL_MS);
    card.dataset.count = '0';
  });
}
