import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(React.createElement);
const XLSX = window.XLSX;

const SHARED_WORKBOOK_URL =
  "https://ikioledlighting99-my.sharepoint.com/:x:/g/personal/dlalwani_ikioledlighting_com/IQCsKfOLIu9-SbAW-Je4YYHJAWBbex7KRI_Myyv6cMYddI4?e=06qHCR";
const SALES_MAPPER_DATA_URL = "./data/sales-mapper-data.json";
const POLL_INTERVAL_MS = 5 * 60 * 1000;

const MONTH_META = [
  { abbr: "Jan", label: "January", quarter: "Q1", index: 0 },
  { abbr: "Feb", label: "February", quarter: "Q1", index: 1 },
  { abbr: "Mar", label: "March", quarter: "Q1", index: 2 },
  { abbr: "Apr", label: "April", quarter: "Q2", index: 3 },
  { abbr: "May", label: "May", quarter: "Q2", index: 4 },
  { abbr: "Jun", label: "June", quarter: "Q2", index: 5 },
  { abbr: "Jul", label: "July", quarter: "Q3", index: 6 },
  { abbr: "Aug", label: "August", quarter: "Q3", index: 7 },
  { abbr: "Sep", label: "September", quarter: "Q3", index: 8 },
  { abbr: "Oct", label: "October", quarter: "Q4", index: 9 },
  { abbr: "Nov", label: "November", quarter: "Q4", index: 10 },
  { abbr: "Dec", label: "December", quarter: "Q4", index: 11 },
];

const MONTH_LOOKUP = Object.fromEntries(MONTH_META.map((item) => [item.abbr, item]));
const DONUT_COLORS = ["#7ac4ff", "#0d6fbc", "#8f2cc9", "#256e94", "#e250a6", "#4d8bb8"];

const US_STATES = [
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

const US_STATE_SET = new Set(US_STATES.map(([code]) => code));
const STATE_CODE_TO_NAME = Object.fromEntries(US_STATES.map(([code, name]) => [code, name]));
const STATE_NAME_TO_CODE = Object.fromEntries(
  US_STATES.flatMap(([code, name]) => [
    [code, code],
    [name.toUpperCase(), code],
  ]),
);
STATE_NAME_TO_CODE["WASHINGTON DC"] = "DC";
STATE_NAME_TO_CODE["WASHINGTON, DC"] = "DC";
STATE_NAME_TO_CODE["DISTRICT OF COLUMBIA"] = "DC";

const STATE_CENTROIDS = {
  AL: [32.806671, -86.79113],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.5266, -96.726486],
  KY: [37.66814, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.12537, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  RI: [41.680893, -71.51178],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.30249],
  DC: [38.9072, -77.0369],
};

const DEFAULT_FILTERS = {
  campaignType: "All",
  segment: "All",
  year: "All",
  quarter: "All",
  month: "All",
  state: "All",
  responseType: "All",
};

const DEFAULT_SALES_FILTERS = {
  projectType: "All",
  productCategory: "All",
};
const SALES_MAP_NEAREST_LIMIT = 5;

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatMiles(value) {
  if (!Number.isFinite(Number(value))) return "(Blank)";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value))} mi`;
}

function formatTimestamp(value) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleString("en-US");
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US");
}

function cleanValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const stripped = value.trim();
    return stripped || null;
  }
  return value;
}

function safeNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function textOrFallback(value, fallback = "Unknown") {
  const cleaned = cleanValue(value);
  return cleaned === null ? fallback : String(cleaned);
}

function normalizeState(value) {
  const cleaned = cleanValue(value);
  if (!cleaned) return null;
  const normalized = String(cleaned)
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (STATE_NAME_TO_CODE[normalized]) return STATE_NAME_TO_CODE[normalized];
  if (/^[A-Z]{2}$/.test(normalized) && US_STATE_SET.has(normalized)) return normalized;
  return null;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function inferYear(dateValue, sheetName) {
  if (dateValue) return String(dateValue.getFullYear());
  const match = String(sheetName || "").match(/\b(20\d{2})\b/);
  return match ? match[1] : "Unknown";
}

function normalizeMonth(value, dateValue) {
  const cleaned = cleanValue(value);
  if (cleaned) {
    const normalized = String(cleaned).trim().toLowerCase();
    const found = MONTH_META.find(
      (item) =>
        item.abbr.toLowerCase() === normalized ||
        item.label.toLowerCase() === normalized ||
        item.label.toLowerCase().startsWith(normalized) ||
        item.abbr.toLowerCase() === normalized.slice(0, 3),
    );
    if (found) return found.abbr;
  }
  if (dateValue) {
    return MONTH_META[dateValue.getMonth()]?.abbr || null;
  }
  return null;
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, cleanValue(value)]));
}

function loadSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return XLSX.utils
    .sheet_to_json(sheet, { defval: null, raw: false, dateNF: "yyyy-mm-dd" })
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== null));
}

function normalizeLeadRecord(row, sheetName, index) {
  const dateValue = parseDateValue(row.Date);
  const month = normalizeMonth(row.Month, dateValue);
  const monthMeta = month ? MONTH_LOOKUP[month] : null;
  const stateCode = normalizeState(row.State);
  const leadStage = textOrFallback(row["Lead Stage"]);

  return {
    id: `lead-${sheetName}-${index}`,
    recordType: "lead",
    sheetName,
    date: dateValue ? dateValue.toISOString().slice(0, 10) : cleanValue(row.Date),
    dateSort: dateValue ? dateValue.getTime() : 0,
    month: month || "Unknown",
    monthLabel: monthMeta ? monthMeta.label : "Unknown",
    monthIndex: monthMeta ? monthMeta.index : 99,
    quarter: monthMeta ? monthMeta.quarter : "Unknown",
    year: inferYear(dateValue, sheetName),
    campaignType: textOrFallback(row["Campaign Type"]),
    segment: textOrFallback(row["Lead type"]),
    responseType: textOrFallback(row["Response Type"]),
    leadStage,
    state: stateCode || "Unknown",
    stateCode,
    accountName: textOrFallback(row["Account Name"]),
    assignTo: textOrFallback(row["Assign to"], "Unassigned"),
    outcome: textOrFallback(row.Outcome, ""),
    actionForSales: textOrFallback(row["Action for sales"], ""),
    revenue: safeNumber(row.Revenue),
    quoted: /quote/i.test(leadStage),
  };
}

function normalizeEmailRecord(row, sheetName, index) {
  const dateValue = parseDateValue(row["Email Run Date"]);
  const month = normalizeMonth(row.Month, dateValue);
  const monthMeta = month ? MONTH_LOOKUP[month] : null;
  const stateCode = normalizeState(row.State);

  return {
    id: `email-${sheetName}-${index}`,
    recordType: "email",
    sheetName,
    date: dateValue ? dateValue.toISOString().slice(0, 10) : cleanValue(row["Email Run Date"]),
    dateSort: dateValue ? dateValue.getTime() : 0,
    month: month || "Unknown",
    monthLabel: monthMeta ? monthMeta.label : "Unknown",
    monthIndex: monthMeta ? monthMeta.index : 99,
    quarter: monthMeta ? monthMeta.quarter : "Unknown",
    year: inferYear(dateValue, sheetName),
    campaignType: textOrFallback(row["Campaign Type"]),
    segment: textOrFallback(row["Lead type"]),
    responseType: textOrFallback(row["Contact Stage"]),
    contactStage: textOrFallback(row["Contact Stage"]),
    state: stateCode || "Unknown",
    stateCode,
    companyName: textOrFallback(row["Company Name"]),
    salesOwner: textOrFallback(row["Sales Owner"], "Unassigned"),
  };
}

function buildCountOptions(records, selector) {
  const counts = {};

  for (const record of records) {
    const value = selector(record);
    if (!value || value === "Unknown") continue;
    counts[value] = (counts[value] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([value]) => ({ value, label: value }));
}

function buildDashboardData(workbook) {
  const leadRecords = [];
  const emailRecords = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = loadSheetRows(workbook, sheetName);
    const isEmailSheet = sheetName.toLowerCase().includes("email") || rows.some((row) => row["Contact Stage"] !== null);

    rows.forEach((row, index) => {
      if (isEmailSheet) {
        emailRecords.push(normalizeEmailRecord(row, sheetName, index));
      } else {
        leadRecords.push(normalizeLeadRecord(row, sheetName, index));
      }
    });
  }

  const combinedRecords = [...leadRecords, ...emailRecords];
  const years = [...new Set(combinedRecords.map((record) => record.year).filter((value) => /^\d{4}$/.test(value)))].sort(
    (a, b) => Number(b) - Number(a),
  );

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: SHARED_WORKBOOK_URL,
    leadRecords,
    emailRecords,
    filterOptions: {
      campaignType: buildCountOptions(combinedRecords, (record) => record.campaignType),
      segment: buildCountOptions(combinedRecords, (record) => record.segment),
      year: years.map((value) => ({ value, label: value })),
      quarter: ["Q1", "Q2", "Q3", "Q4"]
        .filter((quarter) => combinedRecords.some((record) => record.quarter === quarter))
        .map((value) => ({ value, label: value })),
      month: MONTH_META.filter((item) => combinedRecords.some((record) => record.month === item.abbr)).map((item) => ({
        value: item.abbr,
        label: item.label,
      })),
      state: US_STATES.filter(([code]) => combinedRecords.some((record) => record.stateCode === code)).map(([code]) => ({
        value: code,
        label: code,
      })),
      responseType: buildCountOptions(leadRecords, (record) => record.responseType),
    },
  };
}

function buildWorkbookDownloadUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("download", "1");
  url.searchParams.set("ts", String(Date.now()));
  return url.toString();
}

async function fetchWorkbookData() {
  const response = await fetch(buildWorkbookDownloadUrl(SHARED_WORKBOOK_URL), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Workbook request failed with status ${response.status}`);
  }

  const workbook = XLSX.read(await response.arrayBuffer(), {
    type: "array",
    cellDates: true,
  });

  return buildDashboardData(workbook);
}

