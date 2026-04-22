const PREFERENCES_KEY = 'cold-plunge:preferences';
const FAVORITES_KEY = 'cold-plunge:favorites';

export function readPreferences() {
  try {
    const value = window.localStorage.getItem(PREFERENCES_KEY);

    if (!value) {
      return {
        plungeThreshold: 60
      };
    }

    const parsed = JSON.parse(value);

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
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function readFavorites() {
  try {
    const value = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function writeFavorites(favorites) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}
