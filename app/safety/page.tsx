import type { Metadata } from "next";
import { Doc } from "@/components/legal/doc";

export const metadata: Metadata = { title: "Stay safe", description: "Common scams on Indian marketplaces and how to avoid them." };

export default function SafetyPage() {
  return (
    <Doc title="Stay safe on Chowk">
      <p>Most people on Chowk are honest. These rules protect you from the few people who are not.</p>

      <h2>Scams to know</h2>
      <ul>
        <li>
          <strong>QR code to receive money.</strong> You never scan a QR code or enter your UPI PIN to receive money. Scanning sends money
          from your account.
        </li>
        <li>
          <strong>OTP requests.</strong> Never share an OTP. A person who asks for it wants your account or your bank.
        </li>
        <li>
          <strong>Courier or delivery fee.</strong> The other person asks you to pay a small fee for courier, GST or insurance. This is a
          scam.
        </li>
        <li>
          <strong>Advance payment.</strong> Do not pay a token amount or a deposit before you see the item.
        </li>
        <li>
          <strong>Transfer story.</strong> The seller says that they moved to another city and will send the item after you pay. Do not pay.
        </li>
        <li>
          <strong>Move to WhatsApp.</strong> Scammers want to leave Chowk, where we can warn you. Keep the chat on Chowk until you meet.
        </li>
      </ul>
      <p>Chowk shows a warning in the chat when a message looks like one of these scams.</p>

      <h2>When you meet</h2>
      <ul>
        <li>Meet in daylight in a busy public place, for example a mall or a metro station.</li>
        <li>Take a friend with you if you can.</li>
        <li>Check the item carefully before you pay. Test phones and electronics.</li>
        <li>Pay only when the item is in your hands.</li>
      </ul>

      <h2>Phones</h2>
      <p>
        Dial *#06# on the phone to see its IMEI number. Check that number on{" "}
        <a href="https://sancharsaathi.gov.in" target="_blank" rel="noopener noreferrer">
          Sanchar Saathi
        </a>{" "}
        to see if the phone is reported lost or stolen.
      </p>

      <h2>Cars and bikes</h2>
      <p>
        Compare the name on the RC with the ID of the seller. Check the vehicle details on{" "}
        <a href="https://parivahan.gov.in" target="_blank" rel="noopener noreferrer">
          Parivahan
        </a>
        . Complete the owner transfer at the RTO.
      </p>

      <h2>If something goes wrong</h2>
      <ul>
        <li>Tap Report on the ad or in the chat. Tap Block in the chat to stop all messages from that person.</li>
        <li>
          If you lost money, call the cybercrime helpline 1930 at once, or report it at{" "}
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
            cybercrime.gov.in
          </a>
          .
        </li>
      </ul>
    </Doc>
  );
}
