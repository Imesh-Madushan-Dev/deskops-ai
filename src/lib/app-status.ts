/**
 * Global kill switch. The project is paused to stop it consuming Vercel Fluid Active CPU:
 * while disabled, the proxy skips Supabase auth, every /api route returns 503 before any
 * handler code runs, and dashboard/auth pages redirect to the static landing page.
 *
 * To re-enable: flip APP_ENABLED to true below, or set the env var APP_ENABLED=true on Vercel.
 */
const APP_ENABLED = false;

export function isAppEnabled(): boolean {
  return APP_ENABLED || process.env.APP_ENABLED === "true";
}

export const APP_DISABLED_RESPONSE_BODY = { error: "Service temporarily disabled" } as const;
