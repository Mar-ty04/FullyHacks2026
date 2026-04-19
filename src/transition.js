import { Graphics } from 'pixi.js';

const COLS = 60;
const ROWS = 38;
const STAGGER = 0.45;
const SPEED = 0.02;

const COLOR_A = 0x020d1f; // dark blue (top-left)
const COLOR_B = 0x0a4a7a; // lighter blue (bottom-right)

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

export function createTransition(app) {
  const overlay = new Graphics();

  function draw(progress) {
    overlay.clear();
    const W = app.screen.width;
    const H = app.screen.height;
    const cellW = W / COLS;
    const cellH = H / ROWS;
    const maxR = Math.sqrt((cellW / 2) ** 2 + (cellH / 2) ** 2) + 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const delay = ((col + row) / (COLS + ROWS - 2)) * STAGGER;
        const p = Math.max(0, Math.min(1, (progress - delay) / (1 - STAGGER)));
        const r = p * maxR;
        if (r > 0) {
          const cx = (col + 0.5) * cellW;
          const cy = (row + 0.5) * cellH;
          const t = (cx / W + cy / H) / 2;
          overlay.circle(cx, cy, r).fill(lerpColor(COLOR_A, COLOR_B, t));
        }
      }
    }
  }

  draw(1);

  const fadeIn = () => new Promise((resolve) => {
    let progress = 0;
    draw(0);
    const tick = (t) => {
      progress = Math.min(1, progress + t.deltaTime * SPEED);
      draw(progress);
      if (progress >= 1) { app.ticker.remove(tick); resolve(); }
    };
    app.ticker.add(tick);
  });

  const fadeOut = () => new Promise((resolve) => {
    let progress = 1;
    const tick = (t) => {
      progress = Math.max(0, progress - t.deltaTime * SPEED);
      draw(progress);
      if (progress <= 0) { app.ticker.remove(tick); resolve(); }
    };
    app.ticker.add(tick);
  });

  return { overlay, fadeIn, fadeOut };
}
