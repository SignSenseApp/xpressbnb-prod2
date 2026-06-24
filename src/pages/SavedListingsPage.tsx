import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Compass } from 'lucide-react';
import ConversionPropertyCard from '../components/ConversionPropertyCard';
import SEOHead from '../components/SEOHead';
import { useSavedListings } from '../hooks/useSavedListings';
import { supabase } from '../lib/supabase';
import type { Property } from '../lib/database.types';

interface SavedListingsPageProps {
  onNavigate: (path: string) => void;
}

type UnavailableItem = {
  id: string;
  title: string;
  city: string;
  reason: 'removed' | 'inactive';
};

export default function SavedListingsPage({ onNavigate }: SavedListingsPageProps) {
  const { savedList, remove } = useSavedListings();
  const [liveProperties, setLiveProperties] = useState<Property[]>([]);
  const [unavailable, setUnavailable] = useState<UnavailableItem[]>([]);
  const [loading, setLoading] = useState(true);

  const savedIds = useMemo(() => savedList.map((s) => s.id), [savedList]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (savedIds.length === 0) {
        setLiveProperties([]);
        setUnavailable([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.from('properties').select('*').in('id', savedIds);
        if (error) throw error;

        const byId = new Map((data ?? []).map((p) => [p.id, p]));
        const live: Property[] = [];
        const gone: UnavailableItem[] = [];

        for (const snap of savedList) {
          const row = byId.get(snap.id);
          if (!row) {
            gone.push({ id: snap.id, title: snap.title, city: snap.city, reason: 'removed' });
            continue;
          }
          if (row.is_active === false) {
            gone.push({ id: snap.id, title: row.title, city: row.city, reason: 'inactive' });
            continue;
          }
          live.push(row);
        }

        // Preserve saved order (most recently saved first)
        const order = new Map(savedIds.map((id, i) => [id, i]));
        live.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

        if (!cancelled) {
          setLiveProperties(live);
          setUnavailable(gone);
        }
      } catch (err) {
        console.error('Saved listings refresh failed:', err);
        if (!cancelled) {
          // Fall back to snapshots only — build minimal Property-like rows is heavy;
          // show empty live list but don't crash.
          setLiveProperties([]);
          setUnavailable(
            savedList.map((s) => ({
              id: s.id,
              title: s.title,
              city: s.city,
              reason: 'removed' as const,
            })),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [savedIds, savedList]);

  const handleRemoveUnavailable = (id: string) => {
    remove(id);
    setUnavailable((prev) => prev.filter((u) => u.id !== id));
  };

  const isEmpty = savedList.length === 0;

  return (
    <div className="min-h-screen xpx-page pb-24 md:pb-12">
      <SEOHead
        config={{
          title: 'Saved stays | XpressBnB',
          description: 'Your saved couple-friendly and hourly stays on XpressBnB.',
          canonical: 'https://xpressbnb.com/saved',
        }}
      />

      <header
        className="sticky top-0 z-30 border-b border-xpx-border"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-xpx-text" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-xpx-text tracking-tight">Saved</h1>
            <p className="text-xs text-xpx-muted">
              {isEmpty ? 'No stays saved yet' : `${savedList.length} saved on this device`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {isEmpty ? (
          <div
            className="rounded-2xl p-8 sm:p-12 text-center"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border)',
              boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(80,200,120,0.12)' }}
            >
              <Bookmark className="w-7 h-7" style={{ color: 'var(--xpx-warm)' }} />
            </div>
            <h2 className="text-xl font-extrabold text-xpx-text mb-2">No saved stays yet</h2>
            <p className="text-sm text-xpx-muted max-w-sm mx-auto mb-6 leading-relaxed">
              Tap the heart on any listing to save it here. Your saved stays stay on this device — no
              account needed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/explore')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all"
                style={{
                  background: 'var(--xpx-warm, #50C878)',
                  boxShadow: '0 6px 20px rgba(80,200,120,0.35)',
                }}
              >
                <Compass className="w-4 h-4" />
                Explore cities
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/stays/rishikesh')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-xpx-text transition-colors hover:bg-slate-100"
                style={{ border: '1px solid var(--xpx-border)' }}
              >
                Browse Rishikesh stays
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {savedList.map((s) => (
              <div
                key={s.id}
                className="h-72 rounded-2xl animate-pulse"
                style={{ background: 'var(--xpx-surface-light)' }}
              />
            ))}
          </div>
        ) : (
          <>
            {liveProperties.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
                {liveProperties.map((property) => (
                  <ConversionPropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {unavailable.length > 0 && (
              <section className={liveProperties.length > 0 ? 'mt-10' : ''}>
                <h2 className="text-sm font-bold text-xpx-muted uppercase tracking-wide mb-3">
                  No longer available
                </h2>
                <ul className="space-y-3">
                  {unavailable.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: 'var(--xpx-surface)',
                        border: '1px solid var(--xpx-border)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xpx-text text-sm truncate">{item.title}</p>
                        <p className="text-xs text-xpx-muted">
                          {item.city} ·{' '}
                          {item.reason === 'inactive'
                            ? 'Listing paused by host'
                            : 'Listing no longer found'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUnavailable(item.id)}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 text-xpx-muted"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {liveProperties.length === 0 && unavailable.length === 0 && (
              <p className="text-sm text-xpx-muted text-center py-8">
                Could not refresh saved listings. Try again later or explore new stays.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