function sanitizeFilters(filters, filterOptions) {
  const nextFilters = { ...filters };

  for (const [key, value] of Object.entries(nextFilters)) {
    if (value === "All") continue;
    const options = filterOptions[key] || [];
    if (!options.some((option) => option.value === value)) {
      nextFilters[key] = "All";
    }
  }

  return nextFilters;
}

function recordMatchesFilters(record, filters, includeResponseType) {
  if (filters.campaignType !== "All" && record.campaignType !== filters.campaignType) return false;
  if (filters.segment !== "All" && record.segment !== filters.segment) return false;
  if (filters.year !== "All" && record.year !== filters.year) return false;
  if (filters.quarter !== "All" && record.quarter !== filters.quarter) return false;
  if (filters.month !== "All" && record.month !== filters.month) return false;
  if (filters.state !== "All" && record.stateCode !== filters.state) return false;
  if (includeResponseType && filters.responseType !== "All" && record.responseType !== filters.responseType) return false;
  return true;
}

function bucketResponseType(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) return null;
  if (normalized === "negative") return "Negative";
  if (normalized === "positive" || normalized === "opportunity") return "Positive";
  return null;
}

function truncateLabel(label, max = 12) {
  return label.length > max ? `${label.slice(0, max - 1)}...` : label;
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const earthRadiusMiles = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function buildValueOptions(values) {
  return values.map((value) => ({ value, label: value }));
}

function collapseTopItems(items, limit = 5) {
  if (items.length <= limit) return items;
  const head = items.slice(0, limit);
  const otherValue = items.slice(limit).reduce((sum, item) => sum + item.value, 0);
  return otherValue ? [...head, { label: "Other", value: otherValue }] : head;
}

function EmptyPanel({ title, caption, message }) {
  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">${title}</h3>
          <p className="panel-caption">${caption}</p>
        </div>
      </div>
      <div className="empty-state">${message}</div>
    </section>
  `;
}

function StatusPanel({ title, detail }) {
  return html`
    <main className="status-page">
      <section className="status-panel">
        <div className="eyebrow">Live Workbook Sync</div>
        <h1 className="status-title">${title}</h1>
        <p className="status-detail">${detail}</p>
      </section>
    </main>
  `;
}

function FilterCard({ label, value, options, onChange }) {
  return html`
    <label className="control-card">
      <span className="control-label">${label}</span>
      <select className="control-select" value=${value} onChange=${(event) => onChange(event.target.value)}>
        <option value="All">All</option>
        ${options.map(
          (option) => html`
            <option key=${option.value} value=${option.value}>
              ${option.label}
            </option>
          `,
        )}
      </select>
    </label>
  `;
}

function KpiCard({ label, value }) {
  return html`
    <article className="kpi-card">
      <div className="kpi-label">${label}</div>
      <div className=${`kpi-value${value === "(Blank)" ? " is-blank" : ""}`}>${value}</div>
    </article>
  `;
}

function MonthlyResponseChart({ items }) {
  if (!items.length) {
    return html`<${EmptyPanel}
      title="Monthly Response"
      caption="Email sent versus lead responses by month"
      message="No matching monthly activity for the selected filters."
    />`;
  }

  const width = 640;
  const height = 290;
  const padding = { top: 26, right: 20, bottom: 48, left: 18 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...items.flatMap((item) => [item.emailSent, item.responses]), 1);
  const slotWidth = chartWidth / items.length;
  const barWidth = Math.min(54, slotWidth * 0.52);

  const points = items.map((item, index) => {
    const x = padding.left + slotWidth * index + slotWidth / 2;
    const y = padding.top + chartHeight - (item.responses / maxValue) * chartHeight;
    return { ...item, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Monthly Response</h3>
          <p className="panel-caption">Email sent versus lead responses by month</p>
        </div>
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot legend-email"></span>Email Sent</span>
        <span className="legend-item"><span className="legend-dot legend-response"></span>Response</span>
      </div>
      <svg className="chart-svg" viewBox="0 0 640 290" role="img" aria-label="Monthly response chart">
        ${[0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + chartHeight - chartHeight * step;
          return html`<line key=${`grid-${step}`} className="chart-grid-line" x1=${padding.left} x2=${width - padding.right} y1=${y} y2=${y} />`;
        })}
        ${items.map((item, index) => {
          const x = padding.left + slotWidth * index + (slotWidth - barWidth) / 2;
          const barHeight = (item.emailSent / maxValue) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return html`
            <g key=${item.month}>
              <rect className="chart-bar" x=${x} y=${y} width=${barWidth} height=${Math.max(barHeight, 2)} rx="10" />
              <text className="chart-bar-label" x=${x + barWidth / 2} y=${Math.max(y - 10, 16)} textAnchor="middle">
                ${formatCompact(item.emailSent)}
              </text>
              <text className="chart-axis-label" x=${x + barWidth / 2} y=${height - 12} textAnchor="middle">
                ${item.label}
              </text>
            </g>
          `;
        })}
        <path className="chart-line" d=${linePath} />
        ${points.map((point) => html`
          <g key=${`point-${point.month}`}>
            <circle className="chart-point" cx=${point.x} cy=${point.y} r="5" />
            <text className="chart-point-label" x=${point.x} y=${Math.max(point.y - 12, 16)} textAnchor="middle">
              ${formatCompact(point.responses)}
            </text>
          </g>
        `)}
      </svg>
    </section>
  `;
}

function AgencyResponseChart({ items }) {
  if (!items.length) {
    return html`<${EmptyPanel}
      title="Agency Response"
      caption="Email sent and responses by campaign type"
      message="No campaign type activity for the selected filters."
    />`;
  }

  const width = 640;
  const height = 290;
  const padding = { top: 20, right: 16, bottom: 82, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...items.flatMap((item) => [item.emailSent, item.responses]), 1);
  const slotWidth = chartWidth / items.length;
  const barWidth = Math.min(22, slotWidth * 0.24);

  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Agency Response</h3>
          <p className="panel-caption">Email sent and responses by campaign type</p>
        </div>
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot legend-email"></span>Email Sent</span>
        <span className="legend-item"><span className="legend-dot legend-response light"></span>Response</span>
      </div>
      <svg className="chart-svg" viewBox="0 0 640 290" role="img" aria-label="Agency response chart">
        ${[0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + chartHeight - chartHeight * step;
          return html`<line key=${`agency-grid-${step}`} className="chart-grid-line" x1=${padding.left} x2=${width - padding.right} y1=${y} y2=${y} />`;
        })}
        ${items.map((item, index) => {
          const baseX = padding.left + slotWidth * index + slotWidth / 2;
          const emailHeight = (item.emailSent / maxValue) * chartHeight;
          const responseHeight = (item.responses / maxValue) * chartHeight;
          const emailX = baseX - barWidth - 4;
          const responseX = baseX + 4;
          const label = truncateLabel(item.label, 11);

          return html`
            <g key=${item.label}>
              <rect
                className="chart-bar"
                x=${emailX}
                y=${padding.top + chartHeight - emailHeight}
                width=${barWidth}
                height=${Math.max(emailHeight, 2)}
                rx="8"
              />
              <rect
                className="chart-bar chart-bar-secondary"
                x=${responseX}
                y=${padding.top + chartHeight - responseHeight}
                width=${barWidth}
                height=${Math.max(responseHeight, 2)}
                rx="8"
              />
              <text className="chart-bar-label" x=${emailX + barWidth / 2} y=${Math.max(padding.top + chartHeight - emailHeight - 8, 16)} textAnchor="middle">
                ${formatCompact(item.emailSent)}
              </text>
              <text className="chart-bar-label muted" x=${responseX + barWidth / 2} y=${Math.max(padding.top + chartHeight - responseHeight - 8, 16)} textAnchor="middle">
                ${formatCompact(item.responses)}
              </text>
              <text className="chart-axis-label tilted" x=${baseX} y=${height - 12} textAnchor="end" transform=${`rotate(-32 ${baseX} ${height - 12})`}>
                ${label}
              </text>
            </g>
          `;
        })}
      </svg>
    </section>
  `;
}

function DonutPanel({ title, caption, items, centerLabel, centerValue }) {
  if (!items.length) {
    return html`<${EmptyPanel} title=${title} caption=${caption} message="No matching records for this panel." />`;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let cumulative = 0;
  const segments = items.map((item, index) => {
    const start = (cumulative / total) * 100;
    cumulative += item.value;
    const end = (cumulative / total) * 100;
    return {
      ...item,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
      start,
      end,
    };
  });

  const gradient = segments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ");

  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">${title}</h3>
          <p className="panel-caption">${caption}</p>
        </div>
      </div>
      <div className="donut-shell">
        <div className="donut" style=${{ background: `conic-gradient(${gradient})` }}>
          <div className="donut-hole">
            <span className="donut-total-label">${centerLabel}</span>
            <strong className="donut-total-value">${centerValue}</strong>
          </div>
        </div>
        <div className="donut-legend">
          ${segments.map((segment) => html`
            <div className="donut-legend-row" key=${segment.label}>
              <span className="legend-item">
                <span className="legend-dot" style=${{ background: segment.color }}></span>
                ${segment.label}
              </span>
              <span className="donut-legend-value">${formatPercent((segment.value / total) * 100)}</span>
            </div>
          `)}
        </div>
      </div>
    </section>
  `;
}

