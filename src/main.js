import { Application, Assets, Sprite, AnimatedSprite, Texture, Container, Rectangle } from 'pixi.js';

// --- Constants ---
const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;
const PLAYER_SPEED = 3;
const FRAME_W = 96;
const FRAME_H = 80;
const SHEET_COLS = 14;

// --- App setup ---
const app = new Application();

async function init() {
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x2a5c8a,
    resizeTo: window,
  });
  document.body.appendChild(app.canvas);

  // --- Load textures ---
  const fishTexture = await Assets.load('/sprites/FishFight/player/PlayerFishy(96x80).png');
  const floorTexture = await Assets.load('/sprites/Cafe/Floors&Walls/floor48x48.png');

  // --- Floor area (cafe floor) ---
  // Use the brown brick tile (row 0, col 0)
  const floorTileRect = new Texture({ source: floorTexture.source, frame: new Rectangle(0, 0, 48, 48) });

  const TILE_SIZE = 48;
  const CAFE_X = 0;
  const CAFE_Y = 0;
  const CAFE_COLS = Math.ceil(app.screen.width / TILE_SIZE);
  const CAFE_ROWS = Math.ceil(app.screen.height / TILE_SIZE);

  const cafeContainer = new Container();
  app.stage.addChild(cafeContainer);

  // Draw floor tiles
  for (let row = 0; row < CAFE_ROWS; row++) {
    for (let col = 0; col < CAFE_COLS; col++) {
      const tile = new Sprite(floorTileRect);
      tile.x = CAFE_X + col * TILE_SIZE;
      tile.y = CAFE_Y + row * TILE_SIZE;
      cafeContainer.addChild(tile);
    }
  }

  // --- Parse player sprite sheet ---
  // Row 0: idle/walk right (frames 0-10)
  // Row 1: idle/walk left (frames 0-5)
  const source = fishTexture.source;

  function getFrames(row, startCol, count) {
    const frames = [];
    for (let i = startCol; i < startCol + count; i++) {
      frames.push(new Texture({
        source,
        frame: new Rectangle(i * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H),
      }));
    }
    return frames;
  }

  const idleRightFrames = getFrames(0, 0, 1);
  const walkRightFrames = getFrames(0, 0, 11);
  const idleLeftFrames = getFrames(1, 0, 1);
  const walkLeftFrames = getFrames(1, 0, 6);
  // For up/down we'll reuse right/left for now
  const walkUpFrames = walkRightFrames;
  const walkDownFrames = walkLeftFrames;
  const idleUpFrames = idleRightFrames;
  const idleDownFrames = idleLeftFrames;

  // --- Player ---
  const player = new AnimatedSprite(idleRightFrames);
  player.anchor.set(0.5, 0.5);
  player.x = CAFE_X + (CAFE_COLS * TILE_SIZE) / 2;
  player.y = CAFE_Y + (CAFE_ROWS * TILE_SIZE) / 2;
  player.scale.set(1.2);
  player.animationSpeed = 0.15;
  player.play();
  app.stage.addChild(player);

  // --- Input ---
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  let currentAnim = 'idleRight';

  function setAnimation(name, frames) {
    if (currentAnim === name) return;
    currentAnim = name;
    player.textures = frames;
    player.play();
  }

  // --- Game loop ---
  app.ticker.add(() => {
    let dx = 0;
    let dy = 0;

    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;
    if (keys['ArrowUp'] || keys['w']) dy -= 1;
    if (keys['ArrowDown'] || keys['s']) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    player.x += dx * PLAYER_SPEED;
    player.y += dy * PLAYER_SPEED;

    // Clamp to cafe bounds
    const halfW = (FRAME_W * player.scale.x) / 2;
    const halfH = (FRAME_H * player.scale.y) / 2;
    player.x = Math.max(CAFE_X + halfW, Math.min(CAFE_X + CAFE_COLS * TILE_SIZE - halfW, player.x));
    player.y = Math.max(CAFE_Y + halfH, Math.min(CAFE_Y + CAFE_ROWS * TILE_SIZE - halfH, player.y));

    // Animation state
    if (dx === 0 && dy === 0) {
      if (currentAnim.includes('Right') || currentAnim.includes('Up')) {
        setAnimation('idleRight', idleRightFrames);
      } else {
        setAnimation('idleLeft', idleLeftFrames);
      }
    } else if (dx > 0) {
      setAnimation('walkRight', walkRightFrames);
    } else if (dx < 0) {
      setAnimation('walkLeft', walkLeftFrames);
    } else if (dy < 0) {
      setAnimation('walkUp', walkUpFrames);
    } else if (dy > 0) {
      setAnimation('walkDown', walkDownFrames);
    }
  });
}

init().catch(console.error);
