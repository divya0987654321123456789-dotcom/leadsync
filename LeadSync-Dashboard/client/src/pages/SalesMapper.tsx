import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Lightbulb, MapPinned, Route, Shapes } from "lucide-react";
import { type SalesMapperData } from "@shared/routes";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSalesMapperData } from "@/hooks/use-leads";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS = {
  projectType: "All",
  productCategory: "All",
};

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

type Filters = typeof DEFAULT_FILTERS;
type SalesProject = SalesMapperData["projects"][number];
type MappedProject = SalesProject & { latitude: number; longitude: number };
type ProjectWithDistance = MappedProject & { distanceMiles: number };

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

function formatMiles(value: number | null | undefined) {
  if (!Number.isFinite(Number(value))) return "(Blank)";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value))} mi`;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-US");
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

function SalesMapPanel({
  stateCounts,
  projects,
  selectedState,
  nearestProject,
}: {
  stateCounts: Record<string, number>;
  projects: MappedProject[];
  selectedState: string;
  nearestProject: ProjectWithDistance | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const plotly = (window as Window & { Plotly?: any }).Plotly;
    if (!plotly || !ref.current) return;

    const locations = US_STATES.map(([code]) => code);
    const zValues = locations.map((code) => stateCounts[code] || 0);
    const maxValue = Math.max(...zValues, 1);
    const traces: any[] = [
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
        marker: { line: { color: "#7d8ea3", width: 0.8 } },
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
          line: { color: "#ffffff", width: 1.1 },
          opacity: 0.9,
        },
        customdata: projects.map((project) => [
          project.city || "-",
          project.state || project.stateCode || "-",
          project.productCategory || "Unspecified",
        ]),
        hovertemplate: "<b>%{text}</b><br>%{customdata[0]}, %{customdata[1]}<br>%{customdata[2]}<extra></extra>",
        showlegend: false,
      });
    }

    const labelPoints = Object.keys(stateCounts)
      .filter((code) => stateCounts[code] > 0 && STATE_CENTROIDS[code])
      .map((code) => ({ code, lat: STATE_CENTROIDS[code][0], lon: STATE_CENTROIDS[code][1] }));

    if (labelPoints.length) {
      traces.push({
        type: "scattergeo",
        lat: labelPoints.map((point) => point.lat),
        lon: labelPoints.map((point) => point.lon),
        text: labelPoints.map((point) => point.code),
        mode: "text",
        showlegend: false,
        hoverinfo: "skip",
        textfont: { size: 9, color: "#173047", family: "Plus Jakarta Sans, sans-serif" },
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
        marker: { line: { color: "#f7c65c", width: 2.4 } },
        hoverinfo: "skip",
      });

      if (nearestProject) {
        traces.push({
          type: "scattergeo",
          lat: [selectedLat, nearestProject.latitude],
          lon: [selectedLon, nearestProject.longitude],
          mode: "lines",
          line: { color: "#ffb347", width: 2.4 },
          hoverinfo: "skip",
          showlegend: false,
        });
      }
    }

    plotly.react(
      ref.current,
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
      { displayModeBar: false, responsive: true },
    );

    return () => {
      if (ref.current && plotly) {
        plotly.purge(ref.current);
      }
    };
  }, [nearestProject, projects, selectedState, stateCounts]);

  return (
    <SurfaceCard
      title="U.S. Sales Mapper"
      subtitle="Coverage by project state with mapped site pins and the selected-state route"
      className="min-h-[620px]"
    >
      <div ref={ref} className="h-[540px] w-full" />
    </SurfaceCard>
  );
}

export default function SalesMapper() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedState, setSelectedState] = useState("IN");
  const { data, isLoading, isFetching, error } = useSalesMapperData();
  const errorMessage = error instanceof Error ? error.message : "There was an error loading the sales mapper.";

  useEffect(() => {
    if (!data) return;
    setSelectedState((current) => (STATE_CODE_TO_NAME[current] ? current : data.defaultState || "IN"));
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
    const centroid = STATE_CENTROIDS[selectedState];
    if (!centroid) return [];

    return mappedProjects
      .map((project) => ({
        ...project,
        distanceMiles: haversineMiles(centroid[0], centroid[1], project.latitude, project.longitude),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name));
  }, [mappedProjects, selectedState]);

  const nearestProject = nearestProjects[0] || null;

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
      <AppLayout sectionLabel="Sales Mapper" showDashboardNav>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout sectionLabel="Sales Mapper" showDashboardNav>
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
          <h2 className="text-xl font-bold">Failed to load sales mapper</h2>
          <p className="mt-2">{errorMessage}</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout sectionLabel="Sales Mapper" showDashboardNav>
      <div className="w-full min-w-0 space-y-5 pb-8">
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">IKIO sales mapper</div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground md:text-[2.2rem]">
              Coverage and nearest-project command center
            </h1>
            <p className="max-w-4xl text-muted-foreground">
              Project coverage by state, mapped site pins, and the nearest reference project from the selected state centroid.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300 2xl:justify-end">
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

        <section className="w-full rounded-[30px] border border-[#17334c] bg-[#052642] p-3 shadow-[0_26px_60px_rgba(2,14,24,0.26)] md:p-4 2xl:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              includeAll={false}
              onChange={setSelectedState}
            />
            <div className="flex items-center rounded-[18px] border border-[#1a3954] bg-[#071d30] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <Button
                variant="secondary"
                className="h-12 w-full rounded-[14px] border border-[#33597b] bg-[#0d2841] text-slate-100 hover:bg-[#123453]"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSelectedState(data.defaultState || "IN");
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
            <SalesMapPanel
              stateCounts={stateCounts}
              projects={mappedProjects}
              selectedState={selectedState}
              nearestProject={nearestProject}
            />

            <div className="grid gap-4">
              <SurfaceCard
                title="Nearest Mapped Project"
                subtitle={`Closest mapped projects from ${STATE_CODE_TO_NAME[selectedState] || selectedState}`}
              >
                {nearestProject ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#1c3d53] bg-gradient-to-br from-[#10283c] to-[#0c1a29] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Closest project</div>
                      <div className="mt-2 font-display text-2xl font-bold text-white">{nearestProject.name}</div>
                      <div className="mt-2 text-sm text-slate-300">
                        {(nearestProject.city || "-")}, {nearestProject.stateCode || nearestProject.state || "-"}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
                        <span className="rounded-full border border-[#27445c] bg-[#071d30] px-3 py-2">
                          {formatMiles(nearestProject.distanceMiles)}
                        </span>
                        <span className="rounded-full border border-[#27445c] bg-[#071d30] px-3 py-2">
                          {nearestProject.productCategory || "Unspecified category"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {nearestProjects.slice(0, 5).map((project, index) => (
                        <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#173047] bg-[#06192a] px-3 py-3">
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">#{index + 1}</div>
                            <div className="truncate font-semibold text-slate-100">{project.name}</div>
                            <div className="truncate text-sm text-slate-400">
                              {(project.city || "-")}, {project.stateCode || project.state || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-white">{formatMiles(project.distanceMiles)}</div>
                            <div className="text-xs text-slate-400">{project.zip || "No ZIP"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
                    No mapped projects are available for the selected filters.
                  </div>
                )}
              </SurfaceCard>

              <SurfaceCard title="State Coverage" subtitle="Top states ranked by mapped project count">
                {coverage.length ? (
                  <div className="space-y-3">
                    {coverage.map((item) => (
                      <div key={item.code} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3">
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
          </div>

          <div className="mt-4">
            <SurfaceCard
              title="Mapped Project Detail"
              subtitle={`Closest mapped projects from ${STATE_CODE_TO_NAME[selectedState] || selectedState}`}
            >
              <div className="max-h-[460px] overflow-auto rounded-2xl border border-[#173047]">
                <Table className="min-w-[960px] bg-[#071723] text-slate-100">
                  <TableHeader className="sticky top-0 z-10 bg-[#173047] [&_th]:text-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Project</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>ZIP</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Savings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nearestProjects.length ? (
                      nearestProjects.slice(0, 12).map((item) => (
                        <TableRow key={item.id} className="border-[#173047] hover:bg-[#0d2335]">
                          <TableCell className="font-medium text-slate-100">{item.name}</TableCell>
                          <TableCell className="text-slate-200">{item.city || "-"}</TableCell>
                          <TableCell className="text-slate-200">{item.stateCode || item.state || "-"}</TableCell>
                          <TableCell className="text-slate-200">{item.zip || "-"}</TableCell>
                          <TableCell className="font-semibold text-white">{formatMiles(item.distanceMiles)}</TableCell>
                          <TableCell className="text-slate-200">{item.productCategory || "-"}</TableCell>
                          <TableCell className="text-slate-200">{formatCurrency(item.annualCostSavingsUsd)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-slate-400">
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
    </AppLayout>
  );
}
