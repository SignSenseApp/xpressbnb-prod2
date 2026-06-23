type IconProps = {
  className?: string;
  'aria-hidden'?: boolean;
};

const defaults = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function VerifiedShieldIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M12 3 4 6.5v5.5c0 4.2 3.2 7.9 8 9 4.8-1.1 8-4.8 8-9V6.5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function HeartOutlineIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M12 20.5s-7-4.6-7-10a4 4 0 0 1 7-2.4 4 4 0 0 1 7 2.4c0 5.4-7 10-7 10Z" />
    </svg>
  );
}

export function ImageGalleryIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
    </svg>
  );
}

export function LocationPinIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

export function GuestsIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <circle cx="9" cy="8" r="2.5" />
      <path d="M3.5 19c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
      <circle cx="16.5" cy="9" r="2" />
      <path d="M15 19c.3-2.2 2-3.5 4-3.5 1.2 0 2.3.4 3 1.2" />
    </svg>
  );
}

export function BedroomIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M3 12v7" />
      <path d="M21 12v7" />
      <path d="M3 15h18" />
      <path d="M5 12V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M7 10h10" />
    </svg>
  );
}

export function BathroomIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M5 12h14" />
      <path d="M5 12v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      <path d="M8 12V7a2 2 0 0 1 2-2h1" />
      <circle cx="17" cy="5" r="1" />
    </svg>
  );
}

export function StarOutlineIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="m12 3.5 2.2 4.5 4.9.7-3.5 3.4.8 4.9L12 14.8l-4.4 2.2.8-4.9-3.5-3.4 4.9-.7L12 3.5Z" />
    </svg>
  );
}

export function InfoCircleIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HomeOutlineIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function ShieldOutlineIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <path d="M12 3 4 6.5v5.5c0 4.2 3.2 7.9 8 9 4.8-1.1 8-4.8 8-9V6.5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PercentOutlineIcon({ className = 'w-4 h-4', ...rest }: IconProps) {
  return (
    <svg className={className} {...defaults} {...rest}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="m19 5-14 14" />
    </svg>
  );
}
