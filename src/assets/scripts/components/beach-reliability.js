import beachClient from '../lib/beach-client.js';
import {
  escapeHtml,
  formatBacteriaValue,
  formatCount,
  reliabilityTone
} from '../lib/formatters.js';
import { AsyncBeachModule } from './async-beach-module.js';

class BeachReliability extends AsyncBeachModule {
  get sectionTitle() {
    return 'Reliability';
  }

  get beachId() {
    return this.getAttribute('beach-id');
  }

  async loadData(options = {}) {
    return beachClient.getBeachReliability(this.beachId, options);
  }

  renderSuccessContent(data) {
    const thirtyDayNote = Number.isFinite(data.bacteria30dGeomean)
      ? `${formatBacteriaValue(data.bacteria30dGeomean)} CFU / 100 mL`
      : 'No recent 30-day average in the current feed';

    const highSamplesNote = Number.isFinite(data.highSamples30d)
      ? formatCount(data.highSamples30d, 'high sample')
      : 'No recent 30-day high-sample count in the current feed';

    return `
      <div class="metric-row">
        <div>
          <p class="module-kicker">County long-view context</p>
          <p class="module-copy">${escapeHtml(data.reliabilitySummary)}</p>
        </div>
        <span class="status-pill status-pill--${escapeHtml(reliabilityTone(data.reliabilityCategory))}">
          ${escapeHtml(data.reliabilityLabel)}
        </span>
      </div>
      <dl class="meta-list">
        <div>
          <dt>30-day geomean</dt>
          <dd>${escapeHtml(thirtyDayNote)}</dd>
        </div>
        <div>
          <dt>30-day high samples</dt>
          <dd>${escapeHtml(highSamplesNote)}</dd>
        </div>
      </dl>
      <p class="module-fine-print">The county uses current bacteria results and 30-day context together when deciding whether to close a beach.</p>
    `;
  }
}

if (!customElements.get('beach-reliability')) {
  customElements.define('beach-reliability', BeachReliability);
}
