import type { SimState } from '../game/types';

interface StatusModalProps {
  state: SimState;
  onResume: () => void;
  onContinueEndless: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export function StatusModal({
  state,
  onResume,
  onContinueEndless,
  onRestart,
  onReturnTitle,
}: StatusModalProps) {
  const isPaused = state.phase === 'paused';
  const isVictory = state.phase === 'gameover' && state.outcome === 'victory';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#162625]/60"
      role="dialog"
      aria-modal="true"
      aria-label={isPaused ? 'Shop Paused' : isVictory ? 'Five-Star Tea Master' : 'Shop Closed'}
    >
      <div className="ink-panel rounded-xl w-full max-w-md p-6 text-center">
        <h2 className="font-display text-2xl font-extrabold text-[#182a29]">
          {isPaused
            ? 'Shift Paused'
            : isVictory
              ? 'Five-Star Boba Studio!'
              : state.outcome === 'bankrupt'
                ? 'Shop Out of Funds'
                : 'Reputation Lost'}
        </h2>
        <p className="text-sm text-[#4b6866] mt-1.5">
          {isPaused
            ? 'Catch your breath before the next wave of guests.'
            : isVictory
              ? 'Your handcrafted boba shop became the neighborhood favorite.'
              : state.outcome === 'bankrupt'
                ? 'Expenses outpaced tea sales. Restock smartly on your next run.'
                : 'Too many guests left unhappy. Keep pearls warm and tickets moving!'}
        </p>

        <div className="grid grid-cols-3 gap-2.5 my-5">
          <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-2.5">
            <div className="text-[11px] font-semibold text-[#54706e]">Cash</div>
            <div className="font-mono-num text-base font-bold text-[#182a29]">
              ${state.cash.toFixed(0)}
            </div>
          </div>
          <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-2.5">
            <div className="text-[11px] font-semibold text-[#54706e]">Served</div>
            <div className="font-mono-num text-base font-bold text-[#182a29]">
              {state.totalServed}
            </div>
          </div>
          <div className="rounded-lg border-2 border-[#1b2e2d] bg-[#fffaf0] p-2.5">
            <div className="text-[11px] font-semibold text-[#54706e]">Rating</div>
            <div className="font-mono-num text-base font-bold text-[#182a29]">
              {state.reputation.toFixed(1)} ★
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="ink-btn w-full rounded-lg bg-[#e06d53] text-white font-display font-bold py-2.5 cursor-pointer"
            >
              Resume Shift
            </button>
          )}
          {isVictory && (
            <button
              type="button"
              onClick={onContinueEndless}
              className="ink-btn w-full rounded-lg bg-[#235958] text-[#f6efe0] font-display font-bold py-2.5 cursor-pointer"
            >
              Continue Endless Mode
            </button>
          )}
          <button
            type="button"
            data-start={isPaused ? undefined : 'true'}
            onClick={onRestart}
            className="ink-btn w-full rounded-lg bg-[#f6efe0] text-[#182a29] font-display font-bold py-2.5 cursor-pointer"
          >
            {isPaused ? 'Restart Shop' : 'Play Again'}
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="text-xs font-semibold text-[#4b6866] hover:text-[#182a29] py-1.5 cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
}
