export const mockPurchaseJourneyData = {
  journeyStages: [
    {
      stage: 'product_view',
      users: 1000,
      dropoffs: 150,
      conversionRate: 0.85,
      averageTime: 45
    },
    {
      stage: 'add_to_cart',
      users: 850,
      dropoffs: 300,
      conversionRate: 0.55,
      averageTime: 120
    },
    {
      stage: 'checkout_start',
      users: 550,
      dropoffs: 200,
      conversionRate: 0.35,
      averageTime: 180
    },
    {
      stage: 'payment_info',
      users: 350,
      dropoffs: 100,
      conversionRate: 0.25,
      averageTime: 240
    },
    {
      stage: 'purchase_complete',
      users: 250,
      dropoffs: 0,
      conversionRate: 0.25,
      averageTime: 300
    }
  ],
  commonPaths: [
    {
      path: ['homepage', 'product_page', 'add_to_cart', 'checkout', 'purchase'],
      frequency: 120,
      conversionRate: 0.75
    },
    {
      path: ['search', 'product_page', 'add_to_cart', 'cart_page', 'checkout', 'purchase'],
      frequency: 85,
      conversionRate: 0.68
    },
    {
      path: ['category_page', 'product_page', 'add_to_cart', 'exit'],
      frequency: 156,
      conversionRate: 0
    }
  ],
  dropoffAnalysis: [
    {
      stage: 'add_to_cart',
      reasons: [
        { reason: 'price_comparison', percentage: 35 },
        { reason: 'shipping_costs', percentage: 25 },
        { reason: 'product_uncertainty', percentage: 20 },
        { reason: 'technical_issues', percentage: 15 },
        { reason: 'other', percentage: 5 }
      ]
    },
    {
      stage: 'checkout_start',
      reasons: [
        { reason: 'account_creation', percentage: 40 },
        { reason: 'form_complexity', percentage: 30 },
        { reason: 'payment_options', percentage: 20 },
        { reason: 'other', percentage: 10 }
      ]
    }
  ]
};