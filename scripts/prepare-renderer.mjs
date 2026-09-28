import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const katexRoot = path.join(root, "node_modules", "katex", "dist");
const fontsRoot = path.join(katexRoot, "fonts");
const css = await readFile(path.join(katexRoot, "katex.min.css"), "utf8");
const woff2Files = await readdir(fontsRoot);
const encodedFonts = new Map(
  await Promise.all(
    woff2Files
      .filter((filename) => filename.endsWith(".woff2"))
      .map(async (filename) => [
        filename,
        (await readFile(path.join(fontsRoot, filename))).toString("base64"),
      ]),
  ),
);
const embeddedCSS = css.replace(
  /url\((["']?)fonts\/([^"')]+\.woff2)\1\)/g,
  (_match, _quote, filename) => {
    const encoded = encodedFonts.get(filename);
    if (!encoded) throw new Error(`KaTeX font was not found: ${filename}`);
    return `url("data:font/woff2;base64,${encoded}")`;
  },
);

const output = path.join(root, "src", "rendering", "katex-styles.generated.ts");
await writeFile(
  output,
  `// Generated from KaTeX's MIT-licensed stylesheet and WOFF2 fonts. Do not edit.\nexport const KATEX_CSS = ${JSON.stringify(embeddedCSS)};\n`,
);
