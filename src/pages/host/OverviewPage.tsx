import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Building2, BookOpen, Calendar, Sparkles, TrendingUp, Power } from 'lucide-react';
import { hasPremiumAccess } from '../../lib/premium';
import HostGrowthScore from '../../components/premium/HostGrowthScore';
import DemandForecast from '../../components/premium/DemandForecast';
import PremiumUpgradeCTA from '../../components/premium/PremiumUpgradeCTA';
import RealtimeToast, { type ToastPayload } from '../../components/RealtimeToast';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

interface SupplyKpis {
  /** Properties visible on the marketplace (`is_active = true`). */
  liveListings: number;
  /** Bookings for this host created in the last 7 days, excluding cancelled. */
  bookingsLast7Days: number;
  /** Properties saved but not live (`is_active = false`); includes drafts and paused. */
  inactiveListings: number;
}

interface OverviewPageProps {
  onNavigate?: (page: string) => void;
}

/** Rolling window: now minus 7×24h (UTC ISO for PostgREST `gte`). */
function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function OverviewKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-5 sm:p-6 animate-pulse"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
        >
          <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-slate-700/50" />
          <div className="h-9 w-16 mt-4 rounded bg-slate-200/80 dark:bg-slate-700/50" />
          <div className="h-4 w-40 mt-3 rounded bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage({ onNavigate }: OverviewPageProps = {}) {
  const { host } = useAuth();
  const [kpis, setKpis] = useState<SupplyKpis>({
    liveListings: 0,
    bookingsLast7Days: 0,
    inactiveListings: 0,
  });
  const [totalBookingsAllTime, setTotalBookingsAllTime] = useState(0);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const loadStats = useCallback(async () => {
    if (!host?.id) return;

    setLoading(true);
    const since = sevenDaysAgoIso();

    try {
      const [
        liveRes,
        inactiveRes,
        bookings7dRes,
        bookingsTotalRes,
        propertiesRes,
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', host.id)
          .eq('is_active', true),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', host.id)
          .eq('is_active', false),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('host_id', host.id)
          .gte('created_at', since)
          .neq('status', 'cancelled'),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('host_id', host.id),
        supabase.from('properties').select('*').eq('host_id', host.id).order('created_at', { ascending: false }),
      ]);

      const err =
        liveRes.error ||
        inactiveRes.error ||
        bookings7dRes.error ||
        bookingsTotalRes.error ||
        propertiesRes.error;

      if (err) {
        console.error('Overview KPI load error:', err);
        setToast({
          id: 'overview-load-error',
          title: 'Could not load dashboard metrics',
          body: err.message || 'Please refresh or try again shortly.',
          durationMs: 7000,
        });
        setKpis({ liveListings: 0, bookingsLast7Days: 0, inactiveListings: 0 });
        setTotalBookingsAllTime(0);
        setProperties([]);
        setSelectedProperty(null);
        return;
      }

      const list = propertiesRes.data ?? [];
      setProperties(list);
      setSelectedProperty((prev) => {
        if (list.length === 0) return null;
        if (prev && list.some((p) => p.id === prev.id)) return prev;
        return list[0];
      });

      setKpis({
        liveListings: liveRes.count ?? 0,
        inactiveListings: inactiveRes.count ?? 0,
        bookingsLast7Days: bookings7dRes.count ?? 0,
      });
      setTotalBookingsAllTime(bookingsTotalRes.count ?? 0);
    } catch (e) {
      console.error('Error loading stats:', e);
      setToast({
        id: 'overview-unexpected-error',
        title: 'Could not load dashboard metrics',
        body: e instanceof Error ? e.message : 'Unexpected error.',
        durationMs: 7000,
      });
    } finally {
      setLoading(false);
    }
  }, [host?.id]);

  useEffect(() => {
    if (!host?.id) {
      setLoading(false);
      setKpis({ liveListings: 0, bookingsLast7Days: 0, inactiveListings: 0 });
      setTotalBookingsAllTime(0);
      setProperties([]);
      setSelectedProperty(null);
      return;
    }
    void loadStats();
  }, [host?.id, loadStats]);

  const emerald = '#50C878';
  const slateIcon = '#64748b';

  const kpiCards: Array<{
    title: string;
    value: number;
    subtitle: string;
    icon: typeof Building2;
    accent: string;
  }> = [
    {
      title: 'Live listings',
      value: kpis.liveListings,
      subtitle: 'Published & bookable on XpressBnB',
      icon: Building2,
      accent: emerald,
    },
    {
      title: 'Bookings (7 days)',
      value: kpis.bookingsLast7Days,
      subtitle: 'New requests & confirmations, excl. cancelled',
      icon: BookOpen,
      accent: emerald,
    },
    {
      title: 'Not live',
      value: kpis.inactiveListings,
      subtitle: 'Inactive listings (drafts or paused)',
      icon: Power,
      accent: slateIcon,
    },
  ];

  const totalProperties = properties.length;

  return (
    <div className="space-y-6">
      <RealtimeToast toast={toast} onDismiss={() => setToast(null)} />

      <div>
        <p className="xpx-eyebrow">Dashboard</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">
          Welcome back, {host?.name?.split(' ')[0] ?? 'host'}
        </h1>
        <p className="text-xpx-muted mt-2">Supply health at a glance — listings on air and recent booking flow.</p>
      </div>

      {/* Supply KPIs */}
      {loading ? (
        <OverviewKpiSkeleton />
      ) : !host?.id ? (
        <p className="text-sm text-xpx-muted rounded-2xl p-4" style={{ border: '1px solid var(--xpx-border)', background: 'var(--xpx-surface)' }}>
          Host profile not loaded. Sign in again if this persists.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-2xl p-5 sm:p-6"
                style={{
                  background: 'var(--xpx-surface)',
                  border: '1px solid var(--xpx-border)',
                  boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-xpx-subtle font-bold">{card.title}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-xpx-text mt-2 tabular-nums">{card.value}</p>
                    <p className="text-sm text-xpx-muted mt-1 leading-snug">{card.subtitle}</p>
                  </div>
                  <div
                    className="p-3 rounded-xl flex-shrink-0"
                    style={{ background: `${card.accent}14`, border: `1px solid ${card.accent}33` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: card.accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick actions + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.3)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--xpx-warm)' }} />
            </div>
            <h2 className="text-xl font-bold text-xpx-text">Quick Actions</h2>
          </div>
          <div className="space-y-3">
            {[
              { id: 'properties', title: 'Add New Property', desc: 'List a new property on XpressBnB' },
              { id: 'import', title: 'Import Listings', desc: 'Import from Airbnb or Booking.com' },
              { id: 'realtime', title: 'View Analytics', desc: 'Check your realtime insights' },
            ].map((action) => (
              <button
                key={action.id}
                onClick={() => onNavigate?.(action.id)}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--xpx-warm)';
                  e.currentTarget.style.background = 'rgba(80,200,120,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--xpx-border)';
                  e.currentTarget.style.background = 'var(--xpx-surface-light)';
                }}
              >
                <p className="font-semibold text-xpx-text">{action.title}</p>
                <p className="text-sm text-xpx-muted">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.25)' }}
            >
              <Calendar className="w-5 h-5" style={{ color: '#2563EB' }} />
            </div>
            <h2 className="text-xl font-bold text-xpx-text">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {totalBookingsAllTime === 0 && totalProperties === 0 ? (
              <div className="text-center py-8">
                <p className="text-xpx-muted">No activity yet</p>
                <p className="text-sm text-xpx-subtle mt-1">Start by adding your first property</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ActivityRow color="#50C878" title="Account Created" subtitle="Your host account is active" />
                {totalProperties > 0 && (
                  <ActivityRow color="#2563EB" title="Properties Added" subtitle={`${totalProperties} properties in your account`} />
                )}
                {totalBookingsAllTime > 0 && (
                  <ActivityRow color="var(--xpx-warm)" title="Bookings Received" subtitle={`${totalBookingsAllTime} total bookings`} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium intelligence */}
      {properties.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.3)' }}
              >
                <Sparkles className="w-6 h-6" style={{ color: 'var(--xpx-warm)' }} />
              </div>
              <div>
                <p className="xpx-eyebrow">Premium</p>
                <h2 className="text-2xl font-extrabold text-xpx-text tracking-tight mt-0.5">Premium Intelligence</h2>
                <p className="text-sm text-xpx-muted">Advanced insights for your properties</p>
              </div>
            </div>

            {properties.length > 1 && (
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const property = properties.find((p) => p.id === e.target.value);
                  setSelectedProperty(property ?? null);
                }}
                className="xpx-input max-w-xs"
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedProperty && hasPremiumAccess(selectedProperty) ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HostGrowthScore property={selectedProperty} />
              <DemandForecast property={selectedProperty} />
            </div>
          ) : (
            <PremiumUpgradeCTA
              title="Unlock Premium Intelligence"
              description="Get AI-powered insights, smart pricing, demand forecasts, and personalized coaching to maximize your bookings and revenue."
              onUpgrade={() => onNavigate?.('subscription')}
            />
          )}
        </div>
      )}

      {host?.subscription_status === 'trial' && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(80,200,120,0.14) 0%, var(--xpx-surface) 70%)',
            border: '1px solid rgba(80,200,120,0.3)',
            boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          }}
        >
          <p className="xpx-eyebrow">On trial</p>
          <h3 className="text-2xl font-extrabold text-xpx-text mt-1 mb-2">Upgrade to Paid Listing</h3>
          <p className="mb-4 text-xpx-muted">
            Unlock calendar sync, analytics, verified badge and more for just ₹999/month per property.
          </p>
          <button
            onClick={() => onNavigate?.('subscription')}
            className="px-6 py-2.5 rounded-xl font-bold transition-all"
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ color, title, subtitle }: { color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'var(--xpx-surface-light)' }}>
      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
      <div>
        <p className="text-sm font-medium text-xpx-text">{title}</p>
        <p className="text-xs text-xpx-muted">{subtitle}</p>
      </div>
    </div>
  );
}
