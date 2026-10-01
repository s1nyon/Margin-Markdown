import {
  annotationAnchor,
  compactNoteAnchor,
  shouldDisplayAnnotation,
} from "../core/annotation-model";
import {
  layoutCollapsibleMargin,
  type PositionedLayoutItem,
} from "../core/margin-layout";
import {
  MARGIN_ANNOTATION_TYPES,
  type MarginAnnotation,
  type MarginAnnotationType,
  type PageAnchor,
} from "../core/types";
import {
  renderMarkdown,
  type RenderingPreferences,
} from "../rendering/renderer";
import { KATEX_CSS } from "../rendering/katex-styles.generated";
import { AnnotationStore } from "./annotation-store";
import {
  type PdfPageHandle,
  ZoteroReaderAdapter,
} from "./reader-adapter";
import { PDF_STYLES } from "./styles";

const SVG_NS = "http://www.w3.org/2000/svg";
const STYLE_ID = "zmm-pdf-styles";
const KATEX_STYLE_ID = "zmm-katex-styles";
const DEFAULT_CARD_WIDTH = 300;
const CARD_GAP_FROM_PAGE = 18;
const RIGHT_CARD_INSET = 100;
const EXTRA_VIEWER_GUTTER = 16;
const COLLAPSE_SCALE_THRESHOLD = 0.8;
const LAYOUT_PADDING = 8;
const CARD_GAP = 8;
const SUMMARY_HEIGHT = 34;
const EXPANDED_TOP_PADDING = 48;
const FILTER_UI_SETTLE_MS = 80;
const HOVER_EXPAND_DELAY_MS = 180;
const HOVER_COLLAPSE_DELAY_MS = 300;
const DEFAULT_RENDERING_PREFERENCES: RenderingPreferences = {
  markdown: true,
  latex: true,
  cardWidth: DEFAULT_CARD_WIDTH,
  previewFontSize: 100,
  mathScale: 100,
  compactHeadings: true,
};

type MarginSide = PageAnchor["side"];

interface CardRuntime {
  annotation: MarginAnnotation;
  anchor: PageAnchor;
  card: HTMLElement;
  preview: HTMLDivElement;
  editor: HTMLTextAreaElement;
  state: HTMLElement;
  expandButton: HTMLButtonElement;
  previewExpanded: boolean;
  pointerInside: boolean;
  hoverExpanded: boolean;
  pinnedExpanded: boolean;
  focusWithin: boolean;
  selectionWithin: boolean;
  pointerSelecting: boolean;
  truncated: boolean;
  previewMeasurementDirty: boolean;
  originalValue: string;
  currentValue: string;
  dirty: boolean;
  saving: boolean;
  measuredHeight?: number;
  heightMode?: string;
  timer?: ReturnType<typeof setTimeout>;
  statusTimer?: ReturnType<typeof setTimeout>;
  expandTimer?: ReturnType<typeof setTimeout>;
  collapseTimer?: ReturnType<typeof setTimeout>;
}

interface MountedPage {
  handle: PdfPageHandle;
  overlay: HTMLElement;
  lines: SVGSVGElement;
  cards: HTMLElement;
  columns: Record<MarginSide, MarginColumnRuntime>;
  runtimes: CardRuntime[];
  positions: Map<string, PositionedLayoutItem>;
}

interface MarginColumnRuntime {
  side: MarginSide;
  root: HTMLElement;
  scrollport: HTMLElement;
  content: HTMLElement;
  toggle: HTMLButtonElement;
}

export class ReaderSession {
  private readonly adapter: ZoteroReaderAdapter;
  private readonly forcedKeys = new Set<string>();
  private readonly mountedPages = new Map<number, MountedPage>();
  private readonly expandedMargins = new Set<string>();
  private readonly pinnedPreviewKeys = new Set<string>();
  private visibleTypes = new Set<MarginAnnotationType>(MARGIN_ANNOTATION_TYPES);
  private annotations: MarginAnnotation[] = [];
  private nativeVisibleIDs?: ReadonlySet<string>;
  private activeKey?: string;
  private hoveredKey?: string;
  private compactNoteIcons = false;
  private renderingPreferences: RenderingPreferences = {
    ...DEFAULT_RENDERING_PREFERENCES,
  };
  private enabled = true;
  private started = false;
  private adapterReady = false;
  private destroyed = false;
  private initializePromise?: Promise<void>;
  private pendingRefresh = false;
  private cancelRenderFrame?: () => void;
  private cancelVisibilityFrame?: () => void;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  private pendingVisibilityPages: MountedPage[] = [];
  private renderFramesRemaining = 0;
  private centerFramesRemaining = 0;
  private overlayRoot?: HTMLElement;
  private interactionDocument?: Document;
  private readonly onDocumentPointerUp = () => this.finishPointerSelection();
  private readonly onDocumentSelectionChange = () => this.updateSelectionStates();
  private readonly onFontsLoaded = () => {
    for (const runtime of this.cardRuntimes()) runtime.previewMeasurementDirty = true;
    this.remeasurePreviews();
  };

  constructor(
    readonly reader: any,
    private readonly store: AnnotationStore,
    private readonly onStateChange: () => void,
  ) {
    this.adapter = new ZoteroReaderAdapter(reader);
  }

  get attachmentID(): number {
    return Number(this.reader?.itemID);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async start(enabled: boolean): Promise<void> {
    if (this.destroyed) return;
    this.enabled = enabled;
    this.initializePromise ??= this.initialize();
    await this.initializePromise;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled && this.adapterReady) {
      this.render();
    } else {
      this.removeUi();
    }
    this.onStateChange();
  }

  setVisibleTypes(types: ReadonlySet<MarginAnnotationType>): void {
    if (
      this.visibleTypes.size === types.size
      && [...types].every((type) => this.visibleTypes.has(type))
    ) {
      return;
    }
    this.visibleTypes = new Set(types);
    if (!this.enabled || !this.adapterReady) return;
    if (this.hasBlockingEditor()) {
      this.pendingRefresh = true;
      return;
    }
    this.render();
  }

  setCompactNoteIcons(enabled: boolean): void {
    if (this.compactNoteIcons === enabled) return;
    this.compactNoteIcons = enabled;
    if (this.adapterReady) {
      this.syncCompactNoteIcons();
      if (this.enabled) this.render();
    }
  }

  setRenderingPreferences(preferences: RenderingPreferences): void {
    if (
      this.renderingPreferences.markdown === preferences.markdown
      && this.renderingPreferences.latex === preferences.latex
      && this.renderingPreferences.cardWidth === preferences.cardWidth
      && this.renderingPreferences.previewFontSize === preferences.previewFontSize
      && this.renderingPreferences.mathScale === preferences.mathScale
      && this.renderingPreferences.compactHeadings === preferences.compactHeadings
    ) return;

    const markdownChanged = this.renderingPreferences.markdown !== preferences.markdown;
    const latexChanged = this.renderingPreferences.latex !== preferences.latex;
    this.renderingPreferences = { ...preferences };
    this.applyCardGeometry();
    for (const runtime of this.cardRuntimes()) {
      if (markdownChanged || latexChanged) this.updatePreview(runtime);
      else {
        runtime.previewMeasurementDirty = true;
        runtime.card.classList.toggle(
          "zmm-compact-headings",
          preferences.compactHeadings,
        );
        this.applyRenderingPreferences(runtime);
        this.measurePreviewOverflow(runtime);
        this.syncPreviewDOM(runtime);
      }
      runtime.measuredHeight = undefined;
    }
    for (const mounted of this.mountedPages.values()) this.layoutPage(mounted);
  }

