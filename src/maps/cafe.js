import { Assets, Sprite, Texture, Container, Graphics, Rectangle, TilingSprite } from 'pixi.js';
import { TILE_SIZE, PATH_ROWS } from '../constants.js';

export async function createCafeMap(app) {
  const [floorTexture, wall3Tex] = await Promise.all([
    Assets.load('/sprites/Cafe/Floors&Walls/floor48x48.png'),
    Assets.load('/sprites/Cafe/Floors&Walls/wall3.png'),
  ]);

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  const cafeFloorTile = new Texture({ source: floorTexture.source, frame: new Rectangle(0, 0, 48, 48) });
  const pathTile = new Texture({ source: wall3Tex.source, frame: new Rectangle(0, 144, 48, 48) });

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

  // Wall strip along the top behind the counters
  const wallTex = await Assets.load('/sprites/Cafe/Floors&Walls/wall1.png');
  const wallTile = new Texture({ source: wallTex.source, frame: new Rectangle(0, 0, 48, 48) });
  const wallStrip = new TilingSprite({ texture: wallTile, width: app.screen.width, height: 140 });
  wallStrip.x = 0;
  wallStrip.y = 0;
  floorContainer.addChild(wallStrip);

  const wallBorder = new Graphics();
  wallBorder.moveTo(0, 140).lineTo(app.screen.width, 140);
  wallBorder.stroke({ width: 3, color: 0x5c3a21 });
  floorContainer.addChild(wallBorder);

  // Path boundary line
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
  // Chair center positions for NPC sit-down targets (4 stools + 6 booth chairs = 10 total)
  const chairPositions = [];

  // Add furniture with full collision (player can't walk through at all)
  function addSolidFurniture(sprite, collisionPadding = 2) {
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

  // Add furniture with partial collision (bottom 70% — player can walk behind top 30%)
  function addFurniture(sprite, collisionPadding = 2) {
    furniture.push(sprite);
    const w = sprite.texture.width * sprite.scale.x;
    const h = sprite.texture.height * sprite.scale.y;
    const collisionTop = 0.3;
    colliders.push({
      x: sprite.x - collisionPadding,
      y: sprite.y + h * collisionTop,
      w: w + collisionPadding * 2,
      h: h * (1 - collisionTop) + collisionPadding,
    });
  }

  // Top counters
  const counter204Tex = await Assets.load('/sprites/Cafe/Sprite/204.png');
  const topCounter1 = new Sprite(counter204Tex);
  topCounter1.x = 91;
  topCounter1.y = 98;
  topCounter1.scale.set(0.5);
  addSolidFurniture(topCounter1);

  const topCounter2 = new Sprite(counter204Tex);
  topCounter2.x = 91 + Math.round(counter204Tex.width * 0.5);
  topCounter2.y = 98;
  topCounter2.scale.set(0.5);
  // Shorter collision so player can get close to espresso machine
  floorContainer.addChild(topCounter2);
  const tc2W = counter204Tex.width * 0.5;
  const tc2H = counter204Tex.height * 0.5;
  colliders.push({ x: topCounter2.x - 2, y: topCounter2.y - 2, w: tc2W + 4, h: tc2H * 0.7 });

  // Stove
  const stoveTex = await Assets.load('/sprites/Cafe/Sprite/226.png');
  const stove = new Sprite(stoveTex);
  stove.x = 91 + Math.round(counter204Tex.width * 0.5) * 2;
  stove.y = 98;
  stove.scale.set(0.5);
  addSolidFurniture(stove);

  // Counter next to stove
  const sinkTex = await Assets.load('/sprites/Cafe/Sprite/152.png');
  const topCounter3x = 91 + Math.round(counter204Tex.width * 0.5) * 2 + Math.round(stoveTex.width * 0.5);
  const topCounter3 = new Sprite(counter204Tex);
  topCounter3.x = topCounter3x;
  topCounter3.y = 98;
  topCounter3.scale.set(0.5);
  addSolidFurniture(topCounter3);

  // Sink (sits on counter — added to overlay, no depth sort)
  const sink = new Sprite(sinkTex);
  sink.x = topCounter3x + Math.round((counter204Tex.width - sinkTex.width) * 0.25);
  sink.y = 88;
  sink.scale.set(0.5);

  // Fridge
  const fridgeTex = await Assets.load('/sprites/Cafe/Sprite/316.png');
  const fridge = new Sprite(fridgeTex);
  fridge.x = topCounter3x + Math.round(counter204Tex.width * 0.5);
  fridge.y = 55;
  fridge.scale.set(0.20);
  addSolidFurniture(fridge);

  // Window (wall decoration, no collision)
  const windowTex = await Assets.load('/sprites/Cafe/Sprite/315.png');
  const cafeWindow = new Sprite(windowTex);
  cafeWindow.x = topCounter3x + Math.round(counter204Tex.width * 0.5) + Math.round(fridgeTex.width * 0.20) + 70;
  cafeWindow.y = 60;
  cafeWindow.scale.set(0.18);
  floorContainer.addChild(cafeWindow);

  // Banner (wall decoration, no collision)
  const bannerTex = await Assets.load('/sprites/Cafe/Sprite/38.png');
  const banner = new Sprite(bannerTex);
  banner.x = topCounter3x + Math.round(counter204Tex.width * 0.5);
  banner.y = 185;
  banner.scale.set(0.35);
  floorContainer.addChild(banner);

  // Round tables
  const roundTableTex = await Assets.load('/sprites/Cafe/Sprite/326.png');
  const roundTable = new Sprite(roundTableTex);
  roundTable.x = 415;
  roundTable.y = 360;
  roundTable.scale.set(0.25);
  addFurniture(roundTable);

  const roundTable2 = new Sprite(roundTableTex);
  roundTable2.x = 415;
  roundTable2.y = 480;
  roundTable2.scale.set(0.25);
  addFurniture(roundTable2);

  // Stools left and right of each round table
  const stoolTex = await Assets.load('/sprites/Cafe/Sprite/327.png');
  const stoolScale = 0.2;
  const rtScale = 0.25;
  const rtW = Math.round(roundTableTex.width * rtScale);
  const rtH = Math.round(roundTableTex.height * rtScale);
  const stoolW = Math.round(stoolTex.width * stoolScale);
  const stoolH = Math.round(stoolTex.height * stoolScale);
  const gap = 4;

  for (const [rtX, rtY] of [[415, 360], [415, 480]]) {
    const stoolCenterY = rtY + Math.round(rtH / 2) - Math.round(stoolH / 2) + 8;
    const leftStool = new Sprite(stoolTex);
    leftStool.x = rtX - stoolW - gap;
    leftStool.y = stoolCenterY;
    leftStool.scale.set(stoolScale);
    addFurniture(leftStool);
    chairPositions.push({ x: leftStool.x + Math.round(stoolW / 2), y: stoolCenterY + Math.round(stoolH / 2) });

    const rightStool = new Sprite(stoolTex);
    rightStool.x = rtX + rtW + gap;
    rightStool.y = stoolCenterY;
    rightStool.scale.set(stoolScale);
    addFurniture(rightStool);
    chairPositions.push({ x: rightStool.x + Math.round(stoolW / 2), y: stoolCenterY + Math.round(stoolH / 2) });
  }

  // Couch
  const couchTex = await Assets.load('/sprites/Cafe/Sprite/37.png');
  const coffeeTableTex = await Assets.load('/sprites/Cafe/Sprite/221.png');
  const firstRtRightEdge = 415 + Math.round(roundTableTex.width * rtScale) + gap + Math.round(stoolTex.width * stoolScale);
  const couch = new Sprite(couchTex);
  couch.x = firstRtRightEdge + 110;
  couch.y = 370;
  couch.scale.set(0.35);
  floorContainer.addChild(couch);
  // Small collider — just the seat area (bottom 30%)
  const couchW = couchTex.width * 0.35;
  const couchH = couchTex.height * 0.35;
  colliders.push({ x: couch.x, y: couch.y + couchH * 0.35, w: couchW, h: couchH * 0.3 });

  // Coffee table (flat on floor — player walks over it, but has collision)
  const coffeeTable = new Sprite(coffeeTableTex);
  coffeeTable.x = couch.x - 24;
  coffeeTable.y = couch.y + Math.round(couchTex.height * 0.35) - 10;
  coffeeTable.scale.set(0.35);
  floorContainer.addChild(coffeeTable);
  const ctW = coffeeTableTex.width * 0.35;
  const ctH = coffeeTableTex.height * 0.35;
  colliders.push({ x: coffeeTable.x, y: coffeeTable.y + ctH * 0.5, w: ctW, h: ctH * 0.5 });

  // Display (flat on floor — player walks over it, but has collision)
  const displayTex = await Assets.load('/sprites/Cafe/Sprite/14.png');
  const display = new Sprite(displayTex);
  display.x = couch.x + 8;
  display.y = couch.y + Math.round(couchTex.height * 0.35) + 30;
  display.scale.set(0.35);
  floorContainer.addChild(display);
  const dispW = displayTex.width * 0.35;
  const dispH = displayTex.height * 0.35;
  colliders.push({ x: display.x, y: display.y + dispH * 0.5, w: dispW, h: dispH * 0.5 });

  // Espresso machine (sits on counter — added to overlay, no depth sort)
  const espressoTex = await Assets.load('/sprites/Cafe/Sprite/233.png');
  const espresso = new Sprite(espressoTex);
  espresso.x = 91 + Math.round(counter204Tex.width * 0.5) + Math.round((counter204Tex.width - espressoTex.width) * 0.5 * 0.5);
  espresso.y = 78;
  espresso.scale.set(0.5);

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
  const chairH = Math.round(chairTex.height * chairScale);
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
    chairPositions.push({ x: chair1.x + Math.round(chairScreenW / 2), y: chairY + Math.round(chairH / 2) });

    const chair2 = new Sprite(chairTex);
    chair2.x = tableX + Math.round(tableScreenW * 0.7 - chairScreenW / 2) + 8;
    chair2.y = chairY;
    chair2.scale.set(chairScale);
    addFurniture(chair2);
    chairPositions.push({ x: chair2.x + Math.round(chairScreenW / 2), y: chairY + Math.round(chairH / 2) });
  }

  // Cash register (sits on counter — added to overlay, no depth sort)
  const registerTex = await Assets.load('/sprites/Cafe/Sprite/158.png');
  const register = new Sprite(registerTex);
  register.x = 185;
  register.y = 208;
  register.scale.set(0.38);

  const registerBounds = {
    x: register.x + (registerTex.width * register.scale.x) / 2,
    y: register.y + (registerTex.height * register.scale.y) / 2,
    width: registerTex.width * register.scale.x,
    height: registerTex.height * register.scale.y,
  };

  // Debug: draw collision boxes so we can see them
  const debugGfx = new Graphics();
  for (const c of colliders) {
    debugGfx.rect(c.x, c.y, c.w, c.h);
    debugGfx.stroke({ width: 1, color: 0xff0000 });
    debugGfx.fill({ color: 0xff0000, alpha: 0.15 });
  }
  furniture.push(debugGfx);

  // Overlay container — items that sit ON furniture, always rendered on top
  const overlayContainer = new Container();
  overlayContainer.addChild(sink);
  overlayContainer.addChild(espresso);
  overlayContainer.addChild(register);

  // Interaction zone: rectangular area on the staff side of the counter/register.
  // The dialog triggers when the player's center is inside this rect AND the NPC has arrived.
  // Covers x=130..320, y=180..270 — where the barista naturally stands near the register.
  const counterInteractZone = { x: 130, y: 180, w: 190, h: 90 };

  return { floorContainer, furniture, colliders, registerBounds, pathStartRow, overlayContainer, counterInteractZone, chairPositions };
}
