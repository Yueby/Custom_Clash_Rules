import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Ruleset } from "../lib/ini-parser";
import { designSystem } from "../styles/design-system";

// SVG Icons
const iconPencil = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120Z"
  ></path>
</svg>`;
const iconTrash = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
  ></path>
</svg>`;
const iconGlobe = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.24,104h16.94a15.91,15.91,0,0,0,10.64-4.07l10.88-9.76h17.57a16,16,0,0,0,15.86-18l-.81-6.56,9.43-6.78a8,8,0,0,0,2.25-10A88.08,88.08,0,0,1,216,128Z"
  ></path>
</svg>`;
const iconChip = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M152,96H104a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8h48a8,8,0,0,0,8-8V104A8,8,0,0,0,152,96Zm-8,48H112V112h32ZM208,40H48A16,16,0,0,0,32,56V200a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,160H48V56H208V200Z"
  ></path>
</svg>`;
const iconFile = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"
  ></path>
</svg>`;
const iconDrag = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M108,60A16,16,0,1,1,92,44,16,16,0,0,1,108,60Zm56-16a16,16,0,1,0,16,16A16,16,0,0,0,164,44ZM92,112a16,16,0,1,0,16,16A16,16,0,0,0,92,112Zm72,0a16,16,0,1,0,16,16A16,16,0,0,0,164,112ZM92,180a16,16,0,1,0,16,16A16,16,0,0,0,92,180Zm72,0a16,16,0,1,0,16,16A16,16,0,0,0,164,180Z"
  ></path>
</svg>`;

/**
 * 规则卡片组件
 * 显示单条 Ruleset 信息，支持编辑和删除
 */
@customElement("ruleset-card")
export class RulesetCard extends LitElement {
  @property({ type: Object }) ruleset!: Ruleset;
  @property({ type: String }) highlightTerm = "";
  @property({ type: Number }) index = 0;

  private getTypeIcon() {
    switch (this.ruleset.type) {
      case "remote":
        return iconGlobe;
      case "builtin":
        return iconChip;
      case "local":
        return iconFile;
      default:
        return iconFile;
    }
  }

  private getTypeLabel() {
    switch (this.ruleset.type) {
      case "remote":
        return "远程";
      case "builtin":
        return "内置";
      case "local":
        return "本地";
      default:
        return this.ruleset.type;
    }
  }

  private handleEdit() {
    this.dispatchEvent(
      new CustomEvent("edit-ruleset", {
        detail: { ruleset: this.ruleset },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleDelete() {
    if (confirm(`确定删除规则 "${this.ruleset.source}"？`)) {
      this.dispatchEvent(
        new CustomEvent("delete-ruleset", {
          detail: { source: this.ruleset.source },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private highlightText(text: string) {
    if (!this.highlightTerm) return text;
    const regex = new RegExp(`(${this.highlightTerm})`, "gi");
    const parts = text.split(regex);
    return parts.map((part) =>
      part.toLowerCase() === this.highlightTerm.toLowerCase()
        ? html`<span class="highlight">${part}</span>`
        : part
    );
  }

  render() {
    const { ruleset } = this;
    return html`
      <div class="card" draggable="true">
        <div class="drag-handle">${iconDrag}</div>
        <div class="content">
          <div class="header">
            <span class="target-group">${this.highlightText(ruleset.name)}</span>
            <span class="type-badge ${ruleset.type}">
              ${this.getTypeIcon()} ${this.getTypeLabel()}
            </span>
          </div>
          <div class="source">
            <code>${this.highlightText(ruleset.source)}</code>
          </div>
          ${ruleset.interval
            ? html`<div class="interval">更新间隔: ${ruleset.interval}s</div>`
            : ""}
        </div>
        <div class="actions">
          <button class="action-btn" @click=${this.handleEdit} title="编辑">${iconPencil}</button>
          <button class="action-btn danger" @click=${this.handleDelete} title="删除">
            ${iconTrash}
          </button>
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
      .highlight {
        background: var(--color-warning, #f59e0b);
        color: #000;
        padding: 0 2px;
        border-radius: 2px;
      }
      .card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        transition: all 0.15s;
      }
      .card:hover {
        border-color: #555;
      }
      .card:hover .actions {
        opacity: 1;
      }
      .drag-handle {
        cursor: grab;
        color: var(--color-text-muted);
        opacity: 0.5;
        transition: opacity 0.15s;
      }
      .card:hover .drag-handle {
        opacity: 1;
      }
      .content {
        flex: 1;
        min-width: 0;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .target-group {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--color-text-primary);
      }
      .type-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 100px;
        font-weight: 500;
      }
      .type-badge.remote {
        background: var(--color-type-remote-bg);
        color: var(--color-type-remote);
      }
      .type-badge.builtin {
        background: var(--color-type-builtin-bg);
        color: var(--color-type-builtin);
      }
      .type-badge.local {
        background: var(--color-type-local-bg);
        color: var(--color-type-local);
      }
      .source {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .source code {
        font-family: monospace;
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .interval {
        font-size: 0.7rem;
        color: var(--color-text-muted);
        margin-top: 4px;
      }
      .actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(255, 255, 255, 0.05);
        color: var(--color-text-muted);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .action-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text-primary);
      }
      .action-btn.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ruleset-card": RulesetCard;
  }
}
