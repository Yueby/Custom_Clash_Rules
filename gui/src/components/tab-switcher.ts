import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";

export interface TabOption {
  id: string;
  label: string;
  icon?: ReturnType<typeof html>;
}

/**
 * 通用 Tab 切换器组件
 *
 * @example
 * ```html
 * <tab-switcher
 *   .options=${[{ id: "code", label: "代码" }, { id: "visual", label: "可视化" }]}
 *   .value=${"code"}
 *   @change=${(e) => console.log(e.detail.value)}
 * ></tab-switcher>
 * ```
 */
@customElement("tab-switcher")
export class TabSwitcher extends LitElement {
  @property({ type: Array }) options: TabOption[] = [];
  @property({ type: String }) value = "";

  private handleClick(id: string) {
    if (id !== this.value) {
      this.value = id;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: { value: id },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <div class="tab-switcher">
        ${this.options.map(
          (opt) => html`
            <span
              class="tab-option ${this.value === opt.id ? "active" : ""}"
              @click=${() => this.handleClick(opt.id)}
            >
              ${opt.icon ? opt.icon : ""} ${opt.label}
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
      .tab-switcher {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        padding: 4px;
        border-radius: 8px;
        gap: 4px;
      }
      .tab-option {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        color: var(--color-text-muted);
        transition: all 0.2s;
        border: 1px solid transparent;
        user-select: none;
      }
      .tab-option:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.05);
      }
      .tab-option.active {
        background: var(--color-bg-elevated);
        color: var(--color-accent);
        border-color: var(--color-border);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .tab-option svg {
        opacity: 0.8;
        width: 14px;
        height: 14px;
      }
      .tab-option.active svg {
        opacity: 1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "tab-switcher": TabSwitcher;
  }
}
