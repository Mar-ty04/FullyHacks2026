import { Graphics } from 'pixi.js';

export function createTransition(app) {
  const overlay = new Graphics();
  overlay.rect(0, 0, app.screen.width, app.screen.height).fill(0x000000);
  overlay.alpha = 1;

  app.renderer.on('resize', () => {
    overlay.clear();
    overlay.rect(0, 0, app.screen.width, app.screen.height).fill(0x000000);
  });

  const fadeIn = () => new Promise((resolve) => {
    overlay.alpha = 0;
    const tick = (t) => {
      overlay.alpha = Math.min(1, overlay.alpha + t.deltaTime * 0.025);
      if (overlay.alpha >= 1) { app.ticker.remove(tick); resolve(); }
    };
    app.ticker.add(tick);
  });

  const fadeOut = () => new Promise((resolve) => {
    overlay.alpha = 1;
    const tick = (t) => {
      overlay.alpha = Math.max(0, overlay.alpha - t.deltaTime * 0.025);
      if (overlay.alpha <= 0) { app.ticker.remove(tick); resolve(); }
    };
    app.ticker.add(tick);
  });

  return { overlay, fadeIn, fadeOut };
}
