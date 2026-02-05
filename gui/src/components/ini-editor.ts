import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  SubconverterIniParser,
  type IniSection,
  type ProxyGroup,
} from "../lib/ini-parser";
import { designSystem } from "../styles/design-system";
import autoAnimate from "@formkit/auto-animate";
import { toast } from "wc-toast";
import Sortable from "sortablejs";
import "./proxy-group-card";
import "./monaco-element";

// Inline SVG Icons for Shadow DOM compatibility
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

declare global {
  interface HTMLElementEventMap {
    "update-group": CustomEvent<{ group: ProxyGroup; originalName: string }>;
  }
  // Twemoji global
  interface Window {
    twemoji: {
      parse: (
        node: HTMLElement | string,
        options?: { folder?: string; ext?: string; className?: string },
      ) => string;
    };
  }
}

@customElement("ini-editor")
export class IniEditor extends LitElement {
  @state()
  private content = "";

  @state()
  private files: string[] = [];

  @state()
  private currentFile = "";

  @state()
  private sections: IniSection[] = [];

  @state()
  private status = "";

  @state()
  private searchTerm = "";

  @state()
  private collapsedSections = new Set<string>();

  @state()
  private editorWidthPercent = 40; // Default 40% for editor

  @state()
  private isDirty = false;

  private originalContent = ""; // Content from server for comparison
  private isDragging = false;

  private readonly STORAGE_KEY_WIDTH = "ini-editor-splitter-width";
  private readonly STORAGE_KEY_FILE = "ini-editor-current-file";
  private readonly STORAGE_KEY_DRAFT_PREFIX = "ini-editor-draft-";

