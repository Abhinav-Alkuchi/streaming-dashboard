export const mockHeatMapData = {
  sessions: [
    {
      sessionId: 'session-1',
      userId: 'user-1',
      startTime: '2025-11-01T10:00:00Z',
      endTime: '2025-11-01T10:30:00Z',
      pageViews: 5,
      clicks: 12,
      scrollDepth: 85,
      interactions: [
        { element: 'add-to-cart-btn', count: 2, timestamp: '2025-11-01T10:05:00Z' },
        { element: 'product-image', count: 3, timestamp: '2025-11-01T10:07:00Z' },
        { element: 'buy-now-btn', count: 1, timestamp: '2025-11-01T10:15:00Z' }
      ],
      conversion: true,
      revenue: 99.99
    },
    {
      sessionId: 'session-2',
      userId: 'user-2',
      startTime: '2025-11-02T14:20:00Z',
      endTime: '2025-11-02T14:45:00Z',
      pageViews: 3,
      clicks: 8,
      scrollDepth: 60,
      interactions: [
        { element: 'product-image', count: 4, timestamp: '2025-11-02T14:25:00Z' },
        { element: 'size-selector', count: 2, timestamp: '2025-11-02T14:30:00Z' }
      ],
      conversion: false,
      revenue: 0
    },
    {
      sessionId: 'session-3',
      userId: 'user-3',
      startTime: '2025-11-03T09:15:00Z',
      endTime: '2025-11-03T09:50:00Z',
      pageViews: 7,
      clicks: 18,
      scrollDepth: 90,
      interactions: [
        { element: 'add-to-cart-btn', count: 3, timestamp: '2025-11-03T09:20:00Z' },
        { element: 'checkout-btn', count: 1, timestamp: '2025-11-03T09:35:00Z' },
        { element: 'product-video', count: 2, timestamp: '2025-11-03T09:40:00Z' }
      ],
      conversion: true,
      revenue: 149.99
    }
  ],
  aggregate: {
    totalSessions: 156,
    totalUsers: 142,
    averageSessionDuration: 1247, // seconds
    conversionRate: 0.18,
    totalRevenue: 12500.50,
    mostActiveElements: [
      { element: 'add-to-cart-btn', count: 245 },
      { element: 'product-image', count: 189 },
      { element: 'size-selector', count: 156 },
      { element: 'color-selector', count: 132 },
      { element: 'buy-now-btn', count: 98 }
    ],
    peakActivityTimes: [
      { hour: 10, activity: 0.85 },
      { hour: 14, activity: 0.92 },
      { hour: 19, activity: 0.78 },
      { hour: 21, activity: 0.65 }
    ]
  }
};