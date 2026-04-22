export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[’']/g, '')
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function formatTemperature(value) {
  if (!Number.isFinite(value)) {
    return 'No recorded temperature';
  }

  const rounded = Math.round(value * 10) / 10;

  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}°F`;
}

export function formatDateTime(value) {
  if (!Number.isFinite(value)) {
    return 'No timestamp in current feed';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatCount(value, singular, plural = `${singular}s`) {
  if (!Number.isFinite(value)) {
    return `No ${plural}`;
  }

  return `${value} ${value === 1 ? singular : plural}`;
}

export function formatBacteriaValue(value) {
  if (!Number.isFinite(value)) {
    return 'No recent 30-day reading';
  }

  const rounded = Math.round(value * 10) / 10;

  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
}

export function statusTone(status) {
  switch (status) {
    case 'OK to swim (low bacteria)':
      return 'ok';
    case 'Stay out of the water':
      return 'alert';
    case 'No recent data':
      return 'muted';
    default:
      return 'neutral';
  }
}

export function reliabilityTone(category) {
  switch (category) {
    case 'historically-good':
      return 'ok';
    case 'growing-record':
      return 'neutral';
    case 'current-caution':
      return 'alert';
    default:
      return 'muted';
  }
}
