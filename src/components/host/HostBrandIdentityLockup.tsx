import { Building2 } from 'lucide-react';
import { HOST_BRAND_COPY, hostInitial } from '../../lib/hostBrandUi';

type HostBrandIdentityLockupProps = {
  hostName: string;
  businessName: string;
  businessNameEmptyLabel?: string;
};

export default function HostBrandIdentityLockup({
  hostName,
  businessName,
  businessNameEmptyLabel = HOST_BRAND_COPY.brandPlaceholder,
}: HostBrandIdentityLockupProps) {
  const displayBrand = businessName.trim() || businessNameEmptyLabel;
  const isPlaceholder = !businessName.trim();

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
        }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white"
          style={{ background: 'var(--accent)' }}
          aria-hidden="true"
        >
          {hostInitial(hostName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold tracking-tight text-xpx-text">
            {hostName.trim() || 'Host'}
          </p>
          <p className="text-xs font-semibold text-xpx-subtle">{HOST_BRAND_COPY.hostRole}</p>
        </div>
      </div>

      <div
        className="flex items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          background: 'var(--xpx-surface-light)',
          border: '1px dashed var(--xpx-border-strong)',
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'rgba(5,150,105,0.08)',
            color: 'var(--accent-dark)',
            border: '1px solid rgba(5,150,105,0.18)',
          }}
          aria-hidden="true"
        >
          {isPlaceholder ? (
            <Building2 className="h-5 w-5" />
          ) : (
            <span className="text-sm font-bold">{hostInitial(displayBrand)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-bold ${isPlaceholder ? 'text-xpx-subtle' : 'text-xpx-text'}`}
          >
            {displayBrand}
          </p>
          <p className="text-xs font-semibold text-xpx-subtle">{HOST_BRAND_COPY.brandRole}</p>
        </div>
      </div>
    </div>
  );
}
