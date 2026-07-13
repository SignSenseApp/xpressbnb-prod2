import { BUCKET } from '../property-image-migration/constants.mjs';
import { parseSupabasePropertyImageUrl } from '../property-image-migration/urlParser.mjs';
import {
  classifyExternalUrl,
  estimateMigratedBytes,
  extensionOf,
  flagSuspiciousObject,
  formatBytes,
  hasMissingExtension,
  median,
} from './classify.mjs';

/**
 * @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient
 */

/**
 * @param {unknown} images
 * @returns {string[]}
 */
export function normalizePropertyImageUrls(images) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const item of images) {
    if (typeof item === 'string' && item.trim()) out.push(item.trim());
  }
  return out;
}

/**
 * @param {SupabaseClient} supabase
 */
async function listAllStorageObjects(supabase) {
  /** @type {Array<{ name: string, id?: string, metadata?: { size?: number, mimetype?: string } }>} */
  const objects = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Storage list failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item?.name && item.id) {
        objects.push(item);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return objects;
}

/**
 * @param {SupabaseClient} supabase
 */
export async function runPropertyImageAudit(supabase) {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, title, images')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to list properties: ${error.message}`);

  const storageObjects = await listAllStorageObjects(supabase);
  const objectByPath = new Map();
  for (const obj of storageObjects) {
    objectByPath.set(obj.name, obj);
  }

  const formatCounts = { jpg: 0, jpeg: 0, png: 0, gif: 0, webp: 0, other: 0, none: 0 };
  const externalCounts = { pexels: 0, unsplash: 0, 'supabase-other': 0, 'other-https': 0, invalid: 0 };

  /** @type {Array<{ propertyId: string, title: string, url: string, path: string }>} */
  const brokenReferences = [];
  /** @type {Array<{ path: string, size: number, mimetype?: string }>} */
  const orphanObjects = [];
  /** @type {Array<{ path: string, propertyIds: string[], referenceCount: number }>} */
  const duplicateObjects = [];
  /** @type {Array<{ propertyId: string, title: string, url: string, count: number }>} */
  const duplicateUrlsInProperty = [];
  /** @type {Array<{ path: string, size: number, flags: string[] }>} */
  const suspiciousObjects = [];
  /** @type {Array<{ path: string, size: number, propertyId?: string }>} */
  const largestFiles = [];

  const referencedPaths = new Map();
  let totalImageReferences = 0;
  let propertiesWithoutImages = 0;
  let maxImagesPerProperty = 0;
  let largestProperty = { id: '', title: '', count: 0 };

  const objectSizes = [];
  let totalReferencedStorageBytes = 0;
  let estimatedBytesAfterMigration = 0;

  for (const property of properties ?? []) {
    const urls = normalizePropertyImageUrls(property.images);
    if (urls.length === 0) {
      propertiesWithoutImages += 1;
      continue;
    }

    if (urls.length > maxImagesPerProperty) {
      maxImagesPerProperty = urls.length;
      largestProperty = {
        id: property.id,
        title: property.title ?? '',
        count: urls.length,
      };
    }

    const seenInProperty = new Map();
    for (const url of urls) {
      totalImageReferences += 1;
      seenInProperty.set(url, (seenInProperty.get(url) ?? 0) + 1);

      const parsed = parseSupabasePropertyImageUrl(url);
      if (!parsed) {
        const kind = classifyExternalUrl(url) ?? 'other-https';
        externalCounts[kind] = (externalCounts[kind] ?? 0) + 1;
        continue;
      }

      const path = parsed.path;
      const ext = extensionOf(path);
      if (ext === 'jpg') formatCounts.jpg += 1;
      else if (ext === 'jpeg') formatCounts.jpeg += 1;
      else if (ext === 'png') formatCounts.png += 1;
      else if (ext === 'gif') formatCounts.gif += 1;
      else if (ext === 'webp') formatCounts.webp += 1;
      else if (!ext) formatCounts.none += 1;
      else formatCounts.other += 1;

      if (hasMissingExtension(path)) {
        suspiciousObjects.push({ path, size: 0, flags: ['missing-extension'] });
      }

      const obj = objectByPath.get(path);
      if (!obj) {
        brokenReferences.push({
          propertyId: property.id,
          title: property.title ?? '',
          url,
          path,
        });
        continue;
      }

      const size = obj.metadata?.size ?? 0;
      objectSizes.push(size);
      totalReferencedStorageBytes += size;
      estimatedBytesAfterMigration += estimateMigratedBytes(size, ext);

      if (!referencedPaths.has(path)) {
        referencedPaths.set(path, new Set());
      }
      referencedPaths.get(path).add(property.id);

      largestFiles.push({ path, size, propertyId: property.id });
    }

    for (const [url, count] of seenInProperty.entries()) {
      if (count > 1) {
        duplicateUrlsInProperty.push({
          propertyId: property.id,
          title: property.title ?? '',
          url,
          count,
        });
      }
    }
  }

  for (const [path, obj] of objectByPath.entries()) {
    const size = obj.metadata?.size ?? 0;
    const flags = flagSuspiciousObject(obj, path);
    if (flags.length > 0) {
      suspiciousObjects.push({ path, size, flags });
    }
    if (!referencedPaths.has(path)) {
      orphanObjects.push({
        path,
        size,
        mimetype: obj.metadata?.mimetype,
      });
    }
  }

  for (const [path, propertyIds] of referencedPaths.entries()) {
    if (propertyIds.size > 1) {
      duplicateObjects.push({
        path,
        propertyIds: [...propertyIds],
        referenceCount: propertyIds.size,
      });
    }
  }

  largestFiles.sort((a, b) => b.size - a.size);
  orphanObjects.sort((a, b) => b.size - a.size);
  suspiciousObjects.sort((a, b) => b.size - a.size);

  const totalBucketBytes = storageObjects.reduce((sum, o) => sum + (o.metadata?.size ?? 0), 0);

  let estimatedBucketAfterBytes = 0;
  for (const [path, obj] of objectByPath.entries()) {
    const size = obj.metadata?.size ?? 0;
    const ext = extensionOf(path);
    if (!referencedPaths.has(path)) {
      estimatedBucketAfterBytes += size;
    } else {
      estimatedBucketAfterBytes += estimateMigratedBytes(size, ext);
    }
  }

  const legacyJpeg = formatCounts.jpg + formatCounts.jpeg;
  const alreadyWebp = formatCounts.webp;
  const legacyImages = legacyJpeg + formatCounts.png;
  const externalTotal = Object.values(externalCounts).reduce((a, b) => a + b, 0);

  const estimatedOrphanBytes = orphanObjects.reduce((sum, o) => sum + o.size, 0);
  const potentialSavingsBytes = Math.max(0, totalBucketBytes - estimatedBucketAfterBytes);
  const potentialSavingsPct =
    totalBucketBytes > 0 ? Math.round((potentialSavingsBytes / totalBucketBytes) * 1000) / 10 : 0;

  const propertyCount = properties?.length ?? 0;
  const avgImagesPerProperty =
    propertyCount > 0 ? Math.round((totalImageReferences / propertyCount) * 10) / 10 : 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      properties: propertyCount,
      imageReferences: totalImageReferences,
      storageObjects: storageObjects.length,
      alreadyWebp,
      legacyJpeg,
      legacyPng: formatCounts.png,
      legacyGif: formatCounts.gif,
      externalUrls: externalTotal,
      brokenReferences: brokenReferences.length,
      orphanObjects: orphanObjects.length,
      duplicateObjects: duplicateObjects.length,
      duplicateUrlsInProperty: duplicateUrlsInProperty.length,
      suspiciousObjects: suspiciousObjects.length,
      propertiesWithoutImages,
      potentialSavingsPercent: potentialSavingsPct,
      estimatedSizeBeforeBytes: totalBucketBytes,
      estimatedSizeAfterBytes: estimatedBucketAfterBytes,
      estimatedSavingsBytes: potentialSavingsBytes,
    },
    statistics: {
      averageImagesPerProperty: avgImagesPerProperty,
      maxImagesPerProperty,
      largestProperty,
      formatCounts,
      externalCounts,
      imageSizes: {
        smallestBytes: objectSizes.length ? Math.min(...objectSizes) : 0,
        largestBytes: objectSizes.length ? Math.max(...objectSizes) : 0,
        averageBytes: objectSizes.length
          ? Math.round(objectSizes.reduce((a, b) => a + b, 0) / objectSizes.length)
          : 0,
        medianBytes: median(objectSizes),
        sampleCount: objectSizes.length,
      },
      storageUsage: {
        totalBucketBytes,
        referencedBytes: totalReferencedStorageBytes,
        orphanBytes: estimatedOrphanBytes,
        unreferencedInBucketBytes: totalBucketBytes - totalReferencedStorageBytes,
      },
      migrationEstimate: {
        legacyMigratableCount: legacyImages,
        skippedWebpCount: alreadyWebp,
        skippedGifCount: formatCounts.gif,
        skippedExternalCount: externalTotal,
        skippedBrokenCount: brokenReferences.length,
        estimatedBytesBeforeMigration: totalReferencedStorageBytes,
        estimatedBytesAfterMigration,
        estimatedSavingsOnReferenced: Math.max(
          0,
          totalReferencedStorageBytes - estimatedBytesAfterMigration,
        ),
        note: 'Heuristic estimate for legacy JPEG/PNG only; GIF and WebP unchanged',
      },
    },
    brokenReferences,
    orphanObjects: orphanObjects.slice(0, 100),
    duplicateObjects,
    duplicateUrlsInProperty,
    suspiciousObjects: suspiciousObjects.slice(0, 100),
    largestFiles: largestFiles.slice(0, 25),
    migrationEstimate: {
      potentialSavingsPercent: potentialSavingsPct,
      estimatedSizeBefore: formatBytes(totalBucketBytes),
      estimatedSizeAfter: formatBytes(estimatedBucketAfterBytes),
      estimatedSavings: formatBytes(potentialSavingsBytes),
    },
  };
}

