import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PluginController } from "../src/zotero/plugin-controller";

describe("PluginController annotation type settings", () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
    vi.stubGlobal("Zotero", {
      Prefs: {
        get: vi.fn(() => true),
        set: vi.fn(),
      },
      PreferencePanes: {
        register: vi.fn().mockResolvedValue("margin-markdown-preferences"),
        unregister: vi.fn(),
      },
      Reader: { _readers: [] },
      logError: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("registers a preference pane and persists type changes immediately", async () => {
    const controller = new PluginController() as any;
    const session = {
      setVisibleTypes: vi.fn(),
      setCompactNoteIcons: vi.fn(),
      setRenderingPreferences: vi.fn(),
    };
    controller.sessions.set({}, session);
    await controller.registerPreferencePane();

    expect((Zotero as any).PreferencePanes.register).toHaveBeenCalledWith({
      pluginID: "margin-markdown@s1nyon",
      id: "margin-markdown-preferences",
      label: "Margin Markdown",
      src: "chrome://marginmarkdown/content/preferences.xhtml",
      image: "chrome://marginmarkdown/content/icons/margin-markdown.svg",
      stylesheets: ["chrome://marginmarkdown/content/preferences.css"],
    });

    const pane = document.createElement("section");
    pane.id = "zotero-prefpane-marginmarkdown";
    for (const type of ["highlight", "underline", "note", "text", "image"]) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.zmmType = type;
      pane.append(checkbox);
    }
    const compactNoteIcons = document.createElement("input");
    compactNoteIcons.type = "checkbox";
    compactNoteIcons.dataset.zmmSetting = "compact-note-icons";
    pane.append(compactNoteIcons);
    for (const key of ["markdown", "latex", "compactHeadings"]) {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.zmmRenderSetting = key;
      pane.append(input);
    }
    for (const key of ["cardWidth", "previewFontSize", "mathScale"]) {
      const input = document.createElement("input");
      input.type = "range";
      input.min = key === "cardWidth" ? "260" : "80";
      input.max = key === "cardWidth" ? "380" : "160";
      input.step = key === "cardWidth" ? "10" : "5";
      input.dataset.zmmRenderSetting = key;
      pane.append(input);
      const output = document.createElement("output");
      output.dataset.zmmRenderOutput = key;
      pane.append(output);
    }
    document.body.append(pane);
    controller.registerPreferencePaneWindow(window);

    const checkboxes = pane.querySelectorAll<HTMLInputElement>("[data-zmm-type]");
    expect(checkboxes).toHaveLength(5);
    expect(
      (Array.from(checkboxes) as HTMLInputElement[]).map(
        (checkbox) => checkbox.dataset.zmmType,
      ),
    ).toEqual(["highlight", "underline", "note", "text", "image"]);

    const underline = pane.querySelector<HTMLInputElement>(
      '[data-zmm-type="underline"]',
    )!;
    underline.click();

    expect(underline.checked).toBe(false);
    expect((Zotero as any).Prefs.set).toHaveBeenCalledWith(
      "extensions.zotero.marginmarkdown.types.underline",
      false,
      true,
    );
    const visibleTypes = session.setVisibleTypes.mock.calls.at(-1)![0] as Set<string>;
    expect(visibleTypes.has("underline")).toBe(false);
    expect(visibleTypes.has("highlight")).toBe(true);

    expect(compactNoteIcons.checked).toBe(false);
    compactNoteIcons.click();
    expect((Zotero as any).Prefs.set).toHaveBeenCalledWith(
      "extensions.zotero.marginmarkdown.compactNoteIcons",
      true,
      true,
    );
    expect(session.setCompactNoteIcons).toHaveBeenLastCalledWith(true);

    const markdown = pane.querySelector<HTMLInputElement>(
      '[data-zmm-render-setting="markdown"]',
    )!;
    expect(markdown.checked).toBe(true);
    markdown.click();
    expect((Zotero as any).Prefs.set).toHaveBeenCalledWith(
      "extensions.zotero.marginmarkdown.rendering.markdown",
      false,
      true,
    );
    expect(session.setRenderingPreferences.mock.calls.at(-1)?.[0]).toMatchObject({
      markdown: false,
      latex: true,
    });

    const previewSize = pane.querySelector<HTMLInputElement>(
      '[data-zmm-render-setting="previewFontSize"]',
    )!;
    previewSize.value = "115";
    previewSize.dispatchEvent(new Event("input", { bubbles: true }));
    expect((Zotero as any).Prefs.set).toHaveBeenCalledWith(
      "extensions.zotero.marginmarkdown.rendering.previewFontSize",
      115,
      true,
    );
    expect(
      pane.querySelector('[data-zmm-render-output="previewFontSize"]')?.textContent,
    ).toBe("115%");

    const cardWidth = pane.querySelector<HTMLInputElement>(
      '[data-zmm-render-setting="cardWidth"]',
    )!;
    cardWidth.value = "340";
    cardWidth.dispatchEvent(new Event("input", { bubbles: true }));
    expect((Zotero as any).Prefs.set).toHaveBeenCalledWith(
      "extensions.zotero.marginmarkdown.rendering.cardWidth",
      340,
      true,
    );
    expect(
      pane.querySelector('[data-zmm-render-output="cardWidth"]')?.textContent,
    ).toBe("340px");
    expect(session.setRenderingPreferences.mock.calls.at(-1)?.[0]).toMatchObject({
      cardWidth: 340,
    });
  });
});
