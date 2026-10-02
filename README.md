# Henry's Feestje

A Dutch maths game for group 5: times tables 1–10, plus and minus up to 100, and automatiseren (quick recall).
Henry the vacuum cleaner charges up a party speaker with every correct answer.

Runs entirely in the browser, offline too (add it to the iPad home screen). Progress is stored only on the device.

## Structure

- `js/modules/`: the maths modules. Each module provides `pools()` (practice sets with `items()` that generate questions).
  To add a new skill (division, telling time, fractions, …), create a new file in the same shape and add it to `modules/index.js`.
- `js/engine.js`: tracks how well each sum is known (box 0–5, where 5 = gold) and picks the weak sums more often.
- `js/rewards.js`: speakers (unlocked with watts) and the Henry family.
- `js/screens/`: the screens.
- `js/audio.js`: all sound is generated live with Web Audio.

Testing locally: serve the folder with any static server, e.g. `npx serve .`
After changing files, bump `CACHE` in `sw.js` so the iPad picks up the new version.
