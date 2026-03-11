import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import type { LeadResponse } from "@shared/schema";

const DEFAULT_ONEDRIVE_WORKBOOK_PATH =
  "C:\\Users\\IKIO\\OneDrive - IKIO LED Lighting\\CRM\\2025-2026 Lead Generation Data.xlsx";
const DEFAULT_GOOGLE_SHEETS_DOCS_URL =
  "https://docs.google.com/spreadsheets/d/1JhbylSA2yPp7aFOHXJGa6o8UvRALVqaurpswNF0yii4/edit?usp=sharing";
const DEFAULT_GOOGLE_SHEETS_PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsd0C65vohb67EndyiMzb3CT4HUt4_4LxQeep3ji3bBywcK6ta43h6W3E2_3X8JWodXDPLX4ABOhlO/pubhtml";
const XLSX_MAGIC_HEADER = "PK";
const REMOTE_WORKBOOK_TIMEOUT_MS = 30_000;
const DEFAULT_WORKBOOK_CACHE_TTL_MS = 60_000;
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LABELS: Record<string, string> = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};
const MONTH_QUARTERS: Record<string, string> = {
  Jan: "Q1",
  Feb: "Q1",
  Mar: "Q1",
  Apr: "Q2",
  May: "Q2",
  Jun: "Q2",
  Jul: "Q3",
  Aug: "Q3",
  Sep: "Q3",
  Oct: "Q4",
  Nov: "Q4",
  Dec: "Q4",
};

const US_STATES: Array<[string, string]> = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
];
const US_STATE_CODES = new Set(US_STATES.map(([code]) => code));
const STATE_NAME_TO_CODE = Object.fromEntries(
  US_STATES.flatMap(([code, name]) => [
    [code, code],
    [name.toUpperCase(), code],
  ]),
);
STATE_NAME_TO_CODE["WASHINGTON DC"] = "DC";
STATE_NAME_TO_CODE["WASHINGTON, DC"] = "DC";
STATE_NAME_TO_CODE["DISTRICT OF COLUMBIA"] = "DC";

type WorkbookRow = Record<string, unknown>;
type CountItem = { label: string; value: number };
type MonthItem = { month: string; value: number };
type RecentLead = {
  date: string | number | null;
  account: string;
  campaign: string;
  stage: string;
  owner: string;
  state: string;
  outcome: string | null;
};

type BaseSheetSummary = {
  sheetName: string;
  sheetType: "leads" | "email";
  totalRows: number;
  uniqueAccounts: number;
  uniqueContacts: number;
  uniqueCampaigns: number;
  uniqueStates: number;
  uniqueOwners: number;
  latestActivityDate: string | number | null;
  byMonth: MonthItem[];
  byStage: CountItem[];
  byLeadType: CountItem[];
  byState: CountItem[];
  byOwner: CountItem[];
  byCampaignType: CountItem[];
  byCampaign: Array<CountItem & { stages?: CountItem[] }>;
};

export type LeadSheetSummary = BaseSheetSummary & {
  sheetType: "leads";
  positiveCount: number;
  negativeCount: number;
  followUpCount: number;
  positiveRate: number;
  negativeRate: number;
  followUpRate: number;
  bySource: CountItem[];
  byResponseType: CountItem[];
  recentLeads: RecentLead[];
};

export type EmailSheetSummary = BaseSheetSummary & {
  sheetType: "email";
  deliveredCount: number;
  openedCount: number;
  repliedCount: number;
  bouncedCount: number;
  deliveredRate: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
};

export type WorkbookSheetSummary = LeadSheetSummary | EmailSheetSummary;

export type DashboardFilters = {
  sheet?: string;
  campaignType?: string;
  segment?: string;
  year?: string;
  quarter?: string;
  month?: string;
  state?: string;
  responseType?: string;
};

type DashboardFilterOption = {
  value: string;
  label: string;
};

type DashboardSheetOption = {
  value: string;
  label: string;
  sheetType: "leads" | "email";
  year: string | null;
};

type DashboardLeadRecord = {
  id: string;
  sheetName: string;
  date: string | number | null;
  dateSort: string;
  year: string;
  quarter: string;
  month: string;
  monthLabel: string;
  monthIndex: number;
  campaignType: string;
  segment: string;
  responseType: string;
  leadStage: string;
  state: string;
  stateCode: string | null;
  accountName: string;
  assignTo: string;
  outcome: string | null;
  actionForSales: string | null;
  revenue: number;
  quoted: boolean;
};

type DashboardEmailRecord = {
  id: string;
  sheetName: string;
  date: string | number | null;
  dateSort: string;
  year: string;
  quarter: string;
  month: string;
  monthLabel: string;
  monthIndex: number;
  campaignType: string;
  segment: string;
  contactStage: string;
  state: string;
  stateCode: string | null;
};

type DashboardMonthlyItem = {
  month: string;
  label: string;
  emailSent: number;
  responses: number;
};

type DashboardAgencyItem = {
  label: string;
  emailSent: number;
  responses: number;
};

type DashboardTableRow = {
  id: string;
  month: string;
  leadStage: string;
  responseType: string;
  state: string;
  accountName: string;
  assignTo: string;
  outcome: string | null;
  actionForSales: string | null;
  date: string | number | null;
};

type DashboardMapState = {
  code: string;
  value: number;
};

export type WorkbookDashboardResponse = {
  sourceUrl: string;
  syncedAt: string;
  sheetOrder: string[];
  sheets: Record<string, WorkbookSheetSummary>;
  sheetOptions: DashboardSheetOption[];
  filterOptions: {
    campaignTypes: DashboardFilterOption[];
    segments: DashboardFilterOption[];
    years: DashboardFilterOption[];
    quarters: DashboardFilterOption[];
    months: DashboardFilterOption[];
    states: DashboardFilterOption[];
    responseTypes: DashboardFilterOption[];
  };
  filtersApplied: Required<DashboardFilters>;
  metrics: {
    quoted: number | null;
    revenue: number | null;
    emailSent: number;
    responses: number;
  };
  charts: {
    monthlyResponse: DashboardMonthlyItem[];
    agencyResponse: DashboardAgencyItem[];
    targetEmailSent: CountItem[];
    conversionRatio: CountItem[];
  };
  tableRows: DashboardTableRow[];
  mapStates: DashboardMapState[];
};

type WorkbookSource =
  | {
      kind: "path";
      value: string;
      displayValue: string;
    }
  | {
      kind: "url";
      value: string;
      displayValue: string;
    };

type GraphCredentials = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

