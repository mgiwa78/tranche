# Tranche app

The shopper app: browse stores, buy now and pay in four, see every installment, pay early, and get a push reminder before each payment is due.

| | |
|---|---|
| Framework | Expo SDK 57, Expo Router, React Native 0.86, TypeScript |
| State / data | Redux Toolkit + RTK Query, `expo-secure-store` for tokens |
| Contract | `@tranche/shared`: types, Zod schemas, `buildInstallmentSchedule`, `formatNaira` |
| Payments | Paystack hosted checkout via `expo-web-browser` auth session; saved cards charged by the api |
| Push | `expo-notifications` (Expo push service) |

## Structure

```
app/                 expo-router screens
  (tabs)/            shop, plans, activity, account
  product/[id]       product + plan picker + schedule preview
  checkout/          [productId] confirm and pay, result, callback (deep link)
  order/[id]         installment timeline, pay now
  auth/, settings/
src/
  ui/                design system primitives (see DESIGN.md)
  components/        money (Schedule, ProgressSegments, PlanPicker, OrderCard), shop
  store/             slices + rtk/{authSlice,customerSlice,appSlice}
  session/           SessionManager (push, refresh), AppConfigGate, signOut
  hooks/usePayFlow   hosted checkout -> verify
  theme/             ThemeProvider, colors, tokens
```

## Run it

```bash
pnpm install                       # from the repo root
cp app/.env.example app/.env       # point EXPO_PUBLIC_API_URL at your api (use your LAN IP on a phone)
pnpm --filter app start            # Expo dev server; press i / a, or scan with Expo Go
```

Sign in with the seeded shopper `customer@tranche.ng` / `Tranche123!`. Without Paystack keys the api serves a test checkout page, so the whole buy, pay and verify loop works locally.

## Push notifications

Expo push tokens need an EAS project id. Run `eas init`, then set `EAS_PROJECT_ID` (read by `app.config.js`). Without it the app skips push registration and reminders still appear in Activity. Remote push doesn't work in Expo Go on Android; use a development build (`eas build --profile development`).

## Builds

`eas.json` has `development`, `preview` (internal APK) and `production` profiles, each with its own `EXPO_PUBLIC_API_URL`. CI can trigger them through the `EAS build` workflow in `.github/workflows`.