  async reveal(keys: readonly string[]): Promise<void> {
    keys.forEach((key) => this.forcedKeys.add(String(key)));
    if (!this.enabled) this.setEnabled(true);
    await this.refresh(true);
    const first = keys[0] && String(keys[0]);
    if (!first) return;

    this.setActive(first);
    setTimeout(() => {
      const runtime = this.cardRuntimes().find(
        (candidate) => candidate.annotation.key === first,
      );
      if (runtime) this.openEditor(runtime, true);
    }, 0);
  }

  async refresh(force = false): Promise<void> {
    if (this.destroyed || !Number.isInteger(this.attachmentID)) return;
    if (!force && this.hasBlockingEditor()) {
      this.pendingRefresh = true;
      return;
    }

    this.pendingRefresh = false;
    this.annotations = this.store.list(this.attachmentID);
    const annotationKeys = new Set(this.annotations.map((annotation) => annotation.key));
    for (const key of this.pinnedPreviewKeys) {
      if (!annotationKeys.has(key)) this.pinnedPreviewKeys.delete(key);
    }
    if (this.adapterReady) this.syncCompactNoteIcons();
    if (this.enabled && this.adapterReady) this.render();
  }

  destroy(): void {
    this.destroyed = true;
    this.adapterReady = false;
    this.cancelRenderFrame?.();
    this.cancelRenderFrame = undefined;
    this.cancelVisibilityFrame?.();
    this.cancelVisibilityFrame = undefined;
    if (this.visibilityTimer) clearTimeout(this.visibilityTimer);
    this.visibilityTimer = undefined;
    this.pendingVisibilityPages = [];
    this.renderFramesRemaining = 0;
    this.centerFramesRemaining = 0;
    this.removeUi();
    this.adapter.destroy();
  }

  private scheduleRender(frames = 4): void {
    if (this.destroyed || !this.enabled || !this.adapterReady) return;
    this.renderFramesRemaining = Math.max(this.renderFramesRemaining, frames);
    if (this.cancelRenderFrame) return;
    this.cancelRenderFrame = this.adapter.scheduleAnimationFrame(() => {
      this.cancelRenderFrame = undefined;
      if (this.hasBlockingEditor()) {
        this.pendingRefresh = true;
        this.renderFramesRemaining = 0;
        return;
      }
      this.render();
      if (this.centerFramesRemaining) {
        this.adapter.centerCurrentPageHorizontally();
        this.centerFramesRemaining = Math.max(0, this.centerFramesRemaining - 1);
      }
      this.renderFramesRemaining = Math.max(0, this.renderFramesRemaining - 1);
      if (this.renderFramesRemaining) this.scheduleRender(0);
    });
  }

  private render(): void {
    if (!this.started || !this.adapterReady || this.destroyed || !this.enabled) return;
    const doc = this.adapter.document();
    const viewer = this.adapter.viewerElement();
    this.ensureStyles(doc);

    const displayable = this.annotations.filter(
      (annotation) =>
        this.visibleTypes.has(annotation.type)
        && shouldDisplayAnnotation(annotation, this.forcedKeys),
    );
    const hasDisplayableAnnotations = displayable.length > 0;
    viewer.classList.toggle("zmm-viewer", hasDisplayableAnnotations);
    if (hasDisplayableAnnotations) {
      this.ensureOverlayRoot(doc, viewer);
    } else {
      for (const pageIndex of [...this.mountedPages.keys()]) {
        this.unmountPage(pageIndex);
      }
      this.overlayRoot?.remove();
      this.overlayRoot = undefined;
      return;
    }
    const pageIndexes = new Set(
      displayable.map((annotation) => annotation.position.pageIndex),
    );

    for (const pageIndex of [...this.mountedPages.keys()]) {
      if (!pageIndexes.has(pageIndex)) this.unmountPage(pageIndex);
    }

    let waitingForPage = false;
    for (const pageIndex of pageIndexes) {
      const handle = this.adapter.page(pageIndex);
      if (!handle) {
        const mounted = this.mountedPages.get(pageIndex);
        if (mounted && !mounted.handle.element.isConnected) {
          this.unmountPage(pageIndex);
        }
        if (pageIndex < this.adapter.pageCount()) waitingForPage = true;
        continue;
      }
      const pageAnnotations = displayable.filter(
        (annotation) => annotation.position.pageIndex === pageIndex,
      );
      this.renderPage(handle, pageAnnotations);
    }
    this.syncActiveCards();
    if (waitingForPage) this.scheduleRender(1);
  }

  private async initialize(): Promise<void> {
    await this.adapter.ready();
    if (this.destroyed) return;

    this.adapterReady = true;
    this.started = true;
    this.nativeVisibleIDs = this.adapter.visibleAnnotationIDs();
    this.adapter.onLayoutChange((reason) => {
      if (reason === "scalechanging") {
        this.centerFramesRemaining = Math.max(this.centerFramesRemaining, 4);
      }
      this.scheduleRender();
    });
    this.adapter.onAnnotationVisibilityChange(() => {
      this.scheduleVisibilityUpdate();
    });
    this.adapter.onNativeSelectionChange((ids) => {
      if (ids.length === 1) this.setActive(ids[0]);
    });
    await this.refresh(true);
    this.onStateChange();
  }

  private renderPage(
    handle: PdfPageHandle,
    annotations: MarginAnnotation[],
  ): void {
    const existing = this.mountedPages.get(handle.pageIndex);
    if (
      existing?.handle.element === handle.element &&
      this.updateMountedPage(existing, handle, annotations)
    ) {
      return;
    }

    this.unmountPage(handle.pageIndex);
    const doc = handle.element.ownerDocument;
    this.bindInteractionDocument(doc);
    const overlay = doc.createElement("div");
    const lines = doc.createElementNS(SVG_NS, "svg") as SVGSVGElement;
    const cards = doc.createElement("div");
    const columns = {
      left: this.createMarginColumn(doc, "left"),
      right: this.createMarginColumn(doc, "right"),
    };
    overlay.className = "zmm-page-overlay";
    overlay.classList.toggle("zmm-low-zoom", handle.scale < COLLAPSE_SCALE_THRESHOLD);
    lines.classList.add("zmm-line-layer");
    cards.className = "zmm-card-layer";
    cards.append(columns.left.root, columns.right.root);
    overlay.append(lines, cards);
    handle.element.classList.add("zmm-page");
    this.overlayRoot?.append(overlay);

    const mounted: MountedPage = {
      handle,
      overlay,
      lines,
      cards,
      columns,
      runtimes: [],
      positions: new Map(),
    };
    this.mountedPages.set(handle.pageIndex, mounted);
    for (const column of [columns.left, columns.right]) {
      column.toggle.addEventListener("click", () => {
        this.toggleMargin(mounted, column.side);
      });
      column.scrollport.addEventListener("scroll", () => {
        this.redrawLeaderLines(mounted);
      });
    }

    for (const annotation of annotations) {
      const anchor = this.annotationAnchorForHandle(annotation, handle);
      if (!anchor) continue;
      const runtime = this.createCard(doc, annotation, anchor, handle.pageIndex);
      runtime.card.classList.toggle(
        "zmm-filtered",
        !this.isNativeAnnotationVisible(annotation.key),
      );
      mounted.runtimes.push(runtime);
      columns[anchor.side].content.append(runtime.card);
      this.resizeEditor(runtime.editor);
    }
    this.layoutPage(mounted);
  }

