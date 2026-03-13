import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import { api, type SalesMapperData } from "@shared/routes";

const DEFAULT_PROJECTS_GOOGLE_SHEETS_DOCS_URL =
  "https://docs.google.com/spreadsheets/d/1jYkwEpQ2hXLycm0mlglTVaN-joSlQrvTNUwSSaN6Uqg/edit?usp=sharing";
const DEFAULT_PROJECTS_GOOGLE_SHEETS_PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTd0kUGt528IBYbHS8-pgCQX2Vge-15bWo9Pb1mjYqNiEN0W2Rym_le1_KyJ65kZCViOXHlQhCFafHt/pubhtml";
const REMOTE_WORKBOOK_TIMEOUT_MS = 30_000;
const DEFAULT_SALES_MAPPER_CACHE_TTL_MS = 60_000;
const TEXT_REPLACEMENTS: Record<string, string> = {
  "\u2013": " - ",
  "\u2014": " - ",
  "\u2019": "'",
  "\u201c": "\"",
  "\u201d": "\"",
  "\u00a0": " ",
};

const SALES_MAPPER_PATH_CANDIDATES = [
  path.resolve(process.cwd(), "data", "sales-mapper-data.json"),
  path.resolve(process.cwd(), "..", "data", "sales-mapper-data.json"),
  path.resolve(process.cwd(), "..", "..", "data", "sales-mapper-data.json"),
];

const STATE_NAME_TO_CODE: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  "DISTRICT OF COLUMBIA": "DC",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
};
const STATE_CODE_TO_NAME = Object.fromEntries(
  Object.entries(STATE_NAME_TO_CODE).map(([name, code]) => [code, toTitleCase(name)]),
);

type WorkbookRow = Record<string, unknown>;

type SourceConfig =
  | {
      kind: "url";
      value: string;
      displayValue: string;
      cacheKey: string;
    }
  | {
      kind: "json";
      value: string;
      displayValue: string;
      cacheKey: string;
    };

type ZipCoordinate = {
  latitude: number;
  longitude: number;
};

type SalesMapperSnapshot = {
  loadedAt: number;
  cacheKey: string;
  payload: SalesMapperData;
};

