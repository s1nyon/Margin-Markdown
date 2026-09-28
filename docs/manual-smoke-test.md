# Manual smoke test

Record the operating system and Zotero version with each run. The first release targets Zotero 9.

## Bootstrap behavior

- Install the versioned Margin Markdown XPI through Zotero's Plugins pane and restart Zotero.
- Confirm the plugin is named **Margin Markdown** and has its own preference pane.
- Open a PDF with highlights and comments; confirm cards appear on both margin sides with leader lines to their annotations.
- Check zoom, rotation, page changes, card hover, native annotation hover, and toolbar visibility toggle.
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

- Confirm headings, emphasis, lists, quote, code, inline math, and display math render at a compact size.
- Click the card body and confirm the editor contains the exact Markdown source, including backslashes and blank lines.
- Type a longer note; confirm autosave does not exit editing and the stored comment remains source text.
- Click away and reopen; confirm the source round-trips without HTML markup or whitespace loss.
- Click a rendered link; confirm it opens externally without entering edit mode or navigating the PDF reader.
- Test malformed math, raw HTML, a tall equation, a long code line, and a dense group of Markdown comments.
- Disable Markdown and math rendering individually, adjust preview and math sizes, and confirm changes do not modify stored comments.
- Disconnect the network and reopen the PDF; confirm local KaTeX fonts still render.

## Remaining platform checks

- Install, restart, and exercise the XPI on macOS, Windows, and Linux Zotero 9 builds.
- Verify Zotero 10 only after a separate compatibility implementation is added.
