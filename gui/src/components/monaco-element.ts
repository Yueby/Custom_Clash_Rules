import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configure Monaco workers
self.MonacoEnvironment = {
  getWorker: function (_moduleId: string, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less")
      return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor")
      return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

@customElement("monaco-element")
export class MonacoElement extends LitElement {
  @property({ type: String }) value = "";
  @property({ type: String }) language = "ini";
  @property({ type: String }) theme = "vs-dark";

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  @query(".editor-container")
  private container!: HTMLDivElement;

  firstUpdated() {
    this.initEditor();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value") && this.editor) {
      if (this.editor.getValue() !== this.value) {
        this.editor.setValue(this.value);
      }
    }
  }

  private initEditor() {
    if (!this.container) return;

    this.editor = monaco.editor.create(this.container, {
      value: this.value,
      language: this.language,
      theme: this.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'Consolas', 'Courier New', monospace",
      renderWhitespace: "none",
      lineNumbers: "on",
      wordWrap: "on",
      padding: { top: 8, bottom: 8 },
    });

    this.editor.onDidChangeModelContent(() => {
      const value = this.editor?.getValue() || "";
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: { value },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.editor?.dispose();
  }

  render() {
    return html`
      <div class="style-host">
        <link
          rel="stylesheet"
          data-name="vs/editor/editor.main"
          href="https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/editor/editor.main.css"
        />
      </div>
      <div class="editor-container"></div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .style-host {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    .editor-container {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    /* Hide Monaco's internal input elements that render incorrectly in Shadow DOM */
    .native-edit-context,
    .ime-text-area {
      position: absolute !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "monaco-element": MonacoElement;
  }
}
