/**
 * All money in Tranche is integer kobo (1 NGN = 100 kobo). Never store or add floats:
 * convert at the edges (`toKobo` on input, `formatNaira` on display).
 */
export const KOBO_PER_NAIRA = 100;
export const CURRENCY = "NGN";

export const toKobo = (naira: number): number => Math.round(naira * KOBO_PER_NAIRA);

export const fromKobo = (kobo: number): number => kobo / KOBO_PER_NAIRA;

export const sumKobo = (values: number[]): number => values.reduce((total, v) => total + v, 0);

/** `bps` = basis points (1% = 100 bps). Rounds half away from zero to the nearest kobo. */
export const percentOfKobo = (kobo: number, bps: number): number => Math.round((kobo * bps) / 10_000);

/**
 * Split `kobo` into `parts` integer amounts that sum exactly to the input.
 * The first part absorbs the remainder so later installments are identical.
 */
export const splitKobo = (kobo: number, parts: number): number[] => {
  if (!Number.isInteger(kobo) || kobo < 0) throw new RangeError("kobo must be a non-negative integer");
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError("parts must be a positive integer");
  const base = Math.floor(kobo / parts);
  const remainder = kobo - base * parts;
  return Array.from({ length: parts }, (_, i) => (i === 0 ? base + remainder : base));
};

const formatters = new Map<string, Intl.NumberFormat>();
const formatter = (fractionDigits: number) => {
  const key = String(fractionDigits);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
};

/** `formatNaira(1234550)` -> "₦12,345.50". Whole amounts drop the decimals unless `exact`. */
export const formatNaira = (kobo: number, opts: { exact?: boolean } = {}): string => {
  const naira = fromKobo(kobo);
  const whole = Number.isInteger(naira);
  return formatter(whole && !opts.exact ? 0 : 2).format(naira);
};
