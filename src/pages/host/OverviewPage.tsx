import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, BookOpen, DollarSign, Eye, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { hasPremiumAccess } from '../../lib/premium';
import HostGrowthScore from '../../components/premium/HostGrowthScore';
import DemandForecast from '../../components/premium/DemandForecast';
import PremiumUpgradeCTA from '../../components/premium/PremiumUpgradeCTA';

interface Stats {
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  totalViews: number;
}

interface OverviewPageProps {
  onNavigate?: (page: string) => void;
}

export default function OverviewPage({ onNavigate }: OverviewPageProps = {}) {
  const { host } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    activeProperties: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);

  useEffect(() => {
    if (host?.id) {
      loadStats();
    }
  }, [host?.id]);

  const loadStats = async () => {
    if (!host?.id) return;

    try {
      const [propertiesRes, bookingsRes, viewsRes] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact' }).eq('host_id', host.id),
        supabase.from('bookings').select('*').eq('host_id', host.id),
        supabase
          .from('view_events')
          .select('*', { count: 'exact' })
          .eq('entity_type', 'property')
          .in(
            'entity_id',
            (await supabase.from('properties').select('id').eq('host_id', host.id)).data?.map((p) => p.id) || []
          ),
      ]);

      const properties = propertiesRes.data || [];
      const bookings = bookingsRes.data || [];
      const activeProperties = properties.filter((p) => p.is_active);

      const totalRevenue = bookings
        .filter((b) => b.status === 'confirmed' && b.amount_total)
        .reduce((sum, b) => sum + Number(b.amount_total || 0), 0);

      const pendingBookings = bookings.filter((b) => b.status === 'pending').length;

      setProperties(properties);
      if (properties.length > 0 && !selectedProperty) {
        setSelectedProperty(properties[0]);
      }

      setStats({
        totalProperties: properties.length,
        activeProperties: activeProperties.length,
        totalBookings: bookings.length,
        pendingBookings,
        totalRevenue,
        totalViews: viewsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stat cards use the same warm/info color tokens consistently across the
  // dashboard rather than per-card gradients (cleaner, less rainbow).
  const statCards: Array<{
    title: string;
    value: string | number;
    subtitle: string;
    icon: typeof Building2;
    accent: string;
  }> = [
    { title: 'Properties', value: stats.totalProperties, subtitle: `${stats.activeProperties} active`, icon: Building2, accent: '#2563EB' },
    { title: 'Bookings', value: stats.totalBookings, subtitle: `${stats.pendingBookings} pending`, icon: BookOpen, accent: '#16A34A' },
    { title: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, subtitle: 'Total earnings', icon: DollarSign, accent: '#F4A261' },
    { title: 'Views', value: stats.totalViews, subtitle: 'Total property views', icon: Eye, accent: '#EC4899' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--xpx-warm)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="xpx-eyebrow">Dashboard</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">
          Welcome back, {host?.name?.split(' ')[0] ?? 'host'}
        </h1>
        <p className="text-xpx-muted mt-2">Here&apos;s how your properties are performing today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl p-5 sm:p-6"
              style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-xpx-subtle font-bold">{card.title}</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-xpx-text mt-2">{card.value}</p>
                  <p className="text-sm text-xpx-muted mt-1">{card.subtitle}</p>
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

      {/* Quick actions + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-lg"
              style={{ background: 'rgba(244,162,97,0.12)', border: '1px solid rgba(244,162,97,0.3)' }}
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
                  e.currentTarget.style.background = 'rgba(244,162,97,0.06)';
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
            {stats.totalBookings === 0 && stats.totalProperties === 0 ? (
              <div className="text-center py-8">
                <p className="text-xpx-muted">No activity yet</p>
                <p className="text-sm text-xpx-subtle mt-1">Start by adding your first property</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ActivityRow color="#16A34A" title="Account Created" subtitle="Your host account is active" />
                {stats.totalProperties > 0 && (
                  <ActivityRow color="#2563EB" title="Properties Added" subtitle={`${stats.totalProperties} properties listed`} />
                )}
                {stats.totalBookings > 0 && (
                  <ActivityRow color="var(--xpx-warm)" title="Bookings Received" subtitle={`${stats.totalBookings} total bookings`} />
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
                style={{ background: 'rgba(244,162,97,0.12)', border: '1px solid rgba(244,162,97,0.3)' }}
              >
                <Sparkles className="w-6 h-6" style={{ color: 'var(--xpx-warm)' }} />
              </div>
              <div>
                <p className="xpx-eyebrow">Premium</p>
                <h2 className="text-2xl font-extrabold text-xpx-text tracking-tight mt-0.5">
                  Premium Intelligence
                </h2>
                <p className="text-sm text-xpx-muted">Advanced insights for your properties</p>
              </div>
            </div>

            {properties.length > 1 && (
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => {
                  const property = properties.find((p) => p.id === e.target.value);
                  setSelectedProperty(property);
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
            background:
              'linear-gradient(135deg, rgba(244,162,97,0.14) 0%, var(--xpx-surface) 70%)',
            border: '1px solid rgba(244,162,97,0.3)',
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
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(244,162,97,0.35)' }}
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
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ background: 'var(--xpx-surface-light)' }}
    >
      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: color }} />
      <div>
        <p className="text-sm font-medium text-xpx-text">{title}</p>
        <p className="text-xs text-xpx-muted">{subtitle}</p>
      </div>
    </div>
  );
}
