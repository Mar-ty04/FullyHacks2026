import { Container, Graphics, Text, Sprite, Texture, Rectangle, Assets } from 'pixi.js';
import { INGREDIENTS, RECIPES } from '../data/recipes.js';

const PANEL_W = 680;
const PANEL_H = 440;

// Ingredient list section
const LIST_X  = 14;
const LIST_Y  = 50;
const LIST_W  = 630;
const LIST_H  = 248;
const ROW_H   = 44;

// Scrollbar
const SB_X = 648;
const SB_Y = LIST_Y;
const SB_W = 16;
const SB_H = LIST_H;

// Bottom section
const DIVIDER_Y  = LIST_Y + LIST_H + 8;
const SLOT_Y     = DIVIDER_Y + 14;
const SLOT_SIZE  = 50;
const RESULT_SIZE = 58;

// Slot positions — centered in panel
const SLOT1_X  = 196;
const SLOT2_X  = SLOT1_X + SLOT_SIZE + 28;   // 274
const SLOT3_X  = SLOT2_X + SLOT_SIZE + 28;   // 352
const RESULT_X = SLOT3_X + SLOT_SIZE + 32;   // 434

const PLUS1_CX = SLOT1_X + SLOT_SIZE + 14;
const PLUS2_CX = SLOT2_X + SLOT_SIZE + 14;
const EQ_CX    = SLOT3_X + SLOT_SIZE + 16;

// Combine button
const BTN_X = SLOT1_X;
const BTN_Y = SLOT_Y + SLOT_SIZE + 14;
const BTN_W = 160;
const BTN_H = 32;

