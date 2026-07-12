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

### Add these ➕

| Variable | Value | Purpose |
| --- | --- | --- |
| `WHATSAPP_HOOK_URL` | `https://<your-deployed-app>/api/waha/webhook` | Where WAHA delivers incoming WhatsApp messages. Must be the **deployed** app URL — localhost won't work (use an ngrok/cloudflared tunnel URL for local testing). |
| `WHATSAPP_HOOK_EVENTS` | `message` | Only the event the app handles — don't blast every event type at the webhook. |
| `WHATSAPP_HOOK_HMAC_KEY` | same value as the app's `WAHA_WEBHOOK_SECRET` | WAHA signs each webhook body with HMAC-SHA512 (`X-Webhook-Hmac` header); the app verifies with the same key and rejects anything unsigned. |

Restart the container after adding variables.

## App variables (`.env.local` / Vercel)

| Variable | Value |
| --- | --- |
| `WAHA_BASE_URL` | `https://waha-production-xxxx.up.railway.app/` (the Railway public URL) |
| `WAHA_API_KEY` | same as the container's `WAHA_API_KEY` |
| `WAHA_WEBHOOK_SECRET` | same as the container's `WHATSAPP_HOOK_HMAC_KEY` |

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

Generate one for `WAHA_API_KEY` and a **different** one for the webhook secret.

## Connect a WhatsApp number

1. Open the WAHA dashboard at the Railway URL, log in with the dashboard username/password.
2. Start a session (name it `default`, or your own name).
3. Scan the QR code with the WhatsApp app (Settings → Linked Devices).
4. In this app: **Dashboard → Settings → Integrations** → enter the same session name → Save.

## Verify it works

1. Send a WhatsApp message to the connected number from another phone.
2. The message should appear in **Dashboard → Inbox** within a few seconds.
3. If nothing arrives, check Railway logs for webhook delivery errors and confirm `WHATSAPP_HOOK_URL` is reachable — a `401 Invalid signature` response means the HMAC keys don't match.
