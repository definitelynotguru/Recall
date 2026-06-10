import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(webDir, "..", "shared");
const target = join(webDir, "shared");

if (!existsSync(source)) {
  if (existsSync(target)) {
    process.exit(0);
  }
  console.error("Missing monorepo shared/ and web/shared/");
  process.exit(1);
}

cpSync(source, target, { recursive: true });
