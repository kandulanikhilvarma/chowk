import { describe, expect, it } from "vitest";
import { scamWarnings } from "../../lib/scam";

const signals = (text: string) => scamWarnings(text).map((w) => w.signal);

describe("scamWarnings", () => {
  it.each([
    ["Send me the OTP you just got", "otp"],
    ["Tell me the one time password", "otp"],
    ["Scan this QR to receive the money", "qr"],
    ["I sent a QR code, you will get 5000", "qr"],
    ["I will send a collect request, accept it", "upi_collect"],
    ["Enter your PIN to get the payment", "upi_collect"],
    ["Pay 500 courier charges and I ship today", "courier"],
    ["Only delivery fee is pending", "courier"],
    ["Send 2000 advance to book it", "advance"],
    ["Pay the token amount first", "advance"],
    ["Message me on WhatsApp", "off_app"],
    ["My number is 9876543210", "off_app"],
    ["Call me +91 98765 43210", "off_app"],
  ])("flags %j as %s", (text, signal) => {
    expect(signals(text)).toContain(signal);
  });

  it.each([
    "Is it still available?",
    "Can we meet at the metro station at 6?",
    "What is your last price?",
    "The bike has done 12000 km",
    "I like hotpot and shopping",
    "Price is 45000, a little negotiable",
  ])("does not flag %j", (text) => {
    expect(signals(text)).toEqual([]);
  });
});
