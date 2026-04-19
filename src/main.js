import { Application, Container, Assets, Sprite, Text, Graphics } from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { createStartPage } from './startpage.js';
import { createPlayerSelect } from './playerselect.js';
import { createTransition } from './transition.js';
import { createCafeMap } from './maps/cafe.js';
import { createPlayer } from './player.js';
import { createNPC } from './npc.js';
import { createOrderSystem, getRandomOrder } from './orderSystem.js';
import { createCraftingUI } from './ui/craftingUI.js';
import { createToolbar } from './ui/toolbar.js';
import { createSettingsUI } from './ui/settingsUI.js';
import { sfx } from './audio.js';

const app = new Application();

// ── Background music ──────────────────────────────────────────────────────────
function initBgMusic() {
  return new Promise((resolve) => {
    const div = document.createElement('div');
    div.id = 'yt-bg';
    div.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;pointer-events:none;';
    document.body.appendChild(div);

    window.onYouTubeIframeAPIReady = () => {
      // eslint-disable-next-line no-undef
      new YT.Player('yt-bg', {
        videoId: 'VPFxZw5qUwE',
        playerVars: { autoplay: 1, loop: 1, playlist: 'VPFxZw5qUwE', controls: 0, mute: 1 },
        events: {
          onReady(e) {
            e.target.mute();
            e.target.playVideo();
            resolve(e.target);
          },
        },
      });
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

function fadeInMusic(player, targetVol = 32, ms = 3500) {
  if (!player) return;
  player.unMute();
  player.setVolume(0);
  const steps = 70;
  const stepMs = ms / steps;
  let step = 0;
  const id = setInterval(() => {
    step++;
    // ease-in curve: slow start, speeds up
    const t = step / steps;
    player.setVolume(Math.round(targetVol * (t * t)));
    if (step >= steps) clearInterval(id);
  }, stepMs);
}

async function init() {
  // Load pixel font before anything renders
  await document.fonts.load('16px "Press Start 2P"');

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
    const viewW = vp ? vp.width : window.innerWidth;
    const viewH = vp ? vp.height : window.innerHeight;
    const scale = Math.min(viewW / GAME_WIDTH, viewH / GAME_HEIGHT);
    app.canvas.style.width = `${GAME_WIDTH * scale}px`;
    app.canvas.style.height = `${GAME_HEIGHT * scale}px`;
  }
  scaleToFit();
  window.addEventListener('resize', scaleToFit);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scaleToFit);
  }

  const transition = createTransition(app);

  // Begin loading music silently — muted autoplay is allowed before user gesture
  const musicPromise = initBgMusic().catch(() => null);

  // Settings UI lives on every screen — always layered just below the fade overlay
  const settingsUI = createSettingsUI(app);
  musicPromise.then(player => { if (player) settingsUI.setPlayer(player); });

  const startPage = await createStartPage(app);
  app.stage.addChildAt(startPage.container, 0);
  app.stage.addChild(settingsUI.container);
  app.stage.addChild(transition.overlay);
  await transition.fadeOut();

  await startPage.waitForStart();

  // User just clicked — safe to unmute; fade in over 3.5s during the transition
  musicPromise.then(player => { if (player) fadeInMusic(player); });

  await transition.fadeIn();
  app.stage.removeChild(startPage.container);

  const playerSelect = await createPlayerSelect(app);
  app.stage.addChildAt(playerSelect.container, 0);
  app.stage.addChild(settingsUI.container);
  app.stage.addChild(transition.overlay);
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
    if (customerQueue.length >= 5) return;

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

  // Synthesized cha-ching sound using Web Audio API — played when money is earned
  function playChaChing() {
    if (!sfx.enabled) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Low "cha" hit
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.08);
    g1.gain.setValueAtTime(0.25, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.start(now); osc1.stop(now + 0.12);

    // High "ching" note
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1760, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.45);
    g2.gain.setValueAtTime(0.35, now + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.start(now + 0.08); osc2.stop(now + 0.5);
  }

  // Spawn the first NPC right away so the game isn't empty at start
  await spawnQueueNPC();

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
  backBtn.on('pointerout', () => { backBtn.alpha = 0.7; backLabel.alpha = 0.7; });
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
      btn.on('pointerout', () => { bg.alpha = 1; });
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

  // ---- E-key order interaction ----

  // Encapsulates all order-dialog logic; called when player presses E at register
  function openOrderDialog(frontEntry) {
    dialogTriggered = true;
    const order = getRandomOrder();
    const capturedEntry = frontEntry;
    orderSystem.show(order, (decision) => {
      if (decision === 'yes') {
        const chairIndex = getRandomFreeChair();
        occupiedChairs.add(chairIndex);
        const chairPos = map.chairPositions[chairIndex];
        capturedEntry.npc.startSitting(chairPos);
        seatedCustomers.push({ npc: capturedEntry.npc, name: capturedEntry.name, order, chairIndex, decision });
        orderSystem.addSeatedCustomer(capturedEntry.npc, capturedEntry.name, order);
        capturedEntry.npc.setOnClick(() => {
          orderSystem.showSeatModal({ name: capturedEntry.name, order }, () => {
            const scIdx = seatedCustomers.findIndex(sc => sc.npc === capturedEntry.npc);
            if (scIdx !== -1) {
              if (seatedCustomers[scIdx].decision === 'yes') {
                orderSystem.addMoney(20);
                playChaChing();
              }
              occupiedChairs.delete(seatedCustomers[scIdx].chairIndex);
              seatedCustomers.splice(scIdx, 1);
            }
            orderSystem.removeSeatedCustomer(capturedEntry.npc);
            capturedEntry.npc.startExit('right');
            exitingNPCs.push(capturedEntry.npc);
          });
        });
      } else {
        capturedEntry.npc.startExit('right');
        exitingNPCs.push(capturedEntry.npc);
      }
      customerQueue.shift();
      for (const entry of customerQueue) entry.npc.advanceQueue();
      dialogTriggered = false;
    }, () => {
      dialogTriggered = false;
    });
  }

  // "Press [E]" floating prompt above the register — shown when interaction is ready
  const interactPrompt = new Text({
    text: '[E] Take Order',
    style: { fill: 0xffffff, fontSize: 11, fontFamily: 'monospace' },
  });
  interactPrompt.anchor.set(0.5, 1);
  interactPrompt.x = map.counterInteractZone.x + map.counterInteractZone.w / 2;
  interactPrompt.y = map.counterInteractZone.y - 4;
  interactPrompt.visible = false;
  app.stage.addChild(interactPrompt);

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'e' && e.key !== 'E') return;
    if (dialogTriggered || orderSystem.isOpen()) return;
    if (customerQueue.length === 0) return;
    if (occupiedChairs.size >= map.chairPositions.length) return;
    const front = customerQueue[0];
    if (!front.npc.arrived() || !playerNearCounter()) return;
    playInteractSound();
    openOrderDialog(front);
  });

  // Re-layer settings + fade overlay on top of all game UI
  app.stage.addChild(settingsUI.container);
  app.stage.addChild(transition.overlay);
  await transition.fadeOut();

  // ── Crafting system (Vien) ──────────────────────────────────────────────
  const toolbar = createToolbar(app);
  app.stage.addChild(toolbar.container);
  // Keep settings above toolbar but below transition overlay
  app.stage.addChild(settingsUI.container);
  app.stage.addChild(transition.overlay);

  let gamePaused = false;
  const craftingUI = await createCraftingUI(
    app,
    () => { gamePaused = false; },
    (name, tex) => { toolbar.addDrink(name, tex); },
    () => orderSystem.getBalance(),
    (amt) => orderSystem.spendMoney(amt),
  );
  app.stage.addChild(craftingUI.container);

  // Espresso machine interaction
  const ESPRESSO_CX = 322;
  const ESPRESSO_CY = 195;
  const ESPRESSO_R = 15;
  let nearEspresso = false;

  const pressEHint = new Text({
    text: '[ E ] Craft',
    style: {
      fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff,
      dropShadow: { color: 0x000000, blur: 0, distance: 1 }
    },
  });
  pressEHint.anchor.set(0.5, 1);
  pressEHint.x = ESPRESSO_CX;
  pressEHint.y = 65;
  pressEHint.visible = false;
  app.stage.addChild(pressEHint);

  // Sink interaction (empties toolbar)
  const SINK_CX = 538;
  const SINK_CY = 195;
  const SINK_R = 15;
  let nearSink = false;

  const sinkHint = new Text({
    text: '[ E ] Empty',
    style: {
      fontFamily: '"Press Start 2P"', fontSize: 8, fill: 0xffffff,
      dropShadow: { color: 0x000000, blur: 0, distance: 1 }
    },
  });
  sinkHint.anchor.set(0.5, 1);
  sinkHint.x = SINK_CX;
  sinkHint.y = 65;
  sinkHint.visible = false;
  app.stage.addChild(sinkHint);

  function playInteractSound() {
    if (!sfx.enabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      // Short two-tone blip: low then high
      [320, 560].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.09);
        osc.start(now + i * 0.055);
        osc.stop(now  + i * 0.055 + 0.09);
      });
    } catch (_) {}
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'e' || e.key === 'E') {
      if (nearEspresso && !gamePaused) {
        playInteractSound();
        gamePaused = true;
        craftingUI.open();
      } else if (nearSink && !gamePaused) {
        playInteractSound();
        toolbar.clearAll();
      }
    } else if (e.key === 'Escape' && gamePaused) {
      gamePaused = false;
      craftingUI.close();
    }
  });

  // ── Game loop ───────────────────────────────────────────────────────────
  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    // Freeze player while any dialog or crafting is open
    if (!orderSystem.isOpen() && !orderSystem.isSeatModalOpen() && !gamePaused) {
      player.update();
    }

    // Crafting proximity checks
    const px = player.sprite.x;
    const py = player.sprite.y;
    const dex = px - ESPRESSO_CX, dey = py - ESPRESSO_CY;
    nearEspresso = Math.sqrt(dex * dex + dey * dey) < ESPRESSO_R;
    pressEHint.visible = nearEspresso && !gamePaused;

    const dsx = px - SINK_CX, dsy = py - SINK_CY;
    nearSink = Math.sqrt(dsx * dsx + dsy * dsy) < SINK_R;
    sinkHint.visible = nearSink && !gamePaused;

    // Spawn timer: add new queue NPC every 8-20 seconds while space available
    spawnTimer += dt;
    if (spawnTimer >= nextSpawnTime && !spawnInProgress) {
      spawnTimer = 0;
      nextSpawnTime = randomSpawnTime();
      if (customerQueue.length < 5) {
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

    // Show [E] prompt when player can interact with the register
    const canInteract = !dialogTriggered && !orderSystem.isOpen() &&
      customerQueue.length > 0 && customerQueue[0].npc.arrived() &&
      playerNearCounter() && occupiedChairs.size < map.chairPositions.length;
    interactPrompt.visible = canInteract;

    // Clean up queue NPCs that exited without sitting (e.g. cafe full)
    for (let i = customerQueue.length - 1; i >= 0; i--) {
      if (customerQueue[i].npc.hasExited()) {
        gameContainer.removeChild(customerQueue[i].npc.sprite);
        customerQueue.splice(i, 1);
      }
    }

    // Depth sort by Y position
    for (const child of gameContainer.children) {
      child.zIndex = child.y;
    }

    // Seated NPCs must render above their stool
    for (const sc of seatedCustomers) {
      if (sc.npc.isSittingIdle()) {
        sc.npc.sprite.zIndex = sc.npc.sprite.y + 100;
      }
    }

    gameContainer.sortChildren();
  });
}

init().catch(console.error);
