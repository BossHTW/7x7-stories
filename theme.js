(() => {
  'use strict';
  const key = '7x7-appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved = null;
  try { saved = localStorage.getItem(key); } catch { /* Appearance still works without storage. */ }
  let chosen = saved === 'dark' || saved === 'light' ? saved : null;
  const apply = theme => {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(button => button.setAttribute('aria-pressed',String(theme === 'dark')));
  };
  apply(chosen || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded',() => {
    apply(document.documentElement.dataset.theme);
    document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click',() => {
      chosen = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key,chosen); } catch { /* Keep the choice for this page. */ }
      apply(chosen);
    }));
  });
  system.addEventListener('change',event => { if (!chosen) apply(event.matches ? 'dark' : 'light'); });
})();
