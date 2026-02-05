import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";
import { PROXY_GROUP_TYPES, type ProxyGroup, type ProxyGroupType } from "../lib/ini-parser";
import "./modal-dialog";

/**
 * 新增/编辑代理组弹窗
 */
@customElement("create-group-modal")
export class CreateGroupModal extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) existingGroups: ProxyGroup[] = [];
  /** 编辑模式时传入现有组 */
  @property({ type: Object }) editGroup: ProxyGroup | null = null;

  @state() private groupName = "";
  @state() private groupType: ProxyGroupType = "select";
  @state() private testUrl = "http://www.gstatic.com/generate_204";
  @state() private interval = "300";
  @state() private tolerance = "50";
  @state() private regexFilter = "";
  @state() private selectedMembers: string[] = [];

  updated(changedProperties: Map<string, unknown>) {
    // 编辑模式：加载现有组数据
    if (changedProperties.has("editGroup") && this.editGroup) {
      this.loadGroupData(this.editGroup);
    }
    // 打开弹窗时，如果没有 editGroup 则重置表单
    if (changedProperties.has("open") && this.open && !this.editGroup) {
      this.resetForm();
    }
  }

  private loadGroupData(group: ProxyGroup) {
    this.groupName = group.name;
    this.groupType = group.type as ProxyGroupType;
    this.testUrl = group.testUrl || "http://www.gstatic.com/generate_204";
    this.interval = group.interval || "300";
    this.tolerance = group.tolerance || "50";

    // 分离组引用和正则表达式
    const groupRefs: string[] = [];
    const regexPatterns: string[] = [];

    for (const proxy of group.proxies) {
      if (proxy.startsWith("[]")) {
        groupRefs.push(proxy.replace("[]", ""));
      } else if (proxy.includes("(") || proxy.includes("*") || proxy.includes("\\")) {
        regexPatterns.push(proxy);
      }
    }

    this.selectedMembers = groupRefs;
    this.regexFilter = regexPatterns.join("\n");
  }

  private resetForm() {
    this.groupName = "";
    this.groupType = "select";
    this.testUrl = "http://www.gstatic.com/generate_204";
    this.interval = "300";
    this.tolerance = "50";
    this.regexFilter = "";
    this.selectedMembers = [];
  }

  private handleClose() {
    this.resetForm();
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private handleConfirm() {
    if (!this.groupName.trim()) {
      return;
    }

    // 构建 proxies 列表
    const proxies: string[] = [];

    // 添加组引用
    for (const member of this.selectedMembers) {
      proxies.push("[]" + member);
    }

    // 添加正则过滤器
    if (this.regexFilter.trim()) {
      const patterns = this.regexFilter.split("\n").filter((p) => p.trim());
      proxies.push(...patterns);
    }

    const group: ProxyGroup = {
      name: this.groupName.trim(),
      type: this.groupType,
      proxies,
    };

    // 添加 url-test / fallback 相关配置
    if (this.groupType === "url-test" || this.groupType === "fallback") {
      group.testUrl = this.testUrl;
      group.interval = this.interval;
      if (this.groupType === "url-test") {
        group.tolerance = this.tolerance;
      }
    }

    const eventName = this.editGroup ? "update-group" : "create-group";
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { group, originalName: this.editGroup?.name },
        bubbles: true,
        composed: true,
      })
    );

    this.resetForm();
  }

  private toggleMember(name: string) {
    if (this.selectedMembers.includes(name)) {
      this.selectedMembers = this.selectedMembers.filter((m) => m !== name);
    } else {
      this.selectedMembers = [...this.selectedMembers, name];
    }
  }

  private get needsTestConfig(): boolean {
    return this.groupType === "url-test" || this.groupType === "fallback";
  }

  private get isEditMode(): boolean {
    return this.editGroup !== null;
  }

  render() {
    return html`
      <modal-dialog
        .open=${this.open}
        dialogTitle=${this.isEditMode ? "编辑代理组" : "新增代理组"}
        confirmText=${this.isEditMode ? "保存" : "创建"}
        @close=${this.handleClose}
        @confirm=${this.handleConfirm}
      >
        <div class="form">
          <!-- 组名称 -->
          <div class="form-group">
            <label>组名称</label>
            <input
              type="text"
              placeholder="例如: 流媒体"
              .value=${this.groupName}
              @input=${(e: InputEvent) => (this.groupName = (e.target as HTMLInputElement).value)}
            />
          </div>

          <!-- 组类型 -->
          <div class="form-group">
            <label>组类型</label>
            <div class="type-grid">
              ${PROXY_GROUP_TYPES.map(
                (type) => html`
                  <div
                    class="type-option ${this.groupType === type.value ? "selected" : ""}"
                    @click=${() => (this.groupType = type.value)}
                  >
                    <div class="type-info">
                      <span class="type-label">${type.label}</span>
                      <span class="type-desc">${type.description}</span>
                    </div>
                  </div>
                `
              )}
            </div>
          </div>

          <!-- URL-Test / Fallback 配置 -->
          ${this.needsTestConfig
            ? html`
                <div class="form-group config-section">
                  <label>测速配置</label>
                  <div class="config-row">
                    <div class="config-item">
                      <span>测试 URL</span>
                      <input
                        type="text"
                        .value=${this.testUrl}
                        @input=${(e: InputEvent) =>
                          (this.testUrl = (e.target as HTMLInputElement).value)}
                      />
                    </div>
                  </div>
                  <div class="config-row">
                    <div class="config-item small">
                      <span>间隔 (秒)</span>
                      <input
                        type="number"
                        .value=${this.interval}
                        @input=${(e: InputEvent) =>
                          (this.interval = (e.target as HTMLInputElement).value)}
                      />
                    </div>
                    ${this.groupType === "url-test"
                      ? html`
                          <div class="config-item small">
                            <span>容差 (ms)</span>
                            <input
                              type="number"
                              .value=${this.tolerance}
                              @input=${(e: InputEvent) =>
                                (this.tolerance = (e.target as HTMLInputElement).value)}
                            />
                          </div>
                        `
                      : ""}
                  </div>
                </div>
              `
            : ""}

          <!-- 正则过滤器 -->
          <div class="form-group">
            <label>正则过滤器 (每行一个)</label>
            <textarea
              placeholder="例如:&#10;(香港|HK|🇭🇰)&#10;(日本|JP|🇯🇵)"
              .value=${this.regexFilter}
              @input=${(e: InputEvent) =>
                (this.regexFilter = (e.target as HTMLTextAreaElement).value)}
              rows="3"
            ></textarea>
            <span class="hint">用于匹配订阅中的节点名称</span>
          </div>

          <!-- 成员引用 -->
          <div class="form-group">
            <label>组成员引用</label>
            <div class="members-list">
              ${this.existingGroups.length > 0
                ? this.existingGroups
                    .filter((g) => g.name !== this.editGroup?.name)
                    .map(
                      (group) => html`
                        <label class="member-checkbox">
                          <input
                            type="checkbox"
                            .checked=${this.selectedMembers.includes(group.name)}
                            @change=${() => this.toggleMember(group.name)}
                          />
                          <span>${group.name}</span>
                        </label>
                      `
                    )
                : html`<span class="no-members">暂无可选成员</span>`}
            </div>
          </div>
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
        gap: 14px;
        min-width: 380px;
        max-width: 450px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-text-secondary);
      }

      input[type="text"],
      input[type="number"],
      textarea {
        padding: 8px 10px;
        background: var(--color-bg-input, #111);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        font-size: 0.85rem;
        font-family: inherit;
      }

      textarea {
        resize: vertical;
        min-height: 60px;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: var(--color-accent);
      }

      .hint {
        font-size: 0.7rem;
        color: var(--color-text-muted);
      }

      /* 类型选择网格 */
      .type-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }

      .type-option {
        padding: 8px 10px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.15s;
      }

      .type-option:hover {
        border-color: var(--color-accent);
      }

      .type-option.selected {
        border-color: var(--color-accent);
        background: rgba(0, 120, 212, 0.15);
      }

      .type-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .type-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--color-text-primary);
      }

      .type-desc {
        font-size: 0.65rem;
        color: var(--color-text-muted);
      }

      /* 配置区 */
      .config-section {
        background: var(--color-bg-surface);
        padding: 10px;
        border-radius: var(--radius-sm);
        border: 1px dashed var(--color-border);
      }

      .config-row {
        display: flex;
        gap: 10px;
        margin-top: 6px;
      }

      .config-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .config-item.small {
        flex: 0 0 90px;
      }

      .config-item span {
        font-size: 0.7rem;
        color: var(--color-text-muted);
      }

      /* 成员列表 */
      .members-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px;
        background: var(--color-bg-surface);
        border-radius: var(--radius-sm);
      }

      .member-checkbox {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        color: var(--color-text-secondary);
      }

      .member-checkbox:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .member-checkbox input[type="checkbox"] {
        accent-color: var(--color-accent);
        width: 12px;
        height: 12px;
      }

      .no-members {
        color: var(--color-text-muted);
        font-size: 0.75rem;
        font-style: italic;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "create-group-modal": CreateGroupModal;
  }
}
