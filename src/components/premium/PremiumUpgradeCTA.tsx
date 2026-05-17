import { Lock, Sparkles } from 'lucide-react';
import { PREMIUM_PRICE } from '../../lib/premium';

interface PremiumUpgradeCTAProps {
  title: string;
  description?: string;
  compact?: boolean;
  onUpgrade?: () => void;
}

export default function PremiumUpgradeCTA({
  title,
  description,
  compact = false,
  onUpgrade,
}: PremiumUpgradeCTAProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-900">{title}</span>
        </div>
        <button
          onClick={onUpgrade}
          className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-medium rounded-md hover:from-emerald-700 hover:to-emerald-800 transition-all"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-50 p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32" />

      <div className="relative text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>

        {description && (
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
        )}

        <div className="mb-6">
          <div className="inline-flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-bold text-gray-900">₹{PREMIUM_PRICE}</span>
            <span className="text-gray-600">/month per property</span>
          </div>
          <p className="text-sm text-emerald-700 font-medium">
            Paid listings get higher visibility & smarter insights
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
        >
          <Lock className="w-5 h-5" />
          Upgrade to Paid Listing
        </button>

        <div className="mt-6 pt-6 border-t border-emerald-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-left">
              <div className="font-semibold text-gray-900 mb-1">✓ Smart Pricing</div>
              <div className="text-gray-600 text-xs">AI-powered price recommendations</div>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 mb-1">✓ Growth Score</div>
              <div className="text-gray-600 text-xs">Track your performance metrics</div>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 mb-1">✓ AI Host Coach</div>
              <div className="text-gray-600 text-xs">24/7 personalized guidance</div>
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900 mb-1">✓ Demand Forecast</div>
              <div className="text-gray-600 text-xs">Predict booking trends</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
