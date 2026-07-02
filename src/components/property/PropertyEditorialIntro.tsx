import type { Property } from '../../lib/database.types';
import {
  buildPropertyEditorialStory,
  inferEditorialEmotionalLine,
} from '../../config/propertyDefaults';
import { listPropertyAmenities } from '../../lib/amenities';
import { EditorialColumn, EditorialProse, OffsetLeft } from '../editorial/EditorialLayouts';

interface PropertyEditorialIntroProps {
  property: Property;
  title: string;
  locationLabel: string;
  primaryCtaLabel: string;
  onPrimaryAction: () => void;
}

function hospitalitySetting(property: Property): string | null {
  const amenities = listPropertyAmenities(property.amenities).map((a) => a.toLowerCase());
  if (amenities.some((a) => a.includes('river') || a.includes('riverside'))) {
    return 'Riverside setting';
  }
  if (amenities.some((a) => a.includes('mountain') || a.includes('view'))) {
    return 'Mountain setting';
  }
  if (
    amenities.some(
      (a) => a.includes('beach') || a.includes('lake') || a.includes('waterfront'),
    )
  ) {
    return 'Waterside setting';
  }
  if (amenities.some((a) => a.includes('garden'))) {
    return 'Garden setting';
  }
  if (property.city?.trim()) {
    return `${property.city.trim()} setting`;
  }
  return null;
}

function buildHospitalityLine(property: Property): string | null {
  const parts: string[] = [];
  const guests = property.max_guests ?? 0;
  if (guests > 0) {
    parts.push(guests === 1 ? 'One guest' : `${guests} guests`);
  }

  const setting = hospitalitySetting(property);
  if (setting) parts.push(setting);

  const amenities = listPropertyAmenities(property.amenities).map((a) => a.toLowerCase());
  if (amenities.some((a) => a.includes('breakfast'))) {
    parts.push('Breakfast available');
  } else if (amenities.some((a) => a.includes('pool') || a.includes('swim'))) {
    parts.push('Private pool');
  } else if (amenities.some((a) => a.includes('workspace'))) {
    parts.push('Quiet workspace');
  } else if (property.is_couple_friendly) {
    parts.push('Couple-friendly retreat');
  }

  return parts.length > 0 ? parts.slice(0, 3).join(' · ') : null;
}

function openingParagraph(property: Property, emotionalLine: string | null): string | null {
  if (emotionalLine) return emotionalLine;

  const desc = property.description?.trim();
  if (!desc) return null;

  const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
  const first = sentences.slice(0, 2).join(' ').trim();
  if (!first) return null;
  return first.length > 280 ? `${first.slice(0, 277)}…` : first;
}

/**
 * Opening spread — display title, whisper location, editorial paragraph, hospitality line, one action.
 */
export default function PropertyEditorialIntro({
  property,
  title,
  locationLabel,
  primaryCtaLabel,
  onPrimaryAction,
}: PropertyEditorialIntroProps) {
  const story = buildPropertyEditorialStory(property);
  const emotional = inferEditorialEmotionalLine(property) ?? story.emotionalLine;
  const paragraph = openingParagraph(property, emotional);
  const hospitalityLine = buildHospitalityLine(property);

  return (
    <header className="xpx-ed-opening-intro">
      <OffsetLeft>
        <EditorialColumn>
          <h1 className="xpx-ed-opening-title">{title}</h1>

          <p className="xpx-ed-opening-location">{locationLabel}</p>

          {paragraph && (
            <EditorialProse className="xpx-ed-opening-paragraph">{paragraph}</EditorialProse>
          )}

          {hospitalityLine && (
            <p className="xpx-ed-opening-facts">{hospitalityLine}</p>
          )}

          <div className="xpx-ed-opening-action">
            <button type="button" onClick={onPrimaryAction} className="xpx-ed-opening-cta">
              {primaryCtaLabel}
            </button>
          </div>
        </EditorialColumn>
      </OffsetLeft>
    </header>
  );
}
