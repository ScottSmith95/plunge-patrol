import { escapeHtml } from '../lib/formatters.js';

function buildAppleMapsUrl(siteName, city) {
  const query = [siteName, city, 'King County WA'].filter(Boolean).join(', ');

  if (!query) {
    return null;
  }

  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

function buildGoogleMapsUrl(mapsUrl, siteName, city) {
  if (mapsUrl) {
    return mapsUrl;
  }

  const query = [siteName, city, 'King County WA'].filter(Boolean).join(', ');

  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function sanitizeToken(value, fallback = 'beach') {
  const normalized = String(value || fallback).toLowerCase().replace(/[^a-z0-9-]/g, '-');

  return normalized || fallback;
}

class BeachPanel extends HTMLElement {
  static get observedAttributes() {
    return ['favorite', 'plunge-threshold'];
  }

  constructor() {
    super();

    this.handleClick = this.handleClick.bind(this);
    this.handleIntersect = this.handleIntersect.bind(this);
  }

  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.render();
    this.addEventListener('click', this.handleClick);

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(this.handleIntersect, {
        rootMargin: '160px 0px'
      });

      this.observer.observe(this);
    } else {
      this.activateModules();
    }
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.observer?.disconnect();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.initialized || oldValue === newValue) {
      return;
    }

    if (name === 'favorite') {
      this.syncFavoriteState();
    }

    if (name === 'plunge-threshold') {
      const temperatureModule = this.querySelector('beach-temperature');

      if (temperatureModule) {
        temperatureModule.setAttribute('plunge-threshold', this.plungeThreshold);
      }
    }
  }

  get beachId() {
    return this.getAttribute('beach-id');
  }

  get slug() {
    return this.getAttribute('slug');
  }

  get plungeThreshold() {
    return this.getAttribute('plunge-threshold') || '60';
  }

  get isFavorite() {
    return this.hasAttribute('favorite');
  }

  handleClick(event) {
    const favoriteButton = event.target.closest('[data-action="toggle-favorite"]');

    if (!favoriteButton) {
      return;
    }

    this.dispatchEvent(new CustomEvent('beach-favorite:changed', {
      bubbles: true,
      composed: true,
      detail: {
        beachId: this.beachId,
        nextFavorite: !this.isFavorite
      }
    }));
  }

  handleIntersect(entries) {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue;
      }

      this.activateModules();
      this.observer?.disconnect();
      break;
    }
  }

  activateModules() {
    if (this.modulesActivated) {
      return;
    }

    this.modulesActivated = true;
    this.dataset.active = 'true';

    for (const moduleElement of this.querySelectorAll('beach-status, beach-temperature, beach-reliability')) {
      if (typeof moduleElement.activate === 'function') {
        moduleElement.activate();
      }
    }
  }

  render() {
    const siteName = this.getAttribute('site-name') || 'Unknown beach';
    const city = this.getAttribute('city') || 'Unknown city';
    const googleMapsUrl = buildGoogleMapsUrl(this.getAttribute('maps-url'), siteName, city);
    const appleMapsUrl = buildAppleMapsUrl(siteName, city);
    const hasMapOptions = Boolean(googleMapsUrl || appleMapsUrl);
    const mapToken = sanitizeToken(this.slug || this.beachId);
    const mapMenuId = `map-menu-${mapToken}`;
    const mapAnchor = `--map-anchor-${mapToken}`;

    this.innerHTML = `
      <article class="beach-panel" id="${escapeHtml(this.slug)}">
        <header class="beach-panel__header">
          <div class="beach-panel__copy">
            <p class="panel-kicker">${escapeHtml(city)}</p>
            <h2>${escapeHtml(siteName)}</h2>
          </div>
          <div class="beach-panel__actions">
            <button class="panel-button" type="button" data-action="toggle-favorite"></button>
            ${hasMapOptions ? `
              <button
                class="panel-button panel-button--map"
                type="button"
                popovertarget="${escapeHtml(mapMenuId)}"
                aria-haspopup="menu"
                aria-label="Open map options for ${escapeHtml(siteName)}"
                style="anchor-name: ${escapeHtml(mapAnchor)};"
              >
                Map options
              </button>
              <div
                id="${escapeHtml(mapMenuId)}"
                class="map-options-popover"
                popover="auto"
                aria-label="Map options for ${escapeHtml(siteName)}"
                style="position-anchor: ${escapeHtml(mapAnchor)};"
              >
                <ul class="map-options-popover__list">
                  ${googleMapsUrl ? `<li><a class="map-options-popover__link" href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps</a></li>` : '<li><span class="map-options-popover__label">Google Maps unavailable</span></li>'}
                  ${appleMapsUrl ? `<li><a class="map-options-popover__link" href="${escapeHtml(appleMapsUrl)}" target="_blank" rel="noopener noreferrer">Apple Maps</a></li>` : '<li><span class="map-options-popover__label">Apple Maps unavailable</span></li>'}
                </ul>
              </div>
            ` : ''}
          </div>
        </header>
        <div class="beach-panel__modules">
          <beach-status beach-id="${escapeHtml(this.beachId)}"></beach-status>
          <beach-temperature beach-id="${escapeHtml(this.beachId)}" plunge-threshold="${escapeHtml(this.plungeThreshold)}"></beach-temperature>
          <beach-reliability beach-id="${escapeHtml(this.beachId)}"></beach-reliability>
        </div>
      </article>
    `;

    this.syncFavoriteState();
  }

  syncFavoriteState() {
    const button = this.querySelector('[data-action="toggle-favorite"]');

    if (!button) {
      return;
    }

    button.setAttribute('aria-pressed', String(this.isFavorite));
    button.textContent = this.isFavorite ? 'Saved' : 'Save';
  }
}

if (!customElements.get('beach-panel')) {
  customElements.define('beach-panel', BeachPanel);
}
