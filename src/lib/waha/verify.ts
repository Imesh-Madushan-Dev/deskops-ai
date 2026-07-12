import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifies the WAHA webhook shared-secret signature before any payload is trusted.
 *  WAHA (WHATSAPP_HOOK_HMAC_KEY) sends `X-Webhook-Hmac` with `X-Webhook-Hmac-Algorithm: sha512`;
 *  older/custom setups may send sha256 in `x-webhook-signature`. */
export function verifyWahaSignature(rawBody: string, signatureHeader: string | null, algorithm = "sha512") {
  const secret = process.env.WAHA_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;
  if (algorithm !== "sha512" && algorithm !== "sha256") return false;

  const expected = createHmac(algorithm, secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signatureHeader, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