/**
 * @param {ReturnType<typeof runPropertyImageAudit> extends Promise<infer T> ? T : never} report
 */
export function printAuditReport(report) {
  const s = report.summary;
  const lines = [
    '',
    '========================================',
    'XpressBNB Image Storage Audit',
    '========================================',
    '',
    'Properties',
    String(s.properties),
    '',
    'Image References',
    String(s.imageReferences),
    '',
    'Storage Objects',
    String(s.storageObjects),
    '',
    'Already WebP',
    String(s.alreadyWebp),
    '',
    'Legacy JPEG',
    String(s.legacyJpeg),
    '',
    'PNG',
    String(s.legacyPng),
    '',
    'GIF',
    String(s.legacyGif),
    '',
    'External URLs',
    String(s.externalUrls),
    '',
    'Broken References',
    String(s.brokenReferences),
    '',
    'Orphan Objects',
    String(s.orphanObjects),
    '',
    'Duplicate Objects',
    String(s.duplicateObjects),
    '',
    'Potential Savings',
    `${s.potentialSavingsPercent}%`,
    '',
    'Estimated Size',
    formatBytes(s.estimatedSizeBeforeBytes),
    '↓',
    formatBytes(s.estimatedSizeAfterBytes),
    '',
    'Largest Image',
    report.largestFiles[0]
      ? formatBytes(report.largestFiles[0].size)
      : 'n/a',
    '',
    'Largest Property',
    `${report.statistics.largestProperty.count} images`,
    '',
    '========================================',
    '',
  ];
  console.log(lines.join('\n'));
}
