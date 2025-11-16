import type { AbandonedCartItem, AbandonedCartMetrics, CustomerJourney } from '../types';

export const mockAbandonedCarts: AbandonedCartItem[] = [
  // Day 1: 2024-01-09 (Low activity)
  {
    id: "cart-20240109-001",
    customer_id: "20636669001",
    customer_email: "customer001@sephora.com",
    session_id: "session-20240109-001",
    cart_items: [
      {
        product_id: "P434104",
        sku_id: "2116044",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 1,
        price: 49,
        brand_name: "Charlotte Tilbury",
        product_category: "Highlighter",
        category: ''
      }
    ],
    total_amount: 49,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-09T10:15:30.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    session_start: "2024-01-09T10:05:00.000Z",
    session_end: "2024-01-09T10:15:30.000Z",
    created_at: '',
    last_activity: ''
  },
  {
    id: "cart-20240109-002",
    customer_id: "20636669002",
    customer_email: "customer002@sephora.com",
    session_id: "session-20240109-002",
    cart_items: [
      {
        product_id: "P77484859",
        sku_id: "2384949",
        product_name: "Perfect Strokes Matte Liquid Liner",
        product_image: "https://via.placeholder.com/150?text=Perfect%20Strokes%20Matte%20Liquid%20Liner",
        quantity: 2,
        price: 21,
        brand_name: "Rare Beauty",
        product_category: "Makeup"
      }
    ],
    total_amount: 42,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-09T14:22:15.000Z",
    recovered: true,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-09T14:15:00.000Z",
    session_end: "2024-01-09T14:22:15.000Z"
  },

  // Day 2: 2024-01-10 (Medium activity)
  {
    id: "cart-20240110-001",
    customer_id: "20636669003",
    customer_email: "customer003@sephora.com",
    session_id: "session-20240110-001",
    cart_items: [
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      },
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 1,
        price: 42,
        brand_name: "Charlotte Tilbury",
        product_category: "Setting Spray & Powder"
      }
    ],
    total_amount: 72,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-10T11:30:45.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    session_start: "2024-01-10T11:20:00.000Z",
    session_end: "2024-01-10T11:30:45.000Z"
  },
  {
    id: "cart-20240110-002",
    customer_id: "20636669004",
    customer_email: "customer004@sephora.com",
    session_id: "session-20240110-002",
    cart_items: [
      {
        product_id: "P123456",
        sku_id: "3456789",
        product_name: "Lip Injection Maximum Plump Lip Gloss",
        product_image: "https://via.placeholder.com/150?text=Lip%20Injection%20Maximum%20Plump%20Lip%20Gloss",
        quantity: 3,
        price: 28,
        brand_name: "TOO FACED",
        product_category: "Lip Gloss"
      }
    ],
    total_amount: 84,
    currency: "USD",
    platform: "iphone app",
    location: "US",
    abandoned_at: "2024-01-10T16:45:20.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-10T16:35:00.000Z",
    session_end: "2024-01-10T16:45:20.000Z"
  },
  {
    id: "cart-20240110-003",
    customer_id: "20636669005",
    customer_email: "customer005@sephora.com",
    session_id: "session-20240110-003",
    cart_items: [
      {
        product_id: "P789012",
        sku_id: "4567890",
        product_name: "Better Than Sex Mascara",
        product_image: "https://via.placeholder.com/150?text=Better%20Than%20Sex%20Mascara",
        quantity: 1,
        price: 27,
        brand_name: "TOO FACED",
        product_category: "Mascara"
      }
    ],
    total_amount: 27,
    currency: "USD",
    platform: "android app",
    location: "US",
    abandoned_at: "2024-01-10T20:15:10.000Z",
    recovered: true,
    recovery_attempts: 2,
    browser: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
    session_start: "2024-01-10T20:05:00.000Z",
    session_end: "2024-01-10T20:15:10.000Z"
  },

  // Day 3: 2024-01-11 (High activity - midweek peak)
  {
    id: "cart-20240111-001",
    customer_id: "20636669006",
    customer_email: "customer006@sephora.com",
    session_id: "session-20240111-001",
    cart_items: [
      {
        product_id: "P434104",
        sku_id: "2116044",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 2,
        price: 49,
        brand_name: "Charlotte Tilbury",
        product_category: "Highlighter",
        category: ''
      },
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 1,
        price: 35,
        brand_name: "Fenty Beauty",
        product_category: "Highlighter"
      }
    ],
    total_amount: 133,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-11T09:45:30.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    session_start: "2024-01-11T09:30:00.000Z",
    session_end: "2024-01-11T09:45:30.000Z"
  },
  {
    id: "cart-20240111-002",
    customer_id: "20636669007",
    customer_email: "customer007@sephora.com",
    session_id: "session-20240111-002",
    cart_items: [
      {
        product_id: "P77484859",
        sku_id: "2384949",
        product_name: "Perfect Strokes Matte Liquid Liner",
        product_image: "https://via.placeholder.com/150?text=Perfect%20Strokes%20Matte%20Liquid%20Liner",
        quantity: 1,
        price: 21,
        brand_name: "Rare Beauty",
        product_category: "Makeup"
      },
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      },
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 2,
        price: 42,
        brand_name: "Charlotte Tilbury",
        product_category: "Setting Spray & Powder"
      }
    ],
    total_amount: 135,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-11T13:20:15.000Z",
    recovered: false,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-11T13:05:00.000Z",
    session_end: "2024-01-11T13:20:15.000Z"
  },
  {
    id: "cart-20240111-003",
    customer_id: "20636669008",
    customer_email: "customer008@sephora.com",
    session_id: "session-20240111-003",
    cart_items: [
      {
        product_id: "P123456",
        sku_id: "3456789",
        product_name: "Lip Injection Maximum Plump Lip Gloss",
        product_image: "https://via.placeholder.com/150?text=Lip%20Injection%20Maximum%20Plump%20Lip%20Gloss",
        quantity: 2,
        price: 28,
        brand_name: "TOO FACED",
        product_category: "Lip Gloss"
      }
    ],
    total_amount: 56,
    currency: "USD",
    platform: "tablet web",
    location: "US",
    abandoned_at: "2024-01-11T15:40:25.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-11T15:30:00.000Z",
    session_end: "2024-01-11T15:40:25.000Z"
  },
  {
    id: "cart-20240111-004",
    customer_id: "20636669009",
    customer_email: "customer009@sephora.com",
    session_id: "session-20240111-004",
    cart_items: [
      {
        product_id: "P789012",
        sku_id: "4567890",
        product_name: "Better Than Sex Mascara",
        product_image: "https://via.placeholder.com/150?text=Better%20Than%20Sex%20Mascara",
        quantity: 1,
        price: 27,
        brand_name: "TOO FACED",
        product_category: "Mascara"
      },
      {
        product_id: "P434104",
        sku_id: "2116010",
        product_name: "Hollywood Flawless Filter Mini",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter%20Mini",
        quantity: 1,
        price: 25,
        brand_name: "Charlotte Tilbury",
        product_category: "Makeup"
      }
    ],
    total_amount: 52,
    currency: "USD",
    platform: "iphone app",
    location: "US",
    abandoned_at: "2024-01-11T19:55:40.000Z",
    recovered: true,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-11T19:45:00.000Z",
    session_end: "2024-01-11T19:55:40.000Z"
  },

  // Day 4: 2024-01-12 (Medium activity)
  {
    id: "cart-20240112-001",
    customer_id: "20636669010",
    customer_email: "customer010@sephora.com",
    session_id: "session-20240112-001",
    cart_items: [
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 1,
        price: 35,
        brand_name: "Fenty Beauty",
        product_category: "Highlighter"
      }
    ],
    total_amount: 35,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-12T11:15:20.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    session_start: "2024-01-12T11:05:00.000Z",
    session_end: "2024-01-12T11:15:20.000Z"
  },
  {
    id: "cart-20240112-002",
    customer_id: "20636669011",
    customer_email: "customer011@sephora.com",
    session_id: "session-20240112-002",
    cart_items: [
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 2,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      }
    ],
    total_amount: 60,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-12T14:30:45.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-12T14:20:00.000Z",
    session_end: "2024-01-12T14:30:45.000Z"
  },
  {
    id: "cart-20240112-003",
    customer_id: "20636669012",
    customer_email: "customer012@sephora.com",
    session_id: "session-20240112-003",
    cart_items: [
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 1,
        price: 42,
        brand_name: "Charlotte Tilbury",
        product_category: "Setting Spray & Powder"
      }
    ],
    total_amount: 42,
    currency: "USD",
    platform: "android app",
    location: "US",
    abandoned_at: "2024-01-12T17:45:30.000Z",
    recovered: true,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
    session_start: "2024-01-12T17:35:00.000Z",
    session_end: "2024-01-12T17:45:30.000Z"
  },

  // Day 5: 2024-01-13 (High activity - weekend)
  {
    id: "cart-20240113-001",
    customer_id: "20636669013",
    customer_email: "customer013@sephora.com",
    session_id: "session-20240113-001",
    cart_items: [
      {
        product_id: "P434104",
        sku_id: "2116044",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 1,
        price: 49,
        brand_name: "Charlotte Tilbury",
        product_category: "Highlighter",
        category: ''
      },
      {
        product_id: "P77484859",
        sku_id: "2384949",
        product_name: "Perfect Strokes Matte Liquid Liner",
        product_image: "https://via.placeholder.com/150?text=Perfect%20Strokes%20Matte%20Liquid%20Liner",
        quantity: 1,
        price: 21,
        brand_name: "Rare Beauty",
        product_category: "Makeup"
      },
      {
        product_id: "P123456",
        sku_id: "3456789",
        product_name: "Lip Injection Maximum Plump Lip Gloss",
        product_image: "https://via.placeholder.com/150?text=Lip%20Injection%20Maximum%20Plump%20Lip%20Gloss",
        quantity: 2,
        price: 28,
        brand_name: "TOO FACED",
        product_category: "Lip Gloss"
      }
    ],
    total_amount: 126,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-13T10:20:15.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    session_start: "2024-01-13T10:05:00.000Z",
    session_end: "2024-01-13T10:20:15.000Z"
  },
  {
    id: "cart-20240113-002",
    customer_id: "20636669014",
    customer_email: "customer014@sephora.com",
    session_id: "session-20240113-002",
    cart_items: [
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 1,
        price: 35,
        brand_name: "Fenty Beauty",
        product_category: "Highlighter"
      },
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      }
    ],
    total_amount: 65,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-13T13:45:30.000Z",
    recovered: false,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-13T13:30:00.000Z",
    session_end: "2024-01-13T13:45:30.000Z"
  },
  {
    id: "cart-20240113-003",
    customer_id: "20636669015",
    customer_email: "customer015@sephora.com",
    session_id: "session-20240113-003",
    cart_items: [
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 3,
        price: 42,
        brand_name: "Charlotte Tilbury",
        product_category: "Setting Spray & Powder"
      }
    ],
    total_amount: 126,
    currency: "USD",
    platform: "tablet web",
    location: "US",
    abandoned_at: "2024-01-13T16:20:45.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-13T16:10:00.000Z",
    session_end: "2024-01-13T16:20:45.000Z"
  },
  {
    id: "cart-20240113-004",
    customer_id: "20636669016",
    customer_email: "customer016@sephora.com",
    session_id: "session-20240113-004",
    cart_items: [
      {
        product_id: "P789012",
        sku_id: "4567890",
        product_name: "Better Than Sex Mascara",
        product_image: "https://via.placeholder.com/150?text=Better%20Than%20Sex%20Mascara",
        quantity: 1,
        price: 27,
        brand_name: "TOO FACED",
        product_category: "Mascara"
      }
    ],
    total_amount: 27,
    currency: "USD",
    platform: "iphone app",
    location: "US",
    abandoned_at: "2024-01-13T20:15:20.000Z",
    recovered: true,
    recovery_attempts: 2,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-13T20:05:00.000Z",
    session_end: "2024-01-13T20:15:20.000Z"
  },

  // Day 6: 2024-01-14 (Medium activity)
  {
    id: "cart-20240114-001",
    customer_id: "20636669017",
    customer_email: "customer017@sephora.com",
    session_id: "session-20240114-001",
    cart_items: [
      {
        product_id: "P434104",
        sku_id: "2116044",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 2,
        price: 49,
        brand_name: "Charlotte Tilbury",
        product_category: "Highlighter",
        category: ''
      }
    ],
    total_amount: 98,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-14T09:30:15.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    session_start: "2024-01-14T09:15:00.000Z",
    session_end: "2024-01-14T09:30:15.000Z"
  },
  {
    id: "cart-20240114-002",
    customer_id: "20636669018",
    customer_email: "customer018@sephora.com",
    session_id: "session-20240114-002",
    cart_items: [
      {
        product_id: "P77484859",
        sku_id: "2384949",
        product_name: "Perfect Strokes Matte Liquid Liner",
        product_image: "https://via.placeholder.com/150?text=Perfect%20Strokes%20Matte%20Liquid%20Liner",
        quantity: 1,
        price: 21,
        brand_name: "Rare Beauty",
        product_category: "Makeup"
      },
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 1,
        price: 35,
        brand_name: "Fenty Beauty",
        product_category: "Highlighter"
      }
    ],
    total_amount: 56,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-14T12:45:30.000Z",
    recovered: false,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-14T12:30:00.000Z",
    session_end: "2024-01-14T12:45:30.000Z"
  },
  {
    id: "cart-20240114-003",
    customer_id: "20636669019",
    customer_email: "customer019@sephora.com",
    session_id: "session-20240114-003",
    cart_items: [
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      }
    ],
    total_amount: 30,
    currency: "USD",
    platform: "android app",
    location: "US",
    abandoned_at: "2024-01-14T18:20:45.000Z",
    recovered: true,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
    session_start: "2024-01-14T18:10:00.000Z",
    session_end: "2024-01-14T18:20:45.000Z"
  },

  // Day 7: 2024-01-15 (Original data - High activity)
  // ... include all the original January 15th data here
  {
    id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761663075111",
    customer_id: "20636669081",
    customer_email: "nbc6@sephora.com",
    session_id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761663075111",
    cart_items: [
      {
        product_id: "P434104",
        sku_id: "2116044",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 9,
        price: 49,
        brand_name: "Hollywood Flawless Filter",
        product_category: "Highlighter",
        category: ''
      }
    ],
    total_amount: 441,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-15T14:22:07.549Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    session_start: "2024-01-15T14:11:17.445Z",
    session_end: "2024-01-15T14:22:19.490Z",
    created_at: '',
    last_activity: ''
  },
  {
    id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761653823953",
    customer_id: "20636669074",
    customer_email: "nbc5@sephora.com",
    session_id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761653823953",
    cart_items: [
      {
        product_id: "P77484859",
        sku_id: "2384949",
        product_name: "Perfect Strokes Matte Liquid Liner",
        product_image: "https://via.placeholder.com/150?text=Perfect%20Strokes%20Matte%20Liquid%20Liner",
        quantity: 1,
        price: 21,
        brand_name: "Perfect Strokes Matte Liquid Liner",
        product_category: "Makeup"
      },
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 1,
        price: 35,
        brand_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_category: "Highlighter"
      },
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      },
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 3,
        price: 42,
        brand_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_category: "Setting Spray & Powder"
      },
      {
        product_id: "P434104",
        sku_id: "2116010",
        product_name: "Hollywood Flawless Filter",
        product_image: "https://via.placeholder.com/150?text=Hollywood%20Flawless%20Filter",
        quantity: 1,
        price: 19,
        brand_name: "Hollywood Flawless Filter",
        product_category: "Makeup"
      }
    ],
    total_amount: 231,
    currency: "USD",
    platform: "desktop web",
    location: "US",
    abandoned_at: "2024-01-15T13:23:38.084Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    session_start: "2024-01-15T11:57:12.716Z",
    session_end: "2024-01-15T13:23:38.084Z"
  },
  {
    id: "a1b2c3d4-e66c-4a9b-b90b-ddeddefdc6cb.1761664075111",
    customer_id: "20636669082",
    customer_email: "customer3@sephora.com",
    session_id: "a1b2c3d4-e66c-4a9b-b90b-ddeddefdc6cb.1761664075111",
    cart_items: [
      {
        product_id: "P123456",
        sku_id: "3456789",
        product_name: "Lip Injection Maximum Plump Lip Gloss",
        product_image: "https://via.placeholder.com/150?text=Lip%20Injection%20Maximum%20Plump%20Lip%20Gloss",
        quantity: 2,
        price: 28,
        brand_name: "TOO FACED",
        product_category: "Lip Gloss"
      },
      {
        product_id: "P789012",
        sku_id: "4567890",
        product_name: "Better Than Sex Mascara",
        product_image: "https://via.placeholder.com/150?text=Better%20Than%20Sex%20Mascara",
        quantity: 1,
        price: 27,
        brand_name: "TOO FACED",
        product_category: "Mascara"
      }
    ],
    total_amount: 83,
    currency: "USD",
    platform: "mobile web",
    location: "US",
    abandoned_at: "2024-01-15T15:15:30.123Z",
    recovered: false,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    session_start: "2024-01-15T15:05:12.456Z",
    session_end: "2024-01-15T15:15:30.123Z"
  },
  // Add more January 15th carts to make it a high activity day
  {
    id: "cart-20240115-004",
    customer_id: "20636669083",
    customer_email: "customer083@sephora.com",
    session_id: "session-20240115-004",
    cart_items: [
      {
        product_id: "P447375",
        sku_id: "2520476",
        product_name: "Cookie and Tickle Shimmer Finish Powder Highlighters",
        product_image: "https://via.placeholder.com/150?text=Cookie%20and%20Tickle%20Shimmer%20Finish%20Powder%20Highlighters",
        quantity: 2,
        price: 35,
        brand_name: "Fenty Beauty",
        product_category: "Highlighter"
      }
    ],
    total_amount: 70,
    currency: "USD",
    platform: "tablet web",
    location: "US",
    abandoned_at: "2024-01-15T16:30:15.000Z",
    recovered: false,
    recovery_attempts: 0,
    browser: "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-15T16:20:00.000Z",
    session_end: "2024-01-15T16:30:15.000Z"
  },
  {
    id: "cart-20240115-005",
    customer_id: "20636669084",
    customer_email: "customer084@sephora.com",
    session_id: "session-20240115-005",
    cart_items: [
      {
        product_id: "P472327",
        sku_id: "2457299",
        product_name: "SoftSculpt® Cream Contour & Bronzer Stick",
        product_image: "https://via.placeholder.com/150?text=SoftSculpt%C2%AE%20Cream%20Contour%20%26%20Bronzer%20Stick",
        quantity: 1,
        price: 30,
        brand_name: "MAKEUP BY MARIO",
        product_category: "Makeup"
      },
      {
        product_id: "P433526",
        sku_id: "2606077",
        product_name: "Airbrush Flawless Finish Refillable Setting Powder",
        product_image: "https://via.placeholder.com/150?text=Airbrush%20Flawless%20Finish%20Refillable%20Setting%20Powder",
        quantity: 1,
        price: 42,
        brand_name: "Charlotte Tilbury",
        product_category: "Setting Spray & Powder"
      }
    ],
    total_amount: 72,
    currency: "USD",
    platform: "iphone app",
    location: "US",
    abandoned_at: "2024-01-15T19:45:30.000Z",
    recovered: true,
    recovery_attempts: 1,
    browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
    session_start: "2024-01-15T19:35:00.000Z",
    session_end: "2024-01-15T19:45:30.000Z"
  }
];

