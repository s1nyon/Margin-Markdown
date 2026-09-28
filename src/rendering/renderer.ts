import createDOMPurify from "dompurify";
import katex from "katex";
import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";

export interface RenderOptions {
  markdown: boolean;
  latex: boolean;
}

export interface RenderingPreferences extends RenderOptions {
  cardWidth: number;
  previewFontSize: number;
  mathScale: number;
  compactHeadings: boolean;
}

const MAX_CACHE_ENTRIES = 200;
const MAX_CACHE_SOURCE_LENGTH = 12_000;
const renderedCache = new Map<string, string>();
const purifiers = new WeakMap<Window, ReturnType<typeof createDOMPurify>>();
const MATH_DELIMITERS = /(\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|(?<!\\)\$(?!\$)([^\n$]+?)\$(?!\$))/g;

const KATEX_OPTIONS = {
  output: "htmlAndMathml" as const,
  throwOnError: true,
  strict: "warn" as const,
  trust: false,
  maxExpand: 1000,
  maxSize: 20,
};

export function renderMarkdown(
  source: string,
  doc: Document,
  options: RenderOptions,
): string {
  const key = `${options.markdown ? 1 : 0}${options.latex ? 1 : 0}\n${source}`;
  const cached = renderedCache.get(key);
  if (cached !== undefined) {
    renderedCache.delete(key);
    renderedCache.set(key, cached);
    return cached;
  }

  let html: string;
  try {
    html = options.markdown
      ? createMarkdownParser(options.latex).render(source)
      : renderPlainText(source, options.latex);
  } catch {
    html = `<pre class="zmm-render-fallback">${escapeHTML(source)}</pre>`;
  }

  const safeHTML = sanitizeHTML(html, doc);
  if (source.length <= MAX_CACHE_SOURCE_LENGTH) {
    renderedCache.set(key, safeHTML);
    if (renderedCache.size > MAX_CACHE_ENTRIES) {
      const oldest = renderedCache.keys().next().value;
      if (oldest !== undefined) renderedCache.delete(oldest);
    }
  }
  return safeHTML;
}

export function clearRenderCache(): void {
  renderedCache.clear();
}

function createMarkdownParser(latex: boolean): MarkdownIt.MarkdownIt {
  const parser = new MarkdownIt({
    html: false,
    breaks: false,
    linkify: false,
    typographer: false,
  });
  parser.validateLink = isAllowedLink;

  const defaultLinkOpen = parser.renderer.rules.link_open;
  parser.renderer.rules.link_open = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index];
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
    return defaultLinkOpen
      ? defaultLinkOpen(tokens, index, renderOptions, env, renderer)
      : renderer.renderToken(tokens, index, renderOptions);
  };

  if (latex) {
    parser.use(texmath, {
      engine: katex,
      delimiters: ["dollars", "brackets"],
      katexOptions: { ...KATEX_OPTIONS, macros: {} },
    });
  }
  return parser;
}

function renderPlainText(source: string, latex: boolean): string {
  if (!latex) return wrapPlainText(source);

  let output = "";
  let cursor = 0;
  MATH_DELIMITERS.lastIndex = 0;
  for (const match of source.matchAll(MATH_DELIMITERS)) {
    const start = match.index ?? 0;
    output += wrapPlainText(source.slice(cursor, start));
    const delimiter = match[0];
    const displayMode = delimiter.startsWith("$$") || delimiter.startsWith("\\[");
    const tex = match[2] ?? match[3] ?? match[4] ?? match[5] ?? "";
    try {
      output += katex.renderToString(tex, {
        ...KATEX_OPTIONS,
        displayMode,
        macros: {},
      });
    } catch {
      output += `<span class="zmm-math-fallback">${escapeHTML(delimiter)}</span>`;
    }
    cursor = start + delimiter.length;
  }
  return output + wrapPlainText(source.slice(cursor));
}

function wrapPlainText(source: string): string {
  return `<span class="zmm-plain-text">${escapeHTML(source).replace(/\r?\n/g, "<br>\n")}</span>`;
}

function sanitizeHTML(html: string, doc: Document): string {
  const view = doc.defaultView;
  if (!view) throw new Error("The annotation preview has no DOM window");
  let purifier = purifiers.get(view);
  if (!purifier) {
    purifier = createDOMPurify(view as any);
    purifiers.set(view, purifier);
  }
  const sanitized = purifier.sanitize(`<div>${html}</div>`, {
    ADD_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "video", "audio"],
    FORBID_ATTR: ["srcdoc"],
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });
  return sanitized.startsWith("<div>") && sanitized.endsWith("</div>")
    ? sanitized.slice(5, -6)
    : sanitized;
}

function isAllowedLink(value: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u0020\u007f]/g, "");
  if (normalized.startsWith("#")) return true;
  const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  return scheme === "http" || scheme === "https" || scheme === "mailto";
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
