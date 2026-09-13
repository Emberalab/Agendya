import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function cleanSecret(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

export type WompiTransaction = {
  id: string;
  status: string;
  amount_in_cents: number;
  currency: string;
  reference: string;
};

type WompiKeys = {
  publicKey: string;
  integrityKey: string;
  eventsSecret: string;
  sandbox: boolean;
};

@Injectable()
export class WompiClient {
  constructor(private readonly configService: ConfigService) {}

  keys(): WompiKeys {
    const publicKey = cleanSecret(
      this.configService.get<string>('wompi.publicKey'),
    );
    const integrityKey = cleanSecret(
      this.configService.get<string>('wompi.integrityKey'),
    );
    const eventsSecret = cleanSecret(
      this.configService.get<string>('wompi.eventsSecret'),
    );
    const sandboxFlag =
      this.configService.get<boolean>('wompi.sandbox') !== false;
    if (sandboxFlag && publicKey.startsWith('pub_prod_')) {
      throw new ServiceUnavailableException(
        'WOMPI_SANDBOX=true pero la llave pública es de producción (pub_prod_). Usa las llaves *_test_ para el pago de prueba.',
      );
    }
    const sandbox = publicKey.startsWith('pub_prod_')
      ? false
      : publicKey.startsWith('pub_test_')
        ? true
        : sandboxFlag;

    return { publicKey, integrityKey, eventsSecret, sandbox };
  }

  requireCheckoutKeys(): Pick<WompiKeys, 'publicKey' | 'integrityKey'> & {
    sandbox: boolean;
  } {
    const { publicKey, integrityKey, sandbox } = this.keys();
    if (!publicKey || !integrityKey) {
      throw new ServiceUnavailableException(
        'Wompi no está configurado. Faltan WOMPI_PUBLIC_KEY o WOMPI_INTEGRITY_KEY.',
      );
    }
    if (
      publicKey.startsWith('pub_test_') &&
      !integrityKey.startsWith('test_integrity_')
    ) {
      throw new ServiceUnavailableException(
        'La llave pública es de sandbox (pub_test_) pero WOMPI_INTEGRITY_KEY no es test_integrity_. Cópialas del mismo modo de pruebas.',
      );
    }
    return { publicKey, integrityKey, sandbox };
  }

  requireEventsSecret(): string {
    const { eventsSecret } = this.keys();
    if (!eventsSecret) {
      throw new ServiceUnavailableException(
        'Wompi no está configurado. Falta WOMPI_EVENTS_SECRET.',
      );
    }
    return eventsSecret;
  }

  apiBaseUrl(): string {
    return this.keys().sandbox
      ? 'https://sandbox.wompi.co/v1'
      : 'https://production.wompi.co/v1';
  }

  async getTransaction(id: string): Promise<WompiTransaction | null> {
    const { publicKey } = this.requireCheckoutKeys();
    const response = await fetch(
      `${this.apiBaseUrl()}/transactions/${encodeURIComponent(id)}`,
      { headers: { Authorization: `Bearer ${publicKey}` } },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No se pudo consultar la transacción en Wompi.',
      );
    }
    const body = (await response.json()) as {
      data?: Partial<WompiTransaction>;
    };
    const data = body.data;
    if (
      !data?.id ||
      !data.status ||
      typeof data.amount_in_cents !== 'number' ||
      !data.currency ||
      !data.reference
    ) {
      return null;
    }
    return {
      id: data.id,
      status: data.status,
      amount_in_cents: data.amount_in_cents,
      currency: data.currency,
      reference: data.reference,
    };
  }

  /**
   * Widget callback sometimes returns `transaction: null` after a real charge.
   * Look up our unique checkout reference via the merchant API.
   */
  async findTransactionByReference(
    reference: string,
  ): Promise<WompiTransaction | null> {
    const { publicKey } = this.requireCheckoutKeys();
    const privateKey = cleanSecret(
      this.configService.get<string>('wompi.privateKey'),
    );
    const token = privateKey || publicKey;
    const response = await fetch(
      `${this.apiBaseUrl()}/transactions?reference=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No se pudo consultar la transacción en Wompi.',
      );
    }
    const body = (await response.json()) as {
      data?: Partial<WompiTransaction> | Partial<WompiTransaction>[];
    };
    const rows = Array.isArray(body.data)
      ? body.data
      : body.data
        ? [body.data]
        : [];
    const data = rows.find((row) => row.reference === reference) ?? rows[0];
    if (
      !data?.id ||
      !data.status ||
      typeof data.amount_in_cents !== 'number' ||
      !data.currency ||
      !data.reference
    ) {
      return null;
    }
    return {
      id: data.id,
      status: data.status,
      amount_in_cents: data.amount_in_cents,
      currency: data.currency,
      reference: data.reference,
    };
  }
}
