import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";

/**
 * 通用 Modal 弹窗组件
 * 支持标题、内容 slot 和操作按钮
 */
@customElement("modal-dialog")
export class ModalDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) dialogTitle = "";
  @property({ type: Boolean }) showCancel = true;
  @property({ type: String }) confirmText = "确定";
  @property({ type: String }) cancelText = "取消";

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.open && e.key === "Escape") {
      this.close();
    }
  };

  private close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private confirm() {
    this.dispatchEvent(new CustomEvent("confirm", { bubbles: true, composed: true }));
  }

  private handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("backdrop")) {
      this.close();
    }
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="backdrop" @click=${this.handleBackdropClick}>
        <div class="modal">
          ${this.dialogTitle ? html`<div class="header">${this.dialogTitle}</div>` : ""}
          <div class="content">
            <slot></slot>
          </div>
          <div class="footer">
            ${this.showCancel
              ? html`<button class="btn btn-cancel" @click=${this.close}>
                  ${this.cancelText}
                </button>`
              : ""}
            <button class="btn btn-confirm" @click=${this.confirm}>${this.confirmText}</button>
          </div>
        </div>
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        display: contents;
      }

      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.15s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal {
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        min-width: 320px;
        max-width: 520px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        animation: slideIn 0.2s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .header {
        padding: 16px 20px;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-primary);
        border-bottom: 1px solid var(--color-border);
      }

      .content {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
      }

      .footer {
        padding: 12px 20px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        border-top: 1px solid var(--color-border);
      }

      .btn {
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.15s;
      }

      .btn-cancel {
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);
      }

      .btn-cancel:hover {
        background: var(--color-bg-surface-hover);
      }

      .btn-confirm {
        background: var(--color-accent);
        color: white;
      }

      .btn-confirm:hover {
        background: var(--color-accent-hover);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "modal-dialog": ModalDialog;
  }
}
