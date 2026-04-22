import beachClient from '../lib/beach-client.js';
import { clamp, escapeHtml, normalizeText } from '../lib/formatters.js';
import { readFavorites, readPreferences, writeFavorites, writePreferences } from '../lib/storage.js';

class BeachApp extends HTMLElement {
  constructor() {
    super();

    this.handleFavoriteChanged = this.handleFavoriteChanged.bind(this);
    this.handleFilterChanged = this.handleFilterChanged.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.beaches = [];
    this.favorites = readFavorites();
    this.preferences = readPreferences();
    this.liveConditions = new Map();
    this.liveState = {
      status: 'idle',
      temperature: 'idle'
    };
  }

  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.filters = this.readInitialFilters();
    this.renderShell();
    this.addEventListener('beach-filter:changed', this.handleFilterChanged);
    this.addEventListener('beach-favorite:changed', this.handleFavoriteChanged);
    this.addEventListener('click', this.handleClick);
    this.loadApp();
  }

  disconnectedCallback() {
    this.removeEventListener('beach-filter:changed', this.handleFilterChanged);
    this.removeEventListener('beach-favorite:changed', this.handleFavoriteChanged);
    this.removeEventListener('click', this.handleClick);
  }

  readInitialFilters() {
    const params = new URLSearchParams(window.location.search);
    const plungeParam = Number(params.get('plunge'));

    return {
      q: params.get('q') || '',
      seattleOnly: params.get('seattle') === '1',
      safeOnly: params.get('safe') === '1',
      coldOnly: params.get('cold') === '1',
      favoritesOnly: params.get('favorites') === '1',
      plungeThreshold: clamp(
        Number.isFinite(plungeParam) ? plungeParam : this.preferences.plungeThreshold,
        45,
        75
      )
    };
  }

  handleClick(event) {
    const retryButton = event.target.closest('[data-action="retry-app"]');

    if (!retryButton) {
      return;
    }

    this.renderShell();
    this.loadApp({
      force: true
    });
  }

  handleFilterChanged(event) {
    this.filters = {
      ...this.filters,
      ...event.detail
    };

    this.preferences = {
      plungeThreshold: this.filters.plungeThreshold
    };

    writePreferences(this.preferences);

    for (const panel of this.grid.querySelectorAll('beach-panel')) {
      panel.setAttribute('plunge-threshold', String(this.filters.plungeThreshold));
    }

    this.syncPanels();
  }

  handleFavoriteChanged(event) {
    const { beachId, nextFavorite } = event.detail;

    if (nextFavorite) {
      this.favorites.add(beachId);
    } else {
      this.favorites.delete(beachId);
    }

    writeFavorites(this.favorites);

    const panel = this.getPanel(beachId);

    if (panel) {
      if (this.favorites.has(beachId)) {
        panel.setAttribute('favorite', '');
      } else {
        panel.removeAttribute('favorite');
      }
    }

    this.syncPanels();
  }

  async loadApp(options = {}) {
    this.setBanner('Loading the local beach manifest...', 'neutral');

    try {
      this.beaches = await beachClient.getBeachIndex(options);
      this.renderPanels();
      this.filtersElement.setModel({
        ...this.filters,
        totalCount: this.beaches.length,
        visibleCount: this.beaches.length,
        liveStatusState: this.liveState.status,
        liveTemperatureState: this.liveState.temperature
      });
      this.syncPanels();
      this.prefetchLiveData(options);
    } catch (error) {
      this.renderFatalError(error);
    }
  }

  async prefetchLiveData(options = {}) {
    const requestId = (this.liveRequestId || 0) + 1;

    this.liveRequestId = requestId;
    this.liveState = {
      status: 'loading',
      temperature: 'loading'
    };

    this.filtersElement.setModel({
      liveStatusState: this.liveState.status,
      liveTemperatureState: this.liveState.temperature
    });
    this.setBanner('Loading live county status and temperature feeds for global filtering.', 'neutral');

    const [statusResult, temperatureResult] = await Promise.allSettled([
      beachClient.getStatusDataset(options),
      beachClient.getTemperatureDataset(options)
    ]);

    if (requestId !== this.liveRequestId) {
      return;
    }

    this.liveState = {
      status: statusResult.status === 'fulfilled' ? 'ready' : 'error',
      temperature: temperatureResult.status === 'fulfilled' ? 'ready' : 'error'
    };

    this.liveConditions = new Map();

    for (const beach of this.beaches) {
      const entry = {};

      if (this.liveState.status === 'ready') {
        entry.status = await beachClient.getBeachStatus(beach.id);
      }

      if (this.liveState.temperature === 'ready') {
        entry.temperature = await beachClient.getBeachTemperature(beach.id);
      }

      this.liveConditions.set(beach.id, entry);
    }

    this.filtersElement.setModel({
      liveStatusState: this.liveState.status,
      liveTemperatureState: this.liveState.temperature
    });

    this.updateBannerFromLiveState();
    this.syncPanels();
  }

  updateBannerFromLiveState() {
    if (this.liveState.status === 'ready' && this.liveState.temperature === 'ready') {
      this.setBanner('Live county feeds are ready. Safe-to-enter and temperature filters now use current remote data.', 'success');
      return;
    }

    if (this.liveState.status === 'error' && this.liveState.temperature === 'error') {
      this.setBanner('The county feeds did not load for global filters. Beach modules can still retry independently inside each panel.', 'warning');
      return;
    }

    if (this.liveState.status === 'error') {
      this.setBanner('County status data did not load for global filters. Temperature filtering still works if that feed is available.', 'warning');
      return;
    }

    if (this.liveState.temperature === 'error') {
      this.setBanner('County temperature data did not load for global filters. Safety filtering still works if that feed is available.', 'warning');
      return;
    }

    this.setBanner('Live county feeds are still loading.', 'neutral');
  }

  renderShell() {
    this.innerHTML = `
      <section class="app-surface">
        <div class="app-banner" data-role="banner"></div>
        <beach-filters></beach-filters>
        <div class="beach-grid" data-role="grid"></div>
        <article class="empty-state" data-role="empty-state" hidden>
          <h2>No beaches match those filters</h2>
          <p>Try clearing a live filter or searching with a broader term.</p>
        </article>
      </section>
    `;

    this.banner = this.querySelector('[data-role="banner"]');
    this.grid = this.querySelector('[data-role="grid"]');
    this.emptyState = this.querySelector('[data-role="empty-state"]');
    this.filtersElement = this.querySelector('beach-filters');
  }

  renderFatalError(error) {
    this.innerHTML = `
      <section class="app-surface">
        <article class="fatal-card">
          <p class="panel-kicker">Manifest error</p>
          <h2>Could not load the beach list</h2>
          <p>${escapeHtml(error?.message || 'Unknown error')}</p>
          <button class="module-button" type="button" data-action="retry-app">Retry app</button>
        </article>
      </section>
    `;
  }

  renderPanels() {
    const fragment = document.createDocumentFragment();

    for (const beach of this.beaches) {
      const panel = document.createElement('beach-panel');

      panel.setAttribute('beach-id', beach.id);
      panel.setAttribute('slug', beach.slug);
      panel.setAttribute('site-name', beach.siteName);
      panel.setAttribute('city', beach.city || 'King County');
      panel.setAttribute('water-body', beach.waterBody || 'Lake beach');
      panel.setAttribute('plunge-threshold', String(this.filters.plungeThreshold));

      if (beach.mapsUrl) {
        panel.setAttribute('maps-url', beach.mapsUrl);
      }

      if (this.favorites.has(beach.id)) {
        panel.setAttribute('favorite', '');
      }

      fragment.appendChild(panel);
    }

    this.grid.replaceChildren(fragment);
  }

  setBanner(message, tone) {
    if (!this.banner) {
      return;
    }

    this.banner.dataset.tone = tone;
    this.banner.textContent = message;
  }

  matchesSearch(beach) {
    if (!this.filters.q) {
      return true;
    }

    const query = normalizeText(this.filters.q);
    const haystack = [
      beach.siteName,
      beach.city,
      beach.waterBody,
      ...beach.aliases
    ]
      .map(normalizeText)
      .join(' ');

    return haystack.includes(query);
  }

  matchesFilters(beach) {
    if (!this.matchesSearch(beach)) {
      return false;
    }

    if (this.filters.seattleOnly && beach.city !== 'Seattle') {
      return false;
    }

    if (this.filters.favoritesOnly && !this.favorites.has(beach.id)) {
      return false;
    }

    const live = this.liveConditions.get(beach.id);

    if (this.filters.safeOnly && this.liveState.status === 'ready') {
      if (live?.status?.officialStatus !== 'OK to swim (low bacteria)') {
        return false;
      }
    }

    if (this.filters.coldOnly && this.liveState.temperature === 'ready') {
      if (!Number.isFinite(live?.temperature?.waterTempF) || live.temperature.waterTempF > this.filters.plungeThreshold) {
        return false;
      }
    }

    return true;
  }

  getPanel(beachId) {
    const safeId = window.CSS?.escape ? window.CSS.escape(beachId) : beachId;

    return this.grid.querySelector(`beach-panel[beach-id="${safeId}"]`);
  }

  syncPanels() {
    if (!this.beaches.length) {
      return;
    }

    let visibleCount = 0;

    for (const beach of this.beaches) {
      const panel = this.getPanel(beach.id);

      if (!panel) {
        continue;
      }

      const matches = this.matchesFilters(beach);

      panel.hidden = !matches;

      if (matches) {
        visibleCount += 1;
      }
    }

    this.emptyState.hidden = visibleCount !== 0;
    this.filtersElement.setModel({
      ...this.filters,
      totalCount: this.beaches.length,
      visibleCount,
      liveStatusState: this.liveState.status,
      liveTemperatureState: this.liveState.temperature
    });
  }
}

if (!customElements.get('beach-app')) {
  customElements.define('beach-app', BeachApp);
}
