import { Lock } from 'lucide-react';
import { ReactNode } from 'react';
import { PREMIUM_PRICE } from '../../lib/premium';

interface PremiumFeatureWrapperProps {
  locked: boolean;
  children: ReactNode;
  title?: string;
  onUpgrade?: () => void;
}

export default function PremiumFeatureWrapper({
  locked,
  children,
  title = 'Premium Feature',
  onUpgrade,
}: PremiumFeatureWrapperProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40">{children}</div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center p-6 max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-full mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>

          <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>

          <p className="text-sm text-gray-600 mb-4">
            Upgrade to Paid Listing to unlock premium intelligence features
          </p>

          <div className="mb-4">
            <span className="text-2xl font-bold text-gray-900">₹{PREMIUM_PRICE}</span>
            <span className="text-sm text-gray-600">/month</span>
          </div>

          <button
            onClick={onUpgrade}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
