import { Container, Graphics, Text, Sprite, Texture, Rectangle, Assets } from 'pixi.js';
import { INGREDIENTS, RECIPES } from '../data/recipes.js';

// ── Layout ───────────────────────────────────────────────────────────────────
const PANEL_W = 900;
const PANEL_H = 440;

const LIST_X  = 14;
const LIST_Y  = 50;
const LIST_W  = 630;
const LIST_H  = 248;
const ROW_H   = 44;

const SB_X = 648;
const SB_Y = LIST_Y;
const SB_W = 16;
const SB_H = LIST_H;

const DIVIDER_Y  = LIST_Y + LIST_H + 8;   // 306
const SLOT_Y     = DIVIDER_Y + 14;         // 320
const SLOT_SIZE  = 50;
const RESULT_SIZE = 58;

const SLOT1_X  = 196;
const SLOT2_X  = SLOT1_X + SLOT_SIZE + 28;
const SLOT3_X  = SLOT2_X + SLOT_SIZE + 28;
const RESULT_X = SLOT3_X + SLOT_SIZE + 32;

const PLUS1_CX = SLOT1_X + SLOT_SIZE + 14;
const PLUS2_CX = SLOT2_X + SLOT_SIZE + 14;
const EQ_CX    = SLOT3_X + SLOT_SIZE + 16;

const BTN_X = SLOT1_X;
const BTN_Y = SLOT_Y + SLOT_SIZE + 14;
const BTN_W = 160;
const BTN_H = 32;

// Recipes panel (right column inside expanded panel)
const REC_X = 698;
const REC_W = 192;

// ── Sprite configs ────────────────────────────────────────────────────────────
const ING_SPRITE_CONFIG = {
  beans_light: { path: '/sprites/Ingredients/Light roasted coffee bean.png',  frame: { x: 65, y:  2, w: 13, h: 13 } },
  beans_med:   { path: '/sprites/Ingredients/Medium Roasted Coffee bean.png', frame: { x: 62, y:  2, w: 13, h: 13 } },
  beans_dark:  { path: '/sprites/Ingredients/Dark roasted coffee bean.png',   frame: { x: 65, y: 16, w: 13, h: 13 } },
  milk:        { path: '/sprites/Ingredients/Milk.png',                        frame: { x: 46, y:  4, w: 20, h: 19 } },
  water:       { path: '/sprites/Ingredients/Water.png',                       frame: { x: 47, y: 10, w: 21, h: 20 } },
  sugar:       { path: '/sprites/Ingredients/Sugar, caramel, chocolate, ice, cream.png', frame: { x:  77, y: 162, w:  64, h: 60 } },
  caramel:     { path: '/sprites/Ingredients/Sugar, caramel, chocolate, ice, cream.png', frame: { x: 161, y: 163, w:  82, h: 62 } },
  choc:        { path: '/sprites/Ingredients/Sugar, caramel, chocolate, ice, cream.png', frame: { x: 255, y: 165, w:  97, h: 55 } },
  ice:         { path: '/sprites/Ingredients/Sugar, caramel, chocolate, ice, cream.png', frame: { x: 356, y: 159, w:  75, h: 69 } },
  cream:       { path: '/sprites/Ingredients/Sugar, caramel, chocolate, ice, cream.png', frame: { x: 451, y: 160, w:  77, h: 64 } },
};

const DRINKS_SHEET = '/sprites/Ingredients/flat_white__sweet_flat_white__latte__sweet_latte__caramel_Macchiato__Mocha__Iced_Latte__dark_latte__dark_macchiato-removebg-preview.png';

