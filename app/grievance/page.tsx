import type { Metadata } from "next";
import { Doc, GRIEVANCE } from "@/components/legal/doc";

export const metadata: Metadata = { title: "Grievance officer", description: "How to send a complaint to Chowk." };

export default function GrievancePage() {
  return (
    <Doc title="Grievance officer" updated="16 September 2026">
      <p>
        Chowk names a grievance officer under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021
        and the Digital Personal Data Protection Act, 2023.
      </p>

      <dl className="grid gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
        <div>
          <dt className="text-sm text-ink-2">Name</dt>
          <dd className="font-semibold">{GRIEVANCE.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">Email</dt>
          <dd>
            <a href={`mailto:${GRIEVANCE.email}`} className="font-semibold">
              {GRIEVANCE.email}
            </a>
          </dd>
        </div>
      </dl>

      <h2>How to complain</h2>
      <p>Send an email with:</p>
      <ul>
        <li>Your name and a way to contact you</li>
        <li>The link to the ad, the profile or the chat</li>
        <li>What is wrong, and why</li>
        <li>If the content shows you or pretends to be you: proof of who you are</li>
      </ul>

      <h2>What happens next</h2>
      <ul>
        <li>We confirm that we received your complaint within 24 hours.</li>
        <li>We act on your complaint within 15 days.</li>
        <li>
          If content shows a person in a sexual way without consent, or pretends to be a person, we remove it within 24 hours of the
          complaint.
        </li>
      </ul>

      <p>
        For quick action, you can also tap Report on the ad, the profile or the chat. If you lost money in a fraud, call the national
        cybercrime helpline 1930 or report it at <a href="https://cybercrime.gov.in">cybercrime.gov.in</a>.
      </p>
    </Doc>
  );
}
