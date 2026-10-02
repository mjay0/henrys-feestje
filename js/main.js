import * as store from './store.js';
import { register, go } from './ui.js';
import { setEnabled, resume } from './audio.js';
import * as music from './music.js';
import { raceScreen } from './screens/race.js';
import { startScreen, homeScreen, pickScreen } from './screens/home.js';
import { playScreen } from './screens/play.js';
import { partyScreen } from './screens/party.js';
import { soundcheckScreen } from './screens/soundcheck.js';
import { collectionScreen } from './screens/collection.js';
import { starsScreen } from './screens/stars.js';
import { settingsScreen } from './screens/settings.js';

store.load();
setEnabled(store.get().settings.sound);
music.setMusicEnabled(store.get().settings.music);

register('start', startScreen);
register('home', homeScreen);
register('pick', pickScreen);
register('play', playScreen);
register('race', raceScreen);
register('party', partyScreen);
register('soundcheck', soundcheckScreen);
register('collection', collectionScreen);
register('stars', starsScreen);
register('settings', settingsScreen);

go('start');

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { music.stop(0); store.save(); } else resume();
});

// Geen zoom door dubbeltikken of knijpen op iPad.
document.addEventListener('gesturestart', (e) => e.preventDefault());

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
