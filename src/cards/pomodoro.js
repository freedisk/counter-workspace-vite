import { fmtTime } from '../utils.js';

export default function buildPomodoro(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  const cfg = opts.pomodoroConfig || { work: 25, shortBreak: 5, longBreak: 15, cycles: 4 };
  card.dataset.count = '0';
  card.dataset.pomodoroConfig = JSON.stringify(cfg);

  let remaining = 0, startTime = 0, running = false, paused = false, raf;
  card._cleanup = () => { running = false; cancelAnimationFrame(raf); };
  let phase = 'work';
  let currentCycle = 0;

  const phaseLabels = { work: 'Travail', shortBreak: 'Pause courte', longBreak: 'Pause longue' };

  function buildCycleDotsHTML() {
    let dots = '';
    for (let i = 0; i < cfg.cycles; i++) dots += '<div class="pomo-dot"></div>';
    return dots;
  }

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="pomo-config">
      <div class="pomo-field" data-key="work">
        <div class="pomo-field-label">Travail</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.work}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="shortBreak">
        <div class="pomo-field-label">Pause</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.shortBreak}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="longBreak">
        <div class="pomo-field-label">Longue</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.longBreak}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="cycles">
        <div class="pomo-field-label">Cycles</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.cycles}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
    </div>
    <div class="pomo-cycles">${buildCycleDotsHTML()}</div>
    <div class="display" id="disp-${id}" style="color:${accent}; display:none;">25:00</div>
    <div class="pomo-phase" id="phase-${id}" style="display:none;">Travail</div>
    <div class="buttons">
      <button class="btn-play" data-action="toggle">▶</button>
      <button class="btn-sm" data-action="skip">⏭</button>
      <button class="btn-sm" data-action="reset">RAZ</button>
    </div>
    ${bottomHTML}`;

  const el = document.getElementById('disp-' + id);
  const phaseEl = document.getElementById('phase-' + id);
  const toggleBtn = card.querySelector('[data-action="toggle"]');
  const configEl = card.querySelector('.pomo-config');
  const cyclesEl = card.querySelector('.pomo-cycles');
  const maxes = { work: 60, shortBreak: 30, longBreak: 60, cycles: 10 };
  const mins = { work: 1, shortBreak: 1, longBreak: 1, cycles: 1 };

  function showConfig() { configEl.classList.remove('hidden'); el.style.display = 'none'; phaseEl.style.display = 'none'; }
  function showTimer() { configEl.classList.add('hidden'); el.style.display = ''; phaseEl.style.display = ''; }

  function updateCycleDots() {
    const dots = cyclesEl.querySelectorAll('.pomo-dot');
    dots.forEach((d, i) => d.classList.toggle('filled', i < currentCycle));
  }

  function getPhaseColor() {
    const cs = getComputedStyle(document.body);
    if (phase === 'work') return accent;
    if (phase === 'shortBreak') return cs.getPropertyValue('--positive').trim();
    return '#64b5f6';
  }

  function startPhase() {
    const durations = { work: cfg.work, shortBreak: cfg.shortBreak, longBreak: cfg.longBreak };
    remaining = durations[phase] * 60 * 1000;
    startTime = Date.now();
    running = true; paused = false;
    toggleBtn.textContent = '⏸';
    phaseEl.textContent = phaseLabels[phase];
    const c = getPhaseColor();
    el.style.color = c;
    phaseEl.style.color = c;
    showTimer();
    render();
  }

  function nextPhase() {
    if (phase === 'work') {
      currentCycle++;
      updateCycleDots();
      if (currentCycle >= cfg.cycles) {
        phase = 'longBreak';
      } else {
        phase = 'shortBreak';
      }
    } else if (phase === 'shortBreak') {
      phase = 'work';
    } else {
      currentCycle = 0;
      updateCycleDots();
      phase = 'work';
    }
  }

  function flashAndNext() {
    running = false;
    cancelAnimationFrame(raf);
    card.classList.add('pomo-flash');
    setTimeout(() => {
      card.classList.remove('pomo-flash');
      nextPhase();
      startPhase();
    }, 1000);
  }

  function render() {
    const now = running ? remaining - (Date.now() - startTime) : remaining;
    if (now <= 0) {
      flashAndNext();
      return;
    }
    el.textContent = fmtTime(now);
    card.dataset.count = String(Math.ceil(now / 1000));
    if (running) raf = requestAnimationFrame(render);
  }

  // Config arrows with hold
  card.querySelectorAll('.pomo-field').forEach(field => {
    const key = field.dataset.key;
    field.querySelectorAll('.cd-arrow').forEach(arrow => {
      const dir = arrow.dataset.dir === 'up' ? 1 : -1;
      let ht = null, hd;
      function step() {
        cfg[key] = Math.max(mins[key], Math.min(maxes[key], cfg[key] + dir));
        field.querySelector('.pomo-field-val').textContent = cfg[key];
        card.dataset.pomodoroConfig = JSON.stringify(cfg);
        if (key === 'cycles') {
          cyclesEl.innerHTML = buildCycleDotsHTML();
          updateCycleDots();
        }
      }
      function startH() { hd = 300; step(); (function t() { ht = setTimeout(() => { step(); hd = Math.max(60, hd * 0.8); t(); }, hd); })(); }
      function stopH() { clearTimeout(ht); ht = null; }
      arrow.addEventListener('mousedown', startH);
      arrow.addEventListener('touchstart', e => { e.preventDefault(); startH(); });
      arrow.addEventListener('mouseup', stopH);
      arrow.addEventListener('mouseleave', stopH);
      arrow.addEventListener('touchend', stopH);
      arrow.addEventListener('touchcancel', stopH);
    });
  });

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
      render();
    } else {
      phase = 'work'; currentCycle = 0; updateCycleDots();
      startPhase();
    }
  });

  card.querySelector('[data-action="skip"]').addEventListener('click', () => {
    if (running || paused) {
      running = false; paused = false; cancelAnimationFrame(raf);
      nextPhase();
      startPhase();
    }
  });

  card.querySelector('[data-action="reset"]').addEventListener('click', () => {
    running = false; paused = false; cancelAnimationFrame(raf);
    toggleBtn.textContent = '▶';
    phase = 'work'; currentCycle = 0; updateCycleDots();
    showConfig();
    el.style.color = accent;
    card.dataset.count = '0';
  });
}
