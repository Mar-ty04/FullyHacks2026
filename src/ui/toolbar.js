import { Container, Graphics, Text, Sprite, Texture } from 'pixi.js';
import { sfx } from '../audio.js';

const SLOT_SIZE  = 46;
const SLOT_GAP   = 3;
const NUM_SLOTS  = 9;
const PAD        = 7;
const NAME_H     = 13; // extra height for drink name label

const BAR_W = NUM_SLOTS * SLOT_SIZE + (NUM_SLOTS - 1) * SLOT_GAP + PAD * 2;
const BAR_H = SLOT_SIZE + PAD * 2 + NAME_H;

export function createToolbar(app) {
  const BAR_X     = Math.round((app.screen.width - BAR_W) / 2);
  const VISIBLE_Y = app.screen.height - BAR_H - 6;
  const HIDDEN_Y  = app.screen.height + 6;   // fully below the screen edge

  // Container uses local coords; we animate container.y to slide it in/out
  const container = new Container();
  container.x = BAR_X;
  container.y = HIDDEN_Y;

  // Bar background (local space: origin = top-left of bar)
  const bar = new Graphics();
  bar.roundRect(-2, -2, BAR_W + 4, BAR_H + 4, 10);
  bar.fill({ color: 0x050e18, alpha: 0.88 });
  bar.stroke({ width: 2, color: 0x3a6a9a, alpha: 0.9 });
  container.addChild(bar);

  // Inventory: array of 9 entries, each null or { name, texture, count }
  const slots = Array(NUM_SLOTS).fill(null);

  const slotGfxArr   = [];
  const slotSprArr   = [];
  const slotCountArr = [];
  const slotNameArr  = [];

  // Truncate to fit inside slot width at 5px pixel font (~6px per char)
  function shortName(name) {
    const s = name.replace('\n', ' ');
    return s.length <= 9 ? s : s.slice(0, 8) + '.';
  }

  for (let i = 0; i < NUM_SLOTS; i++) {
    const sx = PAD + i * (SLOT_SIZE + SLOT_GAP);
    const sy = PAD;

    const slotBg = new Graphics();
    slotBg.roundRect(sx, sy, SLOT_SIZE, SLOT_SIZE, 5);
    slotBg.fill({ color: 0x0d1f30, alpha: 0.95 });
    slotBg.stroke({ width: 1.5, color: 0x2a4a6a });
    container.addChild(slotBg);
    slotGfxArr.push(slotBg);

    const spr = new Sprite(Texture.EMPTY);
    spr.visible = false;
    container.addChild(spr);
    slotSprArr.push(spr);

    const cnt = new Text({ text: '',
      style: { fontFamily: '"Press Start 2P"', fontSize: 7, fill: 0xffffff,
               dropShadow: { color: 0x000000, blur: 0, distance: 1 } } });
    cnt.anchor.set(1, 1);
    cnt.x = sx + SLOT_SIZE - 2;
    cnt.y = sy + SLOT_SIZE - 1;
    container.addChild(cnt);
    slotCountArr.push(cnt);

    const nameLbl = new Text({ text: '',
      style: { fontFamily: '"Press Start 2P"', fontSize: 5, fill: 0xaaccee,
               dropShadow: { color: 0x000000, blur: 0, distance: 1 } } });
    nameLbl.anchor.set(0.5, 0);
    nameLbl.x = sx + SLOT_SIZE / 2;
    nameLbl.y = sy + SLOT_SIZE + 3;
    container.addChild(nameLbl);
    slotNameArr.push(nameLbl);
  }

  // ── Dock slide animation ──────────────────────────────────────────────────
  let targetY = HIDDEN_Y;

  app.ticker.add(() => {
    // Smooth lerp toward targetY
    const diff = targetY - container.y;
    if (Math.abs(diff) > 0.5) container.y += diff * 0.2;
    else container.y = targetY;
  });

  // Reveal when the mouse is within TRIGGER px of the canvas bottom edge
  const TRIGGER = 48;
  window.addEventListener('mousemove', (e) => {
    const rect = app.canvas.getBoundingClientRect();
    const canvasY = (e.clientY - rect.top) * (app.screen.height / rect.height);
    targetY = canvasY >= app.screen.height - TRIGGER ? VISIBLE_Y : HIDDEN_Y;
  });

  // ── Slot rendering ────────────────────────────────────────────────────────
  function renderSlot(i) {
    const sx = PAD + i * (SLOT_SIZE + SLOT_GAP);
    const sy = PAD;
    const slot = slots[i];
    const bg      = slotGfxArr[i];
    const spr     = slotSprArr[i];
    const cnt     = slotCountArr[i];
    const nameLbl = slotNameArr[i];

    bg.clear();
    bg.roundRect(sx, sy, SLOT_SIZE, SLOT_SIZE, 5);
    bg.fill({ color: 0x0d1f30, alpha: 0.95 });
    bg.stroke({ width: 1.5, color: slot ? 0x5a8fc0 : 0x2a4a6a });

    if (slot) {
      if (slot.texture && slot.texture !== Texture.EMPTY) {
        const tex = slot.texture;
        const scale = Math.min(34 / tex.width, 34 / tex.height);
        spr.texture = tex;
        spr.width   = Math.round(tex.width  * scale);
        spr.height  = Math.round(tex.height * scale);
        spr.x = sx + Math.round((SLOT_SIZE - spr.width)  / 2);
        spr.y = sy + Math.round((SLOT_SIZE - spr.height) / 2) - 2;
        spr.visible = true;
      } else {
        spr.visible = false;
      }
      cnt.text = slot.count > 1 ? String(slot.count) : '';
      nameLbl.text = shortName(slot.name);
    } else {
      spr.visible = false;
      cnt.text = '';
      nameLbl.text = '';
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function addDrink(name, texture) {
    const existing = slots.findIndex(s => s && s.name === name);
    if (existing !== -1) {
      slots[existing].count++;
      renderSlot(existing);
      return;
    }
    const empty = slots.findIndex(s => s === null);
    if (empty === -1) return;
    slots[empty] = { name, texture: texture || Texture.EMPTY, count: 1 };
    renderSlot(empty);
  }

  function playEmptySound() {
    if (!sfx.enabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);

      // Descending whoosh — like water going down a drain
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.38);
      og.gain.setValueAtTime(0.5, ctx.currentTime);
      og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      osc.connect(og); og.connect(master);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.42);

      // Filtered white noise burst — water splash/rinse
      const bufLen = Math.floor(ctx.sampleRate * 0.28);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.18, ctx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      noise.connect(hp); hp.connect(ng); ng.connect(master);
      noise.start(ctx.currentTime); noise.stop(ctx.currentTime + 0.28);
    } catch (_) { /* AudioContext blocked */ }
  }

  function clearAll() {
    for (let i = 0; i < NUM_SLOTS; i++) slots[i] = null;
    for (let i = 0; i < NUM_SLOTS; i++) renderSlot(i);
    playEmptySound();
  }

  return { container, addDrink, clearAll };
}
