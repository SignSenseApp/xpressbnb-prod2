import InfoOverlayShell from './InfoOverlayShell';
import { ManageCookiesLink } from './CookieConsent';
import { TEAM_EMAIL } from '../lib/team';

interface PrivacyPolicyPageProps {
  onClose: () => void;
}

export default function PrivacyPolicyPage({ onClose }: PrivacyPolicyPageProps) {
  return (
    <InfoOverlayShell title="Privacy Policy" subtitle="How XpressBnB handles your data" onClose={onClose}>
      <div className="prose prose-slate max-w-none text-xpx-text">
        <p className="text-sm text-xpx-muted mb-8">
          <strong>Last updated:</strong> 20 May 2026 · <strong>Operator:</strong> XpressBnB (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
        </p>

        <Section title="1. Who we are">
          <p>
            XpressBnB is a zero-commission stays platform connecting guests with verified hosts in Delhi NCR, Gurgaon,
            Noida, Greater Noida, and Rishikesh. We operate the website{' '}
            <a href="https://www.xpressbnb.com" className="text-emerald-700 font-semibold hover:underline">
              www.xpressbnb.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Information we collect">
          <ul>
            <li>
              <strong>Account &amp; booking data:</strong> name, email, phone number, booking dates, guest count, and
              messages you send when inquiring or booking.
            </li>
            <li>
              <strong>Host data:</strong> property details, payout preferences, subscription status, and dashboard
              activity.
            </li>
            <li>
              <strong>Technical data:</strong> device type, browser, IP address, pages visited, and approximate location
              (city/region) derived from your connection.
            </li>
            <li>
              <strong>Communications:</strong> support emails, WhatsApp messages, and OTP verification logs (phone number +
              timestamp).
            </li>
          </ul>
        </Section>

        <Section title="3. Cookies &amp; similar technologies">
          <p>We use cookies and local storage to:</p>
          <ul>
            <li>
              <strong>Essential (always on):</strong> keep you signed in, remember cookie choices, and enable core site
              features including Add to Home Screen preferences.
            </li>
            <li>
              <strong>Analytics (optional):</strong> Vercel Web Analytics and Speed Insights — anonymous page views and
              performance metrics.
            </li>
            <li>
              <strong>Marketing (optional):</strong> Google Ads conversion tags — measure whether our ads lead to sign-ups
              or bookings.
            </li>
          </ul>
          <p>
            You can change your choices anytime via{' '}
            <ManageCookiesLink className="font-semibold text-emerald-700 hover:underline" /> on this page or in the site
            footer.
          </p>
        </Section>

        <Section title="4. How we use your information">
          <ul>
            <li>Process booking inquiries and connect you with hosts</li>
            <li>Send OTP codes and booking notifications (SMS / WhatsApp where enabled)</li>
            <li>Operate host subscriptions and dashboards</li>
            <li>Improve search, listings, and site performance</li>
            <li>Prevent fraud and enforce our terms</li>
            <li>Respond to support requests</li>
          </ul>
        </Section>

        <Section title="5. Sharing with others">
          <p>
            When you submit an inquiry, we share relevant details (name, phone, dates, message) with the host for that
            property. We use trusted processors for hosting (Vercel), database (Supabase), payments (Razorpay — hosts
            only), SMS (Twilio), and analytics (Vercel, Google) under their respective privacy terms. We do not sell your
            personal data.
          </p>
        </Section>

        <Section title="6. Data retention">
          <p>
            We keep booking and account records as long as your account is active or as needed for legal, tax, and dispute
            purposes. OTP logs are retained briefly for security. Analytics data is aggregated and anonymized where
            possible.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            Under applicable Indian law (including the Digital Personal Data Protection Act, 2023), you may request access,
            correction, or deletion of your personal data, and withdraw consent for optional cookies. Contact us at{' '}
            <a href={`mailto:${TEAM_EMAIL}`} className="text-emerald-700 font-semibold hover:underline">
              {TEAM_EMAIL}
            </a>
            . We will respond within a reasonable timeframe.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use HTTPS, access controls, and industry-standard practices through our infrastructure providers. No method
            of transmission over the internet is 100% secure; please use a strong password and keep your phone number
            private.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            XpressBnB is not directed at children under 18. We do not knowingly collect data from minors. Contact us if
            you believe a minor has provided personal information.
          </p>
        </Section>

        <Section title="10. Changes &amp; contact">
          <p>
            We may update this policy from time to time. Continued use after changes means you accept the updated policy.
            Questions:{' '}
            <a href={`mailto:${TEAM_EMAIL}`} className="text-emerald-700 font-semibold hover:underline">
              {TEAM_EMAIL}
            </a>
          </p>
        </Section>
      </div>
    </InfoOverlayShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-xpx-text mb-3">{title}</h2>
      <div className="text-sm text-xpx-muted leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
