import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";
import type { ProxyGroup } from "../lib/ini-parser";

@customElement("proxy-group-card")
export class ProxyGroupCard extends LitElement {
  @property({ type: Object })
  group!: ProxyGroup;

  render() {
    const isAuto = this.group.type === "url-test";
    const typeClass = isAuto ? "type-auto" : "type-select";

    // Check if regex is used (proxies array contains something looking like a regex)
    const regexProxies = this.group.proxies.filter(
      (p) => !p.startsWith("[]") && (p.includes(".") || p.includes("^")),
    );
    const staticProxies = this.group.proxies
      .filter((p) => p.startsWith("[]"))
      .map((p) => p.replace("[]", ""));

    return html`
      <div class="card ${typeClass}">
        <div class="header">
          <div class="title-row">
            <span class="name">${this.group.name}</span>
            <span class="badge">${this.group.type}</span>
          </div>
          ${isAuto && this.group.testUrl
            ? html`
                <div class="meta-row">
                  <span class="meta-item" title="Test URL"
                    >🌐 ${this.group.testUrl}</span
                  >
                  <span class="meta-item" title="Interval"
                    >⏱️ ${this.group.interval}s</span
                  >
                </div>
              `
            : ""}
        </div>

        <div class="content">
          ${regexProxies.length > 0
            ? html`
                <div class="section-label">REGEX MATCH</div>
                <div class="regex-box">
                  ${regexProxies.map((r) => html`<code>${r}</code>`)}
                </div>
              `
            : ""}
          ${staticProxies.length > 0
            ? html`
                <div class="section-label">INCLUDES</div>
                <div class="members-grid">
                  ${staticProxies.map(
                    (p) => html`<span class="member-chip">${p}</span>`,
                  )}
                </div>
              `
            : ""}
        </div>
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        display: block;
      }
      .card {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .card:hover {
        /* User requested no hover float effect */
        border-color: #666;
      }

      /* Type specific styling */
      .type-select .badge {
        background: var(--color-type-select-bg);
        color: var(--color-type-select);
      }
      .type-select:hover {
        /* No border top change to prevent layout shift */
        /* border-top: 3px solid var(--color-type-select); */
      }

      .type-auto .badge {
        background: var(--color-type-auto-bg);
        color: var(--color-type-auto);
      }
      .type-auto:hover {
        /* No border top change */
        /* border-top: 3px solid var(--color-type-auto); */
      }

      .header {
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid var(--color-border);
      }

      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xs);
      }

      .name {
        font-weight: 700;
        font-size: 1rem;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 8px;
      }

      .meta-row {
        display: flex;
        gap: 10px;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 4px;
      }
      .meta-item {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .content {
        padding: var(--spacing-md);
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .section-label {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--color-text-muted);
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }

      .regex-box {
        background: rgba(0, 0, 0, 0.3);
        padding: 6px 8px;
        border-radius: var(--radius-sm);
        border: 1px dashed var(--color-border);
        font-family: "Consolas", monospace;
        font-size: 0.8rem;
        color: #ce9178;
        word-break: break-all;
      }

      .members-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .member-chip {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 12px; /* Pill shape */
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        border: 1px solid transparent;
      }
      .member-chip:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
        color: var(--color-text-primary);
      }
    `,
  ];
}
