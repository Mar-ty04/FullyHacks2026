import { Assets, AnimatedSprite, Texture, Rectangle } from 'pixi.js';
import { FRAME_W, FRAME_H, TILE_SIZE, PATH_ROWS } from './constants.js';

const NPC_SPEED = 1.5;
// Pixels between each queued customer's stop position (stacked below the register)
const QUEUE_OFFSET = 65;

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

// options.queueIndex (0-2): offsets the queue stop point below the register.
// options: { queueIndex?: number }
export async function createNPC(app, registerBounds, pathStartRow, options = {}) {
  const { queueIndex = 0 } = options;

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

  const pathY = (pathStartRow * TILE_SIZE) + (PATH_ROWS * TILE_SIZE / 2);
  const doorX = Math.floor(app.screen.width / 3);
  sprite.x = -FRAME_W;
  sprite.y = pathY;

  const stopX = registerBounds.x;
  // Each queue member stops further below the register by QUEUE_OFFSET; mutable so advanceQueue() can update it
  let stopY = registerBounds.y + registerBounds.height / 2 + FRAME_H * SCALE / 2 + 10 + queueIndex * QUEUE_OFFSET;

  const entryWaypoints = [
    { x: stopX, y: pathY },   // walk along path to x below register
    { x: stopX, y: stopY },   // walk straight up to register
  ];

  let waypointIndex = 0;
  let arrived = false;
  let exiting = false;
  let exited = false;
  let sitting = false;
  let sittingIdle = false;
  let activeWaypoints = entryWaypoints;
  let clickCallback = null;

  // Walks NPC from its current position down to the path, then off-screen left
  function startExit(direction = 'right') {
    if (exiting || exited) return;
    exiting = true;
    arrived = false;
    sitting = false;
    sittingIdle = false;
    waypointIndex = 0;
    sprite.eventMode = 'none';
    sprite.cursor = 'default';
    const exitX = direction === 'right'
      ? app.screen.width + FRAME_W * SCALE
      : -FRAME_W * SCALE;
    activeWaypoints = [
      { x: sprite.x, y: pathY },
      { x: exitX, y: pathY },
    ];
    sprite.textures = walkFrames;
    sprite.play();
  }

  // Directs NPC to walk to a chair center after their order is taken
  function startSitting(chairPos) {
    if (sitting || exiting || exited) return;
    sitting = true;
    arrived = false;
    waypointIndex = 0;
    activeWaypoints = [{ x: chairPos.x, y: chairPos.y }];
    sprite.textures = walkFrames;
    sprite.play();
  }

  // Registers a callback fired when the NPC sprite is clicked while sitting idle
  function setOnClick(cb) {
    clickCallback = cb;
  }

  // Returns the first idle frame — used as a thumbnail in the orders pane
  function getThumbnailTexture() {
    return idleFrames[0];
  }

  // Moves this NPC one slot forward in the queue (called when the customer ahead leaves).
  // If already standing idle, starts walking to the new position.
  // If still en-route, updates the final waypoint so they head to the closer stop.
  function advanceQueue() {
    if (exiting || exited || sitting || sittingIdle) return;
    stopY -= QUEUE_OFFSET;
    if (arrived) {
      arrived = false;
      waypointIndex = 0;
      activeWaypoints = [{ x: stopX, y: stopY }];
      sprite.textures = walkFrames;
      sprite.play();
    } else {
      // Still walking — patch the final waypoint in-place
      activeWaypoints[activeWaypoints.length - 1] = { x: stopX, y: stopY };
    }
  }

  function update() {
    if (exited) return;
    if (arrived) return;
    if (sittingIdle) return;

    const target = activeWaypoints[waypointIndex];
    const dx = target.x - sprite.x;
    const dy = target.y - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      sprite.x = target.x;
      sprite.y = target.y;
      waypointIndex++;

      if (waypointIndex >= activeWaypoints.length) {
        if (exiting) {
          exited = true;
          sprite.stop();
          sprite.visible = false;
        } else if (sitting) {
          sittingIdle = true;
          sprite.textures = idleFrames;
          sprite.play();
          // Make sprite clickable so player can open the order modal
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';
          sprite.on('pointerdown', () => {
            if (clickCallback) clickCallback();
          });
        } else {
          arrived = true;
          sprite.textures = idleFrames;
          sprite.play();
        }
        return;
      }
    } else {
      const moveX = (dx / dist) * NPC_SPEED;
      const moveY = (dy / dist) * NPC_SPEED;
      sprite.x += moveX;
      sprite.y += moveY;

      if (moveX > 0.1) sprite.scale.x = SCALE;
      if (moveX < -0.1) sprite.scale.x = -SCALE;
    }
  }

  return {
    sprite,
    update,
    arrived: () => arrived,
    startExit,
    hasExited: () => exited,
    startSitting,
    isSitting: () => sitting,
    isSittingIdle: () => sittingIdle,
    setOnClick,
    getThumbnailTexture,
    advanceQueue,
  };
}