export const mockMetrics: AbandonedCartMetrics = {
  total_abandoned_carts: mockAbandonedCarts.length,
  total_abandoned_revenue: mockAbandonedCarts.reduce((sum, cart) => sum + cart.total_amount, 0),
  recovery_rate: 12.5,
  average_cart_value: 65.42,
  abandonment_rate: 68.2,
  period_comparison: {
    previous_period: 98,
    change_percentage: 26.5
  }
};

// Enhanced mock customer journeys with more realistic data
export const mockCustomerJourneys: CustomerJourney[] = [
  {
    customer_id: "20636669081",
    customer_email: "nbc6@sephora.com",
    session_id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761663075111",
    platform: "desktop",
    steps: [
      { step: "landing_page", timestamp: "2024-01-15T14:11:17Z", duration: 45 },
      { step: "product_view", timestamp: "2024-01-15T14:12:02Z", duration: 120 },
      { step: "add_to_cart", timestamp: "2024-01-15T14:14:02Z", duration: 30 },
      { step: "cart_view", timestamp: "2024-01-15T14:14:32Z", duration: 60 },
      { step: "checkout_start", timestamp: "2024-01-15T14:15:32Z", duration: 45 },
      { step: "shipping_info", timestamp: "2024-01-15T14:16:17Z", duration: 90 }
    ],
    total_time: 390,
    abandoned: true,
    conversion_likelihood: "medium",
    behavioral_pattern: "hesitant",
    engagement_score: 0.72,
    potential_recovery_value: 0.2
  },
  {
    customer_id: "20636669074", 
    customer_email: "nbc5@sephora.com",
    session_id: "efc39f3e-e66c-4a9b-b90b-ddeddefdc6cb.1761653823953",
    platform: "desktop",
    steps: [
      { step: "landing_page", timestamp: "2024-01-15T11:57:12Z", duration: 30 },
      { step: "product_view", timestamp: "2024-01-15T11:57:42Z", duration: 90 },
      { step: "add_to_cart", timestamp: "2024-01-15T11:59:12Z", duration: 20 },
      { step: "cart_view", timestamp: "2024-01-15T11:59:32Z", duration: 40 },
      { step: "checkout_start", timestamp: "2024-01-15T12:00:12Z", duration: 60 },
      { step: "shipping_info", timestamp: "2024-01-15T12:01:12Z", duration: 120 },
      { step: "payment_info", timestamp: "2024-01-15T12:03:12Z", duration: 180 }
    ],
    total_time: 540,
    abandoned: false,
    conversion_likelihood: "high",
    behavioral_pattern: "researcher",
    engagement_score: 0.95,
    potential_recovery_value: 0.4
  }
];

