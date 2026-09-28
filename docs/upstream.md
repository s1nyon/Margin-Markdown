# Upstream baseline

Margin Markdown imports Zotero Margin Comments by XiaoDuComrade. The baseline commit is `10b69ee652b148ae9fcff8bbadb2ee8d691628ce`, whose commit message is “Release margin comments 0.8.6”. The full commit SHA pins the exact source revision used here.

The baseline is connected to the repository's original `LICENSE`-only commit by the `Import Zotero Margin Comments 0.8.6 baseline` merge commit. This preserves both histories. The upstream remote is named `upstream`; the project repository is `origin`.

The existing margin layout, PDF Reader adapter, annotation storage, card editing, save timing, keyboard controls, type filters, and stress tests come from the imported baseline. Margin Markdown has its own add-on name, ID, preference namespace, runtime resource namespace, visual identity, and cross-platform build. The underlying annotation storage continues to use Zotero's `annotation.comment` plain-text field.

The upstream 0.8.6 source and its historical installer artifacts remain available in Git history for reference, but are removed from the current project tree so they cannot be mistaken for Margin Markdown downloads. New installers are generated from this repository and use the `margin-markdown-<version>.xpi` name.

When syncing later upstream changes, record the source commit and review the Reader adapter and storage changes separately. Keep the upstream copyright and MIT permission notice in distributed copies.
