import { useEffect, useState } from 'react';
import {
  DRINK_MENU,
  MAX_STAFF_LEVEL,
  RESEARCH_PROJECTS,
  RESTOCK_PACKS,
  SHOP_EXPANSIONS,
  SHOP_UPGRADES,
  STAFF_ROLE_META,
  STAFF_ROSTER,
  TIP_JAR_PRESETS,
} from '../game/catalog';
import {
  getAvailableMenu,
  getEmployeeAccuracyChance,
  getExpansionDef,
  getTrainingCost,
  getTrainingTier,
} from '../game/simulation';
import type {
  EmployeeReviewRecord,
  ShopUpgrades,
  SimState,
  TipJarMode,
} from '../game/types';
import { EmployeePerformanceLog } from './EmployeePerformanceLog';

type ManagementTab = 'report' | 'pantry' | 'research' | 'staff' | 'expansion';

interface ShopManagementModalProps {
  state: SimState;
  isDayEnd: boolean;
  onBuyRestock: (packId: string) => void;
  onBuyUpgrade: (key: keyof ShopUpgrades) => void;
  onUnlockResearch: (researchId: string) => void;
  onHireEmployee: (candidateId: string) => void;
  onToggleEmployeeDuty: (empId: string) => void;
  onToggleEmployeeAutoRestock: (empId: string) => void;
  onTrainEmployee: (empId: string) => void;
  onTipEmployee: (empId: string, amount: number) => void;
  onReviewEmployee: (
    empId: string,
    rating: number,
    tag: EmployeeReviewRecord['tag'],
    note: string,
  ) => void;
  onFireEmployee: (empId: string) => void;
  onBuyExpansion: (targetLevel: number) => void;
  onSetTipJarMode: (mode: TipJarMode) => void;
  onReplyCustomerReview: (reviewId: string, action: 'thanked' | 'voucher') => void;
  onContinue: () => void;
}

