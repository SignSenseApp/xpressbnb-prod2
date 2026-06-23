import StayScoreCardChip from './StayScoreCardChip';
import { stayScoreVisual } from './stayScoreVisual';

/**
 * Hand-built modal hero — editorial / Dribbble-style UI composition (no AI imagery).
 */
export default function StayScoreModalHero() {
  return (
    <div
      className="relative w-full aspect-[4/3] sm:aspect-[16/11] overflow-hidden rounded-t-[28px]"
      style={{ background: stayScoreVisual.heroBg }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, #94A3B8 0.6px, transparent 0.6px)',
          backgroundSize: '14px 14px',
        }}
      />

      <div
        className="absolute -top-10 -right-6 w-44 h-44 rounded-full blur-3xl motion-reduce:blur-xl"
        style={{ background: 'rgba(52,211,153,0.35)' }}
      />
      <div
        className="absolute bottom-0 -left-8 w-36 h-36 rounded-full blur-3xl motion-reduce:blur-xl"
        style={{ background: 'rgba(96,165,250,0.28)' }}
      />

      <div
        className="absolute top-5 left-5 sm:top-6 sm:left-6 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(15,23,42,0.06)',
          color: stayScoreVisual.ink,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stayScoreVisual.emerald }} />
        Host verified
      </div>

      <div
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[min(78%,240px)] rounded-[20px] overflow-hidden z-[1]"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.07)',
          boxShadow: '0 22px 50px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)',
        }}
      >
        <div className="relative h-[88px] sm:h-[100px] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(125deg, #CBD5E1 0%, #E2E8F0 35%, #A7F3D0 70%, #93C5FD 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            }}
          />
          <div className="absolute bottom-2.5 left-2.5">
            <StayScoreCardChip score={4.6} layout="card" showInfo={false} />
          </div>
        </div>
        <div className="px-3.5 py-3 space-y-2">
          <div className="h-2.5 w-[72%] rounded-full bg-slate-200" />
          <div className="h-2 w-[48%] rounded-full bg-slate-100" />
          <div className="flex gap-1.5 pt-0.5">
            {['WiFi', 'AC', 'Parking'].map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#F1F5F9', color: stayScoreVisual.muted }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <svg
        className="absolute bottom-6 right-6 w-16 h-16 opacity-40 hidden sm:block"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
      >
        <path
          d="M8 48 Q32 8 56 24"
          stroke="url(#heroStroke)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="heroStroke" x1="0" y1="0" x2="64" y2="64">
            <stop stopColor="#34D399" />
            <stop stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--xpx-surface) 100%)',
        }}
      />
    </div>
  );
}
