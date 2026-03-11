import { useEffect, useMemo, useState } from "react";
import { useDashboardWorkbook, useLeads } from "@/hooks/use-leads";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatExcelDate } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Loader2, Mail, MapPin, Search, Target, UserRound } from "lucide-react";
import { motion } from "framer-motion";

const statCardClassName = "rounded-2xl border border-border/60 bg-card p-4 shadow-sm";

export default function Leads() {
  const { data: workbook, isLoading: isWorkbookLoading, error: workbookError } = useDashboardWorkbook();
  const [activeSheet, setActiveSheet] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const leadSheetNames = useMemo(
    () =>
      workbook?.sheetOrder.filter((sheetName) => workbook.sheets[sheetName]?.sheetType === "leads") ?? [],
    [workbook],
  );

  useEffect(() => {
    if (leadSheetNames.length && !leadSheetNames.includes(activeSheet)) {
      setActiveSheet(leadSheetNames[0]);
    }
  }, [activeSheet, leadSheetNames]);

  const activeSheetSummary =
    workbook && activeSheet && workbook.sheets[activeSheet]?.sheetType === "leads"
      ? workbook.sheets[activeSheet]
      : null;

  const { data: leads, isLoading: isLeadsLoading, error: leadsError } = useLeads(activeSheet || undefined);
  const errorMessage =
    workbookError instanceof Error
      ? workbookError.message
      : leadsError instanceof Error
        ? leadsError.message
        : "There was an error reading the workbook.";

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter((lead) =>
      [lead.name, lead.accountName, lead.campaignName, lead.email, lead.assignTo, lead.state]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(lower)),
    );
  }, [leads, searchTerm]);

  const getStageColor = (stage: string | null | undefined) => {
    switch (stage?.toLowerCase()) {
      case "positive":
      case "qualified":
      case "closed won":
        return "bg-green-100 text-green-800 border-green-200";
      case "negative":
      case "not interested":
        return "bg-red-100 text-red-800 border-red-200";
      case "under/ follow-up":
      case "follow-up":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-secondary text-secondary-foreground border-border";
    }
  };

  if (isWorkbookLoading || (activeSheet && isLeadsLoading)) {
    return (
      <AppLayout sectionLabel="Leads">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (workbookError || leadsError) {
    return (
      <AppLayout sectionLabel="Leads">
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
          <h2 className="text-xl font-bold">Failed to load leads</h2>
          <p className="mt-2">{errorMessage}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout sectionLabel="Leads">
      <div className="flex h-full flex-col space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Lead Registry</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live workbook leads.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="w-full sm:w-64">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sheet</div>
              <Select value={activeSheet} onValueChange={setActiveSheet}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a lead sheet" />
                </SelectTrigger>
                <SelectContent>
                  {leadSheetNames.map((sheetName) => (
                    <SelectItem key={sheetName} value={sheetName}>
                      {sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-72">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</div>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className={statCardClassName}>
            <CardContent className="flex items-start justify-between p-0">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Rows</div>
                <div className="mt-3 text-3xl font-display font-bold">{activeSheetSummary?.totalRows || 0}</div>
                <div className="mt-2 text-sm text-muted-foreground">{activeSheet || "No lead sheet selected"}</div>
              </div>
              <UserRound className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card className={statCardClassName}>
            <CardContent className="flex items-start justify-between p-0">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Positive</div>
                <div className="mt-3 text-3xl font-display font-bold">{activeSheetSummary?.positiveCount || 0}</div>
                <div className="mt-2 text-sm text-muted-foreground">{activeSheetSummary?.positiveRate || 0}% response rate</div>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card className={statCardClassName}>
            <CardContent className="flex items-start justify-between p-0">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Accounts</div>
                <div className="mt-3 text-3xl font-display font-bold">{activeSheetSummary?.uniqueAccounts || 0}</div>
                <div className="mt-2 text-sm text-muted-foreground">{activeSheetSummary?.uniqueStates || 0} states covered</div>
              </div>
              <Building className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
          <Card className={statCardClassName}>
            <CardContent className="flex items-start justify-between p-0">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Owners</div>
                <div className="mt-3 text-3xl font-display font-bold">{activeSheetSummary?.uniqueOwners || 0}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Latest activity {formatExcelDate(activeSheetSummary?.latestActivityDate || null)}
                </div>
              </div>
              <MapPin className="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        </div>

        <motion.div
          className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[250px] font-semibold text-foreground">Contact</TableHead>
                  <TableHead className="w-[220px] font-semibold text-foreground">Organization</TableHead>
                  <TableHead className="font-semibold text-foreground">Campaign</TableHead>
                  <TableHead className="font-semibold text-foreground">Stage</TableHead>
                  <TableHead className="font-semibold text-foreground">Owner</TableHead>
                  <TableHead className="font-semibold text-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                        No leads found.
                      </TableCell>
                    </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={`${activeSheet}-${lead.id}`} className="group transition-colors hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{lead.name || "Unknown Contact"}</span>
                          <div className="mt-1 flex items-center text-xs text-muted-foreground">
                            <Mail className="mr-1 h-3 w-3" />
                            <span className="truncate max-w-[200px]">{lead.email || "No email provided"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Building className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="max-w-[180px] truncate font-medium" title={lead.accountName || ""}>
                            {lead.accountName || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate">
                          <div className="text-sm font-medium">{lead.campaignName || "-"}</div>
                          <div className="text-xs text-muted-foreground">{lead.campaignType || "No campaign type"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`border font-medium ${getStageColor(lead.leadStage)}`}>
                          {lead.leadStage || "New"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{lead.assignTo || "Unassigned"}</div>
                          <div className="text-xs text-muted-foreground">{lead.state || "No state"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatExcelDate(lead.date)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
            <span>
              {filteredLeads.length} / {leads?.length || 0} leads
            </span>
            {activeSheetSummary && (
              <span>
                {activeSheetSummary.followUpCount} follow-ups · {activeSheetSummary.uniqueContacts} contacts
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
