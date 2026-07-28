import type { ViewportLike } from "../core/types";

export interface PdfPageHandle {
  pageIndex: number;
  element: HTMLElement;
  viewport: ViewportLike;
  scale: number;
}

type Cleanup = () => void;
const NATIVE_HOVER_STYLE_ID = "zmc-native-hover-styles";
const NATIVE_HOVER_STYLES = `
[data-annotation-id].zmc-native-hover {
  filter: brightness(.9) saturate(1.22) drop-shadow(0 1px 1.5px rgba(0, 0, 0, .28));
  scale: 1.018;
  transform-box: fill-box;
  transform-origin: center;
  transition: filter .14s ease, scale .14s ease;
}
`;

export class Zotero9ReaderAdapter {
  private pdfWindow?: Window & Record<string, any>;
  private pdfDocument?: Document;
  private pdfViewer?: any;
  private internalReader?: any;
  private primaryView?: any;
  private cleanups: Cleanup[] = [];
  private hoveredAnnotationKey?: string;
  private hoveredAnnotationElements: Element[] = [];
  private nativeHoverStyle?: HTMLStyleElement;

  constructor(readonly reader: any) {}

  async ready(timeoutMs = 10000): Promise<void> {
    await promiseLike(this.reader?._initPromise);
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      this.internalReader = this.reader?._internalReader;
      this.primaryView = this.internalReader?._primaryView;
      if (this.primaryView) break;
      await delay(30);
    }
    if (!this.primaryView) throw new Error("没有找到 Zotero PDF 主视图");

    // Zotero 9.0.6 exposes internalReader.initializedPromise, but it can remain
    // pending even after the PDF view is fully usable. Zotero itself waits for
    // the concrete primary view instead, so do the same here.
    await promiseLike(this.primaryView?.initializedPromise);

    this.pdfWindow = this.primaryView?._iframeWindow as Window & Record<string, any>;
    this.pdfDocument = this.primaryView?._iframeDocument ?? this.pdfWindow?.document;
    const application = this.pdfWindow?.PDFViewerApplication;
    await promiseLike(application?.initializedPromise);
    this.pdfViewer = application?.pdfViewer;
    await promiseLike(this.pdfViewer?.pagesPromise);

