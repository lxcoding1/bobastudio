import type { RefObject } from 'react';
import {
  getTimeOfDayPhase,
  MAX_SIM_SPEED,
  MILK_META,
  PERCENT_OPTIONS,
  TEA_BASE_META,
  TOPPING_META,
} from '../game/catalog';
import {
  checkCanCraftDrink,
  formatShopClock,
  getUnlockedMilks,
  getUnlockedTeaBases,
  getUnlockedToppings,
} from '../game/simulation';
import type {
  DrinkBuild,
  OrderTicket,
  PercentLevel,
  RenderStyle,
  SimState,
} from '../game/types';

interface GameHudProps {
  state: SimState;
  renderStyle: RenderStyle;
  muted: boolean;
  benchCollapsed: boolean;
  crafterMountRef: RefObject<HTMLDivElement | null>;
  onToggleBench: () => void;
  onChangeRenderStyle: (style: RenderStyle) => void;
  onCycleSpeed: () => void;
  onSetSpeed: (speed: number) => void;
  onOpenPantry: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectOrder: (orderId: string) => void;
  onCookBoba: () => void;
  onBrewTea: () => void;
  onUpdateBuild: (patch: Partial<DrinkBuild>) => void;
  onServeDrink: () => void;
}


export function GameHud({
  state,
  renderStyle,
  muted,
  benchCollapsed,
  crafterMountRef,
  onToggleBench,
  onChangeRenderStyle,
  onCycleSpeed,
  onSetSpeed,
  onOpenPantry,
  onToggleMute,
  onPause,
  onSelectOrder,
  onCookBoba,
  onBrewTea,
  onUpdateBuild,
  onServeDrink,
}: GameHudProps) {
  const selectedOrder: OrderTicket | null =
    state.orders.find((o) => o.id === state.selectedOrderId) ?? state.orders[0] ?? null;

  const craftCheck = checkCanCraftDrink(state, state.currentBuild);
  const bobaPct = Math.round(state.bobaPot.freshness);
  const timePhase = getTimeOfDayPhase(state.simMinutes);
  const onDutyCount = state.employees.filter((e) => e.onDuty).length;
  const teaKeys = getUnlockedTeaBases(state.unlockedResearch);
  const milkKeys = getUnlockedMilks(state.unlockedResearch);
  const toppingKeys = getUnlockedToppings(state.unlockedResearch);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* Top Row: Shop Ledger Plaque (Left) + Utility Icon Controls (Right) */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-2 pointer-events-auto max-w-full">
          {/* Compact Top-Left Ledger Plaque */}
          <div className="ink-panel rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2.5 sm:gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#4b6866]">
                Cash
              </div>
              <div
                className="font-mono-num text-base sm:text-xl font-bold text-[#182a29] leading-tight"
                data-testid="hud-cash"
              >
                ${state.cash.toFixed(2)}
              </div>
            </div>
            <div className="h-6 sm:h-7 w-px bg-[#1b2e2d]/15" aria-hidden="true" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#4b6866]">
                Rating
              </div>
              <div
                className="font-mono-num text-base sm:text-xl font-bold text-[#b8462c] leading-tight"
                data-testid="hud-reputation"
              >
                {state.reputation.toFixed(1)}★
              </div>
            </div>
            <div className="h-6 sm:h-7 w-px bg-[#1b2e2d]/15" aria-hidden="true" />
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider text-[#4b6866] whitespace-nowrap"
                data-testid="hud-day-phase"
              >
                Day {state.day} · {timePhase.label}
              </div>
              <div className="font-mono-num text-xs sm:text-sm font-bold text-[#182a29] leading-tight whitespace-nowrap">
                {formatShopClock(state.simMinutes)}
              </div>
            </div>
            <div className="h-7 w-px bg-[#1b2e2d]/15 hidden sm:block" aria-hidden="true" />
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#4b6866]">
                Served · Staff
              </div>
              <div className="font-mono-num text-sm font-bold text-[#217a62] leading-tight whitespace-nowrap">
                {state.totalServed} · {onDutyCount}/{state.maxStaffSlots}
              </div>
            </div>
          </div>

          {/* Compact Left Order Queue (max-w-[270px], never covers center 3D diorama) */}
          <div className="w-[248px] sm:w-[258px] space-y-1.5" data-testid="order-queue">
            {state.orders.length === 0 ? (
              <div className="ink-panel rounded-lg px-3 py-2 text-xs font-medium text-[#4b6866]">
                Waiting for guests at the door...
              </div>
            ) : (
              state.orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                const ratio = Math.max(0, Math.min(1, order.patienceLeft / order.patienceMax));
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSelectOrder(order.id);
                    }}
                    className={`ink-btn w-full text-left rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#fff5de] border-[#e06d53]'
                        : 'bg-[#f7f1e5]/95 hover:bg-[#fffaf0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#182a29] truncate">
                        #{order.ticketNumber} · {order.customerName}
                        {order.isRefill && (
                          <span className="ml-1.5 rounded border border-[#235958]/40 bg-[#e6f5ef] px-1 py-0.5 text-[9px] font-bold uppercase text-[#217a62]">
                            Refill
                          </span>
                        )}
                      </span>
                      <span className="font-mono-num text-[11px] font-bold text-[#217a62] shrink-0">
                        ${order.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#b8462c] truncate mt-0.5">
                      {order.recipe.name}
                    </div>
                    <div className="text-[11px] text-[#45615f] mt-0.5 truncate">
                      {order.status === 'staff_crafting'
                        ? `Staff crafting (${Math.round(order.sealProgress * 100)}%)`
                        : `${TEA_BASE_META[order.recipe.teaBase].short} · ${MILK_META[order.recipe.milk].short} · ${TOPPING_META[order.recipe.topping].short} · ${order.ice}% Ice · ${order.sweetness}% Sug`}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-sm bg-[#dfd5c1] overflow-hidden">
                      <div
                        className="h-full transition-all duration-150"
                        style={{
                          width: `${Math.round(ratio * 100)}%`,
                          backgroundColor:
                            ratio > 0.5 ? '#2c8c72' : ratio > 0.25 ? '#d99b26' : '#d64545',
                        }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Top-Right Compact Utility Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label={renderStyle === 'toon' ? 'Switch to Pixel-Art Render' : 'Switch to 3D Toon'}
            onClick={(e) => {
              e.currentTarget.blur();
              onChangeRenderStyle(renderStyle === 'toon' ? 'pixel' : 'toon');
            }}
            className="ink-btn rounded-lg bg-[#f7f1e5] text-[#182a29] px-2.5 sm:px-3 h-9 sm:h-10 text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            {renderStyle === 'toon' ? '3D Toon' : 'Pixel-Art'}
          </button>

          <div
            className="flex items-center rounded-lg border-2 border-[#1b2e2d] bg-[#f7f1e5] shadow-[2px_2px_0_#1b2e2d] h-9 sm:h-10 overflow-hidden"
            role="group"
            aria-label="Simulation speed controls"
          >
            <button
              type="button"
              tabIndex={-1}
              disabled={state.speedMultiplier <= 1}
              aria-label="Decrease simulation speed"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetSpeed(state.speedMultiplier - 1);
              }}
              className="px-2 h-full font-mono-num text-xs font-bold text-[#182a29] hover:bg-[#ebe1cd] disabled:opacity-35 cursor-pointer border-r border-[#1b2e2d]/20"
            >
              -
            </button>
            <button
              type="button"
              tabIndex={-1}
              data-testid="speed-display"
              aria-label={`Simulation speed ${state.speedMultiplier}x (click to cycle up to 10x)`}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleSpeed();
              }}
              className={`px-2.5 h-full font-mono-num text-xs font-bold whitespace-nowrap cursor-pointer ${
                state.speedMultiplier >= 5
                  ? 'bg-[#e06d53] text-white'
                  : state.speedMultiplier > 1
                    ? 'bg-[#fff3d2] text-[#182a29]'
                    : 'bg-[#f7f1e5] text-[#182a29]'
              }`}
            >
              {state.speedMultiplier}×
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={state.speedMultiplier >= MAX_SIM_SPEED}
              aria-label="Increase simulation speed"
              onClick={(e) => {
                e.currentTarget.blur();
                onSetSpeed(state.speedMultiplier + 1);
              }}
              className="px-2 h-full font-mono-num text-xs font-bold text-[#182a29] hover:bg-[#ebe1cd] disabled:opacity-35 cursor-pointer border-l border-[#1b2e2d]/20"
            >
              +
            </button>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Shop, Staff and Pantry Management"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenPantry();
            }}
            className="ink-btn rounded-lg bg-[#235958] text-[#f6efe0] px-2.5 sm:px-3 h-9 sm:h-10 text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            Shop &amp; Staff [U]
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="ink-btn rounded-lg bg-[#f7f1e5] text-[#182a29] w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
              {muted ? (
                <path d="M22 9l-6 6M16 9l6 6" strokeLinecap="round" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Simulation"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="ink-btn rounded-lg bg-[#f7f1e5] text-[#182a29] w-10 h-10 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Prep & Drink Crafting Dock */}
      <div className="mx-auto w-full max-w-6xl flex flex-col items-center pointer-events-none">
        {state.bannerMessage && (
          <div className="mb-2 pointer-events-none ink-panel-dark rounded-lg px-4 py-1.5 text-xs font-bold whitespace-nowrap max-w-[92vw] truncate">
            {state.bannerMessage}
          </div>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleBench();
          }}
          className="pointer-events-auto ink-btn rounded-t-lg rounded-b-none border-b-0 bg-[#235958] text-[#f6efe0] px-4 py-1 text-xs font-bold cursor-pointer"
        >
          {benchCollapsed ? '▴ Show Drink Bench [H]' : '▾ Hide Drink Bench [H]'}
        </button>

        {!benchCollapsed && (
          <div className="pointer-events-auto ink-panel rounded-xl w-full p-2.5 md:p-3 grid grid-cols-1 lg:grid-cols-[190px_148px_1fr_160px] gap-2.5 items-center max-h-[52vh] overflow-y-auto lg:overflow-visible">
            {/* 1. Batch Kitchen Pots */}
            <div className="space-y-1.5 border-b lg:border-b-0 lg:border-r border-[#1b2e2d]/15 pb-2 lg:pb-0 lg:pr-2.5">
              {/* Boba Kettle */}
              <div className="rounded-lg border border-[#1b2e2d]/25 bg-[#fffaf0] p-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Boba Kettle</span>
                  <span className="font-mono-num text-[#217a62]">
                    {state.bobaPot.servingsLeft}/{state.bobaPot.maxServings}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#54706e] mt-0.5">
                  <span>Freshness {bobaPct}%</span>
                  <span>Raw: {state.inventory.rawBoba}</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-sm bg-[#dfd5c1] overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${
                        state.bobaPot.isCooking
                          ? Math.round(state.bobaPot.cookProgress * 100)
                          : bobaPct
                      }%`,
                      backgroundColor: state.bobaPot.isCooking ? '#e06d53' : '#2c8c72',
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={state.bobaPot.isCooking || state.inventory.rawBoba <= 0}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCookBoba();
                  }}
                  className="ink-btn mt-1.5 w-full rounded bg-[#235958] text-[#f6efe0] text-[11px] font-bold py-1 cursor-pointer"
                >
                  {state.bobaPot.isCooking ? 'Cooking Boba...' : 'Cook Boba Batch'}
                </button>
              </div>

              {/* Tea Brewer */}
              <div className="rounded-lg border border-[#1b2e2d]/25 bg-[#fffaf0] p-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Tea Infuser</span>
                  <span className="font-mono-num text-[#b87635]">
                    {state.teaBrewer.servingsLeft}/{state.teaBrewer.maxServings}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-sm bg-[#dfd5c1] overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${
                        state.teaBrewer.isCooking
                          ? Math.round(state.teaBrewer.cookProgress * 100)
                          : Math.round(
                              (state.teaBrewer.servingsLeft / state.teaBrewer.maxServings) * 100,
                            )
                      }%`,
                      backgroundColor: state.teaBrewer.isCooking ? '#e06d53' : '#b87635',
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={state.teaBrewer.isCooking}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onBrewTea();
                  }}
                  className="ink-btn mt-1.5 w-full rounded bg-[#b87635] text-white text-[11px] font-bold py-1 cursor-pointer"
                >
                  {state.teaBrewer.isCooking ? 'Steeping Tea...' : 'Brew Tea Pot'}
                </button>
              </div>
            </div>

            {/* 2. PixiJS Interactive 2D Cup Crafter */}
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-[#1b2e2d] bg-[#f1e9d8] mx-auto">
              <div
                ref={crafterMountRef}
                data-testid="pixi-drink-crafter"
                className="w-[148px] h-[148px]"
              />
            </div>

            {/* 3. Drink Ingredient Selectors */}
            <div className="space-y-1.5 min-w-0">
              {/* Row 1: Tea Base */}
              <div className="flex flex-wrap items-center gap-1" data-testid="tea-base-buttons">
                <span className="text-[11px] font-bold text-[#4b6866] w-11 shrink-0">Tea</span>
                {teaKeys.map((key, idx) => {
                  const meta = TEA_BASE_META[key];
                  const active = state.currentBuild.teaBase === key;
                  const targetMatch = selectedOrder?.recipe.teaBase === key;
                  const stock = state.inventory[meta.stockKey];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onUpdateBuild({ teaBase: key });
                      }}
                      className={`ink-btn rounded px-2 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#235958] text-[#f6efe0]'
                          : targetMatch
                            ? 'bg-[#fff3d2] text-[#182a29]'
                            : 'bg-[#fffaf0] text-[#182a29]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-sm border border-[#1b2e2d]"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span>
                        {idx + 1}.{meta.short}
                      </span>
                      <span className="font-mono-num text-[10px] opacity-75">{stock}</span>
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Milk / Foam */}
              <div className="flex flex-wrap items-center gap-1" data-testid="milk-buttons">
                <span className="text-[11px] font-bold text-[#4b6866] w-11 shrink-0">Milk</span>
                {milkKeys.map((key) => {
                  const meta = MILK_META[key];
                  const active = state.currentBuild.milk === key;
                  const targetMatch = selectedOrder?.recipe.milk === key;
                  const stock = meta.stockKey ? state.inventory[meta.stockKey] : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onUpdateBuild({ milk: key });
                      }}
                      className={`ink-btn rounded px-2 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#235958] text-[#f6efe0]'
                          : targetMatch
                            ? 'bg-[#fff3d2] text-[#182a29]'
                            : 'bg-[#fffaf0] text-[#182a29]'
                      }`}
                    >
                      <span>{meta.short}</span>
                      {stock !== null && (
                        <span className="font-mono-num text-[10px] opacity-75">{stock}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 3: Toppings */}
              <div className="flex flex-wrap items-center gap-1" data-testid="topping-buttons">
                <span className="text-[11px] font-bold text-[#4b6866] w-11 shrink-0">Top</span>
                {toppingKeys.map((key) => {
                  const meta = TOPPING_META[key];
                  const active = state.currentBuild.topping === key;
                  const targetMatch = selectedOrder?.recipe.topping === key;
                  const stock =
                    key === 'boba'
                      ? state.bobaPot.servingsLeft
                      : meta.stockKey
                        ? state.inventory[meta.stockKey]
                        : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onUpdateBuild({ topping: key });
                      }}
                      className={`ink-btn rounded px-2 py-1 text-[11px] font-bold whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#235958] text-[#f6efe0]'
                          : targetMatch
                            ? 'bg-[#fff3d2] text-[#182a29]'
                            : 'bg-[#fffaf0] text-[#182a29]'
                      }`}
                    >
                      <span>{meta.short}</span>
                      {stock !== null && (
                        <span className="font-mono-num text-[10px] opacity-75">{stock}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 4: Ice & Sugar */}
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-[#4b6866] mr-1">Ice</span>
                  {PERCENT_OPTIONS.map((pct: PercentLevel) => {
                    const active = state.currentBuild.ice === pct;
                    const targetMatch = selectedOrder?.ice === pct;
                    return (
                      <button
                        key={`ice_${pct}`}
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onUpdateBuild({ ice: pct });
                        }}
                        className={`rounded border px-1.5 py-0.5 font-mono-num text-[11px] font-bold cursor-pointer ${
                          active
                            ? 'bg-[#235958] text-[#f6efe0] border-[#1b2e2d]'
                            : targetMatch
                              ? 'bg-[#fff3d2] text-[#182a29] border-[#e06d53]'
                              : 'bg-[#fffaf0] text-[#182a29] border-[#1b2e2d]/40'
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-[#4b6866] mr-1">Sugar</span>
                  {PERCENT_OPTIONS.map((pct: PercentLevel) => {
                    const active = state.currentBuild.sweetness === pct;
                    const targetMatch = selectedOrder?.sweetness === pct;
                    return (
                      <button
                        key={`sug_${pct}`}
                        type="button"
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onUpdateBuild({ sweetness: pct });
                        }}
                        className={`rounded border px-1.5 py-0.5 font-mono-num text-[11px] font-bold cursor-pointer ${
                          active
                            ? 'bg-[#235958] text-[#f6efe0] border-[#1b2e2d]'
                            : targetMatch
                              ? 'bg-[#fff3d2] text-[#182a29] border-[#e06d53]'
                              : 'bg-[#fffaf0] text-[#182a29] border-[#1b2e2d]/40'
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Serve Action */}
            <div className="flex flex-col gap-1.5">
              {selectedOrder ? (
                <div className="text-[11px] font-semibold text-[#45615f] text-center truncate">
                  For #{selectedOrder.ticketNumber} · {selectedOrder.customerName}
                </div>
              ) : (
                <div className="text-[11px] font-semibold text-[#54706e] text-center">
                  No active ticket
                </div>
              )}
              <button
                type="button"
                disabled={
                  !selectedOrder ||
                  selectedOrder.status !== 'waiting' ||
                  !craftCheck.canCraft
                }
                onClick={(e) => {
                  e.currentTarget.blur();
                  onServeDrink();
                }}
                className="ink-btn rounded-lg bg-[#e06d53] text-white font-display font-bold py-3 px-3 text-sm whitespace-nowrap cursor-pointer"
              >
                {selectedOrder?.status === 'sealing'
                  ? `Sealing ${Math.round(selectedOrder.sealProgress * 100)}%`
                  : selectedOrder?.status === 'staff_crafting'
                    ? `Staff Crafting ${Math.round(selectedOrder.sealProgress * 100)}%`
                    : 'Brew & Serve [Space]'}
              </button>
              <div className="text-[10px] font-semibold text-center text-[#b8462c] min-h-[14px] leading-tight">
                {!selectedOrder
                  ? ''
                  : craftCheck.canCraft
                    ? `Cups left: ${state.inventory.cups}`
                    : craftCheck.reason}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
