import fs from "fs/promises";
import path from "path";
import { api, type SalesMapperData } from "@shared/routes";

const SALES_MAPPER_PATH_CANDIDATES = [
  path.resolve(process.cwd(), "data", "sales-mapper-data.json"),
  path.resolve(process.cwd(), "..", "data", "sales-mapper-data.json"),
  path.resolve(process.cwd(), "..", "..", "data", "sales-mapper-data.json"),
];

let cachedDataPath: string | null = null;

async function resolveSalesMapperDataPath() {
  if (cachedDataPath) {
    return cachedDataPath;
  }

  for (const candidate of SALES_MAPPER_PATH_CANDIDATES) {
    try {
      await fs.access(candidate);
      cachedDataPath = candidate;
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new Error(
    `Sales mapper data file was not found. Checked: ${SALES_MAPPER_PATH_CANDIDATES.join(", ")}`,
  );
}

export async function getSalesMapperData(): Promise<SalesMapperData> {
  const filePath = await resolveSalesMapperDataPath();
  const raw = await fs.readFile(filePath, "utf8");
  return api.dashboard.salesMapper.responses[200].parse(JSON.parse(raw));
}
