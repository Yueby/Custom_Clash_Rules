import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * 加载状态指示器
 */
@customElement("loading-spinner")
export class LoadingSpinner extends LitElement {
  @property({ type: String }) size = "24px";

  render() {
    return html` <div class="spinner" style="--size: ${this.size}"></div> `;
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: var(--size, 24px);
      height: var(--size, 24px);
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-right-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "loading-spinner": LoadingSpinner;
  }
}
