import { Assets, Sprite, Texture, Container, Graphics, Rectangle } from 'pixi.js';
import { TILE_SIZE, PATH_ROWS } from '../constants.js';

export async function createCafeMap(app) {
  const floorTexture = await Assets.load('/sprites/Cafe/Floors&Walls/floor48x48.png');

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  const cafeFloorTile = new Texture({ source: floorTexture.source, frame: new Rectangle(0, 0, 48, 48) });
  const pathTile = new Texture({ source: floorTexture.source, frame: new Rectangle(48, 0, 48, 48) });

  // Floor container — always rendered behind everything
  const floorContainer = new Container();

  const pathStartRow = totalRows - PATH_ROWS;
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const isPath = row >= pathStartRow;
      const tile = new Sprite(isPath ? pathTile : cafeFloorTile);
      tile.x = col * TILE_SIZE;
      tile.y = row * TILE_SIZE;
      floorContainer.addChild(tile);
    }
  }

  const boundary = new Graphics();
  boundary.moveTo(0, pathStartRow * TILE_SIZE);
  boundary.lineTo(app.screen.width, pathStartRow * TILE_SIZE);
  boundary.stroke({ width: 3, color: 0x5c3a21 });
  floorContainer.addChild(boundary);

  // Whale carpet — flat on the floor, no collision
  const whaleTex = await Assets.load('/sprites/Cafe/Sprite/23.png');
  const whale = new Sprite(whaleTex);
  whale.x = 80;
  whale.y = 290;
  whale.scale.set(0.6);
  floorContainer.addChild(whale);

  // --- Furniture (depth-sorted with player) ---
  const furniture = [];
  const colliders = [];

  // Helper: create a furniture sprite and register its collision box
  function addFurniture(sprite, collisionPadding = 4) {
    furniture.push(sprite);
    const w = sprite.texture.width * sprite.scale.x;
    const h = sprite.texture.height * sprite.scale.y;
    colliders.push({
      x: sprite.x - collisionPadding,
      y: sprite.y - collisionPadding,
      w: w + collisionPadding * 2,
      h: h + collisionPadding * 2,
    });
  }

  // Top counters
  const counter204Tex = await Assets.load('/sprites/Cafe/Sprite/204.png');
  const topCounter1 = new Sprite(counter204Tex);
  topCounter1.x = 91;
  topCounter1.y = 98;
  topCounter1.scale.set(0.5);
  addFurniture(topCounter1);

  const topCounter2 = new Sprite(counter204Tex);
  topCounter2.x = 91 + Math.round(counter204Tex.width * 0.5);
  topCounter2.y = 98;
  topCounter2.scale.set(0.5);
  addFurniture(topCounter2);

  // Stove
  const stoveTex = await Assets.load('/sprites/Cafe/Sprite/226.png');
  const stove = new Sprite(stoveTex);
  stove.x = 91 + Math.round(counter204Tex.width * 0.5) * 2;
  stove.y = 98;
  stove.scale.set(0.5);
  addFurniture(stove);

  // Counter next to stove
  const sinkTex = await Assets.load('/sprites/Cafe/Sprite/152.png');
  const topCounter3x = 91 + Math.round(counter204Tex.width * 0.5) * 2 + Math.round(stoveTex.width * 0.5);
  const topCounter3 = new Sprite(counter204Tex);
  topCounter3.x = topCounter3x;
  topCounter3.y = 98;
  topCounter3.scale.set(0.5);
  addFurniture(topCounter3);

  // Sink (on top of counter, no separate collision)
  const sink = new Sprite(sinkTex);
  sink.x = topCounter3x + Math.round((counter204Tex.width - sinkTex.width) * 0.25);
  sink.y = 88;
  sink.scale.set(0.5);
  furniture.push(sink);

  // Fridge
  const fridgeTex = await Assets.load('/sprites/Cafe/Sprite/316.png');
  const fridge = new Sprite(fridgeTex);
  fridge.x = topCounter3x + Math.round(counter204Tex.width * 0.5);
  fridge.y = 55;
  fridge.scale.set(0.20);
  addFurniture(fridge);

  // Window (wall decoration, no collision)
  const windowTex = await Assets.load('/sprites/Cafe/Sprite/315.png');
  const cafeWindow = new Sprite(windowTex);
  cafeWindow.x = topCounter3x + Math.round(counter204Tex.width * 0.5) + Math.round(fridgeTex.width * 0.20) + 70;
  cafeWindow.y = 60;
  cafeWindow.scale.set(0.18);
  furniture.push(cafeWindow);

  // Banner (wall decoration, no collision)
  const bannerTex = await Assets.load('/sprites/Cafe/Sprite/38.png');
  const banner = new Sprite(bannerTex);
  banner.x = topCounter3x + Math.round(counter204Tex.width * 0.5);
  banner.y = 185;
  banner.scale.set(0.35);
  furniture.push(banner);

  // Espresso machine (sits on counter, no separate collision)
  const espressoTex = await Assets.load('/sprites/Cafe/Sprite/233.png');
  const espresso = new Sprite(espressoTex);
  espresso.x = 91 + Math.round(counter204Tex.width * 0.5) + Math.round((counter204Tex.width - espressoTex.width) * 0.5 * 0.5);
  espresso.y = 78;
  espresso.scale.set(0.5);
  furniture.push(espresso);

  // Side counter panel
  const sideTex = await Assets.load('/sprites/Cafe/Sprite/210.png');
  const sideCounter = new Sprite(sideTex);
  sideCounter.x = 91;
  sideCounter.y = 136;
  sideCounter.scale.set(0.5);
  addFurniture(sideCounter);

  // Counter top
  const counterTex = await Assets.load('/sprites/Cafe/Sprite/215.png');
  const counter = new Sprite(counterTex);
  counter.x = 140;
  counter.y = 235;
  counter.scale.set(0.5);
  addFurniture(counter);

  // Booth tables + chairs
  const tableTex = await Assets.load('/sprites/Cafe/Sprite/321.png');
  const chairTex = await Assets.load('/sprites/Cafe/Sprite/267.png');
  const tableScale = 0.22;
  const chairScale = 0.45;
  const tableSpacing = Math.round(tableTex.width * tableScale) + 4;
  const tableScreenW = tableTex.width * tableScale;
  const chairScreenW = chairTex.width * chairScale;
  const chairY = 235 + Math.round(tableTex.height * tableScale) - 22;
  for (let i = 0; i < 3; i++) {
    const tableX = 380 + i * tableSpacing;

    const table = new Sprite(tableTex);
    table.x = tableX;
    table.y = 235;
    table.scale.set(tableScale);
    addFurniture(table);

    const chair1 = new Sprite(chairTex);
    chair1.x = tableX + Math.round(tableScreenW * 0.2 - chairScreenW / 2) + 8;
    chair1.y = chairY;
    chair1.scale.set(chairScale);
    addFurniture(chair1);

    const chair2 = new Sprite(chairTex);
    chair2.x = tableX + Math.round(tableScreenW * 0.7 - chairScreenW / 2) + 8;
    chair2.y = chairY;
    chair2.scale.set(chairScale);
    addFurniture(chair2);
  }

  // Cash register
  const registerTex = await Assets.load('/sprites/Cafe/Sprite/158.png');
  const register = new Sprite(registerTex);
  register.x = 185;
  register.y = 208;
  register.scale.set(0.38);
  addFurniture(register);

  const registerBounds = {
    x: register.x + (registerTex.width * register.scale.x) / 2,
    y: register.y + (registerTex.height * register.scale.y) / 2,
    width: registerTex.width * register.scale.x,
    height: registerTex.height * register.scale.y,
  };

  return { floorContainer, furniture, colliders, registerBounds, pathStartRow };
}
