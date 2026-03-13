import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type LeadInput, type LeadUpdateInput, type LeadResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw new Error(`Data validation failed for ${label}`);
  }
  return result.data;
}

async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body.message === "string" ? body.message : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export function useLeads(sheetName?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.leads.list.path, sheetName || ""],
    queryFn: async () => {
      const url = new URL(api.leads.list.path, window.location.origin);
      if (sheetName) {
        url.searchParams.set("sheet", sheetName);
      }

      const res = await fetch(url.pathname + url.search, { credentials: "include" });
      if (res.status === 401) {
        queryClient.setQueryData([api.auth.session.path], null);
        throw new Error("Authentication required");
      }
      if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to fetch leads"));
      const data = await res.json();
      return parseWithLogging(api.leads.list.responses[200], data, "leads.list");
    },
  });
}

export function useDashboardWorkbook() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.dashboard.workbook.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.workbook.path, { credentials: "include" });
      if (res.status === 401) {
        queryClient.setQueryData([api.auth.session.path], null);
        throw new Error("Authentication required");
      }
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to fetch workbook dashboard"));
      }
      const data = await res.json();
      return parseWithLogging(api.dashboard.workbook.responses[200], data, "dashboard.workbook");
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

type DashboardWorkbookFilters = {
  sheet?: string;
  campaignType?: string;
  segment?: string;
  year?: string;
  quarter?: string;
  month?: string;
  state?: string;
  responseType?: string;
};

export function useDashboardWorkbookFiltered(filters?: DashboardWorkbookFilters) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.dashboard.workbook.path, filters || {}],
    queryFn: async () => {
      const url = new URL(api.dashboard.workbook.path, window.location.origin);
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value && value !== "All") {
          url.searchParams.set(key, value);
        }
      });

      const res = await fetch(url.pathname + url.search, { credentials: "include" });
      if (res.status === 401) {
        queryClient.setQueryData([api.auth.session.path], null);
        throw new Error("Authentication required");
      }
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to fetch workbook dashboard"));
      }
      const data = await res.json();
      return parseWithLogging(api.dashboard.workbook.responses[200], data, "dashboard.workbook");
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useSalesMapperData() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [api.dashboard.salesMapper.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.salesMapper.path, { credentials: "include" });
      if (res.status === 401) {
        queryClient.setQueryData([api.auth.session.path], null);
        throw new Error("Authentication required");
      }
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, "Failed to fetch Projects"));
      }
      const data = await res.json();
      return parseWithLogging(api.dashboard.salesMapper.responses[200], data, "dashboard.salesMapper");
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useLead(id: number) {
  return useQuery({
    queryKey: [api.leads.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.leads.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch lead");
      const data = await res.json();
      return parseWithLogging(api.leads.get.responses[200], data, "leads.get");
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: LeadInput) => {
      const validated = api.leads.create.input.parse(data);
      const res = await fetch(api.leads.create.path, {
        method: api.leads.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create lead");
      }
      return parseWithLogging(api.leads.create.responses[201], await res.json(), "leads.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leads.list.path] });
      toast({ title: "Success", description: "Lead created successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & LeadUpdateInput) => {
      const validated = api.leads.update.input.parse(updates);
      const url = buildUrl(api.leads.update.path, { id });
      const res = await fetch(url, {
        method: api.leads.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update lead");
      return parseWithLogging(api.leads.update.responses[200], await res.json(), "leads.update");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.leads.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.leads.get.path, variables.id] });
      toast({ title: "Success", description: "Lead updated successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.leads.delete.path, { id });
      const res = await fetch(url, { 
        method: api.leads.delete.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to delete lead");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leads.list.path] });
      toast({ title: "Success", description: "Lead deleted successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

