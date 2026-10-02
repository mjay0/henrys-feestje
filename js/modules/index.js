// Register van alle rekenmodules. Een nieuwe module (bijv. deelsommen,
// klokkijken, breuken) is een los bestand met dezelfde vorm; voeg hem hier toe.
import tafels from './tafels.js';
import plusmin from './plusmin.js';

export const MODULES = [tafels, plusmin];

export function allPools() {
  return MODULES.flatMap((m) => m.pools().map((p) => ({ ...p, module: m })));
}

export function findPool(id) {
  return allPools().find((p) => p.id === id);
}

// Laat modules reageren op een antwoord (bijv. nieuwe stap vrijspelen).
export function afterRecord(key) {
  for (const m of MODULES) {
    const msg = m.afterRecord?.(key);
    if (msg) return msg;
  }
  return null;
}
