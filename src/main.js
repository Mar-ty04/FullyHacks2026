import { Application, Container, Assets, Sprite, Text, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { createStartPage } from './startpage.js';
import { createPlayerSelect } from './playerselect.js';
import { createTransition } from './transition.js';
import { createCafeMap } from './maps/cafe.js';
import { createPlayer } from './player.js';
import { createNPC } from './npc.js';

const app = new Application();

async function init() {
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2a5c8a,
    resolution: 1,
  });

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:#6ab8f5;display:flex;align-items:center;justify-content:center;';
  document.body.appendChild(wrapper);

  // Animated bubbles that fill the side bars
  const bubbleCSS = document.createElement('style');
  bubbleCSS.textContent = `
    @keyframes bubble-rise {
      0%   { transform: translateY(0) scale(1);    opacity: 0; }
      8%   { opacity: 0.9; }
      92%  { opacity: 0.7; }
      100% { transform: translateY(-110vh) scale(1.3); opacity: 0; }
    }
    .side-bubble {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), rgba(140,210,255,0.15));
      border: 2px solid rgba(200,240,255,0.7);
      box-shadow: 0 0 6px rgba(180,230,255,0.5);
      animation: bubble-rise linear infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(bubbleCSS);

  for (let i = 0; i < 60; i++) {
    const b = document.createElement('div');
    b.className = 'side-bubble';
    const size = 5 + Math.random() * 28;
    b.style.cssText = `width:${size}px;height:${size}px;bottom:${-size}px;left:${Math.random() * 100}%;animation-duration:${4 + Math.random() * 8}s;animation-delay:${-Math.random() * 14}s;`;
    wrapper.appendChild(b);
  }

  app.canvas.style.position = 'relative';
  app.canvas.style.zIndex = '1';
  wrapper.appendChild(app.canvas);

  function scaleToFit() {
    const vp = window.visualViewport;
    const viewW = vp ? vp.width  : window.innerWidth;
    const viewH = vp ? vp.height : window.innerHeight;
    const scale = Math.min(viewW / GAME_WIDTH, viewH / GAME_HEIGHT);
    app.canvas.style.width  = `${GAME_WIDTH  * scale}px`;
    app.canvas.style.height = `${GAME_HEIGHT * scale}px`;
  }
  scaleToFit();
  window.addEventListener('resize', scaleToFit);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scaleToFit);
  }

  const transition = createTransition(app);
  app.stage.addChild(transition.overlay);

  // Start screen
  const startPage = await createStartPage(app);
  app.stage.addChildAt(startPage.container, 0);
  await transition.fadeOut();

  await startPage.waitForStart();
  await transition.fadeIn();
  app.stage.removeChild(startPage.container);

  // Player selection
  const playerSelect = await createPlayerSelect(app);
  app.stage.addChildAt(playerSelect.container, 0);
  await transition.fadeOut();

  const selectedPath = await playerSelect.waitForSelect();
  await transition.fadeIn();
  app.stage.removeChild(playerSelect.container);

  // Load map
  const map = await createCafeMap(app);
  app.stage.addChildAt(map.floorContainer, 0);

  // Game objects container — depth sorted by y each frame
  const gameContainer = new Container();
  gameContainer.sortableChildren = true;
  app.stage.addChildAt(gameContainer, 1);

  // Add furniture to game container
  for (const f of map.furniture) {
    gameContainer.addChild(f);
  }

  // Overlay — items on top of furniture (espresso, sink, register)
  app.stage.addChildAt(map.overlayContainer, 2);

  // Load player with colliders
  const player = await createPlayer(app, selectedPath, map.colliders);
  gameContainer.addChild(player.sprite);

  // Spawn an NPC
  const npc = await createNPC(app, map.registerBounds, map.pathStartRow);
  gameContainer.addChild(npc.sprite);

  // Back button — top-left corner
  const arrowTex = await Assets.load('/sprites/start-sprites/arrow.png');
  const backBtn = new Sprite(arrowTex);
  backBtn.scale.set(0.08);
  backBtn.anchor.set(0.5);
  backBtn.rotation = Math.PI;
  backBtn.x = 12 + backBtn.width / 2;
  backBtn.y = 12 + backBtn.height / 2;
  backBtn.interactive = true;
  backBtn.cursor = 'pointer';
  backBtn.alpha = 0.7;
  const backLabel = new Text({
    text: 'return to start',
    style: { fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0x000000 },
  });
  backLabel.anchor.set(0, 0.5);
  backLabel.x = backBtn.x + backBtn.width / 2 + 6;
  backLabel.y = backBtn.y;
  backLabel.alpha = 0.7;
  app.stage.addChild(backLabel);

  backBtn.on('pointerover', () => { backBtn.alpha = 1; backLabel.alpha = 1; });
  backBtn.on('pointerout',  () => { backBtn.alpha = 0.7; backLabel.alpha = 0.7; });
  backBtn.on('pointerdown', () => {
    const W = app.screen.width;
    const H = app.screen.height;

    const popup = new Container();

    const dim = new Graphics();
    dim.rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.5 });
    dim.interactive = true;
    popup.addChild(dim);

    const boxW = 320, boxH = 140;
    const box = new Graphics();
    box.rect(0, 0, boxW, boxH).fill(0xfff8f0);
    box.rect(0, 0, boxW, boxH).stroke({ width: 3, color: 0x5c3a21 });
    box.x = (W - boxW) / 2;
    box.y = (H - boxH) / 2;
    popup.addChild(box);

    const msg = new Text({
      text: 'Return to start?',
      style: { fontFamily: '"Press Start 2P"', fontSize: 10, fill: 0x3a2010, wordWrap: true, wordWrapWidth: boxW - 40, align: 'center' },
    });
    msg.anchor.set(0.5);
    msg.x = W / 2;
    msg.y = H / 2 - 22;
    popup.addChild(msg);

    function makeBtn(label, color, onClick) {
      const btn = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, 100, 32).fill(color).stroke({ width: 2, color: 0x5c3a21 });
      btn.addChild(bg);
      const txt = new Text({ text: label, style: { fontFamily: '"Press Start 2P"', fontSize: 9, fill: 0xffffff } });
      txt.anchor.set(0.5);
      txt.x = 50; txt.y = 16;
      btn.addChild(txt);
      btn.interactive = true;
      btn.cursor = 'pointer';
      btn.on('pointerover', () => { bg.alpha = 0.8; });
      btn.on('pointerout',  () => { bg.alpha = 1; });
      btn.on('pointerdown', onClick);
      return btn;
    }

    const yesBtn = makeBtn('YES', 0x5c3a21, async () => {
      app.stage.removeChild(popup);
      app.stage.addChild(transition.overlay);
      await transition.fadeIn();
      window.location.reload();
    });
    yesBtn.x = W / 2 - 115;
    yesBtn.y = H / 2 + 18;
    popup.addChild(yesBtn);

    const noBtn = makeBtn('NO', 0x8aab5a, () => {
      app.stage.removeChild(popup);
      backBtn.interactive = true;
    });
    noBtn.x = W / 2 + 15;
    noBtn.y = H / 2 + 18;
    popup.addChild(noBtn);

    app.stage.addChild(popup);
  });
  app.stage.addChild(backBtn);

  await transition.fadeOut();

  // Game loop
  app.ticker.add(() => {
    player.update();
    npc.update();

    // Depth sort using zIndex
    for (const child of gameContainer.children) {
      if (child.anchor && child.anchor.y > 0) {
        // Player/NPC: sort by y (center of sprite)
        child.zIndex = child.y;
      } else {
        // Furniture: sort by bottom edge
        child.zIndex = child.y + child.height;
      }
    }
    gameContainer.sortChildren();
  });
}

init().catch(console.error);
