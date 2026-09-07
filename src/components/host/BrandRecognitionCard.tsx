import { HOST_BRAND_COPY, type BrandCardVariant } from '../../lib/hostBrandUi';
import type { HostBrandIdentity } from '../../lib/hostBrand';
import HostBrandIdentityLockup from './HostBrandIdentityLockup';

type BrandRecognitionCardProps = {
  variant: Exclude<BrandCardVariant, 'hidden'>;
  hostName: string;
  brand: HostBrandIdentity | null;
  onAdd: () => void;
  onEdit: () => void;
  onDismiss: () => void;
};

export default function BrandRecognitionCard({
  variant,
  hostName,
  brand,
  onAdd,
  onEdit,
  onDismiss,
}: BrandRecognitionCardProps) {
  if (variant === 'summary' && brand) {
    return (
      <section
        className="rounded-2xl p-5 sm:p-6 motion-reduce:animate-none [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[var(--accent)] [&_button:focus-visible]:ring-offset-2"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
          animation: 'xpx-search-float-in 180ms ease-out',
        }}
        aria-labelledby="host-brand-summary-title"
      >
        <p className="xpx-eyebrow">{HOST_BRAND_COPY.summaryEyebrow}</p>
        <h2 id="host-brand-summary-title" className="mt-1 text-xl font-extrabold tracking-tight text-xpx-text">
          {brand.businessName}
        </h2>
        <div className="mt-4">
          <HostBrandIdentityLockup hostName={hostName} businessName={brand.businessName} />
        </div>
        <button type="button" onClick={onEdit} className="xpx-btn-secondary mt-5 min-h-11 px-5">
          {HOST_BRAND_COPY.summaryAction}
        </button>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 motion-reduce:animate-none [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[var(--accent)] [&_button:focus-visible]:ring-offset-2"
      style={{
        background: 'var(--xpx-surface)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
        animation: 'xpx-search-float-in 180ms ease-out',
      }}
      aria-labelledby="host-brand-recognition-title"
    >
      <p className="xpx-eyebrow">{HOST_BRAND_COPY.m1Eyebrow}</p>
      <h2
        id="host-brand-recognition-title"
        className="mt-1 text-xl font-extrabold tracking-tight text-xpx-text sm:text-2xl"
      >
        {HOST_BRAND_COPY.m1Title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-xpx-muted sm:text-base">
        {HOST_BRAND_COPY.m1Body}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={onAdd} className="xpx-btn-primary min-h-11 px-5">
          {HOST_BRAND_COPY.m1Primary}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-full px-5 text-sm font-semibold text-xpx-muted transition-colors hover:bg-slate-100 hover:text-xpx-text"
        >
          {HOST_BRAND_COPY.m1Secondary}
        </button>
      </div>
    </section>
  );
}
