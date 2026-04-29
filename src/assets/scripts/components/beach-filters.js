import { clamp } from '../lib/formatters.js';

const PLUNGE_THRESHOLD_MIN = 45;
const PLUNGE_THRESHOLD_MAX = 75;
const DEFAULT_PLUNGE_THRESHOLD = 60;

class BeachFilters extends HTMLElement {
  constructor() {
    super();

    this.model = {
      q: '',
      seattleOnly: false,
      safeOnly: false,
      coldOnly: false,
      favoritesOnly: false,
      plungeThreshold: DEFAULT_PLUNGE_THRESHOLD,
      visibleCount: 0,
      totalCount: 0,
      liveStatusState: 'idle',
      liveTemperatureState: 'idle'
    };

    this.handleInput = this.handleInput.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.render();
    this.addEventListener('input', this.handleInput);
    this.addEventListener('change', this.handleInput);
    this.addEventListener('click', this.handleClick);
    this.syncControls();
    this.syncSummary();
  }

  disconnectedCallback() {
    this.removeEventListener('input', this.handleInput);
    this.removeEventListener('change', this.handleInput);
    this.removeEventListener('click', this.handleClick);
  }

  setModel(patch) {
    this.model = {
      ...this.model,
      ...patch
    };

    if (!this.initialized) {
      return;
    }

    this.syncControls();
    this.syncSummary();
  }

  handleClick(event) {
    const resetButton = event.target.closest('[data-action="reset-filters"]');

    if (!resetButton) {
      return;
    }

    this.model = {
      ...this.model,
      q: '',
      seattleOnly: false,
      safeOnly: false,
      coldOnly: false,
      favoritesOnly: false
    };

    this.syncControls();
    this.pushChange();
  }

  handleInput(event) {
    const isPlungeThresholdEdit = event.target === this.plungeThresholdInput;
    const patch = {
      q: this.searchInput.value.trim(),
      seattleOnly: this.seattleOnly.checked,
      safeOnly: this.safeOnly.checked,
      coldOnly: this.coldOnly.checked,
      favoritesOnly: this.favoritesOnly.checked
    };

    if (isPlungeThresholdEdit) {
      const shouldClamp = event.type === 'change';
      const plungeThreshold = this.getEditablePlungeThreshold(shouldClamp);

      if (!Number.isFinite(plungeThreshold)) {
        this.model = {
          ...this.model,
          ...patch
        };

        if (shouldClamp) {
          this.syncControls();
        }

        this.syncSummary();
        return;
      }

      patch.plungeThreshold = plungeThreshold;
    }

    this.model = {
      ...this.model,
      ...patch
    };

    if (isPlungeThresholdEdit) {
      this.thresholdValue.textContent = `${this.model.plungeThreshold}°F`;

      if (event.type === 'change') {
        this.plungeThresholdInput.value = String(this.model.plungeThreshold);
      }
    }

    this.pushChange();
  }

  getEditablePlungeThreshold(shouldClamp) {
    const rawValue = this.plungeThresholdInput.value.trim();

    if (rawValue === '') {
      return shouldClamp ? this.model.plungeThreshold : Number.NaN;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) {
      return shouldClamp ? this.model.plungeThreshold : Number.NaN;
    }

    if (shouldClamp) {
      return clamp(value, PLUNGE_THRESHOLD_MIN, PLUNGE_THRESHOLD_MAX);
    }

    if (value < PLUNGE_THRESHOLD_MIN || value > PLUNGE_THRESHOLD_MAX) {
      return Number.NaN;
    }

    return value;
  }

  pushChange() {
    this.syncUrl();
    this.syncSummary();

    this.dispatchEvent(new CustomEvent('beach-filter:changed', {
      bubbles: true,
      composed: true,
      detail: {
        q: this.model.q,
        seattleOnly: this.model.seattleOnly,
        safeOnly: this.model.safeOnly,
        coldOnly: this.model.coldOnly,
        favoritesOnly: this.model.favoritesOnly,
        plungeThreshold: this.model.plungeThreshold
      }
    }));
  }

