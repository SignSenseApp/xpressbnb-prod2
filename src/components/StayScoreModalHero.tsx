import { Sparkles } from 'lucide-react';

/**
 * Zero-dependency modal hero — instant paint, no image fetch.
 * Premium western startup glass UI illustration.
 */
export default function StayScoreModalHero() {
  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden rounded-t-[28px]"
      aria-hidden
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(145deg, #f8fafc 0%, #eef2ff 38%, #ecfdf5 72%, #f8fafc 100%)',
        }}
      />

      {/* Soft orbs */}
      <div
        className="absolute -top-8 -left-6 w-40 h-40 sm:w-52 sm:h-52 rounded-full opacity-70 blur-2xl"
        style={{ background: 'rgba(37,99,235,0.22)' }}
      />
      <div
        className="absolute top-6 right-0 w-36 h-36 sm:w-48 sm:h-48 rounded-full opacity-60 blur-2xl"
        style={{ background: 'rgba(80,200,120,0.28)' }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full opacity-50 blur-2xl"
        style={{ background: 'rgba(255,56,92,0.12)' }}
      />

      {/* Mock listing card */}
      <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-10 pt-2 pb-6">
        <div
          className="relative w-full max-w-[280px] sm:max-w-[300px] rounded-[20px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 20px 50px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
          }}
        >
          <div
            className="h-[88px] sm:h-[96px]"
            style={{
              background:
                'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 45%, #64748b 100%)',
            }}
          />
          <div className="p-3 space-y-2">
            <div
              className="h-2.5 rounded-full w-[72%]"
              style={{ background: 'rgba(15,23,42,0.12)' }}
            />
            <div
              className="h-2 rounded-full w-[45%]"
              style={{ background: 'rgba(15,23,42,0.07)' }}
            />
          </div>

          {/* Stay Score pill on card */}
          <div
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white tabular-nums"
            style={{
              background: 'rgba(15,23,42,0.62)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 8px 20px rgba(15,23,42,0.2)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-200" />
            <span>4.6</span>
            <span className="font-semibold text-white/85">Stay Score</span>
          </div>
        </div>
      </div>

      {/* Bottom fade into modal body */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 sm:h-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(248,250,252,0.95) 85%, var(--xpx-surface, #fff) 100%)',
        }}
      />

      <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-5">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white"
          style={{
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-200" />
          Listing quality
        </div>
      </div>
    </div>
  );
}
