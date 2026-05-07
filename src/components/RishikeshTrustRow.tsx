import React from 'react';
import {
  Banknote,
  Headphones,
  MessageCircle,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from 'lucide-react';

type Tone = 'verified' | 'trust';

interface TrustItem {
  Icon: LucideIcon;
  title: string;
  text: string;
  tone: Tone;
}

const ITEMS: TrustItem[] = [
  {
    Icon: ShieldCheck,
    title: 'Verified Hosts & Stays',
    text: 'Quality checked for your peace of mind.',
    tone: 'verified',
  },
  {
    Icon: Tag,
    title: 'Zero Commission',
    text: 'Better prices for you. Always.',
    tone: 'trust',
  },
  {
    Icon: Banknote,
    title: 'Pay at Property',
    text: 'Cash or UPI accepted at check-in.',
    tone: 'verified',
  },
  {
    Icon: Headphones,
    title: 'Local Support',
    text: "We're here for you on the ground.",
    tone: 'trust',
  },
  {
    Icon: MessageCircle,
    title: 'WhatsApp Booking',
    text: 'Chat with us. Get instant help.',
    tone: 'trust',
  },
];

function chipStyle(tone: Tone): { background: string; color: string } {
  if (tone === 'verified') {
    return { background: 'var(--xpx-verified-bg)', color: 'var(--xpx-verified)' };
  }
  return { background: 'var(--xpx-trust-bg)', color: 'var(--xpx-trust)' };
}

const RishikeshTrustRow: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16">
      <div
        className="lg:hidden flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {ITEMS.map(({ Icon, title, text, tone }) => (
          <div
            key={title}
            className="shrink-0 w-[240px] rounded-2xl flex items-start gap-3.5 p-4 shadow-xpx-card"
            style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border)' }}
          >
            <div
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
              style={chipStyle(tone)}
            >
              <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-xpx-text leading-tight">{title}</p>
              <p className="mt-1 text-xs text-xpx-muted leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className="hidden lg:grid lg:grid-cols-5 lg:divide-x rounded-2xl shadow-xpx-card"
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--xpx-border)',
          borderColor: 'var(--xpx-border)',
        }}
      >
        {ITEMS.map(({ Icon, title, text, tone }) => (
          <div key={title} className="flex items-start gap-3.5 px-6 py-7">
            <div
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
              style={chipStyle(tone)}
            >
              <Icon className="w-5 h-5" style={{ color: 'inherit' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-xpx-text leading-tight">{title}</p>
              <p className="mt-1.5 text-xs text-xpx-muted leading-relaxed">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RishikeshTrustRow;
