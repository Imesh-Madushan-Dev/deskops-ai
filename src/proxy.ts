import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { APP_DISABLED_RESPONSE_BODY, isAppEnabled } from "@/lib/app-status";

export async function proxy(request: NextRequest) {
  if (!isAppEnabled()) return disabledResponse(request);
  return updateSession(request);
}

/** Paused mode: no Supabase calls, no API handlers, only the static landing page is served. */
function disabledResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/auth")) {
    return NextResponse.json(APP_DISABLED_RESPONSE_BODY, { status: 503 });
  }
  if (pathname !== "/") return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
