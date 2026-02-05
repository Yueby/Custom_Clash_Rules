import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { designSystem } from "../styles/design-system";
import type { ProxyGroup } from "../lib/ini-parser";
import Sortable from "sortablejs";

// Convert flag emojis to Twemoji SVG images
function renderWithTwemoji(text: string): ReturnType<typeof html> {
  // Find flag emojis by iterating through code points
  let result = text;
  const processedFlags: string[] = [];

  // Convert to array of code points to properly handle surrogate pairs
  const chars = [...text];

  for (let i = 0; i < chars.length - 1; i++) {
    const cp1 = chars[i].codePointAt(0);
    const cp2 = chars[i + 1].codePointAt(0);

    // Regional Indicator Symbol Letters: U+1F1E6 to U+1F1FF
    if (
      cp1 &&
      cp2 &&
      cp1 >= 0x1f1e6 &&
      cp1 <= 0x1f1ff &&
      cp2 >= 0x1f1e6 &&
      cp2 <= 0x1f1ff
    ) {
      const flag = chars[i] + chars[i + 1];
      if (!processedFlags.includes(flag)) {
        processedFlags.push(flag);
        const cpStr = cp1.toString(16) + "-" + cp2.toString(16);
        const imgUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cpStr}.svg`;
        const imgTag = `<img src="${imgUrl}" alt="${flag}" class="twemoji" style="height:1.2em;width:1.2em;vertical-align:-0.2em;margin:0 0.1em;">`;
        result = result.split(flag).join(imgTag);
      }
      i++; // Skip the next character
    }
  }

  return html`${unsafeHTML(result)}`;
}

@customElement("proxy-group-card")
export class ProxyGroupCard extends LitElement {
  @property({ type: Object })
  group!: ProxyGroup;

  @state()
  private isEditing = false;

  private sortable: Sortable | null = null;

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("group") && this.sortable) {
      // Verify if re-init is needed, usually Lit handles DOM diffing well
    }
  }

  firstUpdated() {
    const grid = this.shadowRoot?.querySelector(".members-grid") as HTMLElement;
    if (grid) {
      this.sortable = new Sortable(grid, {
        animation: 150,
        ghostClass: "sortable-ghost",
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (
            oldIndex === undefined ||
            newIndex === undefined ||
            oldIndex === newIndex
          )
            return;

          // Reorder logic
          // Note: The members-grid only shows staticProxies.
          // We need to be careful not to lose regex proxies or change their relative order to static ones if they are mixed.
          // Current parser implementation separates them?
          // Actually parser just has `proxies` array.
          // In render(), we split them: regexProxies and staticProxies.
          // If we sort staticProxies, we need to reconstruct the full list.

          const staticProxies = this.group.proxies.filter((p) =>
            p.startsWith("[]"),
          );
          const otherProxies = this.group.proxies.filter(
            (p) => !p.startsWith("[]"),
          );

          const item = staticProxies.splice(oldIndex, 1)[0];
          staticProxies.splice(newIndex, 0, item);

          // Recombine: regex/others first? Or keep original relative order?
          // The current render puts regex separate.
          // Let's assume we just keep others at the top or bottom.
          // To be safe, let's keep others first as they are usually regexes.

          const newProxies = [...otherProxies, ...staticProxies];
          this.dispatchUpdate({ ...this.group, proxies: newProxies });
        },
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.sortable?.destroy();
  }

  private dispatchUpdate(newGroup: ProxyGroup) {
    this.dispatchEvent(
      new CustomEvent("update-group", {
        detail: { group: newGroup, originalName: this.group.name },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleNameChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const newName = input.value;
    if (newName && newName !== this.group.name) {
      this.dispatchUpdate({ ...this.group, name: newName });
    }
  }

  private handleMetaChange(
    field: "testUrl" | "interval" | "tolerance",
    e: Event,
  ) {
    const input = e.target as HTMLInputElement;
    const val = input.value;
    this.dispatchUpdate({ ...this.group, [field]: val });
  }

  private toggleType() {
    const newType = this.group.type === "select" ? "url-test" : "select";
    this.dispatchUpdate({ ...this.group, type: newType });
  }

  private removeMember(member: string) {
    const newProxies = this.group.proxies.filter((p) => p !== member);
    this.dispatchUpdate({ ...this.group, proxies: newProxies });
  }

  private addMember() {
    const member = prompt(
      "Enter proxy or group name (use [] prefix for groups, e.g. []MyGroup):",
    );
    if (member) {
      const newProxies = [...this.group.proxies, member];
      this.dispatchUpdate({ ...this.group, proxies: newProxies });
    }
  }

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
            ${this.isEditing
              ? html`<input
                  class="edit-name"
                  value="${this.group.name}"
                  @change=${this.handleNameChange}
                  @blur=${() => (this.isEditing = false)}
                  autofocus
                />`
              : html`<span
                  class="name"
                  @click=${() => (this.isEditing = true)}
                  title="Click to rename"
                  >${renderWithTwemoji(this.group.name)}</span
                >`}
            <span
              class="badge"
              @click=${this.toggleType}
              title="Click to toggle type"
              style="cursor: pointer"
              >${this.group.type}</span
            >
          </div>
          ${isAuto && this.group.testUrl
            ? html`
                <div class="meta-row">
                  <div class="meta-item" title="Test URL">
                    <i class="ph ph-globe"></i>
                    ${this.isEditing
                      ? html`<input
                          class="edit-meta"
                          value="${this.group.testUrl}"
                          @change=${(e: Event) =>
                            this.handleMetaChange("testUrl", e)}
                        />`
                      : html`<span>${this.group.testUrl}</span>`}
                  </div>
                  <div class="meta-item" title="Interval">
                    <i class="ph ph-timer"></i>
                    ${this.isEditing
                      ? html`<input
                          class="edit-meta short"
                          value="${this.group.interval}"
                          @change=${(e: Event) =>
                            this.handleMetaChange("interval", e)}
                        />`
                      : html`<span>${this.group.interval}s</span>`}
                  </div>
                </div>
              `
            : ""}
        </div>

        <div class="content">
          ${regexProxies.length > 0
            ? html`
                <div class="section-label">REGEX MATCH</div>
                <div class="regex-box">
                  ${regexProxies.map(
                    (r) => html`
                      <div class="regex-item">
                        <code>${r}</code>
                        <span
                          class="remove-btn"
                          @click=${() => this.removeMember(r)}
                          ><i class="ph ph-x"></i
                        ></span>
                      </div>
                    `,
                  )}
                </div>
              `
            : ""}

          <div class="section-header">
            <div class="section-label">MEMBERS</div>
            <span class="add-btn" @click=${this.addMember}>+</span>
          </div>
          <div class="members-grid">
            ${staticProxies.map(
              (p) =>
                html` <span class="member-chip">
                  <i
                    class="ph ph-arrows-out-card handle"
                    style="cursor: grab; opacity: 0.5; font-size: 12px; margin-right: 2px;"
                  ></i>
                  ${renderWithTwemoji(p)}
                  <span
                    class="remove-btn"
                    @click=${() => this.removeMember("[]" + p)}
                    ><i class="ph ph-x"></i
                  ></span>
                </span>`,
            )}
          </div>
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
        margin-bottom: 4px;
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        margin-bottom: 4px;
      }
      .add-btn {
        width: 16px;
        height: 16px;
        background: #333;
        color: #fff;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
      }
      .add-btn:hover {
        background: var(--color-accent);
      }

      .edit-name {
        background: #111;
        border: 1px solid var(--color-accent);
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        padding: 2px 4px;
        width: 100%;
      }
      .edit-meta {
        background: #111;
        border: 1px solid var(--color-border);
        color: var(--color-text-muted);
        font-family: inherit;
        font-size: 0.75rem;
        padding: 0 4px;
        width: 140px;
      }
      .edit-meta.short {
        width: 40px;
      }

      .sortable-ghost {
        opacity: 0.4;
        background: var(--color-accent);
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
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .regex-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
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
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .member-chip:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.2);
        color: var(--color-text-primary);
      }
      .remove-btn {
        opacity: 0;
        font-weight: bold;
        cursor: pointer;
        color: #ff6b6b;
      }
      .member-chip:hover .remove-btn,
      .regex-item:hover .remove-btn {
        opacity: 1;
      }
    `,
  ];
}
