import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Building2, Check, CheckCircle2, X } from 'lucide-react';
import {
  HOST_BRAND_SAVE_ERROR,
  listHostBrandPropertyIds,
  saveHostBrandPropertyIds,
  upsertHostBrand,
  validateHostBrandInput,
  type HostBrandIdentity,
  type HostBrandValidationIssue,
} from '../../lib/hostBrand';
import {
  HOST_BRAND_COPY,
  brandFlowNeedsLeaveConfirm,
  brandFlowStepLabel,
  brandLeaveCopy,
  brandSuccessBody,
  brandSuccessLinkCopy,
  defaultSelectedPropertyIds,
  initialBrandFlowStep,
  isBrandNameDraftDirty,
  isPropertySelectionDirty,
  m4PrimaryLabel,
  previousBrandFlowStep,
  togglePropertyId,
  type BrandFlowMode,
  type BrandFlowStep,
  type HostBrandListingOption,
} from '../../lib/hostBrandUi';
import HostBrandIdentityLockup from './HostBrandIdentityLockup';

type BrandOnboardingFlowProps = {
  open: boolean;
  mode: BrandFlowMode;
  hostId: string;
  hostName: string;
  properties: HostBrandListingOption[];
  existingBrand: HostBrandIdentity | null;
  onClose: () => void;
  onCompleted: (brand: HostBrandIdentity, linkedCount: number) => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return el.tabIndex !== -1;
  });
}