type GraphWorkbookLocation = {
  userPrincipalName: string;
  workbookPath: string;
};

type GraphTokenCache = {
  accessToken: string;
  expiresAt: number;
  cacheKey: string;
};

type ResolvedWorkbookSource = {
  kind: "path" | "url";
  value: string;
  displayValue: string;
  cacheKey: string;
  isRemote: boolean;
};

type ParsedWorkbookSnapshot = {
  sourceUrl: string;
  syncedAt: string;
  loadedAt: number;
  cacheKey: string;
  sourceSignature: string;
  sheetOrder: string[];
  sheets: Record<string, WorkbookSheetSummary>;
  sheetOptions: DashboardSheetOption[];
  leadRecords: DashboardLeadRecord[];
  emailRecords: DashboardEmailRecord[];
  leadRowsBySheet: Record<string, LeadResponse[]>;
};

let graphTokenCache: GraphTokenCache | null = null;
let parsedWorkbookSnapshotCache: ParsedWorkbookSnapshot | null = null;
let parsedWorkbookSnapshotPromise: Promise<ParsedWorkbookSnapshot> | null = null;

function cleanValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const stripped = value.trim();
    return stripped || null;
  }
  return value;
}

function nullIfBlank(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeDate(value: unknown): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : text;
}

function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toText(value: unknown, fallback = "Unknown"): string {
  return nullIfBlank(value) || fallback;
}

function normalizeStateCode(value: unknown): string | null {
  const text = nullIfBlank(value);
  if (!text) return null;

  const normalized = text
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (STATE_NAME_TO_CODE[normalized]) return STATE_NAME_TO_CODE[normalized];
  if (/^[A-Z]{2}$/.test(normalized) && US_STATE_CODES.has(normalized)) return normalized;
  return null;
}

function normalizeMonthValue(value: unknown, dateValue: unknown): string | null {
  const text = nullIfBlank(value)?.toLowerCase();

  if (text) {
    const found = MONTH_ORDER.find((month) => {
      const label = MONTH_LABELS[month]?.toLowerCase() || "";
      return (
        month.toLowerCase() === text ||
        label === text ||
        label.startsWith(text) ||
        month.toLowerCase() === text.slice(0, 3)
      );
    });

    if (found) {
      return found;
    }
  }

  const normalizedDate = normalizeDate(dateValue);
  if (normalizedDate) {
    const parsed = new Date(String(normalizedDate));
    if (!Number.isNaN(parsed.getTime())) {
      return MONTH_ORDER[parsed.getMonth()] || null;
    }
  }

  return null;
}

function inferYear(dateValue: unknown, sheetName: string): string {
  const normalizedDate = normalizeDate(dateValue);
  if (normalizedDate) {
    const parsed = new Date(String(normalizedDate));
    if (!Number.isNaN(parsed.getTime())) {
      return String(parsed.getFullYear());
    }
  }

  const match = sheetName.match(/\b(20\d{2})\b/);
  return match?.[1] || "Unknown";
}

function extractYearToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\b(20\d{2})\b/);
  return match?.[1] || null;
}

function bucketResponseType(value: string): "Positive" | "Negative" | null {
  const normalized = value.toLowerCase();
  if (normalized === "negative") return "Negative";
  if (normalized === "positive" || normalized === "opportunity") return "Positive";
  return null;
}

function buildSortDate(value: string | number | null): string {
  return toSortableDate(value);
}

function toCounterPairs(counter: Record<string, number>, limit?: number): CountItem[] {
  const entries = Object.entries(counter).sort((a, b) => b[1] - a[1]);
  return (limit ? entries.slice(0, limit) : entries).map(([label, value]) => ({ label, value }));
}

function toMonthPairs(counter: Record<string, number>): MonthItem[] {
  return MONTH_ORDER.filter((month) => counter[month]).map((month) => ({
    month,
    value: counter[month],
  }));
}

function toSortableDate(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return String(value);
}

function hasColumn(row: WorkbookRow, columnName: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, columnName);
}

function addUniqueValue(set: Set<string>, value: string | null) {
  if (value) {
    set.add(value);
  }
}

function addUniqueContact(set: Set<string>, email: string | null, name: string | null, organization: string | null) {
  if (email) {
    set.add(`email:${email.toLowerCase()}`);
    return;
  }

  const fallback = [name, organization].filter(Boolean).join("|").toLowerCase();
  if (fallback) {
    set.add(`name:${fallback}`);
  }
}

function getLatestDate(current: string | number | null, candidate: unknown): string | number | null {
  const normalizedCandidate = normalizeDate(candidate);
  if (normalizedCandidate === null) return current;
  if (current === null) return normalizedCandidate;
  return toSortableDate(normalizedCandidate) > toSortableDate(current) ? normalizedCandidate : current;
}

function loadSheetRows(workbook: xlsx.WorkBook, sheetName: string): WorkbookRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return xlsx.utils
    .sheet_to_json<WorkbookRow>(sheet, { defval: null, raw: false })
    .map((row) =>
      Object.fromEntries(Object.entries(row).map(([key, value]) => [key, cleanValue(value)])),
    )
    .filter((row) => Object.values(row).some((value) => value !== null));
}

