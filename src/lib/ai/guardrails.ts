import "server-only";

/** Redacts phone numbers and emails before any text reaches a log line or model trace. */
export function redactPii(text: string) {
  return text
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[phone]")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
}

/** The model may only echo numbers that already exist in the DB — never trust a figure it invents. */
export function verifyAmountAgainstSource(claimed: number, source: number, tolerance = 0.01) {
  return Math.abs(claimed - source) <= tolerance;
}

export function truncateForModel(text: string, maxChars = 4000) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
