/**
 * 通用筛选栏组件
 * 可复用于组 tab 和规则 tab 的类型筛选
 */
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";

export interface FilterOption {
  id: string;
  label: string;
  count: number;
  color?: string; // 可选的颜色
}

@customElement("filter-bar")
export class FilterBar extends LitElement {
  @property({ type: Array })
  options: FilterOption[] = [];

  @property({ type: String })
  value = "all";

  private handleClick(id: string) {
    this.value = id;
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: id },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="filter-bar">
        ${this.options.map(
          (opt) => html`
            <span
              class="filter-item ${this.value === opt.id ? "active" : ""}"
              style="${opt.color ? `--item-color: ${opt.color}` : ""}"
              @click=${() => this.handleClick(opt.id)}
            >
              ${opt.label}: ${opt.count}
            </span>
          `
        )}
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        display: inline-block;
      }
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        background: rgba(0, 0, 0, 0.2);
        padding: 4px;
        border-radius: 8px;
      }
      .filter-item {
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 6px;
        transition: all 0.2s;
        border: 1px solid transparent;
        color: var(--item-color, var(--color-text-muted));
        user-select: none;
      }
      .filter-item:hover {
        color: var(--item-color, var(--color-text-primary));
        background: rgba(255, 255, 255, 0.05);
      }
      .filter-item.active {
        background: var(--color-bg-elevated);
        color: var(--item-color, var(--color-accent));
        border-color: var(--color-border);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .divider {
        color: rgba(255, 255, 255, 0.2);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "filter-bar": FilterBar;
  }
}
