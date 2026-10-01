import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";
import packageJSON from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "addon", "content", "vendor");
const licensesDestination = path.join(vendorRoot, "licenses");

await rm(vendorRoot, { recursive: true, force: true });
await mkdir(licensesDestination, { recursive: true });

const licenseFiles = [
  ["katex", "LICENSE"],
  ["markdown-it", "LICENSE"],
  ["markdown-it-texmath", "license.txt"],
  ["dompurify", "LICENSE"],
  ["dompurify", "LICENSE-MPL"],
];
for (const [packageName, filename] of licenseFiles) {
  await copyFile(
    path.join(root, "node_modules", packageName, filename),
    path.join(licensesDestination, `${packageName}-${filename}`),
  );
}

const transitiveLicenseFiles = [
  ["argparse", "LICENSE"],
  ["entities", "LICENSE"],
  ["linkify-it", "LICENSE"],
  ["mdurl", "LICENSE"],
  ["punycode.js", "LICENSE-MIT.txt"],
  ["uc.micro", "LICENSE.txt"],
];
const packageDirectory = path.join(root, "node_modules", ".pnpm");
const installedEntries = await readdir(packageDirectory);
for (const [packageName, filename] of transitiveLicenseFiles) {
  const packageEntry = installedEntries.find((entry) => entry.startsWith(`${packageName}@`));
  if (!packageEntry) throw new Error(`Installed package ${packageName} was not found`);
  await copyFile(
    path.join(packageDirectory, packageEntry, "node_modules", packageName, filename),
    path.join(licensesDestination, `${packageName}-${filename}`),
  );
}

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
await import("./prepare-renderer.mjs");
const result = spawnSync(command, ["exec", "zotero-plugin", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// The scaffold excludes license-named assets from its glob. Copy license texts
// after the build; KaTeX CSS and WOFF2 fonts are embedded in the runtime bundle.
const builtVendorRoot = path.join(root, "build", "addon", "content", "vendor");
await cp(vendorRoot, builtVendorRoot, { recursive: true, force: true });
await copyFile(
  path.join(root, "LICENSE"),
  path.join(builtVendorRoot, "licenses", "margin-markdown-upstream-LICENSE"),
);

// Repack after copying the staged vendor files. AdmZip is a Node dependency,
// so this keeps XPI creation consistent on macOS, Windows, and Linux.
const archive = new AdmZip();
archive.addLocalFolder(path.join(root, "build", "addon"));
archive.writeZip(path.join(root, "build", `margin-markdown-${packageJSON.version}.xpi`));

// The scaffold hashes its initial archive before the license files are added.
// Update both release channels to describe the final, repacked XPI.
const bytes = await readFile(
  path.join(root, "build", `margin-markdown-${packageJSON.version}.xpi`),
);
const updateHash = `sha512:${createHash("sha512").update(bytes).digest("hex")}`;
for (const filename of ["update.json", "update-beta.json"]) {
  const file = path.join(root, "build", filename);
  const data = JSON.parse(await readFile(file, "utf8"));
  const update = data.addons[packageJSON.config.addonID].updates.find(
    (entry) => entry.version === packageJSON.version,
  );
  if (!update) continue;
  update.update_hash = updateHash;
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
