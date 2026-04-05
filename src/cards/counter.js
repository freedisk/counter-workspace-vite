import { bindHold } from '../utils.js';
import { saveState } from '../persistence.js';

export default function buildCounter(card, id, accent, opts, handleHTML, labelHTML, nameHTML, bottomHTML) {
  const startVal = opts.startVal || 0;
  card.dataset.count = String(startVal);

  card.innerHTML = `
    ${handleHTML}${labelHTML}
    ${nameHTML}
    <div class="display" id="disp-${id}" style="color:${accent}" role="button" tabindex="0" aria-label="Modifier la valeur">${startVal}</div>
    <div class="edit-hint">clic pour modifier</div>
    <div class="buttons">
      <button class="hold-btn btn-sm" data-step="-1" aria-label="Décrémenter">-1</button>
      <button class="btn-sm" data-action="raz">RAZ</button>
      <button class="hold-btn btn-sm" data-step="1" aria-label="Incrémenter">+1</button>
    </div>
    ${bottomHTML}`;

  const el = document.getElementById(`disp-${id}`);

  function updateDisplay() {
    const v = parseInt(card.dataset.count);
    el.textContent = v;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 150);
    const cs = getComputedStyle(document.body);
    el.style.color = v > 0 ? accent : v < 0 ? cs.getPropertyValue('--negative').trim() : cs.getPropertyValue('--zero').trim();
  }

  card.querySelectorAll('.hold-btn').forEach(btn => {
    const step = parseInt(btn.dataset.step);
    bindHold(btn, () => { card.dataset.count = parseInt(card.dataset.count) + step; updateDisplay(); });
  });

  function openEditor() {
    const cur = card.dataset.count;
    const input = document.createElement('input');
    input.type = 'number'; input.className = 'counter-input';
    input.value = cur; input.style.color = el.style.color;
    el.style.display = 'none';
    el.parentNode.insertBefore(input, el);
    input.focus(); input.select();
    function commit() {
      saveState();
      card.dataset.count = String(parseInt(input.value) || 0);
      input.remove(); el.style.display = ''; updateDisplay();
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = cur; input.blur(); }
    });
  }
  el.addEventListener('click', openEditor);
  el.addEventListener('keydown', e => { if (e.key === 'Enter') openEditor(); });

  card.querySelector('[data-action="raz"]').addEventListener('click', () => {
    saveState(); card.dataset.count = '0'; updateDisplay();
  });
}
