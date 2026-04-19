import { Application } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { createStartPage } from './startpage.js';
import { createPlayerSelect } from './playerselect.js';
import { createTransition } from './transition.js';
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

  // Load map + player
  const [map, player] = await Promise.all([
    createCafeMap(app),
    createPlayer(app, selectedPath),
  ]);
  app.stage.addChildAt(map.container, 0);
  app.stage.addChildAt(player.sprite, 1);
  await transition.fadeOut();

  // Game loop
  app.ticker.add(() => {
    player.update();
  });
}

init().catch(console.error);
