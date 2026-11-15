/* The restaurant's menu: a panel that opens over the conversation and can be hidden and opened
   again at any time. Only the restaurant scenario has one. The dishes and prices are interface
   content from the menu picture the team made; they are not read by the model. */

import { esc, layered } from './ui.js';

export const MENU_SCENARIO = 'restaurant';

const L = (zh, py, en) => ({ zh, py, en });
export const MENU = {
  title: L('中餐馆', 'zhōng cān guǎn', 'Chinese restaurant'),
  heading: L('菜单', 'cài dān', 'Menu'),
  sections: [
    { name: L('热菜', 'rè cài', 'Hot dishes'), items: [
      [L('宫保鸡丁', 'gōng bǎo jī dīng', 'Kung Pao chicken'), 38],
      [L('麻婆豆腐', 'má pó dòu fu', 'Mapo tofu'), 36],
      [L('鱼香肉丝', 'yú xiāng ròu sī', 'Yuxiang shredded pork'), 40],
      [L('红烧肉', 'hóng shāo ròu', 'Red-braised pork'), 48],
      [L('清炒时菜', 'qīng chǎo shí cài', 'Stir-fried greens'), 28]] },
    { name: L('面食', 'miàn shí', 'Noodles'), items: [
      [L('牛肉面', 'niú ròu miàn', 'Beef noodles'), 42],
      [L('蛋炒面', 'dàn chǎo miàn', 'Egg fried noodles'), 32],
      [L('炸酱面', 'zhá jiàng miàn', 'Noodles with soybean sauce'), 34],
      [L('馄饨面', 'hún tun miàn', 'Wonton noodles'), 36]] },
    { name: L('点心', 'diǎn xīn', 'Dim sum'), items: [
      [L('小笼包', 'xiǎo lóng bāo', 'Soup dumplings'), 28],
      [L('饺子', 'jiǎo zi', 'Dumplings'), 26],
      [L('烧卖', 'shāo mài', 'Shumai'), 28],
      [L('春卷', 'chūn juǎn', 'Spring rolls'), 24]] },
    { name: L('饭类', 'fàn lèi', 'Rice'), items: [
      [L('扬州炒饭', 'yáng zhōu chǎo fàn', 'Yangzhou fried rice'), 34],
      [L('鸡肉炒饭', 'jī ròu chǎo fàn', 'Chicken fried rice'), 32],
      [L('牛肉炒饭', 'niú ròu chǎo fàn', 'Beef fried rice'), 38],
      [L('蛋炒饭', 'dàn chǎo fàn', 'Egg fried rice'), 28]] },
    { name: L('汤类', 'tāng lèi', 'Soups'), items: [
      [L('酸辣汤', 'suān là tāng', 'Hot and sour soup'), 24],
      [L('玉米汤', 'yù mǐ tāng', 'Corn soup'), 22],
      [L('鸡肉汤', 'jī ròu tāng', 'Chicken soup'), 26]] },
    { name: L('饮料', 'yǐn liào', 'Drinks'), items: [
      [L('绿茶', 'lǜ chá', 'Green tea'), 12],
      [L('乌龙茶', 'wū lóng chá', 'Oolong tea'), 14],
      [L('花茶', 'huā chá', 'Flower tea'), 16],
      [L('冰茶', 'bīng chá', 'Iced tea'), 14]] },
  ],
};

export const hasMenu = (scenarioId) => scenarioId === MENU_SCENARIO;

const BOOK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v15H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 5.5v15"/><path d="M9 8.5h6M9 12h6"/></svg>';

/** The button that opens and closes the menu (goes in the conversation's controls). */
export const menuButtonHTML = () => `
  <button type="button" class="btn-quiet menu-btn" data-menu-toggle aria-expanded="false" aria-controls="talk-menu">
    ${BOOK}<span>Menu</span>
  </button>`;

/** The panel itself (goes inside the chat area). */
export const menuPanelHTML = () => `
  <section class="menu-panel" id="talk-menu" data-menu role="dialog" aria-modal="false" aria-labelledby="menu-title" hidden>
    <header class="menu-head">
      <div class="menu-head-copy">
        <p class="menu-eyebrow">${layered(MENU.title, { cls: 'layered layered-sm' })}</p>
        <h2 class="menu-title" id="menu-title">${layered(MENU.heading, { cls: 'layered layered-sm' })}</h2>
      </div>
      <button type="button" class="menu-close" data-menu-close aria-label="Hide the menu">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </header>
    <div class="menu-body">
      ${MENU.sections.map((sec) => `
      <section class="menu-sec">
        <h3 class="menu-sec-title">${layered(sec.name, { cls: 'layered layered-sm' })}</h3>
        <ul class="menu-items">
          ${sec.items.map(([dish, price]) => `<li class="menu-item">${layered(dish, { cls: 'layered layered-sm' })}<span class="menu-price"><span class="sr-only">¥</span><span aria-hidden="true">¥</span>${price}</span></li>`).join('')}
        </ul>
      </section>`).join('')}
      <p class="menu-note">Prices are in yuan (块 / 元).</p>
    </div>
  </section>`;

/** Wires the button and panel inside `root`. `state` is { open } kept by the conversation, so the
    menu stays as you left it if you leave and come back. Returns a cleanup function. */
export function bindMenu(root, state) {
  const btn = root.querySelector('[data-menu-toggle]');
  const panel = root.querySelector('[data-menu]');
  if (!btn || !panel) return () => {};
  const set = (open, { focus = false } = {}) => {
    state.open = open;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('is-on', open);
    if (open && focus) panel.querySelector('[data-menu-close]').focus({ preventScroll: true });
    if (!open && focus) btn.focus({ preventScroll: true });
  };
  const onToggle = () => set(!state.open, { focus: true });
  const onClose = () => set(false, { focus: true });
  const onKey = (e) => { if (e.key === 'Escape' && state.open && panel.contains(document.activeElement)) { e.stopPropagation(); set(false, { focus: true }); } };
  btn.addEventListener('click', onToggle);
  panel.querySelector('[data-menu-close]').addEventListener('click', onClose);
  panel.addEventListener('keydown', onKey);
  set(Boolean(state.open));
  return () => { btn.removeEventListener('click', onToggle); };
}