function LeadsTable({ items }) {
  return html`
    <section className="panel table-panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Lead Response Detail</h3>
          <p className="panel-caption">Filtered lead rows with response outcome and sales action</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Lead Stage</th>
              <th>Response Type</th>
              <th>State</th>
              <th>Account Name</th>
              <th>Assign to</th>
              <th>Final Outcome</th>
              <th>Action for sales</th>
            </tr>
          </thead>
          <tbody>
            ${items.length
              ? items.map((item) => html`
                  <tr key=${item.id}>
                    <td>${item.monthLabel}</td>
                    <td>${item.leadStage}</td>
                    <td>${item.responseType}</td>
                    <td>${item.state}</td>
                    <td>${item.accountName}</td>
                    <td>${item.assignTo}</td>
                    <td>${item.outcome || "-"}</td>
                    <td>${item.actionForSales || "-"}</td>
                  </tr>
                `)
              : html`
                  <tr>
                    <td colSpan="8" className="table-empty">No lead rows match the current filters.</td>
                  </tr>
                `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function StateMapPanel({ stateCounts }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.Plotly) return;

    const locations = US_STATES.map(([code]) => code);
    const zValues = locations.map((code) => stateCounts[code] || 0);
    const labelLocations = locations;
    const maxValue = Math.max(...zValues, 1);

    window.Plotly.react(
      mapRef.current,
      [
        {
          type: "choropleth",
          locationmode: "USA-states",
          locations,
          z: zValues,
          zmin: 0,
          zmax: maxValue,
          showscale: false,
          colorscale: [
            [0, "#d7e5f2"],
            [0.35, "#a8c0d8"],
            [0.7, "#6e95bc"],
            [1, "#0d4d8a"],
          ],
          marker: {
            line: {
              color: "#7d8ea3",
              width: 0.8,
            },
          },
          hovertemplate: "%{location}: %{z} records<extra></extra>",
        },
        {
          type: "scattergeo",
          locationmode: "USA-states",
          locations: labelLocations,
          text: labelLocations,
          mode: "text",
          showlegend: false,
          hoverinfo: "skip",
          textfont: {
            size: 8,
            color: "#233649",
            family: "Space Grotesk, sans-serif",
          },
        },
      ],
      {
        geo: {
          scope: "usa",
          projection: { type: "albers usa" },
          bgcolor: "rgba(0,0,0,0)",
          showland: true,
          landcolor: "#dce8f4",
          lakecolor: "rgba(0,0,0,0)",
          subunitcolor: "#7d8ea3",
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 0, r: 0, t: 0, b: 0 },
      },
      {
        displayModeBar: false,
        responsive: true,
      },
    );

    return () => {
      if (mapRef.current && window.Plotly) {
        window.Plotly.purge(mapRef.current);
      }
    };
  }, [stateCounts]);

  return html`
    <section className="panel map-panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Response Map</h3>
          <p className="panel-caption">Lead response volume by state with in-map abbreviations</p>
        </div>
      </div>
      <div className="map-wrap">
        <div ref=${mapRef} className="map-canvas"></div>
      </div>
    </section>
  `;
}

function PageStatusPanel({ title, detail }) {
  return html`
    <section className="status-panel page-status-panel">
      <div className="eyebrow">Dashboard Status</div>
      <h2 className="status-title">${title}</h2>
      <p className="status-detail">${detail}</p>
    </section>
  `;
}

function PageSwitcher({ activePage, onChange }) {
  return html`
    <nav className="page-switcher" aria-label="Dashboard pages">
      <button
        className=${`page-switcher-button${activePage === "lead-dashboard" ? " is-active" : ""}`}
        onClick=${() => onChange("lead-dashboard")}
      >
        Lead Sync
      </button>
      <button
        className=${`page-switcher-button${activePage === "sales-mapper" ? " is-active" : ""}`}
        onClick=${() => onChange("sales-mapper")}
      >
        Projects
      </button>
    </nav>
  `;
}

function LeadDashboardPage({ dashboardData, filters, setFilters, isLoading, syncError, lastSyncedAt }) {
  const filteredLeadRecords = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.leadRecords.filter((record) => recordMatchesFilters(record, filters, true));
  }, [dashboardData, filters]);

  const filteredEmailRecords = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.emailRecords.filter((record) => recordMatchesFilters(record, filters, false));
  }, [dashboardData, filters]);

  const monthlyResponse = useMemo(() => {
    const emailCounts = {};
    const responseCounts = {};

    filteredEmailRecords.forEach((record) => {
      if (!MONTH_LOOKUP[record.month]) return;
      emailCounts[record.month] = (emailCounts[record.month] || 0) + 1;
    });

    filteredLeadRecords.forEach((record) => {
      if (!MONTH_LOOKUP[record.month]) return;
      responseCounts[record.month] = (responseCounts[record.month] || 0) + 1;
    });

    return MONTH_META.map((item) => ({
      month: item.abbr,
      label: item.label,
      emailSent: emailCounts[item.abbr] || 0,
      responses: responseCounts[item.abbr] || 0,
    })).filter((item) => item.emailSent || item.responses);
  }, [filteredEmailRecords, filteredLeadRecords]);

  const agencyResponse = useMemo(() => {
    const totals = {};

    filteredEmailRecords.forEach((record) => {
      const key = record.campaignType || "Unknown";
      totals[key] ||= { label: key, emailSent: 0, responses: 0 };
      totals[key].emailSent += 1;
    });

    filteredLeadRecords.forEach((record) => {
      const key = record.campaignType || "Unknown";
      totals[key] ||= { label: key, emailSent: 0, responses: 0 };
      totals[key].responses += 1;
    });

    return Object.values(totals)
      .sort((a, b) => Math.max(b.emailSent, b.responses) - Math.max(a.emailSent, a.responses) || a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [filteredEmailRecords, filteredLeadRecords]);

  const targetEmailSent = useMemo(() => {
    const counts = {};

    filteredEmailRecords.forEach((record) => {
      const key = record.campaignType || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });

    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));

    return collapseTopItems(entries, 5);
  }, [filteredEmailRecords]);

  const conversionRatio = useMemo(() => {
    let positive = 0;
    let negative = 0;

    filteredLeadRecords.forEach((record) => {
      const bucket = bucketResponseType(record.responseType);
      if (bucket === "Positive") positive += 1;
      if (bucket === "Negative") negative += 1;
    });

    return [
      positive ? { label: "Positive", value: positive } : null,
      negative ? { label: "Negative", value: negative } : null,
    ].filter(Boolean);
  }, [filteredLeadRecords]);

  const stateCounts = useMemo(() => {
    const counts = {};
    const source = filteredLeadRecords.length ? filteredLeadRecords : filteredEmailRecords;

    source.forEach((record) => {
      if (!record.stateCode) return;
      counts[record.stateCode] = (counts[record.stateCode] || 0) + 1;
    });

    return counts;
  }, [filteredEmailRecords, filteredLeadRecords]);

  const recentLeads = useMemo(
    () =>
      [...filteredLeadRecords]
        .sort((a, b) => b.dateSort - a.dateSort || a.monthIndex - b.monthIndex || a.accountName.localeCompare(b.accountName))
        .slice(0, 14),
    [filteredLeadRecords],
  );

  const quoteCount = filteredLeadRecords.filter((record) => record.quoted).length;
  const revenueTotal = filteredLeadRecords.reduce((sum, record) => sum + record.revenue, 0);
  const quotedValue = quoteCount ? formatNumber(quoteCount) : "(Blank)";
  const revenueValue = revenueTotal ? formatCurrency(revenueTotal) : "(Blank)";
  const convertedTotal = conversionRatio.reduce((sum, item) => sum + item.value, 0);

  if (isLoading && !dashboardData) {
    return html`
      <${PageStatusPanel}
        title="Loading workbook"
        detail="Reading the shared Excel file and building the live lead dashboard."
      />
    `;
  }

  if (!dashboardData) {
    return html`
      <${PageStatusPanel}
        title="Workbook sync failed"
        detail=${`The dashboard could not read the shared workbook. ${syncError || "Check the shared Excel link and browser access."}`}
      />
    `;
  }

  return html`
    <section className="page-section">
      <header className="dashboard-head">
        <div>
          <div className="eyebrow">Lead Sync Dashboard</div>
          <h1 className="page-title">Campaign performance, conversion, and state coverage</h1>
          <p className="page-copy">
            This layout is mapped directly to the live workbook with the requested KPI cards, campaign filters, response visuals, and a U.S. map that writes state abbreviations on active states.
          </p>
        </div>
        <div className="head-meta">
          <span className="meta-pill">Last sync ${formatTimestamp(lastSyncedAt)}</span>
          <span className="meta-pill">${formatNumber(filteredEmailRecords.length)} email sent</span>
          <span className="meta-pill">${formatNumber(filteredLeadRecords.length)} responses</span>
          <span className="meta-pill">${recentLeads[0] ? `Latest lead ${formatDateLabel(recentLeads[0].date)}` : "No recent lead activity"}</span>
        </div>
      </header>

      ${syncError
        ? html`<div className="inline-alert">Last refresh failed: ${syncError}. The dashboard is showing the most recent successful sync.</div>`
        : null}

      <section className="toolbar-grid">
        <${FilterCard}
          label="Campaign Type"
          value=${filters.campaignType}
          options=${dashboardData.filterOptions.campaignType}
          onChange=${(value) => setFilters((current) => ({ ...current, campaignType: value }))}
        />
        <${FilterCard}
          label="Segment"
          value=${filters.segment}
          options=${dashboardData.filterOptions.segment}
          onChange=${(value) => setFilters((current) => ({ ...current, segment: value }))}
        />
        <${FilterCard}
          label="Year"
          value=${filters.year}
          options=${dashboardData.filterOptions.year}
          onChange=${(value) => setFilters((current) => ({ ...current, year: value }))}
        />
        <${FilterCard}
          label="Quarter"
          value=${filters.quarter}
          options=${dashboardData.filterOptions.quarter}
          onChange=${(value) => setFilters((current) => ({ ...current, quarter: value }))}
        />
        <${FilterCard}
          label="Month"
          value=${filters.month}
          options=${dashboardData.filterOptions.month}
          onChange=${(value) => setFilters((current) => ({ ...current, month: value }))}
        />
        <${FilterCard}
          label="State"
          value=${filters.state}
          options=${dashboardData.filterOptions.state}
          onChange=${(value) => setFilters((current) => ({ ...current, state: value }))}
        />
        <${FilterCard}
          label="Response Type"
          value=${filters.responseType}
          options=${dashboardData.filterOptions.responseType}
          onChange=${(value) => setFilters((current) => ({ ...current, responseType: value }))}
        />
        <${KpiCard} label="Quoted" value=${quotedValue} />
        <${KpiCard} label="Revenue" value=${revenueValue} />
        <article className="clear-card">
          <button className="clear-button" onClick=${() => setFilters(DEFAULT_FILTERS)}>Clear</button>
        </article>
      </section>

      <section className="charts-grid">
        <${MonthlyResponseChart} items=${monthlyResponse} />
        <${AgencyResponseChart} items=${agencyResponse} />
        <${DonutPanel}
          title="Target Email Sent"
          caption="Email sent distribution by campaign type"
          items=${targetEmailSent}
          centerLabel="Emails"
          centerValue=${formatCompact(filteredEmailRecords.length)}
        />
        <${DonutPanel}
          title="Conversion Ratio"
          caption="Positive versus negative response mix"
          items=${conversionRatio}
          centerLabel="Responses"
          centerValue=${formatCompact(convertedTotal)}
        />
      </section>

      <section className="bottom-grid">
        <${LeadsTable} items=${recentLeads} />
        <${StateMapPanel} stateCounts=${stateCounts} />
      </section>
    </section>
  `;
}

function SalesCoveragePanel({ items }) {
  if (!items.length) {
    return html`<${EmptyPanel}
      title="State Coverage"
      caption="States ranked by mapped project count"
      message="No mapped states match the current mapper filters."
    />`;
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">State Coverage</h3>
          <p className="panel-caption">Mapped project count by state after filters</p>
        </div>
      </div>
      <div className="coverage-list">
        ${items.map((item) => html`
          <div className="coverage-row" key=${item.code}>
            <div className="coverage-meta">
              <strong>${item.code}</strong>
              <span>${item.label}</span>
            </div>
            <div className="coverage-bar-shell">
              <span className="coverage-bar-fill" style=${{ width: `${(item.value / maxValue) * 100}%` }}></span>
            </div>
            <div className="coverage-value">${formatNumber(item.value)}</div>
          </div>
        `)}
      </div>
    </section>
  `;
}

