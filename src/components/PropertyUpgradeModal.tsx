import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, X, Crown, Loader2, Check } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  images: string[];
  is_premium: boolean;
  premium_expiry: string | null;
}

interface PropertySubscription {
  subscription_status: string;
  subscription_end_date: string | null;
}

interface PropertyUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty: (propertyId: string) => void;
}

export default function PropertyUpgradeModal({ isOpen, onClose, onSelectProperty }: PropertyUpgradeModalProps) {
  const { host } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, PropertySubscription>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && host?.id) {
      loadProperties();
    }
  }, [isOpen, host?.id]);

  const loadProperties = async () => {
    if (!host?.id) return;

    try {
      setLoading(true);

      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, city, state, images, is_premium, premium_expiry')
        .eq('host_id', host.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      if (propertiesData && propertiesData.length > 0) {
        setProperties(propertiesData);

        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from('property_subscriptions')
          .select('property_id, subscription_status, subscription_end_date')
          .eq('host_id', host.id)
          .in('property_id', propertiesData.map(p => p.id));

        if (!subscriptionsError && subscriptionsData) {
          const subsMap: Record<string, PropertySubscription> = {};
          subscriptionsData.forEach(sub => {
            subsMap[sub.property_id] = {
              subscription_status: sub.subscription_status,
              subscription_end_date: sub.subscription_end_date,
            };
          });
          setSubscriptions(subsMap);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (selectedPropertyId) {
      onSelectProperty(selectedPropertyId);
      onClose();
    }
  };

  const getSubscriptionStatus = (propertyId: string) => {
    const sub = subscriptions[propertyId];
    if (!sub) return 'trial';
    return sub.subscription_status;
  };

  const isPropertyPremium = (propertyId: string) => {
    const status = getSubscriptionStatus(propertyId);
    return status === 'active';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-[#cc2b5e] to-[#753a88] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Select Property to Upgrade</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Choose which property you want to upgrade to premium. Premium costs ₹999/month per property.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#cc2b5e]" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active properties found</p>
              <p className="text-sm text-gray-500 mt-2">Add a property first to upgrade to premium</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {properties.map((property) => {
                const isPremium = isPropertyPremium(property.id);
                const isSelected = selectedPropertyId === property.id;

                return (
                  <button
                    key={property.id}
                    onClick={() => !isPremium && setSelectedPropertyId(property.id)}
                    disabled={isPremium}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isPremium
                        ? 'border-green-200 bg-green-50 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-[#cc2b5e] bg-pink-50'
                        : 'border-gray-200 hover:border-[#cc2b5e] hover:bg-pink-50/50'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                        {property.images?.[0] ? (
                          <img
                            src={property.images[0]}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                          {isPremium && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium whitespace-nowrap">
                              <Check className="w-3 h-3" />
                              Premium Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {property.city}, {property.state}
                        </p>
                        {isPremium && property.premium_expiry && (
                          <p className="text-xs text-gray-500 mt-2">
                            Premium until: {new Date(property.premium_expiry).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {!isPremium && (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'border-[#cc2b5e] bg-[#cc2b5e]'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={!selectedPropertyId || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#cc2b5e] to-[#753a88] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Upgrade Selected Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
