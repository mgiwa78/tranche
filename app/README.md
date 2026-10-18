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

## Testing on a phone with Expo Go

A phone can't reach `localhost`, so use your computer's LAN IP (the one in Metro's `exp://` line):

```bash
# app/.env
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000/api/v1
# api/.env
APP_URL=http://<lan-ip>:4000                                  # test-checkout links open on the phone
PAYSTACK_CALLBACK_URL=                                        # empty: return via the api's /payments/return
APP_RETURN_URL=exp://<lan-ip>:8081/--/checkout/callback       # Expo Go's deep link (builds: tranche://checkout/callback)
```

Restart Metro with `npx expo start -c` after changing `app/.env`, and allow Node through the Windows firewall for port 4000.

## Push notifications

Expo push tokens need the EAS project id, which lives in `app.json` (`extra.eas.projectId`, written by `eas init`). Without it the app skips push registration and reminders still appear in Activity. Remote push doesn't exist in Expo Go on Android (since SDK 53), so `src/lib/push.ts` loads `expo-notifications` lazily and becomes a no-op there; use a development build (`eas build --profile development`) to test push.

## Builds

`eas.json` has `development`, `preview` (internal APK) and `production` profiles, each with its own `EXPO_PUBLIC_API_URL`. CI can trigger them through the `EAS build` workflow in `.github/workflows`.
