import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifies the WAHA webhook shared-secret signature before any payload is trusted. */
export function verifyWahaSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.WAHA_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signatureHeader, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
