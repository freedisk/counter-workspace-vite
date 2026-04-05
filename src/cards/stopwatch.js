import { fmtTime } from '../utils.js';
import { scheduleSave } from '../persistence.js';

export default function buildStopwatch(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  card.dataset.count = '0';
  let elapsed = 0, startTime = 0, running = false, raf;
  const laps = [];
  let hotkey = opts.hotkey || '';
  card.dataset.hotkey = hotkey;
  card._cleanup = () => { running = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', onHotkey); };

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="display" id="disp-${id}" style="color:${accent}">00:00.00</div>
    <div class="hotkey-bar">
      <span class="hotkey-label">Raccourci :</span>
      <button class="hotkey-badge" id="hk-${id}" aria-label="Attribuer un raccourci clavier">${hotkey || 'Aucun'}</button>
      <button class="hotkey-clear btn-xs" id="hk-clear-${id}" style="${hotkey ? '' : 'display:none'}">✕</button>
    </div>
    <div class="buttons">
      <button class="btn-play" data-action="toggle">▶</button>
      <button class="btn-sm" data-action="lap" disabled>Tour</button>
      <button class="btn-sm" data-action="reset">RAZ</button>
    </div>
    <div class="lap-list" id="laps-${id}"></div>
    ${bottomHTML}`;

  const el = document.getElementById(`disp-${id}`);
  const toggleBtn = card.querySelector('[data-action="toggle"]');
  const lapBtn = card.querySelector('[data-action="lap"]');
  const lapList = document.getElementById(`laps-${id}`);
  const hkBadge = document.getElementById(`hk-${id}`);
  const hkClear = document.getElementById(`hk-clear-${id}`);
  let waitingForKey = false;

  function currentMs() {
    return running ? elapsed + (Date.now() - startTime) : elapsed;
  }

  function render() {
    const now = currentMs();
    el.textContent = fmtTime(now);
    card.dataset.count = String(Math.floor(now / 1000));
    if (running) raf = requestAnimationFrame(render);
  }

  function renderLaps() {
    lapList.innerHTML = laps.map((lap, i) => {
      const num = laps.length - i;
      const delta = i === 0 ? lap.total : lap.total - laps[i - 1].total;
      return `<div class="lap-row">
        <span class="lap-num">#${num}</span>
        <span class="lap-delta">${fmtTime(delta)}</span>
        <span class="lap-total">${fmtTime(lap.total)}</span>
      </div>`;
    }).reverse().join('');
  }

  // ── Toggle (shared by button and hotkey) ──
  function doToggle() {
    if (running) {
      running = false; elapsed += Date.now() - startTime;
      toggleBtn.textContent = '▶'; cancelAnimationFrame(raf);
      el.style.color = accent;
      lapBtn.disabled = true;
    } else {
      running = true; startTime = Date.now();
      toggleBtn.textContent = '⏸'; el.style.color = '#76ff03';
      lapBtn.disabled = false;
      render();
    }
  }

  // ── Hotkey assignment ──
  function keyLabel(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    let key = e.key;
    if (key === ' ') key = 'Espace';
    else if (key.length === 1) key = key.toUpperCase();
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) parts.push(key);
    return parts.join('+');
  }

  function setHotkey(label) {
    hotkey = label;
    card.dataset.hotkey = hotkey;
    hkBadge.textContent = hotkey || 'Aucun';
    hkBadge.classList.toggle('active', false);
    hkClear.style.display = hotkey ? '' : 'none';
    waitingForKey = false;
    scheduleSave();
  }

  hkBadge.addEventListener('click', (e) => {
    e.stopPropagation();
    if (waitingForKey) {
      // Cancel assignment
      waitingForKey = false;
      hkBadge.textContent = hotkey || 'Aucun';
      hkBadge.classList.remove('active');
      return;
    }
    waitingForKey = true;
    hkBadge.textContent = 'Appuie…';
    hkBadge.classList.add('active');
  });

  hkClear.addEventListener('click', (e) => {
    e.stopPropagation();
    setHotkey('');
  });

  // ── Global key listener ──
  function onHotkey(e) {
    // Assignment mode: capture the pressed key
    if (waitingForKey) {
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // wait for actual key
      e.preventDefault();
      e.stopPropagation();
      setHotkey(keyLabel(e));
      return;
    }
    // Trigger mode: match hotkey
    if (!hotkey) return;
    // Don't trigger when typing in inputs
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    if (keyLabel(e) === hotkey) {
      e.preventDefault();
      doToggle();
    }
  }
  document.addEventListener('keydown', onHotkey);

  // ── Button events ──
  lapBtn.addEventListener('click', () => {
    if (!running) return;
    const total = currentMs();
    laps.push({ total });
    renderLaps();
  });

  toggleBtn.addEventListener('click', doToggle);

  card.querySelector('[data-action="reset"]').addEventListener('click', () => {
    running = false; elapsed = 0; cancelAnimationFrame(raf);
    toggleBtn.textContent = '▶'; el.textContent = '00:00.00';
    el.style.color = accent; card.dataset.count = '0';
    lapBtn.disabled = true;
    laps.length = 0;
    lapList.innerHTML = '';
  });
}
