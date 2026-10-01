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
if (manifest.manifest_version !== 2) {
  throw new Error("XPI must use the Zotero Manifest V2 format");
}
if (
  manifest.applications?.zotero?.strict_min_version !== "9.0" ||
  manifest.applications?.zotero?.strict_max_version !== "10.0.*"
) {
  throw new Error("XPI must support Zotero 9.0 through 10.0.*");
}
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
const expectedHash = `sha512:${createHash("sha512").update(bytes).digest("hex")}`;
const expectedLink = `https://github.com/s1nyon/Margin-Markdown/releases/download/v${packageJSON.version}/${name}`;
if (
  manifest.applications.zotero.update_url !==
  "https://github.com/s1nyon/Margin-Markdown/releases/download/release/update.json"
) {
  throw new Error("XPI has the wrong update manifest URL");
}
for (const filename of ["update.json", "update-beta.json"]) {
  const updates = JSON.parse(
    await readFile(path.join(root, "dist", filename), "utf8"),
  ).addons?.[packageJSON.config.addonID]?.updates;
  const update = updates?.find((entry) => entry.version === packageJSON.version);
  if (
    !update || update.update_hash !== expectedHash ||
    update.update_link !== expectedLink ||
    update.applications?.zotero?.strict_min_version !== "9.0" ||
    update.applications?.zotero?.strict_max_version !== "10.0.*"
  ) {
    throw new Error(`${filename} does not describe the final Zotero 9–10 XPI`);
  }
}
const sha256 = createHash("sha256").update(bytes).digest("hex");
process.stdout.write(
  `Verified ${archive}\nVersion: ${manifest.version}\nEntries: ${entries.length}\nSHA-256: ${sha256}\n`,
);
