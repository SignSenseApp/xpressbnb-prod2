import { useState } from 'react';
import { FlaskConical, Play, Pause, CheckCircle, TrendingUp } from 'lucide-react';
import PremiumFeatureWrapper from './PremiumFeatureWrapper';

interface ABTest {
  id: string;
  type: 'title' | 'cover_image';
  status: 'draft' | 'active' | 'completed';
  variantA: {
    value: string;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  variantB: {
    value: string;
    impressions: number;
    clicks: number;
    ctr: number;
  };
  winner: 'A' | 'B' | 'inconclusive' | null;
  confidence: number;
}

interface ABTestingProps {
  property: any;
  locked?: boolean;
  onUpgrade?: () => void;
}

export default function ABTesting({ property, locked = false, onUpgrade }: ABTestingProps) {
  const [tests] = useState<ABTest[]>([
    {
      id: '1',
      type: 'title',
      status: 'active',
      variantA: {
        value: property?.title || 'Cozy 2BHK Apartment',
        impressions: 487,
        clicks: 23,
        ctr: 4.72,
      },
      variantB: {
        value: 'Luxurious Modern 2BHK with City View',
        impressions: 512,
        clicks: 34,
        ctr: 6.64,
      },
      winner: null,
      confidence: 78,
    },
  ]);

  const [showCreateTest, setShowCreateTest] = useState(false);
  const [newTestType, setNewTestType] = useState<'title' | 'cover_image'>('title');
  const [variantAValue, setVariantAValue] = useState('');
  const [variantBValue, setVariantBValue] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getWinnerColor = (winner: string, variant: string) => {
    if (winner === variant) {
      return 'ring-2 ring-green-500 bg-green-50';
    }
    return 'bg-gray-50';
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FlaskConical className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">A/B Testing</h3>
            <p className="text-sm text-gray-600">Test different listing variations</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateTest(!showCreateTest)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          {showCreateTest ? 'Cancel' : '+ New Test'}
        </button>
      </div>

      {showCreateTest && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-gray-900 mb-3">Create New A/B Test</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewTestType('title')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    newTestType === 'title'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Title
                </button>
                <button
                  onClick={() => setNewTestType('cover_image')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    newTestType === 'cover_image'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  Cover Image
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant A (Control)
              </label>
              <input
                type="text"
                value={variantAValue}
                onChange={(e) => setVariantAValue(e.target.value)}
                placeholder={
                  newTestType === 'title' ? 'Current title' : 'Current image URL'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant B (Test)
              </label>
              <input
                type="text"
                value={variantBValue}
                onChange={(e) => setVariantBValue(e.target.value)}
                placeholder={
                  newTestType === 'title' ? 'New title to test' : 'New image URL'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              disabled={!variantAValue || !variantBValue}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Start Test
            </button>
          </div>
        </div>
      )}

      {tests.length === 0 && !showCreateTest ? (
        <div className="text-center py-12">
          <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Tests Running</h4>
          <p className="text-sm text-gray-600 mb-4">
            Create your first A/B test to optimize your listing performance
          </p>
          <button
            onClick={() => setShowCreateTest(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Test
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {tests.map((test) => (
            <div
              key={test.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {test.type.replace('_', ' ')} Test
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                        test.status
                      )}`}
                    >
                      {test.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {test.status === 'active' ? (
                      <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <Pause className="w-4 h-4 text-gray-600" />
                      </button>
                    ) : (
                      <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <Play className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div
                    className={`p-4 rounded-lg border-2 ${getWinnerColor(
                      test.winner || '',
                      'A'
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">Variant A</span>
                      {test.winner === 'A' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3 font-medium">
                      {test.variantA.value}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Views</div>
                        <div className="font-bold text-gray-900">{test.variantA.impressions}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Clicks</div>
                        <div className="font-bold text-gray-900">{test.variantA.clicks}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">CTR</div>
                        <div className="font-bold text-gray-900">{test.variantA.ctr}%</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${getWinnerColor(
                      test.winner || '',
                      'B'
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">Variant B</span>
                      {test.winner === 'B' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3 font-medium">
                      {test.variantB.value}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Views</div>
                        <div className="font-bold text-gray-900">{test.variantB.impressions}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Clicks</div>
                        <div className="font-bold text-gray-900">{test.variantB.clicks}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">CTR</div>
                        <div className="font-bold text-gray-900">{test.variantB.ctr}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">
                        {test.winner
                          ? `Variant ${test.winner} is performing ${Math.abs(
                              test.variantB.ctr - test.variantA.ctr
                            ).toFixed(1)}% better`
                          : 'Test in progress, collecting data...'}
                      </span>
                    </div>
                    <span className="text-xs text-purple-700 font-medium">
                      {test.confidence}% confidence
                    </span>
                  </div>
                </div>

                {test.confidence >= 95 && test.winner && (
                  <button className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    Apply Winner & End Test
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>How it works:</strong> Traffic is split 50/50 between variants. Tests run until
          statistical significance (95% confidence) is reached. No duplicate listings are created.
        </p>
      </div>
    </div>
  );

  return (
    <PremiumFeatureWrapper locked={locked} title="A/B Testing" onUpgrade={onUpgrade}>
      {content}
    </PremiumFeatureWrapper>
  );
}
