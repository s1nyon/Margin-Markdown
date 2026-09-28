# Margin Markdown

Margin Markdown displays Zotero PDF annotation comments as compact margin cards connected to their page highlights. The project is based on Zotero Margin Comments 0.8.6 and is adding Markdown and LaTeX reading previews while keeping annotation comments as plain source text.

## Features

- Left and right margin cards with leader lines, collision avoidance, and dense-comment scrolling.
- Separate Markdown reading preview and plain-text source editor.
- KaTeX support for `$...$`, `$$...$$`, `\(...\)`, and `\[...\]`.
- Local KaTeX styles, fonts, and dependency notices in the installer.
- Adjustable preview and formula size, compact headings, and expandable previews.
- Safe HTML sanitization, link handling, and readable fallback for invalid math.
- Zotero 9 support. Zotero 10 is planned for a later compatibility pass.

## Install

Download the versioned `.xpi` from the repository's Releases page, then in Zotero open **Tools → Plugins**, use the gear menu, and choose **Install Plugin From File…**. Restart Zotero if prompted.

Margin Markdown has a separate add-on ID from Margin Comments. They may both be installed, but enable only one at a time because both display cards in the PDF margins.

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

`pnpm package` writes `dist/margin-markdown-<version>.xpi`. `pnpm verify` checks the XPI contents, add-on identity, version, bundled KaTeX assets, notices, and SHA-256.

## Data handling

The value stored in Zotero's `annotation.comment` remains plain text. Markdown and formula markup are rendered only for display; generated HTML is never written to Zotero. This keeps comments readable by Zotero and other tools when this plugin is disabled or removed.

See [Architecture](docs/architecture.md), [Upstream and licensing](docs/upstream.md), [Third-party notices](THIRD_PARTY_NOTICES.md), and the [manual smoke test](docs/manual-smoke-test.md).
