import { Application } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { createCafeMap } from './maps/cafe.js';
import { createPlayer } from './player.js';

const app = new Application();

async function init() {
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2a5c8a,
    resizeTo: window,
  });
  document.body.appendChild(app.canvas);

  // Load map
  const map = await createCafeMap(app);
  app.stage.addChild(map.container);

  // Load player
  const player = await createPlayer(app);
  app.stage.addChild(player.sprite);

  // Game loop
  app.ticker.add(() => {
    player.update();
  });
}

init().catch(console.error);
