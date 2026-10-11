/** ISO 4217 currency codes available in this browser, sorted. */
export function listCurrencies(): string[] {
  try {
    const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    if (typeof intlAny.supportedValuesOf === 'function') {
      return [...intlAny.supportedValuesOf('currency')].sort();
    }
  } catch {
    // fall through
  }
  return FALLBACK_CURRENCIES;
}

export function currencyLabel(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'name',
    }).formatToParts(1);
    const name = parts.find(p => p.type === 'currency')?.value;
    return name && name.toUpperCase() !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

const FALLBACK_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'LKR', 'AUD', 'CAD', 'JPY', 'CNY', 'SGD',
  'AED', 'CHF', 'NZD', 'HKD', 'KRW', 'MYR', 'THB', 'PHP', 'IDR', 'PKR',
  'BDT', 'NPR', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'ZAR', 'BRL', 'MXN',
  'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'RUB', 'UAH', 'EGP', 'NGN', 'KES',
].sort();

export const DEFAULT_CURRENCY = 'LKR';
