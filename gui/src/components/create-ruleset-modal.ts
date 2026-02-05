import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { designSystem } from "../styles/design-system";
import type { Ruleset, ProxyGroup } from "../lib/ini-parser";
import "./modal-dialog";

/** 常用 GEOSITE 值 */
const GEOSITE_PRESETS = [
  "cn",
  "private",
  "google",
  "google-cn",
  "gfw",
  "apple",
  "microsoft",
  "github",
  "openai",
  "tiktok",
  "youtube",
  "netflix",
  "disney",
  "telegram",
  "twitter",
  "facebook",
  "category-ai-!cn",
  "category-games",
  "category-social-media-!cn",
];

/** 常用 GEOIP 值 */
const GEOIP_PRESETS = ["cn", "private", "telegram", "google", "twitter", "facebook", "netflix"];

type RulesetType = "remote" | "geosite" | "geoip" | "final" | "local";

/**
 * 新增/编辑规则弹窗
 */
@customElement("create-ruleset-modal")
export class CreateRulesetModal extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) existingGroups: ProxyGroup[] = [];
  /** 编辑模式时传入现有规则 */
  @property({ type: Object }) editRuleset: Ruleset | null = null;

  @state() private targetGroup = "";
  @state() private ruleType: RulesetType = "geosite";
  @state() private ruleSource = "";
  @state() private interval = "";
  @state() private noResolve = false;

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("editRuleset") && this.editRuleset) {
      this.loadRulesetData(this.editRuleset);
    }
    if (changedProperties.has("open") && this.open && !this.editRuleset) {
      this.resetForm();
    }
  }

  private loadRulesetData(ruleset: Ruleset) {
    this.targetGroup = ruleset.name;
    this.interval = ruleset.interval || "";

    const source = ruleset.source;
    if (source.startsWith("[]GEOSITE,")) {
      this.ruleType = "geosite";
      const rest = source.replace("[]GEOSITE,", "");
      this.ruleSource = rest.replace(",no-resolve", "");
      this.noResolve = rest.includes("no-resolve");
    } else if (source.startsWith("[]GEOIP,")) {
      this.ruleType = "geoip";
      const rest = source.replace("[]GEOIP,", "");
      this.ruleSource = rest.replace(",no-resolve", "");
      this.noResolve = rest.includes("no-resolve");
    } else if (source.includes("[]FINAL")) {
      this.ruleType = "final";
      this.ruleSource = "";
    } else if (source.startsWith("http")) {
      this.ruleType = "remote";
      this.ruleSource = source;
    } else {
      this.ruleType = "local";
      this.ruleSource = source;
    }
  }

  private resetForm() {
    this.targetGroup = this.existingGroups[0]?.name || "";
    this.ruleType = "geosite";
    this.ruleSource = "";
    this.interval = "";
    this.noResolve = false;
  }

  private handleClose() {
    this.resetForm();
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }

  private handleConfirm() {
    if (!this.targetGroup.trim()) return;
    if (this.ruleType !== "final" && !this.ruleSource.trim()) return;

    // 构建 source
    let source = "";
    switch (this.ruleType) {
      case "geosite":
        source = `[]GEOSITE,${this.ruleSource}${this.noResolve ? ",no-resolve" : ""}`;
        break;
      case "geoip":
        source = `[]GEOIP,${this.ruleSource}${this.noResolve ? ",no-resolve" : ""}`;
        break;
      case "final":
        source = "[]FINAL";
        break;
      case "remote":
      case "local":
        source = this.ruleSource;
        break;
    }

    const ruleset: Ruleset = {
      name: this.targetGroup,
      source,
      interval: this.interval || undefined,
      type:
        this.ruleType === "geosite" || this.ruleType === "geoip" || this.ruleType === "final"
          ? "builtin"
          : this.ruleType === "remote"
            ? "remote"
            : "local",
    };

    this.dispatchEvent(
      new CustomEvent("confirm", {
        detail: {
          ruleset,
          isEdit: !!this.editRuleset,
          originalSource: this.editRuleset?.source,
        },
        bubbles: true,
        composed: true,
      })
    );

    this.handleClose();
  }

  private renderPresets() {
    const presets = this.ruleType === "geosite" ? GEOSITE_PRESETS : GEOIP_PRESETS;
    if (this.ruleType !== "geosite" && this.ruleType !== "geoip") return "";

    return html`
      <div class="presets">
        ${presets.map(
          (p) => html`
            <button
              type="button"
              class="preset-btn ${this.ruleSource === p ? "active" : ""}"
              @click=${() => (this.ruleSource = p)}
            >
              ${p}
            </button>
          `
        )}
      </div>
    `;
  }

  render() {
    const isEdit = !!this.editRuleset;
    const title = isEdit ? "编辑规则" : "新建规则";

    return html`
      <modal-dialog .open=${this.open} .title=${title} @close=${this.handleClose}>
        <div class="form">
          <!-- 目标组 -->
          <div class="form-group">
            <label>目标组</label>
            <select
              .value=${this.targetGroup}
              @change=${(e: Event) => (this.targetGroup = (e.target as HTMLSelectElement).value)}
            >
              ${this.existingGroups.map(
                (g) =>
                  html`<option value="${g.name}" ?selected=${g.name === this.targetGroup}>
                    ${g.name}
                  </option>`
              )}
            </select>
          </div>

          <!-- 规则类型 -->
          <div class="form-group">
            <label>规则类型</label>
            <div class="type-selector">
              ${(["geosite", "geoip", "remote", "final", "local"] as RulesetType[]).map(
                (t) => html`
                  <button
                    type="button"
                    class="type-btn ${this.ruleType === t ? "active" : ""}"
                    @click=${() => (this.ruleType = t)}
                  >
                    ${t === "geosite"
                      ? "GEOSITE"
                      : t === "geoip"
                        ? "GEOIP"
                        : t === "remote"
                          ? "远程URL"
                          : t === "final"
                            ? "FINAL"
                            : "本地"}
                  </button>
                `
              )}
            </div>
          </div>

          <!-- 规则源 -->
          ${this.ruleType !== "final"
            ? html`
                <div class="form-group">
                  <label
                    >${this.ruleType === "remote"
                      ? "规则 URL"
                      : this.ruleType === "local"
                        ? "本地路径"
                        : "规则值"}</label
                  >
                  <input
                    type="text"
                    .value=${this.ruleSource}
                    @input=${(e: Event) => (this.ruleSource = (e.target as HTMLInputElement).value)}
                    placeholder=${this.ruleType === "remote"
                      ? "https://example.com/rules.list"
                      : this.ruleType === "geosite"
                        ? "cn, google, gfw..."
                        : this.ruleType === "geoip"
                          ? "cn, telegram, private..."
                          : "rules/custom.list"}
                  />
                  ${this.renderPresets()}
                </div>
              `
            : ""}

          <!-- no-resolve 选项 -->
          ${this.ruleType === "geoip"
            ? html`
                <div class="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      ?checked=${this.noResolve}
                      @change=${(e: Event) =>
                        (this.noResolve = (e.target as HTMLInputElement).checked)}
                    />
                    no-resolve (不解析域名直接匹配 IP)
                  </label>
                </div>
              `
            : ""}

          <!-- 更新间隔 (仅远程) -->
          ${this.ruleType === "remote"
            ? html`
                <div class="form-group">
                  <label>更新间隔 (秒)</label>
                  <input
                    type="number"
                    .value=${this.interval}
                    @input=${(e: Event) => (this.interval = (e.target as HTMLInputElement).value)}
                    placeholder="28800"
                  />
                </div>
              `
            : ""}
        </div>

        <div slot="footer">
          <button class="btn secondary" @click=${this.handleClose}>取消</button>
          <button
            class="btn primary"
            @click=${this.handleConfirm}
            ?disabled=${!this.targetGroup || (this.ruleType !== "final" && !this.ruleSource)}
          >
            ${isEdit ? "保存" : "创建"}
          </button>
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
      .form-group label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
      .form-group input,
      .form-group select {
        padding: 10px 12px;
        background: var(--color-bg-base);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        color: var(--color-text-primary);
        font-size: 0.9rem;
      }
      .form-group input:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      .type-selector {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .type-btn {
        padding: 6px 12px;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: 100px;
        color: var(--color-text-muted);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s;
      }
      .type-btn:hover {
        color: var(--color-text-primary);
        border-color: #555;
      }
      .type-btn.active {
        background: var(--color-accent);
        color: white;
        border-color: var(--color-accent);
      }
      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .preset-btn {
        padding: 4px 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid transparent;
        border-radius: 100px;
        color: var(--color-text-muted);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s;
      }
      .preset-btn:hover {
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.1);
      }
      .preset-btn.active {
        background: rgba(96, 165, 250, 0.2);
        color: #60a5fa;
        border-color: rgba(96, 165, 250, 0.3);
      }
      .checkbox-group {
        flex-direction: row;
        align-items: center;
      }
      .checkbox-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .checkbox-group input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      .btn {
        padding: 8px 20px;
        border: none;
        border-radius: 100px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn.secondary {
        background: var(--color-bg-surface);
        color: var(--color-text-secondary);
      }
      .btn.secondary:hover {
        background: var(--color-bg-elevated);
      }
      .btn.primary {
        background: var(--color-accent);
        color: white;
      }
      .btn.primary:hover {
        filter: brightness(1.1);
      }
      .btn.primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "create-ruleset-modal": CreateRulesetModal;
  }
}
