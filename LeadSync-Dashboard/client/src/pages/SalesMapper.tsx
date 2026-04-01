import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Lightbulb, MapPinned, Route, Shapes } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { type SalesMapperData, type SalesMapperDemographics } from "@shared/routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSalesMapperData, useSalesMapperDemographics } from "@/hooks/use-leads";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS = {
  projectType: "All",
  productCategory: "All",
};
const DEFAULT_REFERENCE_STATE = "All";

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
] as const;

const STATE_CODE_TO_NAME = Object.fromEntries(US_STATES.map(([code, name]) => [code, name]));
const US_STATES_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const US_COUNTIES_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

const STATE_CENTROIDS: Record<string, [number, number]> = {
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

const STATE_TO_FIPS: Record<string, string> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
};
const FIPS_TO_STATE_CODE = Object.fromEntries(Object.entries(STATE_TO_FIPS).map(([code, fips]) => [fips, code]));
type Filters = typeof DEFAULT_FILTERS;
type SalesProject = SalesMapperData["projects"][number];
type MappedProject = SalesProject & { latitude: number; longitude: number };
type ProjectWithDistance = MappedProject & { distanceMiles: number; isInSelectedState: boolean };
type DemographicMetric = "population" | "medianHouseholdIncome";

const CASE_STUDY_BASE_URL = "https://www.ikioledlighting.com/case-studies/";
const CASE_STUDY_LIST_URL = "https://www.ikioledlighting.com/case-studies/";
const EXACT_CASE_STUDY_LINKS: Record<string, string> = {
  "Abilene ISD": "https://www.ikioledlighting.com/case-studies/abilene_independent_school#",
};
const DEMOGRAPHIC_METRIC_OPTIONS: Array<{ value: DemographicMetric; label: string }> = [
  { value: "population", label: "Population" },
  { value: "medianHouseholdIncome", label: "Median Income" },
];

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(safeNumber(value));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function formatCompactInteger(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safeNumber(value));
}

