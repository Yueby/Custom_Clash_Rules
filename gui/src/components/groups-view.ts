/**
 * 策略组网格视图组件
 * 使用 CSS Grid 布局，支持可变高度卡片
 */
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { designSystem } from "../styles/design-system";
import type { IniSection } from "../lib/ini-parser";
import "./proxy-group-card";

// Icons
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

@customElement("groups-view")
export class GroupsView extends LitElement {
  @property({ type: Array })
  sections: IniSection[] = [];

  @property({ type: String })
  searchTerm = "";

  @property({ type: String })
  filterType: "all" | "select" | "url-test" = "all";

  @property({ type: Object })
  collapsedSections: Set<string> = new Set();

  // --- Drag & Drop State ---
  private draggedGroup: { section: string; index: number } | null = null;

  private toggleSection(name: string) {
    this.dispatchEvent(
      new CustomEvent("toggle-section", {
        detail: { name },
        bubbles: true,
        composed: true,
      })
    );
  }

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

  private handleGroupDragOver(e: DragEvent, section: string) {
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
          this.dispatchEvent(
            new CustomEvent("reorder-group", {
              detail: { sectionName: section, oldIndex: srcIndex, newIndex: dropIndex },
              bubbles: true,
              composed: true,
            })
          );
        }
      } catch (err) {
        console.error("Drop Parse Error", err);
      }
    }
  }

  render() {
    return html`
      <div class="sections">
        ${repeat(
          this.sections,
          (section) => section.name,
          (section) => {
            // 隐藏 Global section
            if (section.name.toLowerCase() === "global") return "";

            // Filter groups
            const filteredGroups = section.proxyGroups.filter((g) => {
              const matchesSearch =
                this.searchTerm === "" || g.name.toLowerCase().includes(this.searchTerm);
              const matchesType = this.filterType === "all" || g.type === this.filterType;
              return matchesSearch && matchesType;
            });

            if (filteredGroups.length === 0) return "";

            const isCollapsed = this.collapsedSections.has(section.name);

            return html`
              <div class="section">
                <h4 class="section-title" @click=${() => this.toggleSection(section.name)}>
                  ${isCollapsed ? iconCaretRight : iconCaretDown} [${section.name}]
                  <span class="count">${filteredGroups.length}</span>
                </h4>

                ${!isCollapsed
                  ? html`
                      <div class="group-grid">
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
                                this.handleGroupDragOver(e, section.name)}
                              @drop=${(e: DragEvent) =>
                                this.handleGroupDrop(e, section.name, index)}
                            ></proxy-group-card>
                          `
                        )}
                      </div>
                    `
                  : ""}
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  static styles = [
    designSystem,
    css`
      :host {
        display: block;
      }
      .sections {
        padding: 16px;
      }
      .section {
        margin-bottom: 24px;
      }
      .section-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-muted);
        margin: 0 0 12px 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
      }
      .section-title:hover {
        color: var(--color-text-primary);
      }
      .section-title .count {
        background: var(--color-primary);
        color: white;
        padding: 0 6px;
        border-radius: 10px;
        font-size: 0.7rem;
        margin-left: auto;
      }
      .group-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "groups-view": GroupsView;
  }
}
