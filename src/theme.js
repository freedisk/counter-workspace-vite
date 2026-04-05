export let currentTheme = 'violet';
export let isLight = false;

export function setTheme(name) {
  currentTheme = name;
  document.body.className = `theme-${name}` + (isLight ? ' light' : '');
  document.querySelectorAll('.theme-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === name);
  });
  localStorage.setItem('theme', name);
}

export function toggleMode() {
  isLight = !isLight;
  document.body.className = `theme-${currentTheme}` + (isLight ? ' light' : '');
  document.getElementById('mode-toggle').textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('lightMode', isLight);
}

export function restoreTheme() {
  const saved = localStorage.getItem('theme');
  const savedMode = localStorage.getItem('lightMode');
  if (saved) setTheme(saved);
  if (savedMode === 'true') toggleMode();
}
