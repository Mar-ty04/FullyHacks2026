import { Container, Graphics, Text } from 'pixi.js';
import { sfx } from '../audio.js';

export function createSettingsUI(app) {
  const BTN   = 36;
  const BTN_X = app.screen.width  - BTN - 10;
  const BTN_Y = app.screen.height - BTN - 80;

  const PW = 200, PH = 120;
  const PX = app.screen.width  - PW - 10;
  const PY = BTN_Y - PH - 6;

  let ytPlayer = null;
  let musicMuted = false;
  let open = false;

  const container = new Container();

  // ── Gear button ────────────────────────────────────────────────────────────
  const btnGfx = new Graphics();
  function drawBtn(hov) {
    btnGfx.clear();
    btnGfx.roundRect(0, 0, BTN, BTN, 8);
    btnGfx.fill({ color: hov ? 0x1a3a5a : 0x050e18, alpha: 0.92 });
    btnGfx.stroke({ width: 1.5, color: 0x3a6a9a, alpha: 0.9 });
  }
  drawBtn(false);
  btnGfx.x = BTN_X; btnGfx.y = BTN_Y;
  btnGfx.interactive = true; btnGfx.cursor = 'pointer';
  container.addChild(btnGfx);

  const gearLbl = new Text({ text: '\u2699', style: { fontSize: 20, fill: 0x88bbdd } });
  gearLbl.anchor.set(0.5);
  gearLbl.x = BTN_X + BTN / 2;
  gearLbl.y = BTN_Y + BTN / 2 + 1;
  container.addChild(gearLbl);

  btnGfx.on('pointerover', () => drawBtn(true));
  btnGfx.on('pointerout',  () => drawBtn(false));
  btnGfx.on('pointerdown', togglePanel);

  // ── Panel ──────────────────────────────────────────────────────────────────
  const panel = new Container();
  panel.x = PX; panel.y = PY;
  panel.visible = false;
  container.addChild(panel);

  const pbg = new Graphics();
  pbg.roundRect(0, 0, PW, PH, 10);
  pbg.fill({ color: 0x050e18, alpha: 0.94 });
  pbg.stroke({ width: 2, color: 0x3a6a9a, alpha: 0.9 });
  panel.addChild(pbg);

  const titleTxt = new Text({ text: 'Settings',
    style: { fontFamily: '"Press Start 2P"', fontSize: 9, fill: 0x88bbdd } });
  titleTxt.x = 14; titleTxt.y = 13;
  panel.addChild(titleTxt);

  const divider = new Graphics();
  divider.rect(12, 31, PW - 24, 1);
  divider.fill({ color: 0x3a6a9a, alpha: 0.5 });
  panel.addChild(divider);

  // ── Row helper ─────────────────────────────────────────────────────────────
  const TW = 66, TH = 22;

  function makeRow(label, rowY, isOn, onToggle) {
    const lbl = new Text({ text: label,
      style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff } });
    lbl.x = 14; lbl.y = rowY + 3;
    panel.addChild(lbl);

    const TX = PW - TW - 14;
    const gfx = new Graphics();
    let state = isOn;

    function draw() {
      gfx.clear();
      gfx.roundRect(0, 0, TW, TH, 6);
      gfx.fill(state ? 0x1a5a2a : 0x5a1a1a);
      gfx.stroke({ width: 1.5, color: state ? 0x44cc66 : 0xff5555 });
    }
    draw();
    gfx.x = TX; gfx.y = rowY - 2;
    gfx.interactive = true; gfx.cursor = 'pointer';
    panel.addChild(gfx);

    const txt = new Text({ text: state ? 'ON' : 'OFF',
      style: { fontFamily: '"Press Start 2P"', fontSize: 7, fill: 0xffffff } });
    txt.anchor.set(0.5);
    txt.x = TX + TW / 2; txt.y = rowY - 2 + TH / 2;
    panel.addChild(txt);

    gfx.on('pointerdown', () => {
      state = !state;
      draw();
      txt.text = state ? 'ON' : 'OFF';
      onToggle(state);
    });
  }

  makeRow('Music', 42, true, (on) => {
    musicMuted = !on;
    if (ytPlayer) musicMuted ? ytPlayer.mute() : ytPlayer.unMute();
  });

  makeRow('SFX', 78, true, (on) => {
    sfx.enabled = on;
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function togglePanel() {
    open = !open;
    panel.visible = open;
    gearLbl.style.fill = open ? 0xffffff : 0x88bbdd;
  }

  app.canvas.addEventListener('pointerdown', (e) => {
    if (!open) return;
    const rect  = app.canvas.getBoundingClientRect();
    const scale = app.screen.width / rect.width;
    const cx = (e.clientX - rect.left) * scale;
    const cy = (e.clientY - rect.top)  * scale;
    const inBtn   = cx >= BTN_X && cx <= BTN_X + BTN && cy >= BTN_Y && cy <= BTN_Y + BTN;
    const inPanel = cx >= PX && cx <= PX + PW && cy >= PY && cy <= PY + PH;
    if (!inBtn && !inPanel) togglePanel();
  });

  return {
    container,
    setPlayer(player) { ytPlayer = player; },
  };
}