let cachedJsonPath: string | null = null;
let zipCoordinateCache: Record<string, ZipCoordinate> | null = null;
let salesMapperSnapshotCache: SalesMapperSnapshot | null = null;
let salesMapperSnapshotPromise: Promise<SalesMapperSnapshot> | null = null;

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readEnvValue(...names: string[]): string {
  for (const name of names) {
    const rawValue = process.env[name]?.trim();
    const value = rawValue?.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function getSalesMapperCacheTtlMs(): number {
  const rawValue = Number(readEnvValue("SALES_MAPPER_CACHE_TTL_MS") || DEFAULT_SALES_MAPPER_CACHE_TTL_MS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_SALES_MAPPER_CACHE_TTL_MS;
}

function getProjectsSourceUrl(): string {
  return (
    readEnvValue(
      "PROJECTS_SOURCE_URL",
      "SALES_MAPPER_SOURCE_URL",
      "PROJECTS_GOOGLE_SHEETS_URL",
      "PROJECTS_GOOGLE_SHEETS_DOCS_URL",
      "PROJECTS_GOOGLE_SHEETS_PUBLISHED_URL",
    ) || DEFAULT_PROJECTS_GOOGLE_SHEETS_DOCS_URL
  );
}

async function resolveLocalSalesMapperPath(): Promise<string | null> {
  if (cachedJsonPath) {
    return cachedJsonPath;
  }

  for (const candidate of SALES_MAPPER_PATH_CANDIDATES) {
    try {
      await fs.promises.access(candidate);
      cachedJsonPath = candidate;
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  return null;
}

function extractGoogleSheetId(value: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function normalizeGoogleWorkbookUrl(value: string): string {
  const sheetId = extractGoogleSheetId(value);
  if (!sheetId) {
    return value;
  }

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
}

function normalizeText(value: unknown): string {
  let raw = value === null || value === undefined ? "" : String(value).trim();
  Object.entries(TEXT_REPLACEMENTS).forEach(([source, target]) => {
    raw = raw.replaceAll(source, target);
  });
  return raw.replace(/\s+/g, " ").trim();
}

function normalizeState(value: unknown): string | null {
  const raw = normalizeText(value).toUpperCase();
  if (!raw) return null;
  if (STATE_CODE_TO_NAME[raw]) return raw;
  return STATE_NAME_TO_CODE[raw] || null;
}

function normalizeZip(value: unknown): string | null {
  const digits = normalizeText(value)
    .split("")
    .filter((character) => /\d/.test(character))
    .join("");
  if (!digits) return null;
  return digits.slice(0, 5).padStart(5, "0");
}

function parseNumber(value: unknown): number | null {
  const raw = normalizeText(value);
  if (!raw || raw === "-") return null;
  const match = raw.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseImages(value: unknown): string[] | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (["picture", "image", "images"].includes(lowered)) {
    return null;
  }

  for (const separator of ["|", ";", ","]) {
    if (raw.includes(separator)) {
      const parts = raw
        .split(separator)
        .map((part) => normalizeText(part))
        .filter(Boolean);
      return parts.length ? parts : null;
    }
  }

  return [raw];
}

function loadSheetRows(workbook: xlsx.WorkBook, sheetName: string): WorkbookRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return xlsx.utils
    .sheet_to_json<WorkbookRow>(sheet, { defval: null, raw: false })
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value === "" ? null : value])),
    )
    .filter((row) => Object.values(row).some((value) => value !== null));
}

function chooseDefaultState(projects: SalesMapperData["projects"]): string {
  const counts: Record<string, number> = {};
  projects.forEach((project) => {
    if (!project.stateCode || project.latitude === null || project.longitude === null) {
      return;
    }
    counts[project.stateCode] = (counts[project.stateCode] || 0) + 1;
  });

  const entries = Object.entries(counts).sort(
    (left, right) => right[1] - left[1] || (STATE_CODE_TO_NAME[left[0]] || left[0]).localeCompare(STATE_CODE_TO_NAME[right[0]] || right[0]),
  );

  return entries[0]?.[0] || "IN";
}

async function fetchRemoteWorkbook(workbookUrl: string): Promise<xlsx.WorkBook> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_WORKBOOK_TIMEOUT_MS);

  try {
    const response = await fetch(normalizeGoogleWorkbookUrl(workbookUrl), {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Remote Projects workbook download failed with ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return xlsx.read(buffer, { type: "buffer", cellDates: true });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timed out while downloading the Projects workbook.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadZipCoordinateCache(): Promise<Record<string, ZipCoordinate>> {
  if (zipCoordinateCache) {
    return zipCoordinateCache;
  }

  const localPath = await resolveLocalSalesMapperPath();
  if (!localPath) {
    zipCoordinateCache = {};
    return zipCoordinateCache;
  }

  const raw = await fs.promises.readFile(localPath, "utf8");
  const parsed = api.dashboard.salesMapper.responses[200].parse(JSON.parse(raw));
  zipCoordinateCache = Object.fromEntries(
    parsed.projects
      .filter((project) => project.zip && project.latitude !== null && project.longitude !== null)
      .map((project) => [
        project.zip as string,
        {
          latitude: project.latitude as number,
          longitude: project.longitude as number,
        },
      ]),
  );
  return zipCoordinateCache;
}

function getCoordinatesForRow(row: WorkbookRow, zipLookup: Record<string, ZipCoordinate>): ZipCoordinate | null {
  const latitude = parseNumber(
    row.Latitude ?? row.latitude ?? row["Lat"] ?? row["ZIP Latitude"] ?? row["Zip Latitude"],
  );
  const longitude = parseNumber(
    row.Longitude ?? row.longitude ?? row["Lon"] ?? row["Lng"] ?? row["ZIP Longitude"] ?? row["Zip Longitude"],
  );

  if (latitude !== null && longitude !== null) {
    return {
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
    };
  }

  const zipCode = normalizeZip(row["ZIP Code"] ?? row.Zip ?? row.ZIP);
  if (!zipCode) return null;
  return zipLookup[zipCode] || null;
}

async function buildPayloadFromWorkbook(workbookUrl: string): Promise<SalesMapperData> {
  const workbook = await fetchRemoteWorkbook(workbookUrl);
  const rows = loadSheetRows(workbook, workbook.SheetNames[0] || "");
  const zipLookup = await loadZipCoordinateCache();

  const projects = rows.map((row, index) => {
    const stateCode = normalizeState(row.State);
    const coordinates = getCoordinatesForRow(row, zipLookup);
    const zipCode = normalizeZip(row["ZIP Code"] ?? row.Zip ?? row.ZIP);

    return {
      id: `project-${index + 1}`,
      name: normalizeText(row["Project Name"]) || `Project ${index + 1}`,
      city: normalizeText(row.City) || null,
      state: STATE_CODE_TO_NAME[stateCode || ""] || normalizeText(row.State) || null,
      stateCode,
      zip: zipCode,
      projectType: normalizeText(row["Project Type"]) || null,
      productsUsed: normalizeText(row["Products Used"]) || null,
      productCategory: normalizeText(row["Product Category"]) || null,
      annualEnergySavingsKwh: parseNumber(row["Annual Energy Savings (kWh/Yr)"]),
      annualCostSavingsUsd: parseNumber(row["Annual Cost Savings ($)"]),
      fixturesCommissioned: parseNumber(row["Fixtures Commissioned"]),
      improvedLightingPercent: parseNumber(row["Improved Lighting Levels"]),
      maintenanceSavingsUsd: parseNumber(row["Maintenance Savings ($)"]),
      images: parseImages(row.Images),
      description: normalizeText(row.Description) || null,
      challenge: normalizeText(row.Challenge) || null,
      resolution: normalizeText(row.Resolution) || null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    };
  });

  const mappedProjects = projects.filter((project) => project.latitude !== null && project.longitude !== null);
  const coveredStates = Array.from(new Set(mappedProjects.map((project) => project.stateCode).filter(Boolean) as string[])).sort();
  const categories = Array.from(new Set(projects.map((project) => project.productCategory).filter(Boolean) as string[])).sort();
  const projectTypes = Array.from(new Set(projects.map((project) => project.projectType).filter(Boolean) as string[])).sort();

  return api.dashboard.salesMapper.responses[200].parse({
    generatedAt: new Date().toISOString(),
    sourcePath: workbookUrl,
    defaultState: chooseDefaultState(projects),
    summary: {
      projectCount: projects.length,
      mappedProjectCount: mappedProjects.length,
      coveredStateCount: coveredStates.length,
      productCategoryCount: categories.length,
      annualEnergySavingsKwh: Number(
        projects.reduce((sum, project) => sum + (project.annualEnergySavingsKwh || 0), 0).toFixed(2),
      ),
      annualCostSavingsUsd: Number(
        projects.reduce((sum, project) => sum + (project.annualCostSavingsUsd || 0), 0).toFixed(2),
      ),
      maintenanceSavingsUsd: Number(
        projects.reduce((sum, project) => sum + (project.maintenanceSavingsUsd || 0), 0).toFixed(2),
      ),
    },
    filterOptions: {
      statesWithProjects: coveredStates,
      productCategories: categories,
      projectTypes,
    },
    projects,
  });
}

async function loadBundledSalesMapperData(): Promise<SalesMapperData> {
  const localPath = await resolveLocalSalesMapperPath();
  if (!localPath) {
    throw new Error(
      `Sales mapper data file was not found. Checked: ${SALES_MAPPER_PATH_CANDIDATES.join(", ")}`,
    );
  }

  const raw = await fs.promises.readFile(localPath, "utf8");
  return api.dashboard.salesMapper.responses[200].parse(JSON.parse(raw));
}

function getConfiguredSalesMapperSource(): SourceConfig {
  const configuredUrl = getProjectsSourceUrl();
  if (configuredUrl) {
    return {
      kind: "url",
      value: configuredUrl,
      displayValue: configuredUrl,
      cacheKey: `url:${configuredUrl}`,
    };
  }

  return {
    kind: "json",
    value: SALES_MAPPER_PATH_CANDIDATES[0],
    displayValue: "bundled sales-mapper-data.json",
    cacheKey: "json:bundled",
  };
}

function shouldReuseSnapshot(snapshot: SalesMapperSnapshot, source: SourceConfig): boolean {
  if (snapshot.cacheKey !== source.cacheKey) {
    return false;
  }

  return Date.now() - snapshot.loadedAt < getSalesMapperCacheTtlMs();
}

async function buildSalesMapperSnapshot(source: SourceConfig): Promise<SalesMapperSnapshot> {
  let payload: SalesMapperData;

  if (source.kind === "url") {
    try {
      payload = await buildPayloadFromWorkbook(source.value);
    } catch (error) {
      const fallback = await loadBundledSalesMapperData().catch(() => null);
      if (!fallback) {
        throw error;
      }
      payload = fallback;
    }
  } else {
    payload = await loadBundledSalesMapperData();
  }

  return {
    loadedAt: Date.now(),
    cacheKey: source.cacheKey,
    payload,
  };
}

async function getSalesMapperSnapshot(): Promise<SalesMapperSnapshot> {
  const source = getConfiguredSalesMapperSource();
  if (salesMapperSnapshotCache && shouldReuseSnapshot(salesMapperSnapshotCache, source)) {
    return salesMapperSnapshotCache;
  }

  if (!salesMapperSnapshotPromise) {
    salesMapperSnapshotPromise = buildSalesMapperSnapshot(source)
      .then((snapshot) => {
        salesMapperSnapshotCache = snapshot;
        return snapshot;
      })
      .finally(() => {
        salesMapperSnapshotPromise = null;
      });
  }

  return salesMapperSnapshotPromise;
}

export async function warmSalesMapperCache(): Promise<void> {
  await getSalesMapperSnapshot();
}

export async function getSalesMapperData(): Promise<SalesMapperData> {
  const snapshot = await getSalesMapperSnapshot();
  return snapshot.payload;
}
