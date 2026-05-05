import { useState } from 'react';
import { Calendar, TrendingUp, Zap, MapPin } from 'lucide-react';
import { generateDemandForecast } from '../../lib/premiumData';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface DemandForecastProps {
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function DemandForecast({
  property,
  locked = false,
  onUpgrade,
}: DemandForecastProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7_day' | '30_day'>('7_day');
  const forecast = generateDemandForecast(selectedPeriod);

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'from-green-500 to-emerald-500';
      case 'medium':
        return 'from-yellow-500 to-orange-500';
      case 'low':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getDemandBadge = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Demand Forecast</h3>
            <p className="text-sm text-gray-600">Predict booking trends for your property</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('7_day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPeriod === '7_day'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('30_day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPeriod === '30_day'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      <div
        className={`bg-gradient-to-br ${getDemandColor(
          forecast.demandLevel
        )} rounded-xl p-8 mb-6 text-white`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm mb-1">Predicted Demand Level</p>
            <h4 className="text-4xl font-bold capitalize">{forecast.demandLevel}</h4>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm mb-1">Demand Score</p>
            <div className="text-4xl font-bold">{forecast.score}/100</div>
          </div>
        </div>

        <div className="w-full h-4 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-500"
            style={{ width: `${forecast.score}%` }}
          />
        </div>

        <p className="mt-4 text-white/90 text-sm">
          {selectedPeriod === '7_day'
            ? 'Next 7 days show strong booking potential'
            : 'Month ahead indicates favorable market conditions'}
        </p>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          Key Factors
        </h4>
        <div className="space-y-2">
          {forecast.reasons.map((reason, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
              <p className="text-sm text-gray-700">{reason}</p>
            </div>
          ))}
        </div>
      </div>

      {forecast.events.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            Upcoming Events
          </h4>
          <div className="space-y-3">
            {forecast.events.map((event, index) => (
              <div
                key={index}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-yellow-600" />
                    <h5 className="font-semibold text-gray-900">{event.name}</h5>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getDemandBadge(
                      event.impact
                    )}`}
                  >
                    {event.impact} impact
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className={`text-xs font-medium ${getImpactColor(event.impact)}`}>
                  Expected to {event.impact === 'high' ? 'significantly boost' : 'increase'}{' '}
                  bookings in the area
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Forecasts are based on historical data, seasonal trends, and
          local events. Actual demand may vary. Use this as a guide for pricing and availability
          decisions.
        </p>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="Demand Forecast" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
