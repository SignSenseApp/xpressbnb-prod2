import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Link as LinkIcon, Plus, Trash2, RefreshCw, Copy, Check } from 'lucide-react';

export default function CalendarSyncPage() {
  const { host } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (host?.id) {
      loadProperties();
    }
  }, [host?.id]);

  const loadProperties = async () => {
    if (!host?.id) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', host.id)
        .eq('is_active', true);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (propertyId: string) => {
    const icalUrl = `${window.location.origin}/api/calendar/${propertyId}.ics`;
    navigator.clipboard.writeText(icalUrl);
    setCopied(propertyId);
    setTimeout(() => setCopied(null), 2000);
  };

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
        <p className="xpx-eyebrow">Sync</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Calendar Sync</h1>
        <p className="text-xpx-muted mt-2">Sync your bookings with external calendars</p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)' }}
      >
        <div className="flex items-start gap-4">
          <Calendar className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#2563EB' }} />
          <div>
            <h3 className="font-bold text-xpx-text mb-2">How Calendar Sync Works</h3>
            <ul className="text-sm text-xpx-muted space-y-1">
              <li>• Export your XpressBnB calendar to Airbnb, Booking.com, or other platforms</li>
              <li>• Import external calendars to avoid double bookings</li>
              <li>• Calendars sync automatically every few hours</li>
            </ul>
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <Calendar className="w-16 h-16 text-xpx-subtle mx-auto mb-4" />
          <h3 className="text-xl font-bold text-xpx-text mb-2">No active properties</h3>
          <p className="text-xpx-muted">Add and activate properties to enable calendar sync</p>
        </div>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <div
              key={property.id}
              className="rounded-2xl p-6"
              style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
            >
              <h3 className="text-xl font-bold text-xpx-text mb-4">{property.title}</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-xpx-text mb-3 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" style={{ color: 'var(--xpx-warm)' }} />
                    Export Calendar
                  </h4>
                  <p className="text-sm text-xpx-muted mb-3">
                    Copy this link and add it to your external calendar app
                  </p>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/calendar/${property.id}.ics`}
                      className="xpx-input flex-1 min-w-0 font-mono text-xs"
                    />
                    <button
                      onClick={() => handleCopyLink(property.id)}
                      className="px-4 py-2 rounded-xl transition-colors flex items-center gap-2 text-xpx-text"
                      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border-strong)' }}
                    >
                      {copied === property.id ? (
                        <>
                          <Check className="w-4 h-4" style={{ color: '#16A34A' }} />
                          <span className="text-sm" style={{ color: '#15803D' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-xpx-text mb-3 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" style={{ color: 'var(--xpx-warm)' }} />
                    Import External Calendars
                  </h4>
                  {property.external_calendars && property.external_calendars.length > 0 ? (
                    <div className="space-y-2">
                      {property.external_calendars.map((cal: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl gap-3"
                          style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-xpx-text">{cal.name}</p>
                            <p className="text-xs text-xpx-subtle truncate max-w-md">{cal.url}</p>
                          </div>
                          <button
                            className="p-2 rounded-lg transition-colors hover:bg-red-50 flex-shrink-0"
                            style={{ color: '#DC2626' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-xpx-muted mb-3">No external calendars linked yet</p>
                  )}
                  <button
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-xpx-text"
                    style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border-strong)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Calendar URL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
