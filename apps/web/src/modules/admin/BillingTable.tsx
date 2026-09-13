import {
  BILLING_GRACE_DAYS,
  WOMPI_FIXED_COP,
  WOMPI_IVA_BPS,
  WOMPI_PAYMENT_METHOD_LABELS,
  WOMPI_PAYMENT_METHODS,
  WOMPI_PERCENT_BPS,
  formatCop,
  planBillingOffers,
} from '@agendya/types';

export function BillingTable() {
  const offers = planBillingOffers();

  return (
    <div className="max-w-6xl" style={{ fontFamily: 'var(--font-body)' }}>
      <h2
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Precios e ingresos
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Dos formas de cobrar el mismo plan. Cada columna es un escenario
        completo: lo que paga el profesional y lo que nos queda después de
        Wompi ({WOMPI_PERCENT_BPS / 100}% + {formatCop(WOMPI_FIXED_COP)} + IVA{' '}
        {WOMPI_IVA_BPS / 100}% sobre la comisión). El primer cobro sale del
        Widget en Perfil; el cargo recurrente aún no corre.
      </p>

      <div
        className="rounded-lg overflow-x-auto mb-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th className="px-4 py-3 text-left font-semibold" rowSpan={2}>
                Plan
              </th>
              <th
                className="px-4 py-3 text-center font-semibold"
                colSpan={2}
                style={{ borderLeft: '1px solid var(--color-border)' }}
              >
                Si paga mes a mes (12 cobros)
              </th>
              <th
                className="px-4 py-3 text-center font-semibold"
                colSpan={2}
                style={{ borderLeft: '1px solid var(--color-border)' }}
              >
                Si paga el año de una
              </th>
              <th
                className="px-4 py-3 text-right font-semibold"
                rowSpan={2}
                style={{ borderLeft: '1px solid var(--color-border)' }}
              >
                El cliente se ahorra
              </th>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th
                className="px-4 py-2 text-right font-medium"
                style={{
                  borderLeft: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Paga
              </th>
              <th
                className="px-4 py-2 text-right font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Nos queda
              </th>
              <th
                className="px-4 py-2 text-right font-medium"
                style={{
                  borderLeft: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Paga
              </th>
              <th
                className="px-4 py-2 text-right font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Nos queda
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr
                key={offer.plan}
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <td className="px-4 py-3">
                  {offer.label}
                  <div
                    className="text-xs font-normal"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {formatCop(offer.monthlyCop)} / mes
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-right"
                  style={{ borderLeft: '1px solid var(--color-border)' }}
                >
                  {formatCop(offer.twelveMonthsCop)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCop(offer.twelveMonthlyNetCop)}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  style={{ borderLeft: '1px solid var(--color-border)' }}
                >
                  {formatCop(offer.annualCop)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCop(offer.annualFee.netCop)}
                </td>
                <td
                  className="px-4 py-3 text-right font-medium"
                  style={{
                    borderLeft: '1px solid var(--color-border)',
                    color: 'var(--color-success)',
                  }}
                >
                  {formatCop(offer.customerSavesCop)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl
        className="grid gap-3 text-sm rounded-lg p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div>
          <dt
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Por qué no da lo mismo
          </dt>
          <dd>
            Mes a mes Wompi cobra el fijo de {formatCop(WOMPI_FIXED_COP)} doce
            veces. Al año, una sola. Por eso “nos queda” no es el precio del
            cliente: es precio menos Wompi.
          </dd>
        </div>
        <div>
          <dt
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Medios de pago
          </dt>
          <dd>
            {WOMPI_PAYMENT_METHODS.map(
              (method) => WOMPI_PAYMENT_METHOD_LABELS[method],
            ).join(', ')}
            . PSE u otros solo si el comercio Wompi los tiene activos.
          </dd>
        </div>
        <div>
          <dt
            className="font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cobro fallido
          </dt>
          <dd>
            El plan de pago se mantiene {BILLING_GRACE_DAYS} días. Reintentos
            en ese lapso; si no hay APPROVED, baja a Gratuito. Super Admin
            puede reasignar el plan a mano.
          </dd>
        </div>
      </dl>
    </div>
  );
}
