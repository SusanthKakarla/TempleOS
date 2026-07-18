const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Formats a NUMERIC(12,2)-as-string or plain number amount as ₹-prefixed, comma-grouped rupees. */
export function formatInr(amount: string | number): string {
  return inrFormatter.format(typeof amount === "string" ? Number(amount) : amount);
}
