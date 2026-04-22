import beachClient from '../lib/beach-client.js';
import { escapeHtml, formatDateTime, formatTemperature } from '../lib/formatters.js';
import { AsyncBeachModule } from './async-beach-module.js';

class BeachTemperature extends AsyncBeachModule {
  static get observedAttributes() {
    return ['plunge-threshold'];
  }

  get sectionTitle() {
    return 'Temperature';
  }

  get beachId() {
    return this.getAttribute('beach-id');
  }

  get plungeThreshold() {
    const value = Number(this.getAttribute('plunge-threshold'));

    return Number.isFinite(value) ? value : 60;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'plunge-threshold' && oldValue !== newValue && this.loadedData) {
      this.renderSuccess(this.loadedData);
    }
  }

  async loadData(options = {}) {
    const [temperature, status] = await Promise.all([
      beachClient.getBeachTemperature(this.beachId, options),
      beachClient.getBeachStatus(this.beachId, options)
    ]);

    return {
      ...temperature,
      officialStatus: status.officialStatus,
      isClosed: status.officialStatus === 'Stay out of the water'
    };
  }

  renderSuccessContent(data) {
    if (!data.hasSourceRecord || !Number.isFinite(data.waterTempF)) {
      return `
        <p class="module-kicker">No temperature record</p>
        <p class="module-copy">The county feed does not include a recent temperature value for this beach.</p>
      `;
    }

    const threshold = this.plungeThreshold;
    const delta = Math.round((data.waterTempF - threshold) * 10) / 10;
    const label = data.officialStatus === 'No recent data' ? 'Latest recorded temperature' : 'Most recent county temperature';

    let recommendation = `Above your ${threshold}°F plunge threshold by ${Math.abs(delta).toFixed(1)}°F.`;

    if (delta <= 0) {
      recommendation = `Within your ${threshold}°F plunge threshold by ${Math.abs(delta).toFixed(1)}°F.`;
    }

    let footer = 'Always confirm the status card before entering the water.';

    if (data.officialStatus === 'No recent data') {
      footer = 'This looks like an off-season or stale reading, so use it as context rather than a live go signal.';
    } else if (data.isClosed) {
      footer = 'Even if the temperature looks right, the county currently advises people to stay out of the water.';
    }

    return `
      <div class="metric-row">
        <div>
          <p class="module-kicker">${escapeHtml(label)}</p>
          <p class="temperature-value">${escapeHtml(formatTemperature(data.waterTempF))}</p>
        </div>
        <span class="status-pill status-pill--neutral">Threshold ${escapeHtml(String(threshold))}°F</span>
      </div>
      <p class="module-copy">${escapeHtml(recommendation)}</p>
      <dl class="meta-list">
        <div>
          <dt>Recorded</dt>
          <dd>${escapeHtml(formatDateTime(data.sampleTimestamp))}</dd>
        </div>
      </dl>
      <p class="module-fine-print">${escapeHtml(footer)}</p>
    `;
  }
}

if (!customElements.get('beach-temperature')) {
  customElements.define('beach-temperature', BeachTemperature);
}
