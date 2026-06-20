import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Home,
  RefreshCw,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deactivateOpsProperty,
  fetchOpsSnapshot,
  type OpsSnapshot,
} from '../../lib/opsConsole';

type OpsConsolePageProps = {
  onNavigate: (path: string) => void;
};

function Badge({
  tone,
  children,
}: {
  tone: 'live' | 'inactive' | 'warn' | 'pending' | 'verified' | 'neutral';
  children: ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    live: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    warn: 'bg-amber-100 text-amber-800',
    pending: 'bg-orange-100 text-orange-800',
    verified: 'bg-sky-100 text-sky-800',
    neutral: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function propertyHref(id: string, slug: string | null) {
  return slug ? `/property/${slug}` : `/property/${id}`;
}

export default function OpsConsolePage({ onNavigate }: OpsConsolePageProps) {
  const { user, loading: authLoading, signOut } = useAuth();
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    const result = await fetchOpsSnapshot();
    if (result.ok && result.data) {
      setSnapshot(result.data);
    } else if (result.status === 'denied') {
      setAccessDenied(true);
      setSnapshot(null);
    } else {
      setError(result.error ?? 'Failed to load');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      void load();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, load]);

  const handleDeactivate = async (propertyId: string, title: string) => {
    const ok = window.confirm(
      `Deactivate "${title}"?\n\nThis hides the listing from guests. You can reactivate from the host dashboard.`,
    );
    if (!ok) return;
    setDeactivatingId(propertyId);
    const result = await deactivateOpsProperty(propertyId);
    setDeactivatingId(null);
    if (!result.ok) {
      alert(result.error ?? 'Failed to deactivate');
      return;
    }
    await load();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Shield className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">XpressBNB Ops Console</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with an internal ops account to continue.</p>
          <button
            type="button"
            onClick={() => onNavigate('/auth/login')}
            className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Ops access denied</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account is not on the ops allowlist. Contact the founder to add your email to{' '}
            <code className="text-xs">admin_users</code> or <code className="text-xs">OPS_ALLOWED_EMAILS</code>.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-6 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to site
          </button>
        </div>
      </div>
    );
  }

  const health = snapshot?.health;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Internal</p>
            <h1 className="text-xl font-bold">XpressBNB Ops Console</h1>
            <p className="text-xs text-slate-500">
              Launch control · {user.email}
              {snapshot?.generated_at && (
                <> · refreshed {new Date(snapshot.generated_at).toLocaleString()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Site
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && !snapshot ? (
          <div className="flex justify-center py-24">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : health ? (
          <>
            {/* A. Launch Health */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Launch health
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                <StatCard label="Live properties" value={health.active_properties} />
                <StatCard label="Inactive" value={health.inactive_properties} />
                <StatCard label="Hosts" value={health.total_hosts} />
                <StatCard label="Hosts missing phone" value={health.hosts_missing_phone} />
                <StatCard label="Verified today" value={health.verified_inquiries_today} />
                <StatCard label="Pending host" value={health.pending_host_inquiries} />
                <StatCard
                  label="Cities live"
                  value={Object.keys(health.active_by_city).length}
                  sub={Object.entries(health.active_by_city)
                    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([c, n]) => `${c} (${n})`)
                    .join(' · ')}
                />
              </div>
            </section>

            {/* E. Stuck Lead Alert */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Needs attention
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <AlertPanel
                  title="Pending host 15+ min"
                  items={snapshot!.alerts.stuck_pending_host.map((a) => ({
                    key: a.id,
                    label: `${a.property_title} · ${a.minutes_old}m`,
                    href: a.host_id ? `/host/${a.host_id}/dashboard/bookings` : undefined,
                  }))}
                  empty="No stuck inquiries"
                />
                <AlertPanel
                  title="Live · host phone missing"
                  items={snapshot!.alerts.active_missing_host_phone.map((a) => ({
                    key: a.id,
                    label: a.title,
                    href: propertyHref(a.id, null),
                  }))}
                  empty="All live listings have host phone"
                />
                <AlertPanel
                  title="Live · images missing"
                  items={snapshot!.alerts.active_missing_images.map((a) => ({
                    key: a.id,
                    label: `${a.title} (${a.city})`,
                    href: propertyHref(a.id, null),
                  }))}
                  empty="All live listings have images"
                />
                <AlertPanel
                  title="Live · invalid price"
                  items={snapshot!.alerts.active_invalid_price.map((a) => ({
                    key: a.id,
                    label: `${a.title} (${a.city})`,
                    href: propertyHref(a.id, null),
                  }))}
                  empty="All live listings have price"
                />
              </div>
            </section>

            {/* B. Property Readiness */}
            <section>
              <h2 className="mb-4 text-lg font-bold">Property readiness</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Images</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot!.properties.slice(0, 100).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium">{p.title}</td>
                        <td className="px-4 py-3">{p.city}</td>
                        <td className="px-4 py-3">{p.host_name}</td>
                        <td className="px-4 py-3">
                          {p.is_active ? <Badge tone="live">Live</Badge> : <Badge tone="inactive">Inactive</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {p.host_phone_present ? (
                            <Badge tone="verified">Present</Badge>
                          ) : (
                            <Badge tone="warn">Missing phone</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.images_present ? <Badge tone="neutral">OK</Badge> : <Badge tone="warn">Missing</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          {p.price_present ? <Badge tone="neutral">OK</Badge> : <Badge tone="warn">Missing</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <LinkBtn href={propertyHref(p.id, p.slug)} onNavigate={onNavigate} />
                            {p.is_active && (
                              <button
                                type="button"
                                disabled={deactivatingId === p.id}
                                onClick={() => void handleDeactivate(p.id, p.title)}
                                className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* C. Host Readiness */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Users className="w-5 h-5 text-emerald-600" />
                Host readiness
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Live listings</th>
                      <th className="px-4 py-3">Subscription</th>
                      <th className="px-4 py-3">Dashboard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot!.hosts.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium">{h.name}</td>
                        <td className="px-4 py-3 text-slate-600">{h.email}</td>
                        <td className="px-4 py-3">
                          {h.phone_present ? (
                            <Badge tone="verified">Present</Badge>
                          ) : (
                            <Badge tone="warn">Missing phone</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">{h.active_property_count}</td>
                        <td className="px-4 py-3">
                          {h.subscription_active ? (
                            <Badge tone="live">Active</Badge>
                          ) : (
                            <Badge tone="neutral">{h.subscription_status}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <LinkBtn
                            href={`/host/${h.id}/dashboard/overview`}
                            onNavigate={onNavigate}
                            label="Open"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* D. Inquiry Control */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Home className="w-5 h-5 text-emerald-600" />
                Recent verified inquiries
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Property</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Guest phone</th>
                      <th className="px-4 py-3">Host</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot!.inquiries.map((inq) => (
                      <tr key={inq.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {inq.created_at ? new Date(inq.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{inq.property_title}</td>
                        <td className="px-4 py-3">{inq.city}</td>
                        <td className="px-4 py-3">
                          {inq.status === 'pending_host' ? (
                            <Badge tone="pending">Pending host</Badge>
                          ) : inq.phone_verified ? (
                            <Badge tone="verified">Verified</Badge>
                          ) : (
                            <Badge tone="neutral">{inq.status ?? '—'}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{inq.guest_phone_masked}</td>
                        <td className="px-4 py-3">{inq.host_name}</td>
                        <td className="px-4 py-3">
                          {inq.amount != null ? `₹${Number(inq.amount).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <LinkBtn href={propertyHref(inq.property_id, null)} onNavigate={onNavigate} />
                            {inq.host_id && (
                              <LinkBtn
                                href={`/host/${inq.host_id}/dashboard/bookings`}
                                onNavigate={onNavigate}
                                label="Host"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function AlertPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: { key: string; label: string; href?: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.slice(0, 8).map((item) => (
            <li key={item.key}>
              {item.href ? (
                <a href={item.href} className="text-emerald-700 hover:underline">
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          ))}
          {items.length > 8 && (
            <li className="text-xs text-slate-400">+{items.length - 8} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

function LinkBtn({
  href,
  onNavigate,
  label = 'View',
}: {
  href: string;
  onNavigate: (path: string) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}
