// Instellingen (voor papa): geluid, soundcheck opnieuw, alles wissen.
import { h, tap, go } from '../ui.js';
import { setEnabled } from '../audio.js';
import * as store from '../store.js';

export function settingsScreen() {
  const s = store.get();
  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Terug">←</button>
      <h2>⚙️ Instellingen</h2>
      <span></span>
    </header>
    <div class="settings-page">
      <button class="btn sound">${s.settings.sound ? '🔊 Geluid staat aan' : '🔇 Geluid staat uit'}</button>
      <button class="btn redo">🎤 Soundcheck opnieuw doen</button>
      <button class="btn danger wipe">🗑️ Alles wissen</button>
      <p class="small">Tip: zet het spel op je beginscherm (Deel → Zet op beginscherm). Dan werkt het ook zonder internet.</p>
    </div>
  </div>`);
  tap(el.querySelector('.back'), () => go('home'));
  tap(el.querySelector('.sound'), () => {
    s.settings.sound = !s.settings.sound;
    setEnabled(s.settings.sound);
    store.save();
    go('settings');
  });
  tap(el.querySelector('.redo'), () => go('soundcheck'));
  tap(el.querySelector('.wipe'), () => {
    if (confirm('Weet je het zeker? Alle speakers, sterren en records worden gewist.')
      && confirm('Echt alles wissen?')) {
      store.reset();
      go('start');
    }
  });
  return { el };
}
