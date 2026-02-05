import { LitElement, css, html, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { designSystem } from "../styles/design-system";
import type { ProxyGroup } from "../lib/ini-parser";
import "./add-member-modal";
import "./dropdown-menu";
import type { MenuItem } from "./dropdown-menu";

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
    if (cp1 && cp2 && cp1 >= 0x1f1e6 && cp1 <= 0x1f1ff && cp2 >= 0x1f1e6 && cp2 <= 0x1f1ff) {
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

const iconClose = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="12"
  height="12"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
  />
</svg>`;

const iconPencil = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152.05a16,16,0,0,0-4.69,11.31v44.69a16,16,0,0,0,16,16H92.69a16,16,0,0,0,11.31-4.69L227.31,96A16,16,0,0,0,227.31,73.37ZM96,208H48V160l96-96,48,48Z"
  ></path>
</svg>`;

const iconCopy = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32Zm-8,128H176V88a8,8,0,0,0-8-8H96V48H208Z"
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

@customElement("proxy-group-card")
export class ProxyGroupCard extends LitElement {
  @property({ type: Object })
  group!: ProxyGroup;

  /** 搜索高亮词 */
  @property({ type: String })
  highlightTerm = "";

  @state()
  private showAddModal = false;

  /** 操作菜单项 */
  private readonly menuItems: MenuItem[] = [
    { id: "edit", label: "编辑", icon: iconPencil },
    { id: "duplicate", label: "复制", icon: iconCopy },
    { id: "divider", label: "", divider: true },
    { id: "add-to-all", label: "添加到所有组" },
    { id: "remove-from-all", label: "从所有组移除" },
    { id: "divider2", label: "", divider: true },
    { id: "delete", label: "删除", icon: iconTrash, danger: true },
  ];

  private handleDragStart(e: DragEvent, index: number) {
    // Set data type to ensure we only accept drops from other members
    e.dataTransfer!.setData("application/x-proxy-member", index.toString());
    e.dataTransfer!.effectAllowed = "move";

    // Add opacity to drag source
    (e.target as HTMLElement).style.opacity = "0.4";
  }

  private handleDragEnd(e: DragEvent) {
    // Reset style
    (e.target as HTMLElement).style.opacity = "";
    this.requestUpdate();
  }

  private handleDragOver(e: DragEvent, _index: number) {
    if (e.dataTransfer?.types.includes("application/x-proxy-member")) {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "move";
    }
  }

  private handleDrop(e: DragEvent, dropIndex: number) {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer?.getData("application/x-proxy-member");

    if (sourceIndexStr) {
      const oldIndex = parseInt(sourceIndexStr, 10);
      if (oldIndex !== dropIndex) {
        // Logic to reorder
        const staticProxies = this.group.proxies.filter((p) => p.startsWith("[]"));
        const otherProxies = this.group.proxies.filter((p) => !p.startsWith("[]"));

        if (oldIndex >= 0 && oldIndex < staticProxies.length) {
          const item = staticProxies.splice(oldIndex, 1)[0];
          staticProxies.splice(dropIndex, 0, item);
          const newProxies = [...otherProxies, ...staticProxies];
          this.dispatchUpdate({ ...this.group, proxies: newProxies });
        }
      }
    }
  }

  private dispatchUpdate(newGroup: ProxyGroup) {
    this.dispatchEvent(
      new CustomEvent("update-group", {
        detail: { group: newGroup, originalName: this.group.name },
        bubbles: true,
        composed: true,
      })
    );
  }

  private removeMember(member: string) {
    const newProxies = this.group.proxies.filter((p) => p !== member);
    this.dispatchUpdate({ ...this.group, proxies: newProxies });
  }

  private addMember() {
    this.showAddModal = true;
  }

  private handleAddMember(e: CustomEvent<{ name: string; isGroup: boolean }>) {
    const prefix = e.detail.isGroup ? "[]" : "";
    const newProxies = [...this.group.proxies, prefix + e.detail.name];
    this.dispatchUpdate({ ...this.group, proxies: newProxies });
    this.showAddModal = false;
  }

  private closeAddModal() {
    this.showAddModal = false;
  }

  /** 高亮文本中的匹配部分 */
  private highlightText(text: string): TemplateResult {
    if (!this.highlightTerm) {
      return renderWithTwemoji(text);
    }
    const lowerText = text.toLowerCase();
    const lowerTerm = this.highlightTerm.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    if (index === -1) {
      return renderWithTwemoji(text);
    }
    const before = text.slice(0, index);
    const match = text.slice(index, index + this.highlightTerm.length);
    const after = text.slice(index + this.highlightTerm.length);
    return html`${renderWithTwemoji(before)}<mark class="highlight">${match}</mark
      >${renderWithTwemoji(after)}`;
  }

  /** 处理菜单选择 */
  private handleMenuSelect(e: CustomEvent<{ id: string }>) {
    const { id } = e.detail;
    switch (id) {
      case "edit":
        this.dispatchEvent(
          new CustomEvent("edit-group", {
            detail: { group: this.group },
            bubbles: true,
            composed: true,
          })
        );
        break;
      case "delete":
        this.dispatchEvent(
          new CustomEvent("delete-group", {
            detail: { group: this.group },
            bubbles: true,
            composed: true,
          })
        );
        break;
      case "duplicate":
        this.dispatchEvent(
          new CustomEvent("duplicate-group", {
            detail: { group: this.group },
            bubbles: true,
            composed: true,
          })
        );
        break;
      case "add-to-all":
        this.dispatchEvent(
          new CustomEvent("add-to-all", {
            detail: { group: this.group },
            bubbles: true,
            composed: true,
          })
        );
        break;
      case "remove-from-all":
        this.dispatchEvent(
          new CustomEvent("remove-from-all", {
            detail: { group: this.group },
            bubbles: true,
            composed: true,
          })
        );
        break;
    }
  }

  /** 获取静态代理列表（以 [] 开头的组引用） */
  private get staticProxies(): string[] {
    return this.group.proxies.filter((p) => p.startsWith("[]")).map((p) => p.replace("[]", ""));
  }

  /** 获取正则代理列表 */
  private get regexProxies(): string[] {
    return this.group.proxies.filter(
      (p) => !p.startsWith("[]") && (p.includes(".") || p.includes("^"))
    );
  }

  render() {
    if (!this.group) return html``;

    const isAuto = this.group.type === "url-test";
    const typeClass = isAuto ? "type-auto" : "type-select";

    // 使用 getter 获取过滤后的代理列表
    const regexProxies = this.regexProxies;
    const staticProxies = this.staticProxies;

    return html`
      <div class="card ${typeClass}">
        <div class="header">
          <div class="title-row">
            <span class="name" title="${this.group.name}"
              >${this.highlightText(this.group.name)}</span
            >
            <span class="badge">${this.group.type}</span>
            <dropdown-menu
              .items=${this.menuItems}
              @menu-select=${this.handleMenuSelect}
            ></dropdown-menu>
          </div>
          ${isAuto && this.group.testUrl
            ? html`
                <div class="meta-row">
                  <div class="meta-item" title="Test URL">
                    <i class="ph ph-globe"></i>
                    <span>${this.group.testUrl}</span>
                  </div>
                  <div class="meta-item" title="Interval">
                    <i class="ph ph-timer"></i>
                    <span>${this.group.interval}s</span>
                  </div>
                </div>
              `
            : ""}
        </div>

        <div class="content">
          ${regexProxies.length > 0
            ? html`
                <div class="section-label">
                  正则 <span class="count">${regexProxies.length}</span>
                </div>
                <div class="regex-box">
                  ${regexProxies.map(
                    (r: string) => html`
                      <div class="regex-item">
                        <code>${r}</code>
                        <span class="remove-btn" @click=${() => this.removeMember(r)}
                          >${iconClose}</span
                        >
                      </div>
                    `
                  )}
                </div>
              `
            : ""}

          <div class="section-header">
            <div class="section-label">成员 <span class="count">${staticProxies.length}</span></div>
            <span class="add-btn" @click=${this.addMember}>+</span>
          </div>
          <div class="members-grid">
            ${staticProxies.map(
              (p: string, index: number) =>
                html` <span
                  class="member-chip"
                  draggable="true"
                  @dragstart=${(e: DragEvent) => this.handleDragStart(e, index)}
                  @dragend=${this.handleDragEnd}
                  @dragover=${(e: DragEvent) => this.handleDragOver(e, index)}
                  @drop=${(e: DragEvent) => this.handleDrop(e, index)}
                >
                  ${this.highlightText(p)}
                  <span class="remove-btn" @click=${() => this.removeMember("[]" + p)}
                    >${iconClose}</span
                  >
                </span>`
            )}
          </div>
        </div>

        <add-member-modal
          .open=${this.showAddModal}
          @add-member=${this.handleAddMember}
          @close=${this.closeAddModal}
        ></add-member-modal>
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
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
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
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid var(--color-border);
      }

      .title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .name {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        min-width: 0;
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
        padding: 10px 12px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
      }

      .section-label {
        font-size: 0.65rem;
        font-weight: 600;
        color: var(--color-text-muted);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section-label .count {
        font-weight: 400;
        color: var(--color-text-secondary);
        background: rgba(255, 255, 255, 0.08);
        padding: 1px 5px;
        border-radius: 8px;
        font-size: 0.6rem;
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

      .add-btn:hover {
        background: var(--color-accent);
      }

      .regex-box {
        background: rgba(0, 0, 0, 0.25);
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        font-family: "Consolas", "Monaco", monospace;
        font-size: 0.72rem;
        color: #ce9178;
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 60px;
        overflow-y: auto;
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
        background: rgba(255, 255, 255, 0.07);
        padding: 3px 10px;
        border-radius: 100px;
        font-size: 0.72rem;
        color: var(--color-text-secondary);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.12s;
      }
      .member-chip:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.15);
        color: var(--color-text-primary);
      }
      .member-chip .twemoji {
        height: 1em !important;
        width: 1em !important;
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
