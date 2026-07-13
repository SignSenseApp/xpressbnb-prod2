import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { STATE_VERSION } from './constants.mjs';

/**
 * @typedef {Object} MigrationRecord
 * @property {string} propertyId
 * @property {string} oldUrl
 * @property {string} newUrl
 * @property {string} oldPath
 * @property {string} newPath
 * @property {number} oldBytes
 * @property {number} newBytes
 * @property {string} oldHash
 * @property {string} newHash
 * @property {string} migratedAt
 */

/**
 * @typedef {Object} FailedRecord
 * @property {string} propertyId
 * @property {string} url
 * @property {string} error
 * @property {string} failedAt
 */

/**
 * @typedef {Object} MigrationState
 * @property {number} version
 * @property {string} startedAt
 * @property {string} updatedAt
 * @property {string[]} completedKeys
 * @property {MigrationRecord[]} migrated
 * @property {FailedRecord[]} failed
 * @property {{ skipped: number, external: number, alreadyWebp: number, animatedGif: number, missing: number, duplicate: number }}
 *   counters
 */

/**
 * @param {string} propertyId
 * @param {string} url
 */
export function migrationKey(propertyId, url) {
  return `${propertyId}::${url}`;
}

/**
 * @param {string} stateFile
 * @returns {MigrationState}
 */
export function loadState(stateFile) {
  const path = resolve(stateFile);
  if (!existsSync(path)) {
    return createEmptyState();
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (raw.version !== STATE_VERSION) {
    throw new Error(`Unsupported state file version ${raw.version}`);
  }
  return raw;
}

/** @returns {MigrationState} */
export function createEmptyState() {
  const now = new Date().toISOString();
  return {
    version: STATE_VERSION,
    startedAt: now,
    updatedAt: now,
    completedKeys: [],
    migrated: [],
    failed: [],
    counters: {
      skipped: 0,
      external: 0,
      alreadyWebp: 0,
      animatedGif: 0,
      missing: 0,
      duplicate: 0,
    },
  };
}

/**
 * @param {string} stateFile
 * @param {MigrationState} state
 */
export function saveState(stateFile, state) {
  const path = resolve(stateFile);
  mkdirSync(dirname(path), { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(state, null, 2));
}

/**
 * @param {MigrationState} state
 * @param {string} key
 */
export function isCompleted(state, key) {
  return state.completedKeys.includes(key);
}

/**
 * @param {MigrationState} state
 * @param {string} key
 * @param {MigrationRecord} record
 */
export function markCompleted(state, key, record) {
  if (!state.completedKeys.includes(key)) {
    state.completedKeys.push(key);
  }
  state.migrated.push(record);
}

/**
 * @param {MigrationState} state
 * @param {FailedRecord} record
 */
export function markFailed(state, record) {
  state.failed.push(record);
}
