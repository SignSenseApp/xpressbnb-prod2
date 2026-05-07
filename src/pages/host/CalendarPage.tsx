import { useState, useEffect } from 'react';
import { Calendar, Plus, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import HostCalendarManager from '../../components/HostCalendarManager';

interface Property {
  id: string;
  title: string;
  price_per_day: number;
  price_full_day: number;
  city: string;
  state: string;
}

interface CalendarPageProps {
  hostId: string;
}

export default function CalendarPage({ hostId }: CalendarPageProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [newBasePrice, setNewBasePrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, [hostId]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, price_per_day, price_full_day, city, state')
        .eq('host_id', hostId)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;

      setProperties(data || []);
      if (data && data.length > 0 && !selectedProperty) {
        setSelectedProperty(data[0]);
        setNewBasePrice((data[0].price_per_day || data[0].price_full_day).toString());
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBasePrice = async () => {
    if (!selectedProperty || !newBasePrice) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ price_per_day: parseInt(newBasePrice) })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setSelectedProperty({
        ...selectedProperty,
        price_per_day: parseInt(newBasePrice)
      });

      setShowPriceEditor(false);
      fetchProperties();
    } catch (error) {
      console.error('Error updating base price:', error);
      alert('Failed to update base price. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--xpx-warm)' }} />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 text-center"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <Calendar className="w-16 h-16 text-xpx-subtle mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-xpx-text mb-2">No Properties Yet</h2>
        <p className="text-xpx-muted mb-6">
          Add your first property to start managing availability and pricing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="xpx-eyebrow">Availability</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Calendar Management</h1>
        <p className="text-xpx-muted mt-2">Manage availability and pricing for your properties</p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            Select Property
          </label>
          <select
            value={selectedProperty?.id || ''}
            onChange={(e) => {
              const property = properties.find((p) => p.id === e.target.value);
              if (property) {
                setSelectedProperty(property);
                setNewBasePrice((property.price_per_day || property.price_full_day).toString());
              }
            }}
            className="xpx-input"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title} — {property.city}, {property.state}
              </option>
            ))}
          </select>
        </div>

        {selectedProperty && (
          <div
            className="mb-6 p-5 rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(80,200,120,0.06) 0%, var(--xpx-surface-light) 100%)',
              border: '1px solid var(--xpx-border-strong)',
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="xpx-eyebrow">Base Price Per Night</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-xpx-text">
                    ₹{(selectedProperty.price_per_day || selectedProperty.price_full_day).toLocaleString()}
                  </span>
                  <span className="text-xpx-muted">/night</span>
                </div>
              </div>
              {!showPriceEditor ? (
                <button
                  onClick={() => setShowPriceEditor(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-xpx-text"
                  style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)' }}
                >
                  <DollarSign className="w-4 h-4" />
                  Update Base Price
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="number"
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    placeholder="New price"
                    className="xpx-input w-32 py-2"
                  />
                  <button
                    onClick={handleUpdateBasePrice}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ background: 'var(--xpx-warm)', color: '#ffffff' }}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPriceEditor(false);
                      setNewBasePrice((selectedProperty.price_per_day || selectedProperty.price_full_day).toString());
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors text-xpx-text"
                    style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-xpx-subtle mt-3">
              Default price for all dates. Set custom prices for specific dates below.
            </p>
          </div>
        )}
      </div>

      {selectedProperty && (
        <>
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)' }}
          >
            <h3 className="font-semibold text-xpx-text mb-2">How to use the calendar</h3>
            <ul className="text-sm text-xpx-muted space-y-1">
              <li>• <strong className="text-xpx-text">Click dates</strong> to select multiple dates at once</li>
              <li>• <strong className="text-xpx-text">Click &ldquo;Update Selected Dates&rdquo;</strong> to bulk edit availability and pricing</li>
              <li>• <strong className="text-xpx-text">Hover over dates</strong> and click the lock icon to quickly block/unblock individual dates</li>
              <li>• <strong className="text-xpx-text">Yellow dates</strong> are already booked and cannot be modified</li>
              <li>• <strong className="text-xpx-text">Custom prices</strong> override the base price for specific dates</li>
            </ul>
          </div>

          <HostCalendarManager
            propertyId={selectedProperty.id}
            basePrice={selectedProperty.price_per_day || selectedProperty.price_full_day}
            onUpdateBasePrice={(newPrice) => {
              setSelectedProperty({ ...selectedProperty, price_per_day: newPrice });
            }}
          />
        </>
      )}
    </div>
  );
}
