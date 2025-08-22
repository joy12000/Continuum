import { stripHtmlToText } from "../tokenize";
const SENT_SPLIT = /(?<=[.!?。！？])\s+(?=[^a-z])|\n{2,}/gi;
export function toSentences(htmlOrText) {
    const text = stripHtmlToText ? stripHtmlToText(htmlOrText) : String(htmlOrText || "");
    const raw = text.split(SENT_SPLIT).map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const s of raw) {
        if (out.length && (s.length < 40 || s.split(/\s+/).length < 6))
            out[out.length - 1] = out[out.length - 1] + " " + s;
        else
            out.push(s);
    }
    return out;
}
export function tokenize(text) {
    return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
}