export async function createCraftingUI(app, onClose) {
  // Load individual ingredient sprites + drink result sheets
  const [beansTex, milkTex, waterTex, toolsTex, icedTex] = await Promise.all([
    Assets.load('/sprites/Ingredients/Medium Roasted Coffee bean.png'),
    Assets.load('/sprites/Ingredients/Milk.png'),
    Assets.load('/sprites/Ingredients/Water.png'),
    Assets.load('/sprites/coffee_tools_03.png'),
    Assets.load('/sprites/iced_coffee_03.png'),
  ]);

  // Fallback frames from coffee_tools_03.png (16×16 grid) for ingredients without dedicated sprites
  function toolFrame(col, row) {
    return new Texture({ source: toolsTex.source, frame: new Rectangle(col * 16, row * 16, 16, 16) });
  }

  const ingTextures = {
    beans:   beansTex,
    milk:    milkTex,
    water:   waterTex,
    sugar:   toolFrame(2, 0),
    cream:   toolFrame(4, 0),
    caramel: toolFrame(5, 0),
    ice:     toolFrame(6, 0),
    choc:    toolFrame(0, 1),
  };

  // Result textures from iced_coffee_03.png (16×32 per frame, 9 frames)
  function icedFrame(col) {
    return new Texture({ source: icedTex.source, frame: new Rectangle(col * 16, 0, 16, 32) });
  }
  const resultTextures = {
    'Americano':            icedFrame(0),
    'Latte':                icedFrame(1),
    'Sweet Latte':          icedFrame(2),
    'Caramel\nMacchiato':   icedFrame(3),
    'Mocha':                icedFrame(4),
    'Iced Latte':           icedFrame(5),
  };

  const PX = Math.round((app.screen.width  - PANEL_W) / 2);
  const PY = Math.round((app.screen.height - PANEL_H) / 2);

  // Root container (covers full canvas for backdrop)
  const container = new Container();
  container.visible = false;

  // Dim backdrop
  const backdrop = new Graphics();
  backdrop.rect(0, 0, app.screen.width, app.screen.height);
  backdrop.fill({ color: 0x000000, alpha: 0.65 });
  backdrop.interactive = true;
  container.addChild(backdrop);

  // Panel
  const panel = new Container();
  panel.x = PX;
  panel.y = PY;
  container.addChild(panel);

  // Panel background
  const panelBg = new Graphics();
  panelBg.roundRect(0, 0, PANEL_W, PANEL_H, 12);
  panelBg.fill(0x1a3355);
  panelBg.stroke({ width: 3, color: 0x4a8fc0 });
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
  xTxt.anchor.set(0.5);
  xTxt.x = 22; xTxt.y = 22;
  panel.addChild(xTxt);

  // Title
  const title = new Text({
    text: 'Ingredients',
    style: { fontFamily: '"Press Start 2P"', fontSize: 13, fill: 0xffffff },
  });
  title.anchor.set(0.5, 0);
  title.x = PANEL_W / 2;
  title.y = 12;
  panel.addChild(title);

  // ── Scrollable ingredient list ──────────────────────────────────────
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
  const totalContentH = INGREDIENTS.length * ROW_H;
  const maxScroll = Math.max(0, totalContentH - LIST_H);

  function applyScroll(offset) {
    scrollOffset = Math.max(0, Math.min(maxScroll, offset));
    itemsContainer.y = LIST_Y - scrollOffset;
    if (maxScroll > 0) {
      const ratio = scrollOffset / maxScroll;
      const thumbTravel = SB_H - thumbH;
      sbThumb.y = SB_Y + ratio * thumbTravel;
    }
  }

  INGREDIENTS.forEach((ing, i) => {
    const row = new Container();
    row.y = i * ROW_H;

    const rowBg = new Graphics();
    rowBg.roundRect(2, 3, LIST_W - 8, ROW_H - 6, 6);
    rowBg.fill({ color: 0x2a5a8a, alpha: 0.6 });
    rowBg.stroke({ width: 1, color: 0x4a8fc0, alpha: 0.4 });
    rowBg.interactive = true;
    rowBg.cursor = 'grab';
    rowBg.on('pointerover', () => rowBg.tint = 0xccddff);
    rowBg.on('pointerout',  () => rowBg.tint = 0xffffff);
    rowBg.on('pointerdown', (e) => startDrag(ing, e));
    row.addChild(rowBg);

    // Ingredient icon sprite
    const icon = new Sprite(ingTextures[ing.id] || Texture.WHITE);
    icon.width  = 26;
    icon.height = 26;
    icon.x = 9;
    icon.y = Math.round((ROW_H - 26) / 2);
    row.addChild(icon);

    const nameTxt = new Text({
      text: ing.name,
      style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff },
    });
    nameTxt.x = 44;
    nameTxt.y = ROW_H / 2 - 7;
    row.addChild(nameTxt);

    itemsContainer.addChild(row);
  });

  // Scrollbar track
  const sbTrack = new Graphics();
  sbTrack.roundRect(SB_X, SB_Y, SB_W, SB_H, 6);
  sbTrack.fill({ color: 0x0a1f3a, alpha: 0.9 });
  panel.addChild(sbTrack);

  const thumbH = Math.max(28, (LIST_H / totalContentH) * SB_H);
  const sbThumb = new Graphics();
  sbThumb.roundRect(0, 0, SB_W, thumbH, 6);
  sbThumb.fill(0x4a8fc0);
  sbThumb.x = SB_X;
  sbThumb.y = SB_Y;
  sbThumb.interactive = true;
  sbThumb.cursor = 'ns-resize';
  panel.addChild(sbThumb);

  // Scroll via mouse wheel on panel
  panelBg.interactive = true;
  panelBg.on('wheel', (e) => applyScroll(scrollOffset + e.deltaY * 0.6));

  // Scrollbar thumb drag
  let thumbDrag = false, thumbStartY = 0, thumbStartScroll = 0;
  sbThumb.on('pointerdown', (e) => {
    thumbDrag = true;
    thumbStartY = e.global.y;
    thumbStartScroll = scrollOffset;
    e.stopPropagation();
  });
  window.addEventListener('pointermove', (e) => {
    if (!thumbDrag) return;
    const dy = e.clientY - thumbStartY;
    const travel = SB_H - thumbH;
    if (travel > 0) applyScroll(thumbStartScroll + (dy / travel) * maxScroll);
  });
  window.addEventListener('pointerup', () => { thumbDrag = false; });

  // ── Divider ─────────────────────────────────────────────────────────
  const divider = new Graphics();
  divider.moveTo(14, DIVIDER_Y).lineTo(PANEL_W - 14, DIVIDER_Y);
  divider.stroke({ width: 2, color: 0x4a8fc0, alpha: 0.4 });
  panel.addChild(divider);

  // ── Recipe slots ─────────────────────────────────────────────────────
  function makeSlot(x, y, size, isResult) {
    const g = new Graphics();
    g.roundRect(x, y, size, size, 7);
    g.fill({ color: isResult ? 0x0a2a0a : 0x0a1a2a, alpha: 0.9 });
    g.stroke({ width: 2, color: isResult ? 0x44cc88 : 0x4a8fc0 });
    panel.addChild(g);
    return g;
  }

  const slot1Gfx = makeSlot(SLOT1_X, SLOT_Y, SLOT_SIZE, false);
  const slot2Gfx = makeSlot(SLOT2_X, SLOT_Y, SLOT_SIZE, false);
  const slot3Gfx = makeSlot(SLOT3_X, SLOT_Y, SLOT_SIZE, false);
  const resultGfx = makeSlot(RESULT_X, SLOT_Y - 4, RESULT_SIZE, true);

  const slotGfxArr = [slot1Gfx, slot2Gfx, slot3Gfx];
  const slotXArr   = [SLOT1_X, SLOT2_X, SLOT3_X];
  const slotContents = [null, null, null];

  // Operator labels
  function opText(label, cx, y) {
    const t = new Text({ text: label, style: { fontSize: 18, fill: 0x88aacc, fontWeight: 'bold' } });
    t.anchor.set(0.5, 0.5);
    t.x = cx;
    t.y = y;
    panel.addChild(t);
  }
  opText('+', PLUS1_CX, SLOT_Y + SLOT_SIZE / 2);
  opText('+', PLUS2_CX, SLOT_Y + SLOT_SIZE / 2);
  opText('=', EQ_CX,    SLOT_Y + SLOT_SIZE / 2);

  // Slot ingredient sprites (one per slot, hidden by default)
  const slotSprites = slotXArr.map((sx) => {
    const s = new Sprite(Texture.WHITE);
    s.visible = false;
    s.width  = 32;
    s.height = 32;
    s.x = sx + Math.round((SLOT_SIZE - 32) / 2);
    s.y = SLOT_Y + 5;
    panel.addChild(s);
    return s;
  });

  const slotNames = slotXArr.map((sx) => {
    const t = new Text({ text: '', style: { fontFamily: '"Press Start 2P"', fontSize: 6, fill: 0xffffff } });
    t.anchor.set(0.5);
    t.x = sx + SLOT_SIZE / 2;
    t.y = SLOT_Y + SLOT_SIZE - 9;
    panel.addChild(t);
    return t;
  });

  // Result sprite (hidden by default)
  const resultSprite = new Sprite(Texture.WHITE);
  resultSprite.visible = false;
  panel.addChild(resultSprite);

  const resultLabel = new Text({
    text: '?',
    style: { fontFamily: '"Press Start 2P"', fontSize: 9, fill: 0x44cc88, align: 'center', wordWrap: true, wordWrapWidth: RESULT_SIZE - 8 },
  });
  resultLabel.anchor.set(0.5);
  resultLabel.x = RESULT_X + RESULT_SIZE / 2;
  resultLabel.y = SLOT_Y - 4 + RESULT_SIZE / 2;
  panel.addChild(resultLabel);

  function refreshSlot(i) {
    const ing = slotContents[i] ? INGREDIENTS.find(x => x.id === slotContents[i]) : null;
    if (ing && ingTextures[ing.id]) {
      slotSprites[i].texture = ingTextures[ing.id];
      slotSprites[i].visible = true;
      slotNames[i].text = ing.name.split(' ')[0];
    } else {
      slotSprites[i].visible = false;
      slotNames[i].text = '';
    }
  }

  // Click a slot to clear it
  slotGfxArr.forEach((g, i) => {
    g.interactive = true;
    g.cursor = 'pointer';
    g.on('pointerdown', (e) => {
      slotContents[i] = null;
      refreshSlot(i);
      resetResult();
      e.stopPropagation();
    });
  });

  // ── Combine button ────────────────────────────────────────────────────
  const combineBtn = new Graphics();
  combineBtn.roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 8);
  combineBtn.fill(0x1a5a2a);
  combineBtn.stroke({ width: 2, color: 0x44cc88 });
  combineBtn.interactive = true;
  combineBtn.cursor = 'pointer';
  combineBtn.on('pointerover', () => combineBtn.tint = 0xaaffaa);
  combineBtn.on('pointerout',  () => combineBtn.tint = 0xffffff);
  combineBtn.on('pointerdown', onCombine);
  panel.addChild(combineBtn);

  const combineTxt = new Text({
    text: 'COMBINE',
    style: { fontFamily: '"Press Start 2P"', fontSize: 10, fill: 0xffffff },
  });
  combineTxt.anchor.set(0.5);
  combineTxt.x = BTN_X + BTN_W / 2;
  combineTxt.y = BTN_Y + BTN_H / 2;
  panel.addChild(combineTxt);

  function resetResult() {
    resultSprite.visible = false;
    resultLabel.text = '?';
    resultLabel.style.fill = 0x44cc88;
    resultLabel.style.fontSize = 9;
    resultLabel.y = SLOT_Y - 4 + RESULT_SIZE / 2;
  }

  function onCombine() {
    const ids = slotContents.map(x => x || null);
    const match = RECIPES.find(r =>
      r.ingredients[0] === ids[0] &&
      r.ingredients[1] === ids[1] &&
      r.ingredients[2] === ids[2]
    );
    if (match) {
      resultLabel.style.fill = 0x44ffaa;
      const rTex = resultTextures[match.result];
      if (rTex) {
        // Scale 16×32 sprite to fill most of the 58×58 result slot
        const scale = Math.min(RESULT_SIZE / 16, RESULT_SIZE / 32);
        resultSprite.texture = rTex;
        resultSprite.width  = Math.round(16 * scale);
        resultSprite.height = Math.round(32 * scale);
        resultSprite.x = RESULT_X + Math.round((RESULT_SIZE - resultSprite.width)  / 2);
        resultSprite.y = SLOT_Y - 4 + 2;
        resultSprite.visible = true;
        // Compact name at bottom of slot
        resultLabel.text = match.result.replace('\n', ' ');
        resultLabel.style.fontSize = 6;
        resultLabel.y = SLOT_Y - 4 + RESULT_SIZE - 8;
      } else {
        resultLabel.text = match.result;
        resultLabel.style.fontSize = 9;
        resultLabel.y = SLOT_Y - 4 + RESULT_SIZE / 2;
      }
    } else {
      resetResult();
      resultLabel.text = '?';
      resultLabel.style.fill = 0xff6655;
    }
  }

  // ── Drag & drop ───────────────────────────────────────────────────────
  let dragGhost = null;
  let dragIng   = null;

  function startDrag(ing, pixiEvent) {
    dragIng = ing;
    dragGhost = new Graphics();
    dragGhost.circle(0, 0, 16);
    dragGhost.fill({ color: ing.color, alpha: 0.9 });
    dragGhost.stroke({ width: 2, color: 0xffffff });
    dragGhost.x = pixiEvent.global.x - panel.x;
    dragGhost.y = pixiEvent.global.y - panel.y;
    panel.addChild(dragGhost);
  }

  function getStagePos(e) {
    const rect = app.canvas.getBoundingClientRect();
    const sx = app.screen.width  / rect.width;
    const sy = app.screen.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top)  * sy,
    };
  }

  window.addEventListener('pointermove', (e) => {
    if (!dragGhost) return;
    const pos = getStagePos(e);
    dragGhost.x = pos.x - panel.x;
    dragGhost.y = pos.y - panel.y;
  });

  window.addEventListener('pointerup', (e) => {
    if (!dragGhost || !dragIng) return;
    const pos = getStagePos(e);
    const stageX = pos.x;
    const stageY = pos.y;

    slotXArr.forEach((sx, i) => {
      const worldX = PX + sx;
      const worldY = PY + SLOT_Y;
      if (stageX >= worldX && stageX <= worldX + SLOT_SIZE &&
          stageY >= worldY && stageY <= worldY + SLOT_SIZE) {
        slotContents[i] = dragIng.id;
        refreshSlot(i);
        resetResult();
      }
    });

    panel.removeChild(dragGhost);
    dragGhost.destroy();
    dragGhost = null;
    dragIng   = null;
  });

  // ── Open / Close ──────────────────────────────────────────────────────
  function open() {
    container.visible = true;
  }

  function close() {
    container.visible = false;
    slotContents.fill(null);
    slotSprites.forEach(s => { s.visible = false; });
    slotNames.forEach(t => { t.text = ''; });
    resetResult();
    applyScroll(0);
  }

  return { container, open, close };
}
