import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/db/auth";
import { resolveSessionName } from "@/lib/waha/session";
import { fetchWahaQr, isWahaConfigured } from "@/lib/waha/client";

/** Proxies the pairing QR so the browser never sees WAHA_API_KEY, and so one business can only ever
 *  request its own session's code. */
export async function GET() {
  try {
    const { business } = await getCurrentBusiness();
    if (!isWahaConfigured()) return NextResponse.json({ error: "WhatsApp is not configured on this server yet." }, { status: 503 });

    const upstream = await fetchWahaQr(resolveSessionName(business));
    // Almost always "session isn't waiting for a scan" — the card polls status and will re-request.
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "No QR code available right now." }, { status: 409 });

    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "no-store", // QR codes rotate every ~20s — a cached one is a dead one.
      },
    });
  } catch {
    return NextResponse.json({ error: "Couldn't load the QR code. Please try again." }, { status: 502 });
  }
}
