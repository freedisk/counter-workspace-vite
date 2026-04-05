import { fmtTime } from '../utils.js';

export default function buildCountdown(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  card.dataset.count = '0';
  let totalMs = 0, remaining = 0, startTime = 0, running = false, raf;
  card._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  const vals = { h: 0, m: 5, s: 0 };

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="cd-picker">
      <div class="cd-unit" data-unit="h">
        <div class="cd-unit-label">heures</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="cd-val">00</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="cd-separator">:</div>
      <div class="cd-unit" data-unit="m">
        <div class="cd-unit-label">minutes</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="cd-val">05</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="cd-separator">:</div>
      <div class="cd-unit" data-unit="s">
        <div class="cd-unit-label">secondes</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="cd-val">00</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
    </div>
    <div class="cd-presets">
      <div class="cd-preset" data-t="30">30s</div>
      <div class="cd-preset" data-t="60">1m</div>
      <div class="cd-preset" data-t="120">2m</div>
      <div class="cd-preset" data-t="300">5m</div>
      <div class="cd-preset" data-t="600">10m</div>
      <div class="cd-preset" data-t="900">15m</div>
      <div class="cd-preset" data-t="1800">30m</div>
      <div class="cd-preset" data-t="3600">1h</div>
    </div>
    <div class="display" id="disp-${id}" style="color:${accent}; display:none;">05:00.00</div>
    <div class="buttons">
      <button class="btn-play" data-action="toggle">▶</button>
      <button class="btn-sm" data-action="reset">RAZ</button>
    </div>
    ${bottomHTML}`;

  const el = document.getElementById(`disp-${id}`);
  const toggleBtn = card.querySelector('[data-action="toggle"]');
  const picker = card.querySelector('.cd-picker');
  const presets = card.querySelector('.cd-presets');
  const units = card.querySelectorAll('.cd-unit');
  const maxes = { h: 23, m: 59, s: 59 };

  function syncPicker() {
    units.forEach(u => {
      u.querySelector('.cd-val').textContent = String(vals[u.dataset.unit]).padStart(2, '0');
    });
    remaining = (vals.h * 3600 + vals.m * 60 + vals.s) * 1000;
    totalMs = remaining;
    card.dataset.count = String(Math.ceil(remaining / 1000));
  }

  function setFromSeconds(sec) {
    vals.h = Math.floor(sec / 3600);
    vals.m = Math.floor((sec % 3600) / 60);
    vals.s = sec % 60;
    syncPicker();
  }

  units.forEach(u => {
    const key = u.dataset.unit;
    u.querySelectorAll('.cd-arrow').forEach(arrow => {
      const dir = arrow.dataset.dir === 'up' ? 1 : -1;
      let ht = null, hd;
      function step() { vals[key] = (vals[key] + dir + maxes[key] + 1) % (maxes[key] + 1); syncPicker(); }
      function startH() { hd = 300; step(); (function t() { ht = setTimeout(() => { step(); hd = Math.max(60, hd * 0.8); t(); }, hd); })(); }
      function stopH() { clearTimeout(ht); ht = null; }
      arrow.addEventListener('mousedown', startH);
      arrow.addEventListener('touchstart', e => { e.preventDefault(); startH(); });
      arrow.addEventListener('mouseup', stopH);
      arrow.addEventListener('mouseleave', stopH);
      arrow.addEventListener('touchend', stopH);
      arrow.addEventListener('touchcancel', stopH);
    });
    u.addEventListener('wheel', e => {
      e.preventDefault();
      vals[key] = (vals[key] + (e.deltaY < 0 ? 1 : -1) + maxes[key] + 1) % (maxes[key] + 1);
      syncPicker();
    }, { passive: false });
  });

  card.querySelectorAll('.cd-preset').forEach(btn => {
    btn.addEventListener('click', () => setFromSeconds(parseInt(btn.dataset.t)));
  });

  function showPicker() { picker.classList.remove('hidden'); presets.classList.remove('hidden'); el.style.display = 'none'; }
  function showDisplay() { picker.classList.add('hidden'); presets.classList.add('hidden'); el.style.display = ''; }

  function render() {
    const now = running ? remaining - (Date.now() - startTime) : remaining;
    if (now <= 0) {
      remaining = 0; running = false; cancelAnimationFrame(raf);
      el.textContent = '00:00.00'; el.style.color = '#ff5252';
      el.classList.add('bump'); setTimeout(() => el.classList.remove('bump'), 300);
      toggleBtn.textContent = '▶'; card.dataset.count = '0';
      setTimeout(showPicker, 800);
      return;
    }
    el.textContent = fmtTime(now);
    card.dataset.count = String(Math.ceil(now / 1000));
    const pct = now / totalMs;
    const cs = getComputedStyle(document.body);
    el.style.color = pct > 0.25 ? accent : pct > 0.1 ? cs.getPropertyValue('--warn').trim() : cs.getPropertyValue('--negative').trim();
    if (running) raf = requestAnimationFrame(render);
  }

  syncPicker();

  let paused = false;

  toggleBtn.addEventListener('click', () => {
    if (running) {
      running = false; paused = true;
      remaining -= (Date.now() - startTime);
      cancelAnimationFrame(raf);
      toggleBtn.textContent = '▶';
      el.textContent = fmtTime(remaining);
    } else if (paused && remaining > 0) {
      running = true; startTime = Date.now();
      toggleBtn.textContent = '⏸';
      showDisplay(); render();
    } else {
      paused = false;
      remaining = (vals.h * 3600 + vals.m * 60 + vals.s) * 1000;
      totalMs = remaining;
      if (remaining <= 0) return;
      running = true; startTime = Date.now();
      toggleBtn.textContent = '⏸'; showDisplay(); render();
    }
  });

  card.querySelector('[data-action="reset"]').addEventListener('click', () => {
    running = false; paused = false; cancelAnimationFrame(raf); toggleBtn.textContent = '▶';
    vals.h = 0; vals.m = 5; vals.s = 0;
    syncPicker(); showPicker(); el.style.color = accent;
  });
}
