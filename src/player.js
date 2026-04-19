import { Assets, AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { FRAME_W, FRAME_H, PLAYER_SPEED, TILE_SIZE, PATH_COLS } from './constants.js';

function getFrames(source, row, startCol, count) {
  const frames = [];
  for (let i = startCol; i < startCol + count; i++) {
    frames.push(new Texture({
      source,
      frame: new Rectangle(i * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H),
    }));
  }
  return frames;
}

export async function createPlayer(app, spritePath = '/sprites/FishFight/player/PlayerFishy(96x80).png') {
  const fishTexture = await Assets.load(spritePath);
  const source = fishTexture.source;

  // Row 1 is the walk cycle (6 frames) — use for both directions, flip for right
  const walkFrames = getFrames(source, 1, 0, 6);
  const idleFrames = getFrames(source, 1, 0, 1);

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  const sprite = new AnimatedSprite(idleFrames);
  sprite.anchor.set(0.5, 0.5);
  sprite.x = PATH_COLS * TILE_SIZE + (totalCols - PATH_COLS) * TILE_SIZE / 2;
  sprite.y = totalRows * TILE_SIZE / 2;
  sprite.scale.set(1.2);
  sprite.animationSpeed = 0.15;
  sprite.play();

  // Input
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  let moving = false;
  const SCALE = 1.2;

  function update() {
    let dx = 0;
    let dy = 0;

    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;
    if (keys['ArrowUp'] || keys['w']) dy -= 1;
    if (keys['ArrowDown'] || keys['s']) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    sprite.x += dx * PLAYER_SPEED;
    sprite.y += dy * PLAYER_SPEED;

    // Clamp player to cafe area (right of NPC path)
    const halfW = (FRAME_W * SCALE) / 2;
    const halfH = (FRAME_H * SCALE) / 2;
    const cafeLeft = PATH_COLS * TILE_SIZE;
    sprite.x = Math.max(cafeLeft + halfW, Math.min(totalCols * TILE_SIZE - halfW, sprite.x));
    sprite.y = Math.max(halfH, Math.min(totalRows * TILE_SIZE - halfH, sprite.y));

    // Flip direction
    if (dx > 0) sprite.scale.x = SCALE;
    if (dx < 0) sprite.scale.x = -SCALE;

    // Switch between walk and idle
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving && !moving) {
      sprite.textures = walkFrames;
      sprite.play();
    } else if (!isMoving && moving) {
      sprite.textures = idleFrames;
      sprite.play();
    }
    moving = isMoving;
  }

  return { sprite, update };
}
