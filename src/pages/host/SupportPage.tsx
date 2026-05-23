import { useState } from 'react';
import { HelpCircle, MessageSquare, Mail, Phone, Send, Download } from 'lucide-react';
import { InstallAppHelpModal } from '../../components/InstallAppPrompt';
import { getInstallPlatform } from '../../lib/pwa';

export default function SupportPage() {
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      setFormData({ subject: '', message: '', priority: 'normal' });

      setTimeout(() => setSubmitted(false), 5000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="xpx-eyebrow">Help</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Support</h1>
        <p className="text-xpx-muted mt-2">Get help from our team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <SupportTile icon={Mail} title="Email Support" body="Get help via email" cta={
          <a href="mailto:support@xpressbnb.com" className="text-sm font-semibold hover:underline" style={{ color: 'var(--xpx-warm)' }}>support@xpressbnb.com</a>
        } accent="#2563EB" />
        <SupportTile icon={Phone} title="Phone Support" body="Mon–Fri, 9AM–6PM IST" cta={
          <a href="tel:+911234567890" className="text-sm font-semibold hover:underline" style={{ color: 'var(--xpx-warm)' }}>+91 123 456 7890</a>
        } accent="#50C878" />
        <SupportTile icon={MessageSquare} title="Live Chat" body="Chat with our team" cta={
          <button className="text-sm font-semibold hover:underline" style={{ color: 'var(--xpx-warm)' }}>Start Chat</button>
        } accent="#EC4899" />
        <SupportTile icon={Download} title="Install app" body="Add XpressBnB to your phone or laptop" cta={
          <button
            type="button"
            onClick={() => setShowInstallHelp(true)}
            className="text-sm font-semibold hover:underline"
            style={{ color: 'var(--xpx-warm)' }}
          >
            View steps
          </button>
        } accent="#059669" />
      </div>

      <InstallAppHelpModal
        open={showInstallHelp}
        onClose={() => setShowInstallHelp(false)}
        initialPlatform={getInstallPlatform()}
      />

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-6">Submit a Support Request</h2>

        {submitted && (
          <div
            className="mb-6 p-4 rounded-xl flex items-start gap-3"
            style={{ background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.30)' }}
          >
            <div>
              <p className="font-semibold text-xpx-text">Request submitted successfully.</p>
              <p className="text-sm text-xpx-muted mt-1">We&apos;ll get back to you within 24 hours.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">Subject</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="xpx-input"
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="xpx-input"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">Message</label>
            <textarea
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="xpx-input resize-none"
              placeholder="Please describe your issue in detail…"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
          >
            <Send className="w-5 h-5" />
            {loading ? 'Sending…' : 'Submit Request'}
          </button>
        </form>
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-6">Common Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'How do I add a new property?', a: 'Go to the Properties page and click "Add Property". Fill in all required details and submit the form.' },
            { q: 'How do bookings work?', a: "Guests submit booking inquiries (no Razorpay on the listing page). You'll receive notifications and can accept or reject from the Bookings page." },
            { q: 'When do I pay for my host plan?', a: 'Host Standard and Premium plans are billed per property via Razorpay on the Subscription page only.' },
            { q: 'How do I cancel or refund a booking?', a: 'Go to the Bookings page, find the booking, and use the Cancel button. For refunds, contact our support team for assistance.' },
            {
              q: 'How do I install XpressBnB on my phone or laptop?',
              a: 'Android: open the site in Chrome → menu (⋮) → Install app. iPhone: Safari → Share → Add to Home Screen. Laptop: Chrome or Edge → install icon in the address bar. You can also tap the Install banner on the site or copy steps from Support → Install instructions when the banner appears.',
            },
          ].map((item, i, arr) => (
            <div key={item.q} className={i < arr.length - 1 ? 'pb-4' : ''} style={i < arr.length - 1 ? { borderBottom: '1px solid var(--xpx-border)' } : undefined}>
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--xpx-warm)' }} />
                <div>
                  <h3 className="font-semibold text-xpx-text mb-1">{item.q}</h3>
                  <p className="text-sm text-xpx-muted">{item.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportTile({
  icon: Icon,
  title,
  body,
  cta,
  accent,
}: {
  icon: typeof Mail;
  title: string;
  body: string;
  cta: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-6 h-6" style={{ color: accent }} />
      </div>
      <h3 className="font-bold text-xpx-text mb-1">{title}</h3>
      <p className="text-sm text-xpx-muted mb-4">{body}</p>
      {cta}
    </div>
  );
}
