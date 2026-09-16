import type { Metadata } from "next";
import Link from "next/link";
import { Doc, GRIEVANCE } from "@/components/legal/doc";
import { GROUPS } from "@/lib/prohibited";

export const metadata: Metadata = { title: "Terms of use", description: "The rules for using Chowk." };

export default function TermsPage() {
  return (
    <Doc title="Terms of use" updated="16 September 2026">
      <p>
        These terms are an agreement between you and Chowk. When you use Chowk, you accept them. If you do not accept them, do not use
        Chowk.
      </p>

      <h2>1. What Chowk is</h2>
      <p>
        Chowk is a free place where people post ads to sell, give away, swap or ask for items and services. Chowk does not sell anything,
        does not own the items and is not a party to any deal. Chowk does not hold, send or receive money for you.
      </p>
      <p>
        Chowk is an intermediary under section 79 of the Information Technology Act, 2000. Each person is responsible for the ads and
        messages that they post.
      </p>

      <h2>2. Who can use Chowk</h2>
      <ul>
        <li>You must be 18 years or older.</li>
        <li>You must give true information about yourself and your items.</li>
        <li>You must not use more accounts to get around a limit, a block or a removal.</li>
      </ul>

      <h2>3. Your ads</h2>
      <ul>
        <li>Post only items and services that you have the right to sell or give.</li>
        <li>Use true photos, a true description and a true price.</li>
        <li>Choose the correct category. Do not post the same item many times.</li>
        <li>You can post up to 10 ads a day. An ad stays online for 60 days, and you can renew it for free.</li>
        <li>You give Chowk permission to show your ads, photos and approximate location to other people. This lets them find your item.</li>
      </ul>

      <h2>4. Items you must not post</h2>
      <p>Chowk does not allow these items. The post form stops common words for them, and we remove ads that break this rule.</p>
      <ul>
        {Object.keys(GROUPS).map((group) => (
          <li key={group} className="first-letter:uppercase">
            {group}
          </li>
        ))}
        <li>Stolen items, and vehicles or phones without legal papers</li>
        <li>Adult content, and job ads that ask the applicant for money</li>
        <li>Any other item or service that Indian law does not allow</li>
      </ul>

      <h2>5. Chats and deals</h2>
      <ul>
        <li>Be polite. Do not send spam, threats or offensive messages.</li>
        <li>
          Meet in a busy public place and check the item before you pay. Read the <Link href="/safety">safety tips</Link>.
        </li>
        <li>Give ratings that are honest and only about a real deal.</li>
        <li>Chowk shows a UPI pay link only after both people say that they met. The payment is between you and the other person.</li>
      </ul>

      <h2>6. Reports, blocks and removal</h2>
      <p>
        You can report an ad or a person, and you can block a person. We check reports. We can remove ads or close accounts that break these
        terms or the law. An ad hides from search when 3 signed-in people report it, until we check it.
      </p>

      <h2>7. No warranty</h2>
      <p>
        Chowk does not check items, sellers or buyers. We give the service &quot;as is&quot;. To the extent that the law allows, Chowk is not
        responsible for losses from deals between users.
      </p>

      <h2>8. Your account</h2>
      <p>
        You can download your data and delete your account at any time in <Link href="/me/settings">Settings</Link>. Read the{" "}
        <Link href="/privacy">privacy policy</Link> for details.
      </p>

      <h2>9. Changes and law</h2>
      <p>We can change these terms. The date of the last change is at the top of this page. The laws of India apply to these terms.</p>

      <h2>10. Contact</h2>
      <p>
        Send complaints to our <Link href="/grievance">grievance officer</Link>, {GRIEVANCE.name}, at{" "}
        <a href={`mailto:${GRIEVANCE.email}`}>{GRIEVANCE.email}</a>.
      </p>
    </Doc>
  );
}
