# Third-party notices

## Zotero Margin Comments

Margin Markdown is derived from Zotero Margin Comments by XiaoDuComrade, licensed under the MIT License. The imported baseline is upstream commit `10b69ee652b148ae9fcff8bbadb2ee8d691628ce` (release 0.8.6). Its copyright notice and MIT permission are included in [LICENSE](LICENSE). See [docs/upstream.md](docs/upstream.md) for the imported history and the files adapted in this project.

## Runtime dependencies

The Markdown and math renderer includes KaTeX, markdown-it, markdown-it-texmath, and DOMPurify. markdown-it bundles argparse, entities, linkify-it, mdurl, punycode.js, and uc.micro. Their license texts are included in the installer's `content/vendor/licenses/` directory. The KaTeX stylesheet and WOFF2 fonts are embedded in the runtime bundle so they work offline inside Zotero's PDF reader.
