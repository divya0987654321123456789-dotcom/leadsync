import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardWorkbookFiltered } from "@/hooks/use-leads";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  BarChart,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const DEFAULT_FILTERS = {
  sheet: "All",
  campaignType: "All",
  segment: "All",
  year: "All",
  quarter: "All",
  month: "All",
  state: "All",
  responseType: "All",
};

const DONUT_COLORS = ["#7ac4ff", "#0d6fbc", "#8f2cc9", "#256e94", "#e250a6", "#4d8bb8"];

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCompact(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function sanitizeFilters(
  filters: typeof DEFAULT_FILTERS,
  filterOptions: {
    campaignTypes: Array<{ value: string }>;
    segments: Array<{ value: string }>;
    years: Array<{ value: string }>;
    quarters: Array<{ value: string }>;
    months: Array<{ value: string }>;
    states: Array<{ value: string }>;
    responseTypes: Array<{ value: string }>;
  },
  sheetOptions: Array<{ value: string }>,
  appliedSheet: string,
) {
  const next = { ...filters };
  const resolvedSheet =
    next.sheet !== "All" && sheetOptions.some((option) => option.value === next.sheet)
      ? next.sheet
      : sheetOptions.some((option) => option.value === appliedSheet)
        ? appliedSheet
        : sheetOptions[0]?.value || "All";

  next.sheet = resolvedSheet;
  const optionMap = {
    campaignType: filterOptions.campaignTypes,
    segment: filterOptions.segments,
    year: filterOptions.years,
    quarter: filterOptions.quarters,
    month: filterOptions.months,
    state: filterOptions.states,
    responseType: filterOptions.responseTypes,
  };

  (Object.keys(optionMap) as Array<keyof typeof optionMap>).forEach((key) => {
    if (next[key] === "All") return;
    if (!optionMap[key].some((option) => option.value === next[key])) {
      next[key] = "All";
    }
  });

  return next;
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#1a3954] bg-[#0e2740] p-3 text-center shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
      <div className="text-sm font-semibold text-slate-100">{label}</div>
      <div className="mt-2 font-display text-[2rem] font-bold text-white">{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full rounded-[18px] border-[#173047] bg-[#020b14] text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)]">
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

function DonutPanel({
  title,
  subtitle,
  items,
  centerLabel,
  centerValue,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
  centerLabel: string;
  centerValue: string;
}) {
  if (!items.length) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No matching records.</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="grid gap-4 xl:grid-cols-[1fr,1fr] xl:items-center">
        <div className="relative h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={items} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={4}>
                {items.map((item, index) => (
                  <Cell key={item.label} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1a26",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{centerLabel}</div>
            <div className="mt-2 font-display text-2xl font-bold text-white">{centerValue}</div>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            const total = items.reduce((sum, current) => sum + current.value, 0) || 1;
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-100">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                  <span>{item.label}</span>
                </div>
                <span className="font-semibold text-slate-200">{((item.value / total) * 100).toFixed(2)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

function StateMapPanel({ states }: { states: Array<{ code: string; value: number }> }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const plotly = (window as Window & { Plotly?: any }).Plotly;
    if (!plotly || !ref.current) return;

    const locations = states.map((item) => item.code);
    const zValues = states.map((item) => item.value);
    const maxValue = Math.max(...zValues, 1);

    plotly.react(
      ref.current,
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
          locations,
          text: locations,
          mode: "text",
          showlegend: false,
          hoverinfo: "skip",
          textfont: {
            size: 9,
            color: "#173047",
            family: "Plus Jakarta Sans, sans-serif",
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
      if (ref.current && plotly) {
        plotly.purge(ref.current);
      }
    };
  }, [states]);

  return (
    <ChartCard title="Response Map" subtitle="Lead response volume by state with state abbreviations inside the map">
      <div ref={ref} className="h-[420px] w-full" />
    </ChartCard>
  );
}

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { data, isLoading, isFetching, error } = useDashboardWorkbookFiltered(filters);
  const errorMessage = error instanceof Error ? error.message : "There was an error reading the workbook.";

  useEffect(() => {
    if (!data) return;
    setFilters((current) => sanitizeFilters(current, data.filterOptions, data.sheetOptions, data.filtersApplied.sheet));
  }, [data]);

  const monthlyResponse = useMemo(() => data?.charts.monthlyResponse ?? [], [data]);
  const agencyResponse = useMemo(() => data?.charts.agencyResponse ?? [], [data]);
  const targetEmailSent = useMemo(() => data?.charts.targetEmailSent ?? [], [data]);
  const conversionRatio = useMemo(() => data?.charts.conversionRatio ?? [], [data]);
  const tableRows = useMemo(() => data?.tableRows ?? [], [data]);
  const mapStates = useMemo(() => data?.mapStates ?? [], [data]);
  const sheetOptions = useMemo(
    () => data?.sheetOptions.map((option) => ({ value: option.value, label: option.label })) ?? [],
    [data],
  );
  const workbookSheetValue = useMemo(
    () =>
      sheetOptions.some((option) => option.value === filters.sheet)
        ? filters.sheet
        : data?.filtersApplied.sheet || sheetOptions[0]?.value || "",
    [data, filters.sheet, sheetOptions],
  );
  const selectedSheetLabel = useMemo(
    () => data?.sheetOptions.find((option) => option.value === workbookSheetValue)?.label || data?.filtersApplied.sheet || "Workbook",
    [data, workbookSheetValue],
  );

  if (isLoading && !data) {
    return (
      <AppLayout sectionLabel="Dashboard" showDashboardNav>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout sectionLabel="Dashboard" showDashboardNav>
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
          <h2 className="text-xl font-bold">Failed to load dashboard</h2>
          <p className="mt-2">{errorMessage}</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout sectionLabel="Dashboard" showDashboardNav>
      <div className="w-full min-w-0 space-y-5 pb-8">
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">LeadSync dashboard</div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground md:text-[2.2rem]">
              Campaign response command center
            </h1>
            <p className="max-w-4xl text-muted-foreground">
              Live workbook analytics with the requested KPI strip, campaign filters, and U.S. map.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300 2xl:justify-end">
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">{selectedSheetLabel}</span>
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">Updated {formatTimestamp(data.syncedAt)}</span>
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">{formatNumber(data.metrics.emailSent)} email sent</span>
            <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">{formatNumber(data.metrics.responses)} responses</span>
            {isFetching ? <span className="rounded-full border border-[#173047] bg-[#06192a] px-3 py-2">Refreshing...</span> : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            Last refresh failed: {errorMessage}. Showing the most recent successful dashboard payload.
          </div>
        ) : null}

        <section className="w-full rounded-[30px] border border-[#17334c] bg-[#052642] p-3 shadow-[0_26px_60px_rgba(2,14,24,0.26)] md:p-4 2xl:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[repeat(8,minmax(0,1fr))_170px_190px_96px]">
            <SelectCard
              label="Workbook Sheet"
              value={workbookSheetValue}
              options={sheetOptions}
              includeAll={false}
              onChange={(value) =>
                setFilters({
                  ...DEFAULT_FILTERS,
                  sheet: value,
                })
              }
            />
            <SelectCard
              label="Campaign Type"
              value={filters.campaignType}
              options={data.filterOptions.campaignTypes}
              onChange={(value) => setFilters((current) => ({ ...current, campaignType: value }))}
            />
            <SelectCard
              label="Segment"
              value={filters.segment}
              options={data.filterOptions.segments}
              onChange={(value) => setFilters((current) => ({ ...current, segment: value }))}
            />
            <SelectCard
              label="Year"
              value={filters.year}
              options={data.filterOptions.years}
              onChange={(value) => setFilters((current) => ({ ...current, year: value }))}
            />
            <SelectCard
              label="Quarter"
              value={filters.quarter}
              options={data.filterOptions.quarters}
              onChange={(value) => setFilters((current) => ({ ...current, quarter: value }))}
            />
            <SelectCard
              label="Month"
              value={filters.month}
              options={data.filterOptions.months}
              onChange={(value) => setFilters((current) => ({ ...current, month: value }))}
            />
            <SelectCard
              label="State"
              value={filters.state}
              options={data.filterOptions.states}
              onChange={(value) => setFilters((current) => ({ ...current, state: value }))}
            />
            <SelectCard
              label="Response Type"
              value={filters.responseType}
              options={data.filterOptions.responseTypes}
              onChange={(value) => setFilters((current) => ({ ...current, responseType: value }))}
            />
            <MetricTile label="Quoted" value={data.metrics.quoted ? formatNumber(data.metrics.quoted) : "(Blank)"} />
            <MetricTile label="Revenue" value={data.metrics.revenue ? formatCurrency(data.metrics.revenue) : "(Blank)"} />
            <div className="flex items-center justify-center rounded-[18px] border border-[#1a3954] bg-[#071d30] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
              <Button
                variant="secondary"
                className="h-12 w-full rounded-[14px] border border-[#33597b] bg-[#0d2841] text-slate-100 hover:bg-[#123453]"
                onClick={() =>
                  setFilters(() => ({
                    ...DEFAULT_FILTERS,
                    sheet: workbookSheetValue || data.filtersApplied.sheet,
                  }))
                }
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            <ChartCard title="Monthly Response" subtitle="Email sent versus lead responses by month">
              <div className="h-[320px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyResponse} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#c2d2e5", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#c2d2e5", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1a26",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                    <Bar dataKey="emailSent" name="Email Sent" fill="#2792f0" radius={[10, 10, 0, 0]} />
                    <Line type="monotone" dataKey="responses" name="Response" stroke="#1a2ab8" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Agency Response" subtitle="Email sent and responses by campaign type">
              <div className="h-[320px] md:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agencyResponse} layout="vertical" margin={{ top: 10, right: 16, left: 12, bottom: 12 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 6" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#c2d2e5", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={138}
                      tick={{ fill: "#c2d2e5", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0d1a26",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                    <Bar dataKey="emailSent" name="Email Sent" fill="#2792f0" radius={[0, 8, 8, 0]} />
                    <Bar dataKey="responses" name="Response" fill="#b9c3ff" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <DonutPanel
              title="Target Email Sent"
              subtitle="Email sent distribution by campaign type"
              items={targetEmailSent}
              centerLabel="Emails"
              centerValue={formatCompact(data.metrics.emailSent)}
            />

            <DonutPanel
              title="Conversion Ratio"
              subtitle="Positive versus negative response mix"
              items={conversionRatio}
              centerLabel="Responses"
              centerValue={formatCompact(conversionRatio.reduce((sum, item) => sum + item.value, 0))}
            />
          </div>

          <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(460px,1fr)]">
            <ChartCard title="Lead Response Detail" subtitle="Filtered lead rows with response outcome and sales action">
              <div className="max-h-[560px] overflow-auto rounded-2xl border border-[#173047]">
                <Table className="min-w-[1160px] overflow-hidden rounded-xl bg-[#071723] text-slate-100">
                  <TableHeader className="sticky top-0 z-10 bg-[#173047] [&_th]:text-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Month</TableHead>
                      <TableHead>Lead Stage</TableHead>
                      <TableHead>Response Type</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Assign to</TableHead>
                      <TableHead>Final Outcome</TableHead>
                      <TableHead>Action for sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.length ? (
                      tableRows.map((row) => (
                        <TableRow key={row.id} className="border-[#173047] hover:bg-[#0d2335]">
                          <TableCell className="text-[13px] leading-6 text-slate-200">{row.month || "-"}</TableCell>
                          <TableCell className="text-[13px] leading-6 text-slate-200">{row.leadStage || "-"}</TableCell>
                          <TableCell className="text-[13px] leading-6 text-slate-200">{row.responseType || "-"}</TableCell>
                          <TableCell className="text-[13px] font-semibold leading-6 text-slate-200">{row.state || "-"}</TableCell>
                          <TableCell className="max-w-[220px] break-words text-[13px] leading-6 text-slate-100">
                            {row.accountName || "-"}
                          </TableCell>
                          <TableCell className="max-w-[180px] break-words text-[13px] leading-6 text-slate-200">
                            {row.assignTo || "-"}
                          </TableCell>
                          <TableCell className="max-w-[320px] whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-200">
                            {row.outcome || "-"}
                          </TableCell>
                          <TableCell className="max-w-[280px] whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-200">
                            {row.actionForSales || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                          No lead rows match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>

            <StateMapPanel states={mapStates} />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
