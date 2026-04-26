/**
 * Static currency conversion table. For a real product these would be live
 * rates from a forex API; for the educational MVP a fixed table keeps the
 * feature offline-functional and deterministic for tests.
 *
 * Rates are quoted as "1 unit of base currency in target currency".
 */
export type CurrencyCode = "USD" | "KRW" | "CNY" | "JPY" | "EUR" | "HKD";

const RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  KRW: 1 / 1380, // ~1380 KRW per USD
  CNY: 1 / 7.25, // ~7.25 CNY per USD
  JPY: 1 / 155,
  EUR: 1.08,
  HKD: 1 / 7.8,
};

export function convert(
  amount: number,
  from: CurrencyCode | string | undefined,
  to: CurrencyCode | string | undefined,
): number {
  if (!from || !to || from === to) return amount;
  const fromRate = RATES_TO_USD[from as CurrencyCode];
  const toRate = RATES_TO_USD[to as CurrencyCode];
  if (fromRate === undefined || toRate === undefined) return amount;
  const usd = amount * fromRate;
  return usd / toRate;
}

export const SUPPORTED_DISPLAY_CURRENCIES: CurrencyCode[] = ["USD", "KRW", "CNY"];
