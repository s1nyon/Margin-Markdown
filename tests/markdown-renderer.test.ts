import { describe, expect, it } from "vitest";
import { clearRenderCache, renderMarkdown } from "../src/rendering/renderer";

describe("annotation Markdown renderer", () => {
  it("renders academic Markdown and all supported math delimiters", () => {
    const html = renderMarkdown(
      "## 标题\n\n**重点** and *emphasis*\n\n$h(n)$ and \\\(x\\\)\n\n$$f(x)=x^2$$\n\n\\[\\Delta x\\]",
      document,
      { markdown: true, latex: true },
    );
    const preview = document.createElement("div");
    preview.innerHTML = html;

    expect(preview.querySelector("h2")?.textContent).toBe("标题");
    expect(preview.querySelector("strong")?.textContent).toBe("重点");
    expect(preview.querySelector("em")?.textContent).toBe("emphasis");
    expect(preview.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(4);
    expect(preview.textContent).toContain("h(n)");
    expect(preview.textContent).toContain("Δx");
  });

  it("escapes raw HTML and removes unsafe links while retaining safe links", () => {
    const html = renderMarkdown(
      '<img src=x onerror="alert(1)"> [bad](javascript:alert(1)) [paper](https://example.org/paper)',
      document,
      { markdown: true, latex: false },
    );
    const preview = document.createElement("div");
    preview.innerHTML = html;

    expect(preview.querySelector("img, script, [onerror]")).toBeNull();
    expect(preview.querySelector('a[href^="javascript:"]')).toBeNull();
    const paper = preview.querySelector<HTMLAnchorElement>('a[href="https://example.org/paper"]');
    expect(paper?.target).toBe("_blank");
    expect(paper?.rel).toContain("noopener");
    expect(preview.textContent).toContain("<img");
  });

  it("leaves math source visible when math rendering is disabled", () => {
    const html = renderMarkdown("$x^2$ and **plain**", document, {
      markdown: true,
      latex: false,
    });
    const preview = document.createElement("div");
    preview.innerHTML = html;

    expect(preview.querySelector(".katex")).toBeNull();
    expect(preview.querySelector("strong")?.textContent).toBe("plain");
    expect(preview.textContent).toContain("$x^2$");
  });

  it("renders plain text with math but does not apply Markdown when Markdown is disabled", () => {
    const html = renderMarkdown("*literal* $x^2$", document, {
      markdown: false,
      latex: true,
    });
    const preview = document.createElement("div");
    preview.innerHTML = html;

    expect(preview.querySelector("em")).toBeNull();
    expect(preview.querySelector(".katex")).not.toBeNull();
    expect(preview.textContent).toContain("*literal*");
  });

  it("falls back to readable text for malformed formulas and caches repeated renders", () => {
    clearRenderCache();
    const source = "Before $\\frac{$ after";
    const first = renderMarkdown(source, document, { markdown: true, latex: true });
    const second = renderMarkdown(source, document, { markdown: true, latex: true });
    const preview = document.createElement("div");
    preview.innerHTML = first;

    expect(second).toBe(first);
    expect(preview.textContent).toContain("Before");
    expect(preview.textContent).toContain("\\frac{");
    expect(preview.textContent).toContain("after");
  });
});