function buildLeadSummary(sheetName: string, rows: WorkbookRow[]): LeadSheetSummary {
  const byMonth: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const byLeadType: Record<string, number> = {};
  const byResponseType: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};
  const byCampaignType: Record<string, number> = {};
  const accounts = new Set<string>();
  const contacts = new Set<string>();
  const campaigns = new Set<string>();
  const states = new Set<string>();
  const owners = new Set<string>();
  let positiveCount = 0;
  let negativeCount = 0;
  let followUpCount = 0;
  let latestActivityDate: string | number | null = null;

  const recentLeads: RecentLead[] = rows.map((row) => {
    const month = nullIfBlank(row.Month) || "Unknown";
    const source = nullIfBlank(row["Lead Source"]) || "Unknown";
    const stage = nullIfBlank(row["Lead Stage"]) || "Unknown";
    const leadType = nullIfBlank(row["Lead type"]) || "Unknown";
    const responseType = nullIfBlank(row["Response Type"]) || "Unknown";
    const state = nullIfBlank(row.State) || "Unknown";
    const owner = nullIfBlank(row["Assign to"]) || "Unassigned";
    const campaign = nullIfBlank(row["Campaign name"]) || "Unknown";
    const campaignType = nullIfBlank(row["Campaign Type"]) || "Unknown";
    const accountName = nullIfBlank(row["Account Name"]);
    const contactName = nullIfBlank(row.Name);
    const email = nullIfBlank(row.Email);
    const ownerValue = nullIfBlank(row["Assign to"]);
    const stateValue = nullIfBlank(row.State);

    byMonth[month] = (byMonth[month] || 0) + 1;
    bySource[source] = (bySource[source] || 0) + 1;
    byStage[stage] = (byStage[stage] || 0) + 1;
    byLeadType[leadType] = (byLeadType[leadType] || 0) + 1;
    byResponseType[responseType] = (byResponseType[responseType] || 0) + 1;
    byState[state] = (byState[state] || 0) + 1;
    byOwner[owner] = (byOwner[owner] || 0) + 1;
    byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
    byCampaignType[campaignType] = (byCampaignType[campaignType] || 0) + 1;

    addUniqueValue(accounts, accountName);
    addUniqueContact(contacts, email, contactName, accountName);
    addUniqueValue(campaigns, nullIfBlank(row["Campaign name"]));
    addUniqueValue(states, stateValue);
    addUniqueValue(owners, ownerValue);

    const normalizedResponse = responseType.toLowerCase();
    if (normalizedResponse === "positive") positiveCount += 1;
    if (normalizedResponse === "negative") negativeCount += 1;
    if (/follow[\s/-]*up/.test(stage.toLowerCase())) followUpCount += 1;

    latestActivityDate = getLatestDate(latestActivityDate, row.Date);

    return {
      date: normalizeDate(row.Date),
      account: accountName || "Unknown",
      campaign,
      stage,
      owner,
      state,
      outcome: nullIfBlank(row.Outcome),
    };
  });

  const totalRows = rows.length;
  return {
    sheetName,
    sheetType: "leads",
    totalRows,
    uniqueAccounts: accounts.size,
    uniqueContacts: contacts.size,
    uniqueCampaigns: campaigns.size,
    uniqueStates: states.size,
    uniqueOwners: owners.size,
    latestActivityDate,
    positiveCount,
    negativeCount,
    followUpCount,
    positiveRate: totalRows ? Number(((positiveCount / totalRows) * 100).toFixed(1)) : 0,
    negativeRate: totalRows ? Number(((negativeCount / totalRows) * 100).toFixed(1)) : 0,
    followUpRate: totalRows ? Number(((followUpCount / totalRows) * 100).toFixed(1)) : 0,
    byMonth: toMonthPairs(byMonth),
    bySource: toCounterPairs(bySource),
    byStage: toCounterPairs(byStage),
    byLeadType: toCounterPairs(byLeadType),
    byResponseType: toCounterPairs(byResponseType),
    byState: toCounterPairs(byState, 12),
    byOwner: toCounterPairs(byOwner, 12),
    byCampaign: toCounterPairs(byCampaign, 10),
    byCampaignType: toCounterPairs(byCampaignType, 10),
    recentLeads: recentLeads
      .sort((a, b) => toSortableDate(b.date).localeCompare(toSortableDate(a.date)))
      .slice(0, 12),
  };
}

function buildEmailSummary(sheetName: string, rows: WorkbookRow[]): EmailSheetSummary {
  const byMonth: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const byLeadType: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};
  const byCampaignType: Record<string, number> = {};
  const campaignStageRollup: Record<string, Record<string, number>> = {};
  const companies = new Set<string>();
  const contacts = new Set<string>();
  const campaigns = new Set<string>();
  const states = new Set<string>();
  const owners = new Set<string>();
  let latestActivityDate: string | number | null = null;

  for (const row of rows) {
    const month = nullIfBlank(row.Month) || "Unknown";
    const stage = nullIfBlank(row["Contact Stage"]) || "Unknown";
    const leadType = nullIfBlank(row["Lead type"]) || "Unknown";
    const state = nullIfBlank(row.State) || "Unknown";
    const owner = nullIfBlank(row["Sales Owner"]) || "Unassigned";
    const campaign = nullIfBlank(row["Campaign name"]) || "Unknown";
    const campaignType = nullIfBlank(row["Campaign Type"]) || "Unknown";
    const companyName = nullIfBlank(row["Company Name"]);
    const contactName = nullIfBlank(row.Name);
    const email = nullIfBlank(row.Email);
    const ownerValue = nullIfBlank(row["Sales Owner"]);
    const stateValue = nullIfBlank(row.State);

    byMonth[month] = (byMonth[month] || 0) + 1;
    byStage[stage] = (byStage[stage] || 0) + 1;
    byLeadType[leadType] = (byLeadType[leadType] || 0) + 1;
    byState[state] = (byState[state] || 0) + 1;
    byOwner[owner] = (byOwner[owner] || 0) + 1;
    byCampaign[campaign] = (byCampaign[campaign] || 0) + 1;
    byCampaignType[campaignType] = (byCampaignType[campaignType] || 0) + 1;

    addUniqueValue(companies, companyName);
    addUniqueContact(contacts, email, contactName, companyName);
    addUniqueValue(campaigns, nullIfBlank(row["Campaign name"]));
    addUniqueValue(states, stateValue);
    addUniqueValue(owners, ownerValue);
    latestActivityDate = getLatestDate(latestActivityDate, row["Email Run Date"]);

    campaignStageRollup[campaign] ||= {};
    campaignStageRollup[campaign][stage] = (campaignStageRollup[campaign][stage] || 0) + 1;
  }

  const totalRows = rows.length;
  const delivered = byStage.Delivered || 0;
  const opened = byStage.Opened || 0;
  const replied = byStage.Replied || 0;
  const bounced = byStage.Bounced || 0;

  return {
    sheetName,
    sheetType: "email",
    totalRows,
    uniqueAccounts: companies.size,
    uniqueContacts: contacts.size,
    uniqueCampaigns: campaigns.size,
    uniqueStates: states.size,
    uniqueOwners: owners.size,
    latestActivityDate,
    deliveredCount: delivered,
    openedCount: opened,
    repliedCount: replied,
    bouncedCount: bounced,
    deliveredRate: totalRows ? Number(((delivered / totalRows) * 100).toFixed(1)) : 0,
    openRate: totalRows ? Number(((opened / totalRows) * 100).toFixed(1)) : 0,
    replyRate: totalRows ? Number(((replied / totalRows) * 100).toFixed(1)) : 0,
    bounceRate: totalRows ? Number(((bounced / totalRows) * 100).toFixed(1)) : 0,
    byMonth: toMonthPairs(byMonth),
    byStage: toCounterPairs(byStage),
    byLeadType: toCounterPairs(byLeadType),
    byState: toCounterPairs(byState, 12),
    byOwner: toCounterPairs(byOwner, 12),
    byCampaign: toCounterPairs(byCampaign, 12).map((item) => ({
      ...item,
      stages: toCounterPairs(campaignStageRollup[item.label] || {}),
    })),
    byCampaignType: toCounterPairs(byCampaignType, 10),
  };
}

