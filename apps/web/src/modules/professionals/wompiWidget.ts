import type { BillingCheckoutResponse } from '@agendya/types';

const WOMPI_WIDGET_SRC = 'https://checkout.wompi.co/widget.js';

export type WompiWidgetResult = {
  transaction?: {
    id: string;
    status: string;
  };
};

type WidgetCheckoutInstance = {
  open: (cb: (result: WompiWidgetResult | null) => void) => void;
};

type WidgetCheckoutCtor = new (config: {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
  redirectUrl?: string;
  customerData?: { email: string };
}) => WidgetCheckoutInstance;

declare global {
  interface Window {
    WidgetCheckout?: WidgetCheckoutCtor;
  }
}

function loadWompiScript(): Promise<WidgetCheckoutCtor> {
  if (window.WidgetCheckout) {
    return Promise.resolve(window.WidgetCheckout);
  }

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${WOMPI_WIDGET_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (window.WidgetCheckout) resolve(window.WidgetCheckout);
        else reject(new Error('Wompi no cargó el checkout.'));
      });
      existing.addEventListener('error', () =>
        reject(new Error('No se pudo cargar Wompi.')),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = WOMPI_WIDGET_SRC;
    script.async = true;
    script.onload = () => {
      if (window.WidgetCheckout) resolve(window.WidgetCheckout);
      else reject(new Error('Wompi no cargó el checkout.'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar Wompi.'));
    document.head.appendChild(script);
  });
}

/** Wompi's widget sometimes calls back with `{ transaction: null }`. */
export function readWompiWidgetResult(result: unknown): WompiWidgetResult {
  if (!result || typeof result !== 'object') {
    return {};
  }
  const record = result as Record<string, unknown>;
  const raw =
    record.transaction && typeof record.transaction === 'object'
      ? (record.transaction as Record<string, unknown>)
      : record;
  const id = raw.id;
  if (typeof id !== 'string' || id.length === 0) {
    return {};
  }
  return {
    transaction: {
      id,
      status: typeof raw.status === 'string' ? raw.status : 'UNKNOWN',
    },
  };
}

export function openWompiWidget(
  checkout: BillingCheckoutResponse,
): Promise<WompiWidgetResult> {
  return loadWompiScript().then(
    (WidgetCheckout) =>
      new Promise((resolve) => {
        const widget = new WidgetCheckout({
          currency: checkout.currency,
          amountInCents: checkout.amountInCents,
          reference: checkout.reference,
          publicKey: checkout.publicKey,
          signature: { integrity: checkout.integrity },
          ...(checkout.redirectUrl
            ? { redirectUrl: checkout.redirectUrl }
            : {}),
          customerData: { email: checkout.customerEmail },
        });
        widget.open((result) => {
          try {
            resolve(readWompiWidgetResult(result));
          } catch {
            resolve({});
          }
        });
      }),
  );
}
