import { fmtTime } from '../utils.js';
import { saveState, scheduleSave } from '../persistence.js';

export default function buildWorkout(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  const cfg = opts.workoutConfig || { sets: 4, reps: 12, weight: 20, rest: 90 };
  card.dataset.workoutConfig = JSON.stringify(cfg);

  // Completed sets history: [{ reps, weight, done }]
  const completedSets = opts.workoutSets ? [...opts.workoutSets] : [];
  card.dataset.workoutSets = JSON.stringify(completedSets);

  let currentSet = completedSets.filter(s => s.done).length;
  let resting = false, restRunning = false, restPaused = false;
  let restRemaining = 0, restStartTime = 0, raf;
  let finished = false;

  card._cleanup = () => { restRunning = false; cancelAnimationFrame(raf); };

  function buildSetDotsHTML() {
    let dots = '';
    for (let i = 0; i < cfg.sets; i++) {
      const cls = i < currentSet ? 'filled' : (i === currentSet && !finished ? 'current' : '');
      dots += `<div class="workout-dot ${cls}"></div>`;
    }
    return dots;
  }

  function buildHistoryHTML() {
    if (!completedSets.length) return '';
    return completedSets.map((s, i) =>
      `<div class="workout-history-row">
        <span class="workout-history-num">#${i + 1}</span>
        <span class="workout-history-detail">${s.reps} reps × ${s.weight} kg</span>
        <span class="workout-history-check">${s.done ? '✓' : '…'}</span>
      </div>`
    ).join('');
  }

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="workout-config" id="wcfg-${id}">
      <div class="pomo-field" data-key="sets">
        <div class="pomo-field-label">Séries</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.sets}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="reps">
        <div class="pomo-field-label">Reps</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.reps}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="weight">
        <div class="pomo-field-label">Poids (kg)</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.weight}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
      <div class="pomo-field" data-key="rest">
        <div class="pomo-field-label">Repos (s)</div>
        <div class="cd-arrow" data-dir="up">▲</div>
        <div class="pomo-field-val">${cfg.rest}</div>
        <div class="cd-arrow" data-dir="down">▼</div>
      </div>
    </div>
    <div class="workout-dots" id="wdots-${id}">${buildSetDotsHTML()}</div>
    <div class="workout-phase" id="wphase-${id}" style="display:none;"></div>
    <div class="display" id="wdisp-${id}" style="color:${accent}; display:none;">0:00</div>
    <div class="workout-history-list" id="whist-${id}">${buildHistoryHTML()}</div>
    <div class="buttons">
      <button class="btn-play" data-action="start" aria-label="Démarrer l'exercice">▶</button>
      <button class="btn-sm" data-action="validate" style="display:none;" aria-label="Valider la série">✓ Série</button>
      <button class="btn-sm" data-action="skip" style="display:none;" aria-label="Passer le repos">⏭</button>
      <button class="btn-sm" data-action="reset" aria-label="Réinitialiser">RAZ</button>
    </div>
    ${bottomHTML}`;

  const configEl = document.getElementById('wcfg-' + id);
  const dotsEl = document.getElementById('wdots-' + id);
  const phaseEl = document.getElementById('wphase-' + id);
  const dispEl = document.getElementById('wdisp-' + id);
  const histEl = document.getElementById('whist-' + id);
  const startBtn = card.querySelector('[data-action="start"]');
  const validateBtn = card.querySelector('[data-action="validate"]');
  const skipBtn = card.querySelector('[data-action="skip"]');
  const resetBtn = card.querySelector('[data-action="reset"]');

  const maxes = { sets: 20, reps: 100, weight: 500, rest: 300 };
  const mins = { sets: 1, reps: 1, weight: 0, rest: 10 };
  const steps = { sets: 1, reps: 1, weight: 0.5, rest: 5 };

  function updateDots() {
    dotsEl.innerHTML = buildSetDotsHTML();
  }

  function updateHistory() {
    histEl.innerHTML = buildHistoryHTML();
    card.dataset.workoutSets = JSON.stringify(completedSets);
  }

  function showConfig() {
    configEl.style.display = '';
    dispEl.style.display = 'none';
    phaseEl.style.display = 'none';
    validateBtn.style.display = 'none';
    skipBtn.style.display = 'none';
    startBtn.style.display = '';
    startBtn.textContent = '▶';
  }

  function showActive() {
    configEl.style.display = 'none';
    startBtn.style.display = 'none';
  }

  function enterSetPhase() {
    resting = false;
    showActive();
    phaseEl.style.display = '';
    phaseEl.textContent = `Série ${currentSet + 1} / ${cfg.sets}`;
    phaseEl.style.color = accent;
    dispEl.style.display = 'none';
    validateBtn.style.display = '';
    skipBtn.style.display = 'none';
  }

  function enterRestPhase() {
    resting = true;
    restRunning = true;
    restPaused = false;
    restRemaining = cfg.rest * 1000;
    restStartTime = Date.now();

    showActive();
    phaseEl.style.display = '';
    phaseEl.textContent = 'Repos';
    phaseEl.style.color = getComputedStyle(document.body).getPropertyValue('--positive').trim();
    dispEl.style.display = '';
    dispEl.style.color = getComputedStyle(document.body).getPropertyValue('--positive').trim();
    validateBtn.style.display = 'none';
    skipBtn.style.display = '';

    renderRest();
  }

  function renderRest() {
    const now = restRunning ? restRemaining - (Date.now() - restStartTime) : restRemaining;
    if (now <= 0) {
      restRunning = false;
      cancelAnimationFrame(raf);
      card.classList.add('pomo-flash');
      setTimeout(() => {
        card.classList.remove('pomo-flash');
        nextAfterRest();
      }, 800);
      return;
    }
    const secs = Math.ceil(now / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    dispEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (restRunning) raf = requestAnimationFrame(renderRest);
  }

  function nextAfterRest() {
    if (currentSet >= cfg.sets) {
      finishWorkout();
    } else {
      enterSetPhase();
    }
  }

  function finishWorkout() {
    finished = true;
    showActive();
    phaseEl.style.display = '';
    phaseEl.textContent = 'Terminé !';
    phaseEl.style.color = accent;
    dispEl.style.display = 'none';
    validateBtn.style.display = 'none';
    skipBtn.style.display = 'none';
    startBtn.style.display = '';
    startBtn.textContent = '▶';
    updateDots();
    card.classList.add('pomo-flash');
    setTimeout(() => card.classList.remove('pomo-flash'), 1000);
  }

  // Config arrows (reuse pomodoro pattern)
  card.querySelectorAll('#wcfg-' + id + ' .pomo-field').forEach(field => {
    const key = field.dataset.key;
    field.querySelectorAll('.cd-arrow').forEach(arrow => {
      const dir = arrow.dataset.dir === 'up' ? 1 : -1;
      let ht = null, hd;
      function step() {
        const s = steps[key] || 1;
        let val = cfg[key] + dir * s;
        // Round to avoid float issues with 0.5 steps
        val = Math.round(val * 10) / 10;
        cfg[key] = Math.max(mins[key], Math.min(maxes[key], val));
        field.querySelector('.pomo-field-val').textContent = cfg[key];
        card.dataset.workoutConfig = JSON.stringify(cfg);
        if (key === 'sets') {
          updateDots();
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

  // Start / resume
  startBtn.addEventListener('click', () => {
    if (finished) {
      // Restart
      currentSet = 0;
      completedSets.length = 0;
      finished = false;
      updateDots();
      updateHistory();
    }
    saveState();
    enterSetPhase();
  });

  // Validate current set
  validateBtn.addEventListener('click', () => {
    completedSets.push({ reps: cfg.reps, weight: cfg.weight, done: true });
    currentSet++;
    updateDots();
    updateHistory();
    scheduleSave();

    if (currentSet >= cfg.sets) {
      finishWorkout();
    } else {
      enterRestPhase();
    }
  });

  // Skip rest
  skipBtn.addEventListener('click', () => {
    restRunning = false;
    cancelAnimationFrame(raf);
    nextAfterRest();
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    restRunning = false;
    cancelAnimationFrame(raf);
    resting = false;
    finished = false;
    currentSet = 0;
    completedSets.length = 0;
    updateDots();
    updateHistory();
    showConfig();
    card.dataset.count = '0';
  });

  // Restore state if sets were already done
  if (completedSets.length > 0 && currentSet < cfg.sets) {
    card.dataset.count = String(currentSet);
  }
}
