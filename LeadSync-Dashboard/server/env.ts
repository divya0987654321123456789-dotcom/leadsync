import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ENV_FILE_NAMES = [".env.local", ".env", "leadsync.env"];

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  value = value.replace(/^(['"])(.*)\1$/, "$2");
  return [key, value];
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) {
      continue;
    }

    const [key, value] = entry;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadProjectEnvFiles(): void {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const roots = [
    path.resolve(serverDir, ".."),
    path.resolve(serverDir, "../.."),
    path.resolve(serverDir, "../../.."),
  ];

  for (const root of roots.reverse()) {
    for (const fileName of ENV_FILE_NAMES) {
      loadEnvFile(path.join(root, fileName));
    }
  }
}

loadProjectEnvFiles();