const RESULT_SPRITE_CONFIG = {
  'Light Roast':      { path: '/sprites/Ingredients/Light roasted coffee.png',  frame: { x: 46, y:  2, w: 16, h: 20 } },
  'Americano':        { path: '/sprites/Ingredients/Medium roasted coffee.png', frame: { x: 46, y: 19, w: 17, h: 20 } },
  'Espresso':         { path: '/sprites/Ingredients/Dark roasted coffee.png',   frame: { x: 47, y: 30, w: 16, h: 18 } },
  'Flat White':       { path: DRINKS_SHEET, frame: { x:  80, y:  79, w: 106, h: 86 } },
  'Sweet Flat White': { path: DRINKS_SHEET, frame: { x: 184, y:  79, w: 158, h: 86 } },
  'Latte':            { path: DRINKS_SHEET, frame: { x: 339, y:  79, w: 102, h: 94 } },
  'Sweet Latte':      { path: DRINKS_SHEET, frame: { x: 451, y:  79, w: 125, h: 94 } },
  'Caramel\nMacchiato': { path: DRINKS_SHEET, frame: { x: 575, y:  79, w: 158, h: 94 } },
  'Mocha':            { path: DRINKS_SHEET, frame: { x:  80, y: 205, w: 106, h: 93 } },
  'Iced Latte':       { path: DRINKS_SHEET, frame: { x: 339, y: 205, w: 102, h: 93 } },
  'Dark Latte':       { path: DRINKS_SHEET, frame: { x: 451, y: 205, w: 125, h: 93 } },
  'Dark Macchiato':   { path: DRINKS_SHEET, frame: { x: 575, y: 205, w: 158, h: 93 } },
};

