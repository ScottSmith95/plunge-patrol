import beachClient from '../lib/beach-client.js';
import { escapeHtml, statusTone } from '../lib/formatters.js';
import { AsyncBeachModule } from './async-beach-module.js';

class BeachStatus extends AsyncBeachModule {
  get sectionTitle() {
    return 'Safety and bacteria';
  }

  get beachId() {
    return this.getAttribute('beach-id');
  }

  async loadData(options = {}) {
    return beachClient.getBeachStatus(this.beachId, options);
  }

  renderSuccessContent(data) {
    if (!data.hasSourceRecord) {
      return `
        <p class="module-kicker">County status unavailable</p>
        <p class="module-copy">This beach is in the local manifest, but no current status record matched in the county feed.</p>
      `;
    }

    let summary = 'Use this status as the county-authoritative signal before entering the water.';
    let monitoring = 'County monitoring is active for this beach.';

    if (data.officialStatus === 'Stay out of the water') {
      summary = 'The county currently advises people to stay out of the water here.';
      monitoring = 'Closure is active in the current county feed.';
    } else if (data.officialStatus === 'No recent data') {
      summary = 'No recent county sample is posted right now, so treat any temperature value as historical context rather than live clearance.';
      monitoring = 'This beach is in the county program, but a current sample is not posted.';
    } else if (data.officialStatus !== 'OK to swim (low bacteria)') {
      summary = 'The county feed does not currently show a clear swim-safe signal for this beach.';
      monitoring = 'Check the official county page for more context.';
    }

    return `
      <div class="metric-row">
        <div>
          <p class="module-kicker">Official county status</p>
          <p class="module-copy">${escapeHtml(summary)}</p>
        </div>
        <span class="status-pill status-pill--${escapeHtml(statusTone(data.officialStatus))}">
          ${escapeHtml(data.officialStatus)}
        </span>
      </div>
      <dl class="meta-list">
        <div>
          <dt>Monitoring</dt>
          <dd>${escapeHtml(monitoring)}</dd>
        </div>
        ${data.reasonForClosure ? `
          <div>
            <dt>Closure reason</dt>
            <dd>${escapeHtml(data.reasonForClosure)}</dd>
          </div>
        ` : ''}
        ${data.closureExplanation ? `
          <div>
            <dt>County note</dt>
            <dd>${escapeHtml(data.closureExplanation)}</dd>
          </div>
        ` : ''}
      </dl>
    `;
  }
}

if (!customElements.get('beach-status')) {
  customElements.define('beach-status', BeachStatus);
}
