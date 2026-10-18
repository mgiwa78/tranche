import * as Linking from 'expo-linking';

export const API_ROOT = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

/**
 * Where checkout hands control back to the app. `tranche://checkout/callback` in real builds,
 * `exp://<lan-ip>:8081/--/checkout/callback` in Expo Go. The api's APP_RETURN_URL must match.
 */
export const checkoutCallbackUrl = () => Linking.createURL('checkout/callback');

export const STORE_URL = 'https://expo.dev';

export const SUPPORT_EMAIL = 'help@tranche.ng';
