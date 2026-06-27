import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import CustomerReferenceField from '../components/inquiry/CustomerReferenceField';
import GuestTrustJourney from '../components/inquiry/GuestTrustJourney';
import InquiryStatusTimeline from '../components/inquiry/InquiryStatusTimeline';
import { inquiryTrackStatusLabel, trackInquiryByReference, type InquiryTrackResult, type InquiryTrackStatus } from '../lib/inquirySubmit';
import { markGuestTrackPageVisited, updateGuestInquiryFromTrack } from '../lib/guestTrustStorage';
import { navigateTo } from '../lib/navigation';

function statusBadgeClass(status: InquiryTrackStatus): string {
  switch (status) {
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    case 'completed':
    case 'host_responded':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'preparing':
      return 'bg-amber-50 text-amber-900 border border-amber-200';
    default:
      return 'bg-sky-50 text-sky-900 border border-sky-200';
  }
}

function parseQuery(): { ref: string; email: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    ref: params.get('ref')?.trim().toUpperCase() ?? '',
    email: params.get('email')?.trim() ?? '',
  };
}

export default function TrackInquiryPage() {
  const initial = parseQuery();
  const [reference, setReference] = useState(initial.ref);
  const [email, setEmail] = useState(initial.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InquiryTrackResult | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setResult(null);

    if (!reference.trim() || !email.trim()) {
      setError('Enter your customer reference and email.');
      return;
    }

    setLoading(true);
    const res = await trackInquiryByReference(reference, email);
    setLoading(false);

    if (!res.ok) {
      setError('We couldn’t find an inquiry with those details. Check your reference and email.');
      return;
    }

    setResult(res.result);
    updateGuestInquiryFromTrack(res.result);
  }, [reference, email]);

  useEffect(() => {
    markGuestTrackPageVisited();
    if (initial.ref && initial.email) {
      void handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--xpx-page, #F8FAFC)' }}>
      <SEOHead
        config={{
          title: 'Track your inquiry | XpressBNB',
          description: 'Check the status of your stay inquiry with your customer reference.',
        }}
      />
      <Header
        onAboutClick={() => navigateTo('/?page=about')}
        onBlogClick={() => navigateTo('/?page=blog')}
        onHostLoginClick={() => navigateTo('/auth/login')}
      />

      <main className="max-w-lg mx-auto px-4 py-8 sm:py-12 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight">
            Track inquiry
          </h1>
          <p className="text-sm text-xpx-muted mt-2 leading-relaxed">
            Enter the reference from your confirmation and the email you used when booking.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSearch(e)}
          className="rounded-2xl p-5 sm:p-6 space-y-4"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
        >
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2">
              Customer reference
            </span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="XPX-240628-00127"
              className="xpx-input font-mono tracking-wide uppercase"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle mb-2">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="xpx-input"
              autoComplete="email"
              required
            />
          </label>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-white inline-flex items-center justify-center gap-2 min-h-[52px] disabled:opacity-50"
            style={{ background: 'var(--xpx-cta)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                Looking up…
              </>
            ) : (
              <>
                <Search className="w-5 h-5" aria-hidden />
                View status
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 space-y-4">
            <CustomerReferenceField reference={result.customerReference} />

            <div
              className="rounded-2xl p-5"
              style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-xpx-text">Status</h2>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(result.displayStatus)}`}>
                  {inquiryTrackStatusLabel(result.displayStatus)}
                </span>
              </div>
              <InquiryStatusTimeline variant="track" displayStatus={result.displayStatus} />
              {result.reviewedAt && result.displayStatus !== 'preparing' && (
                <p className="mt-4 text-xs text-xpx-muted border-t border-slate-200/80 pt-3">
                  Reviewed by{' '}
                  <span className="font-semibold text-xpx-text">XpressBNB Operations</span>
                  <span className="text-xpx-subtle">
                    {' '}
                    ·{' '}
                    {new Date(result.reviewedAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
            </div>

            {result.checkInDate && (
              <p className="text-sm text-xpx-muted text-center">
                Stay:{' '}
                <span className="font-semibold text-xpx-text">
                  {new Date(result.checkInDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {result.checkOutDate
                    ? ` → ${new Date(result.checkOutDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : ''}
                </span>
              </p>
            )}

            <GuestTrustJourney
              compact
              context={{
                hasTrackedPage: true,
                inquiries: [
                  {
                    customerReference: result.customerReference,
                    submittedAt: result.createdAt
                      ? new Date(result.createdAt).getTime()
                      : Date.now(),
                    lastDisplayStatus: result.displayStatus,
                    reviewedAt: result.reviewedAt,
                    phoneVerified: result.phoneVerified,
                  },
                ],
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
