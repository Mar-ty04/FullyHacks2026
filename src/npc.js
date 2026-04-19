import { Assets, AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { FRAME_W, FRAME_H, TILE_SIZE, PATH_ROWS } from './constants.js';

const NPC_SPEED = 1.5;

const FISH_SPRITES = [
  '/sprites/FishFight/player/PlayerCatty(96x80).png',
  '/sprites/FishFight/player/PlayerFishy(96x80).png',
  '/sprites/FishFight/player/PlayerLionfishy(96x80).png',
  '/sprites/FishFight/player/PlayerOrcy(96x80).png',
  '/sprites/FishFight/player/PlayerPescy(96x80).png',
  '/sprites/FishFight/player/PlayerSharky(96x80).png',
];

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

export async function createNPC(app, registerBounds, pathStartRow) {
  // Pick a random fish
  const spritePath = FISH_SPRITES[Math.floor(Math.random() * FISH_SPRITES.length)];
  const texture = await Assets.load(spritePath);
  const source = texture.source;

  const walkFrames = getFrames(source, 1, 0, 6);
  const idleFrames = getFrames(source, 0, 0, 7);

  const SCALE = 1.2;
  const sprite = new AnimatedSprite(walkFrames);
  sprite.anchor.set(0.5, 0.5);
  sprite.scale.set(SCALE);
  sprite.animationSpeed = 0.15;
  sprite.loop = true;
  sprite.play();

  // Start off-screen left, on the bottom path
  const pathY = (pathStartRow * TILE_SIZE) + (PATH_ROWS * TILE_SIZE / 2);
  const doorX = Math.floor(app.screen.width / 3);
  sprite.x = -FRAME_W;
  sprite.y = pathY;

  // Stop point: in front of the register (below it, with padding)
  const stopX = registerBounds.x;
  const stopY = registerBounds.y + registerBounds.height / 2 + FRAME_H * SCALE / 2 + 10;

  // NPC waypoints
  // 1. Walk right along bottom path to the door (1/3 in)
  // 2. Turn up from the door toward the register
  // 3. Stop in front of the register (with padding)
  const waypoints = [
    { x: doorX, y: pathY },      // walk along path to door
    { x: doorX, y: stopY },      // walk up toward register
    { x: stopX, y: stopY },      // walk to register
  ];

  let waypointIndex = 0;
  let arrived = false;

  function update() {
    if (arrived) return;

    const target = waypoints[waypointIndex];
    const dx = target.x - sprite.x;
    const dy = target.y - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      // Reached waypoint
      sprite.x = target.x;
      sprite.y = target.y;
      waypointIndex++;

      if (waypointIndex >= waypoints.length) {
        // Arrived at register
        arrived = true;
        sprite.textures = idleFrames;
        sprite.play();
        return;
      }
    } else {
      // Move toward waypoint
      const moveX = (dx / dist) * NPC_SPEED;
      const moveY = (dy / dist) * NPC_SPEED;
      sprite.x += moveX;
      sprite.y += moveY;

      // Flip sprite based on horizontal movement
      if (moveX > 0.1) sprite.scale.x = SCALE;
      if (moveX < -0.1) sprite.scale.x = -SCALE;
    }
  }

  return { sprite, update, arrived: () => arrived };
}
