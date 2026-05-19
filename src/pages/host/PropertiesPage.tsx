import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Plus, CreditCard as Edit, Trash2, Eye, EyeOff, MapPin, CheckCircle, ChevronDown, ChevronUp, Sparkles, Crown } from 'lucide-react';
import PropertyListingForm from '../../components/PropertyListingForm';
import { hasPremiumAccess, getPremiumBadgeText } from '../../lib/premium';
import ABTesting from '../../components/premium/ABTesting';
import type { Property } from '../../lib/database.types';

export default function PropertiesPage() {
  const { host } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingProperty(null);
    setShowForm(true);
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowForm(true);
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);

      if (error) throw error;
      await loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const handleToggleActive = async (property: Property) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_active: !property.is_active })
        .eq('id', property.id);

      if (error) throw error;
      await loadProperties();
    } catch (error) {
      console.error('Error toggling property status:', error);
      alert('Failed to update property status');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProperty(null);
    loadProperties();
  };

  const goToSubscription = (propertyId: string, tier: 'standard_999' | 'premium_2999' = 'standard_999') => {
    if (!host) return;
    const path = `/host/${host.id}/dashboard/subscription?property=${propertyId}&tier=${tier}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--xpx-warm)' }} />
      </div>
    );
  }

  if (showForm) {
    return <PropertyListingForm property={editingProperty} onClose={handleFormClose} onSuccess={handleFormClose} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="xpx-eyebrow">Listings</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Properties</h1>
          <p className="text-xpx-muted mt-2">Manage your property listings</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all"
          style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <Building2 className="w-16 h-16 text-xpx-subtle mx-auto mb-4" />
          <h3 className="text-xl font-bold text-xpx-text mb-2">No properties yet</h3>
          <p className="text-xpx-muted mb-6">Start by adding your first property listing</p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all"
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
          >
            <Plus className="w-5 h-5" />
            Add Your First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
            >
              <div className="h-48 relative" style={{ background: 'var(--xpx-surface-light)' }}>
                {property.images?.[0] ? (
                  <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-xpx-subtle" />
                  </div>
                )}
                {/* Bottom gradient for legibility */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.55) 100%)' }}
                />
                <div className="absolute top-4 right-4 flex gap-2 flex-wrap">
                  {property.is_verified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{ background: 'var(--xpx-warm)', color: '#ffffff' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={
                      property.is_active
                        ? { background: 'rgba(80,200,120,0.12)', color: '#3dae68', border: '1px solid rgba(80,200,120,0.3)' }
                        : { background: 'rgba(220,38,38,0.10)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.3)' }
                    }
                  >
                    {property.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-xpx-text mb-2">{property.title}</h3>
                <div className="flex items-center text-xpx-muted mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">
                    {property.city}, {property.state}
                  </span>
                </div>
                <p className="text-xpx-muted text-sm mb-4 line-clamp-2">{property.description}</p>
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-xs uppercase tracking-wider text-xpx-subtle font-bold">Per day</span>
                  <span className="font-extrabold text-xpx-text text-lg">
                    ₹{(property.price_per_day || property.price_full_day || 0).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-xpx-muted mb-4">
                  {property.bedrooms} bed · {property.bathrooms} bath · {property.max_guests} guests
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleToggleActive(property)}
                    className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors text-xpx-text"
                    style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border-strong)' }}
                  >
                    {property.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {property.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEdit(property)}
                    className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
                    style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.25)' }}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
                    style={{ background: 'rgba(220,38,38,0.06)', color: '#B91C1C', border: '1px solid rgba(220,38,38,0.25)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                <div className="mt-4 pt-4 xpx-divider">
                  <button
                    onClick={() =>
                      setExpandedPropertyId(
                        expandedPropertyId === property.id ? null : property.id
                      )
                    }
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
                    style={{
                      background:
                        'linear-gradient(120deg, rgba(80,200,120,0.08) 0%, var(--xpx-surface-light) 100%)',
                      border: '1px solid rgba(80,200,120,0.3)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" style={{ color: 'var(--xpx-warm)' }} />
                      <span className="text-sm font-semibold text-xpx-text">Premium Insights</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={
                          hasPremiumAccess(property)
                            ? { background: 'rgba(80,200,120,0.10)', color: '#3dae68' }
                            : { background: 'rgba(15,23,42,0.05)', color: 'rgba(15,23,42,0.55)' }
                        }
                      >
                        {getPremiumBadgeText(property)}
                      </span>
                    </div>
                    {expandedPropertyId === property.id ? (
                      <ChevronUp className="w-4 h-4 text-xpx-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-xpx-muted" />
                    )}
                  </button>

                  {expandedPropertyId === property.id && (
                    <div className="mt-4">
                      {hasPremiumAccess(property) ? (
                        <ABTesting property={property} />
                      ) : (
                        <div
                          className="rounded-xl p-6"
                          style={{
                            background:
                              'linear-gradient(135deg, rgba(80,200,120,0.08) 0%, var(--xpx-surface-light) 100%)',
                            border: '1px solid var(--xpx-border-strong)',
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'var(--xpx-warm)', color: '#ffffff' }}
                            >
                              <Crown className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-xpx-text mb-2">Upgrade to Premium</h4>
                              <p className="text-sm text-xpx-muted mb-4">
                                Unlock advanced analytics, AI insights, calendar sync, and verified badge for this property.
                              </p>
                              <div className="flex items-center gap-4 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => goToSubscription(property.id, 'standard_999')}
                                  className="px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
                                  style={{
                                    background: 'var(--xpx-warm)',
                                    color: '#ffffff',
                                    boxShadow: '0 6px 20px rgba(80,200,120,0.35)',
                                  }}
                                >
                                  <Crown className="w-4 h-4" />
                                  Upgrade on Subscription page
                                </button>
                                <span className="text-sm text-xpx-muted">Cancel anytime</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
