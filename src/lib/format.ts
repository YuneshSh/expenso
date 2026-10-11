// Shared currency / number formatting helpers.

// Integer grouping only (e.g. 1234567 -> "1,234,567").
export const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n);

// Always two decimals (e.g. 1234.5 -> "1,234.50").
export const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

// Strip grouping separators so a display string can be parsed.
export const toRaw = (display: string) => display.replace(/,/g, '');

// Accepts digits with an optional decimal point and up to 2 decimal places.
// Used to validate keystrokes in amount inputs.
export const AMOUNT_RE = /^\d*\.?\d{0,2}$/;

/**
 * Format a raw amount string for display *while the user is typing*, grouping the
 * integer part with commas but preserving the (possibly partial) decimal the user
 * is entering. e.g. "1234" -> "1,234", "1234." -> "1,234.", "1234.5" -> "1,234.5".
 */
export function formatAmountInput(raw: string): string {
  if (raw === '') return '';
  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) {
    const n = Number(raw);
    return isNaN(n) ? raw : n.toLocaleString('en-US');
  }
  const intPart = raw.slice(0, dotIndex);
  const decPart = raw.slice(dotIndex + 1);
  const intNum = intPart === '' ? '0' : Number(intPart).toLocaleString('en-US');
  return `${intNum}.${decPart}`;
}

/**
 * Normalise a numeric value into a grouped, decimal-preserving display string
 * (used when seeding an edit form from an existing amount).
 */
export function amountToInput(value: number): string {
  return formatAmountInput(String(value));
}

/** Prefix an amount with the currency code, e.g. "USD 1,234.50". */
export function money(amount: number, currency: string, decimals = true): string {
  return `${currency} ${decimals ? fmtFull(amount) : fmtNum(amount)}`;
}

/** Compact amount with currency, e.g. "USD 917K". */
export function moneyCompact(amount: number, currency: string): string {
  let compact: string;
  if (amount >= 100000) compact = `${(amount / 1000).toFixed(0)}K`;
  else if (amount >= 1000) compact = new Intl.NumberFormat('en-US').format(Math.round(amount));
  else compact = amount.toFixed(0);
  return `${currency} ${compact}`;
}