    if (!this.pdfDocument || !this.pdfViewer) {
      throw new Error("Zotero PDF.js 视图尚未就绪");
    }
  }

  viewerElement(): HTMLElement {
    const viewer = this.pdfDocument?.getElementById("viewer");
    if (!viewer || !("classList" in viewer) || !("querySelectorAll" in viewer)) {
      throw new Error("没有找到 PDF 页面容器");
    }
    return viewer as HTMLElement;
  }

  document(): Document {
    if (!this.pdfDocument) throw new Error("ReaderAdapter 尚未就绪");
    return this.pdfDocument;
  }

  page(pageIndex: number): PdfPageHandle | undefined {
    const pageView = this.pdfViewer?.getPageView?.(pageIndex);
    const element = pageView?.div as HTMLElement | undefined;
    const viewport = pageView?.viewport as ViewportLike | undefined;
    if (!element || !viewport) return undefined;
    const rawScale = Number(this.pdfViewer?.currentScale ?? pageView?.scale ?? 1);
    const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;
    return { pageIndex, element, viewport, scale };
  }

  pageCount(): number {
    return Number(this.pdfViewer?.pagesCount ?? this.pdfViewer?._pages?.length ?? 0);
  }

  currentPageIndex(): number {
    return Math.max(0, Number(this.pdfViewer?.currentPageNumber ?? 1) - 1);
  }

  onLayoutChange(callback: (reason: string) => void): void {
    const eventBus = this.pdfWindow?.PDFViewerApplication?.eventBus;
    for (const eventName of [
      "pagerendered",
      "scalechanging",
      "rotationchanging",
      "updateviewarea",
      "pagesloaded",
    ]) {
      const schedule = () => callback(eventName);
      eventBus?.on?.(eventName, schedule);
      this.cleanups.push(() => eventBus?.off?.(eventName, schedule));
    }

    const resize = () => callback("resize");
    this.pdfWindow?.addEventListener("resize", resize);
    this.cleanups.push(() => this.pdfWindow?.removeEventListener("resize", resize));
  }

  onAnnotationVisibilityChange(callback: () => void): void {
    const internalReader = this.internalReader;
    const originalUpdateState = internalReader?._updateState;
    if (typeof originalUpdateState === "function") {
      let active = true;
      const patchedUpdateState = function (
        this: any,
        state: Record<string, unknown> | undefined,
        ...rest: unknown[]
      ) {
        const result = originalUpdateState.call(this, state, ...rest);
        if (
          active &&
          state &&
          (Object.prototype.hasOwnProperty.call(state, "annotations") ||
            Object.prototype.hasOwnProperty.call(state, "showAnnotations"))
        ) {
          callback();
        }
        return result;
      };

      try {
        internalReader._updateState = patchedUpdateState;
        if (internalReader._updateState === patchedUpdateState) {
          this.cleanups.push(() => {
            active = false;
            if (internalReader._updateState === patchedUpdateState) {
              internalReader._updateState = originalUpdateState;
            }
          });
          return;
        }
      } catch {
        // Some cross-window wrappers can reject method replacement. Poll below.
      }
      active = false;
    }

    const pdfWindow = this.pdfWindow;
    if (!pdfWindow) return;
    let previous = this.annotationVisibilitySignature();
    const timer = pdfWindow.setInterval(() => {
      const next = this.annotationVisibilitySignature();
      if (next === previous) return;
      previous = next;
      callback();
    }, 250);
    this.cleanups.push(() => pdfWindow.clearInterval(timer));
  }

  onNativeSelectionChange(callback: (ids: string[]) => void): void {
    const handler = () => {
      this.pdfWindow?.setTimeout(() => callback(this.selectedAnnotationIDs()), 0);
    };
    this.pdfDocument?.addEventListener("pointerup", handler, true);
    this.pdfDocument?.addEventListener("keyup", handler, true);
    this.cleanups.push(() => {
      this.pdfDocument?.removeEventListener("pointerup", handler, true);
      this.pdfDocument?.removeEventListener("keyup", handler, true);
    });
  }

  selectedAnnotationIDs(): string[] {
    const ids = this.internalReader?._state?.selectedAnnotationIDs;
    return Array.isArray(ids) ? ids.map(String) : [];
  }

  visibleAnnotationIDs(): ReadonlySet<string> | undefined {
    const state = this.internalReader?._state;
    const annotations = state?.annotations;
    if (!Array.isArray(annotations)) return undefined;
    if (state?.showAnnotations === false) return new Set<string>();

    const ids = new Set<string>();
    for (const annotation of annotations) {
      if (!annotation || annotation._hidden) continue;
      const id = annotation.id ?? annotation.key;
      if (id !== undefined && id !== null) ids.add(String(id));
    }
    return ids;
  }

  selectAnnotation(key: string): void {
    this.internalReader?.setSelectedAnnotations?.([key]);
    void this.reader?.navigate?.({ annotationID: key });
  }

  centerCurrentPageHorizontally(): void {
    const viewer = this.viewerElement();
    const viewport = viewer.closest<HTMLElement>("#viewerContainer")
      ?? viewer.parentElement;
    if (!viewport) return;

    const currentPageNumber = Number(this.pdfViewer?.currentPageNumber ?? 1);
    const pageView = this.pdfViewer?.getPageView?.(
      Math.max(0, currentPageNumber - 1),
    );
    const page = pageView?.div as HTMLElement | undefined;
    if (!page) return;

    const viewportRect = viewport.getBoundingClientRect();
    const pageRect = page.getBoundingClientRect();
    if (!(pageRect.width || pageRect.height)) return;
    const viewportWidth = viewport.clientWidth || viewportRect.width;
    if (!(viewportWidth > 0)) return;

    const viewportCenter = viewportRect.left + viewport.clientLeft + viewportWidth / 2;
    const pageCenter = pageRect.left + pageRect.width / 2;
    const delta = pageCenter - viewportCenter;
    if (Number.isFinite(delta) && Math.abs(delta) > 0.5) {
      viewport.scrollLeft += delta;
    }
  }

  setAnnotationHover(key: string, hovered: boolean): void {
    if (!hovered && this.hoveredAnnotationKey !== key) return;
    this.clearAnnotationHover();
    if (!hovered) return;

    this.hoveredAnnotationKey = key;
    this.ensureNativeHoverStyle();
    this.hoveredAnnotationElements = this.nativeAnnotationElements(key);
    for (const element of this.hoveredAnnotationElements) {
      element.classList.add("zmc-native-hover");
    }
  }

  scheduleAnimationFrame(callback: () => void): Cleanup {
    const requestFrame = this.pdfWindow?.requestAnimationFrame;
    const cancelFrame = this.pdfWindow?.cancelAnimationFrame;
    if (typeof requestFrame === "function") {
      const id = requestFrame.call(this.pdfWindow, callback);
      return () => cancelFrame?.call(this.pdfWindow, id);
    }
    const timer = setTimeout(callback, 16);
    return () => clearTimeout(timer);
  }

  scheduleIdleCallback(callback: () => void, timeoutMs = 500): Cleanup {
    const requestIdle = this.pdfWindow?.requestIdleCallback;
    const cancelIdle = this.pdfWindow?.cancelIdleCallback;
    if (typeof requestIdle === "function") {
      const id = requestIdle.call(this.pdfWindow, callback, { timeout: timeoutMs });
      return () => cancelIdle?.call(this.pdfWindow, id);
    }
    const pdfWindow = this.pdfWindow;
    if (pdfWindow) {
      const timer = pdfWindow.setTimeout(callback, 32);
      return () => pdfWindow.clearTimeout(timer);
    }
    const timer = setTimeout(callback, 32);
    return () => clearTimeout(timer);
  }

  destroy(): void {
    this.clearAnnotationHover();
    this.nativeHoverStyle?.remove();
    this.nativeHoverStyle = undefined;
    for (const cleanup of this.cleanups.splice(0)) {
      try {
        cleanup();
      } catch {
        // Reader teardown can leave dead cross-compartment wrappers.
      }
    }
    this.pdfViewer = undefined;
    this.pdfDocument = undefined;
    this.pdfWindow = undefined;
    this.primaryView = undefined;
    this.internalReader = undefined;
  }

  private nativeAnnotationElements(key: string): Element[] {
    const roots = [
      this.primaryView?._annotationRenderRootEl,
      this.primaryView?._annotationShadowRoot,
      this.pdfDocument,
    ].filter((root): root is ParentNode => Boolean(root?.querySelectorAll));
    const matches = new Set<Element>();
    for (const root of roots) {
      const elements = Array.from(
        root.querySelectorAll("[data-annotation-id]"),
      ) as unknown as Element[];
      for (const element of elements) {
        if (element.getAttribute("data-annotation-id") !== key) continue;
        const ancestor = element.parentElement?.closest("[data-annotation-id]");
        if (ancestor?.getAttribute("data-annotation-id") === key) continue;
        matches.add(element);
      }
    }
    return [...matches];
  }

  private annotationVisibilitySignature(): string {
    const state = this.internalReader?._state;
    const annotations = state?.annotations;
    if (!Array.isArray(annotations)) return "unavailable";
    return `${state?.showAnnotations !== false ? 1 : 0}:${annotations
      .map((annotation: any) => {
        const id = annotation?.id ?? annotation?.key ?? "";
        return `${String(id)}:${annotation?._hidden ? 1 : 0}`;
      })
      .join("|")}`;
  }

  private ensureNativeHoverStyle(): void {
    const shadow = this.primaryView?._annotationShadowRoot as ShadowRoot | undefined;
    if (!shadow || shadow.getElementById(NATIVE_HOVER_STYLE_ID)) return;
    const style = this.pdfDocument?.createElement("style");
    if (!style) return;
    style.id = NATIVE_HOVER_STYLE_ID;
    style.textContent = NATIVE_HOVER_STYLES;
    shadow.append(style);
    this.nativeHoverStyle = style;
  }

  private clearAnnotationHover(): void {
    for (const element of this.hoveredAnnotationElements) {
      element.classList.remove("zmc-native-hover");
    }
    this.hoveredAnnotationElements = [];
    this.hoveredAnnotationKey = undefined;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function promiseLike(value: unknown): Promise<unknown> {
  return value && typeof (value as PromiseLike<unknown>).then === "function"
    ? Promise.resolve(value)
    : Promise.resolve();
}