function SalesNearestPanel({ selectedState, nearestProject, nearestProjects }) {
  if (!nearestProject) {
    return html`<${EmptyPanel}
      title="Nearest Project"
      caption="Selected-state centroid to project ZIP centroid"
      message="No mapped projects are available for the current mapper filters."
    />`;
  }

  return html`
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Nearest Project</h3>
          <p className="panel-caption">
            ${STATE_CODE_TO_NAME[selectedState] || selectedState} centroid to the closest mapped project
          </p>
        </div>
      </div>

      <div className="nearest-hero">
        <div className="nearest-distance">${formatMiles(nearestProject.distanceMiles)}</div>
        <div className="nearest-name">${nearestProject.name}</div>
        <div className="nearest-location">
          ${nearestProject.city || "Unknown city"}, ${nearestProject.state || nearestProject.stateCode || "Unknown state"}
          ${nearestProject.zip ? ` ${nearestProject.zip}` : ""}
        </div>
      </div>

      <div className="nearest-detail-grid">
        <article className="nearest-detail-card">
          <span className="nearest-detail-label">Category</span>
          <strong>${nearestProject.productCategory || "Unspecified"}</strong>
        </article>
        <article className="nearest-detail-card">
          <span className="nearest-detail-label">Type</span>
          <strong>${nearestProject.projectType || "Unspecified"}</strong>
        </article>
        <article className="nearest-detail-card">
          <span className="nearest-detail-label">Energy Savings</span>
          <strong>${nearestProject.annualEnergySavingsKwh ? `${formatCompact(nearestProject.annualEnergySavingsKwh)} kWh` : "(Blank)"}</strong>
        </article>
        <article className="nearest-detail-card">
          <span className="nearest-detail-label">Cost Savings</span>
          <strong>${nearestProject.annualCostSavingsUsd ? formatCurrency(nearestProject.annualCostSavingsUsd) : "(Blank)"}</strong>
        </article>
      </div>

      <div className="nearest-list">
        ${nearestProjects.slice(0, 5).map((item, index) => html`
          <div className="nearest-list-row" key=${item.id}>
            <span className="nearest-rank">#${index + 1}</span>
            <span className="nearest-list-name">${item.name}</span>
            <span className="nearest-list-distance">${formatMiles(item.distanceMiles)}</span>
          </div>
        `)}
      </div>

      <p className="panel-footnote">Distances use Haversine miles from the selected state centroid to each project ZIP centroid.</p>
    </section>
  `;
}

