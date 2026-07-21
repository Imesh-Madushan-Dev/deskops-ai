import "server-only";

import { ImageResponse } from "next/og";
import { formatMoney } from "@/lib/utils/money";

type InvoiceImageInput = {
  businessName: string;
  currency: string;
  number: string;
  dateISO: string;
  items: { description: string; quantity: number; unit_price: number; line_total: number }[];
  subtotal: number;
  tax: number;
  total: number;
};

const INK = "#0f172a";
const MUTED = "#64748b";
const BRAND = "#6d28d9";
const LINE = "#e2e8f0";

const cell = (flex: number, align: "flex-start" | "flex-end") => ({ display: "flex", flex, justifyContent: align } as const);

/** Renders a clean invoice document to a PNG and returns it base64-encoded (no data: prefix) so it can
 *  be sent straight to WAHA's sendImage `data` field. Content is Latin + numbers, so the @vercel/og
 *  built-in font is enough — no custom font wiring needed. */
export async function renderInvoiceImagePng(input: InvoiceImageInput): Promise<string> {
  const width = 820;
  const height = 360 + input.items.length * 52 + (input.tax > 0 ? 44 : 0);
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(input.dateISO));

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", color: INK, padding: 48, fontSize: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{input.businessName}</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: BRAND, letterSpacing: 2 }}>INVOICE</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 20, color: MUTED }}>
          <div style={{ display: "flex" }}>{input.number}</div>
          <div style={{ display: "flex" }}>{date}</div>
        </div>

        <div style={{ display: "flex", height: 2, backgroundColor: LINE, marginTop: 20, marginBottom: 18 }} />

        <div style={{ display: "flex", fontSize: 18, color: MUTED, fontWeight: 700, paddingBottom: 10 }}>
          <div style={cell(6, "flex-start")}>ITEM</div>
          <div style={cell(2, "flex-end")}>QTY</div>
          <div style={cell(3, "flex-end")}>PRICE</div>
          <div style={cell(3, "flex-end")}>TOTAL</div>
        </div>

        {input.items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: 52, borderTop: `1px solid ${LINE}` }}>
            <div style={cell(6, "flex-start")}>{it.description}</div>
            <div style={cell(2, "flex-end")}>{it.quantity}</div>
            <div style={cell(3, "flex-end")}>{formatMoney(it.unit_price, input.currency)}</div>
            <div style={{ ...cell(3, "flex-end"), fontWeight: 700 }}>{formatMoney(it.line_total, input.currency)}</div>
          </div>
        ))}

        <div style={{ display: "flex", height: 2, backgroundColor: LINE, marginTop: 18, marginBottom: 14 }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: 320, color: MUTED, fontSize: 20 }}>
            <div style={{ display: "flex" }}>Subtotal</div>
            <div style={{ display: "flex" }}>{formatMoney(input.subtotal, input.currency)}</div>
          </div>
          {input.tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", width: 320, color: MUTED, fontSize: 20, marginTop: 6 }}>
              <div style={{ display: "flex" }}>Tax</div>
              <div style={{ display: "flex" }}>{formatMoney(input.tax, input.currency)}</div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", width: 320, marginTop: 12, fontSize: 28, fontWeight: 700, color: BRAND }}>
            <div style={{ display: "flex" }}>Total</div>
            <div style={{ display: "flex" }}>{formatMoney(input.total, input.currency)}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 24, fontSize: 18, color: MUTED }}>Thank you for your order.</div>
      </div>
    ),
    { width, height },
  );

  return Buffer.from(await image.arrayBuffer()).toString("base64");
}