// ── Main export ───────────────────────────────────────────────────────────────
export async function createCraftingUI(app, onClose, onDrinkCrafted) {

  // ── Texture loading ──────────────────────────────────────────────────────
  const rawCache = {};
  async function loadCached(path) {
    if (!rawCache[path]) {
      const t = await Assets.load(path);
      t.source.scaleMode = 'nearest';
      rawCache[path] = t;
    }
    return rawCache[path];
  }

  const ingTextures = {};
  for (const [id, cfg] of Object.entries(ING_SPRITE_CONFIG)) {
    const raw = await loadCached(cfg.path);
    ingTextures[id] = new Texture({ source: raw.source,
      frame: new Rectangle(cfg.frame.x, cfg.frame.y, cfg.frame.w, cfg.frame.h) });
  }

  const resultTextures = {};
  for (const [name, cfg] of Object.entries(RESULT_SPRITE_CONFIG)) {
    const raw = await loadCached(cfg.path);
    resultTextures[name] = new Texture({ source: raw.source,
      frame: new Rectangle(cfg.frame.x, cfg.frame.y, cfg.frame.w, cfg.frame.h) });
  }


  // ── Root containers ───────────────────────────────────────────────────────
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
  panel.addChild(panelBg);

  // ── X button ─────────────────────────────────────────────────────────────
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

  // Title centered over ingredient list
  const title = new Text({ text: 'Ingredients',
    style: { fontFamily: '"Press Start 2P"', fontSize: 13, fill: 0xffffff } });
  title.anchor.set(0.5, 0);
  title.x = LIST_X + LIST_W / 2;
  title.y = 12;
  panel.addChild(title);

  // ── Scrollable ingredient list ────────────────────────────────────────────
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
    if (maxScroll > 0)
      sbThumb.y = SB_Y + (scrollOffset / maxScroll) * (SB_H - thumbH);
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

    if (ingTextures[ing.id]) {
      const icon = new Sprite(ingTextures[ing.id]);
      const s = Math.min(26 / icon.texture.width, 26 / icon.texture.height);
      icon.scale.set(s);
      icon.x = 9  + Math.round((26 - icon.texture.width  * s) / 2);
      icon.y = Math.round((ROW_H - icon.texture.height * s) / 2);
      row.addChild(icon);
    } else {
      const dot = new Graphics();
      dot.circle(22, ROW_H / 2 - 2, 13);
      dot.fill(ing.color);
      dot.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
      row.addChild(dot);
    }

    const nameTxt = new Text({ text: ing.name,
      style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff } });
    nameTxt.x = 44; nameTxt.y = ROW_H / 2 - 7;
    row.addChild(nameTxt);
    itemsContainer.addChild(row);
  });

  // Scrollbar
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

  panelBg.interactive = true;
  // Scroll anywhere on the page while the UI is open (touchpad, mouse wheel, etc.)
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

  // ── Dividers ──────────────────────────────────────────────────────────────
  const hDivider = new Graphics();
  hDivider.moveTo(14, DIVIDER_Y).lineTo(REC_X - 8, DIVIDER_Y);
  hDivider.stroke({ width: 2, color: 0x4a8fc0, alpha: 0.4 });
  panel.addChild(hDivider);

  const vDivider = new Graphics();
  vDivider.moveTo(REC_X - 8, 8).lineTo(REC_X - 8, PANEL_H - 8);
  vDivider.stroke({ width: 2, color: 0x4a8fc0, alpha: 0.4 });
  panel.addChild(vDivider);

  // ── Recipe slots ──────────────────────────────────────────────────────────
  function makeSlot(x, y, size, isResult) {
    const g = new Graphics();
    g.roundRect(x, y, size, size, 7);
    g.fill({ color: isResult ? 0x0a2a0a : 0x0a1a2a, alpha: 0.9 });
    g.stroke({ width: 2, color: isResult ? 0x44cc88 : 0x4a8fc0 });
    panel.addChild(g);
    return g;
  }

  makeSlot(RESULT_X, SLOT_Y - 4, RESULT_SIZE, true);
  const slotGfxArr = [
    makeSlot(SLOT1_X, SLOT_Y, SLOT_SIZE, false),
    makeSlot(SLOT2_X, SLOT_Y, SLOT_SIZE, false),
    makeSlot(SLOT3_X, SLOT_Y, SLOT_SIZE, false),
  ];
  const slotXArr    = [SLOT1_X, SLOT2_X, SLOT3_X];
  const slotContents = [null, null, null];

  function opText(label, cx, y) {
    const t = new Text({ text: label, style: { fontSize: 18, fill: 0x88aacc, fontWeight: 'bold' } });
    t.anchor.set(0.5); t.x = cx; t.y = y; panel.addChild(t);
  }
  opText('+', PLUS1_CX, SLOT_Y + SLOT_SIZE / 2);
  opText('+', PLUS2_CX, SLOT_Y + SLOT_SIZE / 2);
  opText('=', EQ_CX,    SLOT_Y + SLOT_SIZE / 2);

  const slotSprites = slotXArr.map((sx) => {
    const s = new Sprite(Texture.WHITE);
    s.visible = false; s.x = sx; s.y = SLOT_Y;
    panel.addChild(s); return s;
  });
  const slotDots = slotXArr.map(() => { const g = new Graphics(); panel.addChild(g); return g; });
  const slotNames = slotXArr.map((sx) => {
    const t = new Text({ text: '', style: { fontFamily: '"Press Start 2P"', fontSize: 6, fill: 0xffffff } });
    t.anchor.set(0.5); t.x = sx + SLOT_SIZE / 2; t.y = SLOT_Y + SLOT_SIZE - 9;
    panel.addChild(t); return t;
  });

  const resultSprite = new Sprite(Texture.WHITE);
  resultSprite.visible = false;
  panel.addChild(resultSprite);

  const resultGlow = new Graphics();
  resultGlow.visible = false;
  panel.addChild(resultGlow);

  const resultLabel = new Text({ text: '?',
    style: { fontFamily: '"Press Start 2P"', fontSize: 9, fill: 0x44cc88,
             align: 'center', wordWrap: true, wordWrapWidth: RESULT_SIZE - 8 } });
  resultLabel.anchor.set(0.5);
  resultLabel.x = RESULT_X + RESULT_SIZE / 2;
  resultLabel.y = SLOT_Y - 4 + RESULT_SIZE / 2;
  panel.addChild(resultLabel);

  function refreshSlot(i) {
    const ing = slotContents[i] ? INGREDIENTS.find(x => x.id === slotContents[i]) : null;
    slotDots[i].clear(); slotSprites[i].visible = false;
    if (ing) {
      if (ingTextures[ing.id]) {
        const tex = ingTextures[ing.id];
        const s = Math.min(32 / tex.width, 32 / tex.height);
        slotSprites[i].texture = tex;
        slotSprites[i].width  = Math.round(tex.width  * s);
        slotSprites[i].height = Math.round(tex.height * s);
        slotSprites[i].x = slotXArr[i] + Math.round((SLOT_SIZE - slotSprites[i].width)  / 2);
        slotSprites[i].y = SLOT_Y      + Math.round((SLOT_SIZE - slotSprites[i].height) / 2) - 4;
        slotSprites[i].visible = true;
      } else {
        slotDots[i].circle(slotXArr[i] + SLOT_SIZE / 2, SLOT_Y + SLOT_SIZE / 2 - 6, 14);
        slotDots[i].fill(ing.color);
        slotDots[i].stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
      }
      slotNames[i].text = ing.name.split(' ')[0];
    } else { slotNames[i].text = ''; }
  }

  slotGfxArr.forEach((g, i) => {
    g.interactive = true; g.cursor = 'pointer';
    g.on('pointerdown', (e) => { slotContents[i] = null; refreshSlot(i); resetResult(); e.stopPropagation(); });
  });

  // ── Combine button ────────────────────────────────────────────────────────
  const combineBtn = new Graphics();
  combineBtn.roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 8);
  combineBtn.fill(0x1a5a2a); combineBtn.stroke({ width: 2, color: 0x44cc88 });
  combineBtn.interactive = true; combineBtn.cursor = 'pointer';
  combineBtn.on('pointerover', () => combineBtn.tint = 0xaaffaa);
  combineBtn.on('pointerout',  () => combineBtn.tint = 0xffffff);
  combineBtn.on('pointerdown', onCombine);
  panel.addChild(combineBtn);
  const combineTxt = new Text({ text: 'COMBINE',
    style: { fontFamily: '"Press Start 2P"', fontSize: 10, fill: 0xffffff } });
  combineTxt.anchor.set(0.5);
  combineTxt.x = BTN_X + BTN_W / 2; combineTxt.y = BTN_Y + BTN_H / 2;
  panel.addChild(combineTxt);

  // ── Recipes panel ─────────────────────────────────────────────────────────
  const recTitle = new Text({ text: 'RECIPES',
    style: { fontFamily: '"Press Start 2P"', fontSize: 10, fill: 0x88ccff } });
  recTitle.anchor.set(0.5, 0);
  recTitle.x = REC_X + REC_W / 2; recTitle.y = 12;
  panel.addChild(recTitle);

  // Helper: draw a small ingredient icon into a container at (x, y) size 12×12
  function addIngIcon(id, x, y, parent) {
    const ing = INGREDIENTS.find(g => g.id === id);
    if (!ing) return;
    if (ingTextures[id]) {
      const icon = new Sprite(ingTextures[id]);
      const s = Math.min(12 / icon.texture.width, 12 / icon.texture.height);
      icon.scale.set(s);
      icon.x = x + Math.round((12 - icon.texture.width  * s) / 2);
      icon.y = y + Math.round((12 - icon.texture.height * s) / 2);
      parent.addChild(icon);
    } else {
      const dot = new Graphics();
      dot.circle(x + 6, y + 6, 5);
      dot.fill(ing.color);
      parent.addChild(dot);
    }
  }

  const CATEGORIES = [
    { label: '- LIGHT -',  color: 0xd4a574, beanId: 'beans_light' },
    { label: '- MEDIUM -', color: 0xc8a05a, beanId: 'beans_med'   },
    { label: '- DARK -',   color: 0x886644, beanId: 'beans_dark'  },
  ];

  let recY = 34;
  for (const cat of CATEGORIES) {
    const catTxt = new Text({ text: cat.label,
      style: { fontFamily: '"Press Start 2P"', fontSize: 7, fill: cat.color } });
    catTxt.x = REC_X + 4; catTxt.y = recY;
    panel.addChild(catTxt);
    recY += 16;

    const catRecipes = RECIPES.filter(r => r.ingredients[0] === cat.beanId);
    for (const recipe of catRecipes) {
      const row = new Container();
      row.x = REC_X + 2; row.y = recY;

      // Hover background
      const rowBg = new Graphics();
      rowBg.roundRect(0, 0, REC_W - 4, 18, 3);
      rowBg.fill({ color: 0x2a5a8a, alpha: 0.3 });
      row.addChild(rowBg);

      // Icons + "+" separators
      let rx = 3;
      const ids = recipe.ingredients.filter(id => id !== null);
      ids.forEach((id, i) => {
        if (i > 0) {
          const plus = new Text({ text: '+', style: { fontSize: 8, fill: 0x88aacc } });
          plus.x = rx; plus.y = 4; row.addChild(plus); rx += 9;
        }
        addIngIcon(id, rx, 3, row); rx += 14;
      });

      // Arrow
      const arrow = new Text({ text: '>', style: { fontFamily: '"Press Start 2P"', fontSize: 6, fill: 0x88aacc } });
      arrow.x = rx + 1; arrow.y = 5; row.addChild(arrow); rx += 11;

      // Result name
      const rTxt = new Text({ text: recipe.result.replace('\n', ' '),
        style: { fontFamily: '"Press Start 2P"', fontSize: 6, fill: 0xffffff } });
      rTxt.x = rx; rTxt.y = 5; row.addChild(rTxt);

      panel.addChild(row);
      recY += 20;
    }
    recY += 6;
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────
  let dragGhost = null, dragIng = null;

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
    return {
      x: (e.clientX - rect.left) * (app.screen.width  / rect.width),
      y: (e.clientY - rect.top)  * (app.screen.height / rect.height),
    };
  }

  window.addEventListener('pointermove', (e) => {
    if (!dragGhost) return;
    const pos = getStagePos(e);
    dragGhost.x = pos.x - panel.x; dragGhost.y = pos.y - panel.y;
  });

  window.addEventListener('pointerup', (e) => {
    if (!dragGhost || !dragIng) return;
    const { x: stageX, y: stageY } = getStagePos(e);
    slotXArr.forEach((sx, i) => {
      const wx = PX + sx, wy = PY + SLOT_Y;
      if (stageX >= wx && stageX <= wx + SLOT_SIZE &&
          stageY >= wy && stageY <= wy + SLOT_SIZE) {
        slotContents[i] = dragIng.id; refreshSlot(i); resetResult();
      }
    });
    panel.removeChild(dragGhost); dragGhost.destroy(); dragGhost = null; dragIng = null;
  });

  // ── Success sound ─────────────────────────────────────────────────────────
  function playSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);

      // Rising arpeggio C5→E5→G5→C6
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.075;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.7, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.45);

        // Triangle shimmer at 2× freq
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = 'triangle'; o2.frequency.value = freq * 2;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.18, t + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 0.18);
      });

      // High sparkle burst
      [2093, 2637, 3136].forEach((freq, i) => {
        const t = ctx.currentTime + 0.28 + i * 0.04;
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.15);
      });
    } catch (_) { /* AudioContext blocked */ }
  }

  // ── Success visuals ───────────────────────────────────────────────────────
  function playSuccessEffect(resultName) {
    const cx = PX + RESULT_X + RESULT_SIZE / 2;
    const cy = PY + (SLOT_Y - 4) + RESULT_SIZE / 2;
    const COLORS = [0xFFD700, 0xFF69B4, 0x00CED1, 0x98FB98, 0xFFFFFF, 0xFFA500, 0x9370DB, 0xFF6347];

    // Particles
    for (let i = 0; i < 32; i++) {
      const p = new Graphics();
      const color = COLORS[i % COLORS.length];
      const size = 2.5 + Math.random() * 4;
      if (i % 2 === 0) { p.circle(0, 0, size); } else { p.rect(-size / 2, -size / 2, size, size); }
      p.fill(color);
      p.x = cx; p.y = cy;
      app.stage.addChild(p);

      const angle = (i / 32) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3.5 + Math.random() * 6.5;
      const vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed - 2.5;
      let life = 1.0;
      const decay = 0.016 + Math.random() * 0.013;

      const tick = () => {
        life -= decay; vy += 0.28;
        p.x += vx; p.y += vy;
        p.alpha = Math.max(0, life); p.rotation += 0.1;
        if (life <= 0) { app.stage.removeChild(p); p.destroy(); app.ticker.remove(tick); }
      };
      app.ticker.add(tick);
    }

    // Expanding gold rings
    for (let r = 0; r < 3; r++) {
      const ring = new Graphics();
      app.stage.addChild(ring);
      let radius = 8, alpha = 0.9, frame = 0;
      const delay = r * 8;
      const tick = () => {
        frame++;
        if (frame < delay) return;
        radius += 5; alpha -= 0.028;
        ring.clear();
        if (alpha > 0) {
          ring.circle(cx, cy, radius);
          ring.stroke({ width: 3, color: 0xFFD700, alpha });
        } else { app.stage.removeChild(ring); ring.destroy(); app.ticker.remove(tick); }
      };
      app.ticker.add(tick);
    }

    // Floating result name
    const floatTxt = new Text({
      text: '★ ' + resultName.replace('\n', ' ') + ' ★',
      style: { fontFamily: '"Press Start 2P"', fontSize: 9, fill: 0xFFD700,
               dropShadow: { color: 0x000000, blur: 0, distance: 1 } },
    });
    floatTxt.anchor.set(0.5); floatTxt.x = cx; floatTxt.y = cy - 18;
    app.stage.addChild(floatTxt);
    let floatLife = 1.0;
    const floatTick = () => {
      floatLife -= 0.014; floatTxt.y -= 1.1; floatTxt.alpha = Math.max(0, floatLife);
      if (floatLife <= 0) { app.stage.removeChild(floatTxt); floatTxt.destroy(); app.ticker.remove(floatTick); }
    };
    app.ticker.add(floatTick);

    // Result slot glow pulse (in panel space)
    resultGlow.visible = true;
    let glowA = 0.85;
    const glowTick = () => {
      glowA -= 0.022; resultGlow.clear();
      if (glowA > 0) {
        resultGlow.roundRect(RESULT_X - 7, SLOT_Y - 11, RESULT_SIZE + 14, RESULT_SIZE + 14, 11);
        resultGlow.fill({ color: 0xFFD700, alpha: glowA * 0.35 });
        resultGlow.stroke({ width: 3, color: 0xFFD700, alpha: glowA });
      } else { resultGlow.visible = false; app.ticker.remove(glowTick); }
    };
    app.ticker.add(glowTick);
  }

  // ── resetResult / onCombine ───────────────────────────────────────────────
  function resetResult() {
    resultSprite.visible = false;
    resultGlow.visible = false;
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
        const scale = Math.min(RESULT_SIZE / rTex.width, RESULT_SIZE / rTex.height);
        resultSprite.texture = rTex;
        resultSprite.width  = Math.round(rTex.width  * scale);
        resultSprite.height = Math.round(rTex.height * scale);
        resultSprite.x = RESULT_X + Math.round((RESULT_SIZE - resultSprite.width)  / 2);
        resultSprite.y = SLOT_Y - 4 + 2;
        resultSprite.visible = true;
        resultLabel.text = match.result.replace('\n', ' ');
        resultLabel.style.fontSize = 6;
        resultLabel.y = SLOT_Y - 4 + RESULT_SIZE - 8;
      } else {
        resultLabel.text = match.result;
      }
      playSuccessEffect(match.result);
      playSuccessSound();
      if (onDrinkCrafted) onDrinkCrafted(match.result, rTex || null);
    } else {
      resetResult();
      resultLabel.text = '?';
      resultLabel.style.fill = 0xff6655;
    }
  }

  // ── Open / Close ──────────────────────────────────────────────────────────
  function open()  { container.visible = true; }

  function close() {
    container.visible = false;
    slotContents.fill(null);
    slotSprites.forEach(s => { s.visible = false; });
    slotDots.forEach(d => d.clear());
    slotNames.forEach(t => { t.text = ''; });
    resetResult();
    applyScroll(0);
  }

  return { container, open, close };
}
