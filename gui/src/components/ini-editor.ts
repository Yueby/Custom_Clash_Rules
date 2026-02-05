import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SubconverterIniParser, type IniSection } from "../lib/ini-parser";
import { designSystem } from "../styles/design-system";
import "./proxy-group-card";

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

  async connectedCallback() {
    super.connectedCallback();
    await this.fetchFiles();
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
        if (this.files.length > 0) {
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
        const text = await res.text();
        this.currentFile = fileName;
        this.content = text;
        this.sections = SubconverterIniParser.parse(text);
        this.status = `Loaded ${fileName}`;
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
      } else {
        this.status = "Save failed";
      }
    } catch (e) {
      this.status = "Error saving file";
    }
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.content = textarea.value;
    this.sections = SubconverterIniParser.parse(this.content);
    this.status = "Modified (Unsaved)";
  }

  private handleSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
  }

  render() {
    return html`
      <div class="app-container">
        <!-- Sidebar -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h3>Configuration Files</h3>
          </div>
          <div class="file-list">
            ${this.files.map(
              (f) => html`
                <div
                  class="file-item ${f === this.currentFile ? "active" : ""}"
                  @click=${() => this.loadFile(f)}
                >
                  <span class="icon">📄</span> ${f}
                </div>
              `,
            )}
          </div>
          <div class="sidebar-footer">
            <div class="status-text">${this.status}</div>
            <button
              class="save-btn"
              @click=${this.saveFile}
              ?disabled=${!this.currentFile}
            >
              💾 Save Changes
            </button>
          </div>
        </div>

        <!-- Main Area -->
        <div class="main-content">
          <!-- Source Code Pane -->
          <div class="pane editor">
            <div class="pane-header">
              <h3>Source Editor</h3>
            </div>
            <textarea
              @input=${this.handleInput}
              .value=${this.content}
            ></textarea>
          </div>

          <!-- Visual Preview Pane -->
          <div class="pane preview">
            <div class="pane-header preview-header">
              <h3>Visual Dashboard</h3>
              <input
                type="text"
                class="search-bar"
                placeholder="🔍 Filter groups..."
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
      <div class="sections">
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

          return html`
            <div class="section">
              <h4
                class="section-title"
                @click=${() => this.toggleSection(section.name)}
              >
                <span class="chevron">${isCollapsed ? "▶" : "▼"}</span>
                [${section.name}]
              </h4>

              ${!isCollapsed
                ? html`
                    ${filteredGroups.length > 0
                      ? html`
                          <div class="group-grid">
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
      .app-container {
        display: flex;
        height: 100%;
        overflow: hidden;
      }

      /* Sidebar */
      .sidebar {
        width: 260px;
        background: var(--color-bg-surface);
        border-right: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }
      .sidebar-header {
        padding: 12px 16px;
        background: #1f1f1f;
        border-bottom: 1px solid #2b2b2b;
      }
      .sidebar-header h3 {
        margin: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #888;
      }

      .file-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      }
      .file-item {
        padding: 6px 16px;
        cursor: pointer;
        margin-bottom: 1px;
        font-size: 0.85rem;
        color: #ccc;
        border-left: 3px solid transparent;
        border-radius: 0;
        display: flex;
        align-items: center;
      }
      .file-item:hover {
        background: #2a2d2e;
        color: #fff;
      }
      .file-item.active {
        background: #37373d;
        color: #fff;
        border-left-color: var(--color-accent);
      }
      .icon {
        margin-right: 8px;
        opacity: 0.7;
      }

      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid var(--color-border);
        background: rgba(0, 0, 0, 0.1);
      }
      .status-text {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-bottom: 10px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .save-btn {
        width: 100%;
        padding: 10px;
        background: var(--color-accent);
        color: white;
        border: none;
        cursor: pointer;
        border-radius: var(--radius-sm);
        font-weight: 600;
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
        flex: 1;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--color-border);
        overflow: hidden;
        min-width: 300px;
      }
      .pane:last-child {
        border-right: none;
      }

      .pane-header {
        padding: 0 16px;
        height: 40px;
        background: #1f1f1f;
        border-bottom: 1px solid #2b2b2b;
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      .editor textarea {
        flex: 1;
        background: #1e1e1e;
        color: #d4d4d4;
        border: none;
        padding: 16px;
        font-family: "Consolas", "Courier New", monospace;
        font-size: 14px;
        resize: none;
        outline: none;
        line-height: 1.5;
      }

      .preview {
        background: var(--color-bg-base);
        flex: 1.5; /* Preview takes more space */
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
      .chevron {
        font-size: 0.8em;
        margin-right: 8px;
        color: var(--color-text-muted);
        display: inline-block;
        width: 20px;
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
