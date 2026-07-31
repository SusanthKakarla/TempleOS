const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Formats a NUMERIC(12,2)-as-string or plain number amount as ₹-prefixed, comma-grouped rupees. */
export function formatInr(amount: string | number): string {
  return inrFormatter.format(typeof amount === "string" ? Number(amount) : amount);
}

/** Returns a formatted ₹ amount, or "—" for non-cash / in-kind donation rows where amount is null. */
export function formatDonationAmount(amount: string | number | null): string {
  if (amount == null) return "—";
  return formatInr(amount);
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
  razorpay: "Razorpay",
};

/**
 * Returns the payment method label for export/display, or "Non-cash" for in-kind donation rows
 * where itemDescription is set and paymentMethod is null.
 */
export function formatDonationKindOrMethod(
  paymentMethod: string | null,
  itemDescription: string | null,
): string {
  if (itemDescription) return "Non-cash";
  if (paymentMethod) return PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod;
  return "—";
}
