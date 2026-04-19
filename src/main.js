import { Application, Container } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { createStartPage } from './startpage.js';
import { createPlayerSelect } from './playerselect.js';
import { createTransition } from './transition.js';
import { createCafeMap } from './maps/cafe.js';
import { createPlayer } from './player.js';
import { createNPC } from './npc.js';
import { createOrderSystem, getRandomOrder } from './orderSystem.js';

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

  const startPage = await createStartPage(app);
  app.stage.addChildAt(startPage.container, 0);
  await transition.fadeOut();

  await startPage.waitForStart();
  await transition.fadeIn();
  app.stage.removeChild(startPage.container);

  const playerSelect = await createPlayerSelect(app);
  app.stage.addChildAt(playerSelect.container, 0);
  await transition.fadeOut();

  const selectedPath = await playerSelect.waitForSelect();
  await transition.fadeIn();
  app.stage.removeChild(playerSelect.container);

  const map = await createCafeMap(app);
  app.stage.addChildAt(map.floorContainer, 0);

  const gameContainer = new Container();
  gameContainer.sortableChildren = true;
  app.stage.addChildAt(gameContainer, 1);

  for (const f of map.furniture) {
    gameContainer.addChild(f);
  }

  app.stage.addChildAt(map.overlayContainer, 2);

  const player = await createPlayer(app, selectedPath, map.colliders);
  gameContainer.addChild(player.sprite);

  // Order system — all UI containers sit above game content
  const orderSystem = createOrderSystem(app);
  app.stage.addChild(orderSystem.hudContainer);
  app.stage.addChild(orderSystem.ordersButtonContainer);
  app.stage.addChild(orderSystem.dialogContainer);
  app.stage.addChild(orderSystem.ordersPaneContainer);
  app.stage.addChild(orderSystem.seatModalContainer);

  // ---- Queue state ----
  // customerQueue: NPCs walking to or waiting at the counter, max 3
  const customerQueue = [];
  // seatedCustomers: NPCs that have walked to a chair
  const seatedCustomers = [];
  // exitingNPCs: NPCs in the process of walking off-screen (for cleanup)
  const exitingNPCs = [];

  const occupiedChairs = new Set(); // indices into map.chairPositions
  let spawnInProgress = false;
  let customerCounter = 0;
  let dialogTriggered = false;
  let spawnTimer = 0;
  let nextSpawnTime = randomSpawnTime();

  function randomSpawnTime() {
    // 8-20 seconds converted to frames (assumes ~60fps via ticker deltaTime)
    return (8 + Math.random() * 12) * 60;
  }

  function getRandomFreeChair() {
    const all = map.chairPositions.map((_, i) => i).filter(i => !occupiedChairs.has(i));
    if (all.length === 0) return -1;
    return all[Math.floor(Math.random() * all.length)];
  }

  async function spawnQueueNPC() {
    if (spawnInProgress) return;
    if (customerQueue.length >= 3) return;
    if (occupiedChairs.size >= map.chairPositions.length) return;

    spawnInProgress = true;
    customerCounter++;
    const name = `Customer ${customerCounter}`;
    const queueIndex = customerQueue.length;
    const npc = await createNPC(app, map.registerBounds, map.pathStartRow, { queueIndex });
    gameContainer.addChild(npc.sprite);
    customerQueue.push({ npc, name });
    spawnInProgress = false;
  }

  // Returns true when the player's sprite center is inside the counter interaction zone
  function playerNearCounter() {
    const { x, y, w, h } = map.counterInteractZone;
    return player.sprite.x >= x && player.sprite.x <= x + w &&
           player.sprite.y >= y && player.sprite.y <= y + h;
  }

  // Spawn the first NPC right away so the game isn't empty at start
  await spawnQueueNPC();

  await transition.fadeOut();

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    // Freeze player while any dialog is open
    if (!orderSystem.isOpen() && !orderSystem.isSeatModalOpen()) {
      player.update();
    }

    // Spawn timer: add new queue NPC every 8-20 seconds while space available
    spawnTimer += dt;
    if (spawnTimer >= nextSpawnTime && !spawnInProgress) {
      spawnTimer = 0;
      nextSpawnTime = randomSpawnTime();
      if (customerQueue.length < 3 && occupiedChairs.size < map.chairPositions.length) {
        spawnQueueNPC().catch(console.error);
      }
    }

    // Update all queued NPCs
    for (const entry of customerQueue) {
      entry.npc.update();
    }

    // Update seated NPCs
    for (const sc of seatedCustomers) {
      sc.npc.update();
    }

    // Update exiting NPCs and remove once off-screen
    for (let i = exitingNPCs.length - 1; i >= 0; i--) {
      exitingNPCs[i].update();
      if (exitingNPCs[i].hasExited()) {
        gameContainer.removeChild(exitingNPCs[i].sprite);
        exitingNPCs.splice(i, 1);
      }
    }

    // Trigger order dialog when front-of-queue NPC has arrived and player is at counter
    if (!dialogTriggered && customerQueue.length > 0) {
      const frontEntry = customerQueue[0];
      if (frontEntry.npc.arrived() && playerNearCounter()) {
        dialogTriggered = true;
        const order = getRandomOrder();

        // Capture frontEntry in closure so it stays valid after queue shifts
        const capturedEntry = frontEntry;
        orderSystem.show(order, (decision) => {
          // Add money when order is accepted
          if (decision === 'yes') {
            orderSystem.addMoney(20);
          }

          const chairIndex = getRandomFreeChair();
          if (chairIndex !== -1) {
            // Send NPC to sit at the chosen chair
            occupiedChairs.add(chairIndex);
            const chairPos = map.chairPositions[chairIndex];
            capturedEntry.npc.startSitting(chairPos);
            seatedCustomers.push({ npc: capturedEntry.npc, name: capturedEntry.name, order, chairIndex });
            orderSystem.addSeatedCustomer(capturedEntry.npc, capturedEntry.name, order);

            // Clicking the seated NPC opens the order modal
            capturedEntry.npc.setOnClick(() => {
              orderSystem.showSeatModal({ name: capturedEntry.name, order }, () => {
                // Mark as Done: free chair and walk NPC off-screen
                const scIdx = seatedCustomers.findIndex(sc => sc.npc === capturedEntry.npc);
                if (scIdx !== -1) {
                  occupiedChairs.delete(seatedCustomers[scIdx].chairIndex);
                  seatedCustomers.splice(scIdx, 1);
                }
                orderSystem.removeSeatedCustomer(capturedEntry.npc);
                capturedEntry.npc.startExit();
                exitingNPCs.push(capturedEntry.npc);
              });
            });
          } else {
            // Cafe full — NPC exits immediately
            capturedEntry.npc.startExit();
            exitingNPCs.push(capturedEntry.npc);
          }

          customerQueue.shift();
          dialogTriggered = false;
        });
      }
    }

    // Clean up queue NPCs that exited without sitting (e.g. cafe full)
    for (let i = customerQueue.length - 1; i >= 0; i--) {
      if (customerQueue[i].npc.hasExited()) {
        gameContainer.removeChild(customerQueue[i].npc.sprite);
        customerQueue.splice(i, 1);
      }
    }

    // Depth sort by Y position
    for (const child of gameContainer.children) {
      if (child.anchor && child.anchor.y > 0) {
        child.zIndex = child.y;
      } else {
        child.zIndex = child.y + child.height;
      }
    }
    gameContainer.sortChildren();
  });
}

init().catch(console.error);
