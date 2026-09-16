import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Doc, GRIEVANCE } from "@/components/legal/doc";

export const metadata: Metadata = { title: "Help", description: "Answers to common questions about Chowk." };

const faqs: [string, ReactNode][] = [
  ["Does Chowk cost money?", "No. Posting, chats, moving an ad up and renewing are free. Chowk takes no commission and never holds your money."],
  [
    "Do I need an account?",
    <>
      You can browse without one. When you post, chat or save something, Chowk starts a guest account on this device. On My Chowk, tap
      Save my account with Google so that you do not lose it.
    </>,
  ],
  ["How do I post an ad?", "Tap Sell. Add photos first, then the title, price and place. Chowk suggests a category and shows prices of similar ads."],
  ["How do I edit, reserve or mark an ad as sold?", "Open My Chowk. Each ad has buttons to reserve, move up, pause, mark as sold, edit and delete it."],
  [
    "What do Move up and Renew do?",
    "Move up puts your ad at the top of the list again, once every 7 days (every 3 days for Regular sellers). An ad stays online for 60 days. Renew adds 60 more days.",
  ],
  ["How do offers work?", "In a chat, the buyer taps Make an offer. The seller accepts or declines it. An accepted offer is an agreement, not a payment."],
  [
    "How do deals and ratings work?",
    "In the chat, the seller taps Mark sold. The buyer confirms the deal. Then both people rate each other as friendly and reliable.",
  ],
  [
    "What do the badges and levels mean?",
    "Friendly and Reliable badges show after 1, 3 and 6 different people rate you. Ratings from guest accounts do not count. You are Trusted after 1 deal, and Regular after 5 deals and 3 reliable ratings.",
  ],
  ["How do saved searches work?", "On a search page, tap Save this search. You get a notification when a new ad matches it."],
  [
    "How do I pay?",
    "Pay only when you meet and have the item. After you both tap We met in person, the buyer sees a Pay with UPI button. The button shows only if the seller added a UPI ID.",
  ],
  ["How do I report or block someone?", "Tap Report on an ad or a profile. In a chat you can report and block the other person. Blocked people cannot send you messages."],
  [
    "How do I get my data or delete my account?",
    <>
      Open <Link href="/me/settings">Settings</Link>. You can download your data and delete your account there.
    </>,
  ],
];

export default function HelpPage() {
  return (
    <Doc title="Help">
      <div className="space-y-2">
        {faqs.map(([question, answer]) => (
          <details key={question} className="rounded-card bg-surface p-4 ring-1 ring-line">
            <summary className="cursor-pointer font-semibold">{question}</summary>
            <p className="mt-2">{answer}</p>
          </details>
        ))}
      </div>
      <p>
        Still stuck? Read the <Link href="/safety">safety tips</Link> or write to{" "}
        <a href={`mailto:${GRIEVANCE.email}`}>{GRIEVANCE.email}</a>.
      </p>
    </Doc>
  );
}
