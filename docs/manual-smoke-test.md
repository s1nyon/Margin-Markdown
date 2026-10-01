# Manual smoke test

Record the operating system and Zotero version with each run. The supported range is Zotero 9–10.

## Windows Zotero 10.0.5 integration run

Version 0.1.5 passed on 2026-10-01 using the installed Zotero executable and a separate profile and data directory. Checks covered addon activation and preferences, highlight and note cards, leader lines, Markdown and KaTeX, embedded fonts, exact source saving to the database, autosave, zoom and rotation, native annotation selection and type filtering, compact note icon geometry and restoration, toolbar toggling, disabling cleanup, and re-enabling. The user's library was not used for these checks.

## Bootstrap behavior

- Install the versioned Margin Markdown XPI through Zotero's Plugins pane and restart Zotero.
- Confirm the plugin is named **Margin Markdown** and has its own preference pane.
- Open a PDF with highlights and comments; confirm cards appear on both margin sides with leader lines to their annotations.
- Check zoom, rotation, page changes, card hover, native annotation hover, and toolbar visibility toggle.
- Confirm cards use the modern rounded border and soft shadow, and start at a readable width of about 300 px.
- Confirm right-side cards sit inside the page's outer blank margin and closer to the printed text, without covering it. Left-side cards should remain outside the page edge.
- In preferences, move the card-width slider from 260 to 380 px; confirm cards and the PDF page gutter resize without clipping either margin.
- Move the pointer briefly across a long Markdown card; confirm it does not open immediately. Hold for about 200 ms; confirm the full card opens without a click and its top edge stays in place.
- Move away; confirm the card remains open briefly, then collapses after about 300 ms. Use **固定展开** to keep one card open, and **取消固定** to return it to hover behavior.
- Select text in an expanded preview and keyboard-focus its controls; confirm the card stays open until selection or focus leaves.
- Edit a comment; confirm the 700 ms background save, `Cmd/Ctrl + Enter`, `Esc`, click-away save, selection, and read-only behavior.
- Create a dense set of comments; check overflow expansion, scrolling, and leader-line positions.
- Switch Zotero's light and dark themes and change annotation type filters.

## Markdown and math preview

Use this source as an annotation comment:

````markdown
### Why can this be precomputed offline?

The heuristic depends on the vehicle's relative pose:

\[
(\Delta x, \Delta y, \Delta \theta)
\]

Therefore:

1. Fix the goal at $(0,0,0)$.
2. Precompute the cost-to-go.

> The obstacle map is handled separately.

Inline math: $h(n)$.

```text
world frame -> goal frame -> lookup table
```
````

- Confirm headings, emphasis, lists, quote, code, inline math, and display math render at a compact size. Body text should have comfortable line spacing, with formulas slightly larger.
- Click the card body and confirm the editor contains the exact Markdown source, including backslashes and blank lines.
- Type a longer note; confirm autosave does not exit editing and the stored comment remains source text.
- Click away and reopen; confirm the source round-trips without HTML markup or whitespace loss.
- Click a rendered link; confirm it opens externally without entering edit mode or navigating the PDF reader.
- Test malformed math, raw HTML, a tall equation, a long code line, and a dense group of Markdown comments. Confirm long previews fade at the collapsed edge and do not overlap neighboring cards when expanded.
- Disable Markdown and math rendering individually, adjust preview and math sizes, and confirm changes do not modify stored comments.
- Disconnect the network and reopen the PDF; confirm local KaTeX fonts still render.

## Remaining platform checks

- Install, restart, and exercise the XPI on other Zotero 9 and 10 builds on macOS, Windows, and Linux.
