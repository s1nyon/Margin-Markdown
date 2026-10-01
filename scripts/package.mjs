import { spawnSync } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import packageJSON from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["build"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const name = `margin-markdown-${packageJSON.version}.xpi`;
const built = path.join(root, "build", name);
const destinationDirectory = path.join(root, "dist");
await mkdir(destinationDirectory, { recursive: true });
await copyFile(built, path.join(destinationDirectory, name));
for (const filename of ["update.json", "update-beta.json"]) {
  await copyFile(
    path.join(root, "build", filename),
    path.join(destinationDirectory, filename),
  );
}
process.stdout.write(`Packaged ${path.join(destinationDirectory, name)}\n`);
