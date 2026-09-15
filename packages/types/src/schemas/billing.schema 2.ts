import { z } from 'zod';
import { BILLING_INTERVALS } from '../plans/billing';
import { paidPlanSchema, planSchema } from '../plans/catalog';

export const createBillingCheckoutSchema = z.object({
  plan: paidPlanSchema,
  interval: z.enum(BILLING_INTERVALS),
});

export type CreateBillingCheckoutInput = z.infer<
  typeof createBillingCheckoutSchema
>;

export const billingCheckoutResponseSchema = z.object({
  publicKey: z.string().min(1),
  currency: z.literal('COP'),
  amountInCents: z.number().int().positive(),
  reference: z.string().min(1),
  integrity: z.string().min(1),
  redirectUrl: z.string().url().nullable(),
  customerEmail: z.string().email(),
});

export type BillingCheckoutResponse = z.infer<
  typeof billingCheckoutResponseSchema
>;

export const syncBillingTransactionSchema = z
  .object({
    transactionId: z.string().trim().min(1).optional(),
    reference: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.transactionId || value.reference), {
    message: 'Falta el id o la referencia de la transacción.',
  });

export type SyncBillingTransactionInput = z.infer<
  typeof syncBillingTransactionSchema
>;

export const billingSyncResultSchema = z.object({
  applied: z.boolean(),
  status: z.string(),
  plan: planSchema.nullable(),
  interval: z.enum(BILLING_INTERVALS).nullable(),
});

export type BillingSyncResult = z.infer<typeof billingSyncResultSchema>;
