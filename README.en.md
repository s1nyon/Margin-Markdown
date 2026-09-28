<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/wordmark-dark.svg">
    <img src="docs/assets/brand/wordmark-light.svg" alt="Margin Markdown" width="360">
  </picture>
  <h1>Markdown notes in Zotero PDF margins</h1>
  <p>Read rendered Markdown and math, then edit the original text in place.</p>
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

## Features

- Cards connect to their PDF annotations and are arranged automatically; scroll through the margin when there are many.
- KaTeX renders inline and display equations locally, including offline.
- Hover over a long card to expand it. Text selection and keyboard focus keep it open; cards can also be pinned open.
- Click a card's body to edit the original Markdown text.

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

There is no XPI on GitHub Releases yet. Build one from source using the steps below.

Margin Markdown has its own add-on ID, but it shares the PDF margin with Zotero Margin Comments. Enable only one of the two to avoid duplicate cards.

## Preferences

The Margin Markdown preferences let you adjust:

| Setting | Range | Default |
| --- | --- | --- |
| Card width | 260–380 px | 300 px |
| Preview text size | 80–160% | 100% |
| Math size | 80–160% | 100% |

You can also filter annotation types, toggle Markdown or LaTeX rendering, and optionally shrink PDF note icons. Press `Cmd/Ctrl + Enter` to save an edit, or `Esc` to discard unsaved changes.

## Comment storage

Zotero's `annotation.comment` always stores the original Markdown source. Generated HTML is used only for display and is never written to annotation data. Comments remain readable as plain text if you disable or remove the add-on.

## Compatibility

This version targets **Zotero 9** and has not been adapted for Zotero 10. Automated tests cover rendering, layout, and saving. Installation and use on macOS, Windows, and Linux still need to be checked with the [manual test guide](docs/manual-smoke-test.md).

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

Margin Markdown builds on [Zotero Margin Comments 0.8.6 by XiaoDuComrade](docs/upstream.md). The upstream copyright and MIT terms are in [LICENSE](LICENSE); dependency licenses are listed in [third-party notices](THIRD_PARTY_NOTICES.md).

Maintained by **s1nyon** under the MIT License. Report issues on [GitHub Issues](https://github.com/s1nyon/Margin-Markdown/issues).
