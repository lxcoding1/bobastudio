import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { ShopManagementModal } from './components/ShopManagementModal';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { shopAudio } from './game/audio';
import {
  advanceToNextDay,
  buyRestockPack,
  buyShopUpgrade,
  createInitialSimState,
  startBrewTeaBatch,
  startCookBobaBatch,
  startSealingSelectedOrder,
  stepSimulation,
} from './game/simulation';
import type {
  DrinkBuild,
  RenderStyle,
  ShopUpgrades,
  SimState,
} from './game/types';
import { createDrinkCrafter, type DrinkCrafterController } from './pixi/drinkCrafter';
import { createWorldOverlay, type WorldOverlayController } from './pixi/worldOverlay';
import { createShopScene, type ShopSceneController } from './three/shopScene';

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const simRef = useRef<SimState>(createInitialSimState(initialAutostart));
  const [hudVersion, setHudVersion] = useState(0);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('toon');
  const [muted, setMuted] = useState(false);
  const [benchCollapsed, setBenchCollapsed] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);

  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const pixiOverlayMountRef = useRef<HTMLDivElement | null>(null);
  const crafterMountRef = useRef<HTMLDivElement | null>(null);

  const sceneCtrlRef = useRef<ShopSceneController | null>(null);
  const worldOverlayRef = useRef<WorldOverlayController | null>(null);
  const crafterCtrlRef = useRef<DrinkCrafterController | null>(null);

  const pantryOpenRef = useRef(pantryOpen);
  pantryOpenRef.current = pantryOpen;
  const renderStyleRef = useRef(renderStyle);
  renderStyleRef.current = renderStyle;

  const syncHud = useCallback(() => {
    document.body.dataset.state = simRef.current.phase;
    setHudVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    document.body.dataset.state = simRef.current.phase;
  }, []);

  // Mount Three.js + PixiJS World Overlay + Unified Paced Game Loop once
  useEffect(() => {
    const threeEl = threeMountRef.current;
    const pixiEl = pixiOverlayMountRef.current;
    if (!threeEl || !pixiEl) return;

    const shopScene = createShopScene(threeEl);
    shopScene.setRenderStyle(renderStyleRef.current);
    sceneCtrlRef.current = shopScene;

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let lastTime = performance.now();
    let hudAccumulator = 0;

    let prevOrdersLen = simRef.current.orders.length;
    let prevServed = simRef.current.totalServed;
    let prevWalkouts = simRef.current.dayStats.walkouts;

    void createWorldOverlay(pixiEl, shopScene.isSoftwareGl).then((ctrl) => {
      if (disposed) {
        ctrl.dispose();
      } else {
        worldOverlayRef.current = ctrl;
      }
    });

    const handleResize = () => {
      const w = threeEl.clientWidth || window.innerWidth;
      const h = threeEl.clientHeight || window.innerHeight;
      shopScene.resize(w, h);
      worldOverlayRef.current?.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Track pointer drag vs click on the 3D shop canvas
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (simRef.current.phase !== 'playing' || pantryOpenRef.current) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      shopAudio.unlock();
      const hit = shopScene.handleClick(e.clientX, e.clientY);
      if (hit.kind === 'customer' && hit.customerId) {
        const order = simRef.current.orders.find((o) => o.customerId === hit.customerId);
        if (order) {
          simRef.current.selectedOrderId = order.id;
          shopAudio.playPlop(1.1);
          syncHud();
        }
      } else if (hit.kind === 'boba_pot') {
        if (startCookBobaBatch(simRef.current)) {
          shopAudio.playPlop(0.85);
          syncHud();
        }
      } else if (hit.kind === 'tea_brewer') {
        if (startBrewTeaBatch(simRef.current)) {
          shopAudio.playPour();
          syncHud();
        }
      }
    };
    shopScene.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    shopScene.renderer.domElement.addEventListener('pointerup', onPointerUp);

    const afterDraw = (cb: () => void) => {
      const gl = shopScene.renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            timerId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          }
        };
        timerId = window.setTimeout(poll, 5);
      } else {
        timerId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const sim = simRef.current;
      if (!pantryOpenRef.current) {
        stepSimulation(sim, rawDt);
      }

      // Trigger procedural SFX on discrete state changes
      if (sim.orders.length > prevOrdersLen && sim.phase === 'playing') {
        shopAudio.playBell();
      }
      if (sim.totalServed > prevServed) {
        shopAudio.playCash(sim.streak > 0);
      }
      if (sim.dayStats.walkouts > prevWalkouts) {
        shopAudio.playWarn();
      }
      prevOrdersLen = sim.orders.length;
      prevServed = sim.totalServed;
      prevWalkouts = sim.dayStats.walkouts;

      const { anchors } = shopScene.updateAndRender(sim, rawDt);
      worldOverlayRef.current?.update(sim, anchors, rawDt);

      const selectedOrder =
        sim.orders.find((o) => o.id === sim.selectedOrderId) ?? sim.orders[0] ?? null;
      crafterCtrlRef.current?.renderCup(sim.currentBuild, selectedOrder, rawDt);

      hudAccumulator += rawDt;
      if (hudAccumulator >= 0.1) {
        hudAccumulator = 0;
        if (document.body.dataset.state !== sim.phase) {
          document.body.dataset.state = sim.phase;
        }
        setHudVersion((v) => v + 1);
      }

      if (shopScene.isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (shopScene.isSoftwareGl) {
      afterDraw(tick);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      shopScene.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      shopScene.renderer.domElement.removeEventListener('pointerup', onPointerUp);
      worldOverlayRef.current?.dispose();
      worldOverlayRef.current = null;
      shopScene.dispose();
      sceneCtrlRef.current = null;
    };
  }, [syncHud]);

  // Mount/Unmount PixiJS Drink Crafter when Bottom Bench is visible during playing
  const phase = simRef.current.phase;
  useEffect(() => {
    const mount = crafterMountRef.current;
    if (phase !== 'playing' || benchCollapsed || !mount) {
      return;
    }

    let cancelled = false;
    const isSwGl = sceneCtrlRef.current?.isSoftwareGl ?? false;
    void createDrinkCrafter(mount, isSwGl).then((ctrl) => {
      if (cancelled) {
        ctrl.dispose();
      } else {
        crafterCtrlRef.current = ctrl;
        const sim = simRef.current;
        const ord =
          sim.orders.find((o) => o.id === sim.selectedOrderId) ?? sim.orders[0] ?? null;
        ctrl.renderCup(sim.currentBuild, ord, 0.016);
      }
    });

    return () => {
      cancelled = true;
      crafterCtrlRef.current?.dispose();
      crafterCtrlRef.current = null;
    };
  }, [phase, benchCollapsed, hudVersion > 0]);

  const handleStart = useCallback(() => {
    shopAudio.unlock();
    const sim = simRef.current;
    if (sim.phase === 'gameover') {
      simRef.current = createInitialSimState(true);
    } else {
      sim.phase = 'playing';
    }
    setPantryOpen(false);
    shopAudio.playBell();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    syncHud();
  }, [syncHud]);

  const handleChangeRenderStyle = useCallback((style: RenderStyle) => {
    setRenderStyle(style);
    sceneCtrlRef.current?.setRenderStyle(style);
  }, []);

  const handleUpdateBuild = useCallback(
    (patch: Partial<DrinkBuild>) => {
      shopAudio.unlock();
      Object.assign(simRef.current.currentBuild, patch);
      if (patch.teaBase) shopAudio.playPour();
      else if (patch.topping) shopAudio.playPlop(1.0);
      else shopAudio.playPlop(1.25);
      syncHud();
    },
    [syncHud],
  );

  const handleServeDrink = useCallback(() => {
    shopAudio.unlock();
    const res = startSealingSelectedOrder(simRef.current);
    if (res.canCraft) {
      shopAudio.playShake();
    } else {
      shopAudio.playWarn();
    }
    syncHud();
  }, [syncHud]);

  const handleCookBoba = useCallback(() => {
    shopAudio.unlock();
    if (startCookBobaBatch(simRef.current)) {
      shopAudio.playPlop(0.85);
    } else {
      shopAudio.playWarn();
    }
    syncHud();
  }, [syncHud]);

  const handleBrewTea = useCallback(() => {
    shopAudio.unlock();
    if (startBrewTeaBatch(simRef.current)) {
      shopAudio.playPour();
    }
    syncHud();
  }, [syncHud]);

  const handleToggleMute = useCallback(() => {
    const next = shopAudio.toggleMuted();
    setMuted(next);
  }, []);

  const handleTogglePause = useCallback(() => {
    const sim = simRef.current;
    if (pantryOpenRef.current) {
      setPantryOpen(false);
      return;
    }
    if (sim.phase === 'playing') {
      sim.phase = 'paused';
      syncHud();
    } else if (sim.phase === 'paused') {
      sim.phase = 'playing';
      syncHud();
    }
  }, [syncHud]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const sim = simRef.current;
      if (sim.phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStart();
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (sim.phase === 'playing' || sim.phase === 'paused') {
          e.preventDefault();
          handleTogglePause();
        }
        return;
      }

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (sim.phase !== 'playing') return;

      if (e.code === 'KeyU') {
        e.preventDefault();
        setPantryOpen((o) => !o);
        return;
      }

      if (pantryOpenRef.current) return;

      if (e.code === 'KeyH') {
        e.preventDefault();
        setBenchCollapsed((c) => !c);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleServeDrink();
        return;
      }

      const teaShortcuts: Record<string, DrinkBuild['teaBase']> = {
        Digit1: 'assam',
        Digit2: 'jasmine',
        Digit3: 'oolong',
        Digit4: 'matcha',
        Digit5: 'taro',
      };
      if (teaShortcuts[e.code]) {
        e.preventDefault();
        handleUpdateBuild({ teaBase: teaShortcuts[e.code] });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleServeDrink, handleStart, handleToggleMute, handleTogglePause, handleUpdateBuild]);

  const sim = simRef.current;
  // Consume hudVersion to ensure fresh render when sim mutates
  void hudVersion;

  return (
    <main className="relative w-full h-full overflow-hidden select-none bg-[#efe8d8]">
      {/* Isolated 3D Three.js Shop Diorama Canvas */}
      <div
        ref={threeMountRef}
        data-testid="three-shop-canvas"
        className="fixed inset-0 z-0"
      />

      {/* Isolated 2D PixiJS World Overlay Canvas (bubbles, patience, bursts) */}
      <div
        ref={pixiOverlayMountRef}
        data-testid="pixi-world-overlay"
        className="fixed inset-0 z-10 pointer-events-none"
      />

      {sim.phase === 'title' && (
        <TitleOverlay
          renderStyle={renderStyle}
          onChangeRenderStyle={handleChangeRenderStyle}
          onStart={handleStart}
        />
      )}

      {sim.phase === 'playing' && (
        <GameHud
          state={sim}
          renderStyle={renderStyle}
          muted={muted}
          benchCollapsed={benchCollapsed}
          crafterMountRef={crafterMountRef}
          onToggleBench={() => setBenchCollapsed((c) => !c)}
          onChangeRenderStyle={handleChangeRenderStyle}
          onToggleSpeed={() => {
            sim.speedMultiplier = sim.speedMultiplier === 1 ? 2 : 1;
            syncHud();
          }}
          onOpenPantry={() => setPantryOpen(true)}
          onToggleMute={handleToggleMute}
          onPause={handleTogglePause}
          onSelectOrder={(orderId) => {
            sim.selectedOrderId = orderId;
            shopAudio.playPlop(1.1);
            syncHud();
          }}
          onCookBoba={handleCookBoba}
          onBrewTea={handleBrewTea}
          onUpdateBuild={handleUpdateBuild}
          onServeDrink={handleServeDrink}
        />
      )}

      {(sim.phase === 'day_end' || (sim.phase === 'playing' && pantryOpen)) && (
        <ShopManagementModal
          state={sim}
          isDayEnd={sim.phase === 'day_end'}
          onBuyRestock={(packId) => {
            if (buyRestockPack(sim, packId)) {
              shopAudio.playCash(false);
              syncHud();
            }
          }}
          onBuyUpgrade={(key: keyof ShopUpgrades) => {
            if (buyShopUpgrade(sim, key)) {
              shopAudio.playCash(true);
              syncHud();
            }
          }}
          onContinue={() => {
            if (sim.phase === 'day_end') {
              advanceToNextDay(sim);
              shopAudio.playBell();
            } else {
              setPantryOpen(false);
            }
            syncHud();
          }}
        />
      )}

      {(sim.phase === 'paused' || sim.phase === 'gameover') && (
        <StatusModal
          state={sim}
          onResume={handleTogglePause}
          onContinueEndless={() => {
            sim.endlessMode = true;
            sim.outcome = 'none';
            advanceToNextDay(sim);
            syncHud();
          }}
          onRestart={() => {
            simRef.current = createInitialSimState(true);
            setPantryOpen(false);
            syncHud();
          }}
          onReturnTitle={() => {
            simRef.current = createInitialSimState(false);
            setPantryOpen(false);
            syncHud();
          }}
        />
      )}
    </main>
  );
}