// Generate additional random journeys for more comprehensive data
export const generateAdditionalJourneys = (count: number): CustomerJourney[] => {
  const platforms = ['desktop web', 'mobile', 'tablet web', 'iphone app', 'android app'];
  const behavioralPatterns = ['browser', 'researcher', 'impulse', 'hesitant'];
  const steps = ['landing_page', 'product_view', 'add_to_cart', 'cart_view', 'checkout_start', 'shipping_info', 'payment_info'];
  
  return Array.from({ length: count }, (_, i) => {
    const stepCount = Math.floor(Math.random() * 4) + 3; // 3-6 steps
    const selectedSteps = steps.slice(0, stepCount);
    const abandoned = Math.random() > 0.3; // 70% abandoned
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    let totalTime = 0;
    const journeySteps = selectedSteps.map((step, index) => {
      const duration = Math.floor(Math.random() * 120) + 15; // 15-135 seconds per step
      totalTime += duration;
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
      timestamp.setMinutes(timestamp.getMinutes() + totalTime / 60);
      
      return {
        step,
        timestamp: timestamp.toISOString(),
        duration
      };
    });
    
    const conversion_likelihood = abandoned ? 
      (stepCount >= 5 ? 'medium' : 'low') : 
      (stepCount >= 6 ? 'high' : 'medium');
    
    const behavioral_pattern = behavioralPatterns[Math.floor(Math.random() * behavioralPatterns.length)];
    const engagement_score = Math.min(0.3 + (stepCount / 10) + (Math.random() * 0.4), 1);
    const potential_recovery_value = conversion_likelihood === 'high' ? 0.4 : 
                                   conversion_likelihood === 'medium' ? 0.2 : 0.1;
    
    return {
      customer_id: `20636669${100 + i}`,
      customer_email: `customer${100 + i}@sephora.com`,
      session_id: `session_auto_${i + 1000}`,
      platform,
      steps: journeySteps,
      total_time: totalTime,
      abandoned,
      conversion_likelihood,
      behavioral_pattern,
      engagement_score,
      potential_recovery_value
    };
  });
};

// Combined mock data with generated journeys
export const getEnhancedMockJourneys = (): CustomerJourney[] => {
  return [...mockCustomerJourneys, ...generateAdditionalJourneys(20)]; // 22 total journeys
};