function normalizeLeadRecord(sheetName: string, row: WorkbookRow, index: number): DashboardLeadRecord {
  const date = normalizeDate(row.Date);
  const month = normalizeMonthValue(row.Month, row.Date) || "Unknown";
  const monthIndex = MONTH_ORDER.indexOf(month);
  const stateCode = normalizeStateCode(row.State);
  const leadStage = toText(row["Lead Stage"]);

  return {
    id: `lead-${sheetName}-${index}`,
    sheetName,
    date,
    dateSort: buildSortDate(date),
    year: inferYear(row.Date, sheetName),
    quarter: MONTH_QUARTERS[month] || "Unknown",
    month,
    monthLabel: MONTH_LABELS[month] || "Unknown",
    monthIndex: monthIndex >= 0 ? monthIndex : 99,
    campaignType: toText(row["Campaign Type"]),
    segment: toText(row["Lead type"]),
    responseType: toText(row["Response Type"]),
    leadStage,
    state: stateCode || "Unknown",
    stateCode,
    accountName: toText(row["Account Name"]),
    assignTo: toText(row["Assign to"], "Unassigned"),
    outcome: nullIfBlank(row.Outcome),
    actionForSales: nullIfBlank(row["Action for sales"]),
    revenue: safeNumber(row.Revenue),
    quoted: /quote/i.test(leadStage),
  };
}

function normalizeEmailRecord(sheetName: string, row: WorkbookRow, index: number): DashboardEmailRecord {
  const date = normalizeDate(row["Email Run Date"]);
  const month = normalizeMonthValue(row.Month, row["Email Run Date"]) || "Unknown";
  const monthIndex = MONTH_ORDER.indexOf(month);
  const stateCode = normalizeStateCode(row.State);

  return {
    id: `email-${sheetName}-${index}`,
    sheetName,
    date,
    dateSort: buildSortDate(date),
    year: inferYear(row["Email Run Date"], sheetName),
    quarter: MONTH_QUARTERS[month] || "Unknown",
    month,
    monthLabel: MONTH_LABELS[month] || "Unknown",
    monthIndex: monthIndex >= 0 ? monthIndex : 99,
    campaignType: toText(row["Campaign Type"]),
    segment: toText(row["Lead type"]),
    contactStage: toText(row["Contact Stage"]),
    state: stateCode || "Unknown",
    stateCode,
  };
}

