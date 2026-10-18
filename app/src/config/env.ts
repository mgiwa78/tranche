export const API_ROOT = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

/** Where Paystack (or the dev checkout) sends the shopper back to. Must match the api's PAYSTACK_CALLBACK_URL. */
export const CHECKOUT_CALLBACK_URL = 'tranche://checkout/callback';

export const STORE_URL = 'https://expo.dev';

export const SUPPORT_EMAIL = 'help@tranche.ng';
