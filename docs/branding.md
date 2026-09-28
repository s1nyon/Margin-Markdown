# Margin Markdown brand

## Idea

The mark pairs an open `M` with a slim margin rail and two short note ticks. The letter gives the project its own recognizable shape; the rail and ticks recall the connection between a passage and its note. The icon remains legible without text at toolbar size.

## Color palette

| Use | Color | Hex |
| --- | --- | --- |
| Ink and primary text | Ink navy | `#18233A` |
| Primary accent | Indigo | `#4F46E5` |
| Secondary accent | Teal | `#0F766E` |
| Light canvas | Slate 50 | `#F8FAFC` |
| Supporting text | Slate 600 | `#475569` |
| Dark canvas | Deep navy | `#101827` |

Dark wordmarks use pale text and lighter accent colors. PDF annotation cards keep the annotation's own Zotero color; brand accents are reserved for navigation, logos, and illustrative artwork.

## Assets

- `assets/brand/mark.svg`: transparent full-color symbol.
- `assets/brand/wordmark-light.svg`: symbol and wordmark for light surfaces.
- `assets/brand/wordmark-dark.svg`: symbol and wordmark for dark surfaces.
- `assets/brand/hero-light.svg` and `hero-dark.svg`: illustrative README previews, not Zotero screenshots.
- `../addon/content/icons/margin-markdown.svg`: full-color add-on icon used by the manifest and preference pane.

The Reader toolbar uses a small monochrome version of the same `M` and margin rail, drawn inline in `src/zotero/plugin-controller.ts` so it inherits the host toolbar's current text color. When changing the mark, update that path alongside the SVG files and inspect it at 16–24 px. Check the add-on icon at 48 and 96 px, and the wordmarks at both README display size and a narrow viewport.

SVGs use embedded paths, text, and colors. They have no remote assets, scripts, embedded HTML, or font downloads. The README hero art is kept in `docs/assets/brand/` and is not included in the XPI.

## Writing and usage

- Use **Margin Markdown** as the product name.
- Chinese short description: **Zotero PDF 页边的 Markdown 批注**
- English short description: **Markdown notes in Zotero PDF margins**
- Describe the interface illustration as a preview; do not call it a Zotero screenshot.
- Keep upstream credit and third-party license notices intact when changing visual assets or packaging.
