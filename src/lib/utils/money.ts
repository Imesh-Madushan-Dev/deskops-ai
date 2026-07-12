/** All money math happens here — the model only ever formats/echoes these results. */

export function calculateLineTotal(quantity: number, unitPrice: number) {
  return round2(quantity * unitPrice);
}

export function calculateInvoiceTotals(items: { quantity: number; unitPrice: number }[], taxRate = 0) {
  const subtotal = round2(items.reduce((sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice), 0));
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency, currencyDisplay: "code" }).format(amount);
}
