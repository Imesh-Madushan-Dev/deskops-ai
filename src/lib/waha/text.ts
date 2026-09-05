/** Models write chat-UI markdown; WhatsApp speaks a different, smaller dialect. Converting here
 *  rather than only in the prompt means a formatting slip never reaches a customer, whatever model
 *  produced it. WhatsApp: *bold*, _italic_, ~strike~, ```mono``` — no headings, links or tables. */
export function toWhatsappText(text: string) {
  return text
    .replace(/```[a-z]*\r?\n?([\s\S]*?)```/gi, "$1") // fenced code: keep the contents, drop the fence
    .replace(/^#{1,6}\s+/gm, "") // headings have no equivalent
    .replace(/^[ \t]*[-*+][ \t]+/gm, "• ") // list markers: a leading * would read as bold
    .replace(/\*\*\*(.+?)\*\*\*/g, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*") // **bold** -> *bold*
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // [text](url) -> text (url)
    .replace(/\n{3,}/g, "\n\n") // never more than one blank line
    .trim();
}
