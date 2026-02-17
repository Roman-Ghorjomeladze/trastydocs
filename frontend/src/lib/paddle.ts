/**
 * Paddle.js client-side checkout helper.
 * Paddle.js is loaded via <script> tag in index.html.
 * This module provides typed helpers around the global Paddle object.
 */

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: {
        token: string;
        eventCallback?: (data: any) => void;
      }) => void;
      Checkout: {
        open: (options: {
          items?: Array<{ priceId: string; quantity: number }>;
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: {
            successUrl?: string;
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            locale?: string;
          };
          transactionId?: string;
        }) => void;
      };
      Initialized: boolean;
    };
  }
}

let initialized = false;

export function initPaddle(clientToken: string, environment: 'sandbox' | 'production' = 'sandbox') {
  if (initialized || !window.Paddle) return;

  window.Paddle.Environment.set(environment);
  window.Paddle.Initialize({
    token: clientToken,
  });
  initialized = true;
}

export function openPaddleCheckout(params: {
  priceId: string;
  email: string;
  userId: string;
  successUrl?: string;
  theme?: 'light' | 'dark';
}) {
  if (!window.Paddle) {
    console.error('Paddle.js not loaded');
    return;
  }

  if (!initialized) {
    console.error('Paddle not initialized. Call initPaddle() first.');
    return;
  }

  window.Paddle.Checkout.open({
    items: [{ priceId: params.priceId, quantity: 1 }],
    customer: { email: params.email },
    customData: { user_id: params.userId },
    settings: {
      successUrl: params.successUrl || `${window.location.origin}/checkout/success`,
      displayMode: 'overlay',
      theme: params.theme || 'light',
    },
  });
}

export function isPaddleLoaded(): boolean {
  return !!window.Paddle;
}
