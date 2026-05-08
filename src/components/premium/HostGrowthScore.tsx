import { Trophy, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { generateGrowthScore } from '../../lib/premiumData';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface HostGrowthScoreProps {
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function HostGrowthScore({
  property,
  locked = false,
  onUpgrade,
}: HostGrowthScoreProps) {
  const score = generateGrowthScore(property);

  const getScoreColor = (value: number) => {
    if (value >= 70) return 'text-green-600 bg-green-100 border-green-300';
    if (value >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const getScoreGradient = (value: number) => {
    if (value >= 70) return 'from-green-500 to-emerald-500';
    if (value >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getTrendIcon = () => {
    switch (score.trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Trophy className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Host Growth Score™</h3>
          <p className="text-sm text-gray-600">Your property performance rating</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 mb-6 border border-gray-200">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-300"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(score.overall / 100) * 352} 352`}
                className={`bg-gradient-to-r ${getScoreGradient(score.overall)}`}
                style={{
                  stroke: score.overall >= 70 ? '#3dae68' : score.overall >= 50 ? '#eab308' : '#ef4444',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-900">{score.overall}</div>
              <div className="text-sm text-gray-600">out of 100</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          {getTrendIcon()}
          <span className="text-sm font-medium text-gray-700 capitalize">{score.trend}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Completeness</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(score.completeness)}`}
                  style={{ width: `${score.completeness}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{score.completeness}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Pricing</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(score.pricing)}`}
                  style={{ width: `${score.pricing}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{score.pricing}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Conversion</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(score.conversion)}`}
                  style={{ width: `${score.conversion}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{score.conversion}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Response</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreGradient(score.response)}`}
                  style={{ width: `${score.response}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900">{score.response}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600" />
          Improvement Actions
        </h4>
        <div className="space-y-3">
          {score.suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-semibold text-gray-900">{suggestion.title}</h5>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactBadge(
                    suggestion.impact
                  )}`}
                >
                  {suggestion.impact} impact
                </span>
              </div>
              <p className="text-sm text-gray-600">{suggestion.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="Host Growth Score™" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
