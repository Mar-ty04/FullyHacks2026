import { Assets, Sprite, Texture, Container, Graphics, Rectangle } from 'pixi.js';
import { TILE_SIZE, PATH_ROWS } from '../constants.js';

export async function createCafeMap(app) {
  const floorTexture = await Assets.load('/sprites/Cafe/Floors&Walls/floor48x48.png');

  const totalCols = Math.ceil(app.screen.width / TILE_SIZE);
  const totalRows = Math.ceil(app.screen.height / TILE_SIZE);

  // Floor tiles: brown brick for cafe, different tile for NPC path
  const cafeFloorTile = new Texture({ source: floorTexture.source, frame: new Rectangle(0, 0, 48, 48) });
  const pathTile = new Texture({ source: floorTexture.source, frame: new Rectangle(48, 0, 48, 48) });

  const container = new Container();

  // Draw floor tiles
  const pathStartRow = totalRows - PATH_ROWS;
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalCols; col++) {
      const isPath = row >= pathStartRow;
      const tile = new Sprite(isPath ? pathTile : cafeFloorTile);
      tile.x = col * TILE_SIZE;
      tile.y = row * TILE_SIZE;
      container.addChild(tile);
    }
  }

  // Path boundary line
  const boundary = new Graphics();
  boundary.moveTo(0, pathStartRow * TILE_SIZE);
  boundary.lineTo(app.screen.width, pathStartRow * TILE_SIZE);
  boundary.stroke({ width: 3, color: 0x5c3a21 });
  container.addChild(boundary);

  // Cash register — placed toward the right side of the cafe
  const registerTexture = await Assets.load('/sprites/Cafe/Sprite/158.png');
  const register = new Sprite(registerTexture);
  register.anchor.set(0.5, 0.5);
  register.x = Math.floor(totalCols * TILE_SIZE * 0.7);
  register.y = Math.floor(pathStartRow * TILE_SIZE * 0.35);
  register.scale.set(0.8);
  container.addChild(register);

  // Register position and collision bounds for other systems
  const registerBounds = {
    x: register.x,
    y: register.y,
    width: registerTexture.width * register.scale.x,
    height: registerTexture.height * register.scale.y,
  };

  return { container, registerBounds, pathStartRow };
}
