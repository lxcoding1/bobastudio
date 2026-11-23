import { Application, Container, Graphics, Text } from 'pixi.js';
import { MILK_META, TEA_BASE_META, TOPPING_META } from '../game/catalog';
import type { DrinkBuild, OrderTicket } from '../game/types';

export interface DrinkCrafterController {
  renderCup: (build: DrinkBuild, order: OrderTicket | null, dt: number) => void;
  dispose: () => void;
}

interface CupPearl {
  x: number;
  y: number;
  vy: number;
  r: number;
}

export async function createDrinkCrafter(
  container: HTMLElement,
  isSoftwareGl: boolean,
): Promise<DrinkCrafterController> {
  let destroyed = false;
  const app = new Application();
  const size = 148;

  await app.init({
    width: size,
    height: size,
    backgroundAlpha: 0,
    antialias: !isSoftwareGl,
    resolution: isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
  });

  if (destroyed) {
    app.destroy(true, { children: true });
    return { renderCup: () => {}, dispose: () => {} };
  }

  app.ticker.stop();

  const canvas = app.canvas;
  canvas.style.display = 'block';
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  container.appendChild(canvas);

  const cupRoot = new Container();
  cupRoot.position.set(size / 2, size / 2 + 8);
  app.stage.addChild(cupRoot);

  const liquidG = new Graphics();
  const toppingG = new Graphics();
  const iceG = new Graphics();
  const cupOutlineG = new Graphics();
  const sealBadge = new Text({
    text: 'SEALED!',
    style: {
      fontFamily: 'Bricolage Grotesque, sans-serif',
      fontSize: 12,
      fontWeight: '800',
      fill: '#ffffff',
    },
  });
  sealBadge.anchor.set(0.5);
  sealBadge.position.set(0, -48);
  sealBadge.visible = false;

  cupRoot.addChild(liquidG, toppingG, iceG, cupOutlineG, sealBadge);

  // Persistent pearl physics positions inside the cup
  const pearls: CupPearl[] = Array.from({ length: 14 }, (_, i) => ({
    x: -18 + (i % 5) * 9 + ((i % 2) - 0.5) * 3,
    y: 36 - Math.floor(i / 5) * 8,
    vy: 0,
    r: 4.1,
  }));

  let prevTopping = 'none';
  let fillLevel = 0;
  let elapsed = 0;

  const renderCup = (build: DrinkBuild, order: OrderTicket | null, dt: number) => {
    if (destroyed) return;
    elapsed += dt;

    // Reset pearl bounce when topping changes
    if (build.topping !== prevTopping) {
      prevTopping = build.topping;
      if (build.topping !== 'none') {
        pearls.forEach((p, idx) => {
          p.y = -28 - idx * 4;
          p.vy = 40;
        });
      }
    }

    const targetFill = build.teaBase ? 0.84 : 0.08;
    fillLevel += (targetFill - fillLevel) * Math.min(1, dt * 8);

    const isSealing = order?.status === 'sealing';
    if (isSealing) {
      const prog = order?.sealProgress ?? 0;
      cupRoot.rotation = Math.sin(elapsed * 38) * 0.14 * (1 - prog * 0.4);
      cupRoot.position.y = size / 2 + 8 + Math.cos(elapsed * 42) * 3;
      sealBadge.visible = prog > 0.65;
    } else {
      cupRoot.rotation += (0 - cupRoot.rotation) * Math.min(1, dt * 12);
      cupRoot.position.y = size / 2 + 8;
      sealBadge.visible = false;
    }

    // Cup geometry coordinates relative to cupRoot
    const topW = 34;
    const botW = 24;
    const topY = -42;
    const botY = 44;

    const lerpWidth = (y: number) => {
      const t = (y - topY) / (botY - topY);
      return topW + (botW - topW) * t;
    };

    // 1. Liquid Fill
    liquidG.clear();
    if (fillLevel > 0.1 && build.teaBase) {
      const teaColor = TEA_BASE_META[build.teaBase].color;
      const surfaceY = botY - (botY - topY - 8) * fillLevel;
      const surfW = lerpWidth(surfaceY) - 2;
      const bW = botW - 2;

      liquidG
        .moveTo(-surfW, surfaceY)
        .lineTo(surfW, surfaceY)
        .lineTo(bW, botY - 2)
        .lineTo(-bW, botY - 2)
        .closePath()
        .fill({ color: teaColor, alpha: 0.92 });

      // Milk / Brown Sugar / Cheese Foam Layer
      if (build.milk === 'whole' || build.milk === 'oat') {
        const milkColor = MILK_META[build.milk].color;
        liquidG
          .moveTo(-surfW, surfaceY)
          .lineTo(surfW, surfaceY)
          .lineTo(surfW * 0.94, surfaceY + 26)
          .lineTo(-surfW * 0.94, surfaceY + 26)
          .closePath()
          .fill({ color: milkColor, alpha: 0.58 });
      } else if (build.milk === 'brown_sugar') {
        // Tiger stripes
        liquidG
          .moveTo(-surfW + 4, surfaceY + 12)
          .lineTo(-surfW + 10, surfaceY + 34)
          .stroke({ width: 4, color: 0x562914, alpha: 0.78 });
        liquidG
          .moveTo(surfW - 6, surfaceY + 14)
          .lineTo(surfW - 11, surfaceY + 38)
          .stroke({ width: 3.5, color: 0x562914, alpha: 0.78 });
        liquidG
          .moveTo(-bW, botY - 12)
          .lineTo(bW, botY - 12)
          .lineTo(bW, botY - 2)
          .lineTo(-bW, botY - 2)
          .closePath()
          .fill({ color: 0x562914, alpha: 0.65 });
      } else if (build.milk === 'cheese_foam') {
        const foamBottom = surfaceY + 15;
        const fW = lerpWidth(foamBottom) - 2;
        liquidG
          .moveTo(-surfW, surfaceY)
          .lineTo(surfW, surfaceY)
          .lineTo(fW, foamBottom)
          .lineTo(-fW, foamBottom)
          .closePath()
          .fill({ color: 0xfff6db, alpha: 0.98 });
      }
    }

    // 2. Toppings Physics
    toppingG.clear();
    if (build.topping !== 'none') {
      const topColor = TOPPING_META[build.topping].color;
      for (let i = 0; i < pearls.length; i++) {
        const p = pearls[i];
        const floorY = botY - 6 - Math.floor(i / 5) * 7;
        if (p.y < floorY) {
          p.vy += 420 * dt;
          p.y += p.vy * dt;
          if (p.y >= floorY) {
            p.y = floorY;
            p.vy = -p.vy * 0.25;
            if (Math.abs(p.vy) < 12) p.vy = 0;
          }
        }
        if (build.topping === 'boba' || build.topping === 'crystal_boba') {
          toppingG
            .circle(p.x, p.y, p.r)
            .fill({ color: topColor, alpha: build.topping === 'crystal_boba' ? 0.85 : 1 })
            .stroke({ width: 1.2, color: 0x1b2e2d });
        } else {
          // Cubes for lychee jelly or pudding slices
          toppingG
            .roundRect(p.x - 4, p.y - 3.5, 8, 7, 1.5)
            .fill({ color: topColor, alpha: 0.92 })
            .stroke({ width: 1.2, color: 0x1b2e2d });
        }
      }
    }

    // 3. Ice Cubes floating near liquid surface
    iceG.clear();
    const iceCount = build.ice === 0 ? 0 : build.ice === 25 ? 2 : build.ice === 50 ? 3 : build.ice === 75 ? 4 : 5;
    if (iceCount > 0 && build.teaBase) {
      const surfaceY = botY - (botY - topY - 8) * fillLevel;
      for (let i = 0; i < iceCount; i++) {
        const ix = -16 + i * 8.5;
        const iy = surfaceY + 6 + Math.sin(elapsed * 3 + i * 1.3) * 1.8;
        iceG
          .roundRect(ix - 5, iy - 5, 10, 10, 2)
          .fill({ color: 0xe6f8fa, alpha: 0.72 })
          .stroke({ width: 1.1, color: 0x5c898a });
      }
    }

    // 4. Tapered Cup Ink Outline + Wide Boba Straw + Lid Rim
    cupOutlineG.clear();
    // Straw
    cupOutlineG
      .moveTo(8, -56)
      .lineTo(14, -56)
      .lineTo(4, 34)
      .lineTo(-2, 34)
      .closePath()
      .fill({ color: 0xe06d53 })
      .stroke({ width: 1.6, color: 0x1b2e2d });

    // Cup Walls
    cupOutlineG
      .moveTo(-topW, topY)
      .lineTo(topW, topY)
      .lineTo(botW, botY)
      .lineTo(-botW, botY)
      .closePath()
      .stroke({ width: 2.5, color: 0x1b2e2d });

    // Specular Glass Highlight
    cupOutlineG
      .moveTo(-topW + 7, topY + 8)
      .lineTo(-botW + 7, botY - 8)
      .stroke({ width: 2.5, color: 0xffffff, alpha: 0.48 });

    // Film Seal Lid
    cupOutlineG
      .roundRect(-topW - 3, topY - 5, (topW + 3) * 2, 7, 3)
      .fill({ color: isSealing ? 0x2c8c72 : 0xf6efe0 })
      .stroke({ width: 2, color: 0x1b2e2d });

    app.render();
  };

  const dispose = () => {
    destroyed = true;
    if (canvas.parentNode === container) {
      container.removeChild(canvas);
    }
    app.destroy(true, { children: true });
  };

  return { renderCup, dispose };
}
