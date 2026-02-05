import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";
import { StoreController } from "@nanostores/lit";
import { allProxyGroupsAtom } from "../stores/iniStore";
import "./modal-dialog";

/**
 * 添加代理成员的专用弹窗
 */
@customElement("add-member-modal")
export class AddMemberModal extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private memberName = "";
  @state() private isGroup = true; // 默认添加组引用

  private _store = new StoreController(this, allProxyGroupsAtom);

  private handleConfirm() {
    if (!this.memberName.trim()) return;

    this.dispatchEvent(
      new CustomEvent("add-member", {
        detail: {
          name: this.memberName.trim(),
          isGroup: this.isGroup,
        },
        bubbles: true,
        composed: true,
      })
    );

    // 重置表单
    this.memberName = "";
    this.isGroup = true;
  }

  private handleClose() {
    this.memberName = "";
    this.isGroup = true;
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      this.handleConfirm();
    }
  }

  render() {
    return html`
      <modal-dialog
        .open=${this.open}
        dialogTitle="添加成员"
        confirmText="添加"
        @close=${this.handleClose}
        @confirm=${this.handleConfirm}
      >
        <div class="form">
          <div class="form-group">
            <label for="member-name">成员名称</label>
            <input
              id="member-name"
              type="text"
              placeholder="输入代理组或代理名称"
              .value=${this.memberName}
              list="group-suggestions"
              @input=${(e: InputEvent) => {
                const val = (e.target as HTMLInputElement).value;
                this.memberName = val;
                // Smart check: if matches an existing group, auto-check "Is Group"
                if (allProxyGroupsAtom.get().some((g) => g.name === val)) {
                  this.isGroup = true;
                }
              }}
              @keydown=${this.handleInputKeydown}
              autofocus
            />
            <datalist id="group-suggestions">
              ${this._store.value.map((g) => html`<option value="${g.name}"></option>`)}
            </datalist>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                .checked=${this.isGroup}
                @change=${(e: Event) => (this.isGroup = (e.target as HTMLInputElement).checked)}
              />
              <span>这是一个组引用（添加 [] 前缀）</span>
            </label>
          </div>
          <p class="hint">
            ${this.isGroup
              ? html`将添加: <code>[]${this.memberName || "名称"}</code>`
              : html`将添加: <code>${this.memberName || "名称"}</code>`}
          </p>
        </div>
      </modal-dialog>
    `;
  }

  static styles = [
    designSystem,
    css`
      .form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      label {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
      }

      input[type="text"] {
        padding: 10px 12px;
        background: var(--color-bg-input, #111);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        font-size: 0.9rem;
      }

      input[type="text"]:focus {
        outline: none;
        border-color: var(--color-accent);
      }

      .checkbox-group {
        flex-direction: row;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: var(--color-text-primary);
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--color-accent);
      }

      .hint {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin: 0;
      }

      .hint code {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        color: var(--color-accent);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "add-member-modal": AddMemberModal;
  }
}