function buildFilterOptionsFromValues(values: string[]): DashboardFilterOption[] {
  const counts: Record<string, number> = {};

  for (const value of values) {
    if (!value || value === "Unknown") continue;
    counts[value] = (counts[value] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => ({ value, label: value }));
}

function getUniqueDashboardYears(records: Array<{ year: string }>): string[] {
  return Array.from(new Set(records.map((record) => record.year).filter((value) => /^\d{4}$/.test(value)))).sort(
    (a, b) => Number(b) - Number(a),
  );
}

function buildDashboardSheetOptions(
  sheetOrder: string[],
  sheets: Record<string, WorkbookSheetSummary>,
): DashboardSheetOption[] {
  return sheetOrder
    .filter((sheetName) => Boolean(sheets[sheetName]))
    .map((sheetName) => ({
      value: sheetName,
      label: sheetName,
      sheetType: sheets[sheetName].sheetType,
      year: extractYearToken(sheetName),
    }));
}

function getDefaultDashboardSheet(sheetOptions: DashboardSheetOption[]): string {
  return sheetOptions.find((option) => option.sheetType === "leads")?.value || sheetOptions[0]?.value || "All";
}

function normalizeDashboardFilters(filters: DashboardFilters = {}): Required<DashboardFilters> {
  return {
    sheet: filters.sheet || "All",
    campaignType: filters.campaignType || "All",
    segment: filters.segment || "All",
    year: filters.year || "All",
    quarter: filters.quarter || "All",
    month: filters.month || "All",
    state: filters.state || "All",
    responseType: filters.responseType || "All",
  };
}

function matchesDashboardFilters(
  record: DashboardLeadRecord | DashboardEmailRecord,
  filters: Required<DashboardFilters>,
  includeResponseType: boolean,
): boolean {
  if (filters.campaignType !== "All" && record.campaignType !== filters.campaignType) return false;
  if (filters.segment !== "All" && record.segment !== filters.segment) return false;
  if (filters.year !== "All" && record.year !== filters.year) return false;
  if (filters.quarter !== "All" && record.quarter !== filters.quarter) return false;
  if (filters.month !== "All" && record.month !== filters.month) return false;
  if (filters.state !== "All" && record.stateCode !== filters.state) return false;

  if (
    includeResponseType &&
    filters.responseType !== "All" &&
    "responseType" in record &&
    record.responseType !== filters.responseType
  ) {
    return false;
  }

  return true;
}

function buildTargetEmailSent(items: DashboardEmailRecord[]): CountItem[] {
  const counts: Record<string, number> = {};

  for (const item of items) {
    counts[item.campaignType] = (counts[item.campaignType] || 0) + 1;
  }

  const entries = toCounterPairs(counts);
  if (entries.length <= 5) return entries;

  const head = entries.slice(0, 5);
  const otherValue = entries.slice(5).reduce((sum, item) => sum + item.value, 0);
  return otherValue ? [...head, { label: "Other", value: otherValue }] : head;
}

function buildConversionRatio(items: DashboardLeadRecord[]): CountItem[] {
  let positive = 0;
  let negative = 0;

  for (const item of items) {
    const bucket = bucketResponseType(item.responseType);
    if (bucket === "Positive") positive += 1;
    if (bucket === "Negative") negative += 1;
  }

  return [
    positive ? { label: "Positive", value: positive } : null,
    negative ? { label: "Negative", value: negative } : null,
  ].filter((item): item is CountItem => Boolean(item));
}

function getSheetScopedDashboardRecords(
  leadRecords: DashboardLeadRecord[],
  emailRecords: DashboardEmailRecord[],
  selectedSheet: string,
  sheetOptions: DashboardSheetOption[],
) {
  const selectedSheetOption = sheetOptions.find((option) => option.value === selectedSheet);
  if (!selectedSheetOption) {
    return {
      scopedLeads: leadRecords,
      scopedEmails: emailRecords,
    };
  }

  const leadSheetRecords = leadRecords.filter((record) => record.sheetName === selectedSheet);
  const emailSheetRecords = emailRecords.filter((record) => record.sheetName === selectedSheet);
  const scopedYears = getUniqueDashboardYears(
    selectedSheetOption.sheetType === "email" ? emailSheetRecords : leadSheetRecords,
  );
  const effectiveYears = scopedYears.length
    ? scopedYears
    : selectedSheetOption.year && /^\d{4}$/.test(selectedSheetOption.year)
      ? [selectedSheetOption.year]
      : [];

  if (selectedSheetOption.sheetType === "email") {
    return {
      scopedLeads: effectiveYears.length
        ? leadRecords.filter((record) => effectiveYears.includes(record.year))
        : leadRecords,
      scopedEmails: emailSheetRecords,
    };
  }

  return {
    scopedLeads: leadSheetRecords,
    scopedEmails: effectiveYears.length
      ? emailRecords.filter((record) => effectiveYears.includes(record.year))
      : emailRecords,
  };
}

function getDashboardOptionRecords(
  scopedLeads: DashboardLeadRecord[],
  scopedEmails: DashboardEmailRecord[],
  filters: Required<DashboardFilters>,
  ignoreKey?: keyof Required<DashboardFilters>,
) {
  const optionFilters = ignoreKey ? { ...filters, [ignoreKey]: "All" } : filters;

  return {
    leads: scopedLeads.filter((record) => matchesDashboardFilters(record, optionFilters, true)),
    emails: scopedEmails.filter((record) => matchesDashboardFilters(record, optionFilters, false)),
  };
}

function buildDashboardView(
  leadRecords: DashboardLeadRecord[],
  emailRecords: DashboardEmailRecord[],
  filters: DashboardFilters,
  sheetOptions: DashboardSheetOption[],
) {
  const requestedFilters = normalizeDashboardFilters(filters);
  const selectedSheet =
    requestedFilters.sheet !== "All" && sheetOptions.some((option) => option.value === requestedFilters.sheet)
      ? requestedFilters.sheet
      : getDefaultDashboardSheet(sheetOptions);
  const normalizedFilters: Required<DashboardFilters> = {
    ...requestedFilters,
    sheet: selectedSheet,
  };

  const { scopedLeads, scopedEmails } = getSheetScopedDashboardRecords(
    leadRecords,
    emailRecords,
    selectedSheet,
    sheetOptions,
  );
  const filteredLeads = scopedLeads.filter((record) => matchesDashboardFilters(record, normalizedFilters, true));
  const filteredEmails = scopedEmails.filter((record) => matchesDashboardFilters(record, normalizedFilters, false));
  const campaignTypeOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "campaignType");
  const segmentOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "segment");
  const yearOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "year");
  const quarterOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "quarter");
  const monthOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "month");
  const stateOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "state");
  const responseTypeOptionRecords = getDashboardOptionRecords(scopedLeads, scopedEmails, normalizedFilters, "responseType");

  const emailByMonth: Record<string, number> = {};
  const responseByMonth: Record<string, number> = {};

  for (const item of filteredEmails) {
    if (!MONTH_ORDER.includes(item.month)) continue;
    emailByMonth[item.month] = (emailByMonth[item.month] || 0) + 1;
  }

  for (const item of filteredLeads) {
    if (!MONTH_ORDER.includes(item.month)) continue;
    responseByMonth[item.month] = (responseByMonth[item.month] || 0) + 1;
  }

  const monthlyResponse: DashboardMonthlyItem[] = MONTH_ORDER.map((month) => ({
    month,
    label: MONTH_LABELS[month],
    emailSent: emailByMonth[month] || 0,
    responses: responseByMonth[month] || 0,
  })).filter((item) => item.emailSent || item.responses);

  const agencyTotals: Record<string, DashboardAgencyItem> = {};

  for (const item of filteredEmails) {
    agencyTotals[item.campaignType] ||= { label: item.campaignType, emailSent: 0, responses: 0 };
    agencyTotals[item.campaignType].emailSent += 1;
  }

  for (const item of filteredLeads) {
    agencyTotals[item.campaignType] ||= { label: item.campaignType, emailSent: 0, responses: 0 };
    agencyTotals[item.campaignType].responses += 1;
  }

  const agencyResponse = Object.values(agencyTotals)
    .sort(
      (a, b) =>
        Math.max(b.emailSent, b.responses) - Math.max(a.emailSent, a.responses) ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 6);

  const mapSource = filteredLeads.length ? filteredLeads : filteredEmails;
  const stateCounts: Record<string, number> = {};

  for (const item of mapSource) {
    if (!item.stateCode) continue;
    stateCounts[item.stateCode] = (stateCounts[item.stateCode] || 0) + 1;
  }

  const tableRows: DashboardTableRow[] = [...filteredLeads]
    .sort(
      (a, b) =>
        b.dateSort.localeCompare(a.dateSort) ||
        a.monthIndex - b.monthIndex ||
        a.accountName.localeCompare(b.accountName),
    )
    .slice(0, 14)
    .map((item) => ({
      id: item.id,
      month: item.monthLabel,
      leadStage: item.leadStage,
      responseType: item.responseType,
      state: item.state,
      accountName: item.accountName,
      assignTo: item.assignTo,
      outcome: item.outcome,
      actionForSales: item.actionForSales,
      date: item.date,
    }));

  const quoteCount = filteredLeads.filter((item) => item.quoted).length;
  const revenueTotal = filteredLeads.reduce((sum, item) => sum + item.revenue, 0);

  return {
    sheetOptions,
    filterOptions: {
      campaignTypes: buildFilterOptionsFromValues(
        [...campaignTypeOptionRecords.leads, ...campaignTypeOptionRecords.emails].map((item) => item.campaignType),
      ),
      segments: buildFilterOptionsFromValues(
        [...segmentOptionRecords.leads, ...segmentOptionRecords.emails].map((item) => item.segment),
      ),
      years: getUniqueDashboardYears([...yearOptionRecords.leads, ...yearOptionRecords.emails])
        .map((value) => ({ value, label: value })),
      quarters: ["Q1", "Q2", "Q3", "Q4"]
        .filter((quarter) => [...quarterOptionRecords.leads, ...quarterOptionRecords.emails].some((item) => item.quarter === quarter))
        .map((value) => ({ value, label: value })),
      months: MONTH_ORDER.filter((month) =>
        [...monthOptionRecords.leads, ...monthOptionRecords.emails].some((item) => item.month === month),
      ).map((month) => ({
        value: month,
        label: MONTH_LABELS[month],
      })),
      states: US_STATES.filter(([code]) =>
        [...stateOptionRecords.leads, ...stateOptionRecords.emails].some((item) => item.stateCode === code),
      ).map(([code]) => ({
        value: code,
        label: code,
      })),
      responseTypes: buildFilterOptionsFromValues(responseTypeOptionRecords.leads.map((item) => item.responseType)),
    },
    filtersApplied: normalizedFilters,
    metrics: {
      quoted: quoteCount || null,
      revenue: revenueTotal || null,
      emailSent: filteredEmails.length,
      responses: filteredLeads.length,
    },
    charts: {
      monthlyResponse,
      agencyResponse,
      targetEmailSent: buildTargetEmailSent(filteredEmails),
      conversionRatio: buildConversionRatio(filteredLeads),
    },
    tableRows,
    mapStates: US_STATES.map(([code]) => ({
      code,
      value: stateCounts[code] || 0,
    })),
  };
}

