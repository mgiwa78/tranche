import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { checkoutCallbackUrl } from '../config/env';
import { errorMessage } from '../lib/apiError';
import { useVerifyPaymentMutation } from '../store/rtk/customerSlice/order.service';
import type { PaymentAttemptView, PaymentVerificationView } from '../types/api';

export type PayOutcome =
  | { kind: 'paid'; verification: PaymentVerificationView }
  | { kind: 'failed'; message: string; reference: string }
  | { kind: 'pending'; reference: string }
  | { kind: 'cancelled'; reference: string };

/**
 * Finishes a payment attempt from the api. Card-on-file charges are already settled; hosted
 * checkouts open Paystack (or the dev checkout) in an auth session that returns to
 * the app's checkout callback deep link. Either way the api verifies with Paystack before we trust it.
 */
export function usePayFlow() {
  const [verify] = useVerifyPaymentMutation();
  const [busy, setBusy] = useState(false);

  const complete = useCallback(
    async (attempt: PaymentAttemptView): Promise<PayOutcome> => {
      setBusy(true);
      try {
        let reference = attempt.reference;
        if (attempt.authorizationUrl) {
          const result = await WebBrowser.openAuthSessionAsync(attempt.authorizationUrl, checkoutCallbackUrl());
          if (result.type === 'success') {
            const params = Linking.parse(result.url).queryParams ?? {};
            reference = String(params.reference ?? params.trxref ?? reference);
          }
          // Closed early: the shopper may still have paid, so verify anyway before reporting.
        }
        const verification = await verify(reference).unwrap();
        if (verification.status === 'success') return { kind: 'paid', verification };
        if (verification.status === 'pending') {
          return attempt.authorizationUrl ? { kind: 'cancelled', reference } : { kind: 'pending', reference };
        }
        return { kind: 'failed', reference, message: 'The payment was declined. Try another card.' };
      } catch (error) {
        return { kind: 'failed', reference: attempt.reference, message: errorMessage(error, "We couldn't confirm that payment.") };
      } finally {
        setBusy(false);
      }
    },
    [verify],
  );

  return { complete, busy };
}
