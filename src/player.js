import { Assets, AnimatedSprite, Texture, Rectangle, Graphics } from 'pixi.js';
import { FRAME_W, FRAME_H, PLAYER_SPEED, TILE_SIZE, PATH_ROWS } from './constants.js';

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

export async function createPlayer(app, spritePath = '/sprites/FishFight/player/PlayerFishy(96x80).png', colliders = []) {
  const fishTexture = await Assets.load(spritePath);
  const source = fishTexture.source;

  // Row 1 is the walk cycle (6 frames) — use for both directions, flip for right
  const walkFrames = getFrames(source, 1, 0, 6);
  // Row 0 is the idle animation (frames 0-6)
  const idleFrames = getFrames(source, 0, 0, 7);

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  const sprite = new AnimatedSprite(idleFrames);
  sprite.anchor.set(0.5, 0.5);
  // Spawn behind the counter area
  sprite.x = 250;
  sprite.y = 220;
  sprite.scale.set(1.2);
  sprite.animationSpeed = 0.15;
  sprite.play();

  // Input
  const keys = {};
  window.addEventListener('keydown', (e) => { keys[e.key] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  let moving = false;
  const SCALE = 1.2;

  // Debug: green box showing player collision area
  const debugBox = new Graphics();
  app.stage.addChild(debugBox);

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

    const newX = sprite.x + dx * PLAYER_SPEED;
    const newY = sprite.y + dy * PLAYER_SPEED;

    // Clamp to cafe area (above NPC path)
    const halfW = (FRAME_W * SCALE) / 2;
    const halfH = (FRAME_H * SCALE) / 2;
    const cafeBottom = (totalRows - PATH_ROWS) * TILE_SIZE;
    const clampedX = Math.max(halfW, Math.min(totalCols * TILE_SIZE - halfW, newX));
    const clampedY = Math.max(halfH, Math.min(cafeBottom - halfH, newY));

    // Player collision box
    const playerW = 40;
    const playerH = 38;

    function collidesAt(px, py) {
      const left = px - playerW / 2;
      const top = py - playerH / 2;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (left < c.x + c.w && left + playerW > c.x && top < c.y + c.h && top + playerH > c.y) {
          return true;
        }
      }
      return false;
    }

    // Debug: log every second
    if (!window._debugTimer) window._debugTimer = 0;
    window._debugTimer++;
    if (window._debugTimer % 60 === 0) {
      const left = sprite.x - playerW / 2;
      const top = sprite.y + halfH - playerH;
      console.log('Player feet box:', { left, top, w: playerW, h: playerH });
      console.log('Colliders count:', colliders.length);
      console.log('Currently colliding:', collidesAt(sprite.x, sprite.y));
    }

    // Try moving on each axis independently
    if (!collidesAt(clampedX, sprite.y)) {
      sprite.x = clampedX;
    }
    if (!collidesAt(sprite.x, clampedY)) {
      sprite.y = clampedY;
    }

    // Debug: draw player collision box in green
    debugBox.clear();
    const dLeft = sprite.x - playerW / 2;
    const dTop = sprite.y - playerH / 2;
    debugBox.rect(dLeft, dTop, playerW, playerH);
    debugBox.stroke({ width: 2, color: 0x00ff00 });
    debugBox.fill({ color: 0x00ff00, alpha: 0.2 });

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