export default function BrandOnboardingFlow({
  open,
  mode,
  hostId,
  hostName,
  properties,
  existingBrand,
  onClose,
  onCompleted,
}: BrandOnboardingFlowProps) {
  const titleId = useId();
  const nameId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const descriptionId = useId();
  const descriptionErrorId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const leaveStayRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const [step, setStep] = useState<BrandFlowStep>('meaning');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [persistedName, setPersistedName] = useState('');
  const [persistedDescription, setPersistedDescription] = useState('');
  const [brand, setBrand] = useState<HostBrandIdentity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [persistedIds, setPersistedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldIssues, setFieldIssues] = useState<HostBrandValidationIssue[]>([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [linkedCount, setLinkedCount] = useState(0);

  const propertyIdsKey = properties.map((item) => item.id).join(',');

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) restoreFocusRef.current?.focus();
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const idsAtOpen = propertyIdsKey.split(',').filter(Boolean);
    const start = initialBrandFlowStep(mode);
    const name = existingBrand?.businessName ?? '';
    const description = existingBrand?.businessDescription ?? '';
    setStep(start);
    setBusinessName(name);
    setBusinessDescription(description);
    setPersistedName(name);
    setPersistedDescription(description);
    setBrand(existingBrand);
    setSelectedIds(defaultSelectedPropertyIds(mode, idsAtOpen, []));
    setPersistedIds([]);
    setSaving(false);
    setSaveError(null);
    setFieldIssues([]);
    setLeaveOpen(false);
    setBrokenCovers({});
    setLinkedCount(0);
  }, [open, existingBrand, mode, propertyIdsKey]);

  useEffect(() => {
    if (!open || !existingBrand?.id) return;
    let cancelled = false;
    const idsAtOpen = propertyIdsKey.split(',').filter(Boolean);
    void listHostBrandPropertyIds(existingBrand.id).then((ids) => {
      if (cancelled) return;
      setPersistedIds(ids);
      setSelectedIds(defaultSelectedPropertyIds(mode, idsAtOpen, ids));
    });
    return () => {
      cancelled = true;
    };
  }, [open, existingBrand?.id, mode, propertyIdsKey]);

  const nameDirty = isBrandNameDraftDirty(
    businessName,
    businessDescription,
    persistedName,
    persistedDescription,
  );
  const selectionDirty = isPropertySelectionDirty(selectedIds, persistedIds);
  const dirty =
    (step === 'name' && nameDirty) ||
    (step === 'properties' && (nameDirty || selectionDirty));
  const stepLabel = brandFlowStepLabel(step);
  const nameIssue = fieldIssues.find((issue) => issue.field === 'businessName');
  const descriptionIssue = fieldIssues.find((issue) => issue.field === 'businessDescription');
  const leaveCopy = brandLeaveCopy(Boolean(brand));

  const closeNow = useCallback(() => {
    setLeaveOpen(false);
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (step === 'success') {
      if (brand) onCompleted(brand, linkedCount);
      closeNow();
      return;
    }
    if (brandFlowNeedsLeaveConfirm(step) && dirty) {
      setLeaveOpen(true);
      return;
    }
    closeNow();
  }, [brand, closeNow, dirty, linkedCount, onCompleted, saving, step]);

  const goBack = useCallback(() => {
    if (saving) return;
    const previous = previousBrandFlowStep(step, mode);
    if (previous === 'close') {
      requestClose();
      return;
    }
    setSaveError(null);
    setFieldIssues([]);
    setStep(previous);
  }, [mode, requestClose, saving, step]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || leaveOpen) return;
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [leaveOpen, open, step]);

  useEffect(() => {
    if (!open || !leaveOpen) return;
    const frame = window.requestAnimationFrame(() => {
      leaveStayRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [leaveOpen, open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (leaveOpen) {
          setLeaveOpen(false);
          return;
        }
        requestClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const trapRoot = leaveOpen
        ? panel.querySelector<HTMLElement>('[data-brand-leave-dialog]')
        : panel;
      if (!trapRoot) return;
      const nodes = focusableElements(trapRoot);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [leaveOpen, open, requestClose]);

  const handleNameContinue = async () => {
    if (saving) return;
    const validation = validateHostBrandInput({
      businessName,
      businessDescription,
    });
    setFieldIssues(validation);
    setSaveError(null);
    if (validation.length > 0) return;

    setSaving(true);
    const result = await upsertHostBrand(hostId, {
      businessName,
      businessDescription,
    });
    setSaving(false);

    if (result.validation.length > 0) {
      setFieldIssues(result.validation);
      return;
    }
    if (result.error || !result.brand) {
      setSaveError(HOST_BRAND_SAVE_ERROR);
      return;
    }

    setBrand(result.brand);
    setPersistedName(result.brand.businessName);
    setPersistedDescription(result.brand.businessDescription ?? '');
    setBusinessName(result.brand.businessName);
    setBusinessDescription(result.brand.businessDescription ?? '');
    setStep('properties');
  };

  const handlePropertiesSave = async () => {
    if (saving || !brand) return;
    setSaving(true);
    setSaveError(null);
    const result = await saveHostBrandPropertyIds(brand.id, selectedIds);
    setSaving(false);
    if (result.error) {
      setSaveError(HOST_BRAND_SAVE_ERROR);
      return;
    }
    const savedIds = result.propertyIds;
    setPersistedIds(savedIds);
    setSelectedIds(savedIds);
    setLinkedCount(savedIds.length);
    setStep('success');
  };

  if (!open) return null;

  const showStickyCta = step === 'name' || step === 'properties';

  return (
    <div className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 hidden sm:block"
        style={{ background: 'var(--xpx-overlay-scrim)' }}
        aria-label="Close business name flow"
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full max-h-[100dvh] w-full flex-col overflow-hidden motion-reduce:animate-none sm:h-auto sm:max-h-[min(88dvh,820px)] sm:w-full sm:max-w-[560px] sm:rounded-2xl lg:max-w-[720px] [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[var(--accent)] [&_button:focus-visible]:ring-offset-2"
        style={{
          background: 'var(--xpx-base)',
          border: '1px solid var(--xpx-border)',
          boxShadow: 'var(--xpx-shadow-overlay)',
          paddingTop: 'var(--xpx-safe-top)',
          animation: 'xpx-search-float-in 200ms ease-out',
        }}
      >
        <div className="flex items-center gap-2 border-b px-2 py-2 sm:px-3" style={{ borderColor: 'var(--xpx-border)' }}>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xpx-text hover:bg-slate-100"
            aria-label={step === 'meaning' || step === 'success' ? 'Close' : 'Back'}
            disabled={saving}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 text-center text-xs font-bold uppercase tracking-[0.16em] text-xpx-subtle">
            {stepLabel ?? '\u00a0'}
          </p>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xpx-text hover:bg-slate-100"
            aria-label="Close"
            disabled={saving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="sr-only" aria-live="polite">
          {stepLabel}
          {saveError ? ` ${saveError}` : ''}
          {step === 'success' ? ` ${HOST_BRAND_COPY.successTitle}` : ''}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === 'meaning' && (
            <div className="motion-reduce:animate-none" style={{ animation: 'xpx-search-float-in 200ms ease-out' }}>
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-extrabold tracking-tight text-xpx-text outline-none sm:text-3xl"
              >
                {HOST_BRAND_COPY.m2Headline}
              </h2>
              <div className="mt-5">
                <HostBrandIdentityLockup hostName={hostName} businessName="" />
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-xpx-muted sm:text-base">
                <li>{HOST_BRAND_COPY.m2HostLine}</li>
                <li>{HOST_BRAND_COPY.m2BrandLine}</li>
                <li>{HOST_BRAND_COPY.m2SameLogin}</li>
              </ul>
              <p className="mt-5 text-sm font-semibold text-xpx-text">{HOST_BRAND_COPY.m2Trust}</p>
              <button
                type="button"
                className="xpx-btn-primary mt-8 w-full sm:w-auto"
                onClick={() => setStep('name')}
              >
                {HOST_BRAND_COPY.m2Continue}
              </button>
            </div>
          )}

          {step === 'name' && (
            <form
              className="motion-reduce:animate-none"
              style={{ animation: 'xpx-search-float-in 200ms ease-out' }}
              onSubmit={(event) => {
                event.preventDefault();
                void handleNameContinue();
              }}
            >
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-extrabold tracking-tight text-xpx-text outline-none"
              >
                {HOST_BRAND_COPY.nameLabel}
              </h2>
              <div className="mt-5">
                <label htmlFor={nameId} className="mb-2 block text-sm font-semibold text-xpx-text">
                  {HOST_BRAND_COPY.nameLabel}
                </label>
                <input
                  id={nameId}
                  className="xpx-input text-base"
                  value={businessName}
                  onChange={(event) => {
                    setBusinessName(event.target.value);
                    if (fieldIssues.length) setFieldIssues([]);
                    if (saveError) setSaveError(null);
                  }}
                  placeholder={HOST_BRAND_COPY.namePlaceholder}
                  autoComplete="organization"
                  inputMode="text"
                  aria-describedby={`${nameHelpId}${nameIssue ? ` ${nameErrorId}` : ''}`}
                  aria-invalid={nameIssue ? true : undefined}
                />
                <p id={nameHelpId} className="mt-2 text-sm leading-relaxed text-xpx-muted">
                  {HOST_BRAND_COPY.nameHelper}
                </p>
                {nameIssue && (
                  <p id={nameErrorId} className="mt-2 text-sm font-semibold text-red-700">
                    {nameIssue.message}
                  </p>
                )}
              </div>
              <div className="mt-5">
                <label htmlFor={descriptionId} className="mb-2 block text-sm font-semibold text-xpx-text">
                  {HOST_BRAND_COPY.descriptionLabel}
                </label>
                <textarea
                  id={descriptionId}
                  rows={3}
                  className="xpx-input min-h-[5.5rem] resize-none text-base"
                  value={businessDescription}
                  onChange={(event) => {
                    setBusinessDescription(event.target.value);
                    if (fieldIssues.length) setFieldIssues([]);
                  }}
                  placeholder={HOST_BRAND_COPY.descriptionPlaceholder}
                  aria-invalid={descriptionIssue ? true : undefined}
                  aria-describedby={descriptionIssue ? descriptionErrorId : undefined}
                />
                {descriptionIssue && (
                  <p id={descriptionErrorId} className="mt-2 text-sm font-semibold text-red-700">
                    {descriptionIssue.message}
                  </p>
                )}
              </div>
              {saveError && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: 'var(--xpx-error-bg)',
                    border: '1px solid var(--xpx-error-border)',
                    color: 'var(--xpx-error)',
                  }}
                >
                  {saveError}
                </div>
              )}
              <div className="hidden sm:mt-8 sm:block">
                <button type="submit" className="xpx-btn-primary w-full sm:w-auto" disabled={saving}>
                  {saving ? HOST_BRAND_COPY.saving : HOST_BRAND_COPY.m2Continue}
                </button>
              </div>
            </form>
          )}

          {step === 'properties' && (
            <div className="motion-reduce:animate-none" style={{ animation: 'xpx-search-float-in 200ms ease-out' }}>
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-extrabold tracking-tight text-xpx-text outline-none"
              >
                {HOST_BRAND_COPY.m4Title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-xpx-muted">{HOST_BRAND_COPY.m4Helper}</p>

              {saveError && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: 'var(--xpx-error-bg)',
                    border: '1px solid var(--xpx-error-border)',
                    color: 'var(--xpx-error)',
                  }}
                >
                  {saveError}
                </div>
              )}

              {properties.length === 0 ? (
                <div
                  className="mt-6 rounded-2xl px-4 py-5"
                  style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
                >
                  <p className="font-bold text-xpx-text">{HOST_BRAND_COPY.m4EmptyTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-xpx-muted">{HOST_BRAND_COPY.m4EmptyBody}</p>
                </div>
              ) : (
                <ul className="mt-5 space-y-2">
                  {properties.map((property) => {
                    const selected = selectedIds.includes(property.id);
                    const showImage = Boolean(property.coverUrl) && !brokenCovers[property.id];
                    return (
                      <li key={property.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          onClick={() => setSelectedIds((current) => togglePropertyId(current, property.id))}
                          className="flex w-full min-h-[44px] items-center gap-3 rounded-2xl p-2 text-left transition-[border-color,box-shadow,background-color] duration-150 motion-reduce:transition-none"
                          style={{
                            background: 'var(--xpx-surface)',
                            border: selected
                              ? '2px solid var(--accent)'
                              : '1px solid var(--xpx-border)',
                            boxShadow: selected ? '0 0 0 3px rgba(5,150,105,0.12)' : 'none',
                          }}
                        >
                          <span
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
                            style={{ background: 'var(--xpx-surface-light)' }}
                          >
                            {showImage ? (
                              <img
                                src={property.coverUrl ?? ''}
                                alt=""
                                width={64}
                                height={64}
                                className="h-full w-full object-cover"
                                onError={() =>
                                  setBrokenCovers((current) => ({ ...current, [property.id]: true }))
                                }
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-xpx-subtle">
                                <Building2 className="h-6 w-6" aria-hidden="true" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-bold leading-snug text-xpx-text">{property.title}</span>
                            <span className="mt-0.5 block truncate text-sm text-xpx-muted">{property.city}</span>
                          </span>
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: selected ? 'var(--accent)' : 'transparent',
                              border: selected ? 'none' : '1px solid var(--xpx-border-strong)',
                              color: '#fff',
                            }}
                            aria-hidden="true"
                          >
                            {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="hidden sm:mt-8 sm:block">
                <button
                  type="button"
                  className="xpx-btn-primary w-full sm:w-auto"
                  disabled={saving}
                  onClick={() => void handlePropertiesSave()}
                >
                  {saving ? HOST_BRAND_COPY.saving : m4PrimaryLabel(properties.length)}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && brand && (
            <div
              className="flex min-h-[18rem] flex-col items-start justify-center motion-reduce:animate-none"
              style={{ animation: 'xpx-search-float-in 180ms ease-out' }}
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(5,150,105,0.12)', color: 'var(--accent-dark)' }}
                aria-hidden="true"
              >
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="mt-5 text-2xl font-extrabold tracking-tight text-xpx-text outline-none"
              >
                {HOST_BRAND_COPY.successTitle}
              </h2>
              <p className="mt-2 max-w-md text-base leading-relaxed text-xpx-muted">
                {brandSuccessBody(brand.businessName)}
              </p>
              <p className="mt-3 text-sm font-semibold text-xpx-text">{brandSuccessLinkCopy(linkedCount)}</p>
              <button
                type="button"
                className="xpx-btn-primary mt-8"
                onClick={() => {
                  onCompleted(brand, linkedCount);
                  closeNow();
                }}
              >
                {HOST_BRAND_COPY.successBack}
              </button>
            </div>
          )}
        </div>

        {showStickyCta && (
          <div
            className="border-t px-4 pt-3 sm:hidden"
            style={{
              borderColor: 'var(--xpx-border)',
              background: 'var(--xpx-surface)',
              paddingBottom: 'max(0.75rem, var(--xpx-safe-bottom))',
            }}
          >
            {step === 'name' ? (
              <button
                type="button"
                className="xpx-btn-primary w-full"
                disabled={saving}
                onClick={() => void handleNameContinue()}
              >
                {saving ? HOST_BRAND_COPY.saving : HOST_BRAND_COPY.m2Continue}
              </button>
            ) : (
              <button
                type="button"
                className="xpx-btn-primary w-full"
                disabled={saving}
                onClick={() => void handlePropertiesSave()}
              >
                {saving ? HOST_BRAND_COPY.saving : m4PrimaryLabel(properties.length)}
              </button>
            )}
          </div>
        )}

        {leaveOpen && (
          <div
            className="absolute inset-0 z-10 flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'var(--xpx-overlay-scrim)' }}
          >
            <div
              data-brand-leave-dialog
              role="dialog"
              aria-modal="true"
              aria-labelledby="brand-leave-title"
              className="w-full max-w-md rounded-2xl p-5"
              style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)' }}
            >
              <h3 id="brand-leave-title" className="text-lg font-extrabold text-xpx-text">
                {leaveCopy.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-xpx-muted">{leaveCopy.body}</p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="xpx-btn-secondary min-h-11"
                  onClick={closeNow}
                >
                  {HOST_BRAND_COPY.leaveConfirm}
                </button>
                <button
                  ref={leaveStayRef}
                  type="button"
                  className="xpx-btn-primary min-h-11"
                  onClick={() => setLeaveOpen(false)}
                >
                  {HOST_BRAND_COPY.leaveStay}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
