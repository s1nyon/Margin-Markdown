import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";
import packageJSON from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = `margin-markdown-${packageJSON.version}.xpi`;
const archive = path.join(root, "dist", name);
const zip = new AdmZip(archive);
const entries = zip.getEntries().map((entry) => entry.entryName);
const required = [
  "manifest.json",
  "bootstrap.js",
  `content/scripts/${packageJSON.config.addonRef}.js`,
  "content/icons/margin-markdown.svg",
  "content/preferences.xhtml",
  "content/preferences.css",
  "prefs.js",
  "THIRD_PARTY_NOTICES.md",
  "content/vendor/licenses/katex-LICENSE",
  "content/vendor/licenses/markdown-it-LICENSE",
  "content/vendor/licenses/markdown-it-texmath-license.txt",
  "content/vendor/licenses/dompurify-LICENSE",
  "content/vendor/licenses/dompurify-LICENSE-MPL",
  "content/vendor/licenses/argparse-LICENSE",
  "content/vendor/licenses/entities-LICENSE",
  "content/vendor/licenses/linkify-it-LICENSE",
  "content/vendor/licenses/mdurl-LICENSE",
  "content/vendor/licenses/margin-markdown-upstream-LICENSE",
  "content/vendor/licenses/punycode.js-LICENSE-MIT.txt",
  "content/vendor/licenses/uc.micro-LICENSE.txt",
  "content/vendor/licenses/argparse-LICENSE",
  "content/vendor/licenses/entities-LICENSE",
  "content/vendor/licenses/linkify-it-LICENSE",
  "content/vendor/licenses/mdurl-LICENSE",
  "content/vendor/licenses/margin-markdown-upstream-LICENSE",
];
const missing = required.filter((entry) => !entries.includes(entry));
if (missing.length) throw new Error(`XPI is missing: ${missing.join(", ")}`);
if (entries.some((entry) => entry.startsWith("addon/"))) {
  throw new Error("XPI contains an extra addon/ directory");
}

const manifest = JSON.parse(zip.readAsText("manifest.json"));
if (manifest.version !== packageJSON.version) {
  throw new Error(`Unexpected manifest version: ${manifest.version}`);
}
if (manifest.applications?.zotero?.id !== packageJSON.config.addonID) {
  throw new Error("XPI has the wrong Zotero add-on ID");
}
const scriptBundle = zip.readAsText(
  `content/scripts/${packageJSON.config.addonRef}.js`,
);
if (!scriptBundle.includes("data:font/woff2;base64,")) {
  throw new Error("XPI does not contain embedded offline KaTeX fonts");
}

const bytes = await readFile(archive);
const sha256 = createHash("sha256").update(bytes).digest("hex");
process.stdout.write(
  `Verified ${archive}\nVersion: ${manifest.version}\nEntries: ${entries.length}\nSHA-256: ${sha256}\n`,
);
