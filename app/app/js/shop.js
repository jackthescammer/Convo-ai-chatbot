/* Shop and wardrobe: spend coins on things for the mascot to wear, and choose what it wears.
   Tap an item to try it on the mascot; buy it with coins; wear or take it off. Coins come from
   finished conversations (see wallet.js). */

import { esc } from './ui.js';
import { mountMascots } from './kit.js';
import { COSMETICS, COSMETIC_BY_ID, SLOTS, SLOT_LABEL } from '../../mascot/cosmetics.js';
import {
  getWallet, onWallet, buy, equip, unequipAll, priceOf, owns,
  COINS_PER_CONVERSATION, COINS_PER_GOAL, MIN_MESSAGES,
} from './wallet.js';

export const COIN = '<svg class="coin" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#FFC21A" stroke="#E9A300" stroke-width="2"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#E9A300" stroke-width="1.6"/><path d="M9.6 12.2l1.7 1.7 3.3-3.6" fill="none" stroke="#B97F00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* Each slot is shown in a crop of the mascot's own coordinate space. */
const CROP = { hat: '-72 -184 144 90', glasses: '-48 -112 96 56', neck: '-64 -70 128 66', hand: '-30 -180 100 170' };
const thumb = (item) => `<svg class="shop-thumb" viewBox="${CROP[item.slot]}" aria-hidden="true" focusable="false">${item.svg}</svg>`;