  private updateMountedPage(
    mounted: MountedPage,
    handle: PdfPageHandle,
    annotations: MarginAnnotation[],
  ): boolean {
    const prepared = annotations
      .map((annotation) => ({
        annotation,
        anchor: this.annotationAnchorForHandle(annotation, handle),
      }))
      .filter(
        (entry): entry is { annotation: MarginAnnotation; anchor: PageAnchor } =>
          Boolean(entry.anchor),
      );
    if (prepared.length !== mounted.runtimes.length) return false;
    const byKey = new Map(
      prepared.map((entry) => [entry.annotation.key, entry] as const),
    );
    if (
      mounted.runtimes.some(
        (runtime) => !byKey.has(runtime.annotation.key),
      )
    ) {
      return false;
    }

    mounted.handle = handle;
    mounted.overlay.classList.toggle(
      "zmm-low-zoom",
      handle.scale < COLLAPSE_SCALE_THRESHOLD,
    );
    for (const runtime of mounted.runtimes) {
      const entry = byKey.get(runtime.annotation.key)!;
      const annotationChanged = runtime.annotation !== entry.annotation;
      const wasReadOnly = runtime.annotation.readOnly;
      const previousSide = runtime.anchor.side;
      runtime.annotation = entry.annotation;
      runtime.anchor = entry.anchor;
      if (previousSide !== entry.anchor.side) {
        runtime.card.classList.toggle("zmm-card-left", entry.anchor.side === "left");
        runtime.card.classList.toggle("zmm-card-right", entry.anchor.side === "right");
        mounted.columns[entry.anchor.side].content.append(runtime.card);
      }

      if (annotationChanged) {
        runtime.card.style.setProperty("--zmm-color", entry.annotation.color);
        runtime.editor.readOnly = entry.annotation.readOnly;
        runtime.editor.placeholder =
          entry.annotation.type === "note"
            ? "点击输入独立评论…"
            : "点击输入划线解释…";
        runtime.editor.setAttribute(
          "aria-readonly",
          String(entry.annotation.readOnly),
        );
        const annotationLabel = typeLabel(entry.annotation.type);
        const pageLabel = entry.annotation.pageLabel || handle.pageIndex + 1;
        runtime.preview.setAttribute(
          "aria-label",
          `${entry.annotation.readOnly ? "查看" : "编辑"}${annotationLabel}，第 ${pageLabel} 页`,
        );
        runtime.editor.setAttribute(
          "aria-label",
          `${annotationLabel}，第 ${pageLabel} 页`,
        );
      }

      if (!runtime.dirty && runtime.currentValue !== entry.annotation.comment) {
        runtime.currentValue = entry.annotation.comment;
        runtime.editor.value = entry.annotation.comment;
        runtime.originalValue = entry.annotation.comment;
        this.updatePreview(runtime);
        this.resizeEditor(runtime.editor);
        runtime.measuredHeight = undefined;
      }
      if (wasReadOnly !== entry.annotation.readOnly) {
        runtime.state.textContent = entry.annotation.readOnly ? "只读" : "";
        runtime.measuredHeight = undefined;
      }
    }
    this.layoutPage(mounted);
    return true;
  }

  private createMarginColumn(
    doc: Document,
    side: MarginSide,
  ): MarginColumnRuntime {
    const root = doc.createElement("section");
    const scrollport = doc.createElement("div");
    const content = doc.createElement("div");
    const toggle = doc.createElement("button");
    root.className = `zmm-margin-column zmm-margin-column-${side}`;
    scrollport.className = "zmm-margin-scrollport";
    content.className = "zmm-margin-content";
    toggle.type = "button";
    toggle.className = "zmm-margin-toggle";
    toggle.hidden = true;
    scrollport.append(content);
    root.append(scrollport, toggle);
    return { side, root, scrollport, content, toggle };
  }

  private toggleMargin(mounted: MountedPage, side: MarginSide): void {
    const key = this.marginStateKey(mounted.handle.pageIndex, side);
    const column = mounted.columns[side];
    if (this.expandedMargins.has(key)) {
      this.expandedMargins.delete(key);
      const activeEditor = mounted.runtimes.find(
        (runtime) =>
          runtime.anchor.side === side &&
          runtime.editor.ownerDocument.activeElement === runtime.editor,
      );
      activeEditor?.editor.blur();
      column.scrollport.scrollTop = 0;
    } else {
      this.expandedMargins.add(key);
    }
    this.layoutPage(mounted);
  }

  private marginStateKey(pageIndex: number, side: MarginSide): string {
    return `${pageIndex}:${side}`;
  }

