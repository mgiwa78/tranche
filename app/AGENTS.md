# TRANCHE: AI agent and developer guidelines

This workspace is **app**, the Tranche shopper app for iOS and Android. It lives in the Tranche monorepo next to `../api` (NestJS), `../web` (merchant dashboard, staff console and marketing site) and `../shared` (the contract all three use).

## 1. Design

Before writing UI code, read **`DESIGN.md`** (tokens, type, components, motion, copy rules).

### Rules

- **Build screens from `src/ui`.** Use `Text`, `Button`, `IconButton`, `ListGroup`/`ListRow`, `StackPage`, `NavBar`, `Avatar`, `Icon` and friends. Do not hand-roll buttons, rows, headers or colors.
- **Colors come from `useTheme().colors`.** Never hardcode hex in screens. Fixed brand values are in `brand` (`src/theme/colors.ts`).
- **Light and dark from one token set.** Appearance follows the system by default. Launch, onboarding and the Plans balance card are pinned navy with `<ThemeScope scheme="dark">`.
- **Green is for money moving in the shopper's favour and selection,** not decoration. Primary buttons are ink-filled.
- **Geist via `<Text variant>`.** Custom fonts ignore `fontWeight`; use the `weight` prop.
- **Money is integer kobo** everywhere; render it with `formatNaira` from `@tranche/shared`. Never do float arithmetic on amounts.
- **Schedules come from `buildInstallmentSchedule`** in `@tranche/shared`, the same function the api uses to create them. Don't recompute dates or splits in the app.
- **Forms validate with the shared Zod schemas** (`validateWith(schema, input)`), so the app shows the same messages the api would return.

### Anti-patterns (never)

- Hiding fees or dates. Every amount and due date is visible before the shopper confirms.
- Urgency or guilt copy ("Don't miss out!", "Act now"). Reminders state facts: amount, store, date.
- Gradient blobs, glass panels, colored shadows, all-caps eyebrow labels, em dashes in copy, fake stats.

## 2. Technical stack

- **Expo SDK 57**, Expo Router, TypeScript, Reanimated 4, **Redux Toolkit + RTK Query** (one `createApi` per api area: `authApi`, `customerApi`, `appApi`; endpoints injected from `*.service.ts`).
- Tokens in `expo-secure-store`; settings in AsyncStorage.
- Push: `expo-notifications` with Expo push tokens, registered via `POST /notifications/device-tokens`.
- Payments: Paystack hosted checkout through `expo-web-browser` auth sessions (`src/hooks/usePayFlow.ts`); saved cards are charged server side.
- Docs: https://docs.expo.dev/versions/v57.0.0/ (read the versioned docs before writing code).

## 3. Theming

- Tokens: `src/theme/colors.ts` (`lightColors`, `darkColors`, `brand`) and `src/theme/tokens.ts` (type, space, radius, motion).
- Preference: `settings.appearance` is `system` | `light` | `dark` (persisted).
- In UI code: `const { colors, isDark } = useTheme()`.
- Each `Screen` sets the status bar style for its theme on focus.
