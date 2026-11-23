import { RESTOCK_PACKS, SHOP_UPGRADES } from '../game/catalog';
import type { ShopUpgrades, SimState } from '../game/types';

interface ShopManagementModalProps {
  state: SimState;
  isDayEnd: boolean;
  onBuyRestock: (packId: string) => void;
  onBuyUpgrade: (key: keyof ShopUpgrades) => void;
  onContinue: () => void;
}

export function ShopManagementModal({
  state,
  isDayEnd,
  onBuyRestock,
  onBuyUpgrade,
  onContinue,
}: ShopManagementModalProps) {
  const summary = state.lastDaySummary;
  const inv = state.inventory;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#162625]/55"
      role="dialog"
      aria-modal="true"
      aria-label={isDayEnd ? 'End of Day Summary' : 'Pantry and Upgrades'}
    >
      <div className="ink-panel rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-[#1b2e2d]/15">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-[#182a29]">
              {isDayEnd ? `Day ${summary?.day ?? state.day} Closing Ledger` : 'Pantry & Equipment'}
            </h2>
            <p className="text-xs font-medium text-[#4b6866] mt-0.5">
              Cash on Hand: <span className="font-mono-num font-bold text-[#182a29]">${state.cash.toFixed(2)}</span>
              <span aria-hidden="true"> · </span>
              Shop Rating: <span className="font-mono-num font-bold text-[#182a29]">{state.reputation.toFixed(2)} ★</span>
              <span aria-hidden="true"> · </span>
              Cups Left: <span className="font-mono-num font-bold text-[#182a29]">{inv.cups}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="ink-btn rounded-lg bg-[#e06d53] text-white font-display font-bold px-5 py-2.5 text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDayEnd ? `Open Day ${state.day + 1}` : 'Back to Counter'}
          </button>
        </div>

        {/* Day P&L Summary */}
        {isDayEnd && summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fff9ee] p-3">
              <div className="text-[11px] font-semibold text-[#54706e]">Drinks Served</div>
              <div className="font-mono-num text-xl font-bold text-[#182a29] mt-0.5">
                {summary.drinksServed}
              </div>
              <div className="text-[11px] text-[#54706e]">{summary.perfectDrinks} perfect</div>
            </div>
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fff9ee] p-3">
              <div className="text-[11px] font-semibold text-[#54706e]">Sales &amp; Tips</div>
              <div className="font-mono-num text-xl font-bold text-[#217a62] mt-0.5">
                +${(summary.revenue + summary.tipsEarned).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#54706e]">${summary.tipsEarned.toFixed(2)} tips</div>
            </div>
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fff9ee] p-3">
              <div className="text-[11px] font-semibold text-[#54706e]">Restock &amp; Gear</div>
              <div className="font-mono-num text-xl font-bold text-[#b8462c] mt-0.5">
                -${(summary.restockSpent + summary.upgradeSpent).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#54706e]">Rent -${summary.rentCost}</div>
            </div>
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fff9ee] p-3">
              <div className="text-[11px] font-semibold text-[#54706e]">Net Profit</div>
              <div
                className={`font-mono-num text-xl font-bold mt-0.5 ${
                  summary.netProfit >= 0 ? 'text-[#217a62]' : 'text-[#b8462c]'
                }`}
              >
                {summary.netProfit >= 0 ? '+' : '-'}${Math.abs(summary.netProfit).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#54706e]">{summary.walkouts} walkouts</div>
            </div>
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fff9ee] p-3">
              <div className="text-[11px] font-semibold text-[#54706e]">Reputation</div>
              <div className="font-mono-num text-xl font-bold text-[#182a29] mt-0.5">
                {summary.reputationDelta >= 0 ? '+' : ''}
                {summary.reputationDelta.toFixed(2)} ★
              </div>
              <div className="text-[11px] text-[#54706e]">Goal: 4.80 ★</div>
            </div>
          </div>
        )}

        {/* Current Stock Overview */}
        <div className="my-4 rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] p-3">
          <div className="text-xs font-bold text-[#2b4947] mb-2">Current Pantry Stock</div>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-xs font-mono-num">
            <div>Assam: <strong>{inv.assamTea}</strong></div>
            <div>Jasmine: <strong>{inv.jasmineTea}</strong></div>
            <div>Oolong: <strong>{inv.oolongTea}</strong></div>
            <div>Matcha: <strong>{inv.matchaPowder}</strong></div>
            <div>Taro: <strong>{inv.taroPaste}</strong></div>
            <div>Milk: <strong>{inv.freshMilk}</strong></div>
            <div>Oat: <strong>{inv.oatMilk}</strong></div>
            <div>Br.Sug: <strong>{inv.brownSugar}</strong></div>
            <div>Foam: <strong>{inv.cheeseFoam}</strong></div>
            <div>Raw Boba: <strong>{inv.rawBoba}</strong></div>
            <div>Crystal: <strong>{inv.crystalBoba}</strong></div>
            <div>Lychee: <strong>{inv.lycheeJelly}</strong></div>
            <div>Pudding: <strong>{inv.eggPudding}</strong></div>
            <div>Cups: <strong>{inv.cups}</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Restock Packs */}
          <div>
            <h3 className="font-display text-base font-bold text-[#182a29] mb-2.5">
              Ingredient Restock
            </h3>
            <div className="space-y-2.5">
              {RESTOCK_PACKS.map((pack) => {
                const canAfford = state.cash >= pack.cost;
                return (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#182a29]">{pack.name}</div>
                      <div className="text-xs text-[#4b6866]">{pack.summary}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => onBuyRestock(pack.id)}
                      className="ink-btn rounded-lg bg-[#235958] text-[#f6efe0] font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Buy ${pack.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equipment Upgrades */}
          <div>
            <h3 className="font-display text-base font-bold text-[#182a29] mb-2.5">
              Kitchen Upgrades
            </h3>
            <div className="space-y-2.5">
              {SHOP_UPGRADES.map((up) => {
                const owned = state.upgrades[up.key];
                const canAfford = state.cash >= up.cost;
                return (
                  <div
                    key={up.key}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#182a29]">{up.name}</div>
                      <div className="text-xs text-[#4b6866]">{up.effect}</div>
                    </div>
                    {owned ? (
                      <span className="font-mono-num text-xs font-bold text-[#217a62] px-3 py-1.5 shrink-0">
                        Installed
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(up.key)}
                        className="ink-btn rounded-lg bg-[#e06d53] text-white font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        ${up.cost}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
