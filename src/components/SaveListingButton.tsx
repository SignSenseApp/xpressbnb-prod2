import { Heart } from 'lucide-react';
import { useSavedListings } from '../hooks/useSavedListings';
import type { SavedListingSnapshot } from '../lib/savedListingsStorage';
import { theme } from '../lib/theme';
import { HeartOutlineIcon } from './icons/PropertyCardIcons';

type SaveListingButtonProps = {
  propertyId: string;
  getSnapshot: () => SavedListingSnapshot;
  className?: string;
  /** Larger tap target for Rishikesh-style cards */
  size?: 'sm' | 'md';
  /** `card` = absolute on listing image; `inline` = toolbar button */
  variant?: 'card' | 'inline';
  align?: 'left' | 'right';
};

export default function SaveListingButton({
  propertyId,
  getSnapshot,
  className = '',
  size = 'sm',
  variant = 'card',
  align = 'right',
}: SaveListingButtonProps) {
  const { isSaved, toggleSnapshot } = useSavedListings();
  const saved = isSaved(propertyId);

  const dim = size === 'md' ? 'w-11 h-11' : variant === 'card' ? 'w-10 h-10' : 'w-8 h-8';
  const icon = variant === 'card' ? 'w-[18px] h-[18px]' : 'w-4 h-4';

  const positionClass =
    variant === 'card'
      ? `absolute top-3 z-10 ${align === 'left' ? 'left-3' : 'right-3'} ${dim}`
      : 'inline-flex items-center gap-1.5 px-3 py-2';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleSnapshot(getSnapshot());
      }}
      className={`${positionClass} rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${variant === 'inline' ? 'hover:bg-slate-100 text-sm font-semibold text-xpx-text' : ''} ${className}`}
      style={
        variant === 'card'
          ? {
              background: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }
          : { minHeight: 44 }
      }
      aria-label={saved ? 'Remove from saved' : 'Save stay'}
      aria-pressed={saved}
    >
      {variant === 'card' ? (
        saved ? (
          <Heart className={`${icon} text-[#f97316]`} fill="#f97316" aria-hidden />
        ) : (
          <HeartOutlineIcon className={`${icon} text-[#111827]`} aria-hidden />
        )
      ) : (
        <Heart
          className={`${icon} transition-colors`}
          style={{ color: saved ? '#f97316' : theme.accent }}
          fill={saved ? '#f97316' : 'none'}
        />
      )}
      {variant === 'inline' && (
        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
      )}
    </button>
  );
}
