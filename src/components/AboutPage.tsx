import { Clock, Calendar, Star, Mail, HelpCircle } from 'lucide-react';
import InfoOverlayShell from './InfoOverlayShell';

interface AboutPageProps {
  onClose: () => void;
}

export default function AboutPage({ onClose }: AboutPageProps) {
  const faqs = [
    {
      question: 'What is the difference between Full Day and Half Day booking?',
      answer:
        'Full Day booking gives you 24-hour access to the property, while Half Day booking provides 12-hour access with two time slots: Morning (11 AM - 6:30 PM) or Evening (7:30 PM - 10 AM next day).',
    },
    {
      question: 'Can I check in early or check out late?',
      answer:
        'Check-in and check-out times are fixed as per your booking type. For special requests, please contact the property owner or our support team before your booking.',
    },
    {
      question: 'How do I make a booking?',
      answer:
        'Browse available properties, select your preferred one, choose your booking type (Full Day or Half Day), select your dates, and complete the booking form with your details.',
    },
    {
      question: 'Is there a cancellation policy?',
      answer:
        "Cancellation policies vary by property. Please review the specific property's cancellation terms before confirming your booking.",
    },
    {
      question: 'How do I contact customer support?',
      answer:
        'You can email us at support@xpressbnb.com and our team will respond to your inquiry as soon as possible.',
    },
    {
      question: 'Are the properties verified?',
      answer:
        'Yes, all properties listed on XpressBnB are verified by our team to ensure quality and safety standards.',
    },
  ];

  return (
    <InfoOverlayShell title="About XpressBnB" subtitle="Your flexible stay partner" onClose={onClose}>
      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-2xl font-bold text-xpx-text">Welcome to XpressBnB</h3>
          <p className="text-xpx-muted leading-relaxed">
            XpressBnB is your trusted platform for flexible short-term property rentals. We understand that
            modern travelers and professionals need accommodation that fits their schedule, not the other way
            around. That&apos;s why we offer verified stays across Delhi NCR, Gurgaon, Noida, and Rishikesh.
          </p>
        </section>

        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-xpx-text flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-600" />
            How Our Booking System Works
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6 border border-emerald-200 bg-emerald-50/80">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-bold text-xpx-text">Full Day Booking</h4>
              </div>
              <ul className="space-y-3 text-xpx-muted text-sm">
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-xpx-text">Duration:</strong> 24 hours of access
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-xpx-text">Perfect for:</strong> Overnight stays and extended visits
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl p-6 border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-700 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-bold text-xpx-text">Half Day Booking</h4>
              </div>
              <ul className="space-y-3 text-xpx-muted text-sm">
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-xpx-text">Duration:</strong> 12 hours of access
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-xpx-text">Perfect for:</strong> Day meetings and short stays
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-2xl font-bold text-xpx-text flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-2xl p-6 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer border border-xpx-border"
              >
                <summary className="font-semibold text-xpx-text flex items-start gap-3 list-none">
                  <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{faq.question}</span>
                </summary>
                <p className="mt-4 text-xpx-muted pl-8 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl p-6 border border-xpx-border bg-slate-50">
          <h3 className="text-xl font-bold text-xpx-text mb-4">Need More Help?</h3>
          <p className="text-xpx-muted mb-6">
            Our customer support team is here to assist you. Email us for any inquiries.
          </p>
          <a href="mailto:support@xpressbnb.com" className="xpx-btn-primary w-full flex">
            <Mail className="w-5 h-5" />
            Email Us
          </a>
          <p className="text-sm text-xpx-muted mt-4 text-center">
            Email: <strong className="text-xpx-text">support@xpressbnb.com</strong>
          </p>
        </section>

        <div className="pt-6 border-t border-xpx-border">
          <button type="button" onClick={onClose} className="xpx-btn-primary w-full">
            Back to home
          </button>
        </div>
      </div>
    </InfoOverlayShell>
  );
}
