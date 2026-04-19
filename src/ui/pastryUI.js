import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js';
import { PASTRIES } from '../data/recipes.js';

const PANEL_W = 360;
const PANEL_H = 280;

const LIST_X = 14;
const LIST_Y = 50;
const LIST_W = 296;
const LIST_H = 176;
const ROW_H  = 52;

const SB_X = LIST_X + LIST_W + 6;
const SB_Y = LIST_Y;
const SB_W = 14;
const SB_H = LIST_H;

export async function createPastryUI(app, onClose, onPastrySelected, getBalance, spendMoney) {
  const textures = {};
  for (const p of PASTRIES) {
    textures[p.id] = await Assets.load(p.sprite);
  }

  const PX = Math.round((app.screen.width  - PANEL_W) / 2);
  const PY = Math.round((app.screen.height - PANEL_H) / 2);

  const container = new Container();
  container.visible = false;

  const backdrop = new Graphics();
  backdrop.rect(0, 0, app.screen.width, app.screen.height);
  backdrop.fill({ color: 0x000000, alpha: 0.65 });
  backdrop.interactive = true;
  container.addChild(backdrop);

  const panel = new Container();
  panel.x = PX;
  panel.y = PY;
  container.addChild(panel);

  const panelBg = new Graphics();
  panelBg.roundRect(0, 0, PANEL_W, PANEL_H, 12);
  panelBg.fill(0x1a3355);
  panelBg.stroke({ width: 3, color: 0x4a8fc0 });
  panelBg.interactive = true;
  panel.addChild(panelBg);

  // X button
  const xBtn = new Graphics();
  xBtn.circle(22, 22, 15);
  xBtn.fill(0xbb2222);
  xBtn.stroke({ width: 2, color: 0xff7777 });
  xBtn.interactive = true;
  xBtn.cursor = 'pointer';
  xBtn.on('pointerover', () => { xBtn.tint = 0xffaaaa; });
  xBtn.on('pointerout',  () => { xBtn.tint = 0xffffff; });
  xBtn.on('pointerdown', () => { close(); if (onClose) onClose(); });
  panel.addChild(xBtn);
  const xTxt = new Text({ text: '✕', style: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' } });
  xTxt.anchor.set(0.5); xTxt.x = 22; xTxt.y = 22;
  panel.addChild(xTxt);

  const title = new Text({ text: 'Pastries',
    style: { fontFamily: '"Press Start 2P"', fontSize: 13, fill: 0xffffff } });
  title.anchor.set(0.5, 0);
  title.x = PANEL_W / 2;
  title.y = 12;
  panel.addChild(title);

  // ── Scrollable list ───────────────────────────────────────────────────────
  const listMask = new Graphics();
  listMask.rect(LIST_X, LIST_Y, LIST_W, LIST_H);
  listMask.fill(0xffffff);
  panel.addChild(listMask);

  const itemsContainer = new Container();
  itemsContainer.x = LIST_X;
  itemsContainer.y = LIST_Y;
  itemsContainer.mask = listMask;
  panel.addChild(itemsContainer);

  let scrollOffset = 0;
  const totalContentH = PASTRIES.length * ROW_H;
  const maxScroll = Math.max(0, totalContentH - LIST_H);

  function applyScroll(offset) {
    scrollOffset = Math.max(0, Math.min(maxScroll, offset));
    itemsContainer.y = LIST_Y - scrollOffset;
    if (maxScroll > 0)
      sbThumb.y = SB_Y + (scrollOffset / maxScroll) * (SB_H - thumbH);
  }

  PASTRIES.forEach((pastry, i) => {
    const row = new Container();
    row.y = i * ROW_H;

    const rowBg = new Graphics();
    rowBg.roundRect(2, 3, LIST_W - 8, ROW_H - 6, 6);
    rowBg.fill({ color: 0x2a5a8a, alpha: 0.6 });
    rowBg.stroke({ width: 1, color: 0x4a8fc0, alpha: 0.4 });
    rowBg.interactive = true;
    rowBg.cursor = 'pointer';
    rowBg.on('pointerover', () => rowBg.tint = 0xccddff);
    rowBg.on('pointerout',  () => rowBg.tint = 0xffffff);
    rowBg.on('pointerdown', () => pick(pastry));
    row.addChild(rowBg);

    const tex = textures[pastry.id];
    if (tex) {
      const icon = new Sprite(tex);
      const s = Math.min(34 / tex.width, 34 / tex.height);
      icon.scale.set(s);
      icon.x = 9  + Math.round((34 - tex.width  * s) / 2);
      icon.y = Math.round((ROW_H - tex.height * s) / 2);
      row.addChild(icon);
    }

    const nameTxt = new Text({ text: pastry.name,
      style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff } });
    nameTxt.x = 52; nameTxt.y = ROW_H / 2 - 7;
    row.addChild(nameTxt);

    const costTxt = new Text({ text: `$${pastry.cost}`,
      style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffd700 } });
    costTxt.anchor.set(1, 0.5);
    costTxt.x = LIST_W - 14;
    costTxt.y = ROW_H / 2;
    row.addChild(costTxt);

    itemsContainer.addChild(row);
  });

  // ── Scrollbar ─────────────────────────────────────────────────────────────
  const sbTrack = new Graphics();
  sbTrack.roundRect(SB_X, SB_Y, SB_W, SB_H, 6);
  sbTrack.fill({ color: 0x0a1f3a, alpha: 0.9 });
  panel.addChild(sbTrack);

  const thumbH = Math.max(28, (LIST_H / totalContentH) * SB_H);
  const sbThumb = new Graphics();
  sbThumb.roundRect(0, 0, SB_W, thumbH, 6);
  sbThumb.fill(0x4a8fc0);
  sbThumb.x = SB_X; sbThumb.y = SB_Y;
  sbThumb.interactive = true; sbThumb.cursor = 'ns-resize';
  panel.addChild(sbThumb);

  window.addEventListener('wheel', (e) => {
    if (!container.visible) return;
    e.preventDefault();
    applyScroll(scrollOffset + e.deltaY * 0.6);
  }, { passive: false });

  let thumbDrag = false, thumbStartY = 0, thumbStartScroll = 0;
  sbThumb.on('pointerdown', (e) => {
    thumbDrag = true; thumbStartY = e.global.y; thumbStartScroll = scrollOffset;
    e.stopPropagation();
  });
  window.addEventListener('pointermove', (e) => {
    if (!thumbDrag) return;
    const travel = SB_H - thumbH;
    if (travel > 0) applyScroll(thumbStartScroll + ((e.clientY - thumbStartY) / travel) * maxScroll);
  });
  window.addEventListener('pointerup', () => { thumbDrag = false; });

  // ── Error label ───────────────────────────────────────────────────────────
  const errorLabel = new Text({ text: '',
    style: { fontFamily: '"Press Start 2P"', fontSize: 7, fill: 0xff6655 } });
  errorLabel.anchor.set(0.5, 0);
  errorLabel.x = PANEL_W / 2;
  errorLabel.y = LIST_Y + LIST_H + 10;
  panel.addChild(errorLabel);

  // ── Hint label ────────────────────────────────────────────────────────────
  const hintLabel = new Text({ text: 'Click a pastry to grab it',
    style: { fontFamily: '"Press Start 2P"', fontSize: 6, fill: 0x88aacc } });
  hintLabel.anchor.set(0.5, 0);
  hintLabel.x = PANEL_W / 2;
  hintLabel.y = LIST_Y + LIST_H + 28;
  panel.addChild(hintLabel);

  // ── Pick logic ────────────────────────────────────────────────────────────
  function pick(pastry) {
    if (getBalance && getBalance() < pastry.cost) {
      errorLabel.text = 'Not enough money!';
      return;
    }
    if (spendMoney) spendMoney(pastry.cost);
    if (onPastrySelected) onPastrySelected(pastry.name, textures[pastry.id] || null);
    close();
    if (onClose) onClose();
  }

  function open()  { container.visible = true; errorLabel.text = ''; applyScroll(0); }
  function close() { container.visible = false; }

  return { container, open, close };
}
