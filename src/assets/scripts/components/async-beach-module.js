import { escapeHtml } from '../lib/formatters.js';

export class AsyncBeachModule extends HTMLElement {
  constructor() {
    super();

    this.handleClick = this.handleClick.bind(this);
    this.state = 'idle';
    this.loadedData = null;
    this.inflight = null;
  }

  get sectionTitle() {
    return 'Module';
  }

  connectedCallback() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.addEventListener('click', this.handleClick);
    this.renderIdle();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  handleClick(event) {
    const retryButton = event.target.closest('[data-action="retry-module"]');

    if (!retryButton) {
      return;
    }

    this.activate({
      force: true
    });
  }

  setState(state) {
    this.state = state;
    this.dataset.state = state;
  }

  renderFrame(body) {
    this.innerHTML = `
      <section class="module-card">
        <header class="module-header">
          <p class="module-title">${escapeHtml(this.sectionTitle)}</p>
        </header>
        <div class="module-body">
          ${body}
        </div>
      </section>
    `;
  }

  renderIdle() {
    this.setState('idle');
    this.renderFrame(`
      <p class="module-kicker">Idle</p>
      <div class="skeleton-stack" aria-hidden="true">
        <span class="skeleton-line skeleton-line--short"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line--medium"></span>
      </div>
    `);
  }

  renderLoading() {
    this.setState('loading');
    this.renderFrame(`
      <p class="module-kicker">Loading</p>
      <div class="skeleton-stack" aria-hidden="true">
        <span class="skeleton-line skeleton-line--medium"></span>
        <span class="skeleton-line"></span>
        <span class="skeleton-line skeleton-line--short"></span>
      </div>
    `);
  }

  renderError(error) {
    this.setState('error');
    this.renderFrame(`
      <p class="module-kicker">Could not load this module</p>
      <p class="module-copy">${escapeHtml(error?.message || 'Unknown error')}</p>
      <button class="module-button" type="button" data-action="retry-module">Retry module</button>
    `);
  }

  renderSuccess(data) {
    this.setState('success');
    this.renderFrame(this.renderSuccessContent(data));
  }

  dispatchModuleEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  async activate(options = {}) {
    if (this.inflight) {
      return this.inflight;
    }

    if (this.state === 'success' && !options.force) {
      return this.loadedData;
    }

    this.renderLoading();

    this.inflight = (async () => {
      try {
        const data = await this.loadData(options);

        this.loadedData = data;

        if (this.isConnected) {
          this.renderSuccess(data);
        }

        this.dispatchModuleEvent('beach-module:loaded', {
          beachId: this.getAttribute('beach-id'),
          moduleName: this.localName
        });

        return data;
      } catch (error) {
        if (this.isConnected) {
          this.renderError(error);
        }

        this.dispatchModuleEvent('beach-module:error', {
          beachId: this.getAttribute('beach-id'),
          moduleName: this.localName,
          message: error?.message || 'Unknown error'
        });

        return null;
      } finally {
        this.inflight = null;
      }
    })();

    return this.inflight;
  }
}
