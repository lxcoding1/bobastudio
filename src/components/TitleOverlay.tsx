import type { RenderStyle } from '../game/types';

interface TitleOverlayProps {
  renderStyle: RenderStyle;
  onChangeRenderStyle: (style: RenderStyle) => void;
  onStart: () => void;
}

export function TitleOverlay({
  renderStyle,
  onChangeRenderStyle,
  onStart,
}: TitleOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      {/* Top-Left Brand Lockup over calm negative space */}
      <div className="pointer-events-auto max-w-sm ink-panel rounded-xl p-5">
        <div className="flex items-center gap-4 mb-4">
          {/* Custom inline SVG Boba Crest Emblem */}
          <svg
            viewBox="0 0 56 56"
            className="w-14 h-14 shrink-0"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="2"
              width="52"
              height="52"
              rx="10"
              fill="#235958"
              stroke="#1b2e2d"
              strokeWidth="3"
            />
            {/* Wide Boba Straw */}
            <path
              d="M31 8 L36 8 L29 41 L24 41 Z"
              fill="#e06d53"
              stroke="#1b2e2d"
              strokeWidth="2"
            />
            {/* Cup Body */}
            <path
              d="M17 18 L39 18 L35 45 L21 45 Z"
              fill="#f6efe0"
              stroke="#1b2e2d"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Milk Tea Fill */}
            <path
              d="M18.6 25 L37.4 25 L34.6 44 L21.4 44 Z"
              fill="#c9884f"
            />
            {/* Seal Lid */}
            <rect
              x="14"
              y="15"
              width="28"
              height="4.5"
              rx="2"
              fill="#e6a68d"
              stroke="#1b2e2d"
              strokeWidth="2"
            />
            {/* Tapioca Pearls */}
            <circle cx="24" cy="40" r="2.3" fill="#231917" />
            <circle cx="29" cy="40.5" r="2.3" fill="#231917" />
            <circle cx="32.5" cy="39" r="2.1" fill="#231917" />
            <circle cx="26.5" cy="36.5" r="2.1" fill="#231917" />
          </svg>

          <div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-[#182a29] leading-none">
              Boba Studio
            </h1>
            <p className="text-sm font-medium text-[#466361] mt-1.5">
              Artisan Tea &amp; Tapioca Shop Simulator
            </p>
          </div>
        </div>

        {/* Render Mode Switch matching Reference A (3D Toon) & B (Pixel-Art) */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-[#466361] mb-1.5">
            Diorama Render Style
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeRenderStyle('toon')}
              className={`ink-btn rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                renderStyle === 'toon'
                  ? 'bg-[#235958] text-[#f6efe0]'
                  : 'bg-[#f1e9d8] text-[#182a29]'
              }`}
            >
              3D Toon
            </button>
            <button
              type="button"
              onClick={() => onChangeRenderStyle('pixel')}
              className={`ink-btn rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap cursor-pointer ${
                renderStyle === 'pixel'
                  ? 'bg-[#235958] text-[#f6efe0]'
                  : 'bg-[#f1e9d8] text-[#182a29]'
              }`}
            >
              3D Pixel-Art
            </button>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="ink-btn w-full rounded-lg bg-[#e06d53] text-white font-display text-lg font-bold py-3 px-5 cursor-pointer"
        >
          Open Shop
        </button>
      </div>

      {/* Bottom Flat Single-Line Control Hint */}
      <div className="text-center text-xs font-semibold text-[#2d4846] tracking-wide">
        Click Guests or Stations · 1–5 Quick Tea · Space Serve Drink · H Toggle Bench · P Pause
      </div>
    </div>
  );
}
