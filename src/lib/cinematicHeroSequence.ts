/**
 * Editorial hero sequencing — infer narrative roles from URL hints and order.
 * Presentation only; does not fetch or transform image assets.
 */

export type CinematicFrameRole =
  | 'establishing'
  | 'architectural'
  | 'interior'
  | 'lifestyle'
  | 'detail'
  | 'evening';

const ROLE_ORDER: Record<CinematicFrameRole, number> = {
  establishing: 0,
  architectural: 1,
  interior: 2,
  lifestyle: 3,
  detail: 4,
  evening: 5,
};

function inferRoleFromUrl(url: string, index: number, total: number): CinematicFrameRole {
  const u = url.toLowerCase();

  if (/night|evening|dusk|sunset|twilight|golden.?hour|lamp|firepit/.test(u)) {
    return 'evening';
  }
  if (/exterior|landscape|view|mountain|river|garden|aerial|panorama|lake|valley|forest/.test(u)) {
    return 'establishing';
  }
  if (/facade|architecture|building|entrance|balcony|terrace|deck|courtyard/.test(u)) {
    return 'architectural';
  }
  if (/bed|bath|kitchen|living|room|suite|interior|inside|lounge|dining/.test(u)) {
    return 'interior';
  }
  if (/breakfast|coffee|wine|pool|spa|yoga|hammock|lifestyle|guest/.test(u)) {
    return 'lifestyle';
  }
  if (/detail|close|texture|linen|tile|amenity|flower|candle/.test(u)) {
    return 'detail';
  }

  if (index === 0) return 'establishing';
  if (index === total - 1 && total > 4) return 'evening';

  const cycle: CinematicFrameRole[] = [
    'establishing',
    'architectural',
    'interior',
    'lifestyle',
    'detail',
    'evening',
  ];
  return cycle[index % cycle.length];
}

/**
 * Reorder gallery images into a cinematic progression while preserving
 * the host's cover photo as the opening frame.
 */
export function sequenceCinematicHeroImages(images: string[]): string[] {
  if (images.length <= 2) return images;

  const tagged = images.map((src, originalIndex) => ({
    src,
    originalIndex,
    role: inferRoleFromUrl(src, originalIndex, images.length),
  }));

  const [cover, ...remainder] = tagged;
  const sorted = [...remainder].sort((a, b) => {
    const byRole = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (byRole !== 0) return byRole;
    return a.originalIndex - b.originalIndex;
  });

  return [cover.src, ...sorted.map((item) => item.src)];
}

export function cinematicFrameLabel(index: number, total: number): string {
  const frame = String(index + 1).padStart(2, '0');
  const ofTotal = String(total).padStart(2, '0');
  return `${frame} of ${ofTotal}`;
}
