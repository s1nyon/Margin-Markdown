<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/wordmark-dark.svg">
    <img src="docs/assets/brand/wordmark-light.svg" alt="Margin Markdown" width="360">
  </picture>
  <h1>Keep your thinking beside the paper.</h1>
  <p>Read Markdown and mathematical notation in the margins of Zotero PDFs, and keep your research notes clear and editable.</p>
  <p><a href="README.md">简体中文</a> · <a href="#install-and-get-started">Install</a> · <a href="docs/manual-smoke-test.md">Manual test guide (Chinese)</a> · <a href="https://github.com/s1nyon/Margin-Markdown/issues">Report an issue</a></p>
  <p>
    <a href="https://www.zotero.org/support/" aria-label="Zotero 9"><img alt="Zotero 9" src="https://img.shields.io/badge/Zotero-9-4f46e5?style=flat-square"></a>
    <img alt="Markdown and LaTeX" src="https://img.shields.io/badge/Markdown%20%2B-LaTeX-0f766e?style=flat-square">
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-64748b?style=flat-square"></a>
  </p>
</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/hero-dark.svg">
  <img src="docs/assets/brand/hero-light.svg" alt="Interface preview: a highlighted passage in a research paper connects to a margin note with formatted Markdown and a rendered equation.">
</picture>

<p align="center"><sub>Illustrative interface preview · Not a screenshot from Zotero</sub></p>

Margin Markdown puts your notes beside the paper. Read formatted Markdown and math in the margin, then switch to the original source when you edit. The paper, explanation, and derivation stay together.

## Made for reading

- **Stay with the paper:** margin cards connect to PDF annotations and make dense notes easier to navigate.
- **Read the math in place:** KaTeX renders inline and display equations locally, including offline.
- **Expand long notes on demand:** hover to open a card; selection and keyboard focus keep it open, or pin it open yourself.
- **Keep the source editable:** the reading view is formatted, while editing always shows the original Markdown.

### Markdown and math

```markdown
### Why take the maximum?

Neither heuristic overestimates the remaining cost, so we can use:

\[
h(n) = \max(h_1(n), h_2(n))
\]

Inline math works too: $h(n) \leq h^*(n)$.
```

Supported Markdown includes headings, emphasis, lists, quotes, code, and links. Math delimiters include `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`.

## Install and get started

1. In Zotero 9, open **Tools → Plugins** and choose **Install Plugin From File…** from the gear menu.
2. Select the Margin Markdown `.xpi` and restart Zotero if prompted.
3. Open a PDF and add comments to Zotero annotations; Margin Markdown displays them beside the page.
4. Hover over a long card to expand it. Click its body to edit the Markdown source.

**There is no public XPI release on GitHub yet.** Developers can build a test installer with the commands below. Published versions will appear on [Releases](https://github.com/s1nyon/Margin-Markdown/releases). Do not install older upstream packages from Git history.

Margin Markdown has its own add-on ID, but it shares the PDF margin with Zotero Margin Comments. Enable only one of the two to avoid duplicate cards.

## Tune the reading view

The Margin Markdown preferences let you adjust:

| Setting | Range | Default |
| --- | --- | --- |
| Card width | 260–380 px | 300 px |
| Preview text size | 80–160% | 100% |
| Math size | 80–160% | 100% |

You can also filter annotation types, toggle Markdown or LaTeX rendering, and optionally shrink PDF note icons. Press `Cmd/Ctrl + Enter` to save an edit, or `Esc` to discard unsaved changes.

## Your comments stay as text

Zotero's `annotation.comment` always stores the original Markdown source. Generated HTML is used only for display and is never written to annotation data. Comments remain readable as plain text if you disable or remove the add-on.

## Compatibility

The current target is **Zotero 9**. Zotero 10 has not been adapted yet. Automated tests cover core rendering, layout, and save behavior; installation and hands-on use on macOS, Windows, and Linux still need separate checks using the [manual test guide](docs/manual-smoke-test.md).

## Build from source

Requirements: Node.js 22.8 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm stress
pnpm build
pnpm package
pnpm verify
```

`pnpm package` creates `dist/margin-markdown-<version>.xpi`. `pnpm verify` checks the add-on ID, version, offline KaTeX fonts, license files, and installer checksum.

See the [architecture guide](docs/architecture.md) for code boundaries and data handling, the [brand guide](docs/branding.md) for logo and color usage, and the [manual test guide (Chinese)](docs/manual-smoke-test.md) for Reader checks.

## Credits and license

Margin Markdown builds on [Zotero Margin Comments 0.8.6 by XiaoDuComrade](docs/upstream.md). Thanks to the upstream author and the maintainers of Markdown, KaTeX, DOMPurify, and other dependencies. Upstream attribution and the MIT terms are preserved in [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).

Maintained by **s1nyon** and released under the MIT License. Suggestions and bug reports are welcome in [GitHub Issues](https://github.com/s1nyon/Margin-Markdown/issues).