  syncUrl() {
    const url = new URL(window.location.href);

    if (this.model.q) {
      url.searchParams.set('q', this.model.q);
    } else {
      url.searchParams.delete('q');
    }

    const toggles = [
      ['seattle', this.model.seattleOnly],
      ['safe', this.model.safeOnly],
      ['cold', this.model.coldOnly],
      ['favorites', this.model.favoritesOnly]
    ];

    for (const [key, enabled] of toggles) {
      if (enabled) {
        url.searchParams.set(key, '1');
      } else {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.set('plunge', String(this.model.plungeThreshold));
    window.history.replaceState({}, '', url);
  }

  syncControls() {
    this.searchInput.value = this.model.q;
    this.seattleOnly.checked = this.model.seattleOnly;
    this.safeOnly.checked = this.model.safeOnly;
    this.coldOnly.checked = this.model.coldOnly;
    this.favoritesOnly.checked = this.model.favoritesOnly;
    this.plungeThresholdInput.value = String(this.model.plungeThreshold);
    this.thresholdValue.textContent = `${this.model.plungeThreshold}°F`;
  }

  syncSummary() {
    this.resultCount.textContent = `Showing ${this.model.visibleCount} of ${this.model.totalCount} beaches`;

    const notes = [];

    if (this.model.safeOnly) {
      if (this.model.liveStatusState === 'loading') {
        notes.push('Safety filter is waiting on the county status feed.');
      } else if (this.model.liveStatusState === 'error') {
        notes.push('Safety filter could not be fully applied because the county status feed is unavailable.');
      }
    }

    if (this.model.coldOnly) {
      if (this.model.liveTemperatureState === 'loading') {
        notes.push('Temperature filter is waiting on the county temperature feed.');
      } else if (this.model.liveTemperatureState === 'error') {
        notes.push('Temperature filter could not be fully applied because the county temperature feed is unavailable.');
      }
    }

    this.filterNote.textContent = notes.join(' ');
    this.filterNote.hidden = notes.length === 0;
  }

  render() {
    this.innerHTML = `
      <section class="filters-card">
        <div class="filters-card__header">
          <div>
            <p class="panel-kicker">Filters</p>
            <h2>Find your beach set</h2>
          </div>
          <button class="panel-link panel-link--ghost" type="button" data-action="reset-filters">Clear filters</button>
        </div>
        <form class="filters-form" novalidate>
          <label class="field">
            <span>Search beaches or aliases</span>
            <input type="search" name="q" placeholder="Magnuson Park">
          </label>
          <label class="field">
            <span>Plunge threshold</span>
            <div class="threshold-field">
              <input type="number" name="plunge" min="${PLUNGE_THRESHOLD_MIN}" max="${PLUNGE_THRESHOLD_MAX}" step="1" inputmode="numeric">
              <strong data-role="threshold-value"></strong>
            </div>
          </label>
          <fieldset class="toggle-grid">
            <label><input type="checkbox" name="seattle"> Seattle only</label>
            <label><input type="checkbox" name="safe"> Safe to enter</label>
            <label><input type="checkbox" name="cold"> At or below threshold</label>
            <label><input type="checkbox" name="favorites"> Favorites only</label>
          </fieldset>
        </form>
        <div class="filters-footer">
          <p class="result-count" data-role="result-count"></p>
          <p class="filter-note" data-role="filter-note" hidden></p>
        </div>
      </section>
    `;

    this.searchInput = this.querySelector('input[name="q"]');
    this.plungeThresholdInput = this.querySelector('input[name="plunge"]');
    this.thresholdValue = this.querySelector('[data-role="threshold-value"]');
    this.seattleOnly = this.querySelector('input[name="seattle"]');
    this.safeOnly = this.querySelector('input[name="safe"]');
    this.coldOnly = this.querySelector('input[name="cold"]');
    this.favoritesOnly = this.querySelector('input[name="favorites"]');
    this.resultCount = this.querySelector('[data-role="result-count"]');
    this.filterNote = this.querySelector('[data-role="filter-note"]');
  }
}

if (!customElements.get('beach-filters')) {
  customElements.define('beach-filters', BeachFilters);
}