export function ShopManagementModal({
  state,
  isDayEnd,
  onBuyRestock,
  onBuyUpgrade,
  onUnlockResearch,
  onHireEmployee,
  onToggleEmployeeDuty,
  onToggleEmployeeAutoRestock,
  onTrainEmployee,
  onTipEmployee,
  onReviewEmployee,
  onFireEmployee,
  onBuyExpansion,
  onSetTipJarMode,
  onReplyCustomerReview,
  onContinue,
}: ShopManagementModalProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>(isDayEnd ? 'report' : 'pantry');
  const [reviewingEmpId, setReviewingEmpId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTag, setReviewTag] = useState<EmployeeReviewRecord['tag']>('Praise');
  const [reviewNote, setReviewNote] = useState<string>('');

  useEffect(() => {
    setActiveTab(isDayEnd ? 'report' : 'pantry');
  }, [isDayEnd]);

  const summary = state.lastDaySummary;
  const inv = state.inventory;
  const currentExp = getExpansionDef(state.expansionLevel);
  const dailyPayroll = state.employees
    .filter((e) => e.onDuty)
    .reduce((sum, e) => sum + e.dailyWage, 0);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#162625]/55"
      role="dialog"
      aria-modal="true"
      aria-label={isDayEnd ? 'End of Day Summary' : 'Shop Management'}
    >
      <div className="ink-panel rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-[#1b2e2d]/15">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-[#182a29]">
              {isDayEnd ? `Day ${summary?.day ?? state.day} Closing Ledger` : 'Shop Management'}
            </h2>
            <p className="text-xs font-medium text-[#4b6866] mt-0.5">
              Cash: <span className="font-mono-num font-bold text-[#182a29]">${state.cash.toFixed(2)}</span>
              <span aria-hidden="true"> · </span>
              Rating: <span className="font-mono-num font-bold text-[#182a29]">{state.reputation.toFixed(2)}★</span>
              <span aria-hidden="true"> · </span>
              Tier: <span className="font-bold text-[#182a29]">{currentExp.name}</span>
              <span aria-hidden="true"> · </span>
              Staff: <span className="font-mono-num font-bold text-[#182a29]">{state.employees.length}/{state.maxStaffSlots}</span>
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
              <div className="text-[11px] font-semibold text-[#54706e]">Overhead &amp; Stock</div>
              <div className="font-mono-num text-xl font-bold text-[#b8462c] mt-0.5">
                -$
                {(
                  summary.restockSpent +
                  summary.upgradeSpent +
                  summary.wagesCost +
                  summary.rentCost
                ).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#54706e]">
                Rent ${summary.rentCost} · Wages ${summary.wagesCost}
              </div>
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

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 border-b-2 border-[#1b2e2d]/15 pb-3">
          {(
            [
              {
                id: 'report',
                label: isDayEnd ? 'Daily Report & Reviews' : 'Reviews & Tips',
              } as const,
              { id: 'pantry', label: 'Pantry & Restock' },
              {
                id: 'research',
                label: `Research Lab (${state.unlockedResearch.length}/${RESEARCH_PROJECTS.length})`,
              },
              { id: 'staff', label: `Staff Roster (${state.employees.length}/${state.maxStaffSlots})` },
              { id: 'expansion', label: 'Expansion & Gear' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`ink-btn rounded-lg px-3.5 py-2 text-xs font-bold cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#235958] text-[#f6efe0]'
                  : 'bg-[#fffaf0] text-[#182a29]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 0: REVIEWS & TIPS (Mid-Day Policy & End-of-Day Summary) */}
        {activeTab === 'report' && (
          <div className="mt-4 space-y-4" data-testid="daily-reviews-report">
            {/* Counter Tip Jar Options */}
            <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <div className="text-xs font-bold text-[#182a29]">
                    Counter Tip Jar &amp; Guest Pacing Option
                  </div>
                  <div className="text-[11px] text-[#4b6866]">
                    {TIP_JAR_PRESETS[state.tipJarMode].hint}
                  </div>
                </div>
                <div className="font-mono-num text-xs font-bold text-[#217a62]">
                  Shift Tips: ${(isDayEnd && summary ? summary.tipsEarned : state.dayStats.tipsEarned).toFixed(2)}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['modest', 'classic', 'generous'] as const).map((mode) => {
                  const preset = TIP_JAR_PRESETS[mode];
                  const active = state.tipJarMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSetTipJarMode(mode)}
                      className={`ink-btn rounded-lg px-3 py-2 text-left cursor-pointer ${
                        active
                          ? 'bg-[#235958] text-[#f6efe0]'
                          : 'bg-[#f6efe0] text-[#182a29]'
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          active ? 'text-[#d9ebe7]' : 'text-[#4b6866]'
                        }`}
                      >
                        {mode === 'modest'
                          ? '+8% Patience · 0.85× Tips'
                          : mode === 'classic'
                            ? 'Standard Patience & Tips'
                            : '1.25× Tips · -6% Patience'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {isDayEnd && summary ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] px-4 py-2.5 text-xs">
                  <div>
                    <span className="font-bold text-[#182a29]">Customer Feedback Summary:</span>{' '}
                    <span className="text-[#4b6866]">
                      {summary.drinksServed > 0
                        ? `${summary.perfectDrinks}/${summary.drinksServed} crafted to order · ${summary.walkouts} walkout${summary.walkouts === 1 ? '' : 's'}`
                        : 'Quiet storefront closing'}
                    </span>
                  </div>
                  <div className="font-mono-num font-bold text-[#217a62]">
                    {summary.reviews.length} Guest Review{summary.reviews.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.reviews.map((rev) => {
                    const isHappy = rev.stars >= 4;
                    const isMixed = rev.stars === 3;
                    const starFill = '★'.repeat(rev.stars) + '☆'.repeat(5 - rev.stars);
                    const replied = rev.responseStatus && rev.responseStatus !== 'none';
                    return (
                      <article
                        key={rev.id}
                        className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[#182a29] truncate">
                              {rev.customerName}
                              <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#54706e]">
                                {rev.archetype}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-[#b8462c] truncate">
                              {rev.drinkName}
                              {rev.staffName ? ` · Crafted by ${rev.staffName}` : ''}
                            </div>
                          </div>
                          <div
                            className={`font-mono-num text-sm font-bold shrink-0 ${
                              isHappy
                                ? 'text-[#217a62]'
                                : isMixed
                                  ? 'text-[#b87635]'
                                  : 'text-[#c94c4c]'
                            }`}
                            aria-label={`${rev.stars} out of 5 stars`}
                          >
                            {starFill}
                          </div>
                        </div>

                        <p className="text-xs text-[#263c3b] leading-relaxed">
                          &ldquo;{rev.quote}&rdquo;
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#1b2e2d]/10 text-[11px] font-bold">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-2 py-0.5 border ${
                                rev.drinkMood.includes('Perfect') || rev.drinkMood.includes('Spot-on')
                                  ? 'bg-[#e6f5ef] text-[#217a62] border-[#217a62]/40'
                                  : rev.drinkMood.includes('Close') || rev.drinkMood.includes('Window')
                                    ? 'bg-[#fff3d6] text-[#9b621c] border-[#d99b26]/40'
                                    : 'bg-[#fde9e7] text-[#b8462c] border-[#c94c4c]/40'
                              }`}
                            >
                              Drink: {rev.drinkMood}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 border ${
                                rev.waitMood === 'Fast service'
                                  ? 'bg-[#e6f5ef] text-[#217a62] border-[#217a62]/40'
                                  : rev.waitMood === 'Fair wait' || rev.waitMood === 'Quiet shift'
                                    ? 'bg-[#fff3d6] text-[#9b621c] border-[#d99b26]/40'
                                    : 'bg-[#fde9e7] text-[#b8462c] border-[#c94c4c]/40'
                              }`}
                            >
                              Wait: {rev.waitMood}
                            </span>
                          </div>
                          {replied ? (
                            <span className="text-[10px] font-bold text-[#217a62] px-1.5">
                              {rev.responseStatus === 'voucher' ? 'Voucher Sent' : 'Thanked'}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onReplyCustomerReview(rev.id, 'thanked')}
                                className="rounded border border-[#1b2e2d]/40 bg-[#f6efe0] hover:bg-[#e6f5ef] px-2 py-0.5 text-[10px] font-bold text-[#182a29] cursor-pointer"
                              >
                                Thank (+0.02★)
                              </button>
                              <button
                                type="button"
                                disabled={state.cash < 3}
                                onClick={() => onReplyCustomerReview(rev.id, 'voucher')}
                                className="rounded border border-[#1b2e2d]/40 bg-[#fff3d6] hover:bg-[#ffe8b3] disabled:opacity-45 px-2 py-0.5 text-[10px] font-bold text-[#9b621c] cursor-pointer"
                              >
                                Comp $3 (+0.06★)
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] px-4 py-2.5 text-xs">
                  <span className="font-bold text-[#182a29]">
                    Live Shift Visits ({state.dayStats.visitLog.length})
                  </span>
                  <span className="text-[#4b6866]">
                    {state.dayStats.perfectDrinks}/{state.dayStats.drinksServed} perfect ·{' '}
                    {state.dayStats.walkouts} walkout{state.dayStats.walkouts === 1 ? '' : 's'}
                  </span>
                </div>
                {state.dayStats.visitLog.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-[#1b2e2d]/25 bg-[#fffaf0] p-4 text-xs text-[#4b6866]">
                    No guest tickets completed yet this shift. Reviews will collect here and publish in full at 9:00 PM close.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {state.dayStats.visitLog
                      .slice(-6)
                      .reverse()
                      .map((v, i) => (
                        <div
                          key={`${v.customerName}_${i}`}
                          className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-[#182a29] truncate">
                              {v.customerName} · {v.drinkName}
                            </div>
                            <div className="text-[11px] text-[#4b6866] truncate">
                              {v.walkedOut
                                ? 'Walked out before pickup'
                                : `${Math.round(v.accuracy * 100)}% accuracy · ${v.waitRatio <= 0.35 ? 'Fast' : v.waitRatio <= 0.68 ? 'Fair' : 'Slow'} wait${v.staffName ? ` · by ${v.staffName}` : ''}`}
                            </div>
                          </div>
                          <span
                            className={`font-mono-num text-xs font-bold shrink-0 ${
                              v.walkedOut
                                ? 'text-[#c94c4c]'
                                : v.accuracy >= 0.95
                                  ? 'text-[#217a62]'
                                  : 'text-[#b87635]'
                            }`}
                          >
                            {v.walkedOut ? '1★' : v.accuracy >= 0.95 && v.waitRatio <= 0.45 ? '5★' : '4★'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <EmployeePerformanceLog state={state} dayNumber={isDayEnd && summary ? summary.day : state.day} />
          </div>
        )}

        {/* TAB 1: PANTRY & RESTOCK */}
        {activeTab === 'pantry' && (
          <div className="mt-4">
            <div className="mb-4 rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] p-3">
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
              {state.unlockedResearch.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#1b2e2d]/15 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-num text-[#235958]">
                  {state.unlockedResearch.includes('res_fruit_tea') && (
                    <>
                      <div>Passionfruit: <strong>{inv.passionfruitSyrup}</strong></div>
                      <div>Popping Boba: <strong>{inv.poppingBoba}</strong></div>
                    </>
                  )}
                  {state.unlockedResearch.includes('res_berry_cream') && (
                    <>
                      <div>Strawberry: <strong>{inv.strawberryPuree}</strong></div>
                      <div>Aloe Vera: <strong>{inv.aloeVera}</strong></div>
                    </>
                  )}
                  {state.unlockedResearch.includes('res_thai_spice') && (
                    <>
                      <div>Thai Tea: <strong>{inv.thaiTeaLeaf}</strong></div>
                      <div>Coconut Cr.: <strong>{inv.coconutCream}</strong></div>
                    </>
                  )}
                  {state.unlockedResearch.includes('res_sesame_craft') && (
                    <>
                      <div>Blk Sesame: <strong>{inv.blackSesame}</strong></div>
                      <div>Salt Caramel: <strong>{inv.saltedCaramel}</strong></div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RESTOCK_PACKS.filter((pack) => {
                if (!pack.unlockResearchId) return true;
                if (pack.id === 'pack_exotic_fruit') {
                  return (
                    state.unlockedResearch.includes('res_fruit_tea') ||
                    state.unlockedResearch.includes('res_berry_cream')
                  );
                }
                if (pack.id === 'pack_artisan_blend') {
                  return (
                    state.unlockedResearch.includes('res_thai_spice') ||
                    state.unlockedResearch.includes('res_sesame_craft')
                  );
                }
                return state.unlockedResearch.includes(pack.unlockResearchId);
              }).map((pack) => {
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
        )}

        {/* TAB 2: RESEARCH LAB */}
        {activeTab === 'research' && (
          <div className="mt-4 space-y-5" data-testid="research-lab-panel">
            <div className="rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-[#182a29]">Tea R&amp;D Studio:</span>{' '}
                <span className="text-[#4b6866]">
                  Spend profits to unlock specialty ingredients, high-margin recipes &amp; wholesale restocking.
                </span>
              </div>
              <div className="font-mono-num font-bold text-[#217a62]">
                Menu Size: {getAvailableMenu(state.day, state.unlockedResearch).length}/{DRINK_MENU.length} Drinks
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RESEARCH_PROJECTS.map((node) => {
                const unlocked = state.unlockedResearch.includes(node.id);
                const canAfford = state.cash >= node.cost && state.day >= node.minDay;
                return (
                  <div
                    key={node.id}
                    className={`rounded-lg border-2 border-[#1b2e2d] p-3.5 flex flex-col justify-between gap-2.5 ${
                      unlocked ? 'bg-[#edf7f3]' : 'bg-[#fffaf0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-[#182a29]">{node.name}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              node.category === 'ingredient'
                                ? 'bg-[#e06d53] text-white'
                                : 'bg-[#235958] text-[#f6efe0]'
                            }`}
                          >
                            {node.category === 'ingredient' ? 'Specialty Menu' : 'Supply Sync'}
                          </span>
                        </div>
                        <p className="text-xs text-[#4b6866] mt-1">{node.summary}</p>
                        <div className="text-[11px] font-semibold text-[#217a62] mt-1">
                          Unlocks: {node.unlocksLabel}
                        </div>
                      </div>
                      {unlocked ? (
                        <span className="rounded border border-[#217a62] bg-[#d8f1e6] px-2.5 py-1 font-mono-num text-[11px] font-bold text-[#217a62] shrink-0">
                          Unlocked
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onUnlockResearch(node.id)}
                          className="ink-btn rounded-lg bg-[#e06d53] text-white font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Research ${node.cost}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <h3 className="font-display text-base font-bold text-[#182a29] mb-2">
                Active &amp; Specialty Drink Menu
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DRINK_MENU.map((recipe) => {
                  const available =
                    recipe.unlockDay <= state.day &&
                    (!recipe.unlockResearchId ||
                      state.unlockedResearch.includes(recipe.unlockResearchId));
                  return (
                    <div
                      key={recipe.id}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        available
                          ? 'border-[#1b2e2d] bg-[#fffaf0]'
                          : 'border-dashed border-[#1b2e2d]/30 bg-[#f1e9d8]/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#182a29] truncate">{recipe.name}</span>
                        <span className="font-mono-num font-bold text-[#217a62] shrink-0">
                          ${recipe.basePrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#4b6866] mt-0.5 truncate">
                        {recipe.description}
                      </div>
                      {!available && (
                        <div className="text-[10px] font-bold text-[#b8462c] mt-1">
                          {recipe.unlockResearchId
                            ? `Requires ${RESEARCH_PROJECTS.find((r) => r.id === recipe.unlockResearchId)?.name ?? 'Research'}`
                            : `Unlocks Day ${recipe.unlockDay}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STAFF ROSTER */}
        {activeTab === 'staff' && (
          <div className="mt-4 space-y-5">
            <div className="rounded-lg border border-[#1b2e2d]/20 bg-[#efe7d5] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-[#182a29]">Active Payroll:</span>{' '}
                <span className="font-mono-num font-bold text-[#b8462c]">${dailyPayroll}/day</span>
                <span className="text-[#4b6866] ml-2">
                  (Train up to Lv.{MAX_STAFF_LEVEL}, tip morale bonuses, or log performance reviews)
                </span>
              </div>
              <div className="font-mono-num font-bold text-[#217a62]">
                Slots: {state.employees.length} / {state.maxStaffSlots}
              </div>
            </div>

            {/* Hired Team */}
            <div>
              <h3 className="font-display text-base font-bold text-[#182a29] mb-2">
                Your Team
              </h3>
              {state.employees.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-[#1b2e2d]/25 bg-[#fffaf0] p-4 text-xs text-[#4b6866]">
                  No staff on roster. Recruit a Barista, Prep Cook, or Host below to help run the counter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                  {state.employees.map((emp) => {
                    const roleMeta = STAFF_ROLE_META[emp.role];
                    const tier = getTrainingTier(emp.skillLevel);
                    const nextTier = emp.skillLevel < MAX_STAFF_LEVEL ? getTrainingTier(emp.skillLevel + 1) : null;
                    const trainCost = getTrainingCost(emp.skillLevel);
                    const canTrain = emp.skillLevel < MAX_STAFF_LEVEL && state.cash >= trainCost;
                    const isReviewOpen = reviewingEmpId === emp.id;
                    const mentions = state.dayStats.visitLog.filter((v) => v.staffName === emp.name);

                    return (
                      <div
                        key={emp.id}
                        className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Mini Visual Avatar reflecting 3D skin/hair/shirt/accessory */}
                            <div
                              className="w-9 h-9 rounded-lg border-2 border-[#1b2e2d] shrink-0 flex flex-col overflow-hidden"
                              aria-hidden="true"
                            >
                              <div
                                className="h-2.5 w-full"
                                style={{ backgroundColor: emp.appearance.hairColor }}
                              />
                              <div
                                className="h-2.5 w-full"
                                style={{ backgroundColor: emp.appearance.skinTone }}
                              />
                              <div
                                className="h-4 w-full"
                                style={{ backgroundColor: emp.shirtColor }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-sm font-bold text-[#182a29]">{emp.name}</span>
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                                  style={{ backgroundColor: roleMeta.badgeColor }}
                                >
                                  {roleMeta.label}
                                </span>
                                <span className="text-[10px] font-semibold text-[#54706e] capitalize">
                                  {emp.appearance.hairStyle}
                                  {emp.appearance.accessory !== 'none'
                                    ? ` · ${emp.appearance.accessory.replace('_', ' ')}`
                                    : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-bold text-[#235958]">
                                  Lv.{emp.skillLevel}/{MAX_STAFF_LEVEL} · {tier.title}
                                </span>
                                <div className="flex items-center gap-0.5" aria-hidden="true">
                                  {[1, 2, 3, 4, 5].map((lvl) => (
                                    <span
                                      key={lvl}
                                      className={`w-2 h-2 rounded-xs border border-[#1b2e2d] ${
                                        lvl <= emp.skillLevel ? 'bg-[#e06d53]' : 'bg-[#e8dec9]'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="text-[11px] text-[#4b6866] mt-0.5 font-mono-num">
                                Speed {emp.speed.toFixed(2)}× · Morale {emp.morale}% · Wage ${emp.dailyWage}/d
                              </div>
                              <div className="text-[10px] text-[#54706e] mt-0.5 font-mono-num">
                                {emp.role === 'barista'
                                  ? `${emp.drinksCrafted} crafted · ${Math.round(
                                      (emp.drinksCrafted > 0
                                        ? emp.accurateCrafts / emp.drinksCrafted
                                        : getEmployeeAccuracyChance(emp, state.orders.length)) * 100,
                                    )}% acc`
                                  : emp.role === 'prep_chef'
                                    ? `${emp.prepCount} prep & refills`
                                    : `${emp.prepCount} guests hosted`}
                                {' · '}Tips: ${emp.tipsReceived.toFixed(0)}
                                {emp.lastReview ? ` · Review: ${emp.lastReview.rating}★` : ''}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                              emp.onDuty
                                ? 'bg-[#e6f5ef] text-[#217a62] border-[#217a62]'
                                : 'bg-[#f1e8d6] text-[#6d6255] border-[#1b2e2d]/30'
                            }`}
                          >
                            {emp.onDuty ? 'On Duty' : 'Off Shift'}
                          </span>
                        </div>

                        {/* Training, Tipping, Review & Shift Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1b2e2d]/10">
                          {emp.skillLevel < MAX_STAFF_LEVEL ? (
                            <button
                              type="button"
                              disabled={!canTrain}
                              title={nextTier ? `Promote to ${nextTier.title}: ${nextTier.perk}` : undefined}
                              onClick={() => onTrainEmployee(emp.id)}
                              className="ink-btn rounded bg-[#235958] text-[#f6efe0] font-mono-num text-[11px] font-bold px-2.5 py-1 cursor-pointer"
                            >
                              Train Lv.{emp.skillLevel + 1} ${trainCost}
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-[#217a62] px-1">
                              Max Lv.5 Mastery
                            </span>
                          )}

                          <button
                            type="button"
                            disabled={state.cash < 5}
                            onClick={() => onTipEmployee(emp.id, 5)}
                            className="ink-btn rounded bg-[#fff3d6] text-[#8a5210] font-mono-num text-[11px] font-bold px-2 py-1 cursor-pointer"
                          >
                            Tip $5
                          </button>
                          <button
                            type="button"
                            disabled={state.cash < 15}
                            onClick={() => onTipEmployee(emp.id, 15)}
                            className="ink-btn rounded bg-[#ffe3a3] text-[#7a4508] font-mono-num text-[11px] font-bold px-2 py-1 cursor-pointer"
                          >
                            Tip $15
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isReviewOpen) {
                                setReviewingEmpId(null);
                              } else {
                                setReviewingEmpId(emp.id);
                                setReviewRating(emp.lastReview?.rating ?? 5);
                                setReviewTag(emp.lastReview?.tag ?? 'Praise');
                                setReviewNote(emp.lastReview?.note ?? '');
                              }
                            }}
                            className={`ink-btn rounded text-[11px] font-bold px-2.5 py-1 cursor-pointer ${
                              isReviewOpen
                                ? 'bg-[#e06d53] text-white'
                                : 'bg-[#f6efe0] text-[#182a29]'
                            }`}
                          >
                            {isReviewOpen ? 'Close Review' : 'Review'}
                          </button>
                          {(emp.role === 'barista' || emp.role === 'prep_chef') && (
                            <button
                              type="button"
                              onClick={() => onToggleEmployeeAutoRestock(emp.id)}
                              className={`ink-btn rounded text-[11px] font-bold px-2 py-1 cursor-pointer ${
                                emp.autoRestock
                                  ? 'bg-[#e6f5ef] text-[#217a62]'
                                  : 'bg-[#f6efe0] text-[#54706e]'
                              }`}
                            >
                              Auto-Refill: {emp.autoRestock ? 'ON' : 'OFF'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleEmployeeDuty(emp.id)}
                            className="ink-btn rounded bg-[#f6efe0] text-[#182a29] text-[11px] font-bold px-2 py-1 cursor-pointer"
                          >
                            {emp.onDuty ? 'Rest' : 'On Duty'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onFireEmployee(emp.id)}
                            className="ml-auto text-[11px] font-bold text-[#b8462c] hover:underline cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>

                        {/* Inline Staff Performance Review Drawer */}
                        {isReviewOpen && (
                          <div className="rounded-lg border border-[#1b2e2d]/30 bg-[#f6efe0] p-2.5 space-y-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold text-[#182a29]">
                                {emp.name} Shift Review
                              </span>
                              <span className="text-[11px] text-[#4b6866]">
                                {mentions.length} guest orders credited today · Perk: {tier.perk}
                              </span>
                            </div>

                            {emp.lastReview && (
                              <div className="rounded bg-[#fffaf0] border border-[#1b2e2d]/15 px-2.5 py-1.5 text-[11px] text-[#35514f]">
                                Last Review (Day {emp.lastReview.day}):{' '}
                                <strong>{emp.lastReview.rating}★ {emp.lastReview.tag}</strong> — &ldquo;
                                {emp.lastReview.note}&rdquo;
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-[#4b6866]">Score:</span>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  aria-label={`Rate ${emp.name} ${star} stars`}
                                  onClick={() => setReviewRating(star)}
                                  className={`px-1.5 py-0.5 rounded border text-[11px] font-bold cursor-pointer ${
                                    reviewRating >= star
                                      ? 'bg-[#e06d53] text-white border-[#1b2e2d]'
                                      : 'bg-[#fffaf0] text-[#54706e] border-[#1b2e2d]/30'
                                  }`}
                                >
                                  {star}★
                                </button>
                              ))}
                              {(['Praise', 'Speed Focus', 'Guest Care'] as const).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setReviewTag(tag)}
                                  className={`px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                                    reviewTag === tag
                                      ? 'bg-[#235958] text-[#f6efe0] border-[#1b2e2d]'
                                      : 'bg-[#fffaf0] text-[#182a29] border-[#1b2e2d]/30'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <label className="sr-only" htmlFor={`rev_note_${emp.id}`}>
                                Review Note for {emp.name}
                              </label>
                              <input
                                id={`rev_note_${emp.id}`}
                                type="text"
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                placeholder="Add feedback note (e.g. Great pearl prep!)"
                                maxLength={90}
                                className="flex-1 min-w-0 rounded border border-[#1b2e2d]/35 bg-[#fffaf0] px-2.5 py-1 text-[11px] text-[#182a29]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  onReviewEmployee(emp.id, reviewRating, reviewTag, reviewNote);
                                  setReviewingEmpId(null);
                                }}
                                className="ink-btn rounded bg-[#217a62] text-white text-[11px] font-bold px-2.5 py-1 whitespace-nowrap cursor-pointer"
                              >
                                Save Review
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Employee Performance Log Sub-component */}
            <EmployeePerformanceLog state={state} />

            {/* Available Candidates */}
            <div>
              <h3 className="font-display text-base font-bold text-[#182a29] mb-2">
                Hire Applicants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STAFF_ROSTER.map((cand) => {
                  const alreadyHired = state.employees.some((e) => e.candidateId === cand.id);
                  const slotsFull = state.employees.length >= state.maxStaffSlots;
                  const canHire = !alreadyHired && !slotsFull && state.cash >= cand.hireCost;
                  const roleMeta = STAFF_ROLE_META[cand.role];

                  return (
                    <div
                      key={cand.id}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-[#1b2e2d] shrink-0 flex flex-col overflow-hidden"
                          aria-hidden="true"
                        >
                          <div
                            className="h-2 w-full"
                            style={{ backgroundColor: cand.appearance.hairColor }}
                          />
                          <div
                            className="h-2.5 w-full"
                            style={{ backgroundColor: cand.appearance.skinTone }}
                          />
                          <div
                            className="h-3.5 w-full"
                            style={{ backgroundColor: cand.shirtColor }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-bold text-[#182a29]">{cand.name}</span>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: roleMeta.badgeColor }}
                            >
                              {roleMeta.label}
                            </span>
                            <span className="text-[10px] font-semibold text-[#54706e] capitalize">
                              {cand.appearance.hairStyle}
                            </span>
                          </div>
                          <div className="text-xs text-[#4b6866] mt-0.5">{cand.bio}</div>
                          <div className="text-[11px] font-mono-num text-[#54706e] mt-0.5">
                            Wage: ${cand.dailyWage}/day · Base {cand.baseSpeed.toFixed(2)}×
                          </div>
                        </div>
                      </div>
                      {alreadyHired ? (
                        <span className="font-mono-num text-xs font-bold text-[#217a62] px-2 shrink-0">
                          Hired
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canHire}
                          onClick={() => onHireEmployee(cand.id)}
                          className="ink-btn rounded-lg bg-[#e06d53] text-white font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {slotsFull ? 'Full' : `Hire $${cand.hireCost}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EXPANSION & GEAR */}
        {activeTab === 'expansion' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            {/* Shop Floor Expansions */}
            <div>
              <h3 className="font-display text-base font-bold text-[#182a29] mb-2.5">
                Shop Floor Expansion
              </h3>
              <div className="space-y-2.5">
                {SHOP_EXPANSIONS.map((exp) => {
                  const unlocked = state.expansionLevel >= exp.level;
                  const isNext = state.expansionLevel + 1 === exp.level;
                  const canAfford = state.cash >= exp.cost;
                  return (
                    <div
                      key={exp.level}
                      className="flex items-center justify-between gap-3 rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#182a29]">
                          Tier {exp.level}: {exp.name}
                        </div>
                        <div className="text-xs text-[#4b6866] mt-0.5">{exp.description}</div>
                        <div className="text-[11px] font-mono-num text-[#217a62] mt-0.5">
                          Max Queue: {exp.maxQueue} · Max Staff: {exp.maxStaffSlots}
                        </div>
                      </div>
                      {unlocked ? (
                        <span className="font-mono-num text-xs font-bold text-[#217a62] px-2.5 shrink-0">
                          Built
                        </span>
                      ) : isNext ? (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onBuyExpansion(exp.level)}
                          className="ink-btn rounded-lg bg-[#e06d53] text-white font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Build ${exp.cost}
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#54706e] shrink-0">
                          Requires Tier {exp.level - 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kitchen Equipment Upgrades */}
            <div>
              <h3 className="font-display text-base font-bold text-[#182a29] mb-2.5">
                Kitchen Equipment
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
                          className="ink-btn rounded-lg bg-[#235958] text-[#f6efe0] font-mono-num text-xs font-bold px-3.5 py-2 whitespace-nowrap shrink-0 cursor-pointer"
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
        )}
      </div>
    </div>
  );
}
