export type ScamSignal = "otp" | "qr" | "upi_collect" | "courier" | "advance" | "off_app";

// Patterns from common Indian marketplace scams. A hit shows a warning; it never blocks the message.
const RULES: { signal: ScamSignal; pattern: RegExp; warning: string }[] = [
  {
    signal: "otp",
    pattern: /\b(otp|one[\s-]?time[\s-]?password|verification code)\b/i,
    warning: "Never share an OTP. A real buyer or seller never needs it.",
  },
  {
    signal: "qr",
    pattern: /\b(scan|send)\b.{0,30}\bqr\b|\bqr\b.{0,40}\b(receive|get|credit)/i,
    warning: "You never scan a QR code to receive money.",
  },
  {
    signal: "upi_collect",
    pattern: /\b(collect|payment|money) request\b|upi:\/\/|\b(enter|type)\b.{0,15}\bpin\b/i,
    warning: "Do not accept a payment request or enter your UPI PIN to receive money.",
  },
  {
    signal: "courier",
    pattern: /\b(courier|delivery|shipping|transport|parcel|gst|insurance)\s+(fee|fees|charge|charges|amount)\b/i,
    warning: "Never pay a courier or delivery fee to a stranger. Meet in person.",
  },
  {
    signal: "advance",
    pattern: /\b(advance|booking amount|token amount|pay first|deposit)\b/i,
    warning: "Do not pay in advance. Pay only when the item is in your hands.",
  },
  {
    signal: "off_app",
    pattern: /\b(whats\s?app|telegram)\b|\bcall me\b|(\+91[\s-]?)?\b[6-9]\d{9}\b/i,
    warning: "Keep the chat on Chowk until you meet. Scammers move chats to WhatsApp.",
  },
];

export function scamWarnings(text: string): { signal: ScamSignal; warning: string }[] {
  return RULES.filter((r) => r.pattern.test(text)).map(({ signal, warning }) => ({ signal, warning }));
}
