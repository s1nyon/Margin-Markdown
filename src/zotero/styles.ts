export const PDF_STYLES = `
.pdfViewer.zmm-viewer {
  --zmm-gutter-width: calc(var(--zmm-card-width, 300px) + 34px);
  padding-inline-start: calc(18px + var(--zmm-gutter-width)) !important;
  padding-inline-end: calc(18px + var(--zmm-gutter-width)) !important;
}

.zmm-overlay-root {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 90;
}

.zmm-page-overlay {
  position: absolute;
  overflow: visible;
  pointer-events: none;
}

.zmm-line-layer {
  position: absolute;
  inset: 0 auto auto 0;
  overflow: visible;
  pointer-events: none;
}

.zmm-line {
  fill: none;
  stroke-width: 1.35;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: .72;
  vector-effect: non-scaling-stroke;
  transition: opacity .14s ease, stroke-width .14s ease, filter .14s ease;
}

.zmm-line-dot {
  stroke: white;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  transition: filter .14s ease, r .14s ease;
}

.zmm-line.zmm-hovered {
  stroke-width: 2;
  opacity: .98;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, .28));
}

.zmm-line-dot.zmm-hovered {
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, .3));
}

[data-annotation-id].zmm-native-hover {
  filter: brightness(.9) saturate(1.22) drop-shadow(0 1px 1.5px rgba(0, 0, 0, .28));
  scale: 1.018;
  transform-box: fill-box;
  transform-origin: center;
  transition: filter .14s ease, scale .14s ease;
}

.zmm-card-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.zmm-margin-column {
  position: absolute;
  top: 0;
  width: var(--zmm-card-width, 300px);
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.zmm-margin-column-left {
  right: calc(100% + 18px);
}

.zmm-margin-column-right {
  left: calc(100% - 100px);
}

.zmm-margin-scrollport {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, CanvasText 32%, transparent) transparent;
}

.zmm-margin-content {
  position: relative;
  width: 100%;
  min-height: 100%;
  pointer-events: none;
}

.zmm-margin-expanded .zmm-margin-scrollport {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  pointer-events: auto;
}

.zmm-margin-toggle {
  position: absolute;
  left: 0;
  z-index: 3;
  box-sizing: border-box;
  width: 100%;
  height: 34px;
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, Canvas 93%, var(--zmm-toggle-color, #6b7c93) 7%);
  color: CanvasText;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .14);
  font: 12px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
  cursor: pointer;
  pointer-events: auto;
}

.zmm-margin-toggle:hover {
  background: color-mix(in srgb, Canvas 86%, CanvasText 14%);
}

.zmm-margin-toggle[hidden] {
  display: none;
}

.zmm-card {
  position: absolute;
  box-sizing: border-box;
  width: var(--zmm-card-width, 300px);
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, Canvas 98%, var(--zmm-color) 2%);
  color: CanvasText;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06), 0 5px 16px rgba(0, 0, 0, .08);
  font: var(--zmm-preview-font-size, 13px)/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  pointer-events: auto;
  transition: border-color .14s ease, box-shadow .14s ease, background-color .14s ease;
}

.zmm-card-right {
  padding-left: 11px;
  border-left: 3px solid var(--zmm-color);
  transform-origin: left center;
}

.zmm-card-left {
  padding-right: 11px;
  border-right: 3px solid var(--zmm-color);
  transform-origin: right center;
}

.zmm-margin-column .zmm-card {
  right: auto;
  left: 0;
}

.zmm-card.zmm-overflow-hidden,
.zmm-card.zmm-filtered {
  display: none;
}

.zmm-card:hover,
.zmm-card.zmm-hovered,
.zmm-card.zmm-active {
  border-color: var(--zmm-color);
  box-shadow: 0 2px 9px rgba(0, 0, 0, .22);
}

.zmm-card.zmm-hovered {
  z-index: 4;
  border-color: color-mix(in srgb, var(--zmm-color) 32%, CanvasText 12%);
  box-shadow: 0 2px 5px rgba(0, 0, 0, .08), 0 8px 24px rgba(0, 0, 0, .12);
}

.zmm-card-preview {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-height: 7.5em;
  margin: 0;
  padding: 3px 4px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: 1.5;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: text;
  mask-image: none;
}

.zmm-card-preview.zmm-preview-truncated:not(.zmm-preview-expanded) {
  mask-image: linear-gradient(to bottom, #000 calc(100% - 1.2em), transparent 100%);
}

.zmm-card-preview.zmm-preview-expanded:not(.zmm-measuring-collapsed) {
  max-height: none;
  overflow: visible;
  mask-image: none;
}

.zmm-card-preview.zmm-measuring-collapsed {
  max-height: 7.5em !important;
  overflow: hidden !important;
  white-space: normal !important;
  mask-image: none !important;
}

.zmm-card-preview p {
  margin: .4em 0;
}

.zmm-card-preview > :first-child {
  margin-top: 0;
}

.zmm-card-preview > :last-child {
  margin-bottom: 0;
}

.zmm-card-preview h1,
.zmm-card-preview h2,
.zmm-card-preview h3,
.zmm-card-preview h4,
.zmm-card-preview h5,
.zmm-card-preview h6 {
  margin: .42em 0 .32em;
  font-size: 1em;
  line-height: 1.25;
}

.zmm-card.zmm-compact-headings .zmm-card-preview h1 {
  font-size: 1.28em;
}

.zmm-card.zmm-compact-headings .zmm-card-preview h2 {
  font-size: 1.2em;
}

.zmm-card.zmm-compact-headings .zmm-card-preview h3 {
  font-size: 1.12em;
}

.zmm-card-preview ul,
.zmm-card-preview ol {
  margin: .35em 0;
  padding-inline-start: 1.4em;
}

.zmm-card-preview li + li {
  margin-top: .18em;
}

.zmm-card-preview blockquote {
  margin: .4em 0;
  padding-inline-start: .65em;
  border-inline-start: 2px solid color-mix(in srgb, CanvasText 25%, transparent);
  color: color-mix(in srgb, CanvasText 82%, transparent);
}

.zmm-card-preview code,
.zmm-card-preview pre {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: .92em;
}

.zmm-card-preview pre {
  max-width: 100%;
  padding: .4em .5em;
  overflow: auto;
  border-radius: 4px;
  background: color-mix(in srgb, CanvasText 7%, transparent);
}

.zmm-card-preview .katex {
  font-size: var(--zmm-math-font-size, 14px);
}

.zmm-card-preview .katex-display {
  max-width: 100%;
  margin: .4em 0;
  overflow-x: auto;
  overflow-y: hidden;
  text-align: left;
}

.zmm-card-preview a {
  color: LinkText;
  text-decoration: underline;
  text-decoration-thickness: .06em;
  text-underline-offset: .12em;
}

.zmm-preview-expand {
  padding: 2px 5px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: color-mix(in srgb, CanvasText 62%, transparent);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}

.zmm-preview-expand:hover {
  background: color-mix(in srgb, CanvasText 8%, transparent);
  color: CanvasText;
}

.zmm-preview-expand[hidden] {
  display: none;
}

.zmm-card-preview:hover {
  background: color-mix(in srgb, var(--zmm-color) 3%, transparent);
}

.zmm-card-preview.zmm-empty-preview {
  color: color-mix(in srgb, CanvasText 48%, transparent);
}

.zmm-card-editor {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 37px;
  max-height: 156px;
  margin: 0;
  padding: 3px 4px;
  resize: none;
  overflow-y: auto;
  border: 1px solid transparent;
  border-radius: 3px;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: inherit;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: text;
  -moz-user-select: text !important;
  user-select: text !important;
}

.zmm-card-editor:hover {
  background: color-mix(in srgb, CanvasText 3%, transparent);
}

.zmm-card-editor:focus {
  border-color: color-mix(in srgb, var(--zmm-color) 72%, #4a78c2);
  background: Canvas;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--zmm-color) 18%, transparent);
}

.zmm-card-editor[readonly] {
  cursor: default;
}

.zmm-card-editor::placeholder {
  color: color-mix(in srgb, CanvasText 48%, transparent);
}

/* PDF.js/Zotero selection rules can make a real DOM Range effectively
   invisible. Keep the editor's native selection visibly distinct. */
.zmm-card-editor::selection {
  background: Highlight !important;
  color: HighlightText !important;
  text-shadow: none !important;
}

.zmm-card-editor::-moz-selection {
  background: Highlight !important;
  color: HighlightText !important;
  text-shadow: none !important;
}

.zmm-card .zmm-preview-hidden,
.zmm-card .zmm-editor-hidden {
  display: none;
}

.zmm-low-zoom .zmm-card:not(.zmm-editing) {
  min-height: 0;
  padding-top: 5px;
  padding-bottom: 5px;
}

.zmm-low-zoom .zmm-card:not(.zmm-editing) .zmm-card-preview {
  display: block;
  max-height: 1.45em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  mask-image: none;
}

.zmm-low-zoom .zmm-card.zmm-preview-open .zmm-card-preview {
  max-height: none !important;
  overflow: visible !important;
  white-space: normal !important;
  mask-image: none !important;
}

.zmm-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 17px;
  margin-top: 3px;
}

.zmm-card-footer:has(.zmm-save-state:empty):has(.zmm-preview-expand[hidden]) {
  display: none;
}

.zmm-card-footer:has(.zmm-preview-expand:not([hidden])) {
  justify-content: space-between;
}

.zmm-save-state {
  margin-right: auto;
  color: color-mix(in srgb, CanvasText 55%, transparent);
  font-size: 10px;
}

.zmm-save-state[data-error="true"] {
  color: #c83c36;
}

@media (prefers-color-scheme: dark) {
  .zmm-card {
    border-color: color-mix(in srgb, CanvasText 20%, transparent);
    background: color-mix(in srgb, Canvas 95%, var(--zmm-color) 5%);
    box-shadow: 0 2px 5px rgba(0, 0, 0, .18), 0 8px 22px rgba(0, 0, 0, .22);
  }

  .zmm-card.zmm-hovered {
    box-shadow: 0 3px 8px rgba(0, 0, 0, .22), 0 10px 28px rgba(0, 0, 0, .3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .zmm-card,
  .zmm-line,
  .zmm-line-dot {
    transition: none !important;
  }
}
`;

export const TOOLBAR_STYLES = `
.zmm-toolbar-toggle svg {
  width: 20px;
  height: 20px;
  pointer-events: none;
}
.zmm-toolbar-toggle.active {
  background: color-mix(in srgb, currentColor 13%, transparent) !important;
}
`;