export function render(root) {
  let slot = 'hat';
  let look = { ...getWallet().equipped };      // what the preview mascot wears (may include try-ons)
  let toastTimer = 0;
  let calmTimer = 0;

  root.innerHTML = `
  <div class="page shop">
    <header class="page-head">
      <h1 class="page-title">Shop</h1>
      <p class="page-lede">Finish conversations to earn coins, then dress Convo up.</p>
    </header>

    <div class="shop-grid">
      <aside class="shop-stage panel" aria-label="Your mascot">
        <div class="shop-balance" aria-live="polite">${COIN}<span><strong data-balance>0</strong> coins</span></div>
        <div class="shop-mascot" data-mascot="idle" data-size="100%" data-own-look></div>
        <p class="shop-trying" data-trying hidden></p>
        <div class="wearing" data-wearing></div>
        <button type="button" class="btn-quiet" data-clear>Take everything off</button>
        <p class="shop-earn">Earn <strong>${COINS_PER_CONVERSATION} coins</strong> for each conversation you finish with at least ${MIN_MESSAGES} messages, plus <strong>${COINS_PER_GOAL}</strong> for every goal you reach.</p>
      </aside>

      <section class="shop-items" aria-label="Items">
        <div class="shop-tabs" role="tablist" aria-label="Item type">
          ${SLOTS.map((s) => `<button type="button" role="tab" class="shop-tab" data-slot="${s}" aria-selected="${s === slot}">${esc(SLOT_LABEL[s])}</button>`).join('')}
        </div>
        <ul class="shop-list" data-list></ul>
      </section>
    </div>
    <p class="toast" data-toast role="status" aria-live="polite"></p>
  </div>`;

  const q = (sel) => root.querySelector(sel);
  const mascots = mountMascots(root);
  const mascot = () => mascots.get('.shop-mascot');
  const toast = (text) => {
    const t = q('[data-toast]');
    t.textContent = text;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-on'), 1800);
  };
  const cheer = (state) => {
    const m = mascot();
    if (!m) return;
    m.setState(state);
    clearTimeout(calmTimer);
    calmTimer = setTimeout(() => m.setState('idle'), 2200);
  };

  function paintMascot() {
    mascot()?.setCosmetics(look);
    const w = getWallet();
    const trying = SLOTS.map((s) => look[s]).filter((id) => id && !w.owned.includes(id)).map((id) => COSMETIC_BY_ID[id].name);
    const note = q('[data-trying]');
    note.hidden = !trying.length;
    note.textContent = trying.length ? `Trying on: ${trying.join(', ')}. Buy it to keep it.` : '';
  }

  function paintWearing() {
    const w = getWallet();
    q('[data-wearing]').innerHTML = SLOTS.map((s) => {
      const id = w.equipped[s];
      return `<div class="wearing-row"><span class="wearing-slot">${esc(SLOT_LABEL[s])}</span>
        <span class="wearing-item">${id ? esc(COSMETIC_BY_ID[id].name) : '<em>None</em>'}</span>
        ${id ? `<button type="button" class="text-link link-btn" data-off="${s}" aria-label="Take off ${esc(COSMETIC_BY_ID[id].name)}">Take off</button>` : ''}</div>`;
    }).join('');
    q('[data-clear]').disabled = !SLOTS.some((s) => w.equipped[s]);
  }

  function paintList() {
    const w = getWallet();
    q('[data-balance]').textContent = w.coins;
    q('[data-list]').innerHTML = COSMETICS.filter((c) => c.slot === slot).map((item) => {
      const have = w.owned.includes(item.id);
      const worn = w.equipped[slot] === item.id;
      const price = priceOf(item.id);
      const tried = look[slot] === item.id;
      let action;
      if (worn) action = `<button type="button" class="btn-quiet shop-act" data-wear="${item.id}" aria-pressed="true">Wearing · Take off</button>`;
      else if (have) action = `<button type="button" class="btn-quiet shop-act" data-wear="${item.id}">Wear</button>`;
      else if (w.coins >= price) action = `<button type="button" class="btn btn-primary shop-act" data-buy="${item.id}">Buy · ${price} ${COIN}</button>`;
      else action = `<button type="button" class="btn-quiet shop-act" disabled>${COIN} ${price} · ${price - w.coins} more</button>`;
      return `<li class="shop-card${tried ? ' is-tried' : ''}${worn ? ' is-worn' : ''}">
        <button type="button" class="shop-try" data-try="${item.id}" aria-pressed="${tried}" aria-label="Try on ${esc(item.name)}">
          ${thumb(item)}
          <span class="shop-name">${esc(item.name)}</span>
          <span class="shop-status">${have ? 'Owned' : `${COIN}${price}`}</span>
        </button>
        ${action}
      </li>`;
    }).join('');
  }

  const paintAll = () => { paintList(); paintWearing(); paintMascot(); };

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-slot]');
    if (tab) {
      slot = tab.dataset.slot;
      root.querySelectorAll('.shop-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      paintList();
      return;
    }
    const tryBtn = e.target.closest('[data-try]');
    if (tryBtn) {
      const id = tryBtn.dataset.try;
      look = { ...look, [slot]: look[slot] === id ? null : id };
      paintList(); paintMascot();
      if (look[slot]) mascot()?.poke('wiggle');
      return;
    }
    const buyBtn = e.target.closest('[data-buy]');
    if (buyBtn) {
      const id = buyBtn.dataset.buy;
      const r = buy(id);
      if (r.ok) {
        equip(COSMETIC_BY_ID[id].slot, id);
        look = { ...getWallet().equipped };
        paintAll();
        toast(`${COSMETIC_BY_ID[id].name} bought`);
        cheer('happy');
        mascot()?.poke('bounce');
      } else if (r.reason === 'coins') toast(`You need ${r.short} more coins`);
      return;
    }
    const wearBtn = e.target.closest('[data-wear]');
    if (wearBtn) {
      const id = wearBtn.dataset.wear;
      const wornNow = getWallet().equipped[slot] === id;
      equip(slot, wornNow ? null : id);
      look = { ...getWallet().equipped };
      paintAll();
      if (!wornNow) mascot()?.poke('wiggle');
      return;
    }
    const off = e.target.closest('[data-off]');
    if (off) { equip(off.dataset.off, null); look = { ...getWallet().equipped }; paintAll(); return; }
    if (e.target.closest('[data-clear]')) { unequipAll(); look = { ...getWallet().equipped }; paintAll(); }
  });

  /* Wallet changes (a purchase, equip, or cleared data) repaint everything. */
  const off = onWallet(paintAll);
  paintAll();

  return () => { off(); clearTimeout(toastTimer); clearTimeout(calmTimer); mascots.destroy(); };
}
