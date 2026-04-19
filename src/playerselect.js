import { Assets, AnimatedSprite, Texture, Rectangle, Container, Graphics, Text, Sprite } from 'pixi.js';
import { sfx } from './audio.js';

function playButtonClick() {
  if (!sfx.enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now); osc.stop(now + 0.18);
  } catch (_) {}
}

function playArrowClick() {
  if (!sfx.enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.05);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } catch (_) {}
}

const FRAME_W = 96;
const FRAME_H = 80;

const PLAYERS = [
  { name: 'Fishy',    path: '/sprites/FishFight/player/PlayerFishy(96x80).png' },
  { name: 'Catty',    path: '/sprites/FishFight/player/PlayerCatty(96x80).png' },
  { name: 'Sharky',   path: '/sprites/FishFight/player/PlayerSharky(96x80).png' },
  { name: 'Orcy',     path: '/sprites/FishFight/player/PlayerOrcy(96x80).png' },
  { name: 'Pescy',    path: '/sprites/FishFight/player/PlayerPescy(96x80).png' },
  { name: 'Lionfishy', path: '/sprites/FishFight/player/PlayerLionfishy(96x80).png' },
];

function getFrames(source, row, count) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Texture({ source, frame: new Rectangle(i * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H) }));
  }
  return frames;
}

function makeArrow(direction) {
  const g = new Graphics();
  const s = 40;
  if (direction === 'left') {
    g.moveTo(s, 0).lineTo(0, s / 2).lineTo(s, s).closePath();
  } else {
    g.moveTo(0, 0).lineTo(s, s / 2).lineTo(0, s).closePath();
  }
  g.fill(0xffffff);
  g.pivot.set(s / 2, s / 2);
  g.interactive = true;
  g.cursor = 'pointer';
  g.on('pointerover', () => { g.alpha = 0.6; });
  g.on('pointerout',  () => { g.alpha = 1.0; });
  return g;
}

export async function createPlayerSelect(app) {
  const container = new Container();
  const w = app.screen.width;
  const h = app.screen.height;

  // Wait for pixel font to load before rendering text
  await document.fonts.load('16px "Press Start 2P"');

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
    style: { fontFamily: '"Press Start 2P"', fontSize: 26, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 0, distance: 3 } },
  });
  title.anchor.set(0.5);
  title.x = w / 2;
  title.y = h * 0.14;
  container.addChild(title);

  let selected = 0;

  // Preload all sprites, show only the selected one
  const fishSprites = PLAYERS.map((_, i) => {
    const source = playerTextures[i].source;
    const sprite = new AnimatedSprite(getFrames(source, 0, 11));
    sprite.anchor.set(0.5);
    sprite.scale.set(3.5);
    sprite.animationSpeed = 0.12;
    sprite.x = w / 2;
    sprite.y = h * 0.45;
    sprite.visible = i === 0;
    sprite.play();
    container.addChild(sprite);
    return sprite;
  });

  const nameLabel = new Text({
    text: PLAYERS[0].name,
    style: { fontFamily: '"Press Start 2P"', fontSize: 18, fill: 0xffffff, dropShadow: { color: 0x000000, blur: 0, distance: 2 } },
  });
  nameLabel.anchor.set(0.5);
  nameLabel.x = w / 2;
  nameLabel.y = h * 0.65;
  container.addChild(nameLabel);

  // Counter e.g. "1 / 6"
  const counter = new Text({
    text: `1 / ${PLAYERS.length}`,
    style: { fontFamily: '"Press Start 2P"', fontSize: 12, fill: 0xaaaaaa },
  });
  counter.anchor.set(0.5);
  counter.x = w / 2;
  counter.y = h * 0.72;
  container.addChild(counter);

  const leftArrow = makeArrow('left');
  leftArrow.x = w * 0.15;
  leftArrow.y = h * 0.45;
  container.addChild(leftArrow);

  const rightArrow = makeArrow('right');
  rightArrow.x = w * 0.85;
  rightArrow.y = h * 0.45;
  container.addChild(rightArrow);

  function showFish(index) {
    fishSprites[selected].visible = false;
    selected = (index + PLAYERS.length) % PLAYERS.length;
    fishSprites[selected].visible = true;
    nameLabel.text = PLAYERS[selected].name;
    counter.text = `${selected + 1} / ${PLAYERS.length}`;
  }

  leftArrow.on('pointerdown',  () => { playArrowClick(); showFish(selected - 1); });
  rightArrow.on('pointerdown', () => { playArrowClick(); showFish(selected + 1); });

  const button = new Sprite(btnTexture);
  button.anchor.set(0.5);
  button.scale.set(0.45);
  button.x = w / 2;
  button.y = h * 0.91;
  button.interactive = true;
  button.cursor = 'pointer';
  container.addChild(button);

  const waitForSelect = () => new Promise((resolve) => {
    button.once('pointerdown', () => {
      playButtonClick();
      const BASE = 0.45;
      let t = 0;
      const pulse = (tk) => {
        t += tk.deltaTime;
        button.scale.set(BASE + Math.sin(Math.min(t / 10, 1) * Math.PI) * 0.06);
        if (t >= 10) { button.scale.set(BASE); app.ticker.remove(pulse); }
      };
      app.ticker.add(pulse);
      setTimeout(() => resolve(PLAYERS[selected].path), 120);
    });
  });

  return { container, waitForSelect };
}
