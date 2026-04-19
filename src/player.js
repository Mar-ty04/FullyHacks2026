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

  const anims = {
    idleRight: getFrames(source, 0, 0, 1),
    walkRight: getFrames(source, 0, 0, 11),
    idleLeft: getFrames(source, 1, 0, 1),
    walkLeft: getFrames(source, 1, 0, 6),
  };
  // Reuse for up/down for now
  anims.walkUp = anims.walkRight;
  anims.walkDown = anims.walkLeft;

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  const sprite = new AnimatedSprite(anims.idleRight);
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

  let currentAnim = 'idleRight';

  function setAnimation(name) {
    if (currentAnim === name) return;
    currentAnim = name;
    sprite.textures = anims[name];
    sprite.play();
  }

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
    const halfW = (FRAME_W * sprite.scale.x) / 2;
    const halfH = (FRAME_H * sprite.scale.y) / 2;
    const cafeLeft = PATH_COLS * TILE_SIZE;
    sprite.x = Math.max(cafeLeft + halfW, Math.min(totalCols * TILE_SIZE - halfW, sprite.x));
    sprite.y = Math.max(halfH, Math.min(totalRows * TILE_SIZE - halfH, sprite.y));

    // Animation state
    if (dx === 0 && dy === 0) {
      if (currentAnim.includes('Right') || currentAnim.includes('Up')) {
        setAnimation('idleRight');
      } else {
        setAnimation('idleLeft');
      }
    } else if (dx > 0) {
      setAnimation('walkRight');
    } else if (dx < 0) {
      setAnimation('walkLeft');
    } else if (dy < 0) {
      setAnimation('walkUp');
    } else if (dy > 0) {
      setAnimation('walkDown');
    }
  }

  return { sprite, update };
}
