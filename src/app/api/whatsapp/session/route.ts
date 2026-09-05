import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { updateBusiness } from "@/lib/db/business";
import { phoneFromWahaId, resolveSessionName, sessionNameFor } from "@/lib/waha/session";
import {
  deleteWahaSession,
  getWahaSession,
  isWahaConfigured,
  logoutWahaSession,
  restartWahaSession,
  startWahaSession,
  type WahaSession,
} from "@/lib/waha/client";

/** `NOT_CONFIGURED` is ours, not WAHA's — the server is missing WAHA_BASE_URL/WAHA_API_KEY, which is
 *  an operator problem, not something the owner can fix by scanning a QR. */
export type WhatsappSessionState = {
  session: string;
  status: "NOT_CONFIGURED" | WahaSession["status"];
  connected: boolean;
  phone: string | null;
  pushName: string | null;
};

const actionSchema = z.object({ action: z.enum(["connect", "restart", "logout", "disconnect"]) });

function toState(session: string, waha: WahaSession | null): WhatsappSessionState {
  return {
    session,
    status: waha?.status ?? "STOPPED", // No session in WAHA yet — same story to the owner as a stopped one.
    connected: waha?.status === "WORKING",
    phone: phoneFromWahaId(waha?.me?.id),
    pushName: waha?.me?.pushName ?? null,
  };
}

/** WAHA errors carry upstream response bodies — never show those to an owner. The APP_URL case is the
 *  one exception: it is a deployment misconfiguration whose message is the actual fix. */
function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("APP_URL")) return message;
  return "Couldn't reach the WhatsApp service. Please try again in a moment.";
}

export async function GET() {
  try {
    const { business } = await getCurrentBusiness();
    const session = resolveSessionName(business);
    if (!isWahaConfigured()) return NextResponse.json({ session, status: "NOT_CONFIGURED", connected: false, phone: null, pushName: null } satisfies WhatsappSessionState);
    return NextResponse.json(toState(session, await getWahaSession(session)));
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown WhatsApp action." }, { status: 400 });

  try {
    const { business } = await getCurrentBusiness();
    const session = resolveSessionName(business);
    if (!isWahaConfigured()) return NextResponse.json({ error: "WhatsApp is not configured on this server yet." }, { status: 503 });

    switch (parsed.data.action) {
      case "connect":
        await startWahaSession(session);
        // Only persist once WAHA accepted the session, so a failed start doesn't strand a name on the row.
        if (!business.whatsapp_session) await updateBusiness({ whatsappSession: session });
        break;
      case "restart":
        await restartWahaSession(session);
        break;
      case "logout":
        await logoutWahaSession(session);
        break;
      case "disconnect":
        await logoutWahaSession(session);
        await deleteWahaSession(session);
        await updateBusiness({ whatsappSession: null });
        break;
    }

    // Disconnect cleared the saved name, so report the one a fresh connect would use.
    const current = parsed.data.action === "disconnect" ? sessionNameFor(business.id) : session;
    // Re-read rather than trusting the action's response — start/restart return before the status settles.
    return NextResponse.json(toState(current, await getWahaSession(current)));
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 502 });
  }
}
