/** The node bundler entry ships .d.ts beside it, but a by-path import doesn't pick them up.
 *  Only what check-invoice-pdf.tsx uses. */
declare module "*/takumi-pdf/bundlers/node.mjs" {
  export function render(node: unknown, options?: Record<string, unknown>): Promise<Uint8Array>;
}
