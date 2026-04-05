export default function buildDice(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  let mode = opts.diceMode || 'numeric';
  let faces = opts.diceFaces || 6;
  let customLabels = opts.diceLabels || ['Oui', 'Non'];
  let historyNum = [], historyDec = [];
  let rolling = false;
  card.dataset.count = '0';

  const diceTypes = [4, 6, 8, 10, 12, 20];

  function facesListHTML() {
    return customLabels.map((l, i) => `
      <div class="dice-face-row">
        <input class="dice-face-input" value="${l}" data-idx="${i}">
        <button class="dice-face-del" data-idx="${i}" ${customLabels.length <= 2 ? 'disabled' : ''}>×</button>
      </div>
    `).join('');
  }

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="dice-tabs">
      <div class="dice-tab ${mode === 'numeric' ? 'active' : ''}" data-mode="numeric">Numérique</div>
      <div class="dice-tab ${mode === 'decision' ? 'active' : ''}" data-mode="decision">Décision</div>
    </div>
    <div class="dice-mode-panel ${mode === 'numeric' ? 'active' : ''}" data-panel="numeric">
      <div class="dice-selector">
        ${diceTypes.map(d => '<div class="dice-type-btn ' + (d === faces ? 'active' : '') + '" data-d="' + d + '">d' + d + '</div>').join('')}
      </div>
      <div class="dice-result" id="result-${id}">-</div>
      <div class="dice-history" id="hist-num-${id}"></div>
    </div>
    <div class="dice-mode-panel ${mode === 'decision' ? 'active' : ''}" data-panel="decision">
      <div class="dice-presets">
        <div class="cd-preset" data-preset="pf">Pile/Face</div>
        <div class="cd-preset" data-preset="onp">Oui/Non/Peut-être</div>
      </div>
      <div class="dice-faces-list" id="faces-${id}">${facesListHTML()}</div>
      <div class="buttons" style="margin-bottom:1rem">
        <button class="btn-xs" data-action="add-face">+ Ajouter une face</button>
      </div>
      <div class="dice-result" id="result-dec-${id}">-</div>
      <div class="dice-history" id="hist-dec-${id}"></div>
    </div>
    <div class="buttons">
      <button class="btn-roll" data-action="roll">Lancer</button>
    </div>
    ${bottomHTML}`;

  const resultNum = document.getElementById('result-' + id);
  const resultDec = document.getElementById('result-dec-' + id);
  const histNumEl = document.getElementById('hist-num-' + id);
  const histDecEl = document.getElementById('hist-dec-' + id);
  const facesListEl = document.getElementById('faces-' + id);

  function saveDiceState() {
    card.dataset.diceMode = mode;
    card.dataset.diceFaces = faces;
    card.dataset.diceLabels = JSON.stringify(customLabels);
  }

  // Tabs
  card.querySelectorAll('.dice-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      card.querySelectorAll('.dice-tab').forEach(t => t.classList.toggle('active', t === tab));
      card.querySelectorAll('.dice-mode-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === mode));
      saveDiceState();
    });
  });

  // Dice type selector
  card.querySelectorAll('.dice-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      faces = parseInt(btn.dataset.d);
      card.querySelectorAll('.dice-type-btn').forEach(b => b.classList.toggle('active', b === btn));
      saveDiceState();
    });
  });

  // Face list management
  function rebuildFaces() {
    facesListEl.innerHTML = facesListHTML();
    bindFaceEvents();
    saveDiceState();
  }

  function bindFaceEvents() {
    facesListEl.querySelectorAll('.dice-face-input').forEach(inp => {
      inp.addEventListener('input', () => {
        customLabels[parseInt(inp.dataset.idx)] = inp.value;
        saveDiceState();
      });
      inp.addEventListener('mousedown', e => e.stopPropagation());
    });
    facesListEl.querySelectorAll('.dice-face-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (customLabels.length <= 2) return;
        customLabels.splice(parseInt(btn.dataset.idx), 1);
        rebuildFaces();
      });
    });
  }
  bindFaceEvents();

  card.querySelector('[data-action="add-face"]').addEventListener('click', () => {
    customLabels.push('');
    rebuildFaces();
    const inputs = facesListEl.querySelectorAll('.dice-face-input');
    inputs[inputs.length - 1].focus();
  });

  // Presets
  card.querySelectorAll('.dice-presets .cd-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.preset === 'pf') customLabels = ['Pile', 'Face'];
      else customLabels = ['Oui', 'Non', 'Peut-être'];
      rebuildFaces();
    });
  });

  // Roll animation
  function rollAnimation(getRandomDisplay, getFinal, resultEl, callback) {
    if (rolling) return;
    rolling = true;
    let count = 0;
    const interval = setInterval(() => {
      resultEl.textContent = getRandomDisplay();
      count++;
      if (count >= 12) {
        clearInterval(interval);
        const final = getFinal();
        resultEl.textContent = final;
        resultEl.classList.add('bump');
        setTimeout(() => resultEl.classList.remove('bump'), 200);
        rolling = false;
        callback(final);
      }
    }, 50);
  }

  card.querySelector('[data-action="roll"]').addEventListener('click', () => {
    if (rolling) return;
    if (mode === 'numeric') {
      rollAnimation(
        () => Math.floor(Math.random() * faces) + 1,
        () => Math.floor(Math.random() * faces) + 1,
        resultNum,
        (val) => {
          historyNum.unshift(val);
          if (historyNum.length > 5) historyNum.pop();
          histNumEl.textContent = historyNum.join(' → ');
          card.dataset.count = String(val);
        }
      );
    } else {
      const validLabels = customLabels.filter(l => l.trim());
      if (validLabels.length < 2) return;
      rollAnimation(
        () => validLabels[Math.floor(Math.random() * validLabels.length)],
        () => validLabels[Math.floor(Math.random() * validLabels.length)],
        resultDec,
        (val) => {
          historyDec.unshift(val);
          if (historyDec.length > 3) historyDec.pop();
          histDecEl.textContent = historyDec.join(' → ');
        }
      );
    }
  });

  saveDiceState();
}