function toLeadResponse(row: WorkbookRow, id: number): LeadResponse {
  return {
    id,
    date: normalizeDate(row.Date),
    month: nullIfBlank(row.Month),
    leadSource: nullIfBlank(row["Lead Source"]),
    campaignType: nullIfBlank(row["Campaign Type"]),
    campaignName: nullIfBlank(row["Campaign name"]),
    leadStage: nullIfBlank(row["Lead Stage"]),
    responseType: nullIfBlank(row["Response Type"]),
    actionForSales: nullIfBlank(row["Action for sales"]),
    outcome: nullIfBlank(row.Outcome),
    leadType: nullIfBlank(row["Lead type"]),
    accountName: nullIfBlank(row["Account Name"]),
    website: nullIfBlank(row.Website),
    name: nullIfBlank(row.Name),
    email: nullIfBlank(row.Email),
    state: nullIfBlank(row.State),
    assignTo: nullIfBlank(row["Assign to"]),
    createdAt: new Date().toISOString(),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isWindowsAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function resolveWorkbookPath(value: string): string {
  if (isWindowsAbsolutePath(value)) {
    return value;
  }

  return path.resolve(value);
}

function getDefaultHostedWorkbookUrl(): string {
  return (
    readEnvValue(
      "WORKBOOK_SOURCE_URL",
      "GOOGLE_SHEETS_URL",
      "GOOGLE_SHEETS_DOCS_URL",
      "GOOGLE_SHEETS_PUBLISHED_URL",
    ) ||
    DEFAULT_GOOGLE_SHEETS_DOCS_URL
  );
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

function getGraphCredentials(): GraphCredentials | null {
  const tenantId = readEnvValue("MICROSOFT_TENANT_ID", "AZURE_TENANT_ID", "MS_TENANT_ID");
  const clientId = readEnvValue("MICROSOFT_CLIENT_ID", "AZURE_CLIENT_ID", "MS_CLIENT_ID");
  const clientSecret = readEnvValue("MICROSOFT_CLIENT_SECRET", "AZURE_CLIENT_SECRET", "MS_CLIENT_SECRET");

  if (!tenantId || !clientId || !clientSecret) {
    return null;
  }

  return {
    tenantId,
    clientId,
    clientSecret,
  };
}

function getConfiguredWorkbookSource(): WorkbookSource {
  const configuredUrl = readEnvValue(
    "WORKBOOK_SOURCE_URL",
    "GOOGLE_SHEETS_URL",
    "GOOGLE_SHEETS_DOCS_URL",
    "GOOGLE_SHEETS_PUBLISHED_URL",
  );
  const configuredPath = readEnvValue("WORKBOOK_SOURCE_PATH");

  if (configuredUrl) {
    return {
      kind: "url",
      value: configuredUrl,
      displayValue: configuredUrl,
    };
  }

  if (configuredPath) {
    if (isHttpUrl(configuredPath)) {
      return {
        kind: "url",
        value: configuredPath,
        displayValue: configuredPath,
      };
    }

    const resolvedPath = resolveWorkbookPath(configuredPath);
    return {
      kind: "path",
      value: resolvedPath,
      displayValue: resolvedPath,
    };
  }

  const defaultPath = resolveWorkbookPath(DEFAULT_ONEDRIVE_WORKBOOK_PATH);
  if (fs.existsSync(defaultPath)) {
    return {
      kind: "path",
      value: defaultPath,
      displayValue: defaultPath,
    };
  }

  return {
    kind: "url",
    value: DEFAULT_GOOGLE_SHEETS_DOCS_URL,
    displayValue: DEFAULT_GOOGLE_SHEETS_DOCS_URL,
  };
}

function getWorkbookCacheTtlMs(): number {
  const rawValue = Number(readEnvValue("WORKBOOK_CACHE_TTL_MS") || DEFAULT_WORKBOOK_CACHE_TTL_MS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_WORKBOOK_CACHE_TTL_MS;
}

function resolveReadableWorkbookSource(): ResolvedWorkbookSource {
  const source = getConfiguredWorkbookSource();

  if (source.kind === "url") {
    return {
      kind: "url",
      value: source.value,
      displayValue: source.displayValue,
      cacheKey: `url:${source.value}`,
      isRemote: true,
    };
  }

  const shouldUseHostedFallback =
    process.platform !== "win32" &&
    isWindowsAbsolutePath(source.value);

  if (shouldUseHostedFallback && !fs.existsSync(source.value)) {
    const fallbackUrl = getDefaultHostedWorkbookUrl();
    return {
      kind: "url",
      value: fallbackUrl,
      displayValue: fallbackUrl,
      cacheKey: `url:${fallbackUrl}`,
      isRemote: true,
    };
  }

  return {
    kind: "path",
    value: source.value,
    displayValue: source.displayValue,
    cacheKey: `path:${source.value}`,
    isRemote: false,
  };
}

function getPathWorkbookSignature(source: ResolvedWorkbookSource): string {
  const stats = fs.statSync(source.value);
  return `${source.cacheKey}:${stats.size}:${stats.mtimeMs}`;
}

function isLikelyFolderLink(value: string): boolean {
  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    return (
      pathname.includes("/folders/") ||
      pathname.endsWith("/forms/allitems.aspx") ||
      pathname.includes("/_layouts/15/onedrive.aspx")
    );
  } catch {
    return false;
  }
}

function isSharePointWorkbookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname.includes("sharepoint.com") || url.hostname.includes("onedrive.live.com") || url.hostname.includes("1drv.ms");
  } catch {
    return false;
  }
}

function isGoogleSheetsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "docs.google.com" && url.pathname.includes("/spreadsheets/");
  } catch {
    return false;
  }
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

