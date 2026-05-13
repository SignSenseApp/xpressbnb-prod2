import { DollarSign, TrendingUp, TrendingDown, Info, Lightbulb } from 'lucide-react';
import { generateSmartPricing } from '../../lib/premiumData';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface SmartPricingProps {
  // Heuristic display widget; reads several optional property fields with
  // safe fallbacks in `generateSmartPricing`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function SmartPricing({
  property,
  locked = false,
  onUpgrade,
}: SmartPricingProps) {
  const pricing = generateSmartPricing(property);

  const priceDiff = pricing.optimalPrice - pricing.currentPrice;
  const isHigher = priceDiff > 0;
  const diffPercent = Math.abs((priceDiff / pricing.currentPrice) * 100).toFixed(1);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <DollarSign className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Smart Pricing</h3>
          <p className="text-sm text-gray-600">AI-powered price recommendations</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-green-700 font-medium mb-1">Current Price</div>
            <div className="text-3xl font-bold text-gray-900">₹{pricing.currentPrice}</div>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              isHigher ? 'bg-green-200' : 'bg-red-200'
            }`}
          >
            {isHigher ? (
              <TrendingUp className="w-5 h-5 text-green-700" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-700" />
            )}
            <span className={`font-semibold ${isHigher ? 'text-green-700' : 'text-red-700'}`}>
              {isHigher ? '+' : ''}
              {diffPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Suggested Min</div>
            <div className="text-lg font-bold text-gray-900">₹{pricing.suggestedMin}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3 ring-2 ring-green-400">
            <div className="text-xs text-green-700 font-medium mb-1">Optimal Price</div>
            <div className="text-lg font-bold text-green-700">₹{pricing.optimalPrice}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Suggested Max</div>
            <div className="text-lg font-bold text-gray-900">₹{pricing.suggestedMax}</div>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceBadge(
            pricing.confidence
          )}`}
        >
          <Info className="w-3 h-3" />
          {pricing.confidence.charAt(0).toUpperCase() + pricing.confidence.slice(1)} Confidence
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
          Why This Price?
        </h4>
        <div className="space-y-2">
          {pricing.reasoning.map((reason, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Estimated Impact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-blue-700 mb-1">Booking Change</div>
            <div
              className={`text-2xl font-bold ${
                pricing.estimatedImpact.bookingIncrease >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {pricing.estimatedImpact.bookingIncrease >= 0 ? '+' : ''}
              {pricing.estimatedImpact.bookingIncrease}%
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-700 mb-1">Monthly Revenue Impact</div>
            <div
              className={`text-2xl font-bold ${
                pricing.estimatedImpact.revenueImpact >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {pricing.estimatedImpact.revenueImpact >= 0 ? '+' : ''}₹
              {Math.abs(pricing.estimatedImpact.revenueImpact).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> These are suggestions only. You have full control over your
          pricing. The system will never automatically change your prices.
        </p>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="Smart Pricing" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
