import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Eye, TrendingUp, Users, Calendar, Sparkles } from 'lucide-react';
import { hasPremiumAccess } from '../../lib/premium';
import VisibilityDiagnostics from '../../components/premium/VisibilityDiagnostics';
import SmartPricing from '../../components/premium/SmartPricing';
import AIHostCoach from '../../components/premium/AIHostCoach';
import EarningsSimulator from '../../components/premium/EarningsSimulator';

export default function AnalyticsPage() {
  const { host } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalBookings: 0,
    conversionRate: 0,
    avgBookingValue: 0,
    popularProperty: '',
  });
  const [loading, setLoading] = useState(true);
  // Properties here are a minimal projection (id, title, premium fields)
  // selected for the analytics summary — not the full DB row.
  interface AnalyticsPropertyRow {
    id: string;
    title: string;
    is_premium: boolean;
    premium_plan: string;
    premium_expiry: string | null;
  }
  const [properties, setProperties] = useState<AnalyticsPropertyRow[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<AnalyticsPropertyRow | null>(null);

  useEffect(() => {
    if (host?.id) {
      loadAnalytics();
    }
  }, [host?.id]);
useEffect(() => {
  if (!host?.id) return;

  const channel = supabase
    .channel('realtime-views')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hosts',
        filter: `id=eq.${host.id}`,
      },
      (payload) => {
        setAnalytics((prev) => ({
          ...prev,
          totalViews: payload.new.total_views,
        }));
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [host?.id]);

  const loadAnalytics = async () => {
    if (!host?.id) return;

    try {
      // Get all properties owned by this host
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, is_premium, premium_plan, premium_expiry')
        .eq('host_id', host.id);

      if (propertiesError) throw propertiesError;

      const propertyIds = properties?.map(p => p.id) || [];

      // Get bookings and views for these properties
      const [bookingsRes, viewsRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('host_id', host.id),
        propertyIds.length > 0
          ? supabase
              .from('view_events')
              .select('entity_id, timestamp')
              .eq('entity_type', 'property')
              .in('entity_id', propertyIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const bookings = bookingsRes.data || [];
      const views = viewsRes.data || [];

      const totalViews = views.length;
      const totalBookings = bookings.length;
      const conversionRate = totalViews > 0 ? (totalBookings / totalViews * 100) : 0;
      const avgBookingValue = bookings.length > 0
        ? bookings.reduce((sum, b) => sum + Number(b.amount_total || 0), 0) / bookings.length
        : 0;

      // Calculate views per property
      const propertyViews = (properties || []).map(p => ({
        name: p.title,
        views: views.filter((v) => v.entity_id === p.id).length,
      }));

      const popularProperty = propertyViews.sort((a, b) => b.views - a.views)[0]?.name || 'N/A';

      setProperties(properties || []);
      if (properties && properties.length > 0 && !selectedProperty) {
        setSelectedProperty(properties[0]);
      }

      setAnalytics({
        totalViews,
        totalBookings,
        conversionRate,
        avgBookingValue,
        popularProperty,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--xpx-warm)' }} />
      </div>
    );
  }

  const aboveAverage = analytics.conversionRate > 5;

  return (
    <div className="space-y-6">
      <div>
        <p className="xpx-eyebrow">Realtime</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Analytics</h1>
        <p className="text-xpx-muted mt-2">Realtime insights about your properties</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <Stat label="Total Views" value={analytics.totalViews} icon={Eye} accent="#2563EB" sub="Property page views" />
        <Stat label="Total Bookings" value={analytics.totalBookings} icon={Calendar} accent="#50C878" sub="Successful bookings" />
        <Stat label="Conversion Rate" value={`${analytics.conversionRate.toFixed(1)}%`} icon={TrendingUp} accent="#50C878" sub="Views to bookings" />
        <Stat label="Avg Booking Value" value={`₹${analytics.avgBookingValue.toFixed(0)}`} icon={Activity} accent="#EC4899" sub="Per booking" />
        <Stat
          label="Most Popular Property"
          value={analytics.popularProperty}
          icon={Users}
          accent="#A78BFA"
          sub="Highest views"
          wide
        />
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-4">Performance Insights</h2>
        <div className="space-y-3">
          <Insight
            color={aboveAverage ? '#50C878' : '#64748B'}
            icon={TrendingUp}
            title={aboveAverage ? 'Above-average conversion' : 'Conversion below average'}
            body={`Your conversion rate of ${analytics.conversionRate.toFixed(1)}% is ${aboveAverage ? 'above' : 'below'} the platform average of 5%.`}
          />
          <Insight
            color="#50C878"
            icon={Activity}
            title="Booking Performance"
            body={`You have ${analytics.totalBookings} total bookings with an average value of ₹${analytics.avgBookingValue.toFixed(0)}.`}
          />
          <Insight
            color="#2563EB"
            icon={Eye}
            title="Visibility"
            body={`Your properties have received ${analytics.totalViews} total views. Keep listings updated to maintain visibility.`}
          />
        </div>
      </div>

      {properties.length > 0 && selectedProperty && (
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
                <h2 className="text-2xl font-extrabold text-xpx-text tracking-tight mt-0.5">Premium Analytics</h2>
                <p className="text-sm text-xpx-muted">Advanced intelligence for property optimization</p>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VisibilityDiagnostics property={selectedProperty} locked={!hasPremiumAccess(selectedProperty)} />
            <SmartPricing property={selectedProperty} locked={!hasPremiumAccess(selectedProperty)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EarningsSimulator property={selectedProperty} locked={!hasPremiumAccess(selectedProperty)} />
            <AIHostCoach property={selectedProperty} locked={!hasPremiumAccess(selectedProperty)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  wide,
}: {
  label: string;
  value: number | string;
  icon: typeof Eye;
  accent: string;
  sub: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${wide ? 'md:col-span-2' : ''}`}
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-xpx-subtle font-bold">{label}</span>
        <div
          className="p-2 rounded-lg"
          style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-xpx-text">{value}</p>
      <p className="text-sm text-xpx-muted mt-1">{sub}</p>
    </div>
  );
}

function Insight({
  color,
  icon: Icon,
  title,
  body,
}: {
  color: string;
  icon: typeof TrendingUp;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl"
      style={{ background: `${color}0D`, border: `1px solid ${color}26` }}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color }} />
      <div>
        <h3 className="font-semibold text-xpx-text">{title}</h3>
        <p className="text-sm text-xpx-muted mt-0.5">{body}</p>
      </div>
    </div>
  );
}
