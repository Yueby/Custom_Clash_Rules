import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { StoreController } from "@nanostores/lit";
import {
  actions,
  contentAtom,
  filesAtom,
  currentFileAtom,
  sectionsAtom,
  statusAtom,
  isLoadingAtom,
  isDirtyAtom,
  searchTermAtom,
  allProxyGroupsAtom,
  groupStatsAtom,
  allRulesetsAtom,
  rulesetStatsAtom,
} from "../stores/iniStore";
import { type ProxyGroup, type Ruleset } from "../lib/ini-parser";
import { designSystem } from "../styles/design-system";
import "./proxy-group-card";
import "./monaco-element";
import "./loading-spinner";
import "./create-group-modal";
import "./ruleset-card";
import "./create-ruleset-modal";
import "./tab-switcher";
import type { TabOption } from "./tab-switcher";

// SVG Icons
const iconCode = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.3l-48-40a8,8,0,0,1,0-12.3l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.3l48-40a8,8,0,0,0,0-12.3ZM162.36,52.41a8,8,0,0,0-10.77,4.23l-56,144a8,8,0,0,0,4.23,10.77,8,8,0,0,0,2.94.56,8,8,0,0,0,7.83-5.23l56-144A8,8,0,0,0,162.36,52.41Z"
  />
</svg>`;

const iconDashboard = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z"
  />
</svg>`;

const iconSave = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="16"
  height="16"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z"
  />
</svg>`;
const iconCaretRight = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"
  />
</svg>`;
const iconCaretDown = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
  />
</svg>`;
const iconPlus = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
  />
</svg>`;

const iconClose = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="14"
  height="14"
  fill="currentColor"
  viewBox="0 0 256 256"
>
  <path
    d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
  ></path>
</svg>`;

const iconWarning = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="32"
  height="32"
  fill="#ef4444"
  viewBox="0 0 256 256"
>
  <path
    d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"
  ></path>
</svg>`;

declare global {
  interface HTMLElementEventMap {
    "update-group": CustomEvent<{ group: ProxyGroup; originalName: string }>;
  }
  // Twemoji global
  interface Window {
    twemoji: {
      parse: (
        node: HTMLElement | string,
        options?: { folder?: string; ext?: string; className?: string }
      ) => string;
    };
  }
}

@customElement("ini-editor")
export class IniEditor extends LitElement {
  // --- Store Controllers ---
  private _content = new StoreController(this, contentAtom);
  private _files = new StoreController(this, filesAtom);
  private _currentFile = new StoreController(this, currentFileAtom);
  private _sections = new StoreController(this, sectionsAtom);
  private _status = new StoreController(this, statusAtom);
  private _isLoading = new StoreController(this, isLoadingAtom);
  private _isDirty = new StoreController(this, isDirtyAtom);
  private _searchTerm = new StoreController(this, searchTermAtom);
  private _allProxyGroups = new StoreController(this, allProxyGroupsAtom);
  private _groupStats = new StoreController(this, groupStatsAtom);

  // --- Getters for compatibility ---
  get content() {
    return this._content.value;
  }
  get files() {
    return this._files.value;
  }
  get currentFile() {
    return this._currentFile.value;
  }
  get sections() {
    return this._sections.value;
  }
  get status() {
    return this._status.value;
  }
  get searchTerm() {
    return this._searchTerm.value;
  }
  get isLoading() {
    return this._isLoading.value;
  }
  get isDirty() {
    return this._isDirty.value;
  }
  get allProxyGroups() {
    return this._allProxyGroups.value;
  }
  get groupStats() {
    return this._groupStats.value;
  }

  // --- UI State (Local) ---
  @state()
  private collapsedSections = new Set<string>();

  @state()
  private activeTab: "code" | "dashboard" = "dashboard";

  @state()
  private showCreateGroup = false;

  @state()
  private editingGroup: ProxyGroup | null = null;

  @state()
  private filterType: "all" | "select" | "url-test" = "all";

