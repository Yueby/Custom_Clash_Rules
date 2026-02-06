/**
 * 规则集列表视图组件
 * 从 ini-editor.ts 拆分出来的渲染逻辑
 */
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { designSystem } from "../styles/design-system";
import type { Ruleset } from "../lib/ini-parser";
import "./ruleset-card";

@customElement("rulesets-view")
export class RulesetsView extends LitElement {
  @property({ type: Array })
  rulesets: Ruleset[] = [];

  @property({ type: String })
  searchTerm = "";

  @property({ type: String })
  filterType: "all" | "remote" | "builtin" | "local" = "all";

  private get filteredRulesets(): Ruleset[] {
    return this.rulesets.filter((r) => {
      const matchesSearch =
        this.searchTerm === "" ||
        r.name.toLowerCase().includes(this.searchTerm) ||
        r.source.toLowerCase().includes(this.searchTerm);
      const matchesType = this.filterType === "all" || r.type === this.filterType;
      return matchesSearch && matchesType;
    });
  }

  render() {
    const filtered = this.filteredRulesets;

    if (filtered.length === 0) {
      return html`
        <div class="empty-state">
          <span>暂无规则</span>
        </div>
      `;
    }

    return html`
      <div class="rulesets-list">
        ${repeat(
          filtered,
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
        padding: 16px;
      }
      .rulesets-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--color-text-muted);
        font-size: 0.9rem;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "rulesets-view": RulesetsView;
  }
}
