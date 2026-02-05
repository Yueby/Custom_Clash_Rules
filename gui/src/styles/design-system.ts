import { css } from "lit";

export const designSystem = css`
  :host {
    --color-bg-base: #1a1a1a;
    --color-bg-surface: #252526;
    --color-bg-surface-hover: #2a2d2e;
    --color-bg-card: #2d2d2d;

    --color-text-primary: #e0e0e0;
    --color-text-secondary: #aaaaaa;
    --color-text-muted: #777777;

    --color-border: #3e3e42;
    --color-accent: #0078d4;
    --color-accent-hover: #106ebe;

    --color-type-select: #3794ff;
    --color-type-select-bg: rgba(55, 148, 255, 0.15);

    --color-type-auto: #4cc94c;
    --color-type-auto-bg: rgba(76, 201, 76, 0.15);

    /* 新增语义化变量 */
    --color-bg-toolbar: #1f1f1f;
    --color-bg-input: #111;
    --color-bg-button: #333;
    --color-danger: #ff6b6b;
    --color-warning: #f59e0b;
    --color-success: #4ade80;

    --radius-sm: 4px;
    --radius-md: 6px;

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;

    --shadow-card: 0 2px 5px rgba(0, 0, 0, 0.2);

    /* Font stack with emoji support */
    --font-family:
      "Segoe UI", system-ui, -apple-system, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Noto Color Emoji";
    font-family: var(--font-family);
  }

  /* Universal Scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: var(--color-bg-base);
  }
  ::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
    border: 2px solid var(--color-bg-base);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #505050;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
`;