function formatMiles(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "(Blank)";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value))} mi`;
}

function resolveReferenceState(data: SalesMapperData | undefined, selectedState: string) {
  if (selectedState !== DEFAULT_REFERENCE_STATE) {
    return selectedState;
  }

  const defaultState = data?.defaultState;
  if (defaultState && STATE_CODE_TO_NAME[defaultState]) {
    return defaultState;
  }

  const firstCoveredState = data?.filterOptions.statesWithProjects.find((code) => STATE_CODE_TO_NAME[code]);
  return firstCoveredState || DEFAULT_REFERENCE_STATE;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
}

function getDemographicValue(
  item:
    | SalesMapperDemographics["states"][number]
    | SalesMapperDemographics["counties"][number]
    | SalesMapperDemographics["districts"][number]
    | null
    | undefined,
  metric: DemographicMetric,
) {
  if (!item) return null;
  return metric === "population" ? item.population : item.medianHouseholdIncome;
}

function formatDemographicValue(metric: DemographicMetric, value: number | null | undefined) {
  if (value == null) return "-";
  return metric === "population" ? formatCompactInteger(value) : formatCurrency(value);
}

function getMetricLabel(metric: DemographicMetric) {
  return metric === "population" ? "Population" : "Median Income";
}

function mixColor(start: [number, number, number], end: [number, number, number], amount: number) {
  const clamp = Math.max(0, Math.min(1, amount));
  const channel = (index: number) => Math.round(start[index] + (end[index] - start[index]) * clamp);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function getPrimaryImage(images: string[] | null | undefined) {
  if (!images || !images.length) return null;
  return images[0];
}

function slugifyCaseStudyName(value: string) {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function getCaseStudyUrl(project: SalesProject) {
  const exact = EXACT_CASE_STUDY_LINKS[project.name];
  if (exact) return { url: exact, exact: true };

  const slug = slugifyCaseStudyName(project.name);
  if (!slug) return { url: CASE_STUDY_LIST_URL, exact: false };

  return { url: `${CASE_STUDY_BASE_URL}${slug}#`, exact: false };
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function SelectCard({
  label,
  value,
  options,
  includeAll = true,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  includeAll?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[18px] border border-[#1a3954] bg-[#0e2740] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
      <div className="mb-2 text-sm font-semibold text-slate-100">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 border-[#294863] bg-[#0a1a29] text-sm text-slate-100 data-[placeholder]:text-slate-400">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent className="border-[#294863] bg-[#0b1b2b] text-slate-100">
          {includeAll ? (
            <SelectItem value="All" className="focus:bg-[#173047] focus:text-white">
              All
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="focus:bg-[#173047] focus:text-white">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Shapes;
}) {
  return (
    <Card className="rounded-[18px] border-[#173047] bg-[#071d30] text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)]">
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
          <div className="mt-3 font-display text-3xl font-bold text-white">{value}</div>
          <div className="mt-2 text-sm text-slate-400">{hint}</div>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}

function SurfaceCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "h-full rounded-[18px] border-[#173047] bg-[#020b14] text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <CardContent className="p-4 lg:p-5">
        <div className="mb-4 text-center">
          <h3 className="font-display text-[1.15rem] font-semibold">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function formatFutureField(value: string | null | undefined, fallback = "Available after workbook updates") {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function DetailSection({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  placeholder?: string;
}) {
  const hasValue = Boolean(value?.trim());
  return (
    <div className="rounded-xl border border-[#173047] bg-[#071723] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <p className={cn("mt-2 text-sm leading-relaxed", hasValue ? "text-slate-200" : "text-slate-500")}>
        {formatFutureField(value, placeholder)}
      </p>
    </div>
  );
}

function buildStateProductSummary(projects: ProjectWithDistance[]) {
  const values = Array.from(
    new Set(
      projects
        .flatMap((project) => [project.productsUsed, project.productCategory])
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  );
  return values.length ? values.join(", ") : null;
}

function StateDetailPanel({
  selectedState,
  projectCount,
  totalSavings,
  nearestProject,
  stateDemographics,
}: {
  selectedState: string;
  projectCount: number;
  totalSavings: number;
  nearestProject: ProjectWithDistance | null;
  stateDemographics: SalesMapperDemographics["states"][number] | null;
}) {
  const hasSelection = selectedState !== DEFAULT_REFERENCE_STATE;
  const stateLabel = hasSelection ? STATE_CODE_TO_NAME[selectedState] || selectedState : "All States";
  const stateProductSummary = buildStateProductSummary(nearestProject ? [nearestProject] : []);
  const stateProjectSummary = nearestProject?.projectSummary || nearestProject?.description || null;
  const stateTimeline = nearestProject?.projectTimeline || null;
  const stateSubcontractor = nearestProject?.subcontractorInfo || null;
  const stateAssociatedPerson = nearestProject?.associatedPerson || null;

  return (
    <div>
      {hasSelection ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#264764] bg-[#081a29] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{selectedState}</div>
            <div className="mt-1 font-display text-2xl font-semibold text-white">{stateLabel}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="rounded-xl border border-[#173047] bg-[#0b2235] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Population</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatCompactInteger(stateDemographics?.population)}</div>
              </div>
              <div className="rounded-xl border border-[#173047] bg-[#0b2235] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Median Income</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(stateDemographics?.medianHouseholdIncome)}</div>
              </div>
              <div className="rounded-xl border border-[#173047] bg-[#0b2235] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mapped Projects</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatNumber(projectCount)}</div>
              </div>
              <div className="rounded-xl border border-[#173047] bg-[#0b2235] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">State Savings</div>
                <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalSavings)}</div>
              </div>
              <div className="rounded-xl border border-[#173047] bg-[#0b2235] p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Nearest Project</div>
                <div className="mt-2 text-lg font-semibold text-white">{nearestProject ? formatMiles(nearestProject.distanceMiles) : "-"}</div>
              </div>
            </div>
          </div>

          {nearestProject ? (
            <div className="rounded-2xl border border-[#173047] bg-[#071723] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Closest Match</div>
              <div className="mt-2 w-full rounded-xl border border-[#29506d] bg-[#0b2235] p-3 text-left">
                <div className="font-semibold text-white">{nearestProject.name}</div>
                <div className="mt-1 text-sm text-slate-300">
                  {nearestProject.city || "-"}, {nearestProject.stateCode || nearestProject.state || "-"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-[#2d556f] px-2 py-1">{formatMiles(nearestProject.distanceMiles)}</span>
                  <span className="rounded-full border border-[#2d556f] px-2 py-1">{nearestProject.productCategory || "Unspecified"}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <DetailSection
              label="Project Summary"
              value={stateProjectSummary}
              placeholder="State-level summary will appear here when workbook project summary data is added."
            />
            <DetailSection
              label="Project Timeline"
              value={stateTimeline}
              placeholder="Timeline details will appear here when the workbook includes schedule or project timeline columns."
            />
            <DetailSection
              label="Products"
              value={stateProductSummary}
              placeholder="Products used for the selected state will appear here as workbook product detail improves."
            />
            <DetailSection
              label="Subcontractor Info"
              value={stateSubcontractor}
              placeholder="Subcontractor information will appear here when the workbook includes contractor fields."
            />
            <DetailSection
              label="Associated Person"
              value={stateAssociatedPerson}
              placeholder="Associated sales/contact person will appear here when workbook contact fields are available."
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#264764] bg-[#061523] p-6 text-center text-sm text-slate-400">
          Select a state to keep the full USA map fixed while highlighting that state and showing its project details here.
        </div>
      )}
    </div>
  );
}

function ProjectDetailPanel({
  selectedProject,
  selectedState,
}: {
  selectedProject: MappedProject;
  selectedState: string;
}) {
  return (
    <div className="space-y-4">
      {getPrimaryImage(selectedProject.images) ? (
        <img
          src={getPrimaryImage(selectedProject.images) || ""}
          alt={`${selectedProject.name} image`}
          className="h-40 w-full rounded-xl border border-[#173047] object-cover sm:h-56"
          loading="lazy"
        />
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs text-slate-200">
        <span className="rounded-full border border-[#27445c] bg-[#071d30] px-3 py-2">
          {selectedProject.productCategory || "Unspecified category"}
        </span>
        <span className="rounded-full border border-[#27445c] bg-[#071d30] px-3 py-2">
          {selectedProject.projectType || "Unspecified type"}
        </span>
        <span className="rounded-full border border-[#27445c] bg-[#071d30] px-3 py-2">
          {STATE_CENTROIDS[selectedState]
            ? formatMiles(
                haversineMiles(
                  STATE_CENTROIDS[selectedState][0],
                  STATE_CENTROIDS[selectedState][1],
                  selectedProject.latitude,
                  selectedProject.longitude,
                ),
              )
            : "Select a reference state"}
        </span>
      </div>

      {selectedProject.description ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Description</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{selectedProject.description}</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailSection
          label="Project Summary"
          value={selectedProject.projectSummary || selectedProject.description}
          placeholder="Project summary will appear here when the workbook includes a summary column."
        />
        <DetailSection
          label="Project Timeline"
          value={selectedProject.projectTimeline}
          placeholder="Project timeline will appear here when schedule data is added to the workbook."
        />
        <DetailSection
          label="Products"
          value={selectedProject.productsUsed || selectedProject.productCategory}
          placeholder="Detailed products used will appear here when the workbook includes them."
        />
        <DetailSection
          label="Subcontractor Info"
          value={selectedProject.subcontractorInfo}
          placeholder="Subcontractor details will appear here when workbook contractor data is available."
        />
        <DetailSection
          label="Associated Person"
          value={selectedProject.associatedPerson}
          placeholder="Associated person or sales contact will appear here when contact data is available."
        />
      </div>

      {selectedProject.challenge ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Challenge</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{selectedProject.challenge}</p>
        </div>
      ) : null}

      {selectedProject.resolution ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Resolution</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{selectedProject.resolution}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <a
          href={getCaseStudyUrl(selectedProject).url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-[14px] border border-[#33597b] bg-[#0d2841] px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-[#123453]"
        >
          {getCaseStudyUrl(selectedProject).exact ? "Open Case Study" : "Browse Case Study"}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function SalesMapPanel({
  projects,
  selectedState,
  onStateSelect,
  onProjectSelect,
  demographics,
  metric,
}: {
  projects: MappedProject[];
  selectedState: string;
  onStateSelect: (stateCode: string) => void;
  onProjectSelect: (project: MappedProject) => void;
  demographics: SalesMapperDemographics | undefined;
  metric: DemographicMetric;
}) {
  const selectedStateFipsPrefix =
    selectedState !== DEFAULT_REFERENCE_STATE ? STATE_TO_FIPS[selectedState] || null : null;
  const stateMetricLookup = useMemo(
    () => new Map((demographics?.states || []).map((item) => [item.stateCode, getDemographicValue(item, metric)])),
    [demographics, metric],
  );
  const countyMetricLookup = useMemo(
    () => new Map((demographics?.counties || []).map((item) => [item.geoid, getDemographicValue(item, metric)])),
    [demographics, metric],
  );
  const stateMetricValues = useMemo(
    () => Array.from(stateMetricLookup.values()).filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    [stateMetricLookup],
  );
  const countyMetricValues = useMemo(
    () => Array.from(countyMetricLookup.values()).filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    [countyMetricLookup],
  );
  const stateProjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => {
      if (!project.stateCode) return;
      counts.set(project.stateCode, (counts.get(project.stateCode) || 0) + 1);
    });
    return counts;
  }, [projects]);
  const stateMin = stateMetricValues.length ? Math.min(...stateMetricValues) : 0;
  const stateMax = stateMetricValues.length ? Math.max(...stateMetricValues) : 1;
  const countyMin = countyMetricValues.length ? Math.min(...countyMetricValues) : 0;
  const countyMax = countyMetricValues.length ? Math.max(...countyMetricValues) : 1;
  const maxStateProjectCount = useMemo(() => Math.max(...Array.from(stateProjectCounts.values()), 1), [stateProjectCounts]);

  const normalizeMetric = (value: number | null | undefined, min: number, max: number) => {
    if (value == null || !Number.isFinite(value)) return 0;
    if (metric === "population") {
      const logMin = Math.log10(Math.max(min, 1));
      const logMax = Math.log10(Math.max(max, 1));
      const logValue = Math.log10(Math.max(value, 1));
      if (logMax === logMin) return 0.5;
      return (logValue - logMin) / (logMax - logMin);
    }
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  };

  const getStateFill = (stateCode: string | undefined, isSelected: boolean) => {
    const count = stateCode ? stateProjectCounts.get(stateCode) || 0 : 0;
    if (!count) return "rgba(255, 255, 255, 0)";
    const intensity = count / maxStateProjectCount;
    const tint = mixColor([202, 244, 210], [30, 163, 74], intensity);
    if (isSelected) return tint.replace("rgb", "rgba").replace(")", ", 0.32)");
    return tint.replace("rgb", "rgba").replace(")", ", 0.22)");
  };

  const getCountyFill = (countyGeoid: string, isSelected: boolean) => {
    if (!isSelected) return "rgba(9, 23, 36, 0.16)";
    const value = countyMetricLookup.get(countyGeoid);
    const normalized = normalizeMetric(value, countyMin, countyMax);
    if (value == null) return isSelected ? "rgba(221, 239, 226, 0.92)" : "rgba(242, 247, 243, 0.92)";
    const base = mixColor([242, 247, 243], [120, 203, 143], normalized);
    return isSelected ? base.replace("rgb", "rgba").replace(")", ", 0.98)") : base.replace("rgb", "rgba").replace(")", ", 0.94)");
  };

  return (
    <Card className="min-h-[500px] overflow-hidden rounded-[18px] border-[#173047] bg-[#020b14] text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] sm:min-h-[620px] lg:min-h-[820px] xl:min-h-[940px]">
      <CardContent className="relative h-[430px] p-0 sm:h-[560px] lg:h-[740px] xl:h-[880px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] bg-gradient-to-b from-[#020b14] via-[#020b14]/84 to-transparent px-4 pb-6 pt-4 text-center sm:px-5 lg:pt-5">
          <h3 className="font-display text-[1.15rem] font-semibold text-white">Projects</h3>
          <p className="text-sm text-slate-400">
            {`Real census ${getMetricLabel(metric).toLowerCase()} by county with district lines and project pins.`}
          </p>
        </div>
        <div className="h-full w-full pt-8 sm:pt-10 lg:pt-12">
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 1685 }}
            width={1320}
            height={860}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={US_COUNTIES_TOPOJSON_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const countyId = String(geo.id).padStart(5, "0");
                  const isInSelectedState = selectedStateFipsPrefix ? countyId.startsWith(selectedStateFipsPrefix) : false;

                  return (
                    <Geography
                      key={`county-${geo.rsmKey}`}
                      geography={geo}
                      className="sales-map-county"
                      style={{
                        default: {
                          fill: getCountyFill(countyId, isInSelectedState),
                          stroke: isInSelectedState ? "rgba(255, 246, 190, 0.92)" : "rgba(116, 147, 125, 0.62)",
                          strokeWidth: isInSelectedState ? 0.7 : 0.46,
                          outline: "none",
                        },
                        hover: {
                          fill: getCountyFill(countyId, isInSelectedState),
                          stroke: isInSelectedState ? "rgba(255, 246, 190, 0.96)" : "rgba(138, 174, 148, 0.78)",
                          strokeWidth: isInSelectedState ? 0.76 : 0.5,
                          outline: "none",
                        },
                        pressed: {
                          fill: getCountyFill(countyId, isInSelectedState),
                          stroke: isInSelectedState ? "rgba(255, 246, 190, 0.96)" : "rgba(138, 174, 148, 0.78)",
                          strokeWidth: isInSelectedState ? 0.76 : 0.5,
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            <Geographies geography={US_STATES_TOPOJSON_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const stateCode = FIPS_TO_STATE_CODE[String(geo.id).padStart(2, "0")];
                  const isSelected = stateCode === selectedState;
                  const fill = getStateFill(stateCode, isSelected);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => (stateCode ? onStateSelect(stateCode) : null)}
                      className="sales-map-state"
                      style={{
                        default: {
                          fill,
                          stroke: isSelected ? "#f7e58d" : "rgba(95, 142, 108, 0.86)",
                          strokeWidth: isSelected ? 2.2 : 1.1,
                          outline: "none",
                        },
                        hover: {
                          fill,
                          stroke: "#f7e58d",
                          strokeWidth: isSelected ? 2.4 : 1.24,
                          outline: "none",
                          cursor: stateCode ? "pointer" : "default",
                        },
                        pressed: {
                          fill,
                          stroke: "#f7e58d",
                          strokeWidth: 2.4,
                          outline: "none",
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {demographics?.districtGeoJson ? (
              <Geographies geography={demographics.districtGeoJson}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo: any) => {
                    const districtStateCode = FIPS_TO_STATE_CODE[String(geo.properties?.STATE || "").padStart(2, "0")];
                    const isSelectedDistrictState = districtStateCode === selectedState;

                    return (
                      <Geography
                        key={`district-${geo.rsmKey}`}
                        geography={geo}
                        className="sales-map-district"
                        style={{
                        default: {
                          fill: "transparent",
                          stroke: isSelectedDistrictState ? "rgba(247, 229, 141, 0.95)" : "rgba(58, 118, 76, 0.48)",
                          strokeWidth: isSelectedDistrictState ? 0.92 : 0.56,
                          outline: "none",
                        },
                        hover: {
                          fill: "transparent",
                          stroke: isSelectedDistrictState ? "rgba(247, 229, 141, 0.98)" : "rgba(74, 144, 93, 0.58)",
                          strokeWidth: isSelectedDistrictState ? 0.98 : 0.62,
                          outline: "none",
                        },
                        pressed: {
                          fill: "transparent",
                          stroke: isSelectedDistrictState ? "rgba(247, 229, 141, 0.98)" : "rgba(74, 144, 93, 0.58)",
                          strokeWidth: isSelectedDistrictState ? 0.98 : 0.62,
                          outline: "none",
                        },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            ) : null}

            {US_STATES.map(([code]) => {
              const centroid = STATE_CENTROIDS[code];
              if (!centroid) return null;
              const isSelected = code === selectedState;
              return (
                <Marker key={`label-${code}`} coordinates={[centroid[1], centroid[0]]}>
                  {isSelected ? <circle r={14} fill="rgba(247,229,141,0.26)" stroke="#f7e58d" strokeWidth={2} /> : null}
                  <text
                    textAnchor="middle"
                    y={4}
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: isSelected ? "14px" : "10px",
                      fontWeight: 800,
                      fill: "#ffffff",
                      pointerEvents: "none",
                      paintOrder: "stroke",
                      stroke: isSelected ? "rgba(24, 35, 28, 0.72)" : "rgba(12, 18, 24, 0.78)",
                      strokeWidth: isSelected ? "1.2px" : "1px",
                    }}
                  >
                    {code}
                  </text>
                </Marker>
              );
            })}

            {projects.map((project) => (
              <Marker key={project.id} coordinates={[project.longitude, project.latitude]}>
                <g className="sales-map-pin" onClick={() => onProjectSelect(project)} style={{ cursor: "pointer" }}>
                  <circle className="sales-map-pin-pulse" r={16} />
                  <image
                    href="/leaf-project-marker.svg"
                    x={-13}
                    y={-39}
                    width={26}
                    height={39}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  <circle r={10} fill="transparent" />
                </g>
              </Marker>
            ))}
          </ComposableMap>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 bg-gradient-to-t from-[#020b14] to-transparent" />
      </CardContent>
    </Card>
  );
}

export default function SalesMapper() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedState, setSelectedState] = useState(DEFAULT_REFERENCE_STATE);
  const [selectedProject, setSelectedProject] = useState<MappedProject | null>(null);
  const [demographicMetric, setDemographicMetric] = useState<DemographicMetric>("population");
  const { data, isLoading, isFetching, error } = useSalesMapperData();
  const { data: demographics, error: demographicsError } = useSalesMapperDemographics();
  const errorMessage = error instanceof Error ? error.message : "There was an error loading the Projects.";
  const demographicsErrorMessage =
    demographicsError instanceof Error ? demographicsError.message : "There was an error loading the Census demographics.";
  const referenceState = resolveReferenceState(data, selectedState);

  useEffect(() => {
    if (!data) return;
    setSelectedState((current) => {
      if (current === DEFAULT_REFERENCE_STATE) {
        return resolveReferenceState(data, current);
      }
      return STATE_CODE_TO_NAME[current] ? current : resolveReferenceState(data, DEFAULT_REFERENCE_STATE);
    });
  }, [data]);

  const filteredProjects = useMemo(() => {
    if (!data?.projects) return [];
    return data.projects.filter((project) => {
      if (filters.projectType !== "All" && project.projectType !== filters.projectType) return false;
      if (filters.productCategory !== "All" && project.productCategory !== filters.productCategory) return false;
      return true;
    });
  }, [data, filters]);

  const mappedProjects = useMemo(
    () =>
      filteredProjects.filter(
        (project): project is MappedProject =>
          typeof project.latitude === "number" &&
          Number.isFinite(project.latitude) &&
          typeof project.longitude === "number" &&
          Number.isFinite(project.longitude),
      ),
    [filteredProjects],
  );

  const nearestProjects = useMemo(() => {
    const centroid = STATE_CENTROIDS[referenceState];
    if (!centroid) return [];

    return mappedProjects
      .map((project) => ({
        ...project,
        distanceMiles: haversineMiles(centroid[0], centroid[1], project.latitude, project.longitude),
        isInSelectedState: project.stateCode === referenceState,
      }))
      .sort(
        (a, b) =>
          Number(b.isInSelectedState) - Number(a.isInSelectedState) ||
          a.distanceMiles - b.distanceMiles ||
          a.name.localeCompare(b.name),
      );
  }, [mappedProjects, referenceState]);

  const nearestProject = nearestProjects[0] || null;
  const selectedStateProjects = useMemo(
    () => (referenceState === DEFAULT_REFERENCE_STATE ? [] : mappedProjects.filter((project) => project.stateCode === referenceState)),
    [mappedProjects, referenceState],
  );
  const selectedStateSavings = useMemo(
    () => selectedStateProjects.reduce((sum, project) => sum + safeNumber(project.annualCostSavingsUsd), 0),
    [selectedStateProjects],
  );

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mappedProjects.forEach((project) => {
      if (!project.stateCode) return;
      counts[project.stateCode] = (counts[project.stateCode] || 0) + 1;
    });
    return counts;
  }, [mappedProjects]);

  const coverage = useMemo(
    () =>
      Object.entries(stateCounts)
        .map(([code, value]) => ({ code, label: STATE_CODE_TO_NAME[code] || code, value }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
        .slice(0, 8),
    [stateCounts],
  );
  const coverageMax = Math.max(...coverage.map((item) => item.value), 1);
  const selectedStateDemographics = useMemo(
    () => demographics?.states.find((item) => item.stateCode === referenceState) || null,
    [demographics, referenceState],
  );
  const detailsOpen = Boolean(selectedProject) || selectedState !== DEFAULT_REFERENCE_STATE;
  const closeDetails = () => {
    setSelectedProject(null);
    setSelectedState(DEFAULT_REFERENCE_STATE);
  };

  const summary = useMemo(
    () => ({
      projectCount: filteredProjects.length,
      mappedProjectCount: mappedProjects.length,
      coveredStateCount: Object.keys(stateCounts).length,
      annualEnergySavingsKwh: filteredProjects.reduce((sum, project) => sum + safeNumber(project.annualEnergySavingsKwh), 0),
      annualCostSavingsUsd: filteredProjects.reduce((sum, project) => sum + safeNumber(project.annualCostSavingsUsd), 0),
    }),
    [filteredProjects, mappedProjects.length, stateCounts],
  );

  if (isLoading && !data) {
    return (
      <AppLayout sectionLabel="Projects" showDashboardNav>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout sectionLabel="Projects" showDashboardNav>
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
          <h2 className="text-xl font-bold">Failed to load Projects</h2>
          <p className="mt-2">{errorMessage}</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout sectionLabel="Projects" showDashboardNav>
      <div className="w-full min-w-0 space-y-4 pb-6 sm:space-y-5 sm:pb-8">
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">IKIO Projects</div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground sm:text-3xl md:text-[2.2rem]">
              Projects Overview
            </h1>
            <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
              Coverage, pins, and nearest project.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-300 sm:text-xs 2xl:justify-end">
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">Updated {formatTimestamp(data.generatedAt)}</span>
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">
              {formatNumber(summary.mappedProjectCount)} mapped projects
            </span>
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">
              {nearestProject ? `Nearest ${formatMiles(nearestProject.distanceMiles)}` : "No mapped result"}
            </span>
            {isFetching ? <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">Refreshing...</span> : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            Last refresh failed: {errorMessage}. Showing the most recent successful mapper payload.
          </div>
        ) : null}

        {demographicsError ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            Census demographics failed to load: {demographicsErrorMessage}.
          </div>
        ) : null}

        <section className="w-full rounded-[22px] border border-[#17334c] bg-[#052642] p-2.5 shadow-[0_26px_60px_rgba(2,14,24,0.26)] sm:rounded-[30px] sm:p-3 md:p-4 2xl:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SelectCard
              label="Project Type"
              value={filters.projectType}
              options={data.filterOptions.projectTypes.map((value) => ({ value, label: value }))}
              onChange={(value) => setFilters((current) => ({ ...current, projectType: value }))}
            />
            <SelectCard
              label="Product Category"
              value={filters.productCategory}
              options={data.filterOptions.productCategories.map((value) => ({ value, label: value }))}
              onChange={(value) => setFilters((current) => ({ ...current, productCategory: value }))}
            />
            <SelectCard
              label="Reference State"
              value={selectedState}
              options={US_STATES.map(([value, label]) => ({ value, label: `${value} - ${label}` }))}
              onChange={(value) => {
                setSelectedProject(null);
                setSelectedState(value);
              }}
            />
            <SelectCard
              label="Metric"
              value={demographicMetric}
              options={DEMOGRAPHIC_METRIC_OPTIONS}
              includeAll={false}
              onChange={(value) => setDemographicMetric(value as DemographicMetric)}
            />
            <div className="flex items-center rounded-[18px] border border-[#1a3954] bg-[#071d30] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <Button
                variant="secondary"
                className="h-12 w-full rounded-[14px] border border-[#33597b] bg-[#0d2841] text-slate-100 hover:bg-[#123453]"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSelectedProject(null);
                  setSelectedState(resolveReferenceState(data, DEFAULT_REFERENCE_STATE));
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Projects" value={formatNumber(summary.projectCount)} hint="Filtered projects" icon={Shapes} />
            <MetricTile label="Mapped" value={formatNumber(summary.mappedProjectCount)} hint="Projects with coordinates" icon={MapPinned} />
            <MetricTile label="Coverage" value={formatNumber(summary.coveredStateCount)} hint="States represented" icon={Route} />
            <MetricTile
              label="Annual Savings"
              value={formatCurrency(summary.annualCostSavingsUsd)}
              hint={`${formatNumber(summary.annualEnergySavingsKwh)} kWh reduced`}
              icon={Lightbulb}
            />
          </div>

          <div className="mt-4">
            <SalesMapPanel
              projects={mappedProjects}
              selectedState={referenceState}
              onStateSelect={(stateCode) => {
                setSelectedProject(null);
                setSelectedState(stateCode);
              }}
              onProjectSelect={setSelectedProject}
              demographics={demographics}
              metric={demographicMetric}
            />
          </div>

          <div className="mt-4">
            <SurfaceCard title="State Coverage" subtitle="Top states ranked by mapped project count">
              {coverage.length ? (
                <div className="space-y-3">
                  {coverage.map((item) => (
                    <div key={item.code} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">{item.code}</div>
                        <div className="text-xs text-slate-400">{item.label}</div>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2de1c2] to-[#2792f0]"
                          style={{ width: `${(item.value / coverageMax) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm font-semibold text-white">{formatNumber(item.value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                  No mapped states match the current filters.
                </div>
              )}
            </SurfaceCard>
          </div>

          <div className="mt-4">
            <SurfaceCard
              title="Nearest Project Table"
              subtitle={
                selectedState === DEFAULT_REFERENCE_STATE
                  ? `Projects ranked across all states using ${STATE_CODE_TO_NAME[referenceState] || referenceState} as the distance reference.`
                  : `Projects ranked from ${STATE_CODE_TO_NAME[selectedState] || selectedState}, with same-state matches shown first`
              }
            >
              <div className="max-h-[520px] overflow-auto rounded-2xl border border-[#173047]">
                <Table className="min-w-[920px] bg-[#071723] text-slate-100 lg:min-w-[1400px]">
                  <TableHeader className="sticky top-0 z-10 bg-[#173047] [&_th]:text-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project</TableHead>
                      <TableHead className="hidden sm:table-cell">Image</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="hidden md:table-cell">ZIP</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden xl:table-cell">Description</TableHead>
                      <TableHead className="hidden xl:table-cell">Challenge</TableHead>
                      <TableHead className="hidden xl:table-cell">Resolution</TableHead>
                      <TableHead className="hidden lg:table-cell">Savings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nearestProjects.length ? (
                      nearestProjects.map((item) => {
                        const image = getPrimaryImage(item.images);
                        return (
                          <TableRow key={item.id} className="border-[#173047] hover:bg-[#0d2335]">
                            <TableCell className="font-medium text-slate-100">{item.name}</TableCell>
                            <TableCell className="hidden text-slate-200 sm:table-cell">
                              {image ? (
                                <img
                                  src={image}
                                  alt={`${item.name} image`}
                                  className="h-12 w-16 rounded-lg border border-[#173047] object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-200">{item.city || "-"}</TableCell>
                            <TableCell className="text-slate-200">{item.stateCode || item.state || "-"}</TableCell>
                            <TableCell className="hidden text-slate-200 md:table-cell">{item.zip || "-"}</TableCell>
                            <TableCell className="font-semibold text-white">{formatMiles(item.distanceMiles)}</TableCell>
                            <TableCell className="text-slate-200">{item.productCategory || "-"}</TableCell>
                            <TableCell className="hidden max-w-[260px] text-xs leading-relaxed text-slate-200 xl:table-cell">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell className="hidden max-w-[260px] text-xs leading-relaxed text-slate-200 xl:table-cell">
                              {item.challenge || "-"}
                            </TableCell>
                            <TableCell className="hidden max-w-[260px] text-xs leading-relaxed text-slate-200 xl:table-cell">
                              {item.resolution || "-"}
                            </TableCell>
                            <TableCell className="hidden text-slate-200 lg:table-cell">{formatCurrency(item.annualCostSavingsUsd)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-slate-400">
                          No mapped projects match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>

      <Sheet open={detailsOpen} onOpenChange={(open) => (!open ? closeDetails() : null)}>
        <SheetContent
          side="right"
          overlayClassName="bg-transparent"
          className="w-[min(92vw,520px)] overflow-y-auto border-[#173047] bg-[#071723] p-0 text-slate-100 sm:max-w-[520px]"
          onPointerDownOutside={() => closeDetails()}
          onInteractOutside={() => closeDetails()}
          onEscapeKeyDown={() => closeDetails()}
        >
          <div className="p-5 sm:p-6">
            <SheetHeader className="mb-5 text-left">
              <SheetTitle className="font-display text-2xl text-white">
                {selectedProject ? selectedProject.name : "Selected State"}
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                {selectedProject
                  ? `${selectedProject.city || "-"}, ${selectedProject.stateCode || selectedProject.state || "-"} ${selectedProject.zip || ""}`
                  : selectedState === DEFAULT_REFERENCE_STATE
                    ? "Pick a state from the map."
                    : `${STATE_CODE_TO_NAME[referenceState] || referenceState} demographics and nearest projects.`}
              </SheetDescription>
            </SheetHeader>

            {selectedProject ? (
              <ProjectDetailPanel selectedProject={selectedProject} selectedState={selectedState} />
            ) : (
              <StateDetailPanel
                selectedState={referenceState}
                projectCount={selectedStateProjects.length}
                totalSavings={selectedStateSavings}
                nearestProject={nearestProject}
                stateDemographics={selectedStateDemographics}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

