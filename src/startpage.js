import { Assets, Sprite, Container, AnimatedSprite, Texture, Rectangle } from 'pixi.js';
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

function getFrames(source, fw, fh, count) {
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Texture({ source, frame: new Rectangle(i * fw, 0, fw, fh) }));
  }
  return frames;
}

const SWIMMER_CONFIGS = [
  { path: '/sprites/FishFight/critters/ArabianAngelfish(19x12).png',    fw: 19, fh: 12, frames: 4, speed: 1.5, yRatio: 0.30, scale: 3.5 },
  { path: '/sprites/FishFight/critters/BlueTang(19x9).png',             fw: 19, fh: 9,  frames: 4, speed: 2.0, yRatio: 0.45, scale: 3.5 },
  { path: '/sprites/FishFight/critters/RoyalGramma(25x11).png',         fw: 25, fh: 11, frames: 4, speed: 1.2, yRatio: 0.38, scale: 3.5 },
  { path: '/sprites/FishFight/critters/BlueGreenChromis(22x11).png',    fw: 22, fh: 11, frames: 4, speed: 1.8, yRatio: 0.60, scale: 3.5 },
  { path: '/sprites/FishFight/critters/SmallFish1(13x9).png',           fw: 13, fh: 9,  frames: 4, speed: 2.5, yRatio: 0.52, scale: 3.0 },
  { path: '/sprites/FishFight/critters/BandedButterflyFish(19x11).png', fw: 19, fh: 11, frames: 4, speed: 1.0, yRatio: 0.70, scale: 3.5 },
];

export async function createStartPage(app) {
  const container = new Container();

  const [bgTexture, logoTexture, buttonTexture, ...swimTextures] = await Promise.all([
    Assets.load('/sprites/start-sprites/background.png'),
    Assets.load('/sprites/start-sprites/logo name.png'),
    Assets.load('/sprites/start-sprites/pixil-frame-2.png'),
    ...SWIMMER_CONFIGS.map(c => Assets.load(c.path)),
  ]);

  const bg = new Sprite(bgTexture);
  container.addChild(bg);

  const swimmers = SWIMMER_CONFIGS.map((config, i) => {
    const source = swimTextures[i].source;
    const frames = getFrames(source, config.fw, config.fh, config.frames);
    const goingRight = Math.random() < 0.5;
    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5);
    sprite.scale.set(goingRight ? config.scale : -config.scale, config.scale);
    sprite.animationSpeed = 0.1;
    sprite.play();
    container.addChild(sprite);
    return { sprite, speed: config.speed * (goingRight ? 1 : -1), yRatio: config.yRatio, scale: config.scale };
  });

  const logo = new Sprite(logoTexture);
  logo.anchor.set(0.5);
  logo.scale.set(1.1);
  container.addChild(logo);

  const button = new Sprite(buttonTexture);
  button.anchor.set(0.5);
  button.scale.set(0.45);
  button.interactive = true;
  button.cursor = 'pointer';
  container.addChild(button);

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;

    bg.width = w;
    bg.height = h;
    logo.x = w / 2;
    logo.y = h * 0.13;
    button.x = w / 2;
    button.y = h * 0.91;

    for (const sw of swimmers) {
      sw.sprite.y = h * sw.yRatio;
    }
  }

  layout();
  for (const sw of swimmers) {
    sw.sprite.x = Math.random() * app.screen.width;
  }
  app.renderer.on('resize', layout);

  let elapsed = 0;
  const ticker = (t) => {
    elapsed += t.deltaTime;
    logo.y = app.screen.height * 0.13 + Math.sin(elapsed * 0.04) * 8;

    for (const sw of swimmers) {
      sw.sprite.x += sw.speed;
      const w = app.screen.width;
      if (sw.speed > 0 && sw.sprite.x > w + 60) {
        sw.sprite.x = -60;
        sw.sprite.scale.set(sw.scale, sw.scale);
        sw.speed = Math.abs(sw.speed);
      }
      if (sw.speed < 0 && sw.sprite.x < -60) {
        sw.sprite.x = w + 60;
        sw.sprite.scale.set(-sw.scale, sw.scale);
        sw.speed = -Math.abs(sw.speed);
      }
    }
  };
  app.ticker.add(ticker);

  const waitForStart = () => new Promise((resolve) => {
    button.once('pointerdown', () => {
      playButtonClick();
      // Scale pulse: swell up then snap back
      const BASE = 0.45;
      let t = 0;
      const pulse = (tk) => {
        t += tk.deltaTime;
        button.scale.set(BASE + Math.sin(Math.min(t / 10, 1) * Math.PI) * 0.06);
        if (t >= 10) { button.scale.set(BASE); app.ticker.remove(pulse); }
      };
      app.ticker.add(pulse);
      setTimeout(() => {
        app.renderer.off('resize', layout);
        app.ticker.remove(ticker);
        resolve();
      }, 120);
    });
  });

  return { container, waitForStart };
}
