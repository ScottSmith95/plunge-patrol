import { escapeHtml } from '../lib/formatters.js';

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
    const waterBody = this.getAttribute('water-body') || 'Unknown water body';
    const mapsUrl = this.getAttribute('maps-url');

    this.innerHTML = `
      <article class="beach-panel" id="${escapeHtml(this.slug)}">
        <header class="beach-panel__header">
          <div class="beach-panel__copy">
            <p class="panel-kicker">${escapeHtml(city)}</p>
            <h2>${escapeHtml(siteName)}</h2>
            <div class="panel-tags">
              <span>${escapeHtml(waterBody)}</span>
              <span>Beach group</span>
            </div>
          </div>
          <div class="beach-panel__actions">
            <button class="panel-button" type="button" data-action="toggle-favorite"></button>
            ${mapsUrl ? `<a class="panel-link" href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">Map</a>` : ''}
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
