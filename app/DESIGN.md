# Design

Tranche should feel calm and exact: a shopper always knows what they owe, when, and to whom. Tokens: `src/theme/colors.ts` and `src/theme/tokens.ts`. Components: `src/ui`.

## Theme

Both themes come from one token set.

- **Light:** cool paper (`#F7FAFE`) with navy ink (`#071530`).
- **Dark:** brand navy (`#030B1F` canvas, `#071533` raised).
- Default is **Match system**. Users can pin Light or Dark in Account, Appearance.
- **Brand moments stay navy in every mode** via `<ThemeScope scheme="dark">`: launch, onboarding, and the balance card at the top of Plans.

## Color

Restrained. Neutrals are tinted toward navy. Tranche green (`accent`: `#0F7B5B` light, `#2BB784` dark) marks paid segments, selection, available credit and links. Warn amber marks overdue and failed payments; it never appears for anything the shopper hasn't missed.

| Token | Use |
|---|---|
| `canvas` / `raised` / `sunken` | Screen, grouped lists and cards, inputs |
| `fill` / `fillStrong` | Secondary buttons, icon tiles, unpaid segments |
| `ink` / `ink2` / `ink3` / `ink4` | Text emphasis. `ink4` is below 4.5:1: placeholders and disabled only |
| `accent` / `accentInk` / `accentWash` | Paid segment and selection / green text / selected plan and credit banner |
| `danger` / `warn` / `success` | Destructive and declined, overdue, confirmation |

Primary buttons are **ink-filled**. The green `accent` button is reserved for paying something that is overdue or failed, and for the onboarding call to action.

## Typography

Geist (400, 500, 600, 700), loaded in `app/_layout.tsx`. Always use `<Text variant>` from `src/ui`.

`display 34` · `title1 28` · `title2 22` · `title3 18` · `body 16` · `callout 15` · `subhead 14` · `footnote 13` · `caption 12` · `micro 11`. Amounts, dates and counts use `tabular`.

Sentence case everywhere.

## Shape

Interactive controls are **pills**, small surfaces are **tiles (14)**, large containers are **panels (28)**. Avatars are squircles at 30% of their size.

## Signature: the segmented bar

The Tranche mark is one bar split into four, the first filled. The same shape is the app's progress indicator (`ProgressSegments`): one segment per installment, green when paid, amber when overdue. It appears on onboarding, plan cards, the order screen and the checkout result. Prefer it to percentages.

## Components (`src/ui`, `src/components`)

`Text`, `Icon` (single 1.75-stroke set), `Button` (primary, accent, secondary, quiet, danger, dangerQuiet; lg 52, md 44, sm 36), `IconButton` (44 target minimum), `Tappable` (the only press primitive), `Avatar`, `TextField`, `SearchField`, `Chips`, `Segmented`, `ListGroup`/`ListRow`, `Screen`, `NavBar`, `TabHeader` + `LargeTitle`, `StackPage`, `Sheet`, `Spinner`, `BrandMark`, `haptic`. Money: `Schedule`, `ProgressSegments`, `PlanPicker`, `OrderCard`. Shop: `ProductCard`.

## Layout

20px gutter. Tab screens: large title that scrolls away under a compact header. Pushed screens: `StackPage`, with the primary action pinned in its footer. Settings-style content: raised `ListGroup`s with the explanation in the group footer. The floating navy tab bar is always on screen.

## Motion

Reanimated, strong ease-out `(0.23, 1, 0.32, 1)`. Presses 140ms, state 180 to 240ms, entrances up to 360ms. Success uses a single zoom-in on the result mark and a success haptic; nothing loops. Reanimated follows the system reduce-motion setting.

## Copy

Describe exactly what will happen: "We'll charge your saved card on 14 Nov", not "Don't forget!". Always pair an amount with its date or store. Failure copy says whether the shopper was charged.
