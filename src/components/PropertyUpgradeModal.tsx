import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, X, Crown, Loader2, Check } from 'lucide-react';
import {
  formatInr,
  subscriptionAmountInr,
  type HostBillingCycle,
  type HostPlanTier,
} from '../lib/hostSubscriptionPricing';

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
  plan_tier?: string;
}

interface PropertyUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProperty: (propertyId: string) => void;
  planTier: HostPlanTier;
  billingCycle: HostBillingCycle;
}

export default function PropertyUpgradeModal({
  isOpen,
  onClose,
  onSelectProperty,
  planTier,
  billingCycle,
}: PropertyUpgradeModalProps) {
  const { host } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, PropertySubscription>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const planLabel = planTier === 'premium_2999' ? 'Premium' : 'Standard';
  const amountInr = subscriptionAmountInr(planTier, billingCycle);
  const cadenceLabel = billingCycle === 'yearly' ? 'year' : 'month';

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
          .select('property_id, subscription_status, subscription_end_date, plan_tier')
          .eq('host_id', host.id)
          .in('property_id', propertiesData.map((p) => p.id));

        if (!subscriptionsError && subscriptionsData) {
          const subsMap: Record<string, PropertySubscription> = {};
          subscriptionsData.forEach((sub) => {
            subsMap[sub.property_id] = {
              subscription_status: sub.subscription_status,
              subscription_end_date: sub.subscription_end_date,
              plan_tier: sub.plan_tier,
            };
          });
          setSubscriptions(subsMap);
        }
      } else {
        setProperties([]);
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

  const isPropertyOnPlan = (propertyId: string) => {
    const sub = subscriptions[propertyId];
    if (!sub || sub.subscription_status !== 'active') return false;
    if (planTier === 'premium_2999') return sub.plan_tier === 'premium_2999';
    return sub.plan_tier === 'standard_999' || sub.plan_tier === 'premium_2999';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-[#50C878] to-[#3dae68] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Select property — {planLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            ₹{formatInr(amountInr)}/{cadenceLabel} per property ({billingCycle} billing). Choose a
            property to open Razorpay checkout.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#50C878]" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No active properties found</p>
              <p className="text-sm text-gray-500 mt-2">Add a property first to upgrade</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {properties.map((property) => {
                const onPlan = isPropertyOnPlan(property.id);
                const isSelected = selectedPropertyId === property.id;

                return (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => !onPlan && setSelectedPropertyId(property.id)}
                    disabled={onPlan}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      onPlan
                        ? 'border-green-200 bg-green-50 cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'border-[#50C878] bg-pink-50'
                          : 'border-gray-200 hover:border-[#50C878] hover:bg-pink-50/50'
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
                          {onPlan && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium whitespace-nowrap">
                              <Check className="w-3 h-3" />
                              Active plan
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {property.city}, {property.state}
                        </p>
                      </div>
                      {!onPlan && (
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-[#50C878] bg-[#50C878]' : 'border-gray-300'
                          }`}
                        >
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
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={!selectedPropertyId || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#50C878] to-[#3dae68] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Pay with Razorpay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}