function SalesProjectsTable({ items, selectedState }) {
  return html`
    <section className="panel table-panel sales-table-panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Nearest Project List</h3>
          <p className="panel-caption">
            Closest mapped projects from ${STATE_CODE_TO_NAME[selectedState] || selectedState}
          </p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table sales-data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Project Name</th>
              <th>City</th>
              <th>State</th>
              <th>ZIP</th>
              <th>Distance</th>
              <th>Category</th>
              <th>Annual Cost Savings</th>
            </tr>
          </thead>
          <tbody>
            ${items.length
              ? items.map((item, index) => html`
                  <tr key=${item.id}>
                    <td>${index + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.city || "-"}</td>
                    <td>${item.state || item.stateCode || "-"}</td>
                    <td>${item.zip || "-"}</td>
                    <td>${formatMiles(item.distanceMiles)}</td>
                    <td>${item.productCategory || "-"}</td>
                    <td>${item.annualCostSavingsUsd ? formatCurrency(item.annualCostSavingsUsd) : "-"}</td>
                  </tr>
                `)
              : html`
                  <tr>
                    <td colSpan="8" className="table-empty">No mapped projects match the current Projects filters.</td>
                  </tr>
                `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function SalesMapPanel({ stateCounts, projects, selectedState, setSelectedState, nearestProjects }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.Plotly) return;

    const locations = US_STATES.map(([code]) => code);
    const zValues = locations.map((code) => stateCounts[code] || 0);
    const maxValue = Math.max(...zValues, 1);
    const traces = [
      {
        type: "choropleth",
        locationmode: "USA-states",
        locations,
        z: zValues,
        zmin: 0,
        zmax: maxValue,
        showscale: false,
        colorscale: [
          [0, "#d7e5f2"],
          [0.35, "#a8c0d8"],
          [0.7, "#6e95bc"],
          [1, "#0d4d8a"],
        ],
        marker: {
          line: {
            color: "#7d8ea3",
            width: 0.8,
          },
        },
        hovertemplate: "%{location}: %{z} mapped projects<extra></extra>",
      },
    ];

    if (projects.length) {
      traces.push({
        type: "scattergeo",
        lat: projects.map((project) => project.latitude),
        lon: projects.map((project) => project.longitude),
        text: projects.map((project) => project.name),
        mode: "markers",
        marker: {
          size: 9,
          color: "#2de1c2",
          line: {
            color: "#ffffff",
            width: 1.1,
          },
          opacity: 0.9,
        },
        customdata: projects.map((project) => [
          project.city || "-",
          project.state || project.stateCode || "-",
          project.productCategory || "Unspecified",
          project.zip || "-",
        ]),
        hovertemplate:
          "<b>%{text}</b><br>%{customdata[0]}, %{customdata[1]}<br>%{customdata[2]}<br>ZIP %{customdata[3]}<extra></extra>",
        showlegend: false,
      });
    }

    const coveredStates = Object.keys(stateCounts).filter((stateCode) => stateCounts[stateCode] > 0);
    if (coveredStates.length) {
      traces.push({
        type: "scattergeo",
        lat: coveredStates.map((stateCode) => STATE_CENTROIDS[stateCode]?.[0]).filter(Boolean),
        lon: coveredStates.map((stateCode) => STATE_CENTROIDS[stateCode]?.[1]).filter(Boolean),
        text: coveredStates.filter((stateCode) => STATE_CENTROIDS[stateCode]),
        mode: "text",
        showlegend: false,
        hoverinfo: "skip",
        textfont: {
          size: 9,
          color: "#233649",
          family: "Space Grotesk, sans-serif",
        },
      });
    }

    if (selectedState && STATE_CENTROIDS[selectedState]) {
      const [selectedLat, selectedLon] = STATE_CENTROIDS[selectedState];

      traces.push({
        type: "choropleth",
        locationmode: "USA-states",
        locations: [selectedState],
        z: [1],
        colorscale: [
          [0, "rgba(0,0,0,0)"],
          [1, "rgba(0,0,0,0)"],
        ],
        showscale: false,
        marker: {
          line: {
            color: "#f7c65c",
            width: 2.4,
          },
        },
        hoverinfo: "skip",
      });

      traces.push({
        type: "scattergeo",
        lat: [selectedLat],
        lon: [selectedLon],
        text: [selectedState],
        mode: "markers+text",
        textposition: "bottom center",
        marker: {
          size: 11,
          color: "#f7c65c",
          line: {
            color: "#041f36",
            width: 2,
          },
        },
        hovertemplate: `${STATE_CODE_TO_NAME[selectedState] || selectedState} centroid<extra></extra>`,
        showlegend: false,
      });

      const visibleNearestProjects = nearestProjects
        .filter((project) => Number.isFinite(project.latitude) && Number.isFinite(project.longitude))
        .slice(0, SALES_MAP_NEAREST_LIMIT);

      if (visibleNearestProjects.length) {
        const lineLat = [];
        const lineLon = [];
        const midpointLat = [];
        const midpointLon = [];
        const midpointText = [];
        const highlightedCustomData = [];

        visibleNearestProjects.forEach((project, index) => {
          lineLat.push(selectedLat, project.latitude, null);
          lineLon.push(selectedLon, project.longitude, null);
          midpointLat.push((selectedLat + project.latitude) / 2);
          midpointLon.push((selectedLon + project.longitude) / 2);
          midpointText.push(`#${index + 1} ${formatMiles(project.distanceMiles)}`);
          highlightedCustomData.push([
            index + 1,
            project.city || "-",
            project.state || project.stateCode || "-",
            project.productCategory || "Unspecified",
            project.zip || "-",
            formatMiles(project.distanceMiles),
          ]);
        });

        traces.push({
          type: "scattergeo",
          lat: lineLat,
          lon: lineLon,
          mode: "lines",
          line: {
            color: "#ffb347",
            width: 2.1,
          },
          hoverinfo: "skip",
          showlegend: false,
        });

        traces.push({
          type: "scattergeo",
          lat: midpointLat,
          lon: midpointLon,
          text: midpointText,
          mode: "text",
          textfont: {
            size: 10,
            color: "#ffddb2",
            family: "Space Grotesk, sans-serif",
          },
          hoverinfo: "skip",
          showlegend: false,
        });

        traces.push({
          type: "scattergeo",
          lat: visibleNearestProjects.map((project) => project.latitude),
          lon: visibleNearestProjects.map((project) => project.longitude),
          text: visibleNearestProjects.map((project, index) => `#${index + 1} ${project.name}`),
          mode: "markers+text",
          textposition: "top center",
          marker: {
            size: 15,
            color: "#ff7b00",
            line: {
              color: "#ffffff",
              width: 2,
            },
          },
          customdata: highlightedCustomData,
          hovertemplate:
            "<b>%{text}</b><br>%{customdata[1]}, %{customdata[2]}<br>%{customdata[3]}<br>ZIP %{customdata[4]}<br>%{customdata[5]}<extra></extra>",
          showlegend: false,
        });
      }
    }

    window.Plotly.react(
      mapRef.current,
      traces,
      {
        geo: {
          scope: "usa",
          projection: { type: "albers usa" },
          bgcolor: "rgba(0,0,0,0)",
          showland: true,
          landcolor: "#dce8f4",
          lakecolor: "rgba(0,0,0,0)",
          subunitcolor: "#7d8ea3",
        },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { l: 0, r: 0, t: 0, b: 0 },
      },
      {
        displayModeBar: false,
        responsive: true,
      },
    );

    const handlePlotClick = (event) => {
      const point = event?.points?.[0];
      if (!point) return;

      if (typeof point.location === "string" && US_STATE_SET.has(point.location)) {
        setSelectedState(point.location);
        return;
      }

      if (typeof point.text === "string") {
        const match = point.text.match(/\b([A-Z]{2})\b/);
        if (match && US_STATE_SET.has(match[1])) {
          setSelectedState(match[1]);
        }
      }
    };

    mapRef.current.on("plotly_click", handlePlotClick);

    return () => {
      if (mapRef.current && window.Plotly) {
        window.Plotly.purge(mapRef.current);
      }
    };
  }, [nearestProjects, projects, selectedState, setSelectedState, stateCounts]);

  return html`
    <section className="panel sales-map-panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">U.S. Projects</h3>
          <p className="panel-caption">Coverage by project state, plus the top ${SALES_MAP_NEAREST_LIMIT} nearest mapped projects in miles</p>
        </div>
      </div>
      <div className="map-wrap">
        <div ref=${mapRef} className="map-canvas"></div>
      </div>
    </section>
  `;
}