function getGoogleSheetsDocsUrl(value: string): string | null {
  if (extractGoogleSheetId(value)) {
    return value;
  }

  const configuredDocsUrl = readEnvValue(
    "WORKBOOK_SOURCE_URL",
    "GOOGLE_SHEETS_URL",
    "GOOGLE_SHEETS_DOCS_URL",
  );

  if (extractGoogleSheetId(configuredDocsUrl)) {
    return configuredDocsUrl;
  }

  return DEFAULT_GOOGLE_SHEETS_DOCS_URL;
}

function normalizeRemoteWorkbookUrl(value: string): string {
  try {
    if (isGoogleSheetsUrl(value)) {
      const docsUrl = getGoogleSheetsDocsUrl(value);
      const sheetId = docsUrl ? extractGoogleSheetId(docsUrl) : null;
      if (sheetId) {
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      }
    }

    const url = new URL(value);
    url.searchParams.delete("web");

    if (
      url.hostname.includes("sharepoint.com") ||
      url.hostname.includes("onedrive.live.com") ||
      url.hostname.includes("1drv.ms")
    ) {
      url.searchParams.set("download", "1");
    }

    return url.toString();
  } catch {
    return value;
  }
}

function encodeSharingUrlForGraph(value: string): string {
  return `u!${Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;
}

function parseWorkbookBuffer(buffer: Buffer, failureMessage: string): xlsx.WorkBook {
  try {
    return xlsx.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new Error(failureMessage);
  }
}

function extractUserPrincipalNameFromShareUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/personal\/([^/]+)/i);
    if (!match) {
      return null;
    }

    const token = decodeURIComponent(match[1]);
    const parts = token.split("_").filter(Boolean);
    if (parts.length < 3) {
      return null;
    }

    return `${parts[0]}@${parts.slice(1).join(".")}`;
  } catch {
    return null;
  }
}

function extractWorkbookRelativePathFromLocalPath(value: string): string | null {
  const normalized = value.replace(/\//g, "\\");
  const driveRootMatch = normalized.match(/OneDrive[^\\]*\\(.+)$/i);
  if (!driveRootMatch) {
    return null;
  }

  return driveRootMatch[1]?.replace(/\\/g, "/") || null;
}

function getGraphWorkbookLocation(workbookUrl: string): GraphWorkbookLocation | null {
  const configuredUser = readEnvValue(
    "ONEDRIVE_GRAPH_USER",
    "ONEDRIVE_GRAPH_UPN",
    "ONEDRIVE_USER_EMAIL",
  );
  const configuredPath = readEnvValue(
    "ONEDRIVE_GRAPH_FILE_PATH",
    "ONEDRIVE_WORKBOOK_FILE_PATH",
  );

  const userPrincipalName = configuredUser || extractUserPrincipalNameFromShareUrl(workbookUrl);
  const workbookPath =
    configuredPath ||
    extractWorkbookRelativePathFromLocalPath(readEnvValue("ONEDRIVE_XLSX_PATH") || DEFAULT_ONEDRIVE_WORKBOOK_PATH);

  if (!userPrincipalName || !workbookPath) {
    return null;
  }

  return {
    userPrincipalName,
    workbookPath: workbookPath.replace(/^\/+/, ""),
  };
}

function encodeGraphDrivePath(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function getGraphAccessToken(): Promise<string> {
  const credentials = getGraphCredentials();
  if (!credentials) {
    throw new Error(
      "SharePoint blocked anonymous workbook download. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET for Microsoft Graph access, or change the file share settings.",
    );
  }

  const cacheKey = `${credentials.tenantId}:${credentials.clientId}`;
  if (graphTokenCache && graphTokenCache.cacheKey === cacheKey && graphTokenCache.expiresAt > Date.now()) {
    return graphTokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: "client_credentials",
    scope: GRAPH_SCOPE,
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(credentials.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to acquire Microsoft Graph token: ${response.status} ${response.statusText} ${details}`.trim());
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Microsoft Graph token response did not include an access token.");
  }

  graphTokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max((payload.expires_in || 3600) - 300, 60) * 1000,
    cacheKey,
  };

  return payload.access_token;
}

async function fetchWorkbookViaGraph(workbookUrl: string): Promise<xlsx.WorkBook> {
  const accessToken = await getGraphAccessToken();
  const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodeSharingUrlForGraph(workbookUrl)}/driveItem/content`;
  const response = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Microsoft Graph workbook download failed with ${response.status} ${response.statusText}. Confirm the app has Files.Read.All or Sites.Read.All with admin consent. ${details}`.trim(),
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return parseWorkbookBuffer(buffer, "Microsoft Graph returned a response that could not be parsed as an Excel workbook.");
}

async function fetchWorkbookViaGraphDrivePath(workbookUrl: string): Promise<xlsx.WorkBook> {
  const location = getGraphWorkbookLocation(workbookUrl);
  if (!location) {
    throw new Error(
      "Microsoft Graph direct drive fallback could not determine the workbook owner and path. Set ONEDRIVE_GRAPH_USER and ONEDRIVE_GRAPH_FILE_PATH.",
    );
  }

  const accessToken = await getGraphAccessToken();
  const graphUrl =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(location.userPrincipalName)}` +
    `/drive/root:/${encodeGraphDrivePath(location.workbookPath)}:/content`;

  const response = await fetch(graphUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Microsoft Graph direct drive download failed with ${response.status} ${response.statusText} for ${location.userPrincipalName}/${location.workbookPath}. Confirm the app has Files.Read.All or Sites.Read.All with admin consent and that the path is correct. ${details}`.trim(),
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return parseWorkbookBuffer(buffer, "Microsoft Graph direct drive response could not be parsed as an Excel workbook.");
}

async function fetchWorkbookViaGraphWithFallback(workbookUrl: string): Promise<xlsx.WorkBook> {
  try {
    return await fetchWorkbookViaGraph(workbookUrl);
  } catch (shareError) {
    try {
      return await fetchWorkbookViaGraphDrivePath(workbookUrl);
    } catch (driveError) {
      const shareMessage = shareError instanceof Error ? shareError.message : String(shareError);
      const driveMessage = driveError instanceof Error ? driveError.message : String(driveError);
      throw new Error(`${shareMessage} Graph direct-drive fallback also failed: ${driveMessage}`);
    }
  }
}