  private createCard(
    doc: Document,
    annotation: MarginAnnotation,
    anchor: PageAnchor,
    pageIndex: number,
  ): CardRuntime {
    const card = doc.createElement("article");
    const preview = doc.createElement("div");
    const editor = doc.createElement("textarea");
    const footer = doc.createElement("footer");
    const state = doc.createElement("span");
    const expandButton = doc.createElement("button");

    card.className = `zmm-card zmm-card-${anchor.side}`;
    card.dataset.annotationKey = annotation.key;
    card.style.setProperty("--zmm-color", annotation.color);
    const annotationLabel = typeLabel(annotation.type);
    preview.className = "zmm-card-preview";
    preview.setAttribute("role", "group");
    preview.tabIndex = 0;
    preview.setAttribute(
      "aria-label",
      `${annotation.readOnly ? "查看" : "编辑"}${annotationLabel}，第 ${annotation.pageLabel || pageIndex + 1} 页`,
    );
    editor.className = "zmm-card-editor zmm-editor-hidden";
    editor.readOnly = annotation.readOnly;
    editor.placeholder = annotation.type === "note" ? "点击输入独立评论…" : "点击输入划线解释…";
    editor.spellcheck = false;
    editor.dir = "auto";
    editor.setAttribute("aria-multiline", "true");
    editor.setAttribute("aria-readonly", String(annotation.readOnly));
    editor.setAttribute("aria-label", `${annotationLabel}，第 ${annotation.pageLabel || pageIndex + 1} 页`);
    editor.value = annotation.comment;
    footer.className = "zmm-card-footer";
    state.className = "zmm-save-state";
    state.textContent = annotation.readOnly ? "只读" : "";
    expandButton.type = "button";
    expandButton.className = "zmm-preview-expand";
    expandButton.hidden = true;

    footer.append(state, expandButton);
    card.append(preview, editor, footer);

    const runtime: CardRuntime = {
      annotation,
      anchor,
      card,
      preview,
      editor,
      state,
      expandButton,
      previewExpanded: false,
      pointerInside: false,
      hoverExpanded: false,
      pinnedExpanded: this.pinnedPreviewKeys.has(annotation.key),
      focusWithin: false,
      selectionWithin: false,
      pointerSelecting: false,
      truncated: false,
      previewMeasurementDirty: true,
      originalValue: annotation.comment,
      currentValue: annotation.comment,
      dirty: false,
      saving: false,
    };
    this.updatePreview(runtime);
    card.classList.toggle("zmm-hovered", this.hoveredKey === annotation.key);

    card.addEventListener("pointerenter", () => {
      this.setHovered(runtime.annotation.key);
      this.enterPreview(runtime);
    });
    card.addEventListener("pointerleave", () => {
      this.setHovered();
      this.leavePreview(runtime);
    });
    card.addEventListener("focusin", () => this.focusPreview(runtime));
    card.addEventListener("focusout", () => {
      setTimeout(() => this.refreshFocusState(runtime), 0);
    });
    card.addEventListener("pointerdown", (event) => {
      if ((event.target as Element).closest("a, button, textarea, .zmm-card-preview")) return;
      this.setActive(runtime.annotation.key);
      this.adapter.selectAnnotation(runtime.annotation.key);
    });
    preview.addEventListener("click", (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (link && preview.contains(link)) {
        event.preventDefault();
        event.stopPropagation();
        this.openExternalLink(link.href);
        return;
      }
      if (!runtime.annotation.readOnly) this.openEditor(runtime);
    });
    preview.addEventListener("pointerdown", () => {
      runtime.pointerSelecting = true;
      this.changePreviewState(runtime);
    });
    preview.addEventListener("keydown", (event) => {
      if (event.target !== preview || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      if (!runtime.annotation.readOnly) this.openEditor(runtime);
    });
    expandButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      runtime.pinnedExpanded = !runtime.pinnedExpanded;
      if (runtime.pinnedExpanded) this.pinnedPreviewKeys.add(runtime.annotation.key);
      else this.pinnedPreviewKeys.delete(runtime.annotation.key);
      this.changePreviewState(runtime);
    });
    editor.addEventListener("focus", () => {
      this.setActive(runtime.annotation.key);
    });
    // Keep text editing inside the card. Letting these events bubble to the
    // card would call selectAnnotation(), which navigates the PDF on every
    // drag start and collapses a mouse selection back to a single caret.
    // Do not preventDefault(): native selection and the clipboard context
    // menu still need their normal browser behaviour.
    for (const eventName of [
      "pointerdown",
      "mousedown",
      "click",
      "dblclick",
      "contextmenu",
    ]) {
      editor.addEventListener(eventName, (event) => event.stopPropagation());
    }
    editor.addEventListener("copy", (event) => event.stopPropagation());
    editor.addEventListener("cut", (event) => event.stopPropagation());
    editor.addEventListener("paste", (event) => event.stopPropagation());
    editor.addEventListener("input", () => {
      if (runtime.annotation.readOnly) return;
      runtime.currentValue = editor.value;
      runtime.dirty = runtime.currentValue !== runtime.originalValue;
      if (runtime.statusTimer) clearTimeout(runtime.statusTimer);
      runtime.statusTimer = undefined;
      runtime.state.dataset.error = "false";
      runtime.state.textContent = runtime.dirty ? "未保存" : "";
      this.resizeEditor(editor);
      runtime.measuredHeight = undefined;
      const mounted = this.mountedPages.get(pageIndex);
      if (mounted) this.layoutPage(mounted);
      this.queueSave(runtime);
    });
    editor.addEventListener("keydown", (event) => {
      const modifier = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;
      const key = event.key.toLowerCase();
      const formatMarker = key === "b"
        ? "**"
        : key === "i"
          ? "*"
          : undefined;
      if (modifier && key === "a") {
        event.stopPropagation();
      } else if (modifier && key === "c") {
        event.stopPropagation();
      } else if (modifier && ["x", "v", "z", "y"].includes(key)) {
        event.stopPropagation();
        // Keep native paste/undo/redo, but do not let the PDF reader treat
        // the shortcut as a document command.
      } else if (modifier && formatMarker) {
        event.preventDefault();
        event.stopPropagation();
        wrapMarkdownSelection(editor, formatMarker);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.cancelEdit(runtime);
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.persist(runtime).then((saved) => {
          if (saved) editor.blur();
        });
      }
    });
    editor.addEventListener("blur", () => {
      void this.persist(runtime).finally(() => {
        this.closeEditor(runtime, pageIndex);
        this.refreshFocusState(runtime);
        this.flushPendingRefresh();
      });
    });
    return runtime;
  }

  private layoutPage(mounted: MountedPage): void {
    this.positionOverlay(mounted);
    const { width, height } = this.pageDimensions(mounted.handle);
    const previousPositions = new Map(
      [...mounted.positions].map(([id, position]) => [id, position.y] as const),
    );
    mounted.positions.clear();

    for (const side of ["left", "right"] as const) {
      const column = mounted.columns[side];
      const sideRuntimes = mounted.runtimes.filter(
        (runtime) =>
          runtime.anchor.side === side &&
          !runtime.card.classList.contains("zmm-filtered"),
      );
      const stateKey = this.marginStateKey(mounted.handle.pageIndex, side);
      const editing = sideRuntimes.some((runtime) =>
        runtime.card.classList.contains("zmm-editing"),
      );
      const requestedExpanded = this.expandedMargins.has(stateKey);
      for (const runtime of sideRuntimes) {
        this.measurePreviewOverflow(runtime);
        this.syncPreviewDOM(runtime);
      }
      const activePreview = sideRuntimes.find(
        (runtime) => runtime.previewExpanded && runtime.annotation.key === this.hoveredKey,
      ) ?? sideRuntimes.find((runtime) => runtime.previewExpanded && runtime.focusWithin)
        ?? sideRuntimes.find((runtime) => runtime.previewExpanded && runtime.pinnedExpanded)
        ?? sideRuntimes.find((runtime) => runtime.previewExpanded);
      const stableAnchor = activePreview && previousPositions.has(activePreview.annotation.key)
        ? {
            id: activePreview.annotation.key,
            top: previousPositions.get(activePreview.annotation.key)!,
            previousPositions,
          }
        : undefined;
      const runtimeByID = new Map(
        sideRuntimes.map((runtime) => [runtime.annotation.key, runtime] as const),
      );
      const result = layoutCollapsibleMargin(
        sideRuntimes.map((runtime) => ({
          id: runtime.annotation.key,
          anchorY: runtime.anchor.y,
          height: this.measureRuntimeHeight(runtime, mounted),
        })),
        {
          pageHeight: height,
          padding: LAYOUT_PADDING,
          gap: CARD_GAP,
          summaryHeight: SUMMARY_HEIGHT,
          expandedTopPadding: EXPANDED_TOP_PADDING,
          expanded: requestedExpanded || editing,
          stableAnchor,
        },
      );
      const transientPreviewExpansion = Boolean(activePreview) && !requestedExpanded && !editing;
      const expanded = result.overflow && (requestedExpanded || editing || Boolean(activePreview));
      if (!result.overflow) this.expandedMargins.delete(stateKey);
      if (!expanded) column.scrollport.scrollTop = 0;

      column.root.classList.toggle("zmm-margin-expanded", expanded);
      column.root.classList.toggle("zmm-margin-overflow", result.overflow);
      column.toggle.hidden = !result.overflow || transientPreviewExpansion;
      column.toggle.setAttribute("aria-expanded", String(expanded));
      const toggleText = expanded
        ? "收起评论"
        : `还有 ${result.hiddenIDs.length} 条 · 展开`;
      if (column.toggle.textContent !== toggleText) {
        column.toggle.textContent = toggleText;
      }
      const toggleTop = `${expanded ? LAYOUT_PADDING : result.summaryY ?? 0}px`;
      if (column.toggle.style.top !== toggleTop) column.toggle.style.top = toggleTop;
      const contentHeight = `${result.contentHeight}px`;
      if (column.content.style.height !== contentHeight) {
        column.content.style.height = contentHeight;
      }

      const visibleIDs = new Set(result.positions.map((position) => position.id));
      for (const runtime of sideRuntimes) {
        runtime.card.classList.toggle(
          "zmm-overflow-hidden",
          !visibleIDs.has(runtime.annotation.key),
        );
      }
      for (const position of result.positions) {
        mounted.positions.set(position.id, position);
        const runtime = runtimeByID.get(position.id);
        if (runtime) {
          const top = `${position.y}px`;
          if (runtime.card.style.top !== top) runtime.card.style.top = top;
        }
      }
    }

    const marginExtent = this.marginExtent;
    mounted.lines.style.left = `-${marginExtent}px`;
    mounted.lines.setAttribute("width", String(width + marginExtent * 2));
    mounted.lines.setAttribute("height", String(Math.max(1, height)));
    mounted.lines.setAttribute(
      "viewBox",
      `${-marginExtent} 0 ${width + marginExtent * 2} ${Math.max(1, height)}`,
    );
    this.redrawLeaderLines(mounted);
  }

  private redrawLeaderLines(mounted: MountedPage): void {
    const { width, height } = this.pageDimensions(mounted.handle);
    mounted.lines.replaceChildren();
    for (const runtime of mounted.runtimes) {
      const position = mounted.positions.get(runtime.annotation.key);
      if (!position) continue;
      const column = mounted.columns[runtime.anchor.side];
      const expanded = column.root.classList.contains("zmm-margin-expanded");
      const cardY = position.y - (expanded ? column.scrollport.scrollTop : 0);
      const lineEndY = cardY + Math.min(26, position.height / 2);
      if (expanded && (lineEndY < 0 || lineEndY > height)) continue;
      this.drawLeaderLine(mounted.lines, runtime, cardY, position.height, width);
    }
  }

  private scheduleVisibilityUpdate(): void {
    if (this.destroyed || !this.enabled || !this.adapterReady) return;
    if (this.visibilityTimer) clearTimeout(this.visibilityTimer);
    this.cancelVisibilityFrame?.();
    this.cancelVisibilityFrame = undefined;
    this.pendingVisibilityPages = [];
    this.visibilityTimer = setTimeout(() => {
      this.visibilityTimer = undefined;
      if (this.destroyed || !this.enabled || !this.adapterReady) return;
      this.nativeVisibleIDs = this.adapter.visibleAnnotationIDs();
      const currentPageIndex = this.adapter.currentPageIndex();
      this.pendingVisibilityPages = [...this.mountedPages.values()].sort(
        (left, right) =>
          Math.abs(left.handle.pageIndex - currentPageIndex) -
          Math.abs(right.handle.pageIndex - currentPageIndex),
      );
      this.processNextVisibilityPage(true);
    }, FILTER_UI_SETTLE_MS);
  }

  private processNextVisibilityPage(prioritizeCurrentPage = false): void {
    if (this.cancelVisibilityFrame || !this.pendingVisibilityPages.length) return;
    const schedule = prioritizeCurrentPage
      ? this.adapter.scheduleAnimationFrame.bind(this.adapter)
      : this.adapter.scheduleIdleCallback.bind(this.adapter);
    this.cancelVisibilityFrame = schedule(() => {
      this.cancelVisibilityFrame = undefined;
      const mounted = this.pendingVisibilityPages.shift();
      if (
        mounted &&
        this.mountedPages.get(mounted.handle.pageIndex) === mounted
      ) {
        this.applyNativeVisibility(mounted);
      }
      if (this.pendingVisibilityPages.length) this.processNextVisibilityPage(false);
    });
  }

  private applyNativeVisibility(mounted: MountedPage): void {
    let changed = false;
    for (const runtime of mounted.runtimes) {
      const filtered = !this.isNativeAnnotationVisible(runtime.annotation.key);
      if (runtime.card.classList.contains("zmm-filtered") === filtered) continue;
      runtime.card.classList.toggle("zmm-filtered", filtered);
      changed = true;
    }
    if (changed) this.layoutPage(mounted);
  }

  private isNativeAnnotationVisible(key: string): boolean {
    return this.nativeVisibleIDs === undefined || this.nativeVisibleIDs.has(key);
  }

  private drawLeaderLine(
    svg: SVGSVGElement,
    runtime: CardRuntime,
    cardY: number,
    cardHeight: number,
    pageWidth: number,
  ): void {
    const doc = svg.ownerDocument;
    const line = doc.createElementNS(SVG_NS, "polyline");
    const dot = doc.createElementNS(SVG_NS, "circle");
    const endY = cardY + Math.min(26, cardHeight / 2);
    const isLeft = runtime.anchor.side === "left";
    const elbowX = isLeft ? -12 : pageWidth - RIGHT_CARD_INSET - 12;
    const endX = isLeft ? -CARD_GAP_FROM_PAGE : pageWidth - RIGHT_CARD_INSET;
    line.classList.add("zmm-line");
    line.dataset.annotationKey = runtime.annotation.key;
    line.classList.toggle("zmm-hovered", this.hoveredKey === runtime.annotation.key);
    line.setAttribute(
      "points",
      `${runtime.anchor.x},${runtime.anchor.y} ${elbowX},${runtime.anchor.y} ${endX},${endY}`,
    );
    line.setAttribute("stroke", runtime.annotation.color);
    dot.classList.add("zmm-line-dot");
    dot.dataset.annotationKey = runtime.annotation.key;
    dot.classList.toggle("zmm-hovered", this.hoveredKey === runtime.annotation.key);
    dot.setAttribute("cx", String(runtime.anchor.x));
    dot.setAttribute("cy", String(runtime.anchor.y));
    dot.setAttribute("r", "2.5");
    dot.setAttribute("fill", runtime.annotation.color);
    svg.append(line, dot);
  }

  private queueSave(runtime: CardRuntime): void {
    if (runtime.timer) clearTimeout(runtime.timer);
    runtime.timer = setTimeout(() => {
      runtime.timer = undefined;
      void this.persist(runtime);
    }, 700);
  }

  private async persist(runtime: CardRuntime): Promise<boolean> {
    if (runtime.timer) clearTimeout(runtime.timer);
    runtime.timer = undefined;
    if (!runtime.dirty) return true;
    if (runtime.saving || runtime.annotation.readOnly) return false;

    const value = runtime.currentValue;
    runtime.saving = true;
    if (runtime.statusTimer) clearTimeout(runtime.statusTimer);
    runtime.statusTimer = undefined;
    runtime.state.dataset.error = "false";
    runtime.state.textContent = "正在保存…";
    try {
      await this.store.saveComment(runtime.annotation.itemID, value);
      runtime.originalValue = value;
      runtime.annotation.comment = value;
      runtime.dirty = runtime.currentValue !== value;
      this.updatePreview(runtime);
      runtime.state.textContent = runtime.dirty ? "有新修改" : "已保存";
      if (!runtime.dirty) {
        runtime.statusTimer = setTimeout(() => {
          runtime.statusTimer = undefined;
          if (!runtime.dirty && !runtime.saving && !runtime.annotation.readOnly) {
            runtime.state.textContent = "";
            runtime.measuredHeight = undefined;
            this.relayoutRuntime(runtime);
          }
        }, 1200);
      }
      if (value.trim()) this.forcedKeys.delete(runtime.annotation.key);
      return !runtime.dirty;
    } catch (error) {
      runtime.dirty = true;
      runtime.state.dataset.error = "true";
      runtime.state.textContent = error instanceof Error ? error.message : "保存失败";
      (Zotero as any).logError?.(error);
      return false;
    } finally {
      runtime.saving = false;
      if (runtime.dirty && runtime.currentValue !== value) this.queueSave(runtime);
      this.flushPendingRefresh();
    }
  }

  private cancelEdit(runtime: CardRuntime): void {
    if (runtime.timer) clearTimeout(runtime.timer);
    runtime.timer = undefined;
    runtime.currentValue = runtime.originalValue;
    runtime.editor.value = runtime.originalValue;
    runtime.annotation.comment = runtime.originalValue;
    runtime.dirty = false;
    runtime.state.dataset.error = "false";
    runtime.state.textContent = runtime.annotation.readOnly ? "只读" : "已取消";
    if (!runtime.annotation.readOnly) {
      runtime.statusTimer = setTimeout(() => {
        runtime.statusTimer = undefined;
        runtime.state.textContent = "";
        runtime.measuredHeight = undefined;
        this.relayoutRuntime(runtime);
      }, 1200);
    }
    this.updatePreview(runtime);
    this.resizeEditor(runtime.editor);
    runtime.editor.blur();
  }

  private openEditor(runtime: CardRuntime, selectAll = false): void {
    if (runtime.annotation.readOnly) return;
    runtime.card.classList.add("zmm-editing");
    runtime.preview.classList.add("zmm-preview-hidden");
    runtime.editor.classList.remove("zmm-editor-hidden");
    this.resizeEditor(runtime.editor);
    const mounted = this.mountedPages.get(runtime.annotation.position.pageIndex);
    if (mounted) this.layoutPage(mounted);
    runtime.editor.focus();
    if (selectAll) runtime.editor.select();
  }

  private closeEditor(runtime: CardRuntime, pageIndex: number): void {
    runtime.card.classList.remove("zmm-editing");
    runtime.editor.classList.add("zmm-editor-hidden");
    runtime.preview.classList.remove("zmm-preview-hidden");
    this.measurePreviewOverflow(runtime);
    this.syncPreviewDOM(runtime);
    const mounted = this.mountedPages.get(pageIndex);
    if (mounted) this.layoutPage(mounted);
  }

  private updatePreview(runtime: CardRuntime): void {
    runtime.previewMeasurementDirty = true;
    const value = runtime.currentValue;
    if (value) {
      try {
        runtime.preview.innerHTML = renderMarkdown(
          value,
          runtime.preview.ownerDocument,
          this.renderingPreferences,
        );
      } catch (error) {
        runtime.preview.textContent = value;
        (Zotero as any).logError?.(error);
      }
    } else {
      runtime.preview.textContent = runtime.editor.placeholder;
    }
    runtime.preview.classList.toggle("zmm-empty-preview", !value);
    runtime.preview.classList.toggle("zmm-preview-expanded", runtime.previewExpanded);
    runtime.card.classList.toggle(
      "zmm-compact-headings",
      this.renderingPreferences.compactHeadings,
    );
    this.applyRenderingPreferences(runtime);
    this.measurePreviewOverflow(runtime);
    this.syncPreviewDOM(runtime);
  }

  private measurePreviewOverflow(runtime: CardRuntime): void {
    const preview = runtime.preview;
    if (!runtime.previewMeasurementDirty || preview.classList.contains("zmm-preview-hidden")) return;
    preview.classList.add("zmm-measuring-collapsed");
    const clientHeight = preview.clientHeight;
    const scrollHeight = preview.scrollHeight;
    preview.classList.remove("zmm-measuring-collapsed");
    if (!clientHeight && !scrollHeight) return;
    runtime.previewMeasurementDirty = false;
    const wasTruncated = runtime.truncated;
    runtime.truncated = scrollHeight > clientHeight + 2;
    if (wasTruncated !== runtime.truncated) runtime.measuredHeight = undefined;
    if (!runtime.truncated) {
      runtime.pinnedExpanded = false;
      runtime.hoverExpanded = false;
    }
    preview.classList.toggle("zmm-preview-truncated", runtime.truncated);
  }

  private syncPreviewDOM(runtime: CardRuntime): void {
    const expanded = runtime.truncated && (
      runtime.hoverExpanded
      || runtime.pinnedExpanded
      || runtime.focusWithin
      || runtime.selectionWithin
      || runtime.pointerSelecting
    );
    runtime.previewExpanded = expanded;
    runtime.preview.classList.toggle("zmm-preview-expanded", expanded);
    runtime.preview.setAttribute("aria-expanded", String(expanded));
    runtime.expandButton.hidden = !runtime.truncated;
    runtime.expandButton.textContent = runtime.pinnedExpanded ? "取消固定" : "固定展开";
    runtime.expandButton.setAttribute("aria-pressed", String(runtime.pinnedExpanded));
    runtime.card.classList.toggle("zmm-preview-open", expanded);
    runtime.card.classList.toggle("zmm-preview-pinned", runtime.pinnedExpanded);
  }

  private enterPreview(runtime: CardRuntime): void {
    runtime.pointerInside = true;
    if (runtime.collapseTimer) clearTimeout(runtime.collapseTimer);
    runtime.collapseTimer = undefined;
    if (runtime.expandTimer) clearTimeout(runtime.expandTimer);
    runtime.expandTimer = setTimeout(() => {
      runtime.expandTimer = undefined;
      if (!runtime.pointerInside || !runtime.truncated || this.destroyed) return;
      runtime.hoverExpanded = true;
      this.changePreviewState(runtime);
    }, HOVER_EXPAND_DELAY_MS);
  }

  private leavePreview(runtime: CardRuntime): void {
    runtime.pointerInside = false;
    if (runtime.expandTimer) clearTimeout(runtime.expandTimer);
    runtime.expandTimer = undefined;
    this.schedulePreviewCollapse(runtime);
  }

  private focusPreview(runtime: CardRuntime): void {
    runtime.focusWithin = true;
    if (runtime.collapseTimer) clearTimeout(runtime.collapseTimer);
    runtime.collapseTimer = undefined;
    if (runtime.truncated) runtime.hoverExpanded = true;
    this.changePreviewState(runtime);
  }

  private refreshFocusState(runtime: CardRuntime): void {
    runtime.focusWithin = runtime.card.ownerDocument.activeElement !== null
      && runtime.card.contains(runtime.card.ownerDocument.activeElement);
    if (runtime.focusWithin) {
      if (runtime.truncated) runtime.hoverExpanded = true;
      this.changePreviewState(runtime);
    } else {
      this.schedulePreviewCollapse(runtime);
    }
  }

  private schedulePreviewCollapse(runtime: CardRuntime): void {
    if (runtime.collapseTimer) clearTimeout(runtime.collapseTimer);
    runtime.collapseTimer = setTimeout(() => {
      runtime.collapseTimer = undefined;
      runtime.selectionWithin = this.hasSelectionWithin(runtime);
      if (
        runtime.pointerInside
        || runtime.focusWithin
        || runtime.selectionWithin
        || runtime.pointerSelecting
        || runtime.pinnedExpanded
        || runtime.card.classList.contains("zmm-editing")
        || runtime.saving
        || this.destroyed
      ) return;
      runtime.hoverExpanded = false;
      this.changePreviewState(runtime);
    }, HOVER_COLLAPSE_DELAY_MS);
  }

  private changePreviewState(runtime: CardRuntime): void {
    const wasExpanded = runtime.previewExpanded;
    this.syncPreviewDOM(runtime);
    if (wasExpanded === runtime.previewExpanded) return;
    runtime.measuredHeight = undefined;
    // layoutPage captures the old positions and keeps the active expanded
    // preview at the same top edge while pushing cards below it down.
    this.relayoutRuntime(runtime);
  }

  private bindInteractionDocument(doc: Document): void {
    if (this.interactionDocument === doc) return;
    this.unbindInteractionDocument();
    this.interactionDocument = doc;
    doc.addEventListener("pointerup", this.onDocumentPointerUp, true);
    doc.addEventListener("selectionchange", this.onDocumentSelectionChange);
    doc.fonts?.addEventListener("loadingdone", this.onFontsLoaded);
    void doc.fonts?.ready.then(() => {
      if (this.interactionDocument === doc && !this.destroyed) this.remeasurePreviews();
    });
  }

  private unbindInteractionDocument(): void {
    this.interactionDocument?.removeEventListener("pointerup", this.onDocumentPointerUp, true);
    this.interactionDocument?.removeEventListener("selectionchange", this.onDocumentSelectionChange);
    this.interactionDocument?.fonts?.removeEventListener("loadingdone", this.onFontsLoaded);
    this.interactionDocument = undefined;
  }

  private remeasurePreviews(): void {
    for (const mounted of this.mountedPages.values()) {
      for (const runtime of mounted.runtimes) {
        this.measurePreviewOverflow(runtime);
        this.syncPreviewDOM(runtime);
        runtime.measuredHeight = undefined;
      }
      this.layoutPage(mounted);
    }
  }

  private finishPointerSelection(): void {
    for (const runtime of this.cardRuntimes()) {
      runtime.pointerSelecting = false;
      this.changePreviewState(runtime);
    }
    this.updateSelectionStates();
  }

  private updateSelectionStates(): void {
    for (const runtime of this.cardRuntimes()) this.refreshSelectionState(runtime);
  }

  private refreshSelectionState(runtime: CardRuntime): void {
    const selected = this.hasSelectionWithin(runtime);
    if (runtime.selectionWithin === selected) return;
    runtime.selectionWithin = selected;
    if (selected) this.changePreviewState(runtime);
    else if (!runtime.pointerInside && !runtime.focusWithin && !runtime.pinnedExpanded) {
      this.schedulePreviewCollapse(runtime);
    }
  }

  private hasSelectionWithin(runtime: CardRuntime): boolean {
    const selection = runtime.card.ownerDocument.getSelection();
    let selected = false;
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      try {
        for (let index = 0; index < selection.rangeCount; index += 1) {
          if (selection.getRangeAt(index).intersectsNode(runtime.preview)) {
            selected = true;
            break;
          }
        }
      } catch {
        selected = false;
      }
    }
    return selected;
  }

  private applyRenderingPreferences(runtime: CardRuntime): void {
    runtime.card.style.setProperty(
      "--zmm-preview-font-size",
      `${13 * this.renderingPreferences.previewFontSize / 100}px`,
    );
    runtime.card.style.setProperty(
      "--zmm-math-font-size",
      `${13 * this.renderingPreferences.previewFontSize * 1.08 * this.renderingPreferences.mathScale / 10_000}px`,
    );
  }

  private openExternalLink(url: string): void {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) return;
      const launch = (Zotero as any).launchURL;
      if (typeof launch === "function") {
        launch.call(Zotero, parsed.href);
      } else {
        this.adapter.document().defaultView?.open(parsed.href, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      (Zotero as any).logError?.(error);
    }
  }

  private measureRuntimeHeight(
    runtime: CardRuntime,
    mounted: MountedPage,
  ): number {
    const mode = [
      mounted.overlay.classList.contains("zmm-low-zoom") ? "low" : "normal",
      runtime.card.classList.contains("zmm-editing") ? "editing" : "preview",
      runtime.previewExpanded ? "expanded" : "collapsed",
      runtime.state.textContent ? "status" : "plain",
    ].join(":");
    if (runtime.measuredHeight === undefined || runtime.heightMode !== mode) {
      runtime.measuredHeight = measureHeight(runtime.card, runtime.currentValue);
      runtime.heightMode = mode;
    }
    return runtime.measuredHeight;
  }

  private relayoutRuntime(runtime: CardRuntime): void {
    const mounted = this.mountedPages.get(runtime.annotation.position.pageIndex);
    if (mounted) this.layoutPage(mounted);
  }

  private resizeEditor(editor: HTMLTextAreaElement): void {
    editor.style.height = "0px";
    const fallback = Math.min(156, Math.max(37, 24 + editor.value.split("\n").length * 18));
    const height = Math.min(156, Math.max(37, editor.scrollHeight || fallback));
    editor.style.height = `${height}px`;
  }

  private setActive(key: string): void {
    this.activeKey = key;
    this.syncActiveCards();
  }

  private setHovered(key?: string): void {
    if (this.hoveredKey === key) return;
    const previous = this.hoveredKey;
    this.hoveredKey = key;
    if (previous) this.adapter.setAnnotationHover(previous, false);
    if (key) this.adapter.setAnnotationHover(key, true);

    for (const runtime of this.cardRuntimes()) {
      runtime.card.classList.toggle("zmm-hovered", runtime.annotation.key === key);
    }
    const lineElements = Array.from(
      this.adapter.document().querySelectorAll(".zmm-line, .zmm-line-dot"),
    ) as unknown as SVGElement[];
    for (const element of lineElements) {
      element.classList.toggle("zmm-hovered", element.dataset.annotationKey === key);
    }
  }

  private syncActiveCards(): void {
    for (const runtime of this.cardRuntimes()) {
      runtime.card.classList.toggle("zmm-active", runtime.annotation.key === this.activeKey);
    }
  }

  private syncCompactNoteIcons(): void {
    this.adapter.setCompactNoteIcons(
      this.compactNoteIcons,
      this.annotations
        .filter((annotation) => annotation.type === "note")
        .map((annotation) => annotation.key),
    );
  }

  private hasBlockingEditor(): boolean {
    return this.cardRuntimes().some(
      (runtime) =>
        runtime.saving || runtime.editor.ownerDocument.activeElement === runtime.editor,
    );
  }

  private flushPendingRefresh(): void {
    if (this.pendingRefresh && !this.hasBlockingEditor()) void this.refresh(true);
  }

  private cardRuntimes(): CardRuntime[] {
    return [...this.mountedPages.values()].flatMap((page) => page.runtimes);
  }

  private get marginExtent(): number {
    return this.renderingPreferences.cardWidth + CARD_GAP_FROM_PAGE;
  }

  private applyCardGeometry(): void {
    const width = `${this.renderingPreferences.cardWidth}px`;
    const gutter = `${this.renderingPreferences.cardWidth + CARD_GAP_FROM_PAGE + EXTRA_VIEWER_GUTTER}px`;
    try {
      const viewer = this.adapter.viewerElement();
      viewer.style.setProperty("--zmm-card-width", width);
      viewer.style.setProperty("--zmm-gutter-width", gutter);
    } catch {
      // Reader dimensions are applied when its viewer becomes available.
    }
    this.overlayRoot?.style.setProperty("--zmm-card-width", width);
    this.overlayRoot?.style.setProperty("--zmm-gutter-width", gutter);
  }

  private ensureStyles(doc: Document): void {
    if (!doc.getElementById(KATEX_STYLE_ID)) {
      const katexStyles = doc.createElement("style");
      katexStyles.id = KATEX_STYLE_ID;
      katexStyles.textContent = KATEX_CSS;
      doc.head.append(katexStyles);
    }
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement("style");
      style.id = STYLE_ID;
      style.textContent = PDF_STYLES;
      doc.head.append(style);
    }
  }

  private ensureOverlayRoot(doc: Document, viewer: HTMLElement): void {
    const host = viewer.closest<HTMLElement>("#viewerContainer")
      ?? viewer.parentElement
      ?? viewer;
    if (!this.overlayRoot) {
      this.overlayRoot = doc.createElement("div");
      this.overlayRoot.className = "zmm-overlay-root";
    }
    if (this.overlayRoot.parentElement !== host) host.append(this.overlayRoot);
    this.applyCardGeometry();
  }

  private positionOverlay(mounted: MountedPage): void {
    const root = this.overlayRoot;
    const host = root?.parentElement;
    if (!root || !host) return;
    if (mounted.overlay.parentElement !== root) root.append(mounted.overlay);

    const pageRect = mounted.handle.element.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const left = pageRect.width || pageRect.height
      ? pageRect.left - hostRect.left + host.scrollLeft - host.clientLeft
      : mounted.handle.element.offsetLeft;
    const top = pageRect.width || pageRect.height
      ? pageRect.top - hostRect.top + host.scrollTop - host.clientTop
      : mounted.handle.element.offsetTop;
    const { width, height } = this.pageDimensions(mounted.handle, pageRect);
    setPixelStyle(mounted.overlay, "left", left);
    setPixelStyle(mounted.overlay, "top", top);
    setPixelStyle(mounted.overlay, "width", width);
    setPixelStyle(mounted.overlay, "height", height);
  }

  private annotationAnchorForHandle(
    annotation: MarginAnnotation,
    handle: PdfPageHandle,
  ): PageAnchor | undefined {
    const anchor = this.compactNoteIcons && annotation.type === "note"
      ? compactNoteAnchor(annotation.position, handle.viewport)
      : annotationAnchor(annotation.position, handle.viewport);
    if (!anchor) return undefined;
    const { width, height } = this.pageDimensions(handle);
    const scaleX = handle.viewport.width > 0 ? width / handle.viewport.width : 1;
    const scaleY = handle.viewport.height > 0 ? height / handle.viewport.height : 1;
    return {
      x: Math.max(0, Math.min(width, anchor.x * scaleX)),
      y: Math.max(0, Math.min(height, anchor.y * scaleY)),
      side: anchor.side,
    };
  }

  private pageDimensions(
    handle: PdfPageHandle,
    rect = handle.element.getBoundingClientRect(),
  ): { width: number; height: number } {
    return {
      width: handle.element.clientWidth || rect.width || handle.viewport.width,
      height: handle.element.clientHeight || rect.height || handle.viewport.height,
    };
  }

  private unmountPage(pageIndex: number): void {
    const mounted = this.mountedPages.get(pageIndex);
    if (!mounted) return;
    for (const runtime of mounted.runtimes) {
      if (runtime.timer) clearTimeout(runtime.timer);
      if (runtime.statusTimer) clearTimeout(runtime.statusTimer);
      if (runtime.expandTimer) clearTimeout(runtime.expandTimer);
      if (runtime.collapseTimer) clearTimeout(runtime.collapseTimer);
    }
    mounted.overlay.remove();
    mounted.handle.element.classList.remove("zmm-page");
    this.mountedPages.delete(pageIndex);
  }

  private removeUi(): void {
    this.unbindInteractionDocument();
    for (const pageIndex of [...this.mountedPages.keys()]) this.unmountPage(pageIndex);
    try {
      const viewer = this.adapter.viewerElement();
      viewer.classList.remove("zmm-viewer");
      viewer.style.removeProperty("--zmm-card-width");
      viewer.style.removeProperty("--zmm-gutter-width");
      this.adapter.document().getElementById(STYLE_ID)?.remove();
      this.adapter.document().getElementById(KATEX_STYLE_ID)?.remove();
    } catch {
      // The reader may already be closed.
    }
    this.overlayRoot?.remove();
    this.overlayRoot = undefined;
  }
}

function typeLabel(type: MarginAnnotation["type"]): string {
  return {
    highlight: "高亮解释",
    underline: "下划线解释",
    note: "独立评论",
    text: "文本批注",
    image: "区域批注",
  }[type];
}

function wrapMarkdownSelection(editor: HTMLTextAreaElement, marker: string): void {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end);
  editor.setRangeText(`${marker}${selected}${marker}`, start, end, "select");
  if (!selected) {
    const cursor = start + marker.length;
    editor.setSelectionRange(cursor, cursor);
  }
}

function measureHeight(card: HTMLElement, value: string): number {
  const measured = card.getBoundingClientRect().height || card.scrollHeight;
  if (measured > 0) return measured;
  return Math.min(210, Math.max(70, 54 + value.split("\n").length * 18));
}

function setPixelStyle(
  element: HTMLElement,
  property: "left" | "top" | "width" | "height",
  value: number,
): void {
  const next = `${value}px`;
  if (element.style[property] !== next) element.style[property] = next;
}
