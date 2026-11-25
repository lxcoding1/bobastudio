import { MAX_STAFF_LEVEL, STAFF_ROLE_META } from '../game/catalog';
import { getEmployeeDailyPerformance } from '../game/simulation';
import type { SimState } from '../game/types';

interface EmployeePerformanceLogProps {
  state: SimState;
  dayNumber?: number;
}

export function EmployeePerformanceLog({ state, dayNumber }: EmployeePerformanceLogProps) {
  const activeDay = dayNumber ?? state.day;
  const activeQueueLen = state.orders.length;

  const totalTeamDrinks = state.employees.reduce((sum, emp) => sum + emp.dailyDrinksServed, 0);
  const totalTeamErrors = state.employees.reduce((sum, emp) => sum + emp.dailyErrors, 0);
  const teamErrorRate =
    totalTeamDrinks > 0 ? ((totalTeamErrors / totalTeamDrinks) * 100).toFixed(1) : '0.0';

  return (
    <section
      className="rounded-lg border-2 border-[#1b2e2d] bg-[#efe7d5] p-3.5 space-y-3"
      aria-labelledby="employee-performance-log-heading"
      data-testid="employee-performance-log"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            id="employee-performance-log-heading"
            className="font-display text-base font-bold text-[#182a29]"
          >
            Employee Performance Log · Day {activeDay}
          </h3>
          <p className="text-[11px] text-[#4b6866]">
            Live breakdown of today&apos;s pace, error rate, and served count — showing how training,
            morale, and rush lines shape output.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-num">
          <span className="rounded border border-[#1b2e2d]/30 bg-[#fffaf0] px-2.5 py-1 font-bold text-[#182a29]">
            Staff Drinks: {totalTeamDrinks}
          </span>
          <span
            className={`rounded border px-2.5 py-1 font-bold ${
              totalTeamErrors === 0
                ? 'border-[#217a62]/40 bg-[#e6f5ef] text-[#217a62]'
                : 'border-[#c94c4c]/40 bg-[#fde9e7] text-[#b8462c]'
            }`}
          >
            Errors Today: {totalTeamErrors} ({teamErrorRate}%)
          </span>
        </div>
      </div>

      {state.employees.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[#1b2e2d]/25 bg-[#fffaf0] p-3.5 text-xs text-[#4b6866]">
          No employees hired yet. Recruit staff in the Roster to track daily speed, error rate, and
          drinks served.
        </div>
      ) : (
        <div className="space-y-2.5">
          {state.employees.map((emp) => {
            const perf = getEmployeeDailyPerformance(emp, activeQueueLen);
            const roleMeta = STAFF_ROLE_META[emp.role];
            const isBarista = emp.role === 'barista';
            const errorHighlight =
              perf.observedErrorRatePct === null
                ? perf.expectedErrorRatePct <= 10
                  ? 'text-[#217a62]'
                  : perf.expectedErrorRatePct <= 20
                    ? 'text-[#b87635]'
                    : 'text-[#b8462c]'
                : perf.observedErrorRatePct <= 8
                  ? 'text-[#217a62]'
                  : perf.observedErrorRatePct <= 20
                    ? 'text-[#b87635]'
                    : 'text-[#b8462c]';

            return (
              <article
                key={emp.id}
                data-testid={`perf-row-${emp.candidateId}`}
                className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-3 space-y-2.5"
              >
                {/* Header row: Employee identity + shift status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-[#182a29]">{emp.name}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: roleMeta.badgeColor }}
                    >
                      {roleMeta.label}
                    </span>
                    <span className="text-[11px] font-bold text-[#235958]">
                      Lv.{emp.skillLevel}/{MAX_STAFF_LEVEL} · {perf.tierTitle}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                      emp.onDuty
                        ? 'bg-[#e6f5ef] text-[#217a62] border-[#217a62]'
                        : 'bg-[#f1e8d6] text-[#6d6255] border-[#1b2e2d]/30'
                    }`}
                  >
                    {emp.onDuty ? 'On Duty' : 'Off Shift'}
                  </span>
                </div>

                {/* Core KPI Strip: Speed, Error Rate, Drinks Served Today */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded border border-[#1b2e2d]/20 bg-[#f6efe0] px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#54706e]">
                      Effective Speed
                    </div>
                    <div className="font-mono-num text-sm font-bold text-[#182a29] mt-0.5">
                      {perf.effectiveSpeed.toFixed(2)}×
                      {isBarista && (
                        <span className="ml-1.5 text-[11px] font-semibold text-[#4b6866]">
                          (~{perf.craftSeconds.toFixed(1)}s/cup)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono-num text-[#4b6866] mt-0.5">
                      Base {perf.baseSpeed.toFixed(2)}× · Morale ×{perf.moraleMultiplier.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded border border-[#1b2e2d]/20 bg-[#f6efe0] px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#54706e]">
                      Error Rate (Today)
                    </div>
                    {isBarista ? (
                      <>
                        <div className={`font-mono-num text-sm font-bold mt-0.5 ${errorHighlight}`}>
                          {perf.observedErrorRatePct !== null
                            ? `${perf.observedErrorRatePct.toFixed(1)}%`
                            : '0.0%'}
                          <span className="ml-1.5 text-[11px] font-semibold text-[#4b6866]">
                            ({perf.errorsToday}/{perf.drinksServedToday} slips)
                          </span>
                        </div>
                        <div className="text-[10px] font-mono-num text-[#4b6866] mt-0.5">
                          Est. risk: {perf.expectedErrorRatePct.toFixed(1)}% (base {perf.baseErrorPct}%)
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-mono-num text-sm font-bold text-[#217a62] mt-0.5">
                          N/A
                        </div>
                        <div className="text-[10px] font-mono-num text-[#4b6866] mt-0.5">
                          {emp.role === 'prep_chef'
                            ? 'Station prep & restock support'
                            : 'Front-of-house queue host'}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded border border-[#1b2e2d]/20 bg-[#f6efe0] px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#54706e]">
                      Drinks Served (Today)
                    </div>
                    <div className="font-mono-num text-sm font-bold text-[#217a62] mt-0.5">
                      {perf.drinksServedToday}
                      <span className="ml-1.5 text-[11px] font-semibold text-[#4b6866]">
                        {isBarista
                          ? `· ${Math.max(0, perf.drinksServedToday - perf.errorsToday)} exact`
                          : emp.role === 'prep_chef'
                            ? `· ${perf.prepActionsToday} batches/refills`
                            : `· ${perf.prepActionsToday} hosted`}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono-num text-[#4b6866] mt-0.5">
                      Career total: {emp.drinksCrafted} crafted
                    </div>
                  </div>
                </div>

                {/* Performance Drivers Explanation */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1b2e2d]/10 text-[11px]">
                  <span className="text-[#35514f]">
                    <strong className="text-[#182a29]">Why:</strong> {perf.reasonSummary}
                  </span>
                  <div className="flex flex-wrap items-center gap-1 font-mono-num text-[10px] font-bold">
                    <span
                      className={`rounded px-1.5 py-0.5 border ${
                        perf.moraleSpeedPct >= 0
                          ? 'bg-[#e6f5ef] text-[#217a62] border-[#217a62]/30'
                          : 'bg-[#fde9e7] text-[#b8462c] border-[#c94c4c]/30'
                      }`}
                    >
                      Morale {emp.morale}% ({perf.moraleSpeedPct >= 0 ? '+' : ''}
                      {perf.moraleSpeedPct}% spd)
                    </span>
                    {isBarista && perf.rushErrorPenaltyPct > 0 && (
                      <span className="rounded px-1.5 py-0.5 border bg-[#fff3d6] text-[#9b621c] border-[#d99b26]/40">
                        Rush +{perf.rushErrorPenaltyPct}% err
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
