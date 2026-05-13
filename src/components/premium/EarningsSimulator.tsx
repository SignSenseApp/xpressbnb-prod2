import { useState } from 'react';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface EarningsSimulatorProps {
  // Simulator reads only a couple of optional fields with safe fallbacks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function EarningsSimulator({
  property,
  locked = false,
  onUpgrade,
}: EarningsSimulatorProps) {
  const currentPrice = property?.price_per_day || 2000;
  const [pricePerNight, setPricePerNight] = useState(currentPrice);
  const [occupancyRate, setOccupancyRate] = useState(60);
  const [weekendUplift, setWeekendUplift] = useState(20);

  const daysInMonth = 30;
  const weekdaysInMonth = Math.floor(daysInMonth * (5 / 7));
  const weekendsInMonth = daysInMonth - weekdaysInMonth;

  const weekdayPrice = pricePerNight;
  const weekendPrice = Math.round(pricePerNight * (1 + weekendUplift / 100));

  const occupiedWeekdays = Math.round((weekdaysInMonth * occupancyRate) / 100);
  const occupiedWeekends = Math.round((weekendsInMonth * occupancyRate) / 100);

  const weekdayRevenue = occupiedWeekdays * weekdayPrice;
  const weekendRevenue = occupiedWeekends * weekendPrice;
  const totalRevenue = weekdayRevenue + weekendRevenue;

  const platformFee = Math.round(totalRevenue * 0);
  const netEarnings = totalRevenue - platformFee;

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Calculator className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Earnings Simulator</h3>
          <p className="text-sm text-gray-600">Estimate your monthly income potential</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per Night
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="500"
                max="10000"
                step="100"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center gap-1 min-w-[100px] px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-600">₹</span>
                <input
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(Number(e.target.value))}
                  className="w-full bg-transparent text-gray-900 font-semibold outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: ₹{currentPrice} | Market avg: ₹2800
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Occupancy Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={occupancyRate}
                onChange={(e) => setOccupancyRate(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center gap-1 min-w-[80px] px-3 py-2 bg-gray-100 rounded-lg">
                <input
                  type="number"
                  value={occupancyRate}
                  onChange={(e) => setOccupancyRate(Number(e.target.value))}
                  className="w-full bg-transparent text-gray-900 font-semibold outline-none"
                />
                <span className="text-gray-600">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {occupancyRate < 40
                ? 'Low - Focus on visibility'
                : occupancyRate < 70
                ? 'Good - Room for growth'
                : 'Excellent - Peak performance'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekend Uplift
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={weekendUplift}
                onChange={(e) => setWeekendUplift(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex items-center gap-1 min-w-[80px] px-3 py-2 bg-gray-100 rounded-lg">
                <span className="text-gray-600">+</span>
                <input
                  type="number"
                  value={weekendUplift}
                  onChange={(e) => setWeekendUplift(Number(e.target.value))}
                  className="w-full bg-transparent text-gray-900 font-semibold outline-none"
                />
                <span className="text-gray-600">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Weekend price: ₹{weekendPrice}/night</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
          <h4 className="text-sm font-semibold text-emerald-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Estimated Monthly Earnings
          </h4>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Weekday Revenue</span>
                <span className="text-sm text-gray-500">
                  {occupiedWeekdays} nights × ₹{weekdayPrice}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                ₹{weekdayRevenue.toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Weekend Revenue</span>
                <span className="text-sm text-gray-500">
                  {occupiedWeekends} nights × ₹{weekendPrice}
                </span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                ₹{weekendRevenue.toLocaleString()}
              </div>
            </div>

            <div className="border-t-2 border-emerald-200 pt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Gross Revenue</span>
                <span className="text-sm text-gray-500">
                  {occupiedWeekdays + occupiedWeekends} nights total
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                ₹{totalRevenue.toLocaleString()}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Platform Fee (0%)</span>
                <span className="font-semibold text-green-700">-₹{platformFee.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Net Earnings</span>
              </div>
              <div className="text-3xl font-bold">₹{netEarnings.toLocaleString()}</div>
              <p className="text-xs text-emerald-100 mt-1">After platform fees</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
          <div className="text-xs text-blue-700 mb-1">Avg per Night</div>
          <div className="text-lg font-bold text-blue-900">
            ₹
            {Math.round(
              totalRevenue / (occupiedWeekdays + occupiedWeekends || 1)
            ).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-center">
          <div className="text-xs text-purple-700 mb-1">Annual Projection</div>
          <div className="text-lg font-bold text-purple-900">
            ₹{(netEarnings * 12).toLocaleString()}
          </div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
          <div className="text-xs text-orange-700 mb-1">Occupied Nights</div>
          <div className="text-lg font-bold text-orange-900">
            {occupiedWeekdays + occupiedWeekends}/30
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-xs text-yellow-800">
          <strong>Simulation Only:</strong> Actual earnings depend on market demand, seasonality,
          and property quality. These estimates do not guarantee actual results.
        </p>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="Earnings Simulator" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