  // Ruleset State
  private _allRulesets = new StoreController(this, allRulesetsAtom);
  private _rulesetStats = new StoreController(this, rulesetStatsAtom);

  get allRulesets() {
    return this._allRulesets.value;
  }
  get rulesetStats() {
    return this._rulesetStats.value;
  }

  @state()
  private showCreateRuleset = false;

  @state()
  private editingRuleset: Ruleset | null = null;

  @state()
  private dashboardView: "groups" | "rulesets" = "groups";

  async connectedCallback() {
    super.connectedCallback();
    await actions.fetchFiles();
    document.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Save: Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      actions.saveFile();
      return;
    }

    // Undo: Ctrl+Z
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          actions.redo();
        } else {
          e.preventDefault();
          actions.undo();
        }
      } else if (e.key === "y") {
        e.preventDefault();
        actions.redo();
      }
    }
  };

  firstUpdated() {
    this.parseEmojis();
  }

  updated(_changedProperties: Map<string, unknown>) {
    // 仅在 sections (store value) 变化时重新解析 emoji
    this.parseEmojis();

    // 仅在 sections (store value) 变化时重新解析 emoji
    this.parseEmojis();
  }

  private draggedGroup: { section: string; index: number } | null = null;

  private handleGroupDragStart(e: DragEvent, section: string, index: number) {
    this.draggedGroup = { section, index };
    e.dataTransfer!.setData("application/x-clash-group", JSON.stringify({ section, index }));
    e.dataTransfer!.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = "0.4";
  }

  private handleGroupDragEnd(e: DragEvent) {
    (e.target as HTMLElement).style.opacity = "";
    this.draggedGroup = null;
  }

  private handleGroupDragOver(e: DragEvent, section: string, _index: number) {
    if (e.dataTransfer?.types.includes("application/x-clash-group")) {
      const data = this.draggedGroup;
      if (data && data.section === section) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
      }
    }
  }

  private handleGroupDrop(e: DragEvent, section: string, dropIndex: number) {
    e.preventDefault();
    const cursorData = e.dataTransfer?.getData("application/x-clash-group");
    if (cursorData) {
      try {
        const { section: srcSection, index: srcIndex } = JSON.parse(cursorData);
        if (srcSection === section && srcIndex !== dropIndex) {
          actions.reorderGroup(section, srcIndex, dropIndex);
        }
      } catch (e) {
        console.error("Drop Parse Error", e);
      }
    }
  }

  private parseEmojis() {
    if (window.twemoji && this.shadowRoot) {
      const previewContent = this.shadowRoot.querySelector(".preview-content");
      if (previewContent) {
        window.twemoji.parse(previewContent as HTMLElement, {
          folder: "svg",
          ext: ".svg",
          className: "twemoji",
        });
      }
    }
  }

  toggleSection(name: string) {
    const newSet = new Set(this.collapsedSections);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    this.collapsedSections = newSet;
    this.requestUpdate();
  }

  /* Methods moved to Store (fetchFiles, loadFile, saveFile) */

  private handleTabChange(tab: "code" | "dashboard") {
    // Store ensures sync, no manual parsing needed
    this.activeTab = tab;
  }

  /* debouncedParse moved to Store */

  private handleMonacoChange(e: CustomEvent<{ value: string }>) {
    actions.updateContent(e.detail.value);
  }

  /* private handleInput removed */

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    actions.setSearchTerm(input.value.toLowerCase());
  }

  private handleUpdateGroup(e: CustomEvent<{ group: ProxyGroup; originalName: string }>) {
    const { group, originalName } = e.detail;
    actions.updateGroup(group, originalName);
  }

  /** 处理删除组 */
  private handleDeleteGroup(e: CustomEvent<{ group: ProxyGroup }>) {
    actions.deleteGroup(e.detail.group.name);
  }

  /** 处理复制组 */
  private handleDuplicateGroup(e: CustomEvent<{ group: ProxyGroup }>) {
    actions.duplicateGroup(e.detail.group);
  }

  /** 添加到所有组 */
  private handleAddToAll(e: CustomEvent<{ group: ProxyGroup }>) {
    actions.addToAll(e.detail.group);
  }

  /** 从所有组移除 */
  private handleRemoveFromAll(e: CustomEvent<{ group: ProxyGroup }>) {
    actions.removeFromAll(e.detail.group);
  }

  /** 处理创建新组 */
  private handleCreateGroup(e: CustomEvent<{ group: ProxyGroup }>) {
    actions.createGroup(e.detail.group);
    this.showCreateGroup = false;
  }

  /** 处理编辑组 - 打开弹窗 */
  private handleEditGroup(e: CustomEvent<{ group: ProxyGroup }>) {
    this.editingGroup = e.detail.group;
  }

  /** 处理从弹窗更新组 */
  private handleUpdateGroupFromModal(e: CustomEvent<{ group: ProxyGroup; originalName: string }>) {
    const { group, originalName } = e.detail;
    actions.updateGroup(group, originalName);
    this.editingGroup = null;
  }

  /** 处理规则事件 - 创建或更新 */
  private handleRulesetConfirm(
    e: CustomEvent<{ ruleset: Ruleset; isEdit: boolean; originalSource?: string }>
  ) {
    const { ruleset, isEdit, originalSource } = e.detail;
    if (isEdit && originalSource) {
      actions.updateRuleset(originalSource, ruleset);
    } else {
      actions.createRuleset(ruleset);
    }
    this.showCreateRuleset = false;
    this.editingRuleset = null;
  }

  /** 处理编辑规则 */
  private handleEditRuleset(e: CustomEvent<{ ruleset: Ruleset }>) {
    this.editingRuleset = e.detail.ruleset;
  }

  /** 处理删除规则 */
  private handleDeleteRuleset(e: CustomEvent<{ source: string }>) {
    actions.deleteRuleset(e.detail.source);
  }

  private handleFileSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    actions.loadFile(select.value);
  }

  /* Splitter methods removed */

  render() {
    return html`
      <div class="app-container">
        <!-- Top Toolbar -->
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="file-select-wrapper">
              ${this.isDirty ? html`<span class="dirty-dot"></span>` : ""}
              <select
                class="file-select"
                @change=${this.handleFileSelect}
                .value=${this.currentFile}
              >
                ${this.files.map(
                  (f) => html`
                    <option value="${f}" ?selected=${f === this.currentFile}>${f}</option>
                  `
                )}
              </select>
            </div>

            <!-- Tab Switcher (Segmented Control) -->
            <tab-switcher
              .options=${[
                { id: "code", label: "代码", icon: iconCode },
                { id: "dashboard", label: "可视化", icon: iconDashboard },
              ] as TabOption[]}
              .value=${this.activeTab}
              @change=${(e: CustomEvent<{ value: string }>) =>
                this.handleTabChange(e.detail.value as "code" | "dashboard")}
            ></tab-switcher>
          </div>

          <div class="toolbar-right">
            <span class="status-badge ${this.isDirty ? "dirty" : ""}">${this.status}</span>
            <button
              class="save-btn"
              @click=${() => actions.saveFile()}
              ?disabled=${!this.currentFile}
            >
              ${iconSave} 保存
            </button>
          </div>
        </div>

        <!-- Main Area -->
        <div class="main-content">
          <!-- Source Code Pane -->
          <div class="pane editor" style="display: ${this.activeTab === "code" ? "flex" : "none"}">
            <monaco-element
              .value=${this.content}
              @change=${this.handleMonacoChange}
            ></monaco-element>
          </div>

          <!-- Visual Preview Pane -->
          <div
            class="pane preview"
            style="display: ${this.activeTab === "dashboard" ? "flex" : "none"}"
          >
            <div class="pane-header preview-header">
              <div class="header-left">
                <!-- View Switcher -->
                <tab-switcher
                  .options=${[
                    { id: "groups", label: `组 (${this.groupStats.total})` },
                    { id: "rulesets", label: `规则 (${this.rulesetStats.total})` },
                  ] as TabOption[]}
                  .value=${this.dashboardView}
                  @change=${(e: CustomEvent<{ value: string }>) =>
                    (this.dashboardView = e.detail.value as "groups" | "rulesets")}
                ></tab-switcher>
                ${this.dashboardView === "groups"
                  ? html`
                      <div class="stats-bar">
                        <span
                          class="stat-item total ${this.filterType === "all" ? "active" : ""}"
                          @click=${() => (this.filterType = "all")}
                          >全部: ${this.groupStats.total}</span
                        >
                        <span class="divider">·</span>
                        <span
                          class="stat-item type-select ${this.filterType === "select"
                            ? "active"
                            : ""}"
                          @click=${() => (this.filterType = "select")}
                          >手选: ${this.groupStats.byType["select"] || 0}</span
                        >
                        <span
                          class="stat-item type-auto ${this.filterType === "url-test"
                            ? "active"
                            : ""}"
                          @click=${() => (this.filterType = "url-test")}
                          >自动: ${this.groupStats.byType["url-test"] || 0}</span
                        >
                      </div>
                    `
                  : html`
                      <div class="stats-bar">
                        <span class="stat-item"
                          >远程: ${this.rulesetStats.byType["remote"] || 0}</span
                        >
                        <span class="divider">·</span>
                        <span class="stat-item"
                          >内置: ${this.rulesetStats.byType["builtin"] || 0}</span
                        >
                      </div>
                    `}
              </div>
              <div class="preview-actions">
                ${this.dashboardView === "groups"
                  ? html`
                      <button class="add-group-btn" @click=${() => (this.showCreateGroup = true)}>
                        ${iconPlus} 新建组
                      </button>
                    `
                  : html`
                      <button class="add-group-btn" @click=${() => (this.showCreateRuleset = true)}>
                        ${iconPlus} 新建规则
                      </button>
                    `}
                <div class="search-wrapper">
                  <input
                    type="text"
                    class="search-bar"
                    placeholder="搜索..."
                    .value=${this.searchTerm}
                    @input=${this.handleSearch}
                  />
                  ${this.searchTerm
                    ? html`<span class="clear-btn" @click=${() => actions.setSearchTerm("")}
                        >${iconClose}</span
                      >`
                    : ""}
                </div>
              </div>
            </div>
            <div class="preview-content">
              ${this.isLoading
                ? html`<div class="loading-overlay">
                    <loading-spinner size="32px"></loading-spinner>
                  </div>`
                : this.sections.length === 0 && this.content.trim() !== ""
                  ? html`<div class="empty-state error">
                      ${iconWarning}
                      <span>无法解析内容，请检查代码格式</span>
                    </div>`
                  : this.renderPreview()}
            </div>
          </div>
        </div>

        <create-group-modal
          .open=${this.showCreateGroup || this.editingGroup !== null}
          .existingGroups=${this.allProxyGroups}
          .editGroup=${this.editingGroup}
          @create-group=${this.handleCreateGroup}
          @update-group=${this.handleUpdateGroupFromModal}
          @close=${() => {
            this.showCreateGroup = false;
            this.editingGroup = null;
          }}
        ></create-group-modal>

        <create-ruleset-modal
          .open=${this.showCreateRuleset || this.editingRuleset !== null}
          .existingGroups=${this.allProxyGroups}
          .editRuleset=${this.editingRuleset}
          @confirm=${this.handleRulesetConfirm}
          @close=${() => {
            this.showCreateRuleset = false;
            this.editingRuleset = null;
          }}
        ></create-ruleset-modal>
      </div>
    `;
  }

  renderPreview() {
    if (this.dashboardView === "rulesets") {
      return this.renderRulesetsView();
    }
    return html`
      <div
        class="sections"
        @update-group=${this.handleUpdateGroup}
        @edit-group=${this.handleEditGroup}
        @delete-group=${this.handleDeleteGroup}
        @duplicate-group=${this.handleDuplicateGroup}
        @add-to-all=${this.handleAddToAll}
        @remove-from-all=${this.handleRemoveFromAll}
      >
        ${repeat(
          this.sections,
          (section) => section.name,
          (section) => {
            // 隐藏 Global section（只包含注释，无实际内容）
            if (section.name.toLowerCase() === "global") return "";

            // Filter groups based on search and type filter
            const filteredGroups = section.proxyGroups.filter((g) => {
              const matchesSearch =
                this.searchTerm === "" || g.name.toLowerCase().includes(this.searchTerm);
              const matchesType = this.filterType === "all" || g.type === this.filterType;
              return matchesSearch && matchesType;
            });

            if (filteredGroups.length === 0 && section.rulesets.length === 0) return "";

            const isCollapsed = this.collapsedSections.has(section.name);
            const gridId = `group-grid-${section.name}`;

            return html`
              <div class="section">
                <h4 class="section-title" @click=${() => this.toggleSection(section.name)}>
                  ${isCollapsed ? iconCaretRight : iconCaretDown} [${section.name}]
                </h4>

                ${!isCollapsed
                  ? html`
                      ${filteredGroups.length > 0
                        ? html`
                            <div class="group-grid" id="${gridId}">
                              ${repeat(
                                filteredGroups,
                                (group) => group.name,
                                (group, index) => html`
                                  <proxy-group-card
                                    .group=${group}
                                    .highlightTerm=${this.searchTerm}
                                    draggable="true"
                                    @dragstart=${(e: DragEvent) =>
                                      this.handleGroupDragStart(e, section.name, index)}
                                    @dragend=${this.handleGroupDragEnd}
                                    @dragover=${(e: DragEvent) =>
                                      this.handleGroupDragOver(e, section.name, index)}
                                    @drop=${(e: DragEvent) =>
                                      this.handleGroupDrop(e, section.name, index)}
                                  ></proxy-group-card>
                                `
                              )}
                            </div>
                          `
                        : ""}
                      ${section.rulesets.length > 0 && this.searchTerm === ""
                        ? html`
                            <div class="ruleset-container">
                              <h5 class="subsection-title">Rule Sets</h5>
                              <div class="ruleset-list">
                                ${repeat(
                                  section.rulesets,
                                  (rule) => rule.name,
                                  (rule) => html`
                                    <div class="ruleset-item">
                                      <span class="ruleset-name">${rule.name}</span>
                                      <span class="badge">${rule.type}</span>
                                    </div>
                                  `
                                )}
                              </div>
                            </div>
                          `
                        : ""}
                    `
                  : ""}
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  /** 渲染规则列表视图 */
  renderRulesetsView() {
    const filteredRulesets = this.allRulesets.filter(
      (r) =>
        this.searchTerm === "" ||
        r.name.toLowerCase().includes(this.searchTerm) ||
        r.source.toLowerCase().includes(this.searchTerm)
    );

    if (filteredRulesets.length === 0) {
      return html`
        <div class="empty-state">
          <span>暂无规则</span>
        </div>
      `;
    }

    return html`
      <div
        class="rulesets-list"
        @edit-ruleset=${this.handleEditRuleset}
        @delete-ruleset=${this.handleDeleteRuleset}
      >
        ${repeat(
          filteredRulesets,
          (r, i) => r.source + i,
          (ruleset, index) => html`
            <ruleset-card
              .ruleset=${ruleset}
              .highlightTerm=${this.searchTerm}
              .index=${index}
            ></ruleset-card>
          `
        )}
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        display: block;
        height: 100vh;
        width: 100vw;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: var(--color-bg-base);
        color: var(--color-text-primary);
      }
      /* Twemoji emoji images */
      .twemoji {
        height: 1.2em;
        width: 1.2em;
        vertical-align: -0.2em;
        margin: 0 0.1em;
      }
      .app-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      /* Top Toolbar */
      .toolbar {
        height: 48px;
        background: #1f1f1f;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        flex-shrink: 0;
      }
      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .file-select-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .dirty-dot {
        width: 8px;
        height: 8px;
        background: #4ade80;
        border-radius: 50%;
        margin-right: 8px;
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      .file-select {
        background: var(--color-bg-base);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        padding: 6px 12px;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        min-width: 200px;
        cursor: pointer;
      }
      .file-select:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      .status-badge {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        padding: 4px 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 100px;
        transition: all 0.2s;
      }
      .status-badge.dirty {
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
      }
      .save-btn {
        padding: 6px 14px;
        background: var(--color-accent);
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 100px;
        font-weight: 600;
        font-size: 0.85rem;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .save-btn:hover {
        background: var(--color-accent-hover);
      }
      .save-btn:disabled {
        background: var(--color-bg-card);
        color: var(--color-text-muted);
        cursor: not-allowed;
      }

      /* Main Content */
      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      .pane {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 200px;
      }
      .pane.editor {
        border-right: none;
      }
      .pane.preview {
        flex: 1;
      }

      /* Splitter */

      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
        position: relative;
        background: #1e1e1e;
      }
      .pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        min-width: 0;
      }
      .pane.editor {
        width: 100%;
      }
      .pane.preview {
        background: var(--color-bg-base);
        width: 100%;
      }

      .pane-header {
        padding: 0 16px;
        height: 40px;
        background: #1f1f1f;
        border-bottom: 1px solid #2b2b2b;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .pane-header h3 {
        margin: 0;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #aaa;
      }

      .search-bar {
        background: var(--color-bg-base);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
        padding: 6px 12px;
        border-radius: 100px;
        font-size: 0.85rem;
        width: 180px;
        outline: none;
      }
      .search-bar:focus {
        border-color: var(--color-accent);
      }

      .preview-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .stats-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 100px;
      }

      .stat-item {
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 100px;
        transition: all 0.15s;
        border: 1px solid transparent;
      }
      .stat-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .stat-item.active {
        border-color: currentColor;
        background: rgba(255, 255, 255, 0.05);
      }

      .stat-item.total {
        color: var(--color-text-primary);
      }
      .stat-item.type-select {
        color: #60a5fa;
      }
      .stat-item.type-auto {
        color: #f472b6;
      }

      .divider {
        color: rgba(255, 255, 255, 0.2);
      }

      .search-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .clear-btn {
        position: absolute;
        right: 8px;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
      }
      .clear-btn:hover {
        color: var(--color-text-primary);
      }

      .add-group-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--color-accent);
        color: white;
        border: none;
        padding: 8px;
        border-radius: 100px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s;
      }

      .add-group-btn:hover {
        background: var(--color-accent-hover);
      }

      .add-group-btn i {
        font-size: 12px;
      }

      /* Rulesets List */
      .rulesets-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
      }

      .loading-overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--color-accent);
      }

      .editor {
        display: flex;
        flex-direction: column;
      }
      .editor monaco-element {
        flex: 1;
        overflow: hidden;
      }

      .preview {
        background: var(--color-bg-base);
        flex: 1.5;
      }
      .preview-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }

      .section {
        margin-bottom: 24px;
      }
      .section-title {
        margin: 0 0 12px 0;
        padding: 0 4px;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--color-text-secondary);
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: none;
      }
      .section-title:hover {
        color: var(--color-text-primary);
        opacity: 1;
      }
      .section-title i {
        font-size: 0.8em;
        margin-right: 0;
        color: var(--color-text-muted);
        width: auto;
        transition: transform 0.2s;
      }

      /* Grid Layout */
      .group-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
        padding: 4px;
        margin-top: 0;
      }
      .save-btn i {
        margin-right: 4px;
      }
      .subsection-title {
        color: var(--color-text-muted);
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 1px;
      }

      /* Grid Layout */
      .group-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      /* Ruleset List (Simple) */
      .ruleset-container {
        margin-top: 24px;
        background: var(--color-bg-surface);
        padding: 16px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
      }
      .ruleset-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .ruleset-item {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        font-size: 0.9rem;
      }
      .ruleset-name {
        margin-right: 8px;
      }
    `,
  ];
}
