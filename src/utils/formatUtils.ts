/**
 * Centralized Currency and Number Formatting Utility
 * Prevents any "Cannot read properties of undefined (reading 'toLocaleString')" errors
 * across the entire application by safely handling null, undefined, NaN, and strings.
 */

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0';
  }
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('en-IN');
}

export function formatPrice(amount: number | string | null | undefined): string {
  return `₹${formatCurrency(amount)}`;
}
