import { Assets, AnimatedSprite, Texture, Rectangle, Container, Graphics, Text, Sprite } from 'pixi.js';

const FRAME_W = 96;
const FRAME_H = 80;

const PLAYERS = [
  { name: 'Fishy',     path: '/sprites/FishFight/player/PlayerFishy(96x80).png' },
  { name: 'Catty',     path: '/sprites/FishFight/player/PlayerCatty(96x80).png' },
  { name: 'Sharky',    path: '/sprites/FishFight/player/PlayerSharky(96x80).png' },
  { name: 'Orcy',      path: '/sprites/FishFight/player/PlayerOrcy(96x80).png' },
  { name: 'Pescy',     path: '/sprites/FishFight/player/PlayerPescy(96x80).png' },
  { name: 'Lionfishy', path: '/sprites/FishFight/player/PlayerLionfishy(96x80).png' },
];

function getFrames(source, row, count) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Texture({ source, frame: new Rectangle(i * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H) }));
  }
  return frames;
}

export async function createPlayerSelect(app) {
  const container = new Container();
  const w = app.screen.width;
  const h = app.screen.height;

  const [bgTexture, btnTexture, ...playerTextures] = await Promise.all([
    Assets.load('/sprites/start-sprites/player-select background.jpg'),
    Assets.load('/sprites/start-sprites/start-button.png'),
    ...PLAYERS.map(p => Assets.load(p.path)),
  ]);

  const bg = new Sprite(bgTexture);
  bg.width = w;
  bg.height = h;
  container.addChild(bg);

  const title = new Text({
    text: 'Choose Your Fish!',
    style: { fontFamily: '"Press Start 2P"', fontSize: 42, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 0, distance: 3 } },
  });
  title.anchor.set(0.5);
  title.x = w / 2;
  title.y = h * 0.1;
  container.addChild(title);

  // Grid: 3 columns x 2 rows
  const colXs = [w * 0.2, w * 0.5, w * 0.8];
  const rowYs = [h * 0.38, h * 0.66];

  let selected = 0;

  const highlight = new Graphics();
  container.addChild(highlight);

  const cards = PLAYERS.map((player, i) => {
    const x = colXs[i % 3];
    const y = rowYs[Math.floor(i / 3)];

    const source = playerTextures[i].source;
    const sprite = new AnimatedSprite(getFrames(source, 0, 11));
    sprite.anchor.set(0.5);
    sprite.scale.set(2.2);
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.x = x;
    sprite.y = y;
    sprite.interactive = true;
    sprite.cursor = 'pointer';
    container.addChild(sprite);

    const label = new Text({
      text: player.name,
      style: { fontFamily: 'Arial', fontSize: 22, fontWeight: 'bold', fill: 0xffffff, dropShadow: { color: 0x000000, blur: 4, distance: 2 } },
    });
    label.anchor.set(0.5);
    label.x = x;
    label.y = y + FRAME_H * 2.2 / 2 + 14;
    container.addChild(label);

    sprite.on('pointerdown', () => { selected = i; updateHighlight(); });

    return { sprite, label, x, y };
  });

  function updateHighlight() {
    const card = cards[selected];
    const scale = card.sprite.scale.x;
    const hw = FRAME_W * scale / 2 + 12;
    const hh = FRAME_H * scale / 2 + 12;
    highlight.clear();
    highlight.rect(card.x - hw, card.y - hh, hw * 2, hh * 2);
    highlight.stroke({ width: 4, color: 0xffdd44 });
  }

  updateHighlight();

  const button = new Sprite(btnTexture);
  button.anchor.set(0.5);
  button.scale.set(0.65);
  button.x = w / 2;
  button.y = h * 0.9;
  button.interactive = true;
  button.cursor = 'pointer';
  container.addChild(button);

  const waitForSelect = () => new Promise((resolve) => {
    button.once('pointerdown', () => resolve(PLAYERS[selected].path));
  });

  return { container, waitForSelect };
}