  async connectedCallback() {
    super.connectedCallback();
    // Load persisted settings
    const savedWidth = localStorage.getItem(this.STORAGE_KEY_WIDTH);
    if (savedWidth) this.editorWidthPercent = parseFloat(savedWidth);
    await this.fetchFiles();
    // Add keyboard shortcut
    document.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      this.saveFile();
    }
  };

  firstUpdated() {
    const sections = this.shadowRoot?.querySelector(".sections");
    if (sections) autoAnimate(sections as HTMLElement);
    this.parseEmojis();
  }

  updated() {
    this.parseEmojis();
  }

  private parseEmojis() {
    // Use Twemoji to render flag emojis as images
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

  async fetchFiles() {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        this.files = await res.json();
        // Load last selected file or default to first
        const savedFile = localStorage.getItem(this.STORAGE_KEY_FILE);
        if (savedFile && this.files.includes(savedFile)) {
          this.loadFile(savedFile);
        } else if (this.files.length > 0) {
          this.loadFile(this.files[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch files", e);
      this.status = "Failed to connect to backend";
    }
  }

  async loadFile(fileName: string) {
    this.status = `Loading ${fileName}...`;
    try {
      const res = await fetch(`/api/files/${fileName}`);
      if (res.ok) {
        const serverText = await res.text();
        this.currentFile = fileName;
        this.originalContent = serverText;

        // Check for saved draft
        const draftKey = this.STORAGE_KEY_DRAFT_PREFIX + fileName;
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft && savedDraft !== serverText) {
          // Has unsaved changes from previous session
          const restore = confirm(
            `文件 "${fileName}" 有未保存的修改。\n\n点击"确定"恢复修改，点击"取消"放弃修改。`,
          );
          if (restore) {
            this.content = savedDraft;
            this.isDirty = true;
            this.status = `Restored draft for ${fileName}`;
          } else {
            this.content = serverText;
            this.isDirty = false;
            localStorage.removeItem(draftKey);
            this.status = `Loaded ${fileName}`;
          }
        } else {
          this.content = serverText;
          this.isDirty = false;
          this.status = `Loaded ${fileName}`;
        }

        this.sections = SubconverterIniParser.parse(this.content);
        // Persist selected file
        localStorage.setItem(this.STORAGE_KEY_FILE, fileName);
      }
    } catch (e) {
      this.status = `Error loading ${fileName}`;
    }
  }

  async saveFile() {
    if (!this.currentFile) return;
    this.status = `Saving ${this.currentFile}...`;
    try {
      const res = await fetch(`/api/files/${this.currentFile}`, {
        method: "POST",
        body: this.content,
      });
      if (res.ok) {
        this.status = `Saved ${this.currentFile}`;
        this.originalContent = this.content;
        this.isDirty = false;
        // Clear draft after successful save
        localStorage.removeItem(
          this.STORAGE_KEY_DRAFT_PREFIX + this.currentFile,
        );
        toast.success(`Saved ${this.currentFile}`);
      } else {
        this.status = "Save failed";
        toast.error("Save failed");
      }
    } catch (e) {
      this.status = "Error saving file";
      toast.error("Error saving file");
    }
  }

  private handleMonacoChange(e: CustomEvent<{ value: string }>) {
    this.content = e.detail.value;
    this.isDirty = this.content !== this.originalContent;
    this.status = this.isDirty ? "Modified (Unsaved)" : "No changes";
    // Save draft to localStorage
    if (this.currentFile && this.isDirty) {
      localStorage.setItem(
        this.STORAGE_KEY_DRAFT_PREFIX + this.currentFile,
        this.content,
      );
    }
    // Parse on change - might want to debounce in production
    try {
      this.sections = SubconverterIniParser.parse(this.content);
    } catch (err) {
      // Ignore parse errors while typing
    }
  }

  /* private handleInput removed */

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
  }

  private handleUpdateGroup(
    e: CustomEvent<{ group: ProxyGroup; originalName: string }>,
  ) {
    const { group, originalName } = e.detail;

    // Find and update the group in sections
    for (const section of this.sections) {
      const idx = section.proxyGroups.findIndex((g) => g.name === originalName);
      if (idx !== -1) {
        section.proxyGroups[idx] = group;
        this.sections = [...this.sections]; // Trigger update

        // Serialize back to content
        this.content = SubconverterIniParser.stringify(this.sections);
        this.isDirty = this.content !== this.originalContent;
        this.status = "Modified (Visual Edit)";
        // Save draft
        if (this.currentFile) {
          localStorage.setItem(
            this.STORAGE_KEY_DRAFT_PREFIX + this.currentFile,
            this.content,
          );
        }
        break;
      }
    }
  }

  private handleFileSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.loadFile(select.value);
  }

  private handleSplitterMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    this.isDragging = true;
    document.addEventListener("mousemove", this.handleSplitterMouseMove);
    document.addEventListener("mouseup", this.handleSplitterMouseUp);
  };

  private handleSplitterMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const container = this.shadowRoot?.querySelector(
      ".main-content",
    ) as HTMLElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
    // Clamp between 20% and 80%
    this.editorWidthPercent = Math.max(20, Math.min(80, newPercent));
  };

  private handleSplitterMouseUp = () => {
    this.isDragging = false;
    document.removeEventListener("mousemove", this.handleSplitterMouseMove);
    document.removeEventListener("mouseup", this.handleSplitterMouseUp);
    // Persist width
    localStorage.setItem(
      this.STORAGE_KEY_WIDTH,
      String(this.editorWidthPercent),
    );
  };

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
                    <option value="${f}" ?selected=${f === this.currentFile}>
                      ${f}
                    </option>
                  `,
                )}
              </select>
            </div>
            <span class="status-badge ${this.isDirty ? "dirty" : ""}"
              >${this.status}</span
            >
          </div>
          <div class="toolbar-right">
            <button
              class="save-btn"
              @click=${this.saveFile}
              ?disabled=${!this.currentFile}
            >
              ${iconSave} Save
            </button>
          </div>
        </div>

        <!-- Main Area -->
        <div class="main-content">
          <!-- Source Code Pane -->
          <div
            class="pane editor"
            style="flex: 0 0 ${this.editorWidthPercent}%"
          >
            <monaco-element
              .value=${this.content}
              @change=${this.handleMonacoChange}
            ></monaco-element>
          </div>

          <!-- Splitter -->
          <div
            class="splitter"
            @mousedown=${this.handleSplitterMouseDown}
          ></div>

          <!-- Visual Preview Pane -->
          <div class="pane preview">
            <div class="pane-header preview-header">
              <h3>Visual Dashboard</h3>
              <input
                type="text"
                class="search-bar"
                placeholder="Filter groups..."
                @input=${this.handleSearch}
              />
            </div>
            <div class="preview-content">${this.renderPreview()}</div>
          </div>
        </div>
      </div>
    `;
  }

  renderPreview() {
    return html`
      <div class="sections" @update-group=${this.handleUpdateGroup}>
        ${this.sections.map((section) => {
          // Filter groups based on search
          const filteredGroups = section.proxyGroups.filter(
            (g) =>
              this.searchTerm === "" ||
              g.name.toLowerCase().includes(this.searchTerm),
          );

          if (filteredGroups.length === 0 && section.rulesets.length === 0)
            return "";

          const isCollapsed = this.collapsedSections.has(section.name);
          // Unique ID for sortable
          const gridId = `group-grid-${section.name}`;

          // Post-render init sortable (simple way since lit re-renders)
          // We can use a directive or just check in updated/firstUpdated.
          // Or we can use a small script tag or event?
          // Better: use updated() hook to re-init sortables if needed.
          // Limitation: Lit reconciler might conflict with Sortable DOM manipulation.
          // Recommendation: Use Keyed directive or simple re-init.

          setTimeout(() => {
            const el = this.shadowRoot?.getElementById(gridId);
            if (el && !(el as any)._sortable) {
              (el as any)._sortable = new Sortable(el, {
                animation: 150,
                ghostClass: "sortable-ghost",
                handle: ".card", // Drag by card
                onEnd: (evt) => {
                  if (
                    evt.oldIndex === undefined ||
                    evt.newIndex === undefined ||
                    evt.oldIndex === evt.newIndex
                  )
                    return;

                  // Update order in model
                  const item = section.proxyGroups.splice(evt.oldIndex, 1)[0];
                  section.proxyGroups.splice(evt.newIndex, 0, item);
                  this.sections = [...this.sections];
                  this.content = SubconverterIniParser.stringify(this.sections);
                  this.status = "Modified (Visual Sort)";
                },
              });
            }
          }, 0);

          return html`
            <div class="section">
              <h4
                class="section-title"
                @click=${() => this.toggleSection(section.name)}
              >
                ${isCollapsed ? iconCaretRight : iconCaretDown}
                [${section.name}]
              </h4>

              ${!isCollapsed
                ? html`
                    ${filteredGroups.length > 0
                      ? html`
                          ${filteredGroups.length > 0
                            ? html`
                                <div
                                  class="group-grid"
                                  id="group-grid-${section.name}"
                                >
                                  ${filteredGroups.map(
                                    (group) => html`
                                      <proxy-group-card
                                        .group=${group}
                                      ></proxy-group-card>
                                    `,
                                  )}
                                </div>
                              `
                            : ""}
                        `
                      : ""}
                    ${section.rulesets.length > 0 && this.searchTerm === ""
                      ? html`
                          <div class="ruleset-container">
                            <h5 class="subsection-title">Rule Sets</h5>
                            <div class="ruleset-list">
                              ${section.rulesets.map(
                                (rule) => html`
                                  <div class="ruleset-item">
                                    <span class="ruleset-name"
                                      >${rule.name}</span
                                    >
                                    <span class="badge">${rule.type}</span>
                                  </div>
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : ""}
                  `
                : ""}
            </div>
          `;
        })}
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
        padding: 6px 16px;
        background: var(--color-accent);
        color: white;
        border: none;
        cursor: pointer;
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: 0.85rem;
        transition: background 0.2s;
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
      .splitter {
        width: 6px;
        background: var(--color-border);
        cursor: col-resize;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      .splitter:hover {
        background: var(--color-accent);
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
        margin-bottom: 40px;
      }
      .section-title {
        color: var(--color-accent);
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 8px;
        margin-top: 0;
        font-size: 1.2rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        user-select: none;
      }
      .section-title:hover {
        opacity: 0.8;
      }
      .section-title i {
        font-size: 0.9em;
        margin-right: 8px;
        color: var(--color-text-muted);
        width: 16px;
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
