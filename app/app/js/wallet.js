/* Coins and the mascot's wardrobe, for this browser only (same rules as store.js: no accounts,
   every storage call guarded).

   Earning: a conversation counts once it has a written report with at least MIN_MESSAGES things
   you said. It pays COINS_PER_CONVERSATION, plus COINS_PER_GOAL for each goal you completed.
   Each report pays once, so reopening or re-writing it can't be farmed. Coins are never taken
   away except by buying something. */

import { COSMETICS, COSMETIC_BY_ID, SLOTS } from '../../mascot/cosmetics.js';
import { onSettings } from './store.js';

const KEY = 'convo-app-wallet';
export const MIN_MESSAGES = 3;
export const COINS_PER_CONVERSATION = 10;
export const COINS_PER_GOAL = 5;

/* Prices in coins. Cheap first items so the first conversation or two buys something. */
export const PRICES = {
  flower: 15, round: 15, bowtie: 20,
  beanie: 25, square: 25, scarf: 30,
  cap: 35, shades: 40, party: 45,
  heart: 50, medal: 60, chef: 70,
  star: 80, crown: 120,
};

const blank = () => ({ coins: 0, earned: 0, owned: [], equipped: { hat: null, glasses: null, neck: null }, awarded: [] });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return blank();
    const w = { ...blank(), ...raw };
    w.coins = Math.max(0, Math.floor(Number(w.coins)) || 0);
    w.earned = Math.max(0, Math.floor(Number(w.earned)) || 0);
    w.owned = Array.isArray(w.owned) ? w.owned.filter((id) => COSMETIC_BY_ID[id]) : [];
    w.awarded = Array.isArray(w.awarded) ? w.awarded.slice(-200) : [];
    w.equipped = { ...blank().equipped, ...(w.equipped || {}) };
    for (const slot of SLOTS) {
      const id = w.equipped[slot];
      if (id && !(w.owned.includes(id) && COSMETIC_BY_ID[id]?.slot === slot)) w.equipped[slot] = null;
    }
    return w;
  } catch { return blank(); }
}

let wallet = load();
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(getWallet()));
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(wallet)); } catch { /* storage unavailable */ }
  emit();
};

export const getWallet = () => ({ ...wallet, owned: wallet.owned.slice(), equipped: { ...wallet.equipped } });
export const onWallet = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const equippedNow = () => ({ ...wallet.equipped });
export const priceOf = (id) => PRICES[id] ?? 0;
export const owns = (id) => wallet.owned.includes(id);

/** What a finished conversation would pay, from its report. 0 if it doesn't count. */
export function rewardFor(report) {
  const said = (report?.transcript || []).filter((l) => l.who === 'you').length;
  if (said < MIN_MESSAGES) return { total: 0, base: 0, goals: 0, said };
  const done = (report.goals || []).filter((g) => g.done).length;
  const goals = done * COINS_PER_GOAL;
  return { total: COINS_PER_CONVERSATION + goals, base: COINS_PER_CONVERSATION, goals, said, done };
}

/** Pays for a report once. Returns the payout, or null if it was already paid or doesn't count. */
export function awardReport(report) {
  if (!report?.id || wallet.awarded.includes(report.id)) return null;
  const r = rewardFor(report);
  if (!r.total) return null;
  wallet.awarded = [...wallet.awarded, report.id].slice(-200);
  wallet.coins += r.total;
  wallet.earned += r.total;
  save();
  return r;
}

export const wasAwarded = (id) => wallet.awarded.includes(id);

export function buy(id) {
  const item = COSMETIC_BY_ID[id];
  if (!item) return { ok: false, reason: 'unknown' };
  if (owns(id)) return { ok: false, reason: 'owned' };
  const price = priceOf(id);
  if (wallet.coins < price) return { ok: false, reason: 'coins', short: price - wallet.coins };
  wallet.coins -= price;
  wallet.owned = [...wallet.owned, id];
  save();
  return { ok: true };
}

/** Wear an item (it must be owned), or take a slot off with id = null. */
export function equip(slot, id) {
  if (!SLOTS.includes(slot)) return false;
  if (id && !(owns(id) && COSMETIC_BY_ID[id].slot === slot)) return false;
  wallet.equipped = { ...wallet.equipped, [slot]: id || null };
  save();
  return true;
}

export const unequipAll = () => { wallet.equipped = blank().equipped; save(); };

/* "Clear my data" in settings empties everything, so the wallet goes too. */
onSettings(() => {
  let present = true;
  try { present = localStorage.getItem(KEY) != null; } catch { /* ignore */ }
  if (!present && (wallet.coins || wallet.owned.length || wallet.awarded.length)) { wallet = blank(); emit(); }
});

export { COSMETICS, SLOTS };