function looksLikeWorkbook(buffer: Buffer): boolean {
  if (buffer.length < 2) {
    return false;
  }

  return buffer.subarray(0, 2).toString("utf8") === XLSX_MAGIC_HEADER;
}

async function fetchRemoteWorkbook(workbookUrl: string): Promise<xlsx.WorkBook> {
  if (isLikelyFolderLink(workbookUrl)) {
    throw new Error(
      "Folder links are not supported as a workbook source. Use WORKBOOK_SOURCE_URL with the Google Sheets docs URL or another direct workbook file URL.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_WORKBOOK_TIMEOUT_MS);

  try {
    const response = await fetch(normalizeRemoteWorkbookUrl(workbookUrl), {
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      if (
        (response.status === 401 || response.status === 403) &&
        isSharePointWorkbookUrl(workbookUrl)
      ) {
        return fetchWorkbookViaGraphWithFallback(workbookUrl);
      }

      throw new Error(`Remote workbook download failed with ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if ((contentType.includes("text/html") || contentType.includes("text/plain")) && !looksLikeWorkbook(buffer)) {
      if (isSharePointWorkbookUrl(workbookUrl) && getGraphCredentials()) {
        return fetchWorkbookViaGraphWithFallback(workbookUrl);
      }

      throw new Error(
        "The remote workbook URL returned a web page instead of an Excel file. Use the Google Sheets docs URL or another direct workbook file URL.",
      );
    }

    return parseWorkbookBuffer(
      buffer,
      "The remote workbook response could not be parsed as an Excel workbook. Confirm the source URL points to a valid workbook export.",
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timed out while downloading the remote workbook.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readWorkbookFromSource(source: ResolvedWorkbookSource): Promise<xlsx.WorkBook> {
  if (source.kind === "url") {
    return fetchRemoteWorkbook(source.value);
  }

  if (!fs.existsSync(source.value)) {
    throw new Error(
      `Workbook file not found at ${source.value}. On Render, set WORKBOOK_SOURCE_URL to the Google Sheets docs URL or another direct workbook file URL.`,
    );
  }

  return xlsx.readFile(source.value, { cellDates: true });
}

function shouldReuseParsedWorkbookSnapshot(snapshot: ParsedWorkbookSnapshot, source: ResolvedWorkbookSource): boolean {
  if (snapshot.cacheKey !== source.cacheKey) {
    return false;
  }

  if (source.isRemote) {
    return Date.now() - snapshot.loadedAt < getWorkbookCacheTtlMs();
  }

  if (!fs.existsSync(source.value)) {
    return false;
  }

  return snapshot.sourceSignature === getPathWorkbookSignature(source);
}

async function buildParsedWorkbookSnapshot(source: ResolvedWorkbookSource): Promise<ParsedWorkbookSnapshot> {
  const workbook = await readWorkbookFromSource(source);
  const sheets: Record<string, WorkbookSheetSummary> = {};
  const leadRecords: DashboardLeadRecord[] = [];
  const emailRecords: DashboardEmailRecord[] = [];
  const leadRowsBySheet: Record<string, LeadResponse[]> = {};

  for (const sheetName of workbook.SheetNames) {
    const rows = loadSheetRows(workbook, sheetName);
    const isEmailSheet = rows.some((row) => hasColumn(row, "Contact Stage"));
    sheets[sheetName] = isEmailSheet ? buildEmailSummary(sheetName, rows) : buildLeadSummary(sheetName, rows);

    if (isEmailSheet) {
      rows.forEach((row, index) => {
        emailRecords.push(normalizeEmailRecord(sheetName, row, index));
      });
      continue;
    }

    leadRowsBySheet[sheetName] = rows.map((row, index) => toLeadResponse(row, index + 1));
    rows.forEach((row, index) => {
      leadRecords.push(normalizeLeadRecord(sheetName, row, index));
    });
  }

  return {
    sourceUrl: source.displayValue,
    syncedAt: new Date().toISOString(),
    loadedAt: Date.now(),
    cacheKey: source.cacheKey,
    sourceSignature: source.isRemote ? source.cacheKey : getPathWorkbookSignature(source),
    sheetOrder: workbook.SheetNames,
    sheets,
    sheetOptions: buildDashboardSheetOptions(workbook.SheetNames, sheets),
    leadRecords,
    emailRecords,
    leadRowsBySheet,
  };
}

async function getParsedWorkbookSnapshot(): Promise<ParsedWorkbookSnapshot> {
  const source = resolveReadableWorkbookSource();
  if (parsedWorkbookSnapshotCache && shouldReuseParsedWorkbookSnapshot(parsedWorkbookSnapshotCache, source)) {
    return parsedWorkbookSnapshotCache;
  }

  if (!parsedWorkbookSnapshotPromise) {
    parsedWorkbookSnapshotPromise = buildParsedWorkbookSnapshot(source)
      .then((snapshot) => {
        parsedWorkbookSnapshotCache = snapshot;
        return snapshot;
      })
      .finally(() => {
        parsedWorkbookSnapshotPromise = null;
      });
  }

  return parsedWorkbookSnapshotPromise;
}

export async function warmWorkbookCache(): Promise<void> {
  await getParsedWorkbookSnapshot();
}

export async function getWorkbookDashboard(filters: DashboardFilters = {}): Promise<WorkbookDashboardResponse> {
  const snapshot = await getParsedWorkbookSnapshot();
  const dashboardView = buildDashboardView(snapshot.leadRecords, snapshot.emailRecords, filters, snapshot.sheetOptions);

  return {
    sourceUrl: snapshot.sourceUrl,
    syncedAt: snapshot.syncedAt,
    sheetOrder: snapshot.sheetOrder,
    sheets: snapshot.sheets,
    ...dashboardView,
  };
}

export async function getLeadRowsFromWorkbook(sheetName = "2026 Leads"): Promise<LeadResponse[]> {
  const snapshot = await getParsedWorkbookSnapshot();
  const leadSheetNames = snapshot.sheetOrder.filter((name) => snapshot.sheets[name]?.sheetType === "leads");
  const targetSheet = leadSheetNames.includes(sheetName) ? sheetName : leadSheetNames[0] || snapshot.sheetOrder[0];
  return snapshot.leadRowsBySheet[targetSheet] || [];
}

export function getWorkbookSourceUrl(): string {
  return resolveReadableWorkbookSource().displayValue;
}
