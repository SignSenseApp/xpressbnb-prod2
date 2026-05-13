import { Eye, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { generateVisibilityDiagnostics } from '../../lib/premiumData';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface VisibilityDiagnosticsProps {
  // Visibility diagnostics is a heuristic display reading several optional
  // property fields with safe fallbacks in `generateVisibilityDiagnostics`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function VisibilityDiagnostics({
  property,
  locked = false,
  onUpgrade,
}: VisibilityDiagnosticsProps) {
  const diagnostics = generateVisibilityDiagnostics(property);

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Eye className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Demand & Visibility Diagnostics</h3>
          <p className="text-sm text-gray-600">
            Analyze your property performance vs market averages
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700 font-medium mb-1">Visibility Score</div>
          <div className={`text-3xl font-bold ${getScoreColor(diagnostics.visibilityScore)}`}>
            {diagnostics.visibilityScore}
            <span className="text-lg text-gray-600">/100</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            {diagnostics.visibilityScore >= 70
              ? 'Excellent visibility'
              : diagnostics.visibilityScore >= 40
              ? 'Good, room for improvement'
              : 'Needs attention'}
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-700 font-medium mb-1">Conversion Rate</div>
          <div className="text-3xl font-bold text-purple-600">
            {diagnostics.conversionRate}%
          </div>
          <div className="mt-2 text-xs text-purple-600">Views to bookings</div>
        </div>

        <div
          className={`p-4 rounded-lg border ${getDemandColor(diagnostics.demandLevel)}`}
        >
          <div className="text-sm font-medium mb-1">Demand Level</div>
          <div className="text-3xl font-bold capitalize">{diagnostics.demandLevel}</div>
          <div className="mt-2 text-xs">Current market demand</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Market Comparison
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Avg. City Price</div>
            <div className="text-lg font-bold text-gray-900">
              ₹{diagnostics.cityAverages.avgPrice}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Avg. Bookings</div>
            <div className="text-lg font-bold text-gray-900">
              {diagnostics.cityAverages.avgBookings}/mo
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Avg. Views</div>
            <div className="text-lg font-bold text-gray-900">
              {diagnostics.cityAverages.avgViews}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Insights</h4>
        <div className="space-y-2">
          {diagnostics.insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg ${
                insight.type === 'positive'
                  ? 'bg-green-50 border border-green-200'
                  : insight.type === 'negative'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {insight.type === 'positive' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : insight.type === 'negative' ? (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm text-gray-700">{insight.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper
      locked={locked}
      title="Visibility Diagnostics"
      onUpgrade={onUpgrade}
    >
      {content}
    </PremiumFeatureWrapper>
  );
}
