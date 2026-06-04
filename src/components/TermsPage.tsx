import InfoOverlayShell from './InfoOverlayShell';
import { TEAM_EMAIL } from '../lib/team';

interface TermsPageProps {
  onClose: () => void;
}

export default function TermsPage({ onClose }: TermsPageProps) {
  return (
    <InfoOverlayShell title="Terms of Use" subtitle="Rules for using XpressBnB" onClose={onClose}>
      <div className="prose prose-slate max-w-none text-xpx-text">
        <p className="text-sm text-xpx-muted mb-8">
          <strong>Last updated:</strong> 20 May 2026
        </p>

        <Section title="1. Acceptance">
          <p>
            By accessing XpressBnB you agree to these Terms. If you do not agree, please do not use the platform. We may
            update these Terms; material changes will be posted on this page.
          </p>
        </Section>

        <Section title="2. Our role">
          <p>
            XpressBnB is a marketplace that connects guests with independent hosts. We are not the property owner unless
            stated otherwise. Hosts are responsible for the accuracy of listings, check-in, and local compliance.
          </p>
        </Section>

        <Section title="3. Guest bookings">
          <ul>
            <li>Guests submit inquiries via phone OTP verification; payment terms are agreed directly with the host unless we state otherwise.</li>
            <li>Prices, availability, and house rules are set by hosts and shown on each listing.</li>
            <li>Cancellation and refund rules vary by property — review them before confirming.</li>
            <li>Guests must provide accurate contact details and respect property rules and neighbours.</li>
          </ul>
        </Section>

        <Section title="4. Host obligations">
          <ul>
            <li>Listings must be truthful, legally rentable, and kept up to date.</li>
            <li>Hosts respond to inquiries in good faith and honour confirmed bookings.</li>
            <li>Optional paid plans (Standard / Premium) are billed per property via Razorpay on the Subscription page.</li>
            <li>Hosts remain responsible for taxes, licences, and local regulations applicable to their property.</li>
          </ul>
        </Section>

        <Section title="5. Fees">
          <p>
            Guest bookings on the listing page carry zero platform commission — guests pay hosts directly as communicated
            after inquiry acceptance. Host subscription fees are disclosed on the Subscription page before payment.
          </p>
        </Section>

        <Section title="6. Prohibited conduct">
          <p>You may not use XpressBnB to post false listings, harass users, circumvent OTP verification, scrape data, or violate any applicable law.</p>
        </Section>

        <Section title="7. Disclaimer">
          <p>
            The platform is provided &ldquo;as is&rdquo;. We do not guarantee uninterrupted service. To the extent permitted by law, XpressBnB is not liable for indirect damages arising from host–guest disputes, though we will endeavour to help resolve issues via support.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            Questions about these Terms:{' '}
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
