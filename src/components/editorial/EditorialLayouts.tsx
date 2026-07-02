import type { ReactNode } from 'react';

type BaseProps = {
  children: ReactNode;
  className?: string;
};

type ChapterProps = BaseProps & {
  id?: string;
  'aria-labelledby'?: string;
};

/** Chapter shell — whitespace rhythm, no dividers. */
export function EditorialChapter({
  children,
  className = '',
  id,
  'aria-labelledby': ariaLabelledby,
}: ChapterProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={`xpx-ed-chapter ${className}`.trim()}
    >
      {children}
    </section>
  );
}

/** Standard reading column — ~42rem max. */
export function EditorialColumn({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-column ${className}`.trim()}>{children}</div>;
}

/** Long-form prose — 60–65ch, never stretched. */
export function EditorialProse({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-prose ${className}`.trim()}>{children}</div>;
}

/** Wider composition within the story column. */
export function WideColumn({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-wide ${className}`.trim()}>{children}</div>;
}

/** Break out to viewport edge (story column). */
export function FullBleed({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-full-bleed ${className}`.trim()}>{children}</div>;
}

/** Shift content left — magazine margin play. */
export function OffsetLeft({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-offset-left ${className}`.trim()}>{children}</div>;
}

/** Shift content right. */
export function OffsetRight({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-offset-right ${className}`.trim()}>{children}</div>;
}

/** Centered narrow essay column. */
export function CenteredEssay({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-centered-essay ${className}`.trim()}>{children}</div>;
}

/** Portrait-dominant composition — 4:5 rhythm. */
export function PortraitComposition({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-portrait-composition ${className}`.trim()}>{children}</div>;
}

/** Landscape / cinematic — edge-to-edge within bleed. */
export function LandscapeComposition({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-landscape-composition ${className}`.trim()}>{children}</div>;
}

type SplitEssayProps = {
  primary: ReactNode;
  secondary: ReactNode;
  ratio?: '40-60' | '60-40';
  className?: string;
};

/** Asymmetric split — essay + supporting column. */
export function SplitEssay({
  primary,
  secondary,
  ratio = '60-40',
  className = '',
}: SplitEssayProps) {
  return (
    <div className={`xpx-ed-split xpx-ed-split--${ratio} ${className}`.trim()}>
      <div className="xpx-ed-split-primary">{primary}</div>
      <div className="xpx-ed-split-secondary">{secondary}</div>
    </div>
  );
}

type MagazineSpreadProps = {
  visual: ReactNode;
  prose: ReactNode;
  className?: string;
};

/** Interview spread — visual breaks grid, prose stays narrow. */
export function MagazineSpread({ visual, prose, className = '' }: MagazineSpreadProps) {
  return (
    <div className={`xpx-ed-magazine-spread ${className}`.trim()}>
      <div className="xpx-ed-magazine-visual">{visual}</div>
      <div className="xpx-ed-magazine-prose">{prose}</div>
    </div>
  );
}

/** Large photographic window — no chrome. */
export function GalleryWindow({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-gallery-window ${className}`.trim()}>{children}</div>;
}

type PullQuoteProps = {
  children: ReactNode;
  cite?: ReactNode;
  size?: 'hero' | 'supporting';
  className?: string;
};

/** Editorial pause — centered, italic, generous space. */
export function PullQuote({ children, cite, size = 'hero', className = '' }: PullQuoteProps) {
  return (
    <figure className={`xpx-ed-pull-quote xpx-ed-pull-quote--${size} ${className}`.trim()}>
      <blockquote className="xpx-ed-pull-quote-text">{children}</blockquote>
      {cite ? <figcaption className="xpx-ed-pull-quote-cite">{cite}</figcaption> : null}
    </figure>
  );
}

/** Breathing room between chapters — no heading. */
export function QuietPause({ children }: { children: string }) {
  return (
    <aside className="xpx-ed-quiet-pause" role="note">
      <p>{children}</p>
    </aside>
  );
}

/** Horizontal collection rhythm. */
export function CollectionRow({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-collection-row ${className}`.trim()}>{children}</div>;
}

export function EditorialEyebrow({ children }: { children: ReactNode }) {
  return <p className="xpx-ed-eyebrow">{children}</p>;
}

type HeadlineProps = {
  children: ReactNode;
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'display';
  className?: string;
};

export function EditorialHeadline({ children, id, size = 'md', className = '' }: HeadlineProps) {
  return (
    <h2 id={id} className={`xpx-ed-headline xpx-ed-headline--${size} ${className}`.trim()}>
      {children}
    </h2>
  );
}

/** Vertical rhythm wrapper for the story column. */
export function EditorialStoryFlow({ children, className = '' }: BaseProps) {
  return <div className={`xpx-ed-story-flow ${className}`.trim()}>{children}</div>;
}