function SalesMapperPage({ salesData, filters, setFilters, selectedState, setSelectedState, isLoading, loadError }) {
  const filteredProjects = useMemo(() => {
    if (!salesData?.projects) return [];
    return salesData.projects.filter((project) => {
      if (filters.projectType !== "All" && project.projectType !== filters.projectType) return false;
      if (filters.productCategory !== "All" && project.productCategory !== filters.productCategory) return false;
      return true;
    });
  }, [filters, salesData]);

  const mappedProjects = useMemo(
    () => filteredProjects.filter((project) => Number.isFinite(project.latitude) && Number.isFinite(project.longitude)),
    [filteredProjects],
  );

  const nearestProjects = useMemo(() => {
    const centroid = STATE_CENTROIDS[selectedState];
    if (!centroid) return [];
    const [lat0, lon0] = centroid;

    return mappedProjects
      .map((project) => ({
        ...project,
        distanceMiles: haversineMiles(lat0, lon0, project.latitude, project.longitude),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name));
  }, [mappedProjects, selectedState]);

  const nearestProject = nearestProjects[0] || null;

  const stateCounts = useMemo(() => {
    const counts = {};
    mappedProjects.forEach((project) => {
      if (!project.stateCode) return;
      counts[project.stateCode] = (counts[project.stateCode] || 0) + 1;
    });
    return counts;
  }, [mappedProjects]);

  const stateCoverage = useMemo(
    () =>
      Object.entries(stateCounts)
        .map(([code, value]) => ({ code, value, label: STATE_CODE_TO_NAME[code] || code }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
        .slice(0, 8),
    [stateCounts],
  );

  const productCategoryMix = useMemo(() => {
    const counts = {};
    filteredProjects.forEach((project) => {
      const key = project.productCategory || "Unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });
    const items = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
    return collapseTopItems(items, 5);
  }, [filteredProjects]);

  const projectTypeMix = useMemo(() => {
    const counts = {};
    filteredProjects.forEach((project) => {
      const key = project.projectType || "Unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });
    const items = Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
    return collapseTopItems(items, 5);
  }, [filteredProjects]);

  const summary = useMemo(
    () => ({
      projectCount: filteredProjects.length,
      mappedProjectCount: mappedProjects.length,
      coveredStateCount: Object.keys(stateCounts).length,
      annualEnergySavingsKwh: filteredProjects.reduce((sum, project) => sum + Number(project.annualEnergySavingsKwh || 0), 0),
      annualCostSavingsUsd: filteredProjects.reduce((sum, project) => sum + Number(project.annualCostSavingsUsd || 0), 0),
    }),
    [filteredProjects, mappedProjects.length, stateCounts],
  );

  if (isLoading && !salesData) {
    return html`
      <${PageStatusPanel}
        title="Loading Projects"
        detail="Reading the local project sheet, ZIP centroids, and map-ready project footprint."
      />
    `;
  }

  if (!salesData) {
    return html`
      <${PageStatusPanel}
        title="Projects unavailable"
        detail=${loadError || "The local project data file could not be loaded."}
      />
    `;
  }

  return html`
    <section className="page-section">
      <header className="dashboard-head">
        <div>
          <div className="eyebrow">Projects</div>
          <h1 className="page-title">U.S. project footprint and nearest-project lookup</h1>
          <p className="page-copy">
            Built from the provided IKIO case-study CSV. Distances are shown in miles using Haversine calculations from the selected state centroid to each mapped project ZIP centroid.
          </p>
        </div>
        <div className="head-meta">
          <span className="meta-pill">Generated ${formatTimestamp(salesData.generatedAt)}</span>
          <span className="meta-pill">${formatNumber(summary.projectCount)} filtered projects</span>
          <span className="meta-pill">${formatNumber(summary.mappedProjectCount)} mapped locations</span>
          <span className="meta-pill">${nearestProject ? `Nearest ${formatMiles(nearestProject.distanceMiles)}` : "No mapped result"}</span>
        </div>
      </header>

      <section className="toolbar-grid sales-toolbar-grid">
        <${FilterCard}
          label="From State"
          value=${selectedState}
          options=${US_STATES.map(([code, name]) => ({ value: code, label: `${code} - ${name}` }))}
          onChange=${setSelectedState}
        />
        <${FilterCard}
          label="Project Type"
          value=${filters.projectType}
          options=${buildValueOptions(salesData.filterOptions.projectTypes)}
          onChange=${(value) => setFilters((current) => ({ ...current, projectType: value }))}
        />
        <${FilterCard}
          label="Product Category"
          value=${filters.productCategory}
          options=${buildValueOptions(salesData.filterOptions.productCategories)}
          onChange=${(value) => setFilters((current) => ({ ...current, productCategory: value }))}
        />
        <${KpiCard} label="Projects" value=${formatNumber(summary.projectCount)} />
        <${KpiCard} label="Mapped" value=${formatNumber(summary.mappedProjectCount)} />
        <${KpiCard} label="States" value=${formatNumber(summary.coveredStateCount)} />
        <${KpiCard} label="Nearest" value=${nearestProject ? formatMiles(nearestProject.distanceMiles) : "(Blank)"} />
        <article className="clear-card">
          <button
            className="clear-button"
            onClick=${() => {
              setFilters(DEFAULT_SALES_FILTERS);
              setSelectedState(salesData.defaultState || "IN");
            }}
          >
            Clear
          </button>
        </article>
      </section>

      <section className="sales-top-grid">
        <${SalesMapPanel}
          stateCounts=${stateCounts}
          projects=${mappedProjects}
          selectedState=${selectedState}
          setSelectedState=${setSelectedState}
          nearestProjects=${nearestProjects}
        />
        <div className="sales-side-stack">
          <${SalesNearestPanel}
            selectedState=${selectedState}
            nearestProject=${nearestProject}
            nearestProjects=${nearestProjects}
          />
          <${SalesCoveragePanel} items=${stateCoverage} />
        </div>
      </section>

      <section className="sales-bottom-grid">
        <${DonutPanel}
          title="Product Category Mix"
          caption="Filtered projects grouped by product category"
          items=${productCategoryMix}
          centerLabel="Projects"
          centerValue=${formatCompact(summary.projectCount)}
        />
        <${DonutPanel}
          title="Project Type Mix"
          caption="Filtered projects grouped by project type"
          items=${projectTypeMix}
          centerLabel="Savings"
          centerValue=${formatCurrency(summary.annualCostSavingsUsd)}
        />
        <${SalesProjectsTable} items=${nearestProjects.slice(0, 12)} selectedState=${selectedState} />
      </section>
    </section>
  `;
}

function App() {
  const [activePage, setActivePage] = useState(() =>
    window.location.hash === "#sales-mapper" ? "sales-mapper" : "lead-dashboard",
  );
  const [dashboardData, setDashboardData] = useState(null);
  const [leadFilters, setLeadFilters] = useState(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [salesData, setSalesData] = useState(null);
  const [salesFilters, setSalesFilters] = useState(DEFAULT_SALES_FILTERS);
  const [salesSelectedState, setSalesSelectedState] = useState("IN");
  const [salesIsLoading, setSalesIsLoading] = useState(true);
  const [salesLoadError, setSalesLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function syncWorkbook() {
      try {
        const nextData = await fetchWorkbookData();
        if (cancelled) return;
        setDashboardData(nextData);
        setLeadFilters((current) => sanitizeFilters(current, nextData.filterOptions));
        setLastSyncedAt(new Date().toISOString());
        setSyncError("");
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : "Unknown sync error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    syncWorkbook();
    const intervalId = window.setInterval(syncWorkbook, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSalesMapperData() {
      try {
        const response = await fetch(SALES_MAPPER_DATA_URL, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Projects request failed with status ${response.status}`);
        }
        const nextData = await response.json();
        if (cancelled) return;
        setSalesData(nextData);
        setSalesSelectedState(nextData.defaultState || "IN");
        setSalesLoadError("");
      } catch (error) {
        if (cancelled) return;
        setSalesLoadError(error instanceof Error ? error.message : "Unknown Projects error");
      } finally {
        if (!cancelled) setSalesIsLoading(false);
      }
    }

    loadSalesMapperData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const nextHash = activePage === "sales-mapper" ? "#sales-mapper" : "#lead-dashboard";
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [activePage]);

  useEffect(() => {
    function handleHashChange() {
      setActivePage(window.location.hash === "#sales-mapper" ? "sales-mapper" : "lead-dashboard");
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return html`
    <main className="page">
      <section className="suite-bar">
        <div>
          <div className="eyebrow">IKIO Dashboard Suite</div>
          <p className="suite-copy">Switch between the live lead dashboard and the new Projects view.</p>
        </div>
        <${PageSwitcher} activePage=${activePage} onChange=${setActivePage} />
      </section>

      ${activePage === "lead-dashboard"
        ? html`
            <${LeadDashboardPage}
              dashboardData=${dashboardData}
              filters=${leadFilters}
              setFilters=${setLeadFilters}
              isLoading=${isLoading}
              syncError=${syncError}
              lastSyncedAt=${lastSyncedAt}
            />
          `
        : html`
            <${SalesMapperPage}
              salesData=${salesData}
              filters=${salesFilters}
              setFilters=${setSalesFilters}
              selectedState=${salesSelectedState}
              setSelectedState=${setSalesSelectedState}
              isLoading=${salesIsLoading}
              loadError=${salesLoadError}
            />
          `}
    </main>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);

