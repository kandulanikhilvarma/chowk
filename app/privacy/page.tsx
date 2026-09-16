import type { Metadata } from "next";
import Link from "next/link";
import { Doc, GRIEVANCE } from "@/components/legal/doc";

export const metadata: Metadata = { title: "Privacy policy", description: "Which personal data Chowk keeps, why, and your rights." };

export default function PrivacyPage() {
  return (
    <Doc title="Privacy policy" updated="16 September 2026">
      <p>
        This policy tells you which personal data Chowk collects, why we use it, and what you can do about it. It follows the Digital
        Personal Data Protection Act, 2023.
      </p>

      <h2>Who is responsible</h2>
      <p>
        Chowk is the data fiduciary. Contact {GRIEVANCE.name} at <a href={`mailto:${GRIEVANCE.email}`}>{GRIEVANCE.email}</a>.
      </p>

      <h2>Data that we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> an account ID, your display name and the date you joined. If you add Google, we also get your name and
          email address from Google.
        </li>
        <li>
          <strong>Ads:</strong> title, description, price, category, photos, city, locality and PIN code. We store the location only as the
          center of a square of about 500 metres, and we show distances rounded to 0.5 km.
        </li>
        <li>
          <strong>Chats and deals:</strong> your messages, offers, deal confirmations and ratings.
        </li>
        <li>
          <strong>UPI ID:</strong> only if you add it. A buyer sees it only after you both say that you met.
        </li>
        <li>
          <strong>Safety:</strong> reports that you send, reports about you, and the people that you block.
        </li>
        <li>
          <strong>Device:</strong> a cookie that keeps you signed in, and your theme choice on your device. When you tap &quot;Near me&quot;,
          your browser gives your location for that search. We store it only if you save that search.
        </li>
        <li>
          <strong>Technical logs:</strong> our hosting provider keeps logs such as IP addresses for a short time, for security.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To show your ads and let people contact you.</li>
        <li>To send chats, offers, notifications and saved search alerts.</li>
        <li>To keep Chowk safe with limits, scam warnings, reports and moderation.</li>
        <li>To obey the law.</li>
      </ul>
      <p>We do not sell your data. We do not show ads from other companies.</p>

      <h2>Consent</h2>
      <p>
        When you start an account or post an ad, you agree that we use your data for these purposes. You can withdraw your consent at any
        time when you delete your account.
      </p>

      <h2>Who processes the data</h2>
      <ul>
        <li>Supabase stores the database and the photos in its Mumbai region.</li>
        <li>Vercel hosts the website.</li>
        <li>Google handles sign-in if you choose Google.</li>
      </ul>
      <p>
        Other people see your public profile, your active ads and your ratings. Only the other person in a chat sees your messages.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account exists. Ads expire after 60 days but stay in your account until you delete them. When you
        delete your account, we delete your profile, ads, photos, chats, deals and the ratings you gave. Chats that you took part in are
        deleted for the other person too.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Access:</strong> download a copy of your data in <Link href="/me/settings">Settings</Link>.
        </li>
        <li>
          <strong>Correction:</strong> change your name and UPI ID in Settings, and edit your ads in My Chowk.
        </li>
        <li>
          <strong>Erasure:</strong> delete your account in Settings.
        </li>
        <li>
          <strong>Complaints:</strong> write to our <Link href="/grievance">grievance officer</Link>. If our answer does not satisfy you, you
          can complain to the Data Protection Board of India.
        </li>
        <li>
          <strong>Nomination:</strong> you can name a person who can use these rights for you if you die or cannot act. Write to the
          grievance officer.
        </li>
      </ul>

      <h2>Children</h2>
      <p>Chowk is for people aged 18 or older. We do not knowingly collect data from children.</p>

      <h2>Security</h2>
      <p>
        Access rules in the database let each person read only their own private data. Data travels over HTTPS. If you find a security
        problem, write to the grievance officer at once.
      </p>

      <h2>Changes</h2>
      <p>The date of the last change is at the top of this page.</p>
    </Doc>
  );
}
