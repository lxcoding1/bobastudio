import { Application, Container, Graphics, Text } from 'pixi.js';
import type { OrderTicket, SimState } from '../game/types';
import type { ProjectedAnchor } from '../three/shopScene';

export interface WorldOverlayController {
  update: (state: SimState, anchors: Map<string, ProjectedAnchor>, dt: number) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

interface BubbleNode {
  container: Container;
  bg: Graphics;
  cup: Graphics;
  bar: Graphics;
  label: Text;
}

interface EventPopupNode {
  container: Container;
  bg: Graphics;
  text: Text;
}

export async function createWorldOverlay(
  container: HTMLElement,
  isSoftwareGl: boolean,
): Promise<WorldOverlayController> {
  let destroyed = false;
  const app = new Application();
  const w = Math.max(container.clientWidth, 320);
  const h = Math.max(container.clientHeight, 240);

  await app.init({
    width: w,
    height: h,
    backgroundAlpha: 0,
    antialias: !isSoftwareGl,
    resolution: isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
  });

  if (destroyed) {
    app.destroy(true, { children: true });
    return {
      update: () => {},
      resize: () => {},
      dispose: () => {},
    };
  }

  // Stop Pixi's internal ticker so we stay 100% synchronized with Three.js's paced loop
  app.ticker.stop();

  const canvas = app.canvas;
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  container.appendChild(canvas);

  const bubbleLayer = new Container();
  const stationLayer = new Container();
  const staffLayer = new Container();
  const particleLayer = new Container();
  const popupLayer = new Container();
  app.stage.addChild(bubbleLayer, stationLayer, staffLayer, particleLayer, popupLayer);

  const bubbleNodes = new Map<string, BubbleNode>();
  const stationNodes = new Map<string, BubbleNode>();
  const staffNodes = new Map<string, BubbleNode>();
  const popupNodes = new Map<string, EventPopupNode>();
  const seenEvents = new Set<string>();
  const particles: BurstParticle[] = [];
  const particleGraphics = new Graphics();
  particleLayer.addChild(particleGraphics);

  let animTime = 0;

  const getOrCreateBubble = (map: Map<string, BubbleNode>, parent: Container, id: string) => {
    let node = map.get(id);
    if (!node) {
      const c = new Container();
      const bg = new Graphics();
      const cup = new Graphics();
      const bar = new Graphics();
      const label = new Text({
        text: '',
        style: {
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          fill: '#1b2e2d',
        },
      });
      label.position.set(22, 5);
      c.addChild(bg, cup, bar, label);
      parent.addChild(c);
      node = { container: c, bg, cup, bar, label };
      map.set(id, node);
    }
    return node;
  };

  const spawnBurst = (x: number, y: number, kind: 'serve' | 'fail' | 'batch' | 'walkout') => {
    const count = kind === 'serve' ? 14 : kind === 'batch' ? 10 : 7;
    const palette =
      kind === 'serve'
        ? ['#e06d53', '#f4c552', '#265c5b', '#3c241d']
        : kind === 'batch'
          ? ['#34d399', '#e06d53', '#f6efe0']
          : ['#c94c4c', '#7c5338'];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI + Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 95;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        radius: 3 + Math.random() * 3,
        color: palette[i % palette.length],
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35,
      });
    }
  };

  const drawCustomerBubble = (
    node: BubbleNode,
    order: OrderTicket,
    selected: boolean,
    x: number,
    y: number,
  ) => {
    const bw = 96;
    const bh = 32;
    const bob = selected ? Math.sin(animTime * 5) * 2.5 : 0;
    node.container.position.set(Math.round(x - bw / 2), Math.round(y - bh - 12 + bob));

    node.bg.clear();
    // Drop shadow
    node.bg.roundRect(2, 2, bw, bh, 8).fill({ color: 0x1b2e2d, alpha: 0.85 });
    // Speech card
    node.bg
      .roundRect(0, 0, bw, bh, 8)
      .fill({ color: selected ? 0xfff6e3 : 0xf6efe0 })
      .stroke({ width: selected ? 2.5 : 1.75, color: selected ? 0xe06d53 : 0x1b2e2d });

    // Mini boba cup icon on left
    node.cup.clear();
    node.cup.roundRect(6, 7, 11, 14, 2).fill({ color: order.recipe.liquidColor });
    if (order.recipe.foamColor) {
      node.cup.rect(6, 7, 11, 4).fill({ color: order.recipe.foamColor });
    }
    node.cup.roundRect(6, 7, 11, 14, 2).stroke({ width: 1.5, color: 0x1b2e2d });
    node.cup.moveTo(11.5, 4).lineTo(13, 10).stroke({ width: 1.6, color: 0xe06d53 });

    node.label.text = `#${order.ticketNumber}`;
    node.label.style.fill = selected ? '#b8462c' : '#1b2e2d';

    // Patience progress bar
    const ratio = Math.max(0, Math.min(1, order.patienceLeft / order.patienceMax));
    const barColor = ratio > 0.5 ? 0x2c8c72 : ratio > 0.25 ? 0xd99b26 : 0xd64545;
    node.bar.clear();
    node.bar.roundRect(22, 21, 64, 5, 2.5).fill({ color: 0xdfd5c1 });
    if (ratio > 0.02) {
      node.bar.roundRect(22, 21, Math.max(4, 64 * ratio), 5, 2.5).fill({ color: barColor });
    }
  };

  const drawStationBadge = (
    node: BubbleNode,
    labelStr: string,
    progress: number,
    isActive: boolean,
    x: number,
    y: number,
  ) => {
    const bw = 92;
    const bh = 26;
    node.container.position.set(Math.round(x - bw / 2), Math.round(y - bh));
    node.bg.clear();
    node.bg.roundRect(2, 2, bw, bh, 6).fill({ color: 0x1b2e2d, alpha: 0.85 });
    node.bg
      .roundRect(0, 0, bw, bh, 6)
      .fill({ color: isActive ? 0xfff3d6 : 0xf6efe0 })
      .stroke({ width: 1.75, color: 0x1b2e2d });
    node.cup.clear();
    node.label.position.set(8, 4);
    node.label.text = labelStr;
    node.bar.clear();
    node.bar.roundRect(8, 18, 76, 4, 2).fill({ color: 0xd9cfba });
    if (progress > 0.01) {
      node.bar
        .roundRect(8, 18, Math.max(4, 76 * Math.min(1, progress)), 4, 2)
        .fill({ color: isActive ? 0xe06d53 : 0x2c8c72 });
    }
  };

  const update = (state: SimState, anchors: Map<string, ProjectedAnchor>, dt: number) => {
    if (destroyed) return;
    animTime += dt;

    // 1. Customer order speech bubbles (visible during playing)
    const activeBubbleIds = new Set<string>();
    if (state.phase === 'playing') {
      for (const order of state.orders) {
        const anchor = anchors.get(order.customerId);
        if (!anchor || !anchor.visible) continue;
        activeBubbleIds.add(order.customerId);
        const node = getOrCreateBubble(bubbleNodes, bubbleLayer, order.customerId);
        node.container.visible = true;
        drawCustomerBubble(
          node,
          order,
          order.id === state.selectedOrderId,
          anchor.x,
          anchor.y,
        );
      }
    }
    for (const [id, node] of bubbleNodes.entries()) {
      if (!activeBubbleIds.has(id)) {
        node.container.visible = false;
      }
    }

    // 2. Station progress badges (when cooking or low stock)
    const showBobaBadge =
      state.phase === 'playing' && (state.bobaPot.isCooking || state.bobaPot.servingsLeft <= 2);
    const bobaAnchor = anchors.get('boba_pot');
    if (showBobaBadge && bobaAnchor?.visible) {
      const node = getOrCreateBubble(stationNodes, stationLayer, 'boba_pot');
      node.container.visible = true;
      const pct = state.bobaPot.isCooking
        ? state.bobaPot.cookProgress
        : state.bobaPot.servingsLeft / state.bobaPot.maxServings;
      const txt = state.bobaPot.isCooking
        ? `Cooking ${Math.round(state.bobaPot.cookProgress * 100)}%`
        : `Boba Low (${state.bobaPot.servingsLeft})`;
      drawStationBadge(node, txt, pct, state.bobaPot.isCooking, bobaAnchor.x, bobaAnchor.y);
    } else {
      const n = stationNodes.get('boba_pot');
      if (n) n.container.visible = false;
    }

    const showBrewBadge =
      state.phase === 'playing' && (state.teaBrewer.isCooking || state.teaBrewer.servingsLeft <= 2);
    const brewAnchor = anchors.get('tea_brewer');
    if (showBrewBadge && brewAnchor?.visible) {
      const node = getOrCreateBubble(stationNodes, stationLayer, 'tea_brewer');
      node.container.visible = true;
      const pct = state.teaBrewer.isCooking
        ? state.teaBrewer.cookProgress
        : state.teaBrewer.servingsLeft / state.teaBrewer.maxServings;
      const txt = state.teaBrewer.isCooking
        ? `Steeping ${Math.round(state.teaBrewer.cookProgress * 100)}%`
        : `Tea Low (${state.teaBrewer.servingsLeft})`;
      drawStationBadge(node, txt, pct, state.teaBrewer.isCooking, brewAnchor.x, brewAnchor.y);
    } else {
      const n = stationNodes.get('tea_brewer');
      if (n) n.container.visible = false;
    }

    // 2b. On-duty staff miniature task badges
    const activeStaffIds = new Set<string>();
    if (state.phase === 'playing') {
      for (const emp of state.employees) {
        if (!emp.onDuty) continue;
        const anchor = anchors.get(emp.id);
        if (!anchor || !anchor.visible) continue;
        activeStaffIds.add(emp.id);
        const node = getOrCreateBubble(staffNodes, staffLayer, emp.id);
        node.container.visible = true;
        const assignedOrd = emp.assignedOrderId
          ? state.orders.find((o) => o.id === emp.assignedOrderId)
          : null;
        const prog = assignedOrd ? assignedOrd.sealProgress : emp.task === 'prepping' ? 0.6 : 0;
        const tag =
          emp.task === 'crafting'
            ? `${emp.name} · Brew`
            : emp.task === 'prepping'
              ? `${emp.name} · Prep`
              : emp.role === 'cashier'
                ? `${emp.name} · Host`
                : emp.name;
        drawStationBadge(node, tag, prog, emp.task === 'crafting' || emp.task === 'prepping', anchor.x, anchor.y);
      }
    }
    for (const [id, node] of staffNodes.entries()) {
      if (!activeStaffIds.has(id)) {
        node.container.visible = false;
      }
    }

    // 3. Floating Event Popups + Trigger Particle Bursts
    const activeEventIds = new Set<string>();
    for (const ev of state.events) {
      const anchor = anchors.get(ev.id);
      if (!anchor || !anchor.visible) continue;
      activeEventIds.add(ev.id);
      if (!seenEvents.has(ev.id)) {
        seenEvents.add(ev.id);
        spawnBurst(anchor.x, anchor.y, ev.kind);
      }

      let pNode = popupNodes.get(ev.id);
      if (!pNode) {
        const c = new Container();
        const bg = new Graphics();
        const text = new Text({
          text: ev.subtext ? `${ev.text} · ${ev.subtext}` : ev.text,
          style: {
            fontFamily: 'Bricolage Grotesque, sans-serif',
            fontSize: 13,
            fontWeight: '700',
            fill: '#ffffff',
          },
        });
        text.position.set(8, 4);
        c.addChild(bg, text);
        popupLayer.addChild(c);
        pNode = { container: c, bg, text };
        popupNodes.set(ev.id, pNode);
      }

      const alpha = Math.max(0, 1 - ev.age / 1.75);
      pNode.container.alpha = alpha;
      const pw = pNode.text.width + 16;
      const ph = 24;
      pNode.bg.clear();
      pNode.bg
        .roundRect(0, 0, pw, ph, 6)
        .fill({ color: ev.color })
        .stroke({ width: 1.5, color: 0x1b2e2d });
      pNode.container.position.set(Math.round(anchor.x - pw / 2), Math.round(anchor.y - 16));
    }

    for (const [id, pNode] of popupNodes.entries()) {
      if (!activeEventIds.has(id)) {
        popupLayer.removeChild(pNode.container);
        pNode.container.destroy({ children: true });
        popupNodes.delete(id);
      }
    }

    // 4. Update & Render Particle Bursts
    particleGraphics.clear();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += 240 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = 1 - p.life / p.maxLife;
      particleGraphics
        .circle(p.x, p.y, p.radius)
        .fill({ color: p.color, alpha })
        .stroke({ width: 1, color: 0x1b2e2d, alpha });
    }

    app.render();
  };

  const resize = (newW: number, newH: number) => {
    if (destroyed) return;
    app.renderer.resize(Math.max(newW, 1), Math.max(newH, 1));
  };

  const dispose = () => {
    destroyed = true;
    if (canvas.parentNode === container) {
      container.removeChild(canvas);
    }
    app.destroy(true, { children: true });
  };

  return { update, resize, dispose };
}
