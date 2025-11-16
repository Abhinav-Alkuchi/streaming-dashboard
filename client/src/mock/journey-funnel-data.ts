export const mockJourneyFunnelData = {
  funnels: [
    {
      name: 'Mobile Purchase Funnel',
      stages: [
        { name: 'Visitors', value: 10000 },
        { name: 'Product Views', value: 3500 },
        { name: 'Add to Cart', value: 1200 },
        { name: 'Checkout Started', value: 600 },
        { name: 'Purchases', value: 350 }
      ],
      conversionRate: 0.035
    },
    {
      name: 'Desktop Purchase Funnel',
      stages: [
        { name: 'Visitors', value: 8000 },
        { name: 'Product Views', value: 4200 },
        { name: 'Add to Cart', value: 1800 },
        { name: 'Checkout Started', value: 950 },
        { name: 'Purchases', value: 620 }
      ],
      conversionRate: 0.0775
    },
    {
      name: 'Tablet Purchase Funnel',
      stages: [
        { name: 'Visitors', value: 2500 },
        { name: 'Product Views', value: 1200 },
        { name: 'Add to Cart', value: 450 },
        { name: 'Checkout Started', value: 280 },
        { name: 'Purchases', value: 150 }
      ],
      conversionRate: 0.06
    }
  ],
  timeToConvert: {
    average: 2.5, // days
    distribution: [
      { timeRange: '< 1 hour', percentage: 15 },
      { timeRange: '1-24 hours', percentage: 35 },
      { timeRange: '1-3 days', percentage: 25 },
      { timeRange: '3-7 days', percentage: 15 },
      { timeRange: '> 7 days', percentage: 10 }
    ]
  },
  touchpoints: {
    averageTouchpoints: 4.2,
    distribution: [
      { touchpoints: 1, percentage: 10 },
      { touchpoints: 2, percentage: 25 },
      { touchpoints: 3, percentage: 30 },
      { touchpoints: 4, percentage: 20 },
      { touchpoints: '5+', percentage: 15 }
    ]
  }
};