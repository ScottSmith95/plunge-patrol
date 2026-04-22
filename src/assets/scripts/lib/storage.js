const LEGACY_PREFERENCES_KEY = 'cold-plunge:preferences';
const LEGACY_FAVORITES_KEY = 'cold-plunge:favorites';
const PREFERENCES_KEY = 'plunge-patrol:preferences';
const FAVORITES_KEY = 'plunge-patrol:favorites';

function readJson(key) {
  const value = window.localStorage.getItem(key);

  return value ? JSON.parse(value) : null;
}

function migrateValue(nextKey, legacyKey) {
  if (window.localStorage.getItem(nextKey)) {
    return;
  }

  const legacyValue = window.localStorage.getItem(legacyKey);

  if (legacyValue) {
    window.localStorage.setItem(nextKey, legacyValue);
  }
}

function writeJson(keys, value) {
  const serialized = JSON.stringify(value);

  for (const key of keys) {
    window.localStorage.setItem(key, serialized);
  }
}

export function readPreferences() {
  try {
    migrateValue(PREFERENCES_KEY, LEGACY_PREFERENCES_KEY);

    const parsed = readJson(PREFERENCES_KEY);

    if (!parsed) {
      return {
        plungeThreshold: 60
      };
    }

    return {
      plungeThreshold: Number.isFinite(parsed?.plungeThreshold) ? parsed.plungeThreshold : 60
    };
  } catch {
    return {
      plungeThreshold: 60
    };
  }
}

export function writePreferences(preferences) {
  try {
    writeJson([PREFERENCES_KEY, LEGACY_PREFERENCES_KEY], preferences);
  } catch {
    // Ignore storage failures so the UI keeps working even if persistence is unavailable.
  }
}

export function readFavorites() {
  try {
    migrateValue(FAVORITES_KEY, LEGACY_FAVORITES_KEY);

    const parsed = readJson(FAVORITES_KEY) ?? [];

    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function writeFavorites(favorites) {
  try {
    writeJson([FAVORITES_KEY, LEGACY_FAVORITES_KEY], [...favorites]);
  } catch {
    // Ignore storage failures so the UI keeps working even if persistence is unavailable.
  }
}
