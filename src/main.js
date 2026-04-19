import { Application, Container } from 'pixi.js';
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
