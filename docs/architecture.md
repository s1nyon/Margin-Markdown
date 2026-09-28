# Architecture

## Current bootstrap

The plugin entry point creates the Zotero add-on instance and registers the Reader controller. The controller owns preference registration, Reader sessions, and annotation notifications. Each Reader session reads supported annotations through `AnnotationStore`, maps PDF positions to page anchors, and manages card layout, leader lines, editing, and saves.

The core layout and annotation model do not depend on Zotero APIs. The Reader adapter contains Zotero 9-specific integration. This is the compatibility boundary for a later Zotero 10 port.

## Markdown rendering

The renderer is a separate module under `src/rendering/`. It receives a source string and render preferences, parses Markdown, renders KaTeX math, and sanitizes the resulting markup before attaching it to the Reader document. It has no storage dependency.

The source editor is a plain text area; the preview is a separate reading surface. The editor retains line breaks, indentation, backslashes, Markdown markers, and formula delimiters. The storage adapter accepts only the source string and writes it to `annotation.comment`. Preview HTML is transient and is never serialized to Zotero.

KaTeX scripts, styles, fonts, and dependency license texts are packaged with the plugin for offline use. Rendering errors fall back to readable source text for the failed formula or the full comment if Markdown rendering fails.

## Layout integration

The existing margin layout measures card heights and places cards around page anchors. Cards default to 300 px wide, adjustable from 260 to 380 px. Right-side cards tuck 100 px into the page's outer blank margin to bring them closer to the printed text; left-side cards remain 18 px outside the page to avoid covering text near the left edge. The viewer gutter still reserves enough room for the cards. Academic Compact typography uses a 1.5 body line height, restrained heading and paragraph spacing, and formula text slightly larger than body text.

Long previews collapse to a 7.5 em reading window with a subtle bottom fade. A 180 ms hover delay avoids expanding cards while the pointer passes over them; leaving starts a 300 ms grace period. Keyboard focus, text selection, and active editing keep the preview open, and the card's footer control can pin it open. Expansion preserves the hovered card's top position and moves later cards down to avoid overlap. Resizing, formula font loading, and font-size changes trigger a fresh measurement and layout pass.

Preview rendering is cached by source and Markdown/math options with a bounded cache size.

## Safety boundaries

Raw HTML is disabled in Markdown. Sanitization runs against the Reader document's own DOM environment, retaining only the markup needed for ordinary Markdown and KaTeX. Links are limited to allowed protocols and opened through Zotero's external-link handling.

## Compatibility

The first supported target is Zotero 9. Reader-specific APIs stay in the adapter. Zotero 10 support will be added after the Zotero 9 renderer and interaction paths are stable.
