// Instellingen (voor papa): geluid, soundcheck opnieuw, alles wissen.
import { h, tap, go } from '../ui.js';
import { setEnabled } from '../audio.js';
import { setMusicEnabled } from '../music.js';
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
      <button class="btn music">${s.settings.music ? '🎵 Muziek staat aan' : '🎵 Muziek staat uit'}</button>
      <button class="btn redo">🎤 Soundcheck opnieuw doen</button>
      ${store.isTest()
        ? `<button class="btn primary test-off">↩️ Terug naar het spel van Lewis</button>
           <button class="btn danger wipe">🗑️ Testprofiel opnieuw beginnen</button>
           <p class="small">🧪 Je zit in de testmodus: alles is open. Wat je hier doet telt niet mee voor Lewis.</p>`
        : `<button class="btn test-on">🧪 Testmodus (voor ouders)</button>
           <button class="btn danger wipe">🗑️ Alles wissen</button>`}
      <p class="small">Tip: zet het spel op je beginscherm (Deel → Zet op beginscherm). Dan werkt het ook zonder internet.</p>
      <p class="small">🎶 Muziek: Paul Yudin, Aurec, Nastelbom en SoundSurfer, via Pixabay Music (Pixabay-licentie).</p>
    </div>
  </div>`);
  tap(el.querySelector('.back'), () => go('home'));
  tap(el.querySelector('.sound'), () => {
    s.settings.sound = !s.settings.sound;
    setEnabled(s.settings.sound);
    store.save();
    go('settings');
  });
  tap(el.querySelector('.music'), () => {
    s.settings.music = !s.settings.music;
    setMusicEnabled(s.settings.music);
    store.save();
    go('settings');
  });
  tap(el.querySelector('.redo'), () => go('soundcheck'));
  tap(el.querySelector('.wipe'), () => {
    if (store.isTest()) {
      if (confirm('Testprofiel opnieuw beginnen? (Lewis\' spel blijft zoals het is.)')) { store.reset(); go('home'); }
      return;
    }
    if (confirm('Weet je het zeker? Alle speakers, sterren en records worden gewist.')
      && confirm('Echt alles wissen?')) {
      store.reset();
      go('start');
    }
  });
  const on = el.querySelector('.test-on');
  if (on) tap(on, () => {
    // Ouder-check: een som die te moeilijk is voor groep 5.
    const a = 13 + Math.floor(Math.random() * 7);
    const b = 13 + Math.floor(Math.random() * 7);
    const answer = prompt(`Ouder-check: hoeveel is ${a} × ${b}?`);
    if (answer === null) return;
    if (Number(answer.trim()) !== a * b) { alert('Helaas, dat is niet goed.'); return; }
    store.save();
    store.setTestMode(true);
  });
  const off = el.querySelector('.test-off');
  if (off) tap(off, () => store.setTestMode(false));
  return { el };
}
