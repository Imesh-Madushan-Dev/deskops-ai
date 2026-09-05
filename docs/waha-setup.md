# WAHA on Railway — Environment Setup

How to wire the WAHA (WhatsApp HTTP API) container on Railway to this app. Two sides must agree: the **Railway container** signs and sends webhooks; the **app** (`.env.local` / Vercel env) verifies and calls back.

## Railway container variables

### Already set ✅

| Variable | Purpose |
| --- | --- |
| `PORT` | Container port (Railway default). |
| `WAHA_API_KEY` | Protects WAHA's REST API — the app sends this as `X-Api-Key` when sending messages. |
| `WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD` | Login for the WAHA web dashboard (where you scan the QR code). |
| `WAHA_SESSIONS_PATH` | Where session auth state is persisted (attach a Railway volume here or you re-scan the QR on every deploy). |
| `WHATSAPP_DEFAULT_ENGINE` | WhatsApp engine (`WEBJS` / `NOWEB` / `GOWS`). |

### Webhooks: nothing to add ✅

The container-level `WHATSAPP_HOOK_*` variables are no longer needed. The app registers the webhook
**per session** when the owner clicks Connect (`POST /api/sessions/start` with `config.webhooks`), so
the URL, the `message` + `session.status` subscription, the HMAC key and the retry policy all come
from the app's own env. That is what makes one WAHA instance serve many businesses.

If those variables are still set on the container they act as defaults for sessions created outside
the app; harmless, but the app overwrites them on the sessions it starts.

## App variables (`.env.local` / Vercel)

| Variable | Value |
| --- | --- |
| `WAHA_BASE_URL` | `https://waha-production-xxxx.up.railway.app/` (the Railway public URL) |
| `WAHA_API_KEY` | same as the container's `WAHA_API_KEY` |
| `WAHA_WEBHOOK_SECRET` | any long random string — the app hands this to WAHA as the per-session HMAC key and verifies incoming webhooks against it |
| `APP_URL` | Public origin WAHA posts webhooks back to, e.g. `https://deskops-ai.vercel.app`. Set automatically on Vercel via `VERCEL_URL`; **locally you must set a tunnel URL** (ngrok/cloudflared) because WAHA runs on Railway and cannot reach `localhost`. Connect fails with a clear error if it is missing. |

## How to generate the secrets

Any long random string works — the same value just has to be on both sides.

```powershell
# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

```bash
# bash / Git Bash
openssl rand -hex 32
```

Generate one for `WAHA_API_KEY` and a **different** one for `WAHA_WEBHOOK_SECRET`.

## Connect a WhatsApp number

Owners never touch the WAHA dashboard — the whole flow lives in the product:

1. **Dashboard → Settings → Integrations → Connect WhatsApp.**
2. A QR code appears in the app. Scan it with WhatsApp (Settings → Linked devices → Link a device).
3. The card polls the session status and flips to **Connected** with the linked number on its own.

Behind that button: the app starts a session named after the business (`biz-<business id>`), or reuses
whatever name is already stored on the business row, and registers the webhook on it. The same card
also exposes **Restart** (for a failed session) and **Disconnect** (logs the number out, deletes the
session and clears the row).

The Railway dashboard login is still useful for debugging, but it is not part of onboarding.

## Verify it works

1. Send a WhatsApp message to the connected number from another phone.
2. The message should appear in **Dashboard → Inbox** within a few seconds.
3. If nothing arrives, check Railway logs for webhook delivery errors and confirm `WHATSAPP_HOOK_URL` is reachable — a `401 Invalid signature` response means the HMAC keys don't match.
