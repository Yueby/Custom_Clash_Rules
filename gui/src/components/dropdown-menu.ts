import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";

export interface MenuItem {
  id: string;
  label: string;
  icon?: string | any;
  danger?: boolean;
  divider?: boolean;
}

/**
 * 通用下拉菜单组件
 */
@customElement("dropdown-menu")
export class DropdownMenu extends LitElement {
  @property({ type: Array }) items: MenuItem[] = [];
  @property({ type: String }) trigger = "⋮";

  @state() private isOpen = false;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleOutsideClick);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (this.isOpen && !this.contains(e.target as Node)) {
      this.isOpen = false;
    }
  };

  private toggleMenu(e: Event) {
    e.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  private handleItemClick(item: MenuItem) {
    if (item.divider) return;
    this.isOpen = false;
    this.dispatchEvent(
      new CustomEvent("menu-select", {
        detail: { id: item.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="dropdown">
        <button class="trigger" @click=${this.toggleMenu}>${this.trigger}</button>
        ${this.isOpen
          ? html`
              <div class="menu">
                ${this.items.map((item) =>
                  item.divider
                    ? html`<div class="divider"></div>`
                    : html`
                        <div
                          class="menu-item ${item.danger ? "danger" : ""}"
                          @click=${() => this.handleItemClick(item)}
                        >
                          ${item.icon ? html`<span class="icon">${item.icon}</span>` : ""}
                          <span>${item.label}</span>
                        </div>
                      `
                )}
              </div>
            `
          : ""}
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        position: relative;
        display: inline-block;
      }

      .dropdown {
        position: relative;
      }

      .trigger {
        background: transparent;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px 8px;
        font-size: 14px;
        border-radius: var(--radius-sm);
        transition: all 0.15s;
      }

      .trigger:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text-primary);
      }

      .menu {
        position: absolute;
        top: 100%;
        right: 0;
        min-width: 160px;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        z-index: 100;
        overflow: hidden;
        animation: slideIn 0.15s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        transition: all 0.1s;
      }

      .menu-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--color-text-primary);
      }

      .menu-item.danger {
        color: var(--color-danger, #ff6b6b);
      }

      .menu-item.danger:hover {
        background: rgba(255, 107, 107, 0.1);
      }

      .icon {
        font-size: 14px;
        width: 18px;
        text-align: center;
      }

      .divider {
        height: 1px;
        background: var(--color-border);
        margin: 4px 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dropdown-menu": DropdownMenu;
  }
}
