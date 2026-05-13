export interface VisibilityDiagnostics {
  visibilityScore: number;
  conversionRate: number;
  demandLevel: 'low' | 'medium' | 'high';
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    message: string;
  }>;
  cityAverages: {
    avgPrice: number;
    avgBookings: number;
    avgViews: number;
  };
}

export interface SmartPricing {
  currentPrice: number;
  suggestedMin: number;
  suggestedMax: number;
  optimalPrice: number;
  reasoning: string[];
  estimatedImpact: {
    bookingIncrease: number;
    revenueImpact: number;
  };
  confidence: 'low' | 'medium' | 'high';
}

export interface GrowthScore {
  overall: number;
  completeness: number;
  pricing: number;
  conversion: number;
  response: number;
  trend: 'improving' | 'stable' | 'declining';
  suggestions: Array<{
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

export interface DemandForecast {
  period: '7_day' | '30_day';
  demandLevel: 'low' | 'medium' | 'high';
  score: number;
  reasons: string[];
  events: Array<{
    name: string;
    date: string;
    impact: 'high' | 'medium' | 'low';
  }>;
}

// These generators read fragmented property fields straight from Supabase
// rows (which include open JSON columns like `stats`). The `any` is a
// pragmatic boundary; field accesses are individually defaulted below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateVisibilityDiagnostics(property: any): VisibilityDiagnostics {
  const stats = property?.stats || {};
  const totalViews = stats.total_views || 0;
  const pricePerDay = property?.price_per_day || 2000;
  const images = property?.images || [];

  const visibilityScore = Math.min(100, Math.max(0,
    (totalViews / 100) * 30 +
    (images.length / 10) * 20 +
    (pricePerDay < 3000 ? 30 : 15) +
    20
  ));

  const conversionRate = totalViews > 0 ? ((stats.total_bookings || 0) / totalViews) * 100 : 0;

  const insights = [];

  if (images.length < 5) {
    insights.push({
      type: 'negative' as const,
      message: `Low photo count (${images.length}) affecting visibility. Add ${5 - images.length} more photos.`,
    });
  } else {
    insights.push({
      type: 'positive' as const,
      message: `Good photo coverage with ${images.length} images.`,
    });
  }

  if (pricePerDay > 3500) {
    insights.push({
      type: 'negative' as const,
      message: `Price is higher than nearby listings. Consider reducing by ₹${Math.round((pricePerDay - 3000) / 100) * 100}.`,
    });
  } else if (pricePerDay < 1500) {
    insights.push({
      type: 'neutral' as const,
      message: 'Price is competitive, but you may be undervaluing your property.',
    });
  } else {
    insights.push({
      type: 'positive' as const,
      message: 'Price is competitively positioned in the market.',
    });
  }

  if (conversionRate < 2) {
    insights.push({
      type: 'negative' as const,
      message: 'Low conversion rate. Improve listing description and amenities.',
    });
  }

  const demandLevel: 'low' | 'medium' | 'high' =
    visibilityScore > 70 ? 'high' : visibilityScore > 40 ? 'medium' : 'low';

  return {
    visibilityScore: Math.round(visibilityScore),
    conversionRate: Math.round(conversionRate * 10) / 10,
    demandLevel,
    insights,
    cityAverages: {
      avgPrice: 2800,
      avgBookings: 12,
      avgViews: 450,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateSmartPricing(property: any): SmartPricing {
  const currentPrice = property?.price_per_day || 2000;
  const location = property?.location || '';
  const amenities = property?.amenities?.length || 0;
  const images = property?.images?.length || 0;

  const basePrice = 2000;
  const amenityBonus = amenities * 100;
  const imageBonus = images * 50;
  const locationMultiplier = location.toLowerCase().includes('mumbai') ||
                            location.toLowerCase().includes('delhi') ? 1.3 : 1.0;

  const optimalPrice = Math.round((basePrice + amenityBonus + imageBonus) * locationMultiplier);
  const suggestedMin = Math.round(optimalPrice * 0.85);
  const suggestedMax = Math.round(optimalPrice * 1.15);

  const reasoning = [];

  if (currentPrice > optimalPrice * 1.2) {
    reasoning.push('Your current price is significantly higher than market average');
    reasoning.push('High prices may reduce booking rate by 40-60%');
    reasoning.push('Similar properties are priced 20% lower');
  } else if (currentPrice < optimalPrice * 0.8) {
    reasoning.push('You may be underpricing your property');
    reasoning.push('Similar listings charge 15-25% more');
    reasoning.push('Consider raising price to increase revenue');
  } else {
    reasoning.push('Your pricing is competitive with market rates');
    reasoning.push('Minor adjustments could optimize revenue');
  }

  reasoning.push(`Based on ${amenities} amenities and ${images} photos`);
  reasoning.push('Weekend demand typically 30% higher');

  const priceDiff = ((optimalPrice - currentPrice) / currentPrice) * 100;
  const bookingIncrease = priceDiff > 0 ? Math.min(50, Math.abs(priceDiff) * 0.8) : Math.max(-30, priceDiff * 0.5);
  const revenueImpact = ((optimalPrice * (100 + bookingIncrease) / 100) - currentPrice) * 15;

  return {
    currentPrice,
    suggestedMin,
    suggestedMax,
    optimalPrice,
    reasoning,
    estimatedImpact: {
      bookingIncrease: Math.round(bookingIncrease),
      revenueImpact: Math.round(revenueImpact),
    },
    confidence: amenities > 5 && images > 5 ? 'high' : amenities > 3 ? 'medium' : 'low',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateGrowthScore(property: any): GrowthScore {
  const stats = property?.stats || {};
  const images = property?.images?.length || 0;
  const amenities = property?.amenities?.length || 0;
  const description = property?.description || '';
  const pricePerDay = property?.price_per_day || 2000;
  const totalViews = stats.total_views || 0;

  const completeness = Math.min(100,
    (images / 10) * 40 +
    (amenities / 15) * 30 +
    (description.length / 500) * 30
  );

  const pricing = pricePerDay >= 1500 && pricePerDay <= 3500 ? 85 :
                  pricePerDay < 1500 ? 60 : 50;

  const conversion = totalViews > 0 ?
    Math.min(100, ((stats.total_bookings || 0) / totalViews) * 500) : 0;

  const response = 75;

  const overall = Math.round((completeness + pricing + conversion + response) / 4);

  const suggestions = [];

  if (images < 8) {
    suggestions.push({
      title: `Add ${8 - images} more photos`,
      description: 'Properties with 8+ photos get 3x more views',
      impact: 'high' as const,
    });
  }

  if (amenities < 10) {
    suggestions.push({
      title: 'Add more amenities',
      description: 'List all available amenities to improve searchability',
      impact: 'medium' as const,
    });
  }

  if (description.length < 300) {
    suggestions.push({
      title: 'Expand property description',
      description: 'Detailed descriptions improve conversion by 45%',
      impact: 'high' as const,
    });
  }

  if (pricePerDay > 3500) {
    suggestions.push({
      title: 'Reduce price by ₹300-500',
      description: 'Your price is above market average, affecting bookings',
      impact: 'high' as const,
    });
  }

  suggestions.push({
    title: 'Enable instant booking',
    description: 'Increase conversion rate by 60%',
    impact: 'medium' as const,
  });

  const trend: 'improving' | 'stable' | 'declining' =
    overall > 70 ? 'improving' : overall > 50 ? 'stable' : 'declining';

  return {
    overall: Math.round(overall),
    completeness: Math.round(completeness),
    pricing: Math.round(pricing),
    conversion: Math.round(conversion),
    response: Math.round(response),
    trend,
    suggestions: suggestions.slice(0, 4),
  };
}

export function generateDemandForecast(period: '7_day' | '30_day'): DemandForecast {
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const month = now.getMonth();

  const baseScore = 50;
  const weekendBonus = isWeekend ? 20 : 0;
  const seasonalBonus = [10, 5, 15, 20, 15, 10, 5, 0, 5, 15, 20, 25][month];

  const score = Math.min(100, baseScore + weekendBonus + seasonalBonus + Math.random() * 20);

  const demandLevel: 'low' | 'medium' | 'high' =
    score > 70 ? 'high' : score > 45 ? 'medium' : 'low';

  const reasons = [];

  if (isWeekend) {
    reasons.push('Weekend demand typically 40% higher');
  }

  if (month >= 9 && month <= 11) {
    reasons.push('Peak holiday season driving increased bookings');
  }

  if (period === '30_day') {
    reasons.push('Month-end corporate travel expected to increase');
  }

  reasons.push('Local events scheduled in the area');
  reasons.push('Weather conditions favorable for travel');

  const events = [
    {
      name: 'Local Music Festival',
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      impact: 'high' as const,
    },
    {
      name: 'Business Conference',
      date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      impact: 'medium' as const,
    },
  ];

  return {
    period,
    demandLevel,
    score: Math.round(score),
    reasons,
    events: period === '30_day' ? events : events.slice(0, 1),
  };
